const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    unique: true,
    required: true,
    default: 'shop_info'
  },
  shopName: {
    type: String,
    default: 'Abeywickrama Super Mart'
  },
  telephone: {
    type: String,
    default: '0412286918 / 0714888019 / 0701007418'
  },
  address: {
    type: String,
    default: 'Abeywickrama Super Mart, Kamburupitiya road, Kirinda, Puhulwella, Matara'
  },
  receiptFooter: {
    type: String,
    default: 'Thank you for shopping with us!'
  },
  printerName: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);
