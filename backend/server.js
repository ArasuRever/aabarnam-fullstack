const express = require('express');
const http = require('http'); 
const { Server } = require('socket.io'); 
const { Pool } = require('pg');
const cors = require('cors');
const cron = require('node-cron'); // 🌟 NEW: Cron Job for Cart Abandonment
require('dotenv').config();

const app = express();
const server = http.createServer(app); 

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"], 
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
const otpRoutes = require('./routes/otp');

app.use('/api/rates', ratesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/pincodes', pincodeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes); 
app.use('/api/orders', ordersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/otp', otpRoutes);

const negotiatorSockets = require('./sockets/negotiator');
negotiatorSockets(io, pool);

// 🌟 NEW: THE CART SWEEPER
// Runs every 2 minutes to check for abandoned AI negotiations and free up stock
cron.schedule('*/2 * * * *', async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Find all locks where 30 minutes have passed
        const expiredRes = await client.query('SELECT * FROM reserved_stock WHERE expires_at < NOW()');
        
        if (expiredRes.rows.length > 0) {
            for (const row of expiredRes.rows) {
                // Free the stock back to the public pool
                await client.query('UPDATE products SET locked_stock = locked_stock - $1 WHERE id = $2 AND locked_stock >= $1', [row.qty, row.product_id]);
                
                // Delete the expired lock record
                await client.query('DELETE FROM reserved_stock WHERE id = $1', [row.id]);
                
                console.log(`[SYSTEM] Released abandoned cart lock for Product ID: ${row.product_id}`);
            }
        }
        
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[SYSTEM] Failed to clear expired stock:', error);
    } finally {
        client.release();
    }
});

app.get('/', (req, res) => {
    res.send('Aabarnam Backend API with WebSockets is running!');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} 🚀`);
});