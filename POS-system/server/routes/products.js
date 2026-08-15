const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// GET /api/products — list all products (with optional search)
router.get('/', async (req, res) => {
  try {
    const { search, category, lowStock, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$stock', '$lowStockThreshold'] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(parseInt(limit)),
      Product.countDocuments(filter)
    ]);

    res.json({
      products,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/products/categories — distinct categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json(categories.filter(Boolean).sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/products/barcode/:barcode — lookup by barcode
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const product = await Product.findOne({ barcode: req.params.barcode });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/products/:id — get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/products — create product
router.post('/', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A product with this barcode already exists' });
    }
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/products/:id — update product
router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A product with this barcode already exists' });
    }
    res.status(400).json({ error: error.message });
  }
});

// PATCH /api/products/:id/stock — adjust stock
router.patch('/:id/stock', async (req, res) => {
  try {
    const { adjustment } = req.body; // positive = add, negative = deduct
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    product.stock = Math.max(0, product.stock + adjustment);
    await product.save();
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/products/:id — delete product
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
