const pool = require('../config/database');

class DatabaseService {
    
    // ============================================
    // DASHBOARD FUNCTIONS
    // ============================================
    
    async getDashboardSummary() {
        const query = `SELECT * FROM get_dashboard_summary();`;
        const result = await pool.query(query);
        return result.rows[0] || null;
    }

    // ✅ UPDATED: Added filters (region, city, shop)
    async getCriticalFreezers(region = null, city = null, shop = null) {
        const query = `SELECT * FROM get_critical_freezers($1, $2, $3);`;
        const result = await pool.query(query, [region, city, shop]);
        return result.rows;
    }

    // ✅ UPDATED: Added filters (region, city, shop)
    async getAllFreezers(region = null, city = null, shop = null) {
        const query = `SELECT * FROM get_all_freezers($1, $2, $3);`;
        const result = await pool.query(query, [region, city, shop]);
        return result.rows;
    }

    // ============================================
    // LIVE REPORT FUNCTIONS
    // ============================================
    
    async getLiveReport(region = null, city = null, shop = null) {
        const query = `SELECT * FROM get_live_report($1, $2, $3);`;
        const result = await pool.query(query, [region, city, shop]);
        return result.rows;
    }

    // ============================================
    // HISTORY FUNCTIONS
    // ============================================

    async getHistoryData(region = null, city = null, shop = null, freezer_name = null, sensor_name = null, sensor_rom = null, start_date = null, end_date = null) {
        if (sensor_name && !sensor_rom) {
            const sensorQuery = `
                SELECT sensor_rom 
                FROM sensors 
                WHERE sensor_name = $1
                LIMIT 1
            `;
            const sensorResult = await pool.query(sensorQuery, [sensor_name]);
            if (sensorResult.rows.length > 0) {
                sensor_rom = sensorResult.rows[0].sensor_rom;
            }
        }

        const query = `SELECT * FROM get_history_data($1, $2, $3, $4, $5, $6, $7, $8);`;
        const result = await pool.query(query, [region, city, shop, freezer_name, sensor_name, sensor_rom, start_date, end_date]);
        return result.rows;
    }

    async getFreezersByShop(shopId) {
        const query = `
            SELECT 
                s.sensor_rom,
                COALESCE(s.freezer_name, s.sensor_rom) as freezer_name,
                s.sensor_name,
                s.temperature,
                s.updated_at as last_update
            FROM sensors s
            WHERE s.shop_id = $1
              AND s.sensor_rom IS NOT NULL
            ORDER BY freezer_name
        `;
        const result = await pool.query(query, [shopId]);
        return result.rows;
    }

    async getSensorsByFreezer(freezer_name) {
        const trimmedName = freezer_name ? freezer_name.trim() : '';
        console.log('🔍 DB Query - freezer_name:', trimmedName);
        
        if (!trimmedName) {
            return [];
        }
        
        // Try exact match first
        let query = `
            SELECT 
                s.sensor_rom,
                COALESCE(s.sensor_name, s.sensor_rom) as sensor_name,
                s.freezer_name,
                s.temperature,
                s.updated_at as last_update
            FROM sensors s
            WHERE TRIM(s.freezer_name) = $1
              AND s.sensor_rom IS NOT NULL
            ORDER BY sensor_name
        `;
        let result = await pool.query(query, [trimmedName]);
        console.log('📊 Exact match count:', result.rows.length);
        
        // If no exact match, try ILIKE
        if (result.rows.length === 0) {
            console.log('🔍 No exact match, trying ILIKE...');
            query = `
                SELECT 
                    s.sensor_rom,
                    COALESCE(s.sensor_name, s.sensor_rom) as sensor_name,
                    s.freezer_name,
                    s.temperature,
                    s.updated_at as last_update
                FROM sensors s
                WHERE TRIM(s.freezer_name) ILIKE $1
                  AND s.sensor_rom IS NOT NULL
                ORDER BY sensor_name
            `;
            result = await pool.query(query, [`%${trimmedName}%`]);
            console.log('📊 ILIKE match count:', result.rows.length);
        }
        
        // If still no results, try sensor_rom match
        if (result.rows.length === 0) {
            console.log('🔍 No ILIKE match, trying sensor_rom...');
            query = `
                SELECT 
                    s.sensor_rom,
                    COALESCE(s.sensor_name, s.sensor_rom) as sensor_name,
                    s.freezer_name,
                    s.temperature,
                    s.updated_at as last_update
                FROM sensors s
                WHERE s.sensor_rom = $1
                  AND s.sensor_rom IS NOT NULL
                ORDER BY sensor_name
            `;
            result = await pool.query(query, [trimmedName]);
            console.log('📊 Sensor ROM match count:', result.rows.length);
        }
        
        console.log('✅ Final result count:', result.rows.length);
        return result.rows;
    }

    // ============================================
    // DEVICE MANAGEMENT FUNCTIONS 
    // ============================================

    async getAllSensors() {
        const query = `
            SELECT 
                s.id as sensor_id,
                s.sensor_rom,
                s.sensor_name,
                s.freezer_name,
                s.temperature,
                s.created_at,
                sh.shop_name,
                c.name as city_name,
                r.name as region_name
            FROM sensors s
            LEFT JOIN shops sh ON s.shop_id = sh.id
            LEFT JOIN cities c ON sh.city_id = c.id
            LEFT JOIN regions r ON c.region_id = r.id
            WHERE s.sensor_rom IS NOT NULL
            ORDER BY r.name, c.name, sh.shop_name, s.sensor_name
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    async updateSensorFreezerName(sensor_rom, freezer_name) {
        const query = `
            SELECT * FROM manage_sensor(
                'UPDATE',
                $1::VARCHAR,
                NULL::VARCHAR,
                $2::VARCHAR,
                NULL::NUMERIC
            );
        `;
        const result = await pool.query(query, [sensor_rom, freezer_name]);
        const jsonResult = result.rows[0]?.manage_sensor;
        if (typeof jsonResult === 'string') {
            return JSON.parse(jsonResult);
        }
        return jsonResult || null;
    }

    async getSensorsByShop(shopId) {
        const query = `
            SELECT 
                s.id,
                s.sensor_rom,
                s.sensor_name,
                s.freezer_name,
                s.temperature,
                s.created_at,
                s.updated_at,
                sh.shop_name,
                c.name as city_name,
                r.name as region_name
            FROM sensors s
            JOIN shops sh ON s.shop_id = sh.id
            JOIN cities c ON sh.city_id = c.id
            JOIN regions r ON c.region_id = r.id
            WHERE s.shop_id = $1
              AND s.sensor_rom IS NOT NULL
            ORDER BY s.freezer_name, s.sensor_name
        `;
        const result = await pool.query(query, [shopId]);
        return result.rows;
    }

    async getSensorByRom(sensor_rom) {
        const query = `
            SELECT 
                s.id as sensor_id,
                s.sensor_rom,
                s.sensor_name,
                s.freezer_name,
                s.temperature,
                s.created_at,
                s.updated_at,
                sh.id as shop_id,
                sh.shop_name,
                c.id as city_id,
                c.name as city_name,
                r.id as region_id,
                r.name as region_name
            FROM sensors s
            LEFT JOIN shops sh ON s.shop_id = sh.id
            LEFT JOIN cities c ON sh.city_id = c.id
            LEFT JOIN regions r ON c.region_id = r.id
            WHERE s.sensor_rom = $1
        `;
        const result = await pool.query(query, [sensor_rom]);
        return result.rows[0] || null;
    }

    // ============================================
    // GENERIC QUERY METHOD
    // ============================================
    async query(text, params) {
        const result = await pool.query(text, params);
        return result;
    }
}

module.exports = new DatabaseService();