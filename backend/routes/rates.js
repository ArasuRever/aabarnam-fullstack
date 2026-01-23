const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Database connection inside the route
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

// GET /api/rates - Fetch all live metal rates (For Customer Site)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT metal_type, rate_per_gram, updated_at FROM metal_rates ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error fetching rates' });
    }
});

// PUT /api/rates - Update live metal rates (For Admin Dashboard)
router.put('/', async (req, res) => {
    const { rates } = req.body; // Expecting an array of { metal_type, rate_per_gram }

    if (!rates || !Array.isArray(rates)) {
        return res.status(400).json({ error: 'Invalid data format. Expected an array of rates.' });
    }

    try {
        // Loop through the array and update each rate
        for (const rate of rates) {
            await pool.query(
                'UPDATE metal_rates SET rate_per_gram = $1, updated_at = CURRENT_TIMESTAMP WHERE metal_type = $2',
                [rate.rate_per_gram, rate.metal_type]
            );
        }
        res.json({ message: 'Live rates updated successfully!' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error updating rates' });
    }
});

module.exports = router;