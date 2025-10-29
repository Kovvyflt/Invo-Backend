const Product = require("../models/Products");


exports.getLowStock = async (req, res) => {
  try {
    const lowStock = await Product.find({ quantity: { $lt: 10 } })
      .sort({ quantity: 1 }) // Sort ascending (lowest quantity first)
      .limit(4);             // Limit results to top 5
    res.json(lowStock);
  } catch (err) {
    console.error("❌ Error in getLowStock:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};



// GET /api/products?search=laptop&page=1&limit=10
exports.getProductsPaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const query = search
      ? { name: { $regex: search, $options: "i" } } // case-insensitive search
      : {};

    const [products, total] = await Promise.all([
      Product.find(query).skip(skip).limit(limit),
      Product.countDocuments(query)
    ]);

    res.status(200).json({
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error("Error in getProductsPaginated:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


