const pool = require('../config/database');

class AdminController {
    // ============================================
    // 1. SHOP MANAGEMENT
    // ============================================
    
    // POST /api/admin/shop
    async addShop(req, res) {
        try {
            const { region_name, city_name, shop_name } = req.body;
            
            if (!region_name || !city_name || !shop_name) {
                return res.status(400).json({
                    success: false,
                    message: 'region_name, city_name, and shop_name are required'
                });
            }

            // ✅ Check if region exists
            const region = await pool.query(
                'SELECT id FROM locations WHERE region_name = $1 AND city_name IS NULL AND shop_name IS NULL',
                [region_name]
            );
            
            if (region.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Region not found'
                });
            }

            // ✅ Check if city exists in this region
            const city = await pool.query(
                'SELECT id FROM locations WHERE region_name = $1 AND city_name = $2 AND shop_name IS NULL',
                [region_name, city_name]
            );
            
            if (city.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'City not found in this region'
                });
            }

            // ✅ Check if shop already exists in this city
            const existing = await pool.query(
                'SELECT id FROM locations WHERE region_name = $1 AND city_name = $2 AND shop_name = $3',
                [region_name, city_name, shop_name]
            );
            
            if (existing.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Shop already exists in this city'
                });
            }

            // ✅ Insert shop into locations table
            const result = await pool.query(
                `INSERT INTO locations (region_name, city_name, shop_name)
                 VALUES ($1, $2, $3)
                 RETURNING id, region_name, city_name, shop_name, created_at`,
                [region_name, city_name, shop_name]
            );

            res.status(201).json({
                success: true,
                message: 'Shop added successfully',
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Add shop error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add shop',
                error: error.message
            });
        }
    }

    // PUT /api/admin/shop/:id
    async updateShop(req, res) {
        try {
            const { id } = req.params;
            const { shop_name, region_name, city_name } = req.body;
            
            // ✅ Check if shop exists
            const shop = await pool.query(
                'SELECT id, region_name, city_name, shop_name FROM locations WHERE id = $1 AND shop_name IS NOT NULL',
                [id]
            );
            
            if (shop.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Shop not found'
                });
            }

            const updates = [];
            const values = [];
            let paramCounter = 1;

            if (shop_name) {
                updates.push(`shop_name = $${paramCounter}`);
                values.push(shop_name);
                paramCounter++;
            }
            if (region_name) {
                // ✅ Verify region exists
                const region = await pool.query(
                    'SELECT id FROM locations WHERE region_name = $1 AND city_name IS NULL AND shop_name IS NULL',
                    [region_name]
                );
                
                if (region.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Region not found'
                    });
                }
                
                updates.push(`region_name = $${paramCounter}`);
                values.push(region_name);
                paramCounter++;
            }
            if (city_name) {
                // ✅ Verify city exists in the region
                const regionName = region_name || shop.rows[0].region_name;
                const city = await pool.query(
                    'SELECT id FROM locations WHERE region_name = $1 AND city_name = $2 AND shop_name IS NULL',
                    [regionName, city_name]
                );
                
                if (city.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'City not found in this region'
                    });
                }
                
                updates.push(`city_name = $${paramCounter}`);
                values.push(city_name);
                paramCounter++;
            }

            if (updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one field is required (shop_name, region_name, or city_name)'
                });
            }

            values.push(id);
            
            const query = `
                UPDATE locations 
                SET ${updates.join(', ')}, updated_at = NOW()
                WHERE id = $${paramCounter} AND shop_name IS NOT NULL
                RETURNING id, region_name, city_name, shop_name, updated_at
            `;
            
            const result = await pool.query(query, values);
            
            res.json({
                success: true,
                message: 'Shop updated successfully',
                data: result.rows[0]
            });
            
        } catch (error) {
            console.error('Update shop error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update shop',
                error: error.message
            });
        }
    }

    // DELETE /api/admin/shop/:id
    async deleteShop(req, res) {
        try {
            const { id } = req.params;
            
            // ✅ Check if shop exists
            const shop = await pool.query(
                'SELECT id, shop_name FROM locations WHERE id = $1 AND shop_name IS NOT NULL',
                [id]
            );
            
            if (shop.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Shop not found'
                });
            }

            const shopName = shop.rows[0].shop_name;

            // ✅ Delete shop
            await pool.query('DELETE FROM locations WHERE id = $1', [id]);

            res.status(200).json({
                success: true,
                message: `Shop "${shopName}" deleted successfully`,
                data: {
                    id: parseInt(id),
                    name: shopName
                }
            });
            
        } catch (error) {
            console.error('Delete shop error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete shop',
                error: error.message
            });
        }
    }

    // ============================================
    // 2. FREEZER MANAGEMENT
    // ============================================
    
    // PUT /api/admin/freezer/:id
    async updateFreezer(req, res) {
        try {
            const { id } = req.params;
            const { name, firmware_version, network_interface, region, city, shop_name, status } = req.body;
            
            const updates = [];
            const values = [];
            let paramCounter = 1;

            if (name) {
                updates.push(`name = $${paramCounter}`);
                values.push(name);
                paramCounter++;
            }
            if (firmware_version) {
                updates.push(`firmware_version = $${paramCounter}`);
                values.push(firmware_version);
                paramCounter++;
            }
            if (network_interface) {
                updates.push(`network_interface = $${paramCounter}`);
                values.push(network_interface);
                paramCounter++;
            }
            if (region) {
                updates.push(`region = $${paramCounter}`);
                values.push(region);
                paramCounter++;
            }
            if (city) {
                updates.push(`city = $${paramCounter}`);
                values.push(city);
                paramCounter++;
            }
            if (shop_name) {
                updates.push(`shop_name = $${paramCounter}`);
                values.push(shop_name);
                paramCounter++;
            }
            if (status) {
                updates.push(`status = $${paramCounter}`);
                values.push(status);
                paramCounter++;
            }

            if (updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one field is required'
                });
            }

            values.push(id);
            
            const query = `
                UPDATE gateways 
                SET ${updates.join(', ')}, updated_at = NOW()
                WHERE id = $${paramCounter}
                RETURNING id
            `;
            
            const result = await pool.query(query, values);
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Freezer not found'
                });
            }

            res.json({
                success: true,
                message: 'Freezer updated successfully',
                data: { id: result.rows[0].id }
            });
        } catch (error) {
            console.error('Update freezer error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update freezer'
            });
        }
    }

    // DELETE /api/admin/gateway/:id
    async deleteGateway(req, res) {
        try {
            const { id } = req.params;
            
            const checkQuery = 'SELECT id, name FROM gateways WHERE id = $1';
            const checkResult = await pool.query(checkQuery, [id]);
            
            if (checkResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Gateway not found'
                });
            }
            
            const gatewayName = checkResult.rows[0].name;
            
            await pool.query('DELETE FROM gateways WHERE id = $1', [id]);
            
            res.status(200).json({
                success: true,
                message: `Gateway "${gatewayName}" deleted successfully`,
                data: {
                    id: parseInt(id),
                    name: gatewayName
                }
            });
            
        } catch (error) {
            console.error('Delete gateway error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete gateway',
                error: error.message
            });
        }
    }

    // ============================================
    // 3. SENSOR MANAGEMENT
    // ============================================
    
    // POST /api/admin/sensor/attach
    async attachSensor(req, res) {
        try {
            const { sensor_id, gateway_id } = req.body;
            
            if (!sensor_id || !gateway_id) {
                return res.status(400).json({
                    success: false,
                    message: 'sensor_id and gateway_id are required'
                });
            }

            const sensor = await pool.query(
                'SELECT id FROM sensors WHERE id = $1',
                [sensor_id]
            );
            
            if (sensor.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Sensor not found'
                });
            }

            const gateway = await pool.query(
                'SELECT id FROM gateways WHERE id = $1',
                [gateway_id]
            );
            
            if (gateway.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Gateway not found'
                });
            }

            await pool.query(
                'UPDATE sensors SET gateway_id = $1, updated_at = NOW() WHERE id = $2',
                [gateway_id, sensor_id]
            );

            res.json({
                success: true,
                message: 'Sensor attached successfully',
                data: { sensor_id, gateway_id }
            });
        } catch (error) {
            console.error('Attach sensor error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to attach sensor'
            });
        }
    }

    // POST /api/admin/sensor/disconnect
    async disconnectSensor(req, res) {
        try {
            const { sensor_id } = req.body;
            
            if (!sensor_id) {
                return res.status(400).json({
                    success: false,
                    message: 'sensor_id is required'
                });
            }

            const sensor = await pool.query(
                'SELECT id FROM sensors WHERE id = $1',
                [sensor_id]
            );
            
            if (sensor.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Sensor not found'
                });
            }

            await pool.query(
                'UPDATE sensors SET gateway_id = NULL, updated_at = NOW() WHERE id = $1',
                [sensor_id]
            );

            res.json({
                success: true,
                message: 'Sensor disconnected successfully',
                data: { sensor_id }
            });
        } catch (error) {
            console.error('Disconnect sensor error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to disconnect sensor'
            });
        }
    }

    // POST /api/admin/sensor/replace
    async replaceSensor(req, res) {
        try {
            const { old_sensor_id, new_sensor_rom, new_sensor_name } = req.body;
            
            if (!old_sensor_id || !new_sensor_rom) {
                return res.status(400).json({
                    success: false,
                    message: 'old_sensor_id and new_sensor_rom are required'
                });
            }

            const oldSensor = await pool.query(
                'SELECT * FROM sensors WHERE id = $1',
                [old_sensor_id]
            );
            
            if (oldSensor.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Old sensor not found'
                });
            }

            const oldData = oldSensor.rows[0];
            const gateway_id = oldData.gateway_id;
            
            const result = await pool.query(
                `INSERT INTO sensors (gateway_id, sensor_index, rom_address, name, status, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                 RETURNING id`,
                [gateway_id, oldData.sensor_index, new_sensor_rom, new_sensor_name || 'Sensor', oldData.status]
            );

            await pool.query('DELETE FROM sensors WHERE id = $1', [old_sensor_id]);

            res.json({
                success: true,
                message: 'Sensor replaced successfully',
                data: { 
                    new_sensor_id: result.rows[0].id,
                    old_sensor_id: old_sensor_id
                }
            });
        } catch (error) {
            console.error('Replace sensor error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to replace sensor'
            });
        }
    }

    // ============================================
    // 4. USER MANAGEMENT
    // ============================================
    
    // POST /api/admin/user
    async createUser(req, res) {
        try {
            const { username, password, email, full_name, role_id, region, city,company } = req.body;
            
             if (!username || !password || !role_id || !company) {
                return res.status(400).json({
                    success: false,
                    message: 'username, password, role_id, and company are required'
                });
            }

            const existing = await pool.query(
                'SELECT id FROM users WHERE username = $1',
                [username]
            );
            
            if (existing.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Username already exists'
                });
            }

            const result = await pool.query(
                `INSERT INTO users (username, password, email, full_name, company, role_id, region, city, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING id, username, full_name, email, company, region, city, is_active`,
                [username, password, email || null, full_name || null, company, role_id, region || null, city || null, true]
            );

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create user'
            });
        }
    }

    // PUT /api/admin/user/:id
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { email, full_name,company, role_id, region, city } = req.body;
            
            const updates = [];
            const values = [];
            let paramCounter = 1;

            if (email) {
                updates.push(`email = $${paramCounter}`);
                values.push(email);
                paramCounter++;
            }
            if (full_name) {
                updates.push(`full_name = $${paramCounter}`);
                values.push(full_name);
                paramCounter++;
            }
            if (company) {
                updates.push(`company = $${paramCounter}`);
                values.push(company);
                paramCounter++;
            }
            if (role_id) {
                updates.push(`role_id = $${paramCounter}`);
                values.push(role_id);
                paramCounter++;
            }
            if (region) {
                updates.push(`region = $${paramCounter}`);
                values.push(region);
                paramCounter++;
            }
            if (city) {
                updates.push(`city = $${paramCounter}`);
                values.push(city);
                paramCounter++;
            }

            if (updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one field is required'
                });
            }

            values.push(id);
            
            const query = `
                UPDATE users 
                SET ${updates.join(', ')}, updated_at = NOW()
                WHERE id = $${paramCounter}
                RETURNING id, username, full_name, email, region, city, is_active
            `;
            
            const result = await pool.query(query, values);
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                message: 'User updated successfully',
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update user'
            });
        }
    }

    // PUT /api/admin/user/:id/status
    async updateUserStatus(req, res) {
        try {
            const { id } = req.params;
            const { is_active } = req.body;
            
            if (is_active === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'is_active is required'
                });
            }

            const result = await pool.query(
                `UPDATE users 
                 SET is_active = $1, updated_at = NOW()
                 WHERE id = $2
                 RETURNING id, username, is_active`,
                [is_active, id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Update user status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update user status'
            });
        }
    }

    // POST /api/admin/user/:id/reset-password
    async resetPassword(req, res) {
        try {
            const { id } = req.params;
            const { new_password } = req.body;
            
            if (!new_password) {
                return res.status(400).json({
                    success: false,
                    message: 'new_password is required'
                });
            }

            const result = await pool.query(
                `UPDATE users 
                 SET password = $1, updated_at = NOW()
                 WHERE id = $2
                 RETURNING id, username`,
                [new_password, id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                message: 'Password reset successfully',
                data: { id: result.rows[0].id }
            });
        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to reset password'
            });
        }
    }

    // ============================================
    // 5. ROLE MANAGEMENT
    // ============================================
    
    // POST /api/admin/role
    async createRole(req, res) {
        try {
            const { name, description } = req.body;
            
            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'Role name is required'
                });
            }

            const result = await pool.query(
                `INSERT INTO roles (name, description)
                 VALUES ($1, $2)
                 RETURNING id, name, description`,
                [name.toUpperCase(), description || null]
            );

            res.status(201).json({
                success: true,
                message: 'Role created successfully',
                data: result.rows[0]
            });
        } catch (error) {
            if (error.code === '23505') {
                return res.status(400).json({
                    success: false,
                    message: 'Role already exists'
                });
            }
            console.error('Create role error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create role'
            });
        }
    }

    // PUT /api/admin/role/:id
    async updateRole(req, res) {
        try {
            const { id } = req.params;
            const { name, description } = req.body;
            
            if (!name && !description) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one field is required'
                });
            }

            const updates = [];
            const values = [];
            let paramCounter = 1;

            if (name) {
                updates.push(`name = $${paramCounter}`);
                values.push(name.toUpperCase());
                paramCounter++;
            }
            if (description) {
                updates.push(`description = $${paramCounter}`);
                values.push(description);
                paramCounter++;
            }

            values.push(id);
            
            const query = `
                UPDATE roles 
                SET ${updates.join(', ')}, updated_at = NOW()
                WHERE id = $${paramCounter}
                RETURNING id, name, description
            `;
            
            const result = await pool.query(query, values);
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Role not found'
                });
            }

            res.json({
                success: true,
                message: 'Role updated successfully',
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Update role error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update role'
            });
        }
    }

    // POST /api/admin/user/:id/role
    async assignRole(req, res) {
        try {
            const { id } = req.params;
            const { role_id } = req.body;
            
            if (!role_id) {
                return res.status(400).json({
                    success: false,
                    message: 'role_id is required'
                });
            }

            const user = await pool.query(
                'SELECT id FROM users WHERE id = $1',
                [id]
            );
            
            if (user.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const role = await pool.query(
                'SELECT id FROM roles WHERE id = $1',
                [role_id]
            );
            
            if (role.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Role not found'
                });
            }

            const result = await pool.query(
                `UPDATE users 
                 SET role_id = $1, updated_at = NOW()
                 WHERE id = $2
                 RETURNING id, username, role_id`,
                [role_id, id]
            );

            res.json({
                success: true,
                message: 'Role assigned successfully',
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Assign role error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to assign role'
            });
        }
    }

    // ============================================
    // 6. GET ALL ROLES (For Frontend Dropdown)
    // ============================================
    
    // GET /api/admin/roles
    async getRoles(req, res) {
        try {
            const result = await pool.query(
                'SELECT id, name, description FROM roles ORDER BY id'
            );
            
            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('Get roles error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get roles'
            });
        }
    }

    // ============================================
    // 7. GET ALL USERS (For Admin Panel)
    // ============================================
    
    // GET /api/admin/users
    async getUsers(req, res) {
        try {
            const result = await pool.query(
                `SELECT 
                    u.id,
                    u.username,
                    u.email,
                    u.full_name,
                    u.company,        
                    u.region,
                    u.city,
                    u.is_active,
                    u.last_login,
                    u.created_at,
                    r.id as role_id,
                    r.name as role_name,
                    r.description as role_description
                 FROM users u
                 LEFT JOIN roles r ON u.role_id = r.id
                 ORDER BY u.id`
            );
            
            res.json({
                success: true,
                data: result.rows,
                count: result.rows.length
            });
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get users'
            });
        }
    }
    
    // GET /api/admin/companies
    async getCompanies(req, res) {
        try {
            const result = await pool.query(
                'SELECT id, name FROM companies WHERE is_active = TRUE ORDER BY name'
            );
            
            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('Get companies error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get companies'
            });
        }
    }
}

module.exports = new AdminController();