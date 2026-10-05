const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location_controller');
const { authenticate } = require('../middleware/auth');  

router.use(authenticate);   

// ============================================
// REGION ROUTES
// ============================================

router.get('/regions', locationController.getAllRegions);
router.post('/regions', locationController.createRegion);
router.put('/regions/:id', locationController.updateRegion);
router.delete('/regions/:id', locationController.deleteRegion);

// ============================================
// CITY ROUTES
// ============================================

router.get('/cities', locationController.getAllCities);
router.post('/cities', locationController.createCity);
router.put('/cities/:id', locationController.updateCity);
router.delete('/cities/:id', locationController.deleteCity);

// ============================================
// SHOP ROUTES
// ============================================
router.get('/shops', locationController.getAllShops);     
router.get('/shops/:id', locationController.getShopById);  
router.put('/shops/:id/city', locationController.updateShopCity);

module.exports = router;