const { GoogleGenerativeAI } = require('@google/generative-ai');
const jwt = require('jsonwebtoken'); 

module.exports = (io, pool) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);

    const negotiationTool = {
        name: "update_live_price",
        description: "Updates the frontend UI instantly with a new negotiated price.",
        parameters: {
            type: "OBJECT",
            properties: {
                message: { type: "STRING", description: "Your conversational, persuasive reply." },
                final_rounded_price: { type: "NUMBER", description: "The final total price offered to the customer. MUST BE A ROUNDED INTEGER." },
                status: { type: "STRING", description: "Must be 'negotiating', 'accepted', or 'rejected'." }
            },
            required: ["message", "final_rounded_price", "status"]
        }
    };

    io.on('connection', (socket) => {
        let sessionData = { chatSession: null, productId: null, floorPrice: 0, listedPrice: 0, baseMetalValue: 0, actualMakingCharge: 0, isDealClosed: false };

        // 🛡️ MODIFIED: Now accepts 'history' array from the frontend
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
                const absoluteMinimum = Math.round(wholesaleCost * 1.03); 

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
                const listedPrice = Math.round(subtotal + gst);

                sessionData = { productId: product_id, floorPrice: absoluteMinimum, listedPrice: listedPrice, baseMetalValue: retailMetalValue, actualMakingCharge: actualMakingCharge, isDealClosed: false };

                // 🌟 REBRANDED SYSTEM PROMPT
                const systemPrompt = `You are the 'Master Artisan' for 'Aabarnam', a premium Indian jewelry store.
- Product: ${product.name}
- Official Retail Price: ₹${listedPrice}
- Your Absolute Walk-Away Floor Price: ₹${absoluteMinimum}. YOU MUST NEVER SELL BELOW THIS NUMBER.

STRICT RULES:
1. Speak warmly, respectfully, and passionately about the craftsmanship. 
2. Use the term "Value Addition (VA)" instead of "Wastage".
3. PROTECT THE PROFIT MARGIN. Make VERY SMALL concessions (e.g., drop by just ₹50 to ₹300 at a time).
4. If they bid below ₹${absoluteMinimum}, act politely shocked and state your final rock-bottom price just above the floor.
5. You MUST use the update_live_price tool for every counter-offer.`;

                // 🔄 REBUILD HISTORY IF USER REFRESHED
                let geminiHistory = [];
                if (history && history.length > 0) {
                    geminiHistory = history.map(msg => ({
                        role: msg.sender === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.text }]
                    }));
                }

                const sessionModel = genAI.getGenerativeModel({
                    model: "gemini-2.5-flash",
                    systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
                    tools: [{ functionDeclarations: [negotiationTool] }],
                    toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["update_live_price"] } }
                });

                sessionData.chatSession = sessionModel.startChat({ history: geminiHistory });
                
                // Only send the greeting if it's a brand new chat
                if (!history || history.length === 0) {
                    socket.emit('system_message', { text: `Namaste! I am the Master Artisan. The listed price for this exquisite ${product.name} is ₹${listedPrice}. How can I assist you today?` });
                }

            } catch (error) { console.error("Initialization error:", error); }
        });

        socket.on('send_message', async ({ text }) => {
            if (!sessionData.chatSession || sessionData.isDealClosed) return; 
            socket.emit('ai_typing', true);
            try {
                const result = await sessionData.chatSession.sendMessage(text);
                handleAiResponse(result, socket, sessionData);
            } catch (err) {
                socket.emit('ai_typing', false);
                socket.emit('system_message', { text: "Forgive me, my tools are acting up. Could you repeat that?" });
            }
        });

        socket.on('user_hesitating', async () => { /* ... keeps existing logic ... */ });
        socket.on('user_leaving', async () => { /* ... keeps existing logic ... */ });
    });

    function handleAiResponse(result, socket, sessionData) {
        socket.emit('ai_typing', false);
        const functionCalls = result.response.functionCalls();

        if (functionCalls && functionCalls.length > 0) {
            const aiDecision = functionCalls[0].args;
            
            let finalPrice = Math.round(parseFloat(aiDecision.final_rounded_price));
            
            if (finalPrice < sessionData.floorPrice) {
                finalPrice = sessionData.floorPrice;
                aiDecision.message = `I wish I could do that, but honoring the craft means my rock-bottom is ₹${finalPrice}. I cannot go a single Rupee lower.`;
                aiDecision.status = "negotiating";
            }

            let dealToken = null;
            if (aiDecision.status === 'accepted') {
                sessionData.isDealClosed = true;
                dealToken = jwt.sign(
                    { productId: sessionData.productId, agreedPrice: finalPrice },
                    process.env.JWT_SECRET || 'aabarnam_secret_fallback',
                    { expiresIn: '1h' } 
                );
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