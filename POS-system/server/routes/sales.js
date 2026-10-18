const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Borrower = require('../models/Borrower');
const LoanTransaction = require('../models/LoanTransaction');

// Helper: generate invoice number
const generateInvoiceNo = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `INV-${dateStr}-`;

  const lastSale = await Sale.findOne({ invoiceNo: { $regex: `^${prefix}` } })
    .sort({ invoiceNo: -1 });

  let seq = 1;
  if (lastSale) {
    const lastSeq = parseInt(lastSale.invoiceNo.split('-').pop());
    seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
};

// POST /api/sales/checkout — process a sale (cash or credit)
router.post('/checkout', async (req, res) => {
  try {
    const {
      items,
      orderDiscount = 0,
      cashReceived = 0,
      paymentType = 'cash', // 'cash' | 'credit'
      borrowerId = null
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Build sale items and validate stock
    const saleItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ error: `Product not found: ${item.name || item.productId}` });
      }

      const qty = parseFloat(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: `Invalid quantity for "${product.name}"` });
      }

      // Round stock and qty to 3 decimal places to avoid floating point issues
      const availableStock = Math.round(product.stock * 1000) / 1000;
      const requestedQty = Math.round(qty * 1000) / 1000;

      if (availableStock < requestedQty) {
        return res.status(400).json({
          error: `Insufficient stock for "${product.name}". Available: ${availableStock} ${product.unit}, Requested: ${requestedQty} ${product.unit}`
        });
      }

      const lineTotal = (product.sellingPrice * requestedQty) - (item.discount || 0);
      saleItems.push({
        product: product._id,
        name: product.name,
        barcode: product.barcode || '',
        quantity: requestedQty,
        unitPrice: product.sellingPrice,
        discount: item.discount || 0,
        lineTotal: Math.max(0, lineTotal)
      });
      subtotal += Math.max(0, lineTotal);
    }

    const grandTotal = Math.max(0, subtotal - orderDiscount);

    let borrower = null;
    let creditAmount = 0;
    let finalCashReceived = parseFloat(cashReceived) || 0;
    let changeGiven = 0;

    if (paymentType === 'credit') {
      if (!borrowerId) {
        return res.status(400).json({ error: 'Please select a borrower for credit customer checkout' });
      }

      borrower = await Borrower.findById(borrowerId);
      if (!borrower) {
        return res.status(404).json({ error: 'Selected borrower profile not found' });
      }

      if (borrower.status === 'blocked') {
        return res.status(400).json({ error: `Borrower "${borrower.name}" account is blocked from taking credit.` });
      }

      // If customer made an upfront partial payment
      if (finalCashReceived >= grandTotal) {
        // Fully paid with cash even though selected credit
        changeGiven = finalCashReceived - grandTotal;
        creditAmount = 0;
      } else {
        changeGiven = 0;
        creditAmount = Math.max(0, grandTotal - finalCashReceived);
      }

      // Check credit limit if specified
      if (borrower.creditLimit > 0 && (borrower.currentBalance + creditAmount) > borrower.creditLimit) {
        const availableCredit = Math.max(0, borrower.creditLimit - borrower.currentBalance);
        return res.status(400).json({
          error: `Credit limit exceeded for "${borrower.name}". Limit: Rs. ${borrower.creditLimit.toFixed(2)}, Current Debt: Rs. ${borrower.currentBalance.toFixed(2)}. Available credit: Rs. ${availableCredit.toFixed(2)}.`
        });
      }
    } else {
      // Cash payment
      if (finalCashReceived < grandTotal) {
        return res.status(400).json({ error: 'Insufficient cash received' });
      }
      changeGiven = finalCashReceived - grandTotal;
      creditAmount = 0;
    }

    const invoiceNo = await generateInvoiceNo();
    const sale = new Sale({
      invoiceNo,
      items: saleItems,
      subtotal,
      orderDiscount,
      grandTotal,
      paymentType,
      borrower: borrower ? borrower._id : null,
      borrowerName: borrower ? borrower.name : '',
      borrowerPhone: borrower ? (borrower.phone || '') : '',
      creditAmount,
      cashReceived: finalCashReceived,
      changeGiven
    });

    await sale.save();

    // If credit customer and there's a credit balance or debt update
    if (paymentType === 'credit' && borrower) {
      const balanceBefore = borrower.currentBalance;
      const balanceAfter = balanceBefore + creditAmount;

      borrower.currentBalance = balanceAfter;
      borrower.totalCreditGiven += grandTotal;
      borrower.totalPaid += Math.min(grandTotal, finalCashReceived);
      await borrower.save();

      // Record transaction ledger entry
      if (creditAmount > 0) {
        const loanTx = new LoanTransaction({
          borrower: borrower._id,
          type: 'credit_sale',
          amount: creditAmount,
          balanceBefore,
          balanceAfter,
          sale: sale._id,
          invoiceNo,
          notes: finalCashReceived > 0
            ? `Credit sale (Invoice #${invoiceNo}) - Total Rs. ${grandTotal.toFixed(2)}, Paid Rs. ${finalCashReceived.toFixed(2)} upfront`
            : `Credit sale (Invoice #${invoiceNo}) - Full bill charged to account`
        });
        await loanTx.save();
      }
    }

    // Deduct stock using $inc (MongoDB handles decimals natively)
    for (const item of saleItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }

    res.status(201).json(sale);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sales — list sales (with date & paymentType filter)
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, paymentType, borrowerId, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (paymentType && paymentType !== 'all') {
      filter.paymentType = paymentType;
    }

    if (borrowerId) {
      filter.borrower = borrowerId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [sales, total] = await Promise.all([
      Sale.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Sale.countDocuments(filter)
    ]);

    res.json({
      sales,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sales/:id — single sale detail
router.get('/:id', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('borrower', 'name phone nic address');
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json(sale);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/sales/:id — delete a sale/invoice and reverse any credit
router.delete('/:id', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // If it was a credit sale with a borrower, reverse the borrower's balance & stats
    if (sale.paymentType === 'credit' && sale.borrower) {
      const borrower = await Borrower.findById(sale.borrower);
      if (borrower) {
        const balanceBefore = borrower.currentBalance;
        const newBalance = Math.max(0, balanceBefore - (sale.creditAmount || 0));
        borrower.currentBalance = newBalance;
        borrower.totalCreditGiven = Math.max(0, borrower.totalCreditGiven - sale.grandTotal);
        borrower.totalPaid = Math.max(0, borrower.totalPaid - (sale.cashReceived || 0));
        await borrower.save();

        // Record reversal transaction
        if (sale.creditAmount > 0) {
          const revertTx = new LoanTransaction({
            borrower: borrower._id,
            type: 'adjustment',
            amount: sale.creditAmount,
            balanceBefore,
            balanceAfter: newBalance,
            notes: `Invoice #${sale.invoiceNo} deleted — credit debt reversed`
          });
          await revertTx.save();
        }
      }
      // Remove original transaction linked to this sale
      await LoanTransaction.deleteMany({ sale: sale._id });
    }

    await Sale.findByIdAndDelete(req.params.id);
    res.json({ message: 'Invoice deleted successfully', invoiceNo: sale.invoiceNo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

