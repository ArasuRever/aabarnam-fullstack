const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME,
});

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Server error fetching orders' }); }
});

router.get('/my-orders/:userId', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT o.*, 
                   COALESCE(json_agg(json_build_object('product_name', oi.product_name, 'quantity', oi.quantity, 'price', oi.price_at_purchase)) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
            FROM orders o 
            LEFT JOIN order_items oi ON o.id = oi.order_id 
            WHERE o.user_id = $1 
            GROUP BY o.id 
            ORDER BY o.created_at DESC
        `, [req.params.userId]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { user_id, customer_name, phone_number, total_amount, address, city, pincode, payment_method, items } = req.body;

        let generatedOrderId; 

        const orderRes = await client.query(
            'INSERT INTO orders (user_id, customer_name, phone_number, total_amount, status, address, city, pincode, payment_method, payment_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id',
            [user_id, customer_name, phone_number, total_amount, 'PENDING', address, city, pincode, payment_method, 'PENDING']
        );
        generatedOrderId = orderRes.rows[0].id;

        for (const item of items) {
            const origPrice = item.price_breakdown?.original_price || item.price_breakdown?.final_total_price;
            const discount = item.price_breakdown?.negotiated_discount || 0;

            await client.query(
                `INSERT INTO order_items (order_id, product_id, product_name, quantity, price_at_purchase, original_price, negotiated_discount) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [generatedOrderId, item.id, item.name, item.qty || 1, item.price_breakdown?.final_total_price, origPrice, discount]
            );

            await client.query('UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2', [item.qty || 1, item.id]);
        }

        await client.query('COMMIT');
        res.json({ message: "Order placed successfully!", orderId: generatedOrderId });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Failed to process order. Please try again.' });
    } finally { client.release(); }
});

router.put('/:id/payment', async (req, res) => {
    try {
        await pool.query('UPDATE orders SET payment_status = $1 WHERE id = $2', [req.body.payment_status, req.params.id]);
        res.json({ message: 'Payment status updated' });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// UPGRADED: Handles Cancellations & Flags Items for Reshelving
router.put('/:id/status', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { status, cancel_reason, cancelled_by } = req.body;
        const orderId = req.params.id;

        await client.query(
            'UPDATE orders SET status = $1, cancel_reason = $2, cancelled_by = $3 WHERE id = $4', 
            [status, cancel_reason || null, cancelled_by || null, orderId]
        );

        // If cancelled or returned, flag items in the Reshelving Queue
        if (status === 'CANCELLED' || status === 'RETURNED') {
            await client.query("UPDATE order_items SET reshelf_status = 'PENDING' WHERE order_id = $1", [orderId]);
        }

        await client.query('COMMIT');
        res.json({ message: 'Status updated' });
    } catch (err) { 
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Server error' }); 
    } finally { client.release(); }
});

// NEW: Fetch Pending Reshelf Items for Admin
router.get('/inventory/reshelf', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT oi.*, o.customer_name, o.status as order_status, p.main_image_url
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE oi.reshelf_status = 'PENDING'
            ORDER BY o.created_at DESC
        `);
        
        const items = result.rows.map(item => ({
            ...item,
            main_image_url: item.main_image_url ? `data:image/jpeg;base64,${item.main_image_url.toString('base64')}` : null
        }));
        res.json(items);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// NEW: Action a Reshelf Item
router.put('/inventory/reshelf/:itemId', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { action } = req.body; // 'RESTOCK' or 'HOLD'
        const itemId = req.params.itemId;

        const itemRes = await client.query('SELECT product_id, quantity FROM order_items WHERE id = $1', [itemId]);
        const item = itemRes.rows[0];

        if (action === 'RESTOCK') {
            await client.query('UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2', [item.quantity, item.product_id]);
            await client.query("UPDATE order_items SET reshelf_status = 'RESTOCKED' WHERE id = $1", [itemId]);
        } else if (action === 'HOLD') {
            await client.query("UPDATE order_items SET reshelf_status = 'HELD' WHERE id = $1", [itemId]);
        }

        await client.query('COMMIT');
        res.json({ message: 'Inventory updated successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Server error' });
    } finally { client.release(); }
});

module.exports = router;