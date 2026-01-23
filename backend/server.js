const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Connection
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

// Test Database Connection
pool.connect()
    .then(() => console.log('Connected to Aabarnam Database ✅'))
    .catch((err) => console.error('Database connection error ❌', err.stack));

// --- API ROUTES START HERE ---

// Import the rates route
const ratesRoutes = require('./routes/rates');
app.use('/api/rates', ratesRoutes);

// Import the products route
const productsRoutes = require('./routes/products');
app.use('/api/products', productsRoutes);

// Import the pincodes route
const pincodeRoutes = require('./routes/pincodes');
app.use('/api/pincodes', pincodeRoutes);

// Import the auth route (NEW)
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// --- API ROUTES END HERE ---

// Basic Route
app.get('/', (req, res) => {
    res.send('Aabarnam Backend API is running!');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} 🚀`);
});