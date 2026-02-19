const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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
        // 1. Fetch Product Data
        const prodRes = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
        if(prodRes.rows.length === 0) return res.status(404).json({error: "Product not found"});
        const product = prodRes.rows[0];

        // 2. Fetch Live Rates & Math
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
        
        // Floor = Wholesale + 5% markup
        const absoluteMinimum = (wholesaleCost * 1.05).toFixed(2); 

        const listedPriceNum = parseFloat(listedPrice);
        const absoluteMinimumNum = parseFloat(absoluteMinimum);

        const historyText = chat_history.map(msg => `${msg.sender.toUpperCase()}: ${msg.text}`).join('\n');
        const apiKey = process.env.GEMINI_API_KEY;

        try {
            if (!apiKey) throw new Error("Missing API Key");

            const genAI = new GoogleGenerativeAI(apiKey);
            
            // 🔥 CHANGED MODEL TO PRO FOR MAXIMUM STABILITY AND INTELLIGENCE
            const model = genAI.getGenerativeModel({ 
                model: "gemini-1.5-pro", 
                generationConfig: {
                    temperature: 0.7, 
                    responseMimeType: "application/json",
                }
            });

            const systemPrompt = `You are an expert, conversational, and polite Indian jewelry store manager for 'Aabarnam'.
Your goal is to sell the product, keep the customer happy, but protect your profit margins.

CONTEXT:
- Product: ${product.name} (${product.gross_weight}g of ${product.metal_type.replace('_', ' ')})
- Official Retail Price: ₹${listedPrice}
- Your Absolute Floor Price: ₹${absoluteMinimum} (NEVER reveal this number, and NEVER sell below it).

CONVERSATION HISTORY:
${historyText}

CUSTOMER JUST SAID: "${user_bid}"

HOW TO RESPOND:
1. BE HUMAN: Talk naturally. Acknowledge what they said. If they ask for your best price without giving a number, make a small concession.
2. MICRO-CONCESSIONS: Do not drop your price massively all at once. If they ask for a discount, drop your previous offer by just ₹300 to ₹800. 
3. HOLD YOUR GROUND: If they are adamant and bid way below your floor, say no politely, explain the cost of pure gold and craftsmanship, and make a counter-offer that is STILL ABOVE your absolute floor price.
4. CLOSING THE DEAL: If their offer is fair (above the floor), you can accept it, or try to squeeze just ₹200-₹500 more out of them to close.
5. NEVER REVERT: Read the history. Never offer a price higher than a price you already offered.
6. JSON FORMAT ONLY.

Schema:
{
  "response_message": "Your highly conversational, natural, human-like reply",
  "status": "negotiating" | "accepted",
  "counter_offer": numeric_value_of_your_offer
}`;

            const result = await model.generateContent(systemPrompt);
            const responseText = result.response.text();
            
            return res.json(JSON.parse(responseText));

        } catch (apiErr) {
            console.error("❌ GEMINI API FAILED EXACT REASON:", apiErr.message);
            
            // --- SUPERCHARGED FALLBACK ENGINE ---
            const userOfferStr = user_bid.replace(/[^0-9.]/g, '');
            const userOffer = parseFloat(userOfferStr) || 0;
            
            // If the user doesn't provide a number (e.g. "what's the best you can do?")
            if (userOffer === 0) {
                // The fallback automatically takes the initiative and drops the price slightly
                const firstDrop = Math.max(absoluteMinimumNum, listedPriceNum - 500).toFixed(2);
                return res.json({ 
                    response_message: `I can see you have great taste! The listed price is ₹${listedPrice}, but to close the deal right now, I can offer it to you for ₹${firstDrop}. How does that sound?`, 
                    status: "negotiating", 
                    counter_offer: parseFloat(firstDrop) 
                });
            }

            // Normal fallback logic if they provide a number
            if (userOffer >= absoluteMinimumNum) {
                const counter = Math.max(userOffer, listedPriceNum - 800).toFixed(2);
                if (userOffer >= parseFloat(counter)) {
                    return res.json({ response_message: `You drive a hard bargain. Let's do ₹${userOffer}. It's a deal!`, status: "accepted", counter_offer: userOffer });
                }
                return res.json({ response_message: `I can come down slightly to ₹${counter}, but the high purity of our items leaves little margin!`, status: "negotiating", counter_offer: parseFloat(counter) });
            } else {
                return res.json({ response_message: `I'm sorry, ₹${userOffer} is below my actual wholesale cost. My final rock-bottom offer is ₹${absoluteMinimum}.`, status: "negotiating", counter_offer: absoluteMinimumNum });
            }
        }

    } catch (err) {
        console.error("Critical Error:", err.message);
        res.status(500).json({ error: "Bargain engine encountered an error" });
    }
});

module.exports = router;