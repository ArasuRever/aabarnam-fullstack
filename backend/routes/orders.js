const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

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

// POST /api/orders - Create new order (SECURED & TAMPER-PROOF)
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { user_id, customer_name, phone_number, total_amount, address, city, pincode, payment_method, items } = req.body;

        // ---------------------------------------------------------
        // 🛡️ SECURITY ENGINE: Deal Signature & Margin Check
        // ---------------------------------------------------------
        for (const item of items) {
            const dbItemRes = await pool.query('SELECT * FROM products WHERE id = $1', [item.id]);
            if (dbItemRes.rows.length === 0) throw new Error(`Product ${item.id} not found`);
            const dbItem = dbItemRes.rows[0];

            // 1. Calculate Standard Official Price
            const retailRateRes = await pool.query('SELECT rate_per_gram FROM metal_rates WHERE metal_type = $1', [dbItem.metal_type]);
            const retailRate = retailRateRes.rows.length > 0 ? parseFloat(retailRateRes.rows[0].rate_per_gram) : 0;
            const retailMetalValue = parseFloat(dbItem.net_weight) * retailRate;
            const wastageValue = (retailMetalValue * parseFloat(dbItem.wastage_pct)) / 100;
            
            let actualMakingCharge = parseFloat(dbItem.making_charge || 0);
            if (dbItem.making_charge_type === 'PERCENTAGE') actualMakingCharge = (retailMetalValue * actualMakingCharge) / 100;
            else if (dbItem.making_charge_type === 'PER_GRAM') actualMakingCharge = parseFloat(dbItem.net_weight) * actualMakingCharge;
            
            const subtotal = retailMetalValue + wastageValue + actualMakingCharge;
            const gst = subtotal * 0.03;
            const standardListedPrice = Math.round(subtotal + gst);

            // 2. Validate Deal Token
            let validAuthorizedPrice = standardListedPrice; // Assume full price by default
            
            if (item.deal_token) {
                try {
                    const decoded = jwt.verify(item.deal_token, process.env.JWT_SECRET || 'aabarnam_secret_fallback');
                    if (decoded.productId === item.id) {
                        validAuthorizedPrice = decoded.agreedPrice; // Token is valid, AI authorized this!
                    }
                } catch (err) {
                    console.warn(`[SECURITY] Invalid or expired deal token for Item ${item.id}`);
                }
            }

            // 3. Block "Inspect Element" Tampering
            const attemptedPrice = parseFloat(item.price_breakdown.final_total_price);
            if (attemptedPrice < validAuthorizedPrice) {
                console.error(`🚨 HACK ATTEMPT DETECTED: Tried to buy at ₹${attemptedPrice}, but authorized price is ₹${validAuthorizedPrice}`);
                throw new Error("SECURITY_VIOLATION");
            }

            // 4. Absolute Safety Net (Ensure AI didn't break)
            const isGold = dbItem.metal_type.includes('GOLD');
            const rawMetalToFetch = isGold ? '24K_GOLD' : 'SILVER';
            const rate24kRes = await pool.query('SELECT rate_per_gram FROM metal_rates WHERE metal_type = $1', [rawMetalToFetch]);
            const rate24k = rate24kRes.rows.length > 0 ? parseFloat(rate24kRes.rows[0].rate_per_gram) : 0;

            const pureWeight = parseFloat(dbItem.gross_weight) * (parseFloat(dbItem.purchase_touch_pct || 91.6) / 100);
            const wholesaleCost = (pureWeight * rate24k) + parseFloat(dbItem.purchase_mc || 0);
            const secureFloorPrice = Math.round(wholesaleCost * 1.03); 

            if (attemptedPrice < secureFloorPrice) {
                throw new Error("SECURITY_VIOLATION"); // Double failsafe
            }
        }

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

            // FIX: Prevent negative stock race conditions
            const stockCheck = await client.query(
                'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2 AND stock_quantity >= $1 RETURNING id', 
                [item.qty || 1, item.id]
            );
            
            if (stockCheck.rowCount === 0) {
                throw new Error("OUT_OF_STOCK");
            }
        }

        await client.query('COMMIT');
        res.json({ message: "Order placed successfully!", orderId: generatedOrderId });

    } catch (err) {
        await client.query('ROLLBACK');
        if (err.message === "SECURITY_VIOLATION") {
            return res.status(400).json({ error: "Price mismatch detected. Please clear your cart and try again." });
        }
        if (err.message === "OUT_OF_STOCK") {
            return res.status(400).json({ error: "One or more items in your cart just sold out!" });
        }
        console.error("Order creation failed:", err.message);
        res.status(500).json({ error: 'Failed to process order. Please try again.' });
    } finally {
        client.release();
    }
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