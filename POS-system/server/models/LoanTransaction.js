const mongoose = require('mongoose');

const loanTransactionSchema = new mongoose.Schema({
  borrower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Borrower',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['credit_sale', 'payment', 'manual_loan', 'adjustment'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    default: null
  },
  invoiceNo: {
    type: String,
    default: ''
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer', 'cheque', 'other'],
    default: 'cash'
  },
  reference: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

loanTransactionSchema.index({ borrower: 1, date: -1 });

module.exports = mongoose.model('LoanTransaction', loanTransactionSchema);
