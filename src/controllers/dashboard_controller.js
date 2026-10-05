const db = require('../services/db_service');
const { effectiveRegion } = require('../middleware/regionScope');

/**
 * @desc    Get Dashboard Summary
 * @route   GET /api/dashboard/summary
 * @returns {Object} - total_freezers, normal_freezers, warning_freezers, critical_freezers, inactive_freezers, avg_temperature
 */
const getDashboardSummary = async (req, res) => {
    try {
        const region = effectiveRegion(req.user, null);  
        const result = await db.query('SELECT * FROM get_dashboard_summary($1);', [region]);
        
        if (result.rows.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No data available',
                data: {
                    total_freezers: 0,
                    normal_freezers: 0,
                    warning_freezers: 0,
                    critical_freezers: 0,
                    inactive_freezers: 0,  
                    avg_temperature: 0
                }
            });
        }

        const data = result.rows[0];
        return res.status(200).json({
            success: true,
            message: 'Dashboard summary retrieved successfully',
            data: {
                total_freezers: parseInt(data.total_freezers) || 0,
                normal_freezers: parseInt(data.normal_freezers) || 0,
                warning_freezers: parseInt(data.warning_freezers) || 0,
                critical_freezers: parseInt(data.critical_freezers) || 0,
                inactive_freezers: parseInt(data.inactive_freezers) || 0,  
                avg_temperature: parseFloat(data.avg_temperature) || 0
            }
        });
    } catch (error) {
        console.error('Error in getDashboardSummary:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * @desc    Get Critical Freezers List
 * @route   GET /api/dashboard/critical
 * @returns {Array} - List of critical freezers (temperature <= -12°C)
 */
const getCriticalFreezers = async (req, res) => {
    try {
        const region = effectiveRegion(req.user, null);   
        const result = await db.query('SELECT * FROM get_critical_freezers($1);', [region]);
        
        return res.status(200).json({
            success: true,
            message: 'Critical freezers retrieved successfully',
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error in getCriticalFreezers:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * @desc    Get All Freezers with Latest Readings
 * @route   GET /api/dashboard/freezers
 * @params  region, city, shop (optional)
 * @returns {Array} - List of all freezers with latest readings including sensor_name and status
 */
const getAllFreezers = async (req, res) => {
    try {
        const { city, shop } = req.query;
        const region = effectiveRegion(req.user, req.query.region);   
        
        const query = `SELECT * FROM get_all_freezers($1, $2, $3);`;
        const result = await db.query(query, [region, city || null, shop || null]);
        
        return res.status(200).json({
            success: true,
            message: 'All freezers retrieved successfully',
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error in getAllFreezers:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = {
    getDashboardSummary,
    getCriticalFreezers,
    getAllFreezers
};