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
        
        const subtotal = retailMetalValue + wastageValue + actualMakingCharge;
        const listedPrice = (subtotal + (subtotal * 0.03)).toFixed(2); 
        const absoluteMinimum = (wholesaleCost * 1.05).toFixed(2); 

        // 4. Gemini AI Integration Setup
        const apiKey = process.env.GEMINI_API_KEY;

        const systemPrompt = `You are 'Aabarnam Bot', a sophisticated, polite Indian jewelry salesperson.
Context:
- Product: ${product.name}
- Listed Retail Price: ₹${listedPrice}
- Your Hidden Floor Price: ₹${absoluteMinimum}

Instructions:
1. GREETINGS: If the user says "Hi", "Hello", or "Namaste", respond warmly and ask for their offer. Status: "negotiating", counter_offer: ${listedPrice}.
2. OVER-BIDDING: If user offers MORE than ₹${listedPrice}, politely explain the price is only ₹${listedPrice} and accept at that.
3. NEGOTIATION: If they offer less than ₹${absoluteMinimum}, explain craftsmanship and purity costs, and make a counter-offer above floor.
4. ACCEPTANCE: If the offer is between ₹${absoluteMinimum} and ₹${listedPrice}, you can accept or try to get slightly more for profit.
5. You must output VALID JSON matching the schema perfectly. No markdown formatting.`;

        // Attempt Gemini API Call using the highly stable 'latest' endpoint
        try {
            if (!apiKey) throw new Error("Missing API Key");

            const aiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
            
            const payload = {
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ parts: [{ text: `Customer Input: "${user_bid}"` }] }],
                generationConfig: { 
                    temperature: 0.7,
                    responseMimeType: "application/json" // Forces 100% perfect JSON response
                }
            };

            const aiRes = await axios.post(aiUrl, payload, {
                headers: { 'Content-Type': 'application/json' }
            });

            let aiResponseText = aiRes.data.candidates[0].content.parts[0].text;
            
            // Clean just in case the AI ignored the MIME type instruction
            const cleanedJson = aiResponseText.replace(/```json/gi, '').replace(/```/g, '').trim();
            return res.json(JSON.parse(cleanedJson));

        } catch (apiErr) {
            console.warn("Gemini API skipped or failed. Using Local Math Fallback Engine.", apiErr.message);
            
            // INDESTRUCTIBLE FALLBACK ENGINE: If API fails, auto-negotiate using local math!
            const userOffer = parseFloat(user_bid.replace(/[^0-9.]/g, '')) || 0;
            
            if (userOffer >= parseFloat(listedPrice)) {
                return res.json({ response_message: `I am happy to offer this to you for our listed price of ₹${listedPrice}!`, status: "accepted", counter_offer: listedPrice });
            } else if (userOffer >= parseFloat(absoluteMinimum)) {
                return res.json({ response_message: `That's a fair offer. I can agree to ₹${userOffer}. Let's lock it in!`, status: "accepted", counter_offer: userOffer });
            } else {
                // Generate a counter-offer halfway between their bid and the listed price, ensuring it's above minimum
                const counter = Math.max(parseFloat(absoluteMinimum), (parseFloat(listedPrice) + userOffer) / 2).toFixed(2);
                return res.json({ response_message: `Given the purity and craftsmanship, I cannot go that low. My best price for you is ₹${counter}.`, status: "negotiating", counter_offer: parseFloat(counter) });
            }
        }

    } catch (err) {
        console.error("Critical Negotiation Error:", err.message);
        res.status(500).json({ error: "Bargain engine encountered a critical error" });
    }
});

module.exports = router;