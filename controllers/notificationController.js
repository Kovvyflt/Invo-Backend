const Notification = require("../models/notification");
const Product = require("../models/Products");

// ✅ POST /api/notifications/alert/:productId
// Used by staff to alert admin of low stock
exports.createAlert = async (req, res) => {
  try {
    const { productId } = req.params;
    const staff = req.user;

    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json({ message: "Product not found" });

    // ✅ Combine first + last name safely
    const staffName = `${staff.firstName || ""} ${staff.lastName || ""}`.trim();

    const alert = await Notification.create({
      title: "Low Stock Alert",
      message: `${staffName} flagged low stock for ${product.name}`,
      product: product._id,
      sender: staff._id,
      isRead: false,
    });

    res.status(201).json({
      message: "🚨 Alert sent successfully!",
      alert,
    });
  } catch (err) {
    console.error("❌ Error in createAlert:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ GET /api/notifications?show=all
exports.getNotifications = async (req, res) => {
  try {
    const { show } = req.query;
    const filter = show === "all" ? {} : { isRead: false };

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(15)
      .populate("product", "name sku quantity")
      .populate("sender", "firstName lastName email"); // ✅ updated here too

    res.json(notifications);
  } catch (err) {
    console.error("❌ Error in getNotifications:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ PATCH /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: "Notification not found" });

    res.json({ message: "✅ Notification marked as read" });
  } catch (err) {
    console.error("❌ Error marking notification as read:", err);
    res.status(500).json({ message: "Server error" });
  }
};
