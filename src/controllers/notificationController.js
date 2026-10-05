// src/controllers/notificationController.js
const notificationService = require('../services/notificationService');

/**
 * Check and send critical alerts
 * POST /api/notifications/check-critical
 */
const checkCriticalAlerts = async (req, res) => {
    try {
        const result = await notificationService.checkAndSendCriticalAlerts();
        
        if (result.success) {
            res.json({
                success: true,
                message: `Alerts sent for ${result.count} critical freezer(s)`,
                data: result
            });
        } else {
            res.status(500).json({
                success: false,
                message: result.error || 'Failed to send alerts'
            });
        }
    } catch (error) {
        console.error('Error in check-critical:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * Send test email
 * POST /api/notifications/send-test
 */
const sendTestEmail = async (req, res) => {
    try {
        const result = await notificationService.sendTestEmail();
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Test email sent successfully',
                data: result
            });
        } else {
            res.status(500).json({
                success: false,
                message: result.error || 'Failed to send test email'
            });
        }
    } catch (error) {
        console.error('Error in send-test:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * Send single alert
 * POST /api/notifications/send-single
 */
const sendSingleAlert = async (req, res) => {
    try {
        const { freezer } = req.body;
        
        if (!freezer) {
            return res.status(400).json({
                success: false,
                message: 'Freezer data is required'
            });
        }
        
        const result = await notificationService.sendSingleAlert(freezer);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Email sent successfully',
                data: result
            });
        } else {
            res.status(500).json({
                success: false,
                message: result.error || 'Failed to send email'
            });
        }
    } catch (error) {
        console.error('Error in send-single:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * Check status changes - MANUAL TRIGGER
 * POST /api/notifications/check-status-changes
 */
const checkStatusChanges = async (req, res) => {
    try {
        console.log('🔔 Manual status change check triggered...');
        const result = await notificationService.checkAndSendStatusNotifications();
        
        res.json({
            success: true,
            message: `Sent ${result.count} status change notification(s)`,
            data: result
        });
    } catch (error) {
        console.error('Error in check-status-changes:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * Get recent notifications
 * GET /api/notifications/recent
 */
const getRecentNotifications = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const notifications = await notificationService.getRecentNotifications(limit);
        
        res.json({
            success: true,
            data: notifications,
            count: notifications.length
        });
    } catch (error) {
        console.error('Error getting recent notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get notifications',
            error: error.message
        });
    }
};

module.exports = {
    checkCriticalAlerts,
    sendTestEmail,
    sendSingleAlert,
    checkStatusChanges,
    getRecentNotifications
};