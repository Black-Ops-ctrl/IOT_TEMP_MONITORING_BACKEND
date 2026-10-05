// src/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// POST /api/notifications/check-critical
router.post('/check-critical', notificationController.checkCriticalAlerts);

// POST /api/notifications/send-test
router.post('/send-test', notificationController.sendTestEmail);

// POST /api/notifications/send-single
router.post('/send-single', notificationController.sendSingleAlert);

// POST / Check status changes
router.post('/check-status-changes', notificationController.checkStatusChanges);

// GET /api/notifications/recent - Get recent notifications
router.get('/recent', notificationController.getRecentNotifications);

module.exports = router;