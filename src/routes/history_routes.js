const express = require('express');
const router = express.Router();
const historyController = require('../controllers/history_controller');
const { authenticate } = require('../middleware/auth');  

// ============================================
// History Routes
// ============================================

router.use(authenticate);  

router.get('/data', historyController.getHistoryData);

router.get('/filters', historyController.getFilterOptions);

router.get('/freezers/:shopId', historyController.getFreezersByShop);

router.get('/sensors/:freezerName', historyController.getSensorsByFreezer);

module.exports = router;