const db = require('../services/db_service');
const { effectiveRegion } = require('../middleware/regionScope');

const getLiveReport = async (req, res) => {
    try {
        const { city, shop } = req.query;
        const region = effectiveRegion(req.user, req.query.region);   
        
        console.log('📊 Fetching live report with filters:', { region, city, shop });
        
        const result = await db.query(
            'SELECT * FROM get_live_report($1, $2, $3);',
            [region, city || null, shop || null]
        );
        
        console.log(`✅ Live report fetched: ${result.rows.length} records`);
        
        return res.status(200).json({
            success: true,
            message: 'Live report retrieved successfully',
            data: result.rows,
            count: result.rows.length,
            filters: {
                region: region || null,
                city: city || null,
                shop: shop || null
            }
        });
    } catch (error) {
        console.error('❌ Error in getLiveReport:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = {
    getLiveReport,
};