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

// Helper for humanized fallback text
const getRandomResponse = (type, price) => {
    const responses = {
        greeting: [
            `Namaste! The listed price is ₹${price}. What is your numeric offer?`,
            `Hello! I'd love to help you take this home today. The current price is ₹${price}. What's your offer?`
        ],
        dropPrice: [
            `I can see you have great taste! To help close the deal, I can lower the price to ₹${price}. How does that sound?`,
            `I really want to make this work for you. Let's do ₹${price}. Do we have a deal?`,
            `You're a tough negotiator! I'll come down a bit more to ₹${price}.`
        ],
        hitFloor: [
            `I'm sorry, that is below my actual wholesale cost. The absolute rock-bottom I can do is ₹${price}.`,
            `I wish I could, but the high purity of this piece leaves little margin. My final, lowest offer is ₹${price}.`
        ],
        accept: [
            `You drive a hard bargain. Let's do ₹${price}. It's a deal!`,
            `Alright, I can agree to ₹${price}. Let's lock it in!`
        ]
    };
    const options = responses[type] || responses.dropPrice;
    return options[Math.floor(Math.random() * options.length)];
};

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
        const absoluteMinimum = (wholesaleCost * 1.05).toFixed(2); 

        const listedPriceNum = parseFloat(listedPrice);
        const absoluteMinimumNum = parseFloat(absoluteMinimum);

        const historyText = chat_history.map(msg => `${msg.sender.toUpperCase()}: ${msg.text}`).join('\n');
        const apiKey = process.env.GEMINI_API_KEY;

        const systemPrompt = `You are an expert, conversational, and polite Indian jewelry store manager for 'Aabarnam'.
CONTEXT:
- Product: ${product.name}
- Official Retail Price: ₹${listedPrice}
- Your Absolute Floor Price: ₹${absoluteMinimum} (NEVER reveal this, and NEVER sell below it).

CONVERSATION HISTORY:
${historyText}

CUSTOMER JUST SAID: "${user_bid}"

NEGOTIATION RULES:
1. Talk naturally. Acknowledge what they said. 
2. If they ask for a discount, drop your previous offer by just ₹300 to ₹800. 
3. If they bid below your floor, say no politely and make a counter-offer ABOVE your floor.
4. If their offer is fair (above the floor), accept it.
5. NEVER offer a price higher than a price you already offered.
6. OUTPUT STRICTLY AS A JSON OBJECT matching the schema below. Do not use markdown backticks like \`\`\`json.

Schema:
{
  "response_message": "Your conversational reply",
  "status": "negotiating" | "accepted",
  "counter_offer": 12345
}`;

        let aiResponseText = "";

        try {
            if (!apiKey) throw new Error("Missing API Key");
            const genAI = new GoogleGenerativeAI(apiKey);
            
            // Try 1.5-flash
            let model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            try {
                const result = await model.generateContent(systemPrompt);
                aiResponseText = result.response.text();
            } catch (flashErr) {
                console.warn("1.5-Flash failed, falling back to 1.0-Pro...", flashErr.message);
                model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
                const result = await model.generateContent(systemPrompt);
                aiResponseText = result.response.text();
            }

            const cleanedJson = aiResponseText.replace(/```json/gi, '').replace(/```/g, '').trim();
            return res.json(JSON.parse(cleanedJson));

        } catch (apiErr) {
            console.warn("Both APIs failed. Using Humanized Math Fallback.");
            
            // --- THE HUMANIZED MATH FALLBACK ENGINE ---
            const lowerBid = user_bid.toLowerCase();
            const userOfferStr = user_bid.replace(/[^0-9.]/g, '');
            const userOffer = parseFloat(userOfferStr) || 0;
            
            let lastBotOffer = listedPriceNum;
            for (let i = chat_history.length - 1; i >= 0; i--) {
                if (chat_history[i].sender === 'bot') {
                    const match = chat_history[i].text.match(/₹([0-9,.]+)/);
                    if (match) {
                        lastBotOffer = parseFloat(match[1].replace(/,/g, ''));
                        break;
                    }
                }
            }

            // If the user says "deal", "yes", "done", or "ok" without numbers
            if (userOffer === 0) {
                if (lowerBid.includes('deal') || lowerBid.includes('yes') || lowerBid.includes('ok') || lowerBid.includes('done') || lowerBid.includes('agree')) {
                    return res.json({ 
                        response_message: `Excellent! We have a deal at ₹${lastBotOffer}. I'll lock this in for you right now.`, 
                        status: "accepted", 
                        counter_offer: lastBotOffer 
                    });
                }
                
                // Greeting logic
                if (lastBotOffer === listedPriceNum && chat_history.length <= 2) {
                    return res.json({ response_message: getRandomResponse('greeting', listedPriceNum), status: "negotiating", counter_offer: listedPriceNum });
                }

                // Random chit-chat drops the price slightly
                const politeDrop = Math.max(absoluteMinimumNum, lastBotOffer - (Math.floor(Math.random() * 300) + 300)).toFixed(2);
                if (parseFloat(politeDrop) <= absoluteMinimumNum) {
                    return res.json({ response_message: getRandomResponse('hitFloor', absoluteMinimumNum), status: "negotiating", counter_offer: absoluteMinimumNum });
                }
                return res.json({ response_message: getRandomResponse('dropPrice', politeDrop), status: "negotiating", counter_offer: parseFloat(politeDrop) });
            }

            // Overbidding
            if (userOffer > listedPriceNum) {
                const courtesyPrice = (listedPriceNum - 500).toFixed(2);
                return res.json({ response_message: `You are too generous! As a courtesy, I will do ₹${courtesyPrice}.`, status: "accepted", counter_offer: parseFloat(courtesyPrice) });
            } 
            
            // Hitting the Floor
            if (userOffer < absoluteMinimumNum) {
                return res.json({ response_message: getRandomResponse('hitFloor', absoluteMinimumNum), status: "negotiating", counter_offer: absoluteMinimumNum });
            }

            // The Negotiation Math
            if (userOffer >= lastBotOffer) {
                return res.json({ response_message: getRandomResponse('accept', userOffer), status: "accepted", counter_offer: userOffer });
            }

            const difference = lastBotOffer - userOffer;
            let stepDown = Math.max(400, difference * 0.35); // Drop by ~35% of the difference
            let newBotOffer = lastBotOffer - stepDown;

            newBotOffer = Math.max(absoluteMinimumNum, newBotOffer, userOffer);
            newBotOffer = parseFloat(newBotOffer.toFixed(2));

            if (newBotOffer <= userOffer) {
                return res.json({ response_message: getRandomResponse('accept', userOffer), status: "accepted", counter_offer: userOffer });
            } else {
                return res.json({ response_message: getRandomResponse('dropPrice', newBotOffer), status: "negotiating", counter_offer: newBotOffer });
            }
        }

    } catch (err) {
        console.error("Critical Error:", err.message);
        res.status(500).json({ error: "Bargain engine encountered an error" });
    }
});

module.exports = router;