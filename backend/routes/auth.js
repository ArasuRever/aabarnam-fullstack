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

// 1. POST /api/auth/register
router.post('/register', async (req, res) => {
    const { name, email, password, phone, role } = req.body;
    try {
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            'INSERT INTO users (name, email, password_hash, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role',
            [name, email, hashedPassword, phone, role || 'CUSTOMER']
        );

        const token = jwt.sign({ userId: newUser.rows[0].id, role: newUser.rows[0].role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: 'User registered successfully!', token, user: newUser.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// 2. POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) return res.status(400).json({ error: 'Invalid Email or Password' });

        const user = userResult.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid Email or Password' });

        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: 'Login successful!', token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// 3. TEMPORARY ROUTE: GET /api/auth/create-admin (To auto-create your account)
router.get('/create-admin', async (req, res) => {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('SecurePassword123!', salt);

        await pool.query(
            'INSERT INTO users (name, email, password_hash, phone, role) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING',
            ['Arasu', 'arasu@aabarnam.com', hashedPassword, '9876543210', 'ADMIN']
        );
        res.send('<h1>Admin Account Created Successfully! ✅</h1><p>You can now go back to the login page and use email: <b>arasu@aabarnam.com</b> and password: <b>SecurePassword123!</b></p>');
    } catch (err) {
        res.status(500).send('Error creating admin: ' + err.message);
    }
});

module.exports = router;