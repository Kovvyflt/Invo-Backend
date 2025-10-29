const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { protect, authorizeRoles } = require("../middleware/auth"); //
const authController = require('../controllers/authController');

// Register (admin can create other admins via db or protected route)
router.post(
  '/register',
  [
    body('firstName').notEmpty().withMessage('First name required'),
    body('lastName').notEmpty().withMessage('Last name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 chars'),
    body('phoneNumber').optional().isString(),
    body('age').optional().isNumeric(),
    body('picture').optional().isString(),
  ],
  authController.register
);


router.put("/approve/:userId",
  protect,
  authorizeRoles("admin"),
  authController.approveUser
);
router.get("/pending",
  protect,
  authorizeRoles("admin"),
  authController.getPendingUsers
);

router.post('/login', authController.login);




module.exports = router;
