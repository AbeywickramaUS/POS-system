const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');

// GET /api/reports/daily-summary — today's sales summary
router.get('/daily-summary', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await Sale.aggregate([
      { $match: { createdAt: { $gte: startOfDay, $lte: endOfDay } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grandTotal' },
          totalTransactions: { $sum: 1 },
          totalDiscount: { $sum: { $add: ['$orderDiscount', { $sum: '$items.discount' }] } },
          avgSaleValue: { $avg: '$grandTotal' },
          totalItemsSold: { $sum: { $sum: '$items.quantity' } }
        }
      }
    ]);

    const summary = result[0] || {
      totalRevenue: 0,
      totalTransactions: 0,
      totalDiscount: 0,
      avgSaleValue: 0,
      totalItemsSold: 0
    };

    // Low stock count
    const lowStockCount = await Product.countDocuments({
      $expr: { $lte: ['$stock', '$lowStockThreshold'] }
    });

    // Total products count
    const totalProducts = await Product.countDocuments();

    res.json({ ...summary, lowStockCount, totalProducts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/daily-chart — sales totals for last N days
router.get('/daily-chart', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);

    const result = await Sale.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          total: { $sum: '$grandTotal' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill in missing days with 0
    const chartData = [];
    const current = new Date(startDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    while (current <= today) {
      const dateStr = current.toISOString().slice(0, 10);
      const found = result.find(r => r._id === dateStr);
      chartData.push({
        date: dateStr,
        total: found ? found.total : 0,
        count: found ? found.count : 0
      });
      current.setDate(current.getDate() + 1);
    }

    res.json(chartData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/top-products — top selling products
router.get('/top-products', async (req, res) => {
  try {
    const { days = 30, limit = 10 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);

    const result = await Sale.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          totalQty: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.lineTotal' }
        }
      },
      { $sort: { totalQty: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/low-stock — products below threshold
router.get('/low-stock', async (req, res) => {
  try {
    const products = await Product.find({
      $expr: { $lte: ['$stock', '$lowStockThreshold'] }
    }).sort({ stock: 1 }).limit(50);

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
