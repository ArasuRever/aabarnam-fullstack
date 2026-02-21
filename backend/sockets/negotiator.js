const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = (io, pool) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);

    // AI Tool is simplified: It ONLY decides the final price. The server does the exact math.
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
        let sessionData = { chatSession: null, floorPrice: 0, listedPrice: 0, baseMetalValue: 0, actualMakingCharge: 0, isDealClosed: false };

        socket.on('start_negotiation', async ({ product_id }) => {
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

                // We store the locked making charge to prevent it from changing
                sessionData = { floorPrice: absoluteMinimum, listedPrice: listedPrice, baseMetalValue: retailMetalValue, actualMakingCharge: actualMakingCharge, isDealClosed: false };

                const systemPrompt = `You are a polite but shrewd Indian jewelry store manager for 'Aabarnam'.
- Product: ${product.name}
- Official Retail Price: ₹${listedPrice}
- Your Absolute Walk-Away Floor Price: ₹${absoluteMinimum}. YOU MUST NEVER SELL BELOW THIS NUMBER.

STRICT NEGOTIATION RULES:
1. Speak naturally like a real human shopkeeper.
2. PROTECT THE PROFIT MARGIN. Make VERY SMALL concessions (e.g., drop by just ₹50 to ₹300 at a time).
3. If they bid below your floor of ₹${absoluteMinimum}, act politely offended, and state your final rock-bottom price just above the floor.
4. ALWAYS round off the final price to the nearest whole Rupee. No decimals.
5. You MUST use the update_live_price tool.`;

                const sessionModel = genAI.getGenerativeModel({
                    model: "gemini-2.5-flash",
                    systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
                    tools: [{ functionDeclarations: [negotiationTool] }],
                    toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["update_live_price"] } }
                });

                sessionData.chatSession = sessionModel.startChat({ history: [] });
                socket.emit('system_message', { text: `Namaste! I am the manager. The listed price for the ${product.name} is ₹${listedPrice}. What is your offer?` });

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
                socket.emit('system_message', { text: "Forgive me, my calculator is acting up. Could you repeat that?" });
            }
        });

        socket.on('user_hesitating', async () => {
            if (!sessionData.chatSession || sessionData.isDealClosed) return; 
            socket.emit('ai_typing', true);
            try {
                const result = await sessionData.chatSession.sendMessage("SYSTEM NOTE: The user is hesitating. Proactively offer a very small discount.");
                handleAiResponse(result, socket, sessionData);
            } catch (err) { socket.emit('ai_typing', false); }
        });

        socket.on('user_leaving', async () => {
            if (!sessionData.chatSession || sessionData.isDealClosed) return;
            socket.emit('ai_typing', true);
            try {
                const result = await sessionData.chatSession.sendMessage("SYSTEM NOTE: The user is leaving! Make a 'wait, don't go' counter-offer right now.");
                handleAiResponse(result, socket, sessionData);
            } catch (err) { socket.emit('ai_typing', false); }
        });
    });

    function handleAiResponse(result, socket, sessionData) {
        socket.emit('ai_typing', false);
        const functionCalls = result.response.functionCalls();

        if (functionCalls && functionCalls.length > 0) {
            const aiDecision = functionCalls[0].args;
            
            let finalPrice = Math.round(parseFloat(aiDecision.final_rounded_price));
            
            if (finalPrice < sessionData.floorPrice) {
                finalPrice = sessionData.floorPrice;
                aiDecision.message = `I wish I could do that, but my absolute rock-bottom is ₹${finalPrice}. I cannot go a single Rupee lower.`;
                aiDecision.status = "negotiating";
            }

            if (aiDecision.status === 'accepted') sessionData.isDealClosed = true;

            // PERFECT MATH REVERSE-ENGINEERING: 
            // We calculate the exact Wastage reduction required to hit the AI's final price, 
            // while keeping the Making Charge completely fixed!
            const newSubtotal = finalPrice / 1.03;
            let newWastageValue = newSubtotal - sessionData.baseMetalValue - sessionData.actualMakingCharge;
            if (newWastageValue < 0) newWastageValue = 0; // Failsafe
            let newWastagePct = (newWastageValue / sessionData.baseMetalValue) * 100;

            socket.emit('price_update', {
                message: aiDecision.message,
                status: aiDecision.status,
                newBreakdown: {
                    wastage_pct: newWastagePct.toFixed(2),
                    wastage_value: newWastageValue.toFixed(2),
                    making_charge: sessionData.actualMakingCharge.toFixed(2), // LOCKS THE MAKING CHARGE
                    final_total_price: finalPrice
                }
            });
        } else {
            socket.emit('system_message', { text: result.response.text() });
        }
    }
};