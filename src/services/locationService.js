const pool = require('../config/database');

class LocationService {
    
    // ============================================
    // REGION OPERATIONS
    // ============================================
    
    // Get all regions
    static async getRegions() {
        const query = 'SELECT * FROM get_all_regions();';
        const result = await pool.query(query);
        return result.rows;
    }

    // Create region
    static async createRegion(name) {
        const query = 'SELECT * FROM create_region($1);';
        const result = await pool.query(query, [name]);
        return result.rows[0];
    }

    // Update region
    static async updateRegion(id, name) {
        const query = 'SELECT * FROM update_region($1, $2);';
        const result = await pool.query(query, [id, name]);
        return result.rows[0];
    }

    // Delete region
    static async deleteRegion(id) {
        const query = 'SELECT * FROM delete_region($1);';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    // ============================================
    // CITY OPERATIONS
    // ============================================
    
    // Get all cities (filter by region_id)
    static async getCities(regionId = null) {
        const query = 'SELECT * FROM get_all_cities($1);';
        const result = await pool.query(query, [regionId]);
        return result.rows;
    }

    // Create city
    static async createCity(regionId, name) {
        const query = 'SELECT * FROM create_city($1, $2);';
        const result = await pool.query(query, [regionId, name]);
        return result.rows[0];
    }

    // Update city
    static async updateCity(id, name, regionId = null) {
        const query = 'SELECT * FROM update_city($1, $2, $3);';
        const result = await pool.query(query, [id, name, regionId]);
        return result.rows[0];
    }

    // Delete city
    static async deleteCity(id) {
        const query = 'SELECT * FROM delete_city($1);';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    // ============================================
    // SHOP OPERATIONS
    // ============================================
    
    /**
     * Get all shops with optional filters
     * @param {number} cityId - Filter by city_id (optional)
     * @param {number} regionId - Filter by region_id (optional)
     */
    static async getShops(cityId = null, regionId = null) {
    // First get all shops
    const query = 'SELECT * FROM get_all_shops();';
    const result = await pool.query(query);
    
    let shops = result.rows;
    
    // ✅ FIX: Clean the IDs and parse to integer
    if (cityId) {
        const cleanCityId = parseInt(cityId.toString().trim());
        shops = shops.filter(s => s.city_id === cleanCityId);
    }
    
    // Filter by region_id if provided
    if (regionId) {
        const cleanRegionId = parseInt(regionId.toString().trim());
        const cityQuery = 'SELECT id FROM cities WHERE region_id = $1';
        const cityResult = await pool.query(cityQuery, [cleanRegionId]);
        const cityIds = cityResult.rows.map(c => c.id);
        shops = shops.filter(s => cityIds.includes(s.city_id));
    }
    
    return shops;
}
    /**
     * Get single shop by ID
     * @param {number} id - Shop ID
     */
    static async getShopById(id) {
        const query = 'SELECT * FROM get_all_shops();';
        const result = await pool.query(query);
        return result.rows.find(s => s.shop_id === parseInt(id)) || null;
    }

    /**
     * Update shop's city
     * @param {number} shopId - Shop ID
     * @param {number} cityId - New City ID
     */
    static async updateShopCity(shopId, cityId) {
        const query = `
            UPDATE shops 
            SET city_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, shop_name, city_id
        `;
        const result = await pool.query(query, [cityId, shopId]);
        return result.rows[0] || null;
    }
}

module.exports = LocationService;