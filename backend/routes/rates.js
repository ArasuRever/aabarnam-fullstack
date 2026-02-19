const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME,
});

// GET /api/rates - Fetch all current retail rates
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM metal_rates ORDER BY metal_type ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch rates' }); }
});

// POST /api/rates - Manual Override
router.post('/', async (req, res) => {
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
// 🔥 THE DYNAMIC MARKET SYNC ENGINE
// ------------------------------------------------------------------

const syncMarketRates = async (retailPremiumPct = 3) => {
    try {
        let raw24kRate = 0;
        let rawSilverRate = 0;

        try {
            const goldRes = await axios.get('https://open.er-api.com/v6/latest/XAU');
            const silverRes = await axios.get('https://open.er-api.com/v6/latest/XAG');
            raw24kRate = goldRes.data.rates.INR / 31.1034768;
            rawSilverRate = silverRes.data.rates.INR / 31.1034768;
        } catch (apiError) {
            raw24kRate = 15818; // Approx Salem 24K Rate
            rawSilverRate = 270; // Approx Salem Silver Rate
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
let autoSyncIntervalHours = 1; // Default to 1 hour
let autoSyncPremium = 3.0;     // Default 3%

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
startAutoSync(); // Initialize on boot

// GET Current Config
router.get('/config', (req, res) => {
    res.json({ interval: autoSyncIntervalHours, premium: autoSyncPremium });
});

// POST Update Config
router.post('/config', (req, res) => {
    const { interval, premium } = req.body;
    if (interval !== undefined) autoSyncIntervalHours = parseFloat(interval);
    if (premium !== undefined) autoSyncPremium = parseFloat(premium);
    
    startAutoSync(); // Restart the timer with new settings
    res.json({ message: "Background sync settings updated!" });
});

// On-Demand Sync Route
router.post('/sync', async (req, res) => {
    const { premium } = req.body;
    const result = await syncMarketRates(premium || autoSyncPremium);
    if (result.success) {
        res.json({ message: "Live Market Sync Successful!", data: result.rates });
    } else {
        res.status(500).json({ error: "Failed to sync with live market." });
    }
});

module.exports = router;