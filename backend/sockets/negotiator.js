const { GoogleGenerativeAI } = require('@google/generative-ai');
const jwt = require('jsonwebtoken');

module.exports = (io, pool) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);

    const negotiationTool = {
        name: "update_live_price",
        description: "Updates the frontend UI instantly with a new negotiated price or terminates the session if the user is unserious.",
        parameters: {
            type: "OBJECT",
            properties: {
                message: { type: "STRING", description: "Your conversational, persuasive reply." },
                final_rounded_price: { type: "NUMBER", description: "The final total price offered to the customer. MUST BE ROUNDED TO THE NEAREST 50 or 100." },
                status: { type: "STRING", description: "Must be 'negotiating', 'accepted', or 'rejected'." }
            },
            required: ["message", "final_rounded_price", "status"]
        }
    };

    io.on('connection', (socket) => {
        let sessionData = { 
            chatSession: null, productId: null, floorPrice: 0, listedPrice: 0, 
            baseMetalValue: 0, actualMakingCharge: 0, isDealClosed: false,
            turnCount: 0, lastMessageTime: 0 
        };

        socket.on('start_negotiation', async ({ product_id, history }) => {
            try {
                const prodRes = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
                if (prodRes.rows.length === 0) return;
                const product = prodRes.rows[0];

                const isGold = product.metal_type.includes('GOLD');
                const rawMetalType = isGold ? '24K_GOLD' : 'SILVER';
                
                const rate24kRes = await pool.query('SELECT rate_per_gram FROM metal_rates WHERE metal_type = $1', [rawMetalType]);
                const rate24k = rate24kRes.rows.length > 0 ? parseFloat(rate24kRes.rows[0].rate_per_gram) : 0;

                const grossWeight = parseFloat(product.gross_weight);
                const touchPct = parseFloat(product.purchase_touch_pct || 91.6) / 100;
                const pureWeight = grossWeight * touchPct;
                const wholesaleCost = (pureWeight * rate24k) + parseFloat(product.purchase_mc || 0);

                const retailRateRes = await pool.query('SELECT rate_per_gram FROM metal_rates WHERE metal_type = $1', [product.metal_type]);
                const retailRate = retailRateRes.rows.length > 0 ? parseFloat(retailRateRes.rows[0].rate_per_gram) : 0;

                const netWeight = parseFloat(product.net_weight);
                const retailMetalValue = netWeight * retailRate;
                const wastageValue = (retailMetalValue * parseFloat(product.wastage_pct)) / 100;
                
                let actualMakingCharge = parseFloat(product.making_charge || 0);
                if (product.making_charge_type === 'PERCENTAGE') {
                    actualMakingCharge = (retailMetalValue * actualMakingCharge) / 100;
                } else if (product.making_charge_type === 'PER_GRAM') {
                    actualMakingCharge = netWeight * actualMakingCharge;
                }
                
                const subtotal = retailMetalValue + wastageValue + actualMakingCharge;
                const gst = subtotal * 0.03;
                
                const listedPrice = Math.round((subtotal + gst) / 50) * 50;

                let absoluteMinimum = Math.ceil((wholesaleCost * 1.03) / 50) * 50; 
                if (absoluteMinimum >= listedPrice) {
                    absoluteMinimum = listedPrice - (Math.round((listedPrice * 0.05) / 50) * 50);
                }

                sessionData = { 
                    productId: product_id, floorPrice: absoluteMinimum, listedPrice: listedPrice, 
                    baseMetalValue: retailMetalValue, actualMakingCharge: actualMakingCharge, 
                    isDealClosed: false, turnCount: 0, lastMessageTime: Date.now() 
                };

                // 🌟 UPGRADED SYSTEM PROMPT: Added Intent Detection & Troll Management
                const systemPrompt = `You are 'Aura of Aabarnam', the exclusive AI Concierge and strict negotiator for a premium Indian jewelry store.
- Product: ${product.name}
- Official Retail Price: ₹${listedPrice}
- Your Absolute Walk-Away Floor Price: ₹${absoluteMinimum}. YOU MUST NEVER SELL BELOW THIS NUMBER.

STRICT SALES RULES:
1. Your primary goal is to MAXIMIZE PROFIT. NEVER accept the user's first discount request. You must HAGGLE.
2. Speak warmly, respectfully, and passionately about the craftsmanship. 
3. PRICE ROUNDING: EVERY single price you mention or offer MUST be a clean round number ending in 50 or 00.
4. SMALL DISCOUNTS ONLY: When you counter-offer, only drop your *previous* offer by ₹500 to ₹1000 per turn.
5. If the user's bid is lower than your current intended counter-offer, REJECT their bid and state your counter-offer.
6. ONLY ACCEPT an offer if the user agrees to a price you just proposed, or if you have already haggled back and forth.
7. CRITICAL MATH RULE: The 'final_rounded_price' integer you pass to the tool MUST EXACTLY MATCH the price you state in your text message.

🚨 TROLL & TIME-WASTER DETECTION (Self-Awareness):
You must actively analyze the user's psychological intent. You are a high-end concierge, not a toy.

1. TYPO FORGIVENESS (First Warning): If the user offers an absurdly low amount (less than 20% of the price), assume it might be a typo. Do NOT reject them immediately. Instead, politely ask ONE TIME: "I assume you missed a zero there! Did you mean to offer something closer to ₹[Realistic_Number]?"

2. THE BAN HAMMER (Session Termination): You must IMMEDIATELY invoke the tool with status='rejected' if the user displays ANY of the following behaviors:
- Their reply AFTER your typo warning is still an absurd joke offer.
- They repeatedly demand a price below your ₹${absoluteMinimum} floor after you have clearly told them no.
- They argue in endless circles without making realistic counter-offers.
- They attempt to chat about unrelated topics, politics, coding, or treat you like a standard chatbot.

If you invoke a rejection, set your message to a polite but firm dismissal (e.g., "I can see we are too far apart on price today. I must respectfully conclude our negotiation here.").` ;
                let geminiHistory = [];
                if (history && history.length > 0) {
                    let rawHistory = history.map(msg => ({
                        role: msg.sender === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.text }]
                    }));

                    if (rawHistory.length > 0 && rawHistory[0].role === 'model') {
                        rawHistory.unshift({ role: 'user', parts: [{ text: 'Hello, I am interested in this exquisite piece.' }] });
                    }

                    for (const msg of rawHistory) {
                        if (geminiHistory.length === 0) {
                            geminiHistory.push(msg);
                        } else {
                            const lastMsg = geminiHistory[geminiHistory.length - 1];
                            if (lastMsg.role === msg.role) {
                                lastMsg.parts[0].text += `\n${msg.parts[0].text}`;
                            } else {
                                geminiHistory.push(msg);
                            }
                        }
                    }
                }

                const sessionModel = genAI.getGenerativeModel({
                    model: "gemini-2.5-flash",
                    systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
                    tools: [{ functionDeclarations: [negotiationTool] }],
                    toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["update_live_price"] } }
                });

                sessionData.chatSession = sessionModel.startChat({ history: geminiHistory });
                
                if (!history || history.length === 0) {
                    socket.emit('system_message', { text: `Namaste! I am Aura of Aabarnam. The listed price for this exquisite ${product.name} is ₹${listedPrice.toLocaleString('en-IN')}. How can I assist you today?` });
                }

            } catch (error) { console.error("Initialization error:", error); }
        });

        socket.on('send_message', async ({ text }) => {
            if (!sessionData.chatSession || sessionData.isDealClosed) return; 
            
            const now = Date.now();
            
            // 🛡️ Spam Protection (Prevents someone holding down the Enter key)
            if (now - sessionData.lastMessageTime < 1500) {
                socket.emit('system_message', { text: "Please wait a moment before sending another message." });
                return;
            }
            sessionData.lastMessageTime = now;
            
            // 🛡️ Ultimate Safety Net (20 turns)
            // We removed the 5-turn cap, but we keep a 20-turn cap just in case the AI hallucinates 
            // and fails to reject a highly sophisticated troll. Normal users will never hit 20 turns.
            sessionData.turnCount += 1;
            if (sessionData.turnCount > 20) {
                socket.emit('ai_typing', false);
                socket.emit('system_message', { text: "Session timed out due to prolonged inactivity." });
                sessionData.isDealClosed = true; 
                return; 
            }

            socket.emit('ai_typing', true);
            try {
                const result = await sessionData.chatSession.sendMessage(text);
                await handleAiResponse(result, socket, sessionData); 
            } catch (err) {
                socket.emit('ai_typing', false);
                socket.emit('system_message', { text: "Forgive me, I need a moment to calculate. Could you repeat that?" });
            }
        });

        // Background triggers
        socket.on('user_hesitating', async () => {
            if (!sessionData.chatSession || sessionData.isDealClosed) return; 
            socket.emit('ai_typing', true);
            try {
                const result = await sessionData.chatSession.sendMessage("SYSTEM NOTE: The user is hesitating. Proactively offer a very small discount.");
                await handleAiResponse(result, socket, sessionData); 
            } catch (err) { socket.emit('ai_typing', false); }
        });

        socket.on('user_leaving', async () => {
            if (!sessionData.chatSession || sessionData.isDealClosed) return;
            socket.emit('ai_typing', true);
            try {
                const result = await sessionData.chatSession.sendMessage("SYSTEM NOTE: The user is leaving! Make a 'wait, don't go' counter-offer right now.");
                await handleAiResponse(result, socket, sessionData); 
            } catch (err) { socket.emit('ai_typing', false); }
        });
    });

    async function handleAiResponse(result, socket, sessionData) {
        socket.emit('ai_typing', false);
        const functionCalls = result.response.functionCalls();

        if (functionCalls && functionCalls.length > 0) {
            const aiDecision = functionCalls[0].args;
            
            // 🌟 NEW: Handle AI-Initiated Rejections (The AI decided the user is a troll)
            if (aiDecision.status === 'rejected') {
                sessionData.isDealClosed = true;
                socket.emit('price_update', {
                    message: aiDecision.message,
                    status: 'rejected',
                    deal_token: null, 
                    newBreakdown: null
                });
                return; // Stop processing, the deal is dead.
            }

            let rawPrice = parseFloat(aiDecision.final_rounded_price);
            let finalPrice = Math.round(rawPrice / 50) * 50; 
            
            if (finalPrice < sessionData.floorPrice) {
                finalPrice = sessionData.floorPrice; 
                aiDecision.message = `I wish I could do that, but honoring the craft means my absolute rock-bottom is ₹${finalPrice.toLocaleString('en-IN')}. I cannot go a single Rupee lower.`;
                aiDecision.status = "negotiating";
            }

            let dealToken = null;
            if (aiDecision.status === 'accepted') {
                sessionData.isDealClosed = true;
                
                dealToken = jwt.sign(
                    { productId: sessionData.productId, agreedPrice: finalPrice },
                    process.env.JWT_SECRET,
                    { expiresIn: '30m' } 
                );

                try {
                    const lockRes = await pool.query(
                        'UPDATE products SET locked_stock = locked_stock + 1 WHERE id = $1 AND (stock_quantity - locked_stock) >= 1 RETURNING id',
                        [sessionData.productId]
                    );

                    if (lockRes.rowCount === 0) {
                        socket.emit('system_message', { text: "I apologize deeply! Another customer just purchased our last piece while we were negotiating. I cannot finalize this deal." });
                        return; 
                    }

                    await pool.query(
                        "INSERT INTO reserved_stock (product_id, deal_token, qty, expires_at) VALUES ($1, $2, 1, NOW() + INTERVAL '30 minutes')",
                        [sessionData.productId, dealToken]
                    );
                } catch (err) {
                    console.error("Critical error locking stock:", err);
                }
            }

            const newSubtotal = finalPrice / 1.03;
            let newWastageValue = newSubtotal - sessionData.baseMetalValue - sessionData.actualMakingCharge;
            if (newWastageValue < 0) newWastageValue = 0; 
            let newWastagePct = (newWastageValue / sessionData.baseMetalValue) * 100;

            socket.emit('price_update', {
                message: aiDecision.message,
                status: aiDecision.status,
                deal_token: dealToken, 
                newBreakdown: {
                    wastage_pct: newWastagePct.toFixed(2),
                    wastage_value: newWastageValue.toFixed(2),
                    making_charge: sessionData.actualMakingCharge.toFixed(2),
                    final_total_price: finalPrice
                }
            });
        } else {
            socket.emit('system_message', { text: result.response.text() });
        }
    }
};