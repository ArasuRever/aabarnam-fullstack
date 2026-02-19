const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME,
});

router.post('/', async (req, res) => {
    const { product_id, user_bid } = req.body;
    
    try {
        // 1. Fetch Product Data
        const prodRes = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
        if(prodRes.rows.length === 0) return res.status(404).json({error: "Product not found"});
        const product = prodRes.rows[0];

        // 2. Fetch Live Rates
        const rawMetalToFetch = product.metal_type.includes('GOLD') ? '24K_GOLD' : 'SILVER';
        const rateRes = await pool.query('SELECT rate_per_gram FROM metal_rates WHERE metal_type = $1', [rawMetalToFetch]);
        const retailRateRes = await pool.query('SELECT rate_per_gram FROM metal_rates WHERE metal_type = $1', [product.metal_type]);
        
        const rawRate = rateRes.rows.length > 0 ? parseFloat(rateRes.rows[0].rate_per_gram) : 0;
        const retailRate = retailRateRes.rows.length > 0 ? parseFloat(retailRateRes.rows[0].rate_per_gram) : 0;

        // 3. The Golden Wholesale Math
        // Pure Weight = Gross * (Touch / 100)
        const pureWeight = parseFloat(product.gross_weight) * (parseFloat(product.purchase_touch_pct || 91.6) / 100);
        const wholesaleCost = (pureWeight * rawRate) + parseFloat(product.purchase_mc || 0);
        
        // 4. Calculate Listed Retail Price
        const retailMetalValue = parseFloat(product.net_weight) * retailRate;
        const wastageValue = (retailMetalValue * parseFloat(product.wastage_pct)) / 100;
        let actualMakingCharge = parseFloat(product.making_charge);
        if (product.making_charge_type === 'PERCENTAGE') actualMakingCharge = (retailMetalValue * actualMakingCharge) / 100;
        
        const subtotal = retailMetalValue + wastageValue + actualMakingCharge;
        const listedPrice = (subtotal + (subtotal * 0.03)).toFixed(2); // Adding 3% GST

        // Define the Absolute Floor Price (Wholesale + 3% GST + 2% minimal profit = ~5% markup on cost)
        const absoluteMinimum = (wholesaleCost * 1.05).toFixed(2); 

        // 5. Connect to Gemini AI
        const apiKey = process.env.GEMINI_API_KEY;
        if(!apiKey) {
            // Fallback Engine if API key is missing
            if(parseFloat(user_bid) >= parseFloat(absoluteMinimum)) {
                return res.json({ response_message: `I can agree to ₹${user_bid}! Let's lock it in.`, status: "accepted", counter_offer: user_bid });
            } else {
                return res.json({ response_message: `I cannot go that low. My best price is ₹${absoluteMinimum}.`, status: "negotiating", counter_offer: absoluteMinimum });
            }
        }

        const systemPrompt = `You are an expert, friendly Indian jewelry retail salesperson named 'Aabarnam Bot'.
You are negotiating the price of a ${product.name} (${product.gross_weight}g of ${product.metal_type.replace('_', ' ')}).
Listed Retail Price: ₹${listedPrice}
The absolute lowest price you are allowed to sell it for is: ₹${absoluteMinimum}. DO NOT reveal this exact number immediately.
Customer's Bid: ₹${user_bid}

Instructions:
1. If the bid is below ₹${absoluteMinimum}, politely reject it. Explain that the purity and weight make it impossible, and make a counter-offer between their bid and the listed price (but strictly above the minimum).
2. If the bid is between ₹${absoluteMinimum} and ₹${listedPrice}, you can accept it, OR negotiate slightly higher to secure better profit.
3. If you accept the deal, set status to "accepted" and counter_offer to the agreed amount.
4. If negotiating, set status to "negotiating" and counter_offer to your proposed amount.
5. Return strictly valid JSON.

Schema:
{
  "response_message": "your conversational reply",
  "status": "negotiating" | "accepted" | "rejected",
  "counter_offer": 12345.50
}`;

        const aiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        };

        const aiRes = await axios.post(aiUrl, payload);
        const aiResponseText = aiRes.data.candidates[0].content.parts[0].text;
        
        res.json(JSON.parse(aiResponseText));

    } catch (err) {
        console.error("AI Negotiation Error:", err.message);
        res.status(500).json({ error: "Bargaining engine error" });
    }
});

module.exports = router;