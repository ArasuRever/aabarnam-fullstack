const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

router.get('/', async (req, res) => {
    try {
        const productsResult = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
        const ratesResult = await pool.query('SELECT metal_type, rate_per_gram FROM metal_rates');
        
        const liveRates = {};
        ratesResult.rows.forEach(r => liveRates[r.metal_type] = parseFloat(r.rate_per_gram));

        const { inStock } = req.query;
        let queryStr = 'SELECT * FROM products';
        
        // NEW: Filter out sold items if requested by the client
        if (inStock === 'true') {
            queryStr += ' WHERE stock_quantity > 0';
        }
        queryStr += ' ORDER BY created_at DESC';

        const products = productsResult.rows.map(product => {
            let finalPrice;
            
            // DYNAMIC VS FIXED PRICING LOGIC
            if (product.retail_price_type === 'FIXED') {
                finalPrice = parseFloat(product.fixed_price).toFixed(2);
            } else {
                const metalRate = liveRates[product.metal_type] || 0;
                const netWeight = parseFloat(product.net_weight);
                const makingCharge = parseFloat(product.making_charge);
                const wastagePct = parseFloat(product.wastage_pct);
                
                const rawMetalValue = netWeight * metalRate;
                const wastageValue = (rawMetalValue * wastagePct) / 100;
                
                let actualMakingCharge = parseFloat(product.making_charge || 0);
                if (product.making_charge_type === 'PERCENTAGE') {
                    actualMakingCharge = (rawMetalValue * actualMakingCharge) / 100;
                } else if (product.making_charge_type === 'PER_GRAM') {
                    actualMakingCharge = netWeight * actualMakingCharge;
                }

                const subtotal = rawMetalValue + wastageValue + actualMakingCharge;
                const gstAmount = subtotal * 0.03;
                finalPrice = (subtotal + gstAmount).toFixed(2);
            }

            let mainImage = null;
            if (product.main_image_url) {
                mainImage = `data:image/jpeg;base64,${product.main_image_url.toString('base64')}`;
            }

            return {
                ...product,
                main_image_url: mainImage,
                price_breakdown: { final_total_price: finalPrice }
            };
        });

        res.json(products);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', upload.array('images'), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { 
            sku, name, description, metal_type, item_type,
            gross_weight, stone_weight, net_weight, making_charge_type, 
            making_charge, wastage_pct,
            purchase_touch_pct, purchase_mc_type, purchase_mc, 
            retail_price_type, fixed_price
        } = req.body;

        const mainImageBuffer = req.files && req.files.length > 0 ? req.files[0].buffer : null;

        const insertText = `
            INSERT INTO products 
            (sku, name, description, main_image_url, metal_type, item_type, 
             gross_weight, stone_weight, net_weight, making_charge_type, 
             making_charge, wastage_pct, purchase_touch_pct, purchase_mc_type, 
             purchase_mc, retail_price_type, fixed_price) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) 
            RETURNING id`;
        
        const productRes = await client.query(insertText, [
            sku, name, description, mainImageBuffer, metal_type, item_type, 
            gross_weight, stone_weight, net_weight, making_charge_type, making_charge, wastage_pct,
            purchase_touch_pct, purchase_mc_type, purchase_mc, retail_price_type, fixed_price
        ]);
        
        const productId = productRes.rows[0].id;
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await client.query('INSERT INTO product_images (product_id, image_data) VALUES ($1, $2)', [productId, file.buffer]);
            }
        }
        await client.query('COMMIT');
        res.json({ message: "Product saved", productId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Save failed' });
    } finally { client.release(); }
});

router.put('/:id', upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'new_gallery_images' }]), async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const { 
            name, item_type, metal_type, gross_weight, net_weight, stone_weight,
            wastage_pct, making_charge, retail_price_type, fixed_price,
            purchase_touch_pct, purchase_mc_type, purchase_mc, deleted_gallery_ids 
        } = req.body;

        let updateQuery = `
            UPDATE products 
            SET name=$1, item_type=$2, metal_type=$3, gross_weight=$4, net_weight=$5, 
                wastage_pct=$6, making_charge=$7, retail_price_type=$8, fixed_price=$9,
                purchase_touch_pct=$10, purchase_mc_type=$11, purchase_mc=$12, stone_weight=$13
            WHERE id=$14`;
            
        await client.query(updateQuery, [
            name, item_type, metal_type, gross_weight, net_weight, 
            wastage_pct, making_charge, retail_price_type, fixed_price,
            purchase_touch_pct, purchase_mc_type, purchase_mc, stone_weight, id
        ]);

        if (req.files && req.files['thumbnail']) {
            await client.query('UPDATE products SET main_image_url=$1 WHERE id=$2', [req.files['thumbnail'][0].buffer, id]);
        }

        if (deleted_gallery_ids) {
            const idsToDelete = JSON.parse(deleted_gallery_ids); 
            if (idsToDelete.length > 0) {
                await client.query('DELETE FROM product_images WHERE id = ANY($1::int[])', [idsToDelete]);
            }
        }

        if (req.files && req.files['new_gallery_images']) {
            for (const file of req.files['new_gallery_images']) {
                await client.query('INSERT INTO product_images (product_id, image_data) VALUES ($1, $2)', [id, file.buffer]);
            }
        }

        await client.query('COMMIT');
        res.json({ message: "Product updated successfully" });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: "Update failed" });
    } finally {
        client.release();
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json({ error: 'Delete error' }); }
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const productRes = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        if (productRes.rows.length === 0) return res.status(404).json({ error: "Product not found" });

        const product = productRes.rows[0];

        const ratesResult = await pool.query('SELECT metal_type, rate_per_gram FROM metal_rates');
        const liveRates = {};
        ratesResult.rows.forEach(r => liveRates[r.metal_type] = parseFloat(r.rate_per_gram));

        let breakdown = {};
        
        if (product.retail_price_type === 'FIXED') {
            const finalP = parseFloat(product.fixed_price);
            const base = finalP / 1.03;
            const gst = finalP - base;
            breakdown = {
                metal_rate: liveRates[product.metal_type] || 0,
                raw_metal_value: '0.00', wastage_value: '0.00', making_charge: '0.00',
                gst_amount: gst.toFixed(2), final_total_price: finalP.toFixed(2),
                is_fixed: true
            };
        } else {
            const metalRate = liveRates[product.metal_type] || 0;
            const netWeight = parseFloat(product.net_weight);
            const makingCharge = parseFloat(product.making_charge);
            const wastagePct = parseFloat(product.wastage_pct);
            
            const rawMetalValue = netWeight * metalRate;
            const wastageValue = (rawMetalValue * wastagePct) / 100;
            
            let actualMakingCharge = parseFloat(product.making_charge || 0);
            if (product.making_charge_type === 'PERCENTAGE') {
                actualMakingCharge = (rawMetalValue * actualMakingCharge) / 100;
            } else if (product.making_charge_type === 'PER_GRAM') {
                actualMakingCharge = netWeight * actualMakingCharge;
            }

            const subtotal = rawMetalValue + wastageValue + actualMakingCharge;
            const gstAmount = subtotal * 0.03;
            
            breakdown = { 
                metal_rate: metalRate,
                raw_metal_value: rawMetalValue.toFixed(2),
                wastage_value: wastageValue.toFixed(2),
                making_charge: actualMakingCharge.toFixed(2),
                gst_amount: gstAmount.toFixed(2),
                final_total_price: (subtotal + gstAmount).toFixed(2),
                is_fixed: false
            };
        }

        let mainImage = null;
        if (product.main_image_url) {
            mainImage = `data:image/jpeg;base64,${product.main_image_url.toString('base64')}`;
        }

        const galleryRes = await pool.query('SELECT id, image_data FROM product_images WHERE product_id = $1', [id]);
        const galleryImages = galleryRes.rows.map(img => ({
            id: img.id,
            url: `data:image/jpeg;base64,${img.image_data.toString('base64')}`
        }));

        res.json({
            ...product,
            main_image_url: mainImage,
            gallery_images: galleryImages,
            price_breakdown: breakdown
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error fetching product details' });
    }
});

// ==========================================
// REVIEWS & RATINGS LOGIC
// ==========================================

// GET all reviews for a product
router.get('/:id/reviews', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, u.name as user_name 
            FROM reviews r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.product_id = $1 
            ORDER BY r.created_at DESC
        `, [req.params.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET eligibility (Did this specific user buy this specific item?)
router.get('/:id/eligibility/:userId', async (req, res) => {
    try {
        const { id, userId } = req.params;
        
        // Check if item exists in their order history
        const orderCheck = await pool.query(`
            SELECT o.id 
            FROM orders o 
            JOIN order_items oi ON o.id = oi.order_id 
            WHERE o.user_id = $1 AND oi.product_id = $2
            LIMIT 1
        `, [userId, id]);
        
        // Check if they already reviewed it (1 review per item per user)
        const reviewCheck = await pool.query('SELECT id FROM reviews WHERE user_id = $1 AND product_id = $2', [userId, id]);

        res.json({ 
            hasPurchased: orderCheck.rows.length > 0,
            hasReviewed: reviewCheck.rows.length > 0,
            canReview: orderCheck.rows.length > 0 && reviewCheck.rows.length === 0
        });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// POST a new Verified Review
router.post('/:id/reviews', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, rating, comment } = req.body;
        await pool.query(
            'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)',
            [id, user_id, rating, comment]
        );
        res.json({ message: 'Review successfully published!' });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;