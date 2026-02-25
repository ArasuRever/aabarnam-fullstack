const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verifyAdmin } = require('../middleware/authMiddleware');

const pool = new Pool({
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME,
});

// Update User Profile (Jewelry Vault)
router.put('/profile/:id', async (req, res) => {
    const userId = req.params.id;
    const { name, gender, dob, ring_size, bangle_size, secondary_phone } = req.body;
    try {
        await pool.query(
            `UPDATE users SET name = $1, gender = $2, dob = $3, ring_size = $4, bangle_size = $5, secondary_phone = $6 WHERE id = $7`,
            [name, gender, dob, ring_size, bangle_size, secondary_phone, userId]
        );
        res.json({ message: "Jewelry Vault updated successfully! ✨" });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update vault details' });
    }
});

// ---------------------------------------------------------
// NEW: FAMILY & GIFTING VAULT ROUTES
// ---------------------------------------------------------

// GET all relations for a user
router.get('/:id/relations', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM user_relations WHERE user_id = $1 ORDER BY created_at DESC', [req.params.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch relations' }); }
});

// POST a new relation
router.post('/:id/relations', async (req, res) => {
    const { name, relationship, gender, dob, ring_size, bangle_size } = req.body;
    try {
        await pool.query(
            'INSERT INTO user_relations (user_id, name, relationship, gender, dob, ring_size, bangle_size) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [req.params.id, name, relationship, gender, dob || null, ring_size, bangle_size]
        );
        res.json({ message: "Relation added to vault!" });
    } catch (err) { res.status(500).json({ error: 'Failed to add relation' }); }
});

// PUT (update) a relation
router.put('/relations/:relationId', async (req, res) => {
    const { name, relationship, gender, dob, ring_size, bangle_size } = req.body;
    try {
        await pool.query(
            'UPDATE user_relations SET name = $1, relationship = $2, gender = $3, dob = $4, ring_size = $5, bangle_size = $6 WHERE id = $7',
            [name, relationship, gender, dob || null, ring_size, bangle_size, req.params.relationId]
        );
        res.json({ message: "Relation details updated!" });
    } catch (err) { res.status(500).json({ error: 'Failed to update relation' }); }
});

// DELETE a relation
router.delete('/relations/:relationId', async (req, res) => {
    try {
        await pool.query('DELETE FROM user_relations WHERE id = $1', [req.params.relationId]);
        res.json({ message: "Relation removed from vault." });
    } catch (err) { res.status(500).json({ error: 'Failed to delete relation' }); }
});

// ---------------------------------------------------------
// EXISTING ADMIN ROUTES
// ---------------------------------------------------------
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query("SELECT id, name, email, phone, created_at FROM users WHERE role = 'CUSTOMER' ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch users' }); }
});

router.get('/:id', verifyAdmin, async (req, res) => {
    const userId = req.params.id;
    try {
        const userRes = await pool.query('SELECT id, name, email, phone, gender, dob, ring_size, bangle_size, created_at FROM users WHERE id = $1', [userId]);
        const addressesRes = await pool.query('SELECT * FROM user_addresses WHERE user_id = $1', [userId]);
        
        const ordersRes = await pool.query(`
            SELECT o.*, 
                   COALESCE(json_agg(json_build_object(
                       'product_name', oi.product_name, 
                       'quantity', oi.quantity, 
                       'price', oi.price_at_purchase,
                       'discount', oi.negotiated_discount
                   )) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
            FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id 
            WHERE o.user_id = $1 GROUP BY o.id ORDER BY o.created_at DESC
        `, [userId]);
        
        const wishlistRes = await pool.query(`
            SELECT p.id, p.name, p.sku, p.item_type, w.created_at as added_on
            FROM wishlists w JOIN products p ON w.product_id = p.id WHERE w.user_id = $1
        `, [userId]);

        res.json({
            profile: userRes.rows[0], addresses: addressesRes.rows,
            orders: ordersRes.rows, wishlist: wishlistRes.rows
        });
    } catch (err) { res.status(500).json({ error: 'Failed to fetch user details' }); }
});

module.exports = router;