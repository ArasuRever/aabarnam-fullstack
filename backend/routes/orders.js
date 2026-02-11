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

// POST /api/orders - Place a new order
router.post('/', async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN'); // Start Transaction

        const { customer, items, total_amount } = req.body;

        // 1. Insert into Orders Table
        const orderRes = await client.query(
            `INSERT INTO orders (customer_name, phone_number, address, city, pincode, total_amount) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [customer.fullName, customer.phone, customer.address, customer.city, customer.pincode, total_amount]
        );
        
        const orderId = orderRes.rows[0].id;

        // 2. Insert into Order Items Table
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

module.exports = router;