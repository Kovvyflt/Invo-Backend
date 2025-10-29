const Sale = require("../models/Sale");
const Product = require("../models/Products");

console.log("📦 saleController loaded");

// ---------------------- CREATE SALE ----------------------
const createSale = async (req, res) => {
  try {
    const { items } = req.body; // items: [{ product: productId, quantity }]
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Sale items required" });
    }

    let total = 0;
    const saleItems = [];

    for (const it of items) {
      const prod = await Product.findById(it.product);
      if (!prod) {
        return res.status(404).json({ message: `Product ${it.product} not found` });
      }
      if (prod.quantity < it.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${prod.name}` });
      }

      // Deduct stock
      prod.quantity -= it.quantity;
      await prod.save();

      const priceAtSale = prod.price;
      total += priceAtSale * it.quantity;
      saleItems.push({ product: prod._id, quantity: it.quantity, priceAtSale });
    }

    const sale = new Sale({
      items: saleItems,
      totalAmount: total,
      soldBy: req.user._id,
    });

    const createdSale = await sale.save();

    await createdSale.populate("items.product", "name sku");
    await createdSale.populate("soldBy", "name email");

    res.status(201).json(createdSale);
  } catch (err) {
    console.error("❌ Error in createSale:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------------- GET SALES (ALL) ----------------------
const getSales = async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate("items.product", "name sku")
      .populate("soldBy", "name email");
    res.json(sales);
  } catch (err) {
    console.error("❌ Error in getSales:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------- HELPER: RANGE BUILDER ----------------------
function computeRange(type, startDate, endDate) {
  const today = new Date();
  let start = null;
  let end = null;

  if (type === "daily") {
    start = new Date(today);
    start.setHours(0, 0, 0, 0);
    end = new Date();
  } else if (type === "weekly") {
    const firstDay = new Date(today);
    firstDay.setDate(today.getDate() - today.getDay());
    start = new Date(firstDay);
    start.setHours(0, 0, 0, 0);
    end = new Date();
  } else if (type === "monthly") {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    end = new Date();
  } else if (type === "custom" && startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
  }

  return { start, end };
}

// ---------------------- REPORT: ADMIN/MANAGER ----------------------
const getSalesReport = async (req, res) => {
  try {
    const { type, startDate, endDate, staffId } = req.query;
    const { start, end } = computeRange(type, startDate, endDate);

    if (!start || !end) {
      return res.status(400).json({ message: "Invalid or missing report type" });
    }

    const query = { createdAt: { $gte: start, $lte: end } };
    if (staffId) query.soldBy = staffId;

    const sales = await Sale.find(query)
      .populate("items.product", "name sku price")
      .populate("soldBy", "name email role");

    const rows = sales.flatMap((sale) =>
      sale.items.map((item) => ({
        productName: item.product?.name || "Unknown",
        sku: item.product?.sku || "N/A",
        quantity: item.quantity,
        priceAtSale: item.priceAtSale,
        total: item.priceAtSale * item.quantity,
        soldBy: sale.soldBy?.name || "Unknown",
        createdAt: sale.createdAt,
      }))
    );

    res.json({
      filter: type,
      range: { start, end },
      count: rows.length,
      sales: rows,
    });
  } catch (err) {
    console.error("❌ Error in getSalesReport:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// ---------------------- REPORT: USER (STAFF) ----------------------
const getSalesByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, startDate, endDate } = req.query;

    if (req.user.role === "staff" && req.user._id.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Forbidden: staff can only view their own sales" });
    }

    const { start, end } = computeRange(type, startDate, endDate);
    const query = { soldBy: userId };
    if (start && end) query.createdAt = { $gte: start, $lte: end };

    const sales = await Sale.find(query)
      .populate("items.product", "name sku price")
      .populate("soldBy", "name email role");

    const rows = sales.flatMap((sale) =>
      sale.items.map((item) => ({
        productName: item.product?.name || "Unknown",
        sku: item.product?.sku || "N/A",
        quantity: item.quantity,
        priceAtSale: item.priceAtSale,
        total: item.priceAtSale * item.quantity,
        soldBy: sale.soldBy?.name || "Unknown",
        createdAt: sale.createdAt,
      }))
    );

    res.json({
      filter: type || "all",
      range: start && end ? { start, end } : null,
      count: rows.length,
      sales: rows,
    });
  } catch (err) {
    console.error("❌ Error in getSalesByUser:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------- TOP STAFF ----------------------
// ✅ GET /api/sales/top-staff?period=weekly|monthly|yearly
const getTopStaff = async (req, res) => {
  try {
    const { period = "weekly" } = req.query;
    const now = new Date();
    let start;

    // 🗓️ Determine time range
    if (period === "weekly") {
      start = new Date(now);
      start.setDate(now.getDate() - 7);
    } else if (period === "monthly") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "yearly") {
      start = new Date(now.getFullYear(), 0, 1);
    } else {
      return res.status(400).json({ message: "Invalid period" });
    }

    // 📊 Aggregate sales within date range
    const topStaff = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: now },
        },
      },
      {
        $group: {
          _id: "$soldBy",
          totalSales: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalSales: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          name: "$user.name",
          email: "$user.email",
          totalSales: 1,
          count: 1,
        },
      },
    ]);

    res.json({
      period,
      topStaff,
    });
  } catch (err) {
    console.error("❌ Error in getTopStaff:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getTopProducts = async (req, res) => {
  try {
    // Get all sales and populate product details
    const sales = await Sale.find()
      .populate("items.product", "name sku")
      .select("items");

    // Flatten all sale items into a single array
    const productMap = {};

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const productId = item.product?._id?.toString();
        if (!productId) return; // skip if no product

        if (!productMap[productId]) {
          productMap[productId] = {
            _id: item.product._id,
            name: item.product.name,
            sku: item.product.sku,
            totalSold: 0,
          };
        }
        productMap[productId].totalSold += item.quantity;
      });
    });

    // Convert map to array and sort by totalSold descending
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 4); // top 4

    res.json(topProducts);
  } catch (err) {
    console.error("❌ Error in getTopProducts:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// ✅ TOP 4 PRODUCTS SOLD BY A SPECIFIC STAFF
const getStaffTopProducts = async (req, res) => {
  try {
    const staffId = req.user._id; // Logged-in staff
    const sales = await Sale.find({ soldBy: staffId })
      .populate("items.product", "name sku")
      .select("items");

    const productMap = {};

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const productId = item.product?._id?.toString();
        if (!productId) return;
        if (!productMap[productId]) {
          productMap[productId] = {
            _id: productId,
            name: item.product.name,
            sku: item.product.sku,
            totalSold: 0,
          };
        }
        productMap[productId].totalSold += item.quantity;
      });
    });

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 4);

    res.json(topProducts);
  } catch (err) {
    console.error("❌ Error in getStaffTopProducts:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// ✅ RECENT SALES (LAST 5 TRANSACTIONS)
const getStaffRecentSales = async (req, res) => {
  try {
    const staffId = req.user._id;

    // Get latest 5 sales by this staff
    const recentSales = await Sale.find({ soldBy: staffId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("items.product", "name sku price");

    // Flatten sale items and structure the response
    const rows = recentSales
      .flatMap((sale) =>
        sale.items.map((item) => ({
          name: item.product?.name || "N/A",
          sku: item.product?.sku || "N/A",
          qty: item.quantity,
          price: item.priceAtSale,
          total: item.priceAtSale * item.quantity,
          date: sale.createdAt,
        }))
      )
      // Sort all items by date so the most recent are on top
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      // Limit to 5 total rows
      .slice(0, 5);

    res.json(rows);
  } catch (err) {
    console.error("❌ Error in getStaffRecentSales:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// ---------------------- STAFF SUMMARY ----------------------
// GET /api/sales/staff-summary
// Accessible by: staff (and optionally manager/admin)
const getStaffSummary = async (req, res) => {
  try {
    const staffId = req.user._id;

    // Fetch all sales made by this staff
    const sales = await Sale.find({ soldBy: staffId })
      .populate("items.product", "name sku price")
      .populate("soldBy", "name email");

    if (!sales.length) {
      return res.json({
        totalAmount: 0,
        totalQty: 0,
        transactions: 0,
      });
    }

    // Calculate totals
    let totalAmount = 0;
    let totalQty = 0;
    let transactions = sales.length;

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        totalAmount += item.priceAtSale * item.quantity;
        totalQty += item.quantity;
      });
    });

    res.json({
      totalAmount,
      totalQty,
      transactions,
    });
  } catch (err) {
    console.error("❌ Error in getStaffSummary:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ ADMIN REVENUE TREND (DAILY/WEEKLY)
const getAdminRevenueTrend = async (req, res) => {
  try {
    const { range = "7" } = req.query; // default last 7 days or 30
    const days = parseInt(range, 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch all sales within range
    const sales = await Sale.find({
      createdAt: { $gte: startDate },
    }).select("totalAmount createdAt");

    // Initialize date map
    const revenueByDate = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = d.toISOString().split("T")[0];
      revenueByDate[key] = 0;
    }

    // Group totals by date
    sales.forEach((sale) => {
      const dateKey = new Date(sale.createdAt).toISOString().split("T")[0];
      if (revenueByDate[dateKey] !== undefined) {
        revenueByDate[dateKey] += sale.totalAmount;
      }
    });

    // Convert to chart format
    const chartData = Object.keys(revenueByDate).map((date) => ({
      date,
      total: revenueByDate[date],
    }));

    res.json(chartData);
  } catch (err) {
    console.error("❌ Error in getAdminRevenueTrend:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};




// ---------------------- EXPORT CLEANLY ----------------------
module.exports = {
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
};
