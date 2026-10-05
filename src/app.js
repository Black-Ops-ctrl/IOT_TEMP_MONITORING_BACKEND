const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const dashboardRoutes = require('./routes/dashboard_routes');
const liveReportRoutes = require('./routes/live_report_routes');
const authRoutes = require('./routes/auth_routes'); 
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/admin_routes');   
const errorHandler = require('./middleware/errorHandler');
const locationRoutes = require('./routes/locationRoutes');
const historyRoutes = require('./routes/history_routes');
const deviceManagementRoutes = require('./routes/device_management_routes');
const notificationRoutes = require('./routes/notificationRoutes');


const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// Middleware
// ============================================
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser()); 

// ============================================
// No-Cache for all API responses  
// ============================================
app.set('etag', false);
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// ============================================
// Health Check
// ============================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Temperature Monitoring System is running',
        timestamp: new Date().toISOString(),
        server: process.env.DB_HOST,
        scheduler: 'instant-notification'
        });
});

// ============================================
// Routes
// ============================================
app.use('/api/auth', authRoutes);     
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);   
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', liveReportRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/devices', deviceManagementRoutes);
app.use('/api/notifications', notificationRoutes);

// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// ============================================
// Error Handler
// ============================================
app.use(errorHandler);

// ============================================
// Start Server
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://${process.env.DB_HOST}:${PORT}`);
    console.log(`📊 Dashboard API: http://${process.env.DB_HOST}:${PORT}/api/dashboard`);
    console.log(`📈 Reports API: http://${process.env.DB_HOST}:${PORT}/api/reports`);
    console.log(`🔧 Gateway API: http://${process.env.DB_HOST}:${PORT}/api/gateway`);
    console.log(`🏪 Shop API: http://${process.env.DB_HOST}:${PORT}/api/shops`);
    console.log(`🔔 Notifications API: http://${process.env.DB_HOST}:${PORT}/api/notifications`);
    console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏰ Scheduler: Manual Trigger Only`);
});

module.exports = app;