const express = require('express');
const router = express.Router();
const liveReportController = require('../controllers/live_report_controller');
const { authenticate } = require('../middleware/auth');  

// ============================================
// Live Report Routes
// ============================================

router.use(authenticate);   

router.get('/live', liveReportController.getLiveReport);


module.exports = router;