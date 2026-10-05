const pool = require('../config/database');

const FULL_ACCESS_ROLES = ['ADMIN'];

function isFullAccess(user) {
    const roleName = (user?.role_name || '').toUpperCase();
    const userRegion = (user?.region || '').trim();
    return FULL_ACCESS_ROLES.includes(roleName) || !userRegion || userRegion.toUpperCase() === 'ALL';
}

function effectiveRegion(user, requestedRegion) {
    if (isFullAccess(user)) {
        return requestedRegion || null;
    }
    return (user.region || '').trim();
}

async function effectiveRegionId(user) {
    if (isFullAccess(user)) return null;

    const result = await pool.query(
        'SELECT id FROM regions WHERE name ILIKE $1 LIMIT 1',
        [(user.region || '').trim()]
    );
    return result.rows.length > 0 ? result.rows[0].id : -1;
}

module.exports = { effectiveRegion, effectiveRegionId, isFullAccess };