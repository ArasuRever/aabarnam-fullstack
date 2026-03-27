const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME,
});

const sendSmsOtp = async (phone, otp) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV MODE] Profile Update SMS for ${phone}: ${otp}`);
        return true;
    }
    try {
        await axios.post('https://www.fast2sms.com/dev/bulkV2', { variables_values: otp, route: "otp", numbers: phone }, { headers: { "authorization": process.env.FAST2SMS_API_KEY }});
        return true;
    } catch (error) { return false; }
};

// Send OTP to the NEW phone number they want to link
router.post('/send', async (req, res) => {
    const { userId, target } = req.body;
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    try {
        await pool.query('DELETE FROM otp_verifications WHERE user_id = $1', [userId]);
        await pool.query(
            "INSERT INTO otp_verifications (user_id, target, otp_code, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')",
            [userId, target, otpCode]
        );
        await sendSmsOtp(target, otpCode);
        res.json({ success: true, message: "Security code sent" });
    } catch (err) {
        res.status(500).json({ error: "Failed to send code" });
    }
});

// Verify OTP & Update User Profile with the new number
router.post('/verify', async (req, res) => {
    const { userId, otpCode, target } = req.body; 
    
    try {
        const otpRes = await pool.query(
            "SELECT id FROM otp_verifications WHERE target = $1 AND otp_code = $2 AND expires_at > NOW()",
            [target, otpCode]
        );

        if (otpRes.rows.length === 0) return res.status(400).json({ success: false, error: "Invalid code" });

        await pool.query("DELETE FROM otp_verifications WHERE id = $1", [otpRes.rows[0].id]);
        
        // Update the phone number in the database
        await pool.query("UPDATE users SET phone = $1 WHERE id = $2", [target, userId]);

        res.json({ success: true, message: "Profile updated successfully" });
    } catch (err) {
        if (err.code === '23505') { // PostgreSQL Unique Violation
            return res.status(400).json({ success: false, error: "This phone number is already linked to another account." });
        }
        res.status(500).json({ success: false, error: "Server error" });
    }
});

module.exports = router;