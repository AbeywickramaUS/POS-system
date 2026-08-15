const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

// GET /api/settings — get shop settings
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne({ key: 'shop_info' });
    if (!settings) {
      // Create defaults if not found
      settings = await Settings.create({ key: 'shop_info' });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/settings — update shop settings
router.put('/', async (req, res) => {
  try {
    const { shopName, telephone, address, receiptFooter, printerName } = req.body;

    const settings = await Settings.findOneAndUpdate(
      { key: 'shop_info' },
      { shopName, telephone, address, receiptFooter, printerName },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(settings);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
