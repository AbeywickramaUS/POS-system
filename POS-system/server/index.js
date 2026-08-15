const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const seedDatabase = require('./seed');

// Route imports
const productsRouter = require('./routes/products');
const salesRouter = require('./routes/sales');
const settingsRouter = require('./routes/settings');
const reportsRouter = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/reports', reportsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const startServer = async () => {
  await connectDB();
  await seedDatabase();

  app.listen(PORT, () => {
    console.log(`🚀 POS API Server running on http://localhost:${PORT}`);
  });
};

// If run directly (not imported by Electron main)
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
