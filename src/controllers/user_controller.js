const pool = require('../config/database');

class UserController {
    
    // GET /api/users
    async getUsers(req, res) {
        try {
            const query = `
                SELECT 
                    u.id,
                    u.username,
                    u.full_name,
                    u.email,
                    u.company,
                    u.role_id,
                    r.name as role_name,
                    r.description as role_description,
                    u.region,
                    u.city,
                    u.is_active,
                    u.last_login,
                    u.created_at
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                ORDER BY u.id
            `;
            
            const result = await pool.query(query);
            
            res.json({
                success: true,
                data: result.rows,
                count: result.rows.length
            });
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get users',
                error: error.message
            });
        }
    }

    // GET /api/users/me
    async getCurrentUser(req, res) {
        try {
            const token = req.cookies?.session_token || req.headers.authorization?.split(' ')[1];
            
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            
            const query = `
                SELECT 
                    u.id,
                    u.username,
                    u.full_name,
                    u.email,
                    u.company,
                    u.role_id,
                    r.name as role_name,
                    r.description as role_description,
                    u.region,
                    u.city,
                    u.is_active
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.id = (
                    SELECT user_id FROM user_sessions WHERE session_token = $1 AND expires_at > NOW()
                )
            `;
            const result = await pool.query(query, [token]);
            
            if (result.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid session'
                });
            }
            
            res.json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Get current user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get current user',
                error: error.message
            });
        }
    }

    // POST /api/users
    async createUser(req, res) {
        try {
            const { 
                username, 
                password, 
                email, 
                full_name, 
                role_id, 
                company, 
                region, 
                city 
            } = req.body;
            
            if (!username || !password || !role_id || !company) {
                return res.status(400).json({
                    success: false,
                    message: 'username, password, role_id, and company are required'
                });
            }

            // Check if username already exists
            const checkUser = await pool.query(
                'SELECT id FROM users WHERE username = $1',
                [username]
            );
            
            if (checkUser.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Username already exists: ${username}`
                });
            }

            // Insert new user - using simple password
            const insertQuery = `
                INSERT INTO users (
                    username,
                    password,
                    email,
                    full_name,
                    role_id,
                    company,
                    region,
                    city,
                    is_active,
                    created_at,
                    updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
                RETURNING id, username, full_name, email, company, role_id, region, city, is_active
            `;
            
            const result = await pool.query(insertQuery, [
                username, 
                password, 
                email || null, 
                full_name || null, 
                role_id, 
                company, 
                region || null, 
                city || null
            ]);

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create user',
                error: error.message
            });
        }
    }

    // PUT /api/users/:id
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { 
                username, 
                email, 
                full_name, 
                role_id, 
                company, 
                region, 
                city 
            } = req.body;
            
            if (!username || !role_id || !company) {
                return res.status(400).json({
                    success: false,
                    message: 'username, role_id, and company are required'
                });
            }

            // Check if user exists
            const checkUser = await pool.query(
                'SELECT id FROM users WHERE id = $1',
                [id]
            );
            
            if (checkUser.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: `User not found with id: ${id}`
                });
            }

            // Check if username is taken by another user
            const checkUsername = await pool.query(
                'SELECT id FROM users WHERE username = $1 AND id != $2',
                [username, id]
            );
            
            if (checkUsername.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Username already exists: ${username}`
                });
            }

            // Update user
            const updateQuery = `
                UPDATE users SET
                    username = $1,
                    email = $2,
                    full_name = $3,
                    role_id = $4,
                    company = $5,
                    region = $6,
                    city = $7,
                    updated_at = NOW()
                WHERE id = $8
                RETURNING id, username, full_name, email, company, role_id, region, city, is_active, updated_at
            `;
            
            const result = await pool.query(updateQuery, [
                username, 
                email || null, 
                full_name || null, 
                role_id, 
                company, 
                region || null, 
                city || null,
                id
            ]);

            res.json({
                success: true,
                message: 'User updated successfully',
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update user',
                error: error.message
            });
        }
    }

    // PATCH /api/users/:id/status
    async updateUserStatus(req, res) {
        try {
            const { id } = req.params;
            const { is_active } = req.body;
            
            if (is_active === undefined || is_active === null) {
                return res.status(400).json({
                    success: false,
                    message: 'is_active is required'
                });
            }

            const checkUser = await pool.query(
                'SELECT id, username FROM users WHERE id = $1',
                [id]
            );
            
            if (checkUser.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: `User not found with id: ${id}`
                });
            }

            await pool.query(
                `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2`,
                [is_active, id]
            );

            res.json({
                success: true,
                message: `User ${is_active ? 'activated' : 'deactivated'} successfully`
            });
        } catch (error) {
            console.error('Update user status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update user status',
                error: error.message
            });
        }
    }

    // PUT /api/users/:id/role
    async updateUserRole(req, res) {
        try {
            const { id } = req.params;
            const { role_id } = req.body;
            
            if (!role_id) {
                return res.status(400).json({
                    success: false,
                    message: 'role_id is required'
                });
            }

            // Check if user exists
            const checkUser = await pool.query(
                'SELECT id, username FROM users WHERE id = $1',
                [id]
            );
            
            if (checkUser.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: `User not found with id: ${id}`
                });
            }

            // Check if role exists
            const checkRole = await pool.query(
                'SELECT id FROM roles WHERE id = $1',
                [role_id]
            );
            
            if (checkRole.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: `Role not found with id: ${role_id}`
                });
            }

            await pool.query(
                `UPDATE users SET role_id = $1, updated_at = NOW() WHERE id = $2`,
                [role_id, id]
            );

            res.json({
                success: true,
                message: 'User role updated successfully'
            });
        } catch (error) {
            console.error('Update user role error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update user role',
                error: error.message
            });
        }
    }

    // DELETE /api/users/:id
    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            
            const checkUser = await pool.query(
                'SELECT username, company FROM users WHERE id = $1',
                [id]
            );
            
            if (checkUser.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: `User not found with id: ${id}`
                });
            }

            const userData = checkUser.rows[0];

            await pool.query('DELETE FROM users WHERE id = $1', [id]);

            res.json({
                success: true,
                message: `User "${userData.username}" deleted successfully`,
                data: {
                    id: parseInt(id),
                    username: userData.username,
                    company: userData.company
                }
            });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete user',
                error: error.message
            });
        }
    }

    // GET /api/users/companies
    async getCompanies(req, res) {
        try {
            const query = `
                SELECT id, name, is_active
                FROM companies
                WHERE is_active = true
                ORDER BY name
            `;
            
            const result = await pool.query(query);
            
            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('Get companies error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get companies',
                error: error.message
            });
        }
    }

    // GET /api/users/roles
    async getRoles(req, res) {
        try {
            const query = `
                SELECT id, name, description
                FROM roles
                ORDER BY id
            `;
            
            const result = await pool.query(query);
            
            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('Get roles error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get roles',
                error: error.message
            });
        }
    }
}

module.exports = new UserController();