const dbService = require('../services/db_service');

// ============================================
// GET ALL SENSORS
// ============================================
const getAllSensors = async (req, res, next) => {
    try {
        const { shop_id } = req.query;

        let data;
        if (shop_id) {
            data = await dbService.getSensorsByShop(parseInt(shop_id));
        } else {
            data = await dbService.getAllSensors();
        }

        res.json({
            success: true,
            message: 'Sensors retrieved successfully',
            data: data,
            count: data.length
        });

    } catch (error) {
        console.error('Error in getAllSensors:', error);
        next(error);
    }
};

// ============================================
// UPDATE SENSOR FREEZER NAME
// ============================================
const updateSensorFreezerName = async (req, res, next) => {
    try {
        const { sensor_rom } = req.params;
        const { freezer_name } = req.body;

        if (!sensor_rom) {
            return res.status(400).json({
                success: false,
                message: 'Sensor ROM is required'
            });
        }

        if (!freezer_name || freezer_name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Freezer name is required'
            });
        }

        const existingSensor = await dbService.getSensorByRom(sensor_rom);
        if (!existingSensor) {
            return res.status(404).json({
                success: false,
                message: 'Sensor not found'
            });
        }

        const result = await dbService.updateSensorFreezerName(sensor_rom, freezer_name.trim());

        if (!result || !result.success) {
            return res.status(400).json({
                success: false,
                message: result?.message || 'Failed to update sensor'
            });
        }

        res.json({
            success: true,
            message: 'Freezer name updated successfully',
            data: result.data
        });

    } catch (error) {
        console.error('Error in updateSensorFreezerName:', error);
        next(error);
    }
};

// ============================================
// GET SENSORS BY SHOP (For Dropdown)
// ============================================
const getSensorsByShop = async (req, res, next) => {
    try {
        const { shopId } = req.params;

        if (!shopId) {
            return res.status(400).json({
                success: false,
                message: 'Shop ID is required'
            });
        }

        const data = await dbService.getSensorsByShop(parseInt(shopId));

        res.json({
            success: true,
            message: 'Sensors retrieved successfully',
            data: data,
            count: data.length
        });

    } catch (error) {
        console.error('Error in getSensorsByShop:', error);
        next(error);
    }
};

// ============================================
// GET SENSORS BY FREEZER NAME
// ============================================
const getSensorsByFreezer = async (req, res, next) => {
    try {
        const { freezerName } = req.params;

        if (!freezerName) {
            return res.status(400).json({
                success: false,
                message: 'Freezer name is required'
            });
        }

        // Decode URL encoded string
        const decodedName = decodeURIComponent(freezerName);
        console.log('🔍 Fetching sensors for freezer:', decodedName);

        const data = await dbService.getSensorsByFreezer(decodedName);

        res.json({
            success: true,
            message: 'Sensors retrieved successfully',
            data: data,
            count: data.length
        });

    } catch (error) {
        console.error('Error in getSensorsByFreezer:', error);
        next(error);
    }
};

module.exports = {
    getAllSensors,
    updateSensorFreezerName,
    getSensorsByShop,
    getSensorsByFreezer,
};