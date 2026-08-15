const Settings = require('./models/Settings');

const seedDatabase = async () => {
  try {
    // Seed shop settings if not exists
    const existingSettings = await Settings.findOne({ key: 'shop_info' });
    if (!existingSettings) {
      await Settings.create({
        key: 'shop_info',
        shopName: 'Abeywickrama Super Mart',
        telephone: '0412286918 / 0714888019 / 0701007418',
        address: 'Abeywickrama Super Mart, Kamburupitiya road, Kirinda, Puhulwella, Matara',
        receiptFooter: 'Thank you for shopping with us!',
        printerName: ''
      });
      console.log('✅ Default shop settings seeded');
    } else {
      console.log('ℹ️  Shop settings already exist, skipping seed');
    }
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
  }
};

module.exports = seedDatabase;
