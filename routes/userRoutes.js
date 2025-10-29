const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const userController = require('../controllers/userController');

// Get current user profile
router.get("/me", protect, userController.getMe);

// Update current user profile
router.put("/me", protect, userController.updateMe);

// Admin-only: list all users
router.get('/', protect, authorizeRoles('admin'), userController.getAllUsers);

module.exports = router;
