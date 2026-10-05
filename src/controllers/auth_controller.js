const crypto = require('crypto');
const pool = require('../config/database');

class AuthController {
    
    // POST /api/auth/login
    async login(req, res) {
        try {
            const { username, password, company } = req.body;
            
            if (!username || !password || !company) {
                return res.status(400).json({
                    success: false,
                    message: 'Username, password, and company are required'
                });
            }

            // Get user with role - using simple password column
            const query = `
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    u.password,
                    u.full_name,
                    u.role_id,
                    r.name as role_name,
                    r.description as role_description,
                    u.company,
                    u.region,
                    u.city,
                    u.is_active
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.username = $1 
                  AND u.company = $2
                  AND u.password = $3
                  AND u.is_active = true
            `;
            
            const result = await pool.query(query, [username, company, password]);
            
            if (result.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid username, password, or company'
                });
            }

            const user = result.rows[0];
            
            // Generate session token
            const sessionToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);
            
            // Save session
            await pool.query(
                `INSERT INTO user_sessions (user_id, session_token, expires_at)
                 VALUES ($1, $2, $3)`,
                [user.id, sessionToken, expiresAt]
            );
            
            // Update last login
            await pool.query(
                'UPDATE users SET last_login = NOW() WHERE id = $1',
                [user.id]
            );
            
            // Remove password from response
            delete user.password;
            
            // Set cookie
            res.cookie('session_token', sessionToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
            
            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        full_name: user.full_name,
                        email: user.email,
                        company: user.company,
                        role_id: user.role_id,
                        role_name: user.role_name,
                        role_description: user.role_description,
                        region: user.region,
                        city: user.city
                    },
                    token: sessionToken
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Login failed',
                error: error.message
            });
        }
    }

    // POST /api/auth/logout
    async logout(req, res) {
        try {
            const token = req.cookies?.session_token || req.headers.authorization?.split(' ')[1];
            
            if (token) {
                await pool.query('DELETE FROM user_sessions WHERE session_token = $1', [token]);
            }
            
            res.clearCookie('session_token');
            
            res.json({
                success: true,
                message: 'Logout successful'
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Logout failed'
            });
        }
    }

    // GET /api/auth/check-session
    async checkSession(req, res) {
        try {
            const token = req.cookies?.session_token || req.headers.authorization?.split(' ')[1];
            
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'No session found'
                });
            }
            
            const query = `
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    u.full_name,
                    u.role_id,
                    r.name as role_name,
                    r.description as role_description,
                    u.company,
                    u.region,
                    u.city,
                    u.is_active,
                    us.expires_at
                FROM user_sessions us
                JOIN users u ON us.user_id = u.id
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE us.session_token = $1 
                  AND us.expires_at > NOW()
                  AND u.is_active = true
            `;
            const result = await pool.query(query, [token]);
            
            if (result.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired session'
                });
            }
            
            const user = result.rows[0];
            
            res.json({
                success: true,
                message: 'Session valid',
                data: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    role_id: user.role_id,
                    role_name: user.role_name,
                    role_description: user.role_description,
                    company: user.company,
                    region: user.region,
                    city: user.city,
                    expires_at: user.expires_at
                }
            });
        } catch (error) {
            console.error('Check session error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to check session'
            });
        }
    }
}

module.exports = new AuthController();