/**
 * Module: backend/config/db.js
 * Purpose: Connects to MongoDB Atlas in production, or local MongoDB with embedded MongoMemoryServer fallback in development.
 */
const mongoose = require('mongoose');
const { seedDemoData } = require('./seedDemoData');

let memoryServer = null;

const connectDB = async () => {
  const isProduction = (process.env.NODE_ENV || 'development') === 'production';
  const configuredUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    (isProduction ? '' : 'mongodb://127.0.0.1:27017/auctionpulse');

  if (isProduction && !configuredUri) {
    console.error('Database initialization error: MONGO_URI is required in production.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(configuredUri, {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 20),
      serverSelectionTimeoutMS: Number(
        process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || (isProduction ? 15000 : 2500)
      ),
      socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
      autoIndex: !isProduction,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    if (process.env.SEED_DEMO_DATA !== 'false') {
      await seedDemoData();
    }
    return conn;
  } catch (primaryError) {
    if (isProduction) {
      console.error(`Production MongoDB connection failed: ${primaryError.message}`);
      process.exit(1);
    }

    console.log(`Local MongoDB at ${configuredUri} not reachable (${primaryError.message}).`);
    console.log('Starting embedded Free MongoMemoryServer (development only)...');
  }

  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create({
      binary: {
        version: '4.4.18',
      },
    });
    const memoryUri = memoryServer.getUri();

    const conn = await mongoose.connect(memoryUri, {
      maxPoolSize: 10,
      autoIndex: true,
    });

    console.log(`Embedded MongoMemoryServer Connected: ${conn.connection.host}`);
    if (process.env.SEED_DEMO_DATA !== 'false') {
      await seedDemoData();
    }
    return conn;
  } catch (error) {
    console.error(`Database initialization error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
