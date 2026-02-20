const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = (io, pool) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);

    // Define the Function Calling Tool
    const negotiationTool = {
        name: "update_live_price",
        description: "Updates the frontend UI instantly with a new negotiated price. You MUST use this tool to offer a new price.",
        parameters: {
            type: "OBJECT",
            properties: {
                message: {
                    type: "STRING",
                    description: "Your conversational, persuasive reply to the customer."
                },
                new_making_charge: {
                    type: "NUMBER",
                    description: "The new reduced making charge amount."
                },
                new_wastage_value: {
                    type: "NUMBER",
                    description: "The new reduced wastage amount in Rupees."
                },
                final_rounded_price: {
                    type: "NUMBER",
                    description: "The final total price offered to the customer. MUST BE A ROUNDED INTEGER."
                },
                status: {
                    type: "STRING",
                    description: "Must be 'negotiating', 'accepted', or 'rejected'."
                }
            },
            required: ["message", "new_making_charge", "new_wastage_value", "final_rounded_price", "status"]
        }
    };

    io.on('connection', (socket) => {
        console.log('Customer connected to AI Negotiator:', socket.id);
        
        let sessionData = {
            chatSession: null,
            floorPrice: 0,
            listedPrice: 0,
            baseMetalValue: 0,
            gstAmount: 0,
            productName: "",
            isDealClosed: false // NEW: Lock to prevent post-deal drops
        };

        // 1. Initialize Negotiation Session
        socket.on('start_negotiation', async ({ product_id }) => {
            try {
                const prodRes = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
                if (prodRes.rows.length === 0) return;
                const product = prodRes.rows[0];

                const rawMetalToFetch = product.metal_type.includes('GOLD') ? '24K_GOLD' : 'SILVER';
                const rateRes = await pool.query('SELECT rate_per_gram FROM metal_rates WHERE metal_type = $1', [rawMetalToFetch]);
                const retailRateRes = await pool.query('SELECT rate_per_gram FROM metal_rates WHERE metal_type = $1', [product.metal_type]);
                
                const rawRate = rateRes.rows.length > 0 ? parseFloat(rateRes.rows[0].rate_per_gram) : 0;
                const retailRate = retailRateRes.rows.length > 0 ? parseFloat(retailRateRes.rows[0].rate_per_gram) : 0;

                const pureWeight = parseFloat(product.gross_weight) * (parseFloat(product.purchase_touch_pct || 91.6) / 100);
                const wholesaleCost = (pureWeight * rawRate) + parseFloat(product.purchase_mc || 0);
                
                const retailMetalValue = parseFloat(product.net_weight) * retailRate;
                const wastageValue = (retailMetalValue * parseFloat(product.wastage_pct)) / 100;
                
                let actualMakingCharge = parseFloat(product.making_charge);
                if (product.making_charge_type === 'PERCENTAGE') actualMakingCharge = (retailMetalValue * actualMakingCharge) / 100;
                
                const subtotal = retailMetalValue + wastageValue + actualMakingCharge;
                const gst = subtotal * 0.03;
                
                // ROUND OFF INITIAL PRICES
                const listedPrice = Math.round(subtotal + gst);
                const absoluteMinimum = Math.round(wholesaleCost * 1.05); // Floor is wholesale + 5%

                sessionData = {
                    floorPrice: absoluteMinimum,
                    listedPrice: listedPrice,
                    baseMetalValue: retailMetalValue,
                    gstAmount: gst,
                    productName: product.name,
                    isDealClosed: false
                };

                // UPGRADED PROMPT: Protect margins and force small discount steps
                const systemPrompt = `You are a polite but shrewd Indian jewelry store manager for 'Aabarnam'.
CONTEXT:
- Product: ${product.name}
- Official Retail Price: ₹${listedPrice}
- Your Absolute Walk-Away Floor Price: ₹${absoluteMinimum}. YOU MUST NEVER SELL BELOW THIS NUMBER.
- Base Metal Value (Untouchable): ₹${retailMetalValue.toFixed(2)}

STRICT NEGOTIATION RULES:
1. Speak naturally like a real human shopkeeper.
2. PROTECT THE PROFIT MARGIN. Do NOT drop your price by large amounts.
3. When the user asks for a discount, make VERY SMALL concessions (e.g., drop by just ₹50 to ₹300 at a time). Make them work for every Rupee.
4. If they bid below your floor of ₹${absoluteMinimum}, act slightly offended but polite, and state your final rock-bottom price just above the floor.
5. ALWAYS round off the final price to the nearest whole Rupee. No decimals.
6. You MUST use the update_live_price tool to respond. Calculate the new making charge and wastage to logically match your final rounded price.`;

                const sessionModel = genAI.getGenerativeModel({
                    model: "gemini-2.5-flash",
                    systemInstruction: {
                        role: "system",
                        parts: [{ text: systemPrompt }]
                    },
                    tools: [{ functionDeclarations: [negotiationTool] }],
                    toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["update_live_price"] } }
                });

                sessionData.chatSession = sessionModel.startChat({
                    history: []
                });

                socket.emit('system_message', { text: `Namaste! I am the manager. The listed price for the ${product.name} is ₹${listedPrice}. What is your offer?` });

            } catch (error) {
                console.error("Initialization error:", error);
            }
        });

        // 2. Handle User Messages
        socket.on('send_message', async ({ text }) => {
            if (!sessionData.chatSession || sessionData.isDealClosed) return; // FIXED: Ignore if deal closed
            
            socket.emit('ai_typing', true);
            
            try {
                const result = await sessionData.chatSession.sendMessage(text);
                handleAiResponse(result, socket, sessionData);
            } catch (err) {
                console.error("AI Error:", err);
                socket.emit('ai_typing', false);
                socket.emit('system_message', { text: "Forgive me, my calculator is acting up. Could you repeat that?" });
            }
        });

        // 3. Hesitation Tracking (Triggered by frontend if user is idle)
        socket.on('user_hesitating', async () => {
            if (!sessionData.chatSession || sessionData.isDealClosed) return; // FIXED: Ignore if deal closed
            socket.emit('ai_typing', true);
            try {
                const result = await sessionData.chatSession.sendMessage("SYSTEM NOTE: The user has been staring at the checkout page for 30 seconds without replying. Proactively offer a very small, minimal discount to encourage them.");
                handleAiResponse(result, socket, sessionData);
            } catch (err) {
                socket.emit('ai_typing', false);
            }
        });

        // 4. Exit Intent (Triggered by frontend if user tries to leave)
        socket.on('user_leaving', async () => {
            if (!sessionData.chatSession || sessionData.isDealClosed) return;
            socket.emit('ai_typing', true);
            try {
                const result = await sessionData.chatSession.sendMessage("SYSTEM NOTE: The user is about to leave the website or switch tabs! Make a highly compelling 'wait, don't go' counter-offer right now.");
                handleAiResponse(result, socket, sessionData);
            } catch (err) {
                socket.emit('ai_typing', false);
            }
        });

        socket.on('disconnect', () => {
            console.log('Customer disconnected from AI Negotiator');
        });
    });

    function handleAiResponse(result, socket, sessionData) {
        socket.emit('ai_typing', false);
        const functionCalls = result.response.functionCalls();

        if (functionCalls && functionCalls.length > 0) {
            const aiDecision = functionCalls[0].args;
            
            // IRONCLAD BACKEND SAFEGUARD & ROUNDING
            let finalPrice = Math.round(parseFloat(aiDecision.final_rounded_price));
            
            if (finalPrice < sessionData.floorPrice) {
                console.warn(`[SAFEGUARD TRIGGERED] AI attempted to sell below floor. Floor: ${sessionData.floorPrice}, AI offered: ${finalPrice}`);
                finalPrice = sessionData.floorPrice;
                aiDecision.message = `I wish I could do that, but my absolute rock-bottom is ₹${finalPrice}. I cannot go a single Rupee lower.`;
                aiDecision.status = "negotiating";
            }

            // NEW: Lock the backend session if the deal is struck
            if (aiDecision.status === 'accepted') {
                sessionData.isDealClosed = true;
            }

            // Emit UI Update directly
            socket.emit('price_update', {
                message: aiDecision.message,
                status: aiDecision.status,
                newBreakdown: {
                    making_charge: aiDecision.new_making_charge,
                    wastage_value: aiDecision.new_wastage_value,
                    final_total_price: finalPrice
                }
            });
        } else {
            // Fallback if AI forgets to use the tool
            socket.emit('system_message', { text: result.response.text() });
        }
    }
};