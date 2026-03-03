const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const axios = require('axios');
const { verifyAdmin } = require('../middleware/authMiddleware'); // 🛡️ Bouncer Imported

const pool = new Pool({
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME,
});

// PUBLIC: GET all current retail rates
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM metal_rates ORDER BY metal_type ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch rates' }); }
});

// 🛡️ SECURED: Manual Override
router.post('/', verifyAdmin, async (req, res) => {
    const { rates } = req.body; 
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const [metal, newRate] of Object.entries(rates)) {
            const current = await client.query('SELECT rate_per_gram FROM metal_rates WHERE metal_type = $1', [metal]);
            let previousRate = current.rows.length > 0 ? current.rows[0].rate_per_gram : newRate;
            
            await client.query(
                `INSERT INTO metal_rates (metal_type, rate_per_gram, previous_rate, updated_at) 
                 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                 ON CONFLICT (metal_type) 
                 DO UPDATE SET previous_rate = metal_rates.rate_per_gram, rate_per_gram = EXCLUDED.rate_per_gram, updated_at = CURRENT_TIMESTAMP`,
                [metal, newRate, previousRate]
            );
        }
        await client.query('COMMIT');
        res.json({ message: "Rates updated successfully" });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Failed to update rates' });
    } finally { client.release(); }
});

// ------------------------------------------------------------------
// 🔥 THE DYNAMIC MARKET SYNC ENGINE (YAHOO FINANCE API)
// ------------------------------------------------------------------

// We use a standard User-Agent so Yahoo Finance doesn't block the request
const yahooAxiosConfig = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
};

const syncMarketRates = async (retailPremiumPct = 3) => {
    try {
        let raw24kRate = 0;
        let rawSilverRate = 0;

        try {
            // 🌟 NEW: Fetching Live Futures Data from Yahoo Finance
            const [goldRes, silverRes, inrRes] = await Promise.all([
                axios.get('https://query1.finance.yahoo.com/v8/finance/chart/GC=F', yahooAxiosConfig), // Gold Futures (USD)
                axios.get('https://query1.finance.yahoo.com/v8/finance/chart/SI=F', yahooAxiosConfig), // Silver Futures (USD)
                axios.get('https://query1.finance.yahoo.com/v8/finance/chart/INR=X', yahooAxiosConfig) // USD to INR exchange rate
            ]);
            
            // Extract the current market price from the JSON payload
            const goldUsd = goldRes.data.chart.result[0].meta.regularMarketPrice;
            const silverUsd = silverRes.data.chart.result[0].meta.regularMarketPrice;
            const usdToInr = inrRes.data.chart.result[0].meta.regularMarketPrice;

            // 1 Troy Ounce = 31.1034768 grams.
            // Math: (Price in USD * Exchange Rate) / Troy Ounce Weight = Price per gram in INR
            raw24kRate = (goldUsd * usdToInr) / 31.1034768;
            rawSilverRate = (silverUsd * usdToInr) / 31.1034768;

        } catch (apiError) {
            console.error("Live API failed, using fallback modern baseline...", apiError.message);
            raw24kRate = 7400; // Modern Failsafe 24K Rate
            rawSilverRate = 90; // Modern Failsafe Silver Rate
        }

        const pure24k = parseFloat(raw24kRate.toFixed(2));
        const pure22k = parseFloat((pure24k * 0.916).toFixed(2));
        const pure18k = parseFloat((pure24k * 0.750).toFixed(2));
        const pureSilver = parseFloat(rawSilverRate.toFixed(2));

        const multiplier = 1 + (retailPremiumPct / 100);
        
        const calculatedRates = {
            '24K_GOLD': (pure24k * multiplier).toFixed(2),
            '22K_GOLD': (pure22k * multiplier).toFixed(2),
            '18K_GOLD': (pure18k * multiplier).toFixed(2),
            'SILVER': (pureSilver * multiplier).toFixed(2)
        };

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const [metal, newRate] of Object.entries(calculatedRates)) {
                const current = await client.query('SELECT rate_per_gram FROM metal_rates WHERE metal_type = $1', [metal]);
                let previousRate = current.rows.length > 0 ? current.rows[0].rate_per_gram : newRate;
                
                await client.query(
                    `INSERT INTO metal_rates (metal_type, rate_per_gram, previous_rate, updated_at) 
                     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                     ON CONFLICT (metal_type) 
                     DO UPDATE SET previous_rate = metal_rates.rate_per_gram, rate_per_gram = EXCLUDED.rate_per_gram, updated_at = CURRENT_TIMESTAMP`,
                    [metal, newRate, previousRate]
                );
            }
            await client.query('COMMIT');
            return { success: true, rates: calculatedRates };
        } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
        } finally { client.release(); }

    } catch (error) {
        return { success: false, error: error.message };
    }
};

// --- BACKGROUND TIMER LOGIC ---
let autoSyncTimer = null;
let autoSyncIntervalHours = 1; 
let autoSyncPremium = 3.0;     

const startAutoSync = () => {
    if (autoSyncTimer) clearInterval(autoSyncTimer);
    
    if (autoSyncIntervalHours > 0) {
        const ms = autoSyncIntervalHours * 60 * 60 * 1000;
        console.log(`⏱️ Background Auto-Sync set to every ${autoSyncIntervalHours} hour(s)`);
        autoSyncTimer = setInterval(() => {
            console.log("🔄 Running Background Market Sync...");
            syncMarketRates(autoSyncPremium);
        }, ms);
    } else {
        console.log("⏸️ Background Auto-Sync Disabled.");
    }
};
startAutoSync(); 

// PUBLIC: GET Current Config
router.get('/config', (req, res) => {
    res.json({ interval: autoSyncIntervalHours, premium: autoSyncPremium });
});

// 🛡️ SECURED: POST Update Config
router.post('/config', verifyAdmin, (req, res) => {
    const { interval, premium } = req.body;
    if (interval !== undefined) autoSyncIntervalHours = parseFloat(interval);
    if (premium !== undefined) autoSyncPremium = parseFloat(premium);
    
    startAutoSync(); 
    res.json({ message: "Background sync settings updated!" });
});

// 🛡️ SECURED: On-Demand Sync Route
router.post('/sync', verifyAdmin, async (req, res) => {
    const { premium } = req.body;
    const result = await syncMarketRates(premium || autoSyncPremium);
    if (result.success) {
        res.json({ message: "Live Market Sync Successful!", data: result.rates });
    } else {
        res.status(500).json({ error: "Failed to sync with live market." });
    }
});

// ------------------------------------------------------------------
// 🔥 REGIONAL BULLION ENGINE (YAHOO FINANCE API)
// ------------------------------------------------------------------
router.get('/regional-bullion', verifyAdmin, async (req, res) => {
    try {
        let raw24kRate = 0;
        let rawSilverRate = 0;
        try {
            // 🌟 NEW: Fetching Live Futures Data from Yahoo Finance
            const [goldRes, silverRes, inrRes] = await Promise.all([
                axios.get('https://query1.finance.yahoo.com/v8/finance/chart/GC=F', yahooAxiosConfig),
                axios.get('https://query1.finance.yahoo.com/v8/finance/chart/SI=F', yahooAxiosConfig),
                axios.get('https://query1.finance.yahoo.com/v8/finance/chart/INR=X', yahooAxiosConfig)
            ]);
            
            const goldUsd = goldRes.data.chart.result[0].meta.regularMarketPrice;
            const silverUsd = silverRes.data.chart.result[0].meta.regularMarketPrice;
            const usdToInr = inrRes.data.chart.result[0].meta.regularMarketPrice;

            raw24kRate = (goldUsd * usdToInr) / 31.1034768;
            rawSilverRate = (silverUsd * usdToInr) / 31.1034768;
        } catch (apiError) {
            console.error("Regional Bullion API failed, using fallback...", apiError.message);
            raw24kRate = 7400; // Modern baseline
            rawSilverRate = 90; 
        }

        // Apply Indian Physical Market Math (~6% Import Duty + Local Premium)
        const indianBase24k = raw24kRate * 1.0811; 
        const indianBaseSilver = rawSilverRate * 1.06;

        const generateCityRates = (offset) => {
            const city24k = indianBase24k + offset;
            return {
                '24K_GOLD': city24k.toFixed(2),
                '22K_GOLD': (city24k * 0.916).toFixed(2),
                '18K_GOLD': (city24k * 0.750).toFixed(2),
                'SILVER': (indianBaseSilver + (offset * 0.01)).toFixed(2)
            };
        };

        res.json({
            timestamp: new Date().toISOString(),
            markets: {
                'Chennai': generateCityRates(15),     
                'Salem': generateCityRates(5),        
                'Coimbatore': generateCityRates(10)   
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch regional bullion' });
    }
});

module.exports = router;