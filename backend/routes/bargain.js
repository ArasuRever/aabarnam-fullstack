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
        const absoluteMinimum = (wholesaleCost * 1.05).toFixed(2); 

        const apiKey = process.env.GEMINI_API_KEY;

        const systemPrompt = `You are 'Aabarnam Bot', a sophisticated, polite Indian jewelry salesperson.
Context:
- Product: ${product.name}
- Listed Retail Price: ₹${listedPrice}
- Your Hidden Floor Price: ₹${absoluteMinimum}
- Customer Input: "${user_bid}"

Instructions:
1. GREETINGS: If the user says "Hi", "Hello", or "Namaste", respond warmly and ask how you can help. Status: "negotiating", counter_offer: ${listedPrice}.
2. OVER-BIDDING: If user offers MORE than ₹${listedPrice}, politely explain the price is only ₹${listedPrice} and accept at that.
3. NEGOTIATION: If they offer less than ₹${absoluteMinimum}, explain craftsmanship and purity costs, and make a counter-offer above floor.
4. If the offer is between ₹${absoluteMinimum} and ₹${listedPrice}, you can accept or try to get ₹500 more for profit.
5. RETURN ONLY RAW JSON. DO NOT INCLUDE MARKDOWN, BACKTICKS, OR EXPLANATIONS.

Schema:
{
  "response_message": "string",
  "status": "negotiating" | "accepted",
  "counter_offer": number
}`;

        let aiResponseText = "";

        try {
            // ATTEMPT 1: Try the v1 gemini-1.5-flash model
            const primaryUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            const primaryRes = await axios.post(primaryUrl, {
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
            });
            aiResponseText = primaryRes.data.candidates[0].content.parts[0].text;
            
        } catch (primaryErr) {
            // ATTEMPT 2: If 1.5-flash is not found (404), fallback to the universally available gemini-pro
            if (primaryErr.response && primaryErr.response.status === 404) {
                console.log("gemini-1.5-flash not found for this key. Falling back to gemini-pro...");
                const fallbackUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;
                const fallbackRes = await axios.post(fallbackUrl, {
                    contents: [{ parts: [{ text: systemPrompt }] }],
                    generationConfig: { temperature: 0.7 } // gemini-pro doesn't support responseMimeType
                });
                aiResponseText = fallbackRes.data.candidates[0].content.parts[0].text;
            } else {
                throw primaryErr; // Throw other errors (like 403 API Key invalid) to the outer catch
            }
        }

        // AGGRESSIVE SANITIZATION: Removes any markdown blocks to guarantee JSON.parse works
        const cleanedJson = aiResponseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        
        res.json(JSON.parse(cleanedJson));

    } catch (err) {
        console.error("Negotiation Error Details:", err.response?.data || err.message);
        res.status(500).json({ error: "Bargain engine error" });
    }
});

module.exports = router;