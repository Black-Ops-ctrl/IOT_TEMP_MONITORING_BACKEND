const express = require('express');
const router = express.Router();
const userController = require('../controllers/user_controller');

// ============================================
// USER MANAGEMENT ROUTES
// ============================================

// GET /api/users - Get all users
router.get('/', userController.getUsers);

// POST /api/users - Create new user
router.post('/', userController.createUser);

// PUT /api/users/:id - Update user
router.put('/:id', userController.updateUser);

// DELETE /api/users/:id - Delete user
router.delete('/:id', userController.deleteUser);

// PATCH /api/users/:id/status - Update user status
router.patch('/:id/status', userController.updateUserStatus);

// PUT /api/users/:id/role - Update user role
router.put('/:id/role', userController.updateUserRole);

// GET /api/users/companies - Get companies for dropdown
router.get('/companies', userController.getCompanies);

// GET /api/users/roles - Get roles for dropdown
router.get('/roles', userController.getRoles);

// GET /api/users/me - Get current user
router.get('/me', userController.getCurrentUser);

module.exports = router; 