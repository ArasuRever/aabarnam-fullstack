const express = require('express');
const http = require('http'); // NEW: Required for Socket.io
const { Server } = require('socket.io'); // NEW: Socket.io Server
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app); // NEW: Wrap Express in HTTP server

// NEW: Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Update to your frontend port if different
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
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
const usersRoutes = require('./routes/users');
const wishlistRoutes = require('./routes/wishlist');

app.use('/api/rates', ratesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/pincodes', pincodeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes); 
app.use('/api/orders', ordersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/wishlist', wishlistRoutes);

// NEW: Initialize the WebSocket Negotiator logic
const negotiatorSockets = require('./sockets/negotiator');
negotiatorSockets(io, pool);

app.get('/', (req, res) => {
    res.send('Aabarnam Backend API with WebSockets is running!');
});

const PORT = process.env.PORT || 5000;
// NEW: Listen on the 'server' instead of 'app'
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} 🚀`);
});