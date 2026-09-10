const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/daily_web';

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB connection failed', err);
    process.exit(1);
  }
}

module.exports = { connectDB, MONGO_URI };
