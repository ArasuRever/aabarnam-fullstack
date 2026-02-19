const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME,
});

router.get('/:userId', async (req, res) => {
    try {
        const query = `SELECT w.id as wishlist_id, p.* FROM wishlists w JOIN products p ON w.product_id = p.id WHERE w.user_id = $1`;
        const result = await pool.query(query, [req.params.userId]);
        const products = result.rows.map(p => ({
            ...p, main_image_url: p.main_image_url ? `data:image/jpeg;base64,${p.main_image_url.toString('base64')}` : null
        }));
        res.json(products);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/toggle', async (req, res) => {
    const { user_id, product_id } = req.body;
    try {
        const exists = await pool.query('SELECT * FROM wishlists WHERE user_id = $1 AND product_id = $2', [user_id, product_id]);
        if (exists.rows.length > 0) {
            await pool.query('DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2', [user_id, product_id]);
            return res.json({ message: 'Removed from wishlist', status: 'removed' });
        } else {
            await pool.query('INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2)', [user_id, product_id]);
            return res.json({ message: 'Added to wishlist', status: 'added' });
        }
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;