const mongoose = require('mongoose');

const borrowerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  nic: {
    type: String,
    trim: true,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  creditLimit: {
    type: Number,
    default: 0,
    min: 0 // 0 means no credit limit / unrestricted
  },
  currentBalance: {
    type: Number,
    default: 0,
    min: 0 // Outstanding amount owed
  },
  totalCreditGiven: {
    type: Number,
    default: 0,
    min: 0 // Cumulative credit extended
  },
  totalPaid: {
    type: Number,
    default: 0,
    min: 0 // Cumulative repayments received
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked'],
    default: 'active'
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for quick lookups and search
borrowerSchema.index({ name: 'text', phone: 'text', nic: 'text' });
borrowerSchema.index({ currentBalance: -1 });

module.exports = mongoose.model('Borrower', borrowerSchema);
