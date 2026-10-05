const pool = require('../config/database');

/**
 * Middleware to check if user is authenticated
 */
const authenticate = async (req, res, next) => {
    try {
        const token = req.cookies?.session_token || req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        
        // Check session in database
        const query = `
            SELECT 
                us.user_id,
                u.id,
                u.username,
                u.email,
                u.full_name,
                u.role_id,
                r.name as role_name,
                r.description as role_description,
                u.is_active,
                u.company,
                u.region,
                u.city
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
        req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            role_id: user.role_id,
            role_name: user.role_name,
            role_description: user.role_description,
            company: user.company,
            region: user.region,
            city: user.city
        };
        
        next();
    } catch (error) {
        console.error('Error in authenticate:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Middleware to check if user has required role
 * @param {string|string[]} allowedRoles 
 */
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        
        const userRole = req.user.role_name;
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        
        if (!roles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions'
            });
        }
        
        next();
    };
};

/**
 * Get current user role
 */
const getCurrentUser = async (req, res) => {
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
                u.email,
                u.full_name,
                u.role_id,
                r.name as role_name,
                r.description as role_description,
                u.is_active,
                u.company,
                u.region,
                u.city
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
                city: user.city
            }
        });
    } catch (error) {
        console.error('Error in getCurrentUser:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    authenticate,
    authorize,
    getCurrentUser
};