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
        const prodRes = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
        if(prodRes.rows.length === 0) return res.status(404).json({error: "Product not found"});
        const product = prodRes.rows[0];

        // 1. Calculate Prices (Floor vs Retail)
        const rawMetalToFetch = product.metal_type.includes('GOLD') ? '24K_GOLD' : 'SILVER';
        const rateRes = await pool.query('SELECT rate_per_gram FROM metal_rates WHERE metal_type = $1', [rawMetalToFetch]);
        const retailRateRes = await pool.query('SELECT rate_per_gram FROM metal_rates WHERE metal_type = $1', [product.metal_type]);
        
        const rawRate = parseFloat(rateRes.rows[0]?.rate_per_gram || 0);
        const retailRate = parseFloat(retailRateRes.rows[0]?.rate_per_gram || 0);

        const pureWeight = parseFloat(product.gross_weight) * (parseFloat(product.purchase_touch_pct || 91.6) / 100);
        const wholesaleCost = (pureWeight * rawRate) + parseFloat(product.purchase_mc || 0);
        
        const retailMetalValue = parseFloat(product.net_weight) * retailRate;
        const wastageValue = (retailMetalValue * parseFloat(product.wastage_pct)) / 100;
        let actualMakingCharge = parseFloat(product.making_charge);
        if (product.making_charge_type === 'PERCENTAGE') actualMakingCharge = (retailMetalValue * actualMakingCharge) / 100;
        
        const listedPrice = ((retailMetalValue + wastageValue + actualMakingCharge) * 1.03).toFixed(2); 
        const absoluteMinimum = (wholesaleCost * 1.05).toFixed(2); 

        // 2. The Salesperson Prompt
        const systemPrompt = `
        You are 'Aabarnam Bot', a sophisticated, polite jewelry salesperson.
        Context:
        - Product: ${product.name}
        - Listed Retail Price: ₹${listedPrice}
        - Secret Floor Price: ₹${absoluteMinimum}
        - Customer Input: "${user_bid}"

        Instructions:
        1. If the user is just greeting (Hi/Hello/How are you), respond warmly and ask how you can help with the ${product.name}.
        2. If the user offers MORE than ₹${listedPrice}, say: "That is very kind, but our price is only ₹${listedPrice}. I can offer it to you for that price right now!"
        3. If they offer less than ₹${absoluteMinimum}, politely explain that the quality and craftsmanship have a fixed cost, then make a counter-offer.
        4. If they offer between floor and retail, you can accept it or try to squeeze ₹500 more.
        5. Return ONLY JSON.

        Output Format:
        {
          "response_message": "Warm sales talk here",
          "status": "negotiating" | "accepted" | "rejected",
          "counter_offer": 12345
        }`;

        const aiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const aiRes = await axios.post(aiUrl, {
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        res.json(JSON.parse(aiRes.data.candidates[0].content.parts[0].text));

    } catch (err) {
        console.error("Negotiation Error:", err);
        res.status(500).json({ error: "Bargain server error" });
    }
});

module.exports = router;