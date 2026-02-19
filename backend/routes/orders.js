const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST, 
    port: process.env.DB_PORT, 
    database: process.env.DB_NAME,
});

router.post('/', async (req, res) => {
    const { product_id, user_bid, chat_history = [] } = req.body;
    
    try {
        const prodRes = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
        if(prodRes.rows.length === 0) return res.status(404).json({error: "Product not found"});
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
        const listedPrice = (subtotal + (subtotal * 0.03)).toFixed(2); 
        
        // Absolute minimum margin is Wholesale + 5%
        const absoluteMinimum = (wholesaleCost * 1.05).toFixed(2); 

        const listedPriceNum = parseFloat(listedPrice);
        const absoluteMinimumNum = parseFloat(absoluteMinimum);

        const historyText = chat_history.map(msg => `${msg.sender.toUpperCase()}: ${msg.text}`).join('\n');
        const apiKey = process.env.GEMINI_API_KEY;

        // Using the most stable prompt injection method
        const fullPrompt = `You are 'Aabarnam Bot', a highly experienced, profit-driven, yet polite Indian jewelry store manager.
Context:
- Product: ${product.name}
- Listed Retail Price: ₹${listedPrice}
- Your ABSOLUTE Hidden Floor Price: ₹${absoluteMinimum}

Conversation History so far:
${historyText}

Customer's New Input: "${user_bid}"

CRITICAL NEGOTIATION RULES (FOLLOW STRICTLY):
1. MAXIMIZE PROFIT: Your goal is to sell as close to ₹${listedPrice} as possible. DO NOT drop your price quickly.
2. SLOW PACING: When the customer makes an offer, only drop your previous price by very small margins (e.g., ₹200 to ₹800 at a time). Explain that the making charges and pure gold value leave very little room.
3. THE STUBBORN CUSTOMER: If the customer is adamant and keeps repeating the same price, hold your ground at first. If they refuse to budge after 2-3 turns, AND their offer is at least above ₹${absoluteMinimum}, you may finally accept it.
4. OVER-BIDDING (GENEROUS): If the customer offers more than ₹${listedPrice}, act warmly surprised. Say: "You are too kind! I cannot take that much. The actual value is ₹${listedPrice}, but as a special courtesy, I will do ₹${(listedPriceNum * 0.97).toFixed(2)} for you."
5. THE SACRED FLOOR: NEVER, UNDER ANY CIRCUMSTANCES, offer or accept a price below ₹${absoluteMinimum}.
6. NON-NUMERIC/GREETINGS: If they say hi/hello/hy/nope or don't provide a number, warmly ask for their numeric offer.
7. Output MUST be strictly valid JSON.

Schema:
{
  "response_message": "string",
  "status": "negotiating" | "accepted",
  "counter_offer": number
}`;

        try {
            if (!apiKey) throw new Error("Missing API Key");

            // Reverted to the most stable standard model name
            const aiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            const payload = {
                contents: [{ parts: [{ text: fullPrompt }] }],
                generationConfig: { temperature: 0.4, responseMimeType: "application/json" }
            };

            const aiRes = await axios.post(aiUrl, payload, { headers: { 'Content-Type': 'application/json' }});
            let aiResponseText = aiRes.data.candidates[0].content.parts[0].text;
            const cleanedJson = aiResponseText.replace(/```json/gi, '').replace(/```/g, '').trim();
            return res.json(JSON.parse(cleanedJson));

        } catch (apiErr) {
            console.warn("Gemini API failed, using Master Fallback.");
            
            // --- SMARTER FALLBACK ENGINE ---
            const userOfferStr = user_bid.replace(/[^0-9.]/g, ''); // Extract numbers
            const userOffer = parseFloat(userOfferStr);

            // Handle "hy", "nope", or text without numbers gracefully
            if (!userOfferStr || isNaN(userOffer) || userOffer === 0) {
                return res.json({ 
                    response_message: `Namaste! The listed price is ₹${listedPrice}. What is your numeric offer?`, 
                    status: "negotiating", 
                    counter_offer: listedPriceNum 
                });
            }
            
            if (userOffer > listedPriceNum) {
                const courtesyPrice = (listedPriceNum * 0.97).toFixed(2);
                return res.json({ response_message: `You are too kind! The actual value is ₹${listedPrice}, but as a special courtesy, I will do ₹${courtesyPrice}.`, status: "accepted", counter_offer: parseFloat(courtesyPrice) });
            } else if (userOffer >= absoluteMinimumNum) {
                const counter = Math.max(userOffer, listedPriceNum - 1000).toFixed(2);
                if (userOffer >= parseFloat(counter)) {
                   return res.json({ response_message: `You drive a hard bargain. I can agree to ₹${userOffer}. Let's lock it in!`, status: "accepted", counter_offer: userOffer });
                }
                return res.json({ response_message: `I can reduce the price a little bit to ₹${counter}, but the high purity means I can't go much lower.`, status: "negotiating", counter_offer: parseFloat(counter) });
            } else {
                return res.json({ response_message: `I respect your budget, but the raw material cost itself is higher. My absolute rock-bottom price is ₹${absoluteMinimum}.`, status: "negotiating", counter_offer: absoluteMinimumNum });
            }
        }

    } catch (err) {
        console.error("Critical Error:", err.message);
        res.status(500).json({ error: "Bargain engine encountered an error" });
    }
});

module.exports = router;