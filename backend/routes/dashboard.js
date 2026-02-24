const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verifyAdmin } = require('../middleware/authMiddleware'); // 🛡️ IMPORT BOUNCER

const pool = new Pool({
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME,
});

// 🛡️ SECURED: Only Admins can see the financial dashboard
router.get('/stats', verifyAdmin, async (req, res) => {
    try {
        // 1. Get Live Rates
        const ratesRes = await pool.query('SELECT metal_type, rate_per_gram FROM metal_rates');
        const rates = {};
        ratesRes.rows.forEach(r => rates[r.metal_type] = parseFloat(r.rate_per_gram));

        // 2. Get Inventory Stats
        const weightStatsRes = await pool.query(`
            SELECT metal_type, COUNT(*) as total_items, SUM(net_weight) as total_weight, SUM(making_charge) as total_mc 
            FROM products GROUP BY metal_type
        `);

        // 3. Get Category Breakdown
        const categoryStatsRes = await pool.query('SELECT item_type, COUNT(*) as count FROM products GROUP BY item_type ORDER BY count DESC LIMIT 5');

        // 4. Calculate Inventory Financials
        let totalInventoryValue = 0;
        let totalGoldWeight = 0;
        let totalSilverWeight = 0;

        const metalStats = weightStatsRes.rows.map(stat => {
            const rate = rates[stat.metal_type] || 0;
            const weight = parseFloat(stat.total_weight || 0);
            const mc = parseFloat(stat.total_mc || 0);
            const totalValue = (weight * rate) + mc;

            totalInventoryValue += totalValue;
            if (stat.metal_type.includes('GOLD')) totalGoldWeight += weight;
            else if (stat.metal_type === 'SILVER') totalSilverWeight += weight;

            return { metal: stat.metal_type, items: parseInt(stat.total_items), weight: weight.toFixed(3), value: totalValue.toFixed(2) };
        });

        // 5. Calculate Sales Analytics (Revenue & Orders)
        const revenueRes = await pool.query("SELECT SUM(total_amount) as total FROM orders WHERE status != 'CANCELLED'");
        const totalRevenue = revenueRes.rows[0].total || 0;

        const ordersRes = await pool.query("SELECT COUNT(*) as count FROM orders");
        const totalOrders = ordersRes.rows[0].count || 0;

        const recentOrdersRes = await pool.query("SELECT id, customer_name, total_amount, status, created_at FROM orders ORDER BY created_at DESC LIMIT 5");

        res.json({
            overview: {
                total_valuation: totalInventoryValue.toFixed(2),
                total_gold_weight_g: totalGoldWeight.toFixed(3),
                total_silver_weight_g: totalSilverWeight.toFixed(3),
                total_items: weightStatsRes.rows.reduce((acc, curr) => acc + parseInt(curr.total_items), 0),
                total_revenue: parseFloat(totalRevenue),
                total_orders: parseInt(totalOrders)      
            },
            metal_breakdown: metalStats,
            category_breakdown: categoryStatsRes.rows,
            recent_orders: recentOrdersRes.rows          
        });
    } catch (err) { res.status(500).json({ error: 'Server error fetching dashboard stats' }); }
});

module.exports = router;