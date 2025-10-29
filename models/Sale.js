const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Products', required: true },
  quantity: { type: Number, required: true, min: 1 },
  priceAtSale: { type: Number, required: true } // snapshot price
});

const saleSchema = new mongoose.Schema({
  items: [saleItemSchema],
  totalAmount: { type: Number, required: true },
  soldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sale', saleSchema);
