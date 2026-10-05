const express = require('express');
const router = express.Router();

// ============================================
// ADMIN ROUTES
// ============================================

// GET /api/admin/users - Get all users (legacy)
router.get('/users', (req, res) => {
    res.json({
        success: true,
        message: 'Admin users route - Use /api/users instead'
    });
});

// POST /api/admin/user - Create user (legacy)
router.post('/user', (req, res) => {
    res.json({
        success: true,
        message: 'Admin create user route - Use /api/users instead'
    });
});

// PUT /api/admin/user/:id - Update user (legacy)
router.put('/user/:id', (req, res) => {
    res.json({
        success: true,
        message: 'Admin update user route - Use /api/users instead'
    });
});

// POST /api/admin/shop - Add shop
router.post('/shop', (req, res) => {
    res.json({
        success: true,
        message: 'Admin shop route'
    });
});

// POST /api/admin/region - Add region
router.post('/region', (req, res) => {
    res.json({
        success: true,
        message: 'Admin region route'
    });
});

// POST /api/admin/city - Add city
router.post('/city', (req, res) => {
    res.json({
        success: true,
        message: 'Admin city route'
    });
});

// PUT /api/admin/freezer/:id - Update freezer
router.put('/freezer/:id', (req, res) => {
    res.json({
        success: true,
        message: 'Admin update freezer route'
    });
});

// POST /api/admin/sensor/attach - Attach sensor
router.post('/sensor/attach', (req, res) => {
    res.json({
        success: true,
        message: 'Admin attach sensor route'
    });
});

// POST /api/admin/sensor/disconnect - Disconnect sensor
router.post('/sensor/disconnect', (req, res) => {
    res.json({
        success: true,
        message: 'Admin disconnect sensor route'
    });
});

// POST /api/admin/sensor/replace - Replace sensor
router.post('/sensor/replace', (req, res) => {
    res.json({
        success: true,
        message: 'Admin replace sensor route'
    });
});

// GET /api/admin/roles - Get roles (legacy)
router.get('/roles', (req, res) => {
    res.json({
        success: true,
        message: 'Admin roles route - Use /api/users/roles instead'
    });
});

module.exports = router;