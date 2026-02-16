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

// 1. POST /api/orders - Place a new order
router.post('/', async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN'); // Start Transaction

        // Notice we extract userId from req.body now
        const { customer, items, total_amount, userId } = req.body; 

        // Insert into Orders Table (now including user_id)
        const orderRes = await client.query(
            `INSERT INTO orders (customer_name, phone_number, address, city, pincode, total_amount, user_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [customer.fullName, customer.phone, customer.address, customer.city, customer.pincode, total_amount, userId || null]
        );
        
        const orderId = orderRes.rows[0].id;

        // Insert into Order Items Table
        for (const item of items) {
            await client.query(
                `INSERT INTO order_items (order_id, product_id, product_name, quantity, price_at_purchase, metal_type) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    orderId, 
                    item.id, 
                    item.name, 
                    item.qty, 
                    item.price_breakdown.final_total_price, 
                    item.metal_type
                ]
            );
        }

        await client.query('COMMIT'); // Commit Transaction
        
        res.status(201).json({ 
            message: 'Order placed successfully!', 
            orderId: orderId 
        });

    } catch (err) {
        await client.query('ROLLBACK'); // Rollback if error
        console.error("Order Error:", err);
        res.status(500).json({ error: 'Failed to place order' });
    } finally {
        client.release();
    }
});

// 2. GET /api/orders - Fetch all orders (Admin Panel)
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT o.*, 
                   COALESCE(json_agg(json_build_object(
                       'product_name', oi.product_name, 
                       'quantity', oi.quantity, 
                       'price', oi.price_at_purchase,
                       'metal_type', oi.metal_type
                   )) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// 3. GET /api/orders/my-orders/:userId - Fetch orders for a specific customer (Client Panel)
router.get('/my-orders/:userId', async (req, res) => {
    try {
        const query = `
            SELECT o.*, 
                   COALESCE(json_agg(json_build_object(
                       'product_name', oi.product_name, 
                       'quantity', oi.quantity, 
                       'price', oi.price_at_purchase,
                       'metal_type', oi.metal_type
                   )) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
            FROM orders o 
            LEFT JOIN order_items oi ON o.id = oi.order_id 
            WHERE o.user_id = $1
            GROUP BY o.id 
            ORDER BY o.created_at DESC
        `;
        const result = await pool.query(query, [req.params.userId]);
        res.json(result.rows);
    } catch (err) { 
        console.error("Failed to fetch user orders:", err);
        res.status(500).json({ error: 'Failed to fetch user orders' }); 
    }
});

// 4. PUT /api/orders/:id/status - Update order status (Admin Panel)
router.put('/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id]);
        res.json({ message: 'Status updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;