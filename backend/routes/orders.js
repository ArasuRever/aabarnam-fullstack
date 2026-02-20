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

// GET /api/orders - Admin fetch all orders
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Server error fetching orders' }); }
});

// GET /api/orders/my-orders/:userId - Customer fetch their orders
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

// POST /api/orders - Create new order (SECURED & TAMPER-PROOF)
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // FIX: Extract customer_name from req.body
        const { user_id, customer_name, total_amount, shipping_address, payment_method, items } = req.body;

        // ---------------------------------------------------------
        // 🛡️ ANTI-TAMPERING SECURITY ENGINE
        // ---------------------------------------------------------
        for (const item of items) {
            const dbItemRes = await pool.query('SELECT * FROM products WHERE id = $1', [item.id]);
            if (dbItemRes.rows.length === 0) throw new Error(`Product ${item.id} not found`);
            const dbItem = dbItemRes.rows[0];

            const rawMetalToFetch = dbItem.metal_type.includes('GOLD') ? '24K_GOLD' : 'SILVER';
            const rateRes = await pool.query('SELECT rate_per_gram FROM metal_rates WHERE metal_type = $1', [rawMetalToFetch]);
            const rawRate = rateRes.rows.length > 0 ? parseFloat(rateRes.rows[0].rate_per_gram) : 0;

            const pureWeight = parseFloat(dbItem.gross_weight) * (parseFloat(dbItem.purchase_touch_pct || 91.6) / 100);
            const wholesaleCost = (pureWeight * rawRate) + parseFloat(dbItem.purchase_mc || 0);
            
            const secureFloorPrice = wholesaleCost * 1.04; 

            if (parseFloat(item.price_breakdown.final_total_price) < secureFloorPrice) {
                console.error(`🚨 SECURITY ALERT: Tampering detected! Floor: ₹${secureFloorPrice}`);
                throw new Error("SECURITY_VIOLATION");
            }
        }

        let generatedOrderId; 

        // 1. Insert Order (FIX: Added customer_name to the query)
        const orderRes = await client.query(
            'INSERT INTO orders (user_id, customer_name, total_amount, status, shipping_address, payment_method) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [user_id, customer_name, total_amount, 'PENDING', shipping_address, payment_method]
        );
        generatedOrderId = orderRes.rows[0].id;

        // 2. Insert Order Items & Deduct Stock
        for (const item of items) {
            await client.query(
                'INSERT INTO order_items (order_id, product_id, product_name, quantity, price_at_purchase) VALUES ($1, $2, $3, $4, $5)',
                [generatedOrderId, item.id, item.name, item.qty || 1, item.price_breakdown.final_total_price]
            );

            await client.query('UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2', [item.qty || 1, item.id]);
        }

        await client.query('COMMIT');
        res.json({ message: "Order placed successfully!", orderId: generatedOrderId });

    } catch (err) {
        await client.query('ROLLBACK');
        if (err.message === "SECURITY_VIOLATION") {
            return res.status(400).json({ error: "Invalid price detected. Please refresh the page and try again." });
        }
        console.error("Order creation failed:", err.message);
        res.status(500).json({ error: 'Failed to process order. Please try again.' });
    } finally {
        client.release();
    }
});

// PUT /api/orders/:id/status - Update order status (Admin)
router.put('/:id/status', async (req, res) => {
    try {
        await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [req.body.status, req.params.id]);
        res.json({ message: 'Status updated' });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;