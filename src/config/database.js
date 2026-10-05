const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: false 
});

// Test connection on startup
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Database connection failed:', err.stack);
        process.exit(1);
    } else {
        console.log(`✅ Connected to PostgreSQL: ${process.env.DB_NAME} on ${process.env.DB_HOST}`);
        release();
    }
});

// Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
});

module.exports = pool;