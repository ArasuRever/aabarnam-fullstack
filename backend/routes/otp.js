const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME,
});

// 1. GENERATE & SEND OTP
router.post('/send', async (req, res) => {
    const { userId, target } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    const expiresAt = new Date(Date.now() + 5 * 60000); // 5 minutes expiry

    try {
        // Clear any old OTPs for this user
        await pool.query('DELETE FROM otp_verifications WHERE user_id = $1', [userId]);
        
        // Save new OTP
        await pool.query(
            'INSERT INTO otp_verifications (user_id, target, otp_code, expires_at) VALUES ($1, $2, $3, $4)',
            [userId, target, otp, expiresAt]
        );

        // LOGIC FOR SENDING (Placeholder for Nodemailer/SMS)
        console.log(`[AABARNAM SECURITY] OTP for ${target}: ${otp}`); 

        res.json({ message: "OTP sent successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Failed to generate OTP" });
    }
});

// 2. VERIFY OTP
router.post('/verify', async (req, res) => {
    const { userId, otpCode } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM otp_verifications WHERE user_id = $1 AND otp_code = $2 AND expires_at > NOW()',
            [userId, otpCode]
        );

        if (result.rows.length > 0) {
            await pool.query('DELETE FROM otp_verifications WHERE user_id = $1', [userId]);
            res.json({ success: true, message: "Verification successful!" });
        } else {
            res.status(400).json({ success: false, error: "Invalid or expired OTP" });
        }
    } catch (err) {
        res.status(500).json({ error: "Verification error" });
    }
});

module.exports = router;