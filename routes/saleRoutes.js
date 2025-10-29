const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../middleware/auth");

// Controllers (destructured)
const {
  createSale,
  getSales,
  getSalesReport,
  getSalesByUser,
  getTopStaff,
  getTopProducts,
  getStaffTopProducts,
  getStaffRecentSales,
  getStaffSummary,
  getAdminRevenueTrend
} = require("../controllers/saleController");

// Create sale (staff or admin)
router.post("/", protect, authorizeRoles("admin", "staff"), createSale);

// List sales
router.get("/", protect, authorizeRoles("admin", "staff"), getSales);

// Admin/Manager Report
router.get("/report", protect, authorizeRoles("admin", "manager"), getSalesReport);

// Sales by user (admin, manager, or staff)
router.get("/user/:userId", protect, authorizeRoles("admin", "manager", "staff"), getSalesByUser);

// Top staff (admin/manager)
router.get("/top-staff", protect, authorizeRoles("admin", "manager"), getTopStaff);

router.get("/top-products", protect, authorizeRoles("admin", "manager"), getTopProducts);

// ✅ Staff dashboard insights
router.get(
  "/staff/top-products",
  protect,
  authorizeRoles("staff"),
  getStaffTopProducts
);

router.get(
  "/staff/recent-sales",
  protect,
  authorizeRoles("staff"),
  getStaffRecentSales
);


router.get(
  "/staff-summary",
  protect,
  authorizeRoles("staff", "manager", "admin"),
  getStaffSummary
);

router.get(
  "/admin/revenue-trend",
  protect,
  authorizeRoles("admin", "manager"),
  getAdminRevenueTrend
);


module.exports = router;
