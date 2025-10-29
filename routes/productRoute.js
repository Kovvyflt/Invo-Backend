const express = require("express");
const router = express.Router();
const Product = require("../models/Products");
const productController = require("../controllers/productController");
const { protect, authorizeRoles } = require("../middleware/auth");


// Add new product
router.post("/", async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.status(201).json(product);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.get(
  "/",
  protect,
  authorizeRoles("admin", "manager","staff"),
  productController.getProductsPaginated
);

// Get all products
router.get("/", async (req, res) => {
    const products = await Product.find();
    res.json(products);
});
// ✅ Low stock products (admin/manager only)
router.get(
  "/low-stock",
  protect,
  authorizeRoles("admin", "manager","staff"),
  productController.getLowStock
);


// Update product by ID (admin only)
router.put(
  "/:id",
  protect,                 // must be logged in
  authorizeRoles("admin"), // only admin can update
  async (req, res) => {
    try {
      const { id } = req.params;
      const { quantity, price, name, sku } = req.body;

      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (quantity !== undefined) product.quantity = quantity;
      if (price !== undefined) product.price = price;
      if (name !== undefined) product.name = name;
      if (sku !== undefined) product.sku = sku;

      await product.save();
      res.json({ message: "✅ Product updated successfully", product });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

  
  // ✅ (Optional) Get single product by ID
  router.get("/:id", async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ message: "Product not found" });
      res.json(product);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

// Delete product by ID (admin only)
router.delete(
  "/:id",
  protect,                 // must be logged in
  authorizeRoles("admin"), // only admin role
  async (req, res) => {
    try {
      const { id } = req.params;

      const product = await Product.findByIdAndDelete(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json({ message: "🗑️ Product deleted successfully", product });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);



module.exports = router;
