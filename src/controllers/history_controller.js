const dbService = require('../services/db_service');
const { effectiveRegion } = require('../middleware/regionScope');

/**
 * Get historical data with filters
 */
const getHistoryData = async (req, res, next) => {
    try {
        const {
            region,
            city,
            shop,
            freezer_name,
            sensor_name,
            sensor_rom,
            start_date,
            end_date
        } = req.query;

        const scopedRegion = effectiveRegion(req.user, region);   

        // Validate dates
        if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
            return res.status(400).json({
                success: false,
                message: 'Start date cannot be greater than end date'
            });
        }

        const data = await dbService.getHistoryData(
            scopedRegion,
            city || null,
            shop || null,
            freezer_name || null,
            sensor_name || null,
            sensor_rom || null,
            start_date || null,
            end_date || null
        );

        res.json({
            success: true,
            message: 'History data retrieved successfully',
            data: data,
            count: data.length,
            filters: {
                region: scopedRegion,
                city,
                shop,
                freezer_name,
                sensor_name,
                sensor_rom,
                start_date,
                end_date
            }
        });

    } catch (error) {
        console.error('Error in getHistoryData:', error);
        next(error);
    }
};

/**
 * Get filter options for dropdowns
 */
const getFilterOptions = async (req, res, next) => {
    try {
        const { region, city, shop } = req.query;
        const scopedRegion = effectiveRegion(req.user, region);   

        const [regions, cities, shops, freezers] = await Promise.all([
            dbService.getFilterRegions(),
            dbService.getFilterCities(scopedRegion),
            dbService.getFilterShops(scopedRegion, city),
            dbService.getFilterFreezers(scopedRegion, city, shop)
        ]);

        res.json({
            success: true,
            message: 'Filter options retrieved successfully',
            data: {
                regions: regions,
                cities: cities,
                shops: shops,
                freezers: freezers
            }
        });

    } catch (error) {
        console.error('Error in getFilterOptions:', error);
        next(error);
    }
};

/**
 * Get freezers for a specific shop (for dropdown)
 */
const getFreezersByShop = async (req, res, next) => {
    try {
        const { shopId } = req.params;

        if (!shopId) {
            return res.status(400).json({
                success: false,
                message: 'Shop ID is required'
            });
        }

        const data = await dbService.getFreezersByShop(parseInt(shopId));

        res.json({
            success: true,
            message: 'Freezers retrieved successfully',
            data: data,
            count: data.length
        });

    } catch (error) {
        console.error('Error in getFreezersByShop:', error);
        next(error);
    }
};

/**
 * Get sensors by freezer name (for dropdown)
 */
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
    getHistoryData,
    getFilterOptions,
    getFreezersByShop,
    getSensorsByFreezer  
};