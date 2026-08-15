const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true
  },
  category: {
    type: String,
    trim: true,
    default: 'General'
  },
  costPrice: {
    type: Number,
    required: [true, 'Cost price is required'],
    min: 0
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: 0
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 10,
    min: 0
  },
  unit: {
    type: String,
    default: 'pcs',
    enum: ['pcs', 'kg', 'g', 'litre', 'ml', 'pack', 'box', 'dozen']
  }
}, {
  timestamps: true
});

// Text index for search
productSchema.index({ name: 'text', category: 'text' });

module.exports = mongoose.model('Product', productSchema);
