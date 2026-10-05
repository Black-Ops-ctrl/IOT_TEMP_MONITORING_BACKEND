const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth_controller');

// ============================================
// AUTH ROUTES
// ============================================

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/check-session (optional)
router.get('/check-session', authController.checkSession || ((req, res) => {
    res.json({ success: true, message: 'Session active' });
}));

module.exports = router;