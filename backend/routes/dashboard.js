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

router.get('/stats', async (req, res) => {
    try {
        // 1. Get Live Rates
        const ratesRes = await pool.query('SELECT metal_type, rate_per_gram FROM metal_rates');
        const rates = {};
        ratesRes.rows.forEach(r => rates[r.metal_type] = parseFloat(r.rate_per_gram));

        // 2. Get Inventory Stats (Grouped by Metal Type)
        // Calculates total weight per metal
        const weightStatsRes = await pool.query(`
            SELECT metal_type, 
                   COUNT(*) as total_items, 
                   SUM(net_weight) as total_weight,
                   SUM(making_charge) as total_mc 
            FROM products 
            GROUP BY metal_type
        `);

        // 3. Get Category Breakdown (e.g., Rings vs Chains)
        const categoryStatsRes = await pool.query(`
            SELECT item_type, COUNT(*) as count 
            FROM products 
            GROUP BY item_type 
            ORDER BY count DESC 
            LIMIT 5
        `);

        // 4. Calculate Financials
        let totalInventoryValue = 0;
        let totalGoldWeight = 0;
        let totalSilverWeight = 0;

        const metalStats = weightStatsRes.rows.map(stat => {
            const rate = rates[stat.metal_type] || 0;
            const weight = parseFloat(stat.total_weight || 0);
            const mc = parseFloat(stat.total_mc || 0);
            
            // Value = (Weight * Live Rate) + Expected Making Charges
            const metalValue = weight * rate;
            const totalValue = metalValue + mc;

            totalInventoryValue += totalValue;

            if (stat.metal_type === '22K_GOLD' || stat.metal_type === '24K_GOLD') {
                totalGoldWeight += weight;
            } else if (stat.metal_type === 'SILVER') {
                totalSilverWeight += weight;
            }

            return {
                metal: stat.metal_type,
                items: parseInt(stat.total_items),
                weight: weight.toFixed(3),
                value: totalValue.toFixed(2)
            };
        });

        res.json({
            overview: {
                total_valuation: totalInventoryValue.toFixed(2),
                total_gold_weight_g: totalGoldWeight.toFixed(3),
                total_silver_weight_g: totalSilverWeight.toFixed(3),
                total_items: weightStatsRes.rows.reduce((acc, curr) => acc + parseInt(curr.total_items), 0)
            },
            metal_breakdown: metalStats,
            category_breakdown: categoryStatsRes.rows
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error fetching dashboard stats' });
    }
});

module.exports = router;