const express = require('express');
const router = express.Router();
const Borrower = require('../models/Borrower');
const LoanTransaction = require('../models/LoanTransaction');
const Sale = require('../models/Sale');

// GET /api/borrowers/stats — overall loan & credit statistics
router.get('/stats', async (req, res) => {
  try {
    const [statsResult] = await Borrower.aggregate([
      {
        $group: {
          _id: null,
          totalBorrowers: { $sum: 1 },
          totalOutstanding: { $sum: '$currentBalance' },
          totalCreditGiven: { $sum: '$totalCreditGiven' },
          totalRepayments: { $sum: '$totalPaid' },
          activeDebtors: {
            $sum: { $cond: [{ $gt: ['$currentBalance', 0] }, 1, 0] }
          }
        }
      }
    ]);

    const stats = statsResult || {
      totalBorrowers: 0,
      totalOutstanding: 0,
      totalCreditGiven: 0,
      totalRepayments: 0,
      activeDebtors: 0
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/borrowers — list borrowers with search, filter, pagination
router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      filter = 'all', // 'all', 'hasBalance', 'settled'
      status = 'all', // 'all', 'active', 'inactive'
      page = 1,
      limit = 50,
      sortBy = 'name', // 'name', 'balanceDesc', 'balanceAsc', 'recent'
    } = req.query;

    const query = {};

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { phone: regex },
        { nic: regex },
        { address: regex }
      ];
    }

    if (filter === 'hasBalance') {
      query.currentBalance = { $gt: 0 };
    } else if (filter === 'settled') {
      query.currentBalance = { $lte: 0 };
    }

    if (status !== 'all') {
      query.status = status;
    }

    // Sort order
    let sortOptions = { name: 1 };
    if (sortBy === 'balanceDesc') sortOptions = { currentBalance: -1, name: 1 };
    if (sortBy === 'balanceAsc') sortOptions = { currentBalance: 1, name: 1 };
    if (sortBy === 'recent') sortOptions = { updatedAt: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [borrowers, total] = await Promise.all([
      Borrower.find(query).sort(sortOptions).skip(skip).limit(parseInt(limit)),
      Borrower.countDocuments(query)
    ]);

    // Also get overall quick stats for the header
    const [overallStats] = await Borrower.aggregate([
      {
        $group: {
          _id: null,
          totalOutstanding: { $sum: '$currentBalance' },
          totalBorrowers: { $sum: 1 },
          activeDebtors: {
            $sum: { $cond: [{ $gt: ['$currentBalance', 0] }, 1, 0] }
          },
          totalRepayments: { $sum: '$totalPaid' }
        }
      }
    ]);

    res.json({
      borrowers,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      stats: overallStats || {
        totalOutstanding: 0,
        totalBorrowers: 0,
        activeDebtors: 0,
        totalRepayments: 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/borrowers — create new borrower profile
router.post('/', async (req, res) => {
  try {
    const {
      name,
      phone = '',
      nic = '',
      address = '',
      creditLimit = 0,
      initialBalance = 0,
      notes = ''
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Borrower name is required' });
    }

    const initBal = Math.max(0, parseFloat(initialBalance) || 0);

    const borrower = new Borrower({
      name: name.trim(),
      phone: phone.trim(),
      nic: nic.trim(),
      address: address.trim(),
      creditLimit: Math.max(0, parseFloat(creditLimit) || 0),
      currentBalance: initBal,
      totalCreditGiven: initBal,
      totalPaid: 0,
      notes: notes.trim(),
      status: 'active'
    });

    await borrower.save();

    // If an initial balance was entered, record an opening balance transaction
    if (initBal > 0) {
      const transaction = new LoanTransaction({
        borrower: borrower._id,
        type: 'manual_loan',
        amount: initBal,
        balanceBefore: 0,
        balanceAfter: initBal,
        notes: 'Initial opening credit balance'
      });
      await transaction.save();
    }

    res.status(201).json(borrower);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/borrowers/:id — get borrower profile with summary and recent transactions
router.get('/:id', async (req, res) => {
  try {
    const borrower = await Borrower.findById(req.params.id);
    if (!borrower) {
      return res.status(404).json({ error: 'Borrower not found' });
    }

    const transactions = await LoanTransaction.find({ borrower: borrower._id })
      .sort({ date: -1, createdAt: -1 })
      .limit(50);

    res.json({ borrower, transactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/borrowers/:id — update borrower profile
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, nic, address, creditLimit, status, notes } = req.body;

    const borrower = await Borrower.findById(req.params.id);
    if (!borrower) {
      return res.status(404).json({ error: 'Borrower not found' });
    }

    if (name !== undefined) borrower.name = name.trim();
    if (phone !== undefined) borrower.phone = phone.trim();
    if (nic !== undefined) borrower.nic = nic.trim();
    if (address !== undefined) borrower.address = address.trim();
    if (creditLimit !== undefined) borrower.creditLimit = Math.max(0, parseFloat(creditLimit) || 0);
    if (status !== undefined) borrower.status = status;
    if (notes !== undefined) borrower.notes = notes.trim();

    await borrower.save();
    res.json(borrower);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/borrowers/:id — delete borrower
router.delete('/:id', async (req, res) => {
  try {
    const borrower = await Borrower.findById(req.params.id);
    if (!borrower) {
      return res.status(404).json({ error: 'Borrower not found' });
    }

    if (borrower.currentBalance > 0 && !req.query.force) {
      return res.status(400).json({
        error: `Cannot delete borrower with an outstanding debt of Rs. ${borrower.currentBalance.toFixed(2)}. Please settle the debt first or choose force delete.`
      });
    }

    // Delete related loan transactions
    await LoanTransaction.deleteMany({ borrower: borrower._id });
    await Borrower.findByIdAndDelete(req.params.id);

    res.json({ message: 'Borrower profile deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/borrowers/:id/transactions — get paginated transaction history
router.get('/:id/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 50, type } = req.query;
    const query = { borrower: req.params.id };

    if (type && type !== 'all') {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total] = await Promise.all([
      LoanTransaction.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      LoanTransaction.countDocuments(query)
    ]);

    res.json({
      transactions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/borrowers/:id/payments — record repayment / settlement
router.post('/:id/payments', async (req, res) => {
  try {
    const { amount, paymentMethod = 'cash', reference = '', notes = '', date } = req.body;
    const payAmount = parseFloat(amount);

    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than 0' });
    }

    const borrower = await Borrower.findById(req.params.id);
    if (!borrower) {
      return res.status(404).json({ error: 'Borrower not found' });
    }

    const balanceBefore = borrower.currentBalance;
    const balanceAfter = Math.max(0, balanceBefore - payAmount);

    borrower.currentBalance = balanceAfter;
    borrower.totalPaid += payAmount;
    await borrower.save();

    const transaction = new LoanTransaction({
      borrower: borrower._id,
      type: 'payment',
      amount: payAmount,
      balanceBefore,
      balanceAfter,
      paymentMethod,
      reference: reference.trim(),
      notes: notes.trim() || `Payment received via ${paymentMethod}`,
      date: date ? new Date(date) : new Date()
    });

    await transaction.save();

    res.status(201).json({
      message: 'Payment recorded successfully',
      borrower,
      transaction
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/borrowers/:id/manual-loan — record a manual credit/loan
router.post('/:id/manual-loan', async (req, res) => {
  try {
    const { amount, notes = '', date } = req.body;
    const loanAmount = parseFloat(amount);

    if (isNaN(loanAmount) || loanAmount <= 0) {
      return res.status(400).json({ error: 'Loan amount must be greater than 0' });
    }

    const borrower = await Borrower.findById(req.params.id);
    if (!borrower) {
      return res.status(404).json({ error: 'Borrower not found' });
    }

    // Check credit limit if specified
    if (borrower.creditLimit > 0 && (borrower.currentBalance + loanAmount) > borrower.creditLimit) {
      const allowed = borrower.creditLimit - borrower.currentBalance;
      return res.status(400).json({
        error: `Credit limit exceeded! Limit: Rs. ${borrower.creditLimit.toFixed(2)}, Current Balance: Rs. ${borrower.currentBalance.toFixed(2)}. Max allowed credit: Rs. ${Math.max(0, allowed).toFixed(2)}`
      });
    }

    const balanceBefore = borrower.currentBalance;
    const balanceAfter = balanceBefore + loanAmount;

    borrower.currentBalance = balanceAfter;
    borrower.totalCreditGiven += loanAmount;
    await borrower.save();

    const transaction = new LoanTransaction({
      borrower: borrower._id,
      type: 'manual_loan',
      amount: loanAmount,
      balanceBefore,
      balanceAfter,
      notes: notes.trim() || 'Manual credit/loan entry',
      date: date ? new Date(date) : new Date()
    });

    await transaction.save();

    res.status(201).json({
      message: 'Loan / credit recorded successfully',
      borrower,
      transaction
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
