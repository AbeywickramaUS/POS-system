const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: { type: String, required: true },
  barcode: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  lineTotal: { type: Number, required: true }
}, { _id: false });

const saleSchema = new mongoose.Schema({
  invoiceNo: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  items: [saleItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  orderDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  grandTotal: {
    type: Number,
    required: true,
    min: 0
  },
  cashReceived: {
    type: Number,
    required: true,
    min: 0
  },
  changeGiven: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Index for date-based queries (reporting)
saleSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Sale', saleSchema);
