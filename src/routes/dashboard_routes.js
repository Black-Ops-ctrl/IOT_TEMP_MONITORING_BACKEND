const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard_controller');
const { authenticate } = require('../middleware/auth');   

router.use(authenticate);  

router.get('/summary', dashboardController.getDashboardSummary);

router.get('/critical', dashboardController.getCriticalFreezers);

router.get('/freezers', dashboardController.getAllFreezers);

module.exports = router;