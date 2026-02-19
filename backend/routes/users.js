const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME,
});

// GET all customers for Admin CRM
router.get('/', async (req, res) => {
    try {
        const result = await pool.query("SELECT id, name, email, phone, created_at FROM users WHERE role = 'CUSTOMER' ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch users' }); }
});

// GET full customer profile
router.get('/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const userRes = await pool.query('SELECT id, name, email, phone, created_at FROM users WHERE id = $1', [userId]);
        const addressesRes = await pool.query('SELECT * FROM user_addresses WHERE user_id = $1', [userId]);
        const ordersRes = await pool.query(`
            SELECT o.*, 
                   COALESCE(json_agg(json_build_object('product_name', oi.product_name, 'quantity', oi.quantity, 'price', oi.price_at_purchase)) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
            FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id WHERE o.user_id = $1 GROUP BY o.id ORDER BY o.created_at DESC
        `, [userId]);
        const wishlistRes = await pool.query(`
            SELECT p.id, p.name, p.sku, p.item_type, w.created_at as added_on
            FROM wishlists w JOIN products p ON w.product_id = p.id WHERE w.user_id = $1
        `, [userId]);

        res.json({
            profile: userRes.rows[0],
            addresses: addressesRes.rows,
            orders: ordersRes.rows,
            wishlist: wishlistRes.rows
        });
    } catch (err) { res.status(500).json({ error: 'Failed to fetch user details' }); }
});

module.exports = router;