const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

const JWT_SECRET = process.env.JWT_SECRET || 'aabarnam_super_secret_key_2026';

// 1. POST /api/auth/register (Now includes initial address)
router.post('/register', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { name, email, phone, password, address, city, pincode } = req.body;

        // Check if user exists by email OR phone
        const userExists = await client.query('SELECT * FROM users WHERE email = $1 OR phone = $2', [email, phone]);
        if (userExists.rows.length > 0) return res.status(400).json({ error: 'User with this email or phone already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert User
        const newUser = await client.query(
            'INSERT INTO users (name, email, password_hash, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, role',
            [name, email, hashedPassword, phone, 'CUSTOMER']
        );
        const userId = newUser.rows[0].id;

        // Insert their first address as default
        await client.query(
            'INSERT INTO user_addresses (user_id, full_name, phone, address, city, pincode, is_default) VALUES ($1, $2, $3, $4, $5, $6, true)',
            [userId, name, phone, address, city, pincode]
        );

        await client.query('COMMIT');
        
        const token = jwt.sign({ userId, role: newUser.rows[0].role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: 'User registered!', token, user: newUser.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: 'Server error during registration' });
    } finally {
        client.release();
    }
});

// 2. POST /api/auth/login (Accepts Phone OR Email)
router.post('/login', async (req, res) => {
    const { identifier, password } = req.body; // 'identifier' can be phone or email
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1 OR phone = $1', [identifier]);
        if (userResult.rows.length === 0) return res.status(400).json({ error: 'Invalid Credentials' });

        const user = userResult.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid Credentials' });

        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: 'Login successful!', token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// 3. GET /api/auth/addresses/:userId - Fetch all addresses for a user
router.get('/addresses/:userId', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, id ASC', [req.params.userId]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// 4. POST /api/auth/addresses - Add a new address
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

// 5. DELETE /api/auth/addresses/:id - Remove an address
router.delete('/addresses/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM user_addresses WHERE id = $1', [req.params.id]);
        res.json({ message: 'Address removed' });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;