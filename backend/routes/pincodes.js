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

// GET /api/pincodes/:pincode - Check if a pincode is serviceable
router.get('/:pincode', async (req, res) => {
    // 1. Remove spaces
    const pincode = req.params.pincode.trim();

    try {
        // 2. The Fix: Explicitly cast $1 to text to match VARCHAR column
        const result = await pool.query('SELECT * FROM serviceable_pincodes WHERE pincode = $1::text', [pincode]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                serviceable: false, 
                message: 'Sorry, we do not deliver to this pincode yet.' 
            });
        }

        const data = result.rows[0];
        res.json({
            serviceable: true,
            pincode: data.pincode,
            is_cod_allowed: data.is_cod_allowed,
            est_delivery_days: data.est_delivery_days,
            message: `Delivery available! Expected delivery in ${data.est_delivery_days} days.`
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error checking pincode' });
    }
});

module.exports = router;