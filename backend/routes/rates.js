const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

// GET /api/rates - Fetch all live metal rates
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT metal_type, rate_per_gram, previous_rate, updated_at FROM metal_rates ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error fetching rates' });
    }
});

// PUT /api/rates - Update live rates & Auto-archive previous rate
router.put('/', async (req, res) => {
    const { rates } = req.body; // Expecting: [{ metal_type: '22K_GOLD', rate_per_gram: 6500 }, ...]

    if (!rates || !Array.isArray(rates)) {
        return res.status(400).json({ error: 'Invalid data format.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const rate of rates) {
            // LOGIC: If the new rate is DIFFERENT, move current -> previous
            // We use a specific SQL query to handle this atomically
            await client.query(
                `UPDATE metal_rates 
                 SET previous_rate = CASE 
                        WHEN rate_per_gram != $1 THEN rate_per_gram 
                        ELSE previous_rate 
                     END,
                     rate_per_gram = $1, 
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE metal_type = $2`,
                [rate.rate_per_gram, rate.metal_type]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Market rates updated successfully!' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: 'Server error updating rates' });
    } finally {
        client.release();
    }
});

module.exports = router;