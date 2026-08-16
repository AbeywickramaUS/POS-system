const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');

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

// POST /api/sales/checkout — process a sale
router.post('/checkout', async (req, res) => {
  try {
    const { items, orderDiscount = 0, cashReceived } = req.body;

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

    if (cashReceived < grandTotal) {
      return res.status(400).json({ error: 'Insufficient cash received' });
    }

    const invoiceNo = await generateInvoiceNo();
    const sale = new Sale({
      invoiceNo,
      items: saleItems,
      subtotal,
      orderDiscount,
      grandTotal,
      cashReceived,
      changeGiven: cashReceived - grandTotal
    });

    await sale.save();

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

// GET /api/sales — list sales (with date filter)
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 50 } = req.query;
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
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json(sale);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/sales/:id — delete a sale/invoice
router.delete('/:id', async (req, res) => {
  try {
    const sale = await Sale.findByIdAndDelete(req.params.id);
    if (!sale) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json({ message: 'Invoice deleted successfully', invoiceNo: sale.invoiceNo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
