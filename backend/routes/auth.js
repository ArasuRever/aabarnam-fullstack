const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const axios = require('axios'); // For sending real SMS

const pool = new Pool({
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME,
});

const JWT_SECRET = process.env.JWT_SECRET;

// 🌟 THE SMS ENGINE: Seamlessly switches between Dev and Real World
const sendSmsOtp = async (phone, otp) => {
    // 1. Development Mode (Saves Money)
    if (process.env.NODE_ENV !== 'production') {
        console.log(`\n========================================`);
        console.log(`📱 [DEV MODE] SMS OTP for ${phone}: ${otp}`);
        console.log(`========================================\n`);
        return true;
    }

    // 2. Production Mode (Real World Fast2SMS API)
    try {
        await axios.post('https://www.fast2sms.com/dev/bulkV2', {
            variables_values: otp,
            route: "otp",
            numbers: phone
        }, {
            headers: { "authorization": process.env.FAST2SMS_API_KEY }
        });
        return true;
    } catch (error) {
        console.error("🚨 Real SMS Failed:", error.response?.data || error.message);
        return false;
    }
};

// 1. REQUEST OTP (Login or Auto-Signup)
router.post('/request-otp', async (req, res) => {
    const { target } = req.body; 
    if (!target) return res.status(400).json({ error: "Phone number is required" });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); 

    try {
        await pool.query("DELETE FROM otp_verifications WHERE target = $1", [target]);
        await pool.query(
            "INSERT INTO otp_verifications (target, otp_code, expires_at) VALUES ($1, $2, NOW() + INTERVAL '10 minutes')",
            [target, otpCode]
        );
        
        await sendSmsOtp(target, otpCode);
        res.json({ message: "OTP sent successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to process request" });
    }
});

// 2. VERIFY OTP & ENTER
router.post('/verify-otp', async (req, res) => {
    const { target, otpCode } = req.body;
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        const otpRes = await client.query(
            "SELECT * FROM otp_verifications WHERE target = $1 AND otp_code = $2 AND expires_at > NOW()",
            [target, otpCode]
        );

        if (otpRes.rows.length === 0) throw new Error("INVALID_OTP");

        // Clear the OTP so it can't be reused
        await client.query("DELETE FROM otp_verifications WHERE id = $1", [otpRes.rows[0].id]);

        // Check if user exists
        let userRes = await client.query("SELECT * FROM users WHERE phone = $1", [target]);

        let user;
        if (userRes.rows.length > 0) {
            user = userRes.rows[0]; // Returning User
        } else {
            // Auto-Signup: Create new user instantly
            const insertRes = await client.query(
                `INSERT INTO users (phone, role) VALUES ($1, 'CUSTOMER') RETURNING *`,
                [target]
            );
            user = insertRes.rows[0];
        }

        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

        await client.query('COMMIT');
        res.json({ message: "Authenticated successfully", token, user });

    } catch (err) {
        await client.query('ROLLBACK');
        if (err.message === "INVALID_OTP") return res.status(400).json({ error: "Invalid or expired OTP" });
        res.status(500).json({ error: "Server error" });
    } finally {
        client.release();
    }
});

// Fetch Addresses (Used in Account.jsx)
router.get('/addresses/:userId', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM user_addresses WHERE user_id = $1', [req.params.userId]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/addresses', async (req, res) => {
    const { user_id, full_name, phone, address, city, pincode } = req.body;
    try {
        await pool.query(
            'INSERT INTO user_addresses (user_id, full_name, phone, address, city, pincode) VALUES ($1, $2, $3, $4, $5, $6)',
            [user_id, full_name, phone, address, city, pincode]
        );
        res.json({ message: 'Address added successfully' });
    } catch (err) { res.status(500).json({ error: 'Server error adding address' }); }
});

router.put('/addresses/:id', async (req, res) => {
    const { full_name, phone, address, city, pincode } = req.body;
    try {
        await pool.query(
            'UPDATE user_addresses SET full_name = $1, phone = $2, address = $3, city = $4, pincode = $5 WHERE id = $6',
            [full_name, phone, address, city, pincode, req.params.id]
        );
        res.json({ message: 'Address updated successfully' });
    } catch (err) { res.status(500).json({ error: 'Server error updating address' }); }
});

router.delete('/addresses/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM user_addresses WHERE id = $1', [req.params.id]);
        res.json({ message: 'Address removed' });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;