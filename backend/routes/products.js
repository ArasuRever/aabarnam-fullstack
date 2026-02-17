const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const multer = require('multer');

// Memory storage for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

// --- HELPER: Calculate Prices ---
const calculatePrice = (product, metalRate) => {
    const netWeight = parseFloat(product.net_weight);
    const makingCharge = parseFloat(product.making_charge);
    const wastagePct = parseFloat(product.wastage_pct);
    
    const rawMetalValue = netWeight * metalRate;
    const wastageValue = (rawMetalValue * wastagePct) / 100;
    
    let actualMakingCharge = makingCharge;
    if (product.making_charge_type === 'PERCENTAGE') {
        actualMakingCharge = (rawMetalValue * makingCharge) / 100;
    }

    const subtotal = rawMetalValue + wastageValue + actualMakingCharge;
    const gstAmount = subtotal * 0.03;
    return (subtotal + gstAmount).toFixed(2);
};

// 1. GET ALL PRODUCTS (List View)
router.get('/', async (req, res) => {
    try {
        const productsResult = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
        const ratesResult = await pool.query('SELECT metal_type, rate_per_gram FROM metal_rates');
        
        const liveRates = {};
        ratesResult.rows.forEach(r => liveRates[r.metal_type] = parseFloat(r.rate_per_gram));

        const products = productsResult.rows.map(product => {
            const metalRate = liveRates[product.metal_type] || 0;
            const finalPrice = calculatePrice(product, metalRate);

            // Main Image to Base64
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

// 2. POST NEW PRODUCT (With Multiple Images)
router.post('/', upload.array('images'), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { 
            sku, name, description, metal_type, item_type,
            gross_weight, stone_weight, net_weight, making_charge_type, 
            making_charge, wastage_pct 
        } = req.body;

        const mainImageBuffer = req.files && req.files.length > 0 ? req.files[0].buffer : null;

        const insertText = `
            INSERT INTO products 
            (sku, name, description, main_image_url, metal_type, item_type, gross_weight, stone_weight, net_weight, making_charge_type, making_charge, wastage_pct) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
            RETURNING id`;
        
        const productRes = await client.query(insertText, [
            sku, name, description, mainImageBuffer, metal_type, item_type, 
            gross_weight, stone_weight, net_weight, making_charge_type, making_charge, wastage_pct
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
        
        // --- THE FIX IS HERE ---
        if (err.code === '23505') { // Postgres code for UNIQUE constraint violation
            console.error("Duplicate SKU blocked:", req.body.sku);
            // Send a 400 Bad Request so the frontend knows exactly what happened
            return res.status(400).json({ error: `A product with SKU "${req.body.sku}" already exists. Please use a unique SKU.` });
        }
        
        console.error("Save error:", err);
        res.status(500).json({ error: 'Failed to save product to database.' });
    } finally {
        client.release();
    }
});

// 3. PUT UPDATE PRODUCT (Edit Text + Images)
router.put('/:id', upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'new_gallery_images' }]), async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        
        const { 
            name, item_type, metal_type, gross_weight, 
            net_weight, wastage_pct, making_charge, deleted_gallery_ids 
        } = req.body;

        // 1. Update Text Fields
        let updateQuery = `
            UPDATE products SET 
            name=$1, item_type=$2, metal_type=$3, gross_weight=$4, 
            net_weight=$5, wastage_pct=$6, making_charge=$7 
            WHERE id=$8`;
        
        await client.query(updateQuery, [
            name, item_type, metal_type, gross_weight, 
            net_weight, wastage_pct, making_charge, id
        ]);

        // 2. Update Thumbnail if provided
        if (req.files['thumbnail']) {
            await client.query('UPDATE products SET main_image_url=$1 WHERE id=$2', [req.files['thumbnail'][0].buffer, id]);
        }

        // 3. Delete Removed Gallery Images
        if (deleted_gallery_ids) {
            const idsToDelete = JSON.parse(deleted_gallery_ids); 
            if (idsToDelete.length > 0) {
                await client.query('DELETE FROM product_images WHERE id = ANY($1::int[])', [idsToDelete]);
            }
        }

        // 4. Insert New Gallery Images
        if (req.files['new_gallery_images']) {
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

// 4. DELETE PRODUCT
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json({ error: 'Delete error' }); }
});

// 5. GET /api/products/:id - Fetch Single Product (Used by ProductDetails and Cart)
// GET /api/products/:id - Fetch Single Product
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const productRes = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        if (productRes.rows.length === 0) return res.status(404).json({ error: "Product not found" });

        const product = productRes.rows[0];

        // Fetch Live Rates
        const ratesResult = await pool.query('SELECT metal_type, rate_per_gram FROM metal_rates');
        const liveRates = {};
        ratesResult.rows.forEach(r => liveRates[r.metal_type] = parseFloat(r.rate_per_gram));

        // Calculate Price
        const metalRate = liveRates[product.metal_type] || 0;
        const netWeight = parseFloat(product.net_weight);
        const makingCharge = parseFloat(product.making_charge);
        const wastagePct = parseFloat(product.wastage_pct);
        
        const rawMetalValue = netWeight * metalRate;
        const wastageValue = (rawMetalValue * wastagePct) / 100;
        
        let actualMakingCharge = makingCharge;
        if (product.making_charge_type === 'PERCENTAGE') {
            actualMakingCharge = (rawMetalValue * makingCharge) / 100;
        }

        const subtotal = rawMetalValue + wastageValue + actualMakingCharge;
        const gstAmount = subtotal * 0.03;
        const finalPrice = subtotal + gstAmount;

        // Convert Images to Base64
        let mainImage = product.main_image_url ? `data:image/jpeg;base64,${product.main_image_url.toString('base64')}` : null;

        const galleryRes = await pool.query('SELECT id, image_data FROM product_images WHERE product_id = $1', [id]);
        const galleryImages = galleryRes.rows.map(img => ({
            id: img.id, url: `data:image/jpeg;base64,${img.image_data.toString('base64')}`
        }));

        res.json({
            ...product,
            main_image_url: mainImage,
            gallery_images: galleryImages,
            price_breakdown: { 
                metal_rate: metalRate,
                raw_metal_value: rawMetalValue.toFixed(2),
                wastage_value: wastageValue.toFixed(2),
                making_charge: actualMakingCharge.toFixed(2),
                gst_amount: gstAmount.toFixed(2),
                final_total_price: finalPrice.toFixed(2) 
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;