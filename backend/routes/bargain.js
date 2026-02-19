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

        // 3. Mathematical Calculations
        const pureWeight = parseFloat(product.gross_weight) * (parseFloat(product.purchase_touch_pct || 91.6) / 100);
        const wholesaleCost = (pureWeight * rawRate) + parseFloat(product.purchase_mc || 0);
        
        const retailMetalValue = parseFloat(product.net_weight) * retailRate;
        const wastageValue = (retailMetalValue * parseFloat(product.wastage_pct)) / 100;
        let actualMakingCharge = parseFloat(product.making_charge);
        if (product.making_charge_type === 'PERCENTAGE') actualMakingCharge = (retailMetalValue * actualMakingCharge) / 100;
        
        const listedPrice = ((retailMetalValue + wastageValue + actualMakingCharge) * 1.03).toFixed(2); 
        const absoluteMinimum = (wholesaleCost * 1.05).toFixed(2); 

        // 4. Gemini AI Integration
        const apiKey = process.env.GEMINI_API_KEY;
        const systemPrompt = `You are 'Aabarnam Bot', a sophisticated Indian jewelry salesperson.
Product: ${product.name}
Listed Price: ₹${listedPrice}
Hidden Floor Price: ₹${absoluteMinimum}
Customer Input: "${user_bid}"

Instructions:
1. If the input is a greeting (Hi/Hello), respond warmly and ask how you can help.
2. If they offer MORE than ₹${listedPrice}, politely inform them the price is only ₹${listedPrice} and accept at that.
3. If bid is < ₹${absoluteMinimum}, explain craftsmanship costs and make a counter-offer above floor.
4. If the offer is between floor and listed, you can accept or try to negotiate slightly higher (e.g., +₹500).
5. RETURN ONLY RAW JSON. NO MARKDOWN.

Format: {"response_message": "string", "status": "negotiating"|"accepted", "counter_offer": number}`;

        // STABLE MODEL IDENTIFIER for v1beta
        const aiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        
        const aiRes = await axios.post(aiUrl, {
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: { 
                responseMimeType: "application/json",
                temperature: 0.7 
            }
        });

        // 5. Clean and Parse Response (Fixes the "Manager is busy" JSON error)
        let aiResponseText = aiRes.data.candidates[0].content.parts[0].text;
        const cleanedJson = aiResponseText.replace(/```json|```/gi, '').trim();
        
        res.json(JSON.parse(cleanedJson));

    } catch (err) {
        console.error("Negotiation Error:", err.response?.data || err.message);
        res.status(500).json({ error: "Bargaining engine error" });
    }
});

module.exports = router;