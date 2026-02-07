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

// GET /api/products - Calculates Live Price MINUS Discount
// backend/routes/products.js (Partial update to GET route)

router.get('/', async (req, res) => {
    try {
        const productsResult = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
        const ratesResult = await pool.query('SELECT metal_type, rate_per_gram FROM metal_rates');
        
        const liveRates = {};
        ratesResult.rows.forEach(rate => { liveRates[rate.metal_type] = parseFloat(rate.rate_per_gram); });

        const now = new Date(); // Current time for auto-revocation check

        const productsWithLivePrices = productsResult.rows.map(product => {
            const metalRate = liveRates[product.metal_type] || 0;
            const netWeight = parseFloat(product.net_weight);
            const rawMetalValue = netWeight * metalRate;
            const wastageValue = (rawMetalValue * parseFloat(product.wastage_pct)) / 100;
            const subtotal = rawMetalValue + wastageValue + parseFloat(product.making_charge);
            const gstAmount = subtotal * 0.03;
            const finalBeforeDiscount = subtotal + gstAmount;

            // AUTOMATED REVOCATION LOGIC:
            // Check if a discount window is set AND if 'now' is within that window
            let isDiscountActive = false;
            if (product.discount_start && product.discount_end) {
                const start = new Date(product.discount_start);
                const end = new Date(product.discount_end);
                isDiscountActive = now >= start && now <= end;
            }

            let discountAmount = 0;
            if (isDiscountActive) {
                const discVal = parseFloat(product.discount_value || 0);
                if (product.discount_type === 'FLAT') {
                    discountAmount = discVal;
                } else if (product.discount_type === 'PERCENTAGE') {
                    discountAmount = (finalBeforeDiscount * discVal) / 100;
                }
            }

            return {
                ...product,
                is_discount_active: isDiscountActive, // Helper for frontend
                price_breakdown: {
                    original_price: finalBeforeDiscount.toFixed(2),
                    discount_amount: discountAmount.toFixed(2),
                    final_total_price: (finalBeforeDiscount - discountAmount).toFixed(2)
                }
            };
        });
        res.json(productsWithLivePrices);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/products/bulk-pricing - Now supports discounts
router.patch('/bulk-pricing', async (req, res) => {
    const { ids, wastage_pct, making_charge, discount_value, discount_type } = req.body;
    if (!ids || ids.length === 0) return res.status(400).json({ error: "No IDs" });

    try {
        let updateQuery = 'UPDATE products SET ';
        const params = [];
        const updateParts = [];

        if (wastage_pct !== null) { params.push(wastage_pct); updateParts.push(`wastage_pct = $${params.length}`); }
        if (making_charge !== null) { params.push(making_charge); updateParts.push(`making_charge = $${params.length}`); }
        if (discount_value !== null) { params.push(discount_value); updateParts.push(`discount_value = $${params.length}`); }
        if (discount_type) { params.push(discount_type); updateParts.push(`discount_type = $${params.length}`); }

        updateQuery += updateParts.join(', ') + ` WHERE id = ANY($${params.length + 1})`;
        params.push(ids);

        await pool.query(updateQuery, params);
        res.json({ message: "Updated" });
    } catch (err) {
        res.status(500).json({ error: 'Bulk update error' });
    }
});

module.exports = router;