const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
// Increased limit for handling base64 or large JSON if needed
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// PostgreSQL Connection
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

pool.connect()
    .then(() => console.log('Connected to Aabarnam Database ✅'))
    .catch((err) => console.error('Database connection error ❌', err.stack));

// API ROUTES
const ratesRoutes = require('./routes/rates');
const productsRoutes = require('./routes/products');
const pincodeRoutes = require('./routes/pincodes');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const ordersRoutes = require('./routes/orders');

app.use('/api/rates', ratesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/pincodes', pincodeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes); 
app.use('/api/orders', ordersRoutes);

app.get('/', (req, res) => {
    res.send('Aabarnam Backend API is running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} 🚀`);
});