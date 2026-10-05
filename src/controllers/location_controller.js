const LocationService = require('../services/locationService');
const { effectiveRegionId, isFullAccess } = require('../middleware/regionScope');

// ============================================
// REGION CONTROLLERS
// ============================================

/**
 * @desc    Get All Regions
 * @route   GET /api/locations/regions
 */
const getAllRegions = async (req, res) => {
    try {
        let data = await LocationService.getRegions();

        // ✅ REGION SCOPE: non-admin ko sirf apna region
        if (!isFullAccess(req.user)) {
            const regionId = await effectiveRegionId(req.user);
            data = data.filter(r => (r.region_id ?? r.id) === regionId);
        }

        return res.status(200).json({
            success: true,
            message: 'Regions retrieved successfully',
            data: data,
            count: data.length
        });
    } catch (error) {
        console.error('Error in getAllRegions:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * @desc    Create New Region
 * @route   POST /api/locations/regions
 * @body    { name: string }
 */
const createRegion = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Region name is required'
            });
        }
        const data = await LocationService.createRegion(name);
        if (!data.region_id) {
            return res.status(400).json({
                success: false,
                message: data.message
            });
        }
        return res.status(201).json({
            success: true,
            message: data.message,
            data: {
                region_id: data.region_id,
                region_name: data.region_name
            }
        });
    } catch (error) {
        console.error('Error in createRegion:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * @desc    Update Region
 * @route   PUT /api/locations/regions/:id
 * @body    { name: string }
 */
const updateRegion = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Region name is required'
            });
        }

        const data = await LocationService.updateRegion(id, name);
        
        if (!data.region_id) {
            return res.status(400).json({
                success: false,
                message: data.message
            });
        }

        return res.status(200).json({
            success: true,
            message: data.message,
            data: {
                region_id: data.region_id,
                region_name: data.region_name
            }
        });
    } catch (error) {
        console.error('Error in updateRegion:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * @desc    Delete Region
 * @route   DELETE /api/locations/regions/:id
 */
const deleteRegion = async (req, res) => {
    try {
        const { id } = req.params;
        
        const data = await LocationService.deleteRegion(id);

        return res.status(200).json({
            success: data.success,
            message: data.message
        });
    } catch (error) {
        console.error('Error in deleteRegion:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// ============================================
// CITY CONTROLLERS
// ============================================

/**
 * @desc    Get All Cities
 * @route   GET /api/locations/cities
 * @params  region_id (optional)
 */
const getAllCities = async (req, res) => {
    try {
        const { region_id } = req.query;

        // ✅ REGION SCOPE: non-admin → hamesha apne region ki cities
        let scopedRegionId = region_id || null;
        if (!isFullAccess(req.user)) {
            scopedRegionId = await effectiveRegionId(req.user);
        }

        const data = await LocationService.getCities(scopedRegionId);
        
        return res.status(200).json({
            success: true,
            message: 'Cities retrieved successfully',
            data: data,
            count: data.length
        });
    } catch (error) {
        console.error('Error in getAllCities:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * @desc    Create New City
 * @route   POST /api/locations/cities
 * @body    { region_id: number, name: string }
 */
const createCity = async (req, res) => {
    try {
        const { region_id, name } = req.body;
        
        if (!region_id || !name) {
            return res.status(400).json({
                success: false,
                message: 'Region ID and City name are required'
            });
        }

        const data = await LocationService.createCity(region_id, name);
        
        if (!data.city_id) {
            return res.status(400).json({
                success: false,
                message: data.message
            });
        }

        return res.status(201).json({
            success: true,
            message: data.message,
            data: {
                city_id: data.city_id,
                city_name: data.city_name,
                region_name: data.region_name
            }
        });
    } catch (error) {
        console.error('Error in createCity:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * @desc    Update City
 * @route   PUT /api/locations/cities/:id
 * @body    { name: string, region_id: number (optional) }
 */
const updateCity = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, region_id } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'City name is required'
            });
        }

        const data = await LocationService.updateCity(id, name, region_id || null);
        
        if (!data.city_id) {
            return res.status(400).json({
                success: false,
                message: data.message
            });
        }

        return res.status(200).json({
            success: true,
            message: data.message,
            data: {
                city_id: data.city_id,
                city_name: data.city_name,
                region_name: data.region_name
            }
        });
    } catch (error) {
        console.error('Error in updateCity:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * @desc    Delete City
 * @route   DELETE /api/locations/cities/:id
 */
const deleteCity = async (req, res) => {
    try {
        const { id } = req.params;
        
        const data = await LocationService.deleteCity(id);

        return res.status(200).json({
            success: data.success,
            message: data.message
        });
    } catch (error) {
        console.error('Error in deleteCity:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// ============================================
// SHOP CONTROLLERS
// ============================================

/**
 * @desc    Get All Shops with Filters
 * @route   GET /api/locations/shops
 * @params  city_id (optional), region_id (optional)
 */
const getAllShops = async (req, res) => {
    try {
        const { city_id, region_id } = req.query;
        
        // ✅ FIX: Trim the values to remove \n, spaces, etc.
        const cleanCityId = city_id ? city_id.trim() : null;
        let cleanRegionId = region_id ? region_id.trim() : null;

        // ✅ REGION SCOPE: non-admin → hamesha apna region
        if (!isFullAccess(req.user)) {
            cleanRegionId = await effectiveRegionId(req.user);
        }
        
        const data = await LocationService.getShops(cleanCityId, cleanRegionId);
        
        return res.status(200).json({
            success: true,
            message: 'Shops retrieved successfully',
            data: data,
            count: data.length,
            filters: {
                city_id: cleanCityId,
                region_id: cleanRegionId
            }
        });
    } catch (error) {
        console.error('Error in getAllShops:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * @desc    Get Single Shop by ID
 * @route   GET /api/locations/shops/:id
 */
const getShopById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const data = await LocationService.getShopById(id);
        
        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Shop not found'
            });
        }
        
        return res.status(200).json({
            success: true,
            message: 'Shop retrieved successfully',
            data: data
        });
    } catch (error) {
        console.error('Error in getShopById:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * @desc    Update Shop City
 * @route   PUT /api/locations/shops/:id/city
 * @body    { city_id: number }
 */
const updateShopCity = async (req, res) => {
    try {
        const { id } = req.params;
        const { city_id } = req.body;

        if (!city_id) {
            return res.status(400).json({
                success: false,
                message: 'City ID is required'
            });
        }

        // Check if shop exists
        const shop = await LocationService.getShopById(id);
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: 'Shop not found'
            });
        }

        // Check if city exists
        const cities = await LocationService.getCities();
        const cityExists = cities.some(c => c.city_id === parseInt(city_id));
        if (!cityExists) {
            return res.status(404).json({
                success: false,
                message: 'City not found'
            });
        }

        const data = await LocationService.updateShopCity(id, city_id);

        res.json({
            success: true,
            message: 'Shop city updated successfully',
            data: data
        });

    } catch (error) {
        console.error('Error in updateShopCity:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};


module.exports = {
    getAllRegions,
    createRegion,
    updateRegion,
    deleteRegion,
    getAllCities,
    createCity,
    updateCity,
    deleteCity,
    getAllShops,
    getShopById,
    updateShopCity  
};