const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/device_management_controller');

// ============================================
// DEVICE MANAGEMENT ROUTES
// ============================================

// Get all sensors (with optional shop_id filter)
router.get('/sensors', deviceController.getAllSensors);

// Get sensors by shop ID
router.get('/sensors/shop/:shopId', deviceController.getSensorsByShop);

// Get sensors by freezer name
router.get('/sensors/freezer/:freezerName', deviceController.getSensorsByFreezer);  

// Update sensor freezer name
router.put('/sensors/:sensor_rom', deviceController.updateSensorFreezerName);

module.exports = router;