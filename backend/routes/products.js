const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const multer = require('multer');

// Setup memory storage for Multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

// GET /api/products - Fetch all products with pricing and base64 images
router.get('/', async (req, res) => {
    try {
        const productsResult = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
        const ratesResult = await pool.query('SELECT metal_type, rate_per_gram FROM metal_rates');
        
        const liveRates = {};
        ratesResult.rows.forEach(rate => {
            liveRates[rate.metal_type] = parseFloat(rate.rate_per_gram);
        });

        const productsWithLivePrices = productsResult.rows.map(product => {
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
            const totalPrice = subtotal + gstAmount;

            // Convert Binary Data (BYTEA) to Base64 for the frontend
            let imageBase64 = null;
            if (product.main_image_url) {
                imageBase64 = `data:image/jpeg;base64,${product.main_image_url.toString('base64')}`;
            }

            return {
                ...product,
                main_image_url: imageBase64,
                price_breakdown: { 
                    final_total_price: totalPrice.toFixed(2)
                }
            };
        });

        res.json(productsWithLivePrices);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error fetching products' });
    }
});

// POST /api/products - Add product with binary image storage
router.post('/', upload.single('image'), async (req, res) => {
    const { 
        sku, name, description, metal_type, 
        gross_weight, stone_weight, net_weight, making_charge_type, 
        making_charge, wastage_pct 
    } = req.body;

    const imageData = req.file ? req.file.buffer : null;

    try {
        const newProduct = await pool.query(
            `INSERT INTO products 
            (sku, name, description, main_image_url, metal_type, gross_weight, stone_weight, net_weight, making_charge_type, making_charge, wastage_pct) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [sku, name, description, imageData, metal_type, gross_weight, stone_weight, net_weight, making_charge_type, making_charge, wastage_pct]
        );
        res.json({ message: "Product saved successfully", productId: newProduct.rows[0].id });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error saving product' });
    }
});

// DELETE /api/products/:id - New Route to remove a product
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const deleteResult = await pool.query('DELETE FROM products WHERE id = $1', [id]);
        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.json({ message: "Product deleted successfully" });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error deleting product' });
    }
});

module.exports = router;