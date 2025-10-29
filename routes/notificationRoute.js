const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../middleware/auth");
const notificationController = require("../controllers/notificationController");

// Staff sends alert
router.post(
  "/alert/:productId",
  protect,
  authorizeRoles("staff"),
  notificationController.createAlert
);

// Admin views notifications
router.get(
  "/",
  protect,
  authorizeRoles("admin", "manager"),
  notificationController.getNotifications
);

// Admin marks a notification as read
router.patch(
  "/:id/read",
  protect,
  authorizeRoles("admin", "manager"),
  notificationController.markAsRead
);

module.exports = router;
