/**
 * Module: backend/server.js
 * Purpose: Bootstraps the backend application, wires middleware and routes, and starts the API server.
 */
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const helmet = require('helmet');
const http = require('http');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const { verifyEmailTransport, getLocalMailbox } = require('./utils/emailService');
const { resolveAllowedOrigins, buildCorsOptions, isProduction } = require('./bootstrap/cors');
const { registerApiRoutes } = require('./routes/registerApiRoutes');
const { createSocketServer } = require('./sockets/createSocketServer');
const { registerStripeWebhookRoute } = require('./bootstrap/stripeWebhook');
const { registerBackgroundJobs } = require('./jobs/registerBackgroundJobs');

const allowedOrigins = resolveAllowedOrigins();
if (allowedOrigins.length === 0 && isProduction) {
  console.warn('CORS warning: no allowed origins configured. Browser cross-origin requests will be rejected.');
}

const app = express();
app.set('trust proxy', 1);

const server = http.createServer(app);
const io = createSocketServer(server, allowedOrigins);

app.set('io', io);

registerStripeWebhookRoute(app, io);

app.use(cors(buildCorsOptions(allowedOrigins)));
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(compression());
app.use(express.json({ limit: '2mb' }));

// Serve locally uploaded images (free replacement for Cloudinary)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Local dev mailbox endpoint to inspect transactional emails without paid SMTP keys
app.get('/api/dev/mailbox', (_req, res) => {
  res.json({ count: getLocalMailbox().length, emails: getLocalMailbox() });
});

registerApiRoutes(app);

app.get('/', (_req, res) => {
  res.send('PulseVault (AuctionPulse Free Edition) API is running...');
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/ready', (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  if (!dbReady) {
    return res.status(503).json({
      status: 'degraded',
      dependencies: { db: 'down' },
    });
  }

  return res.status(200).json({
    status: 'ready',
    dependencies: { db: 'up' },
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled server error:', err.message);
  const statusCode = err.statusCode || res.statusCode || 500;
  if (res.headersSent) return;
  res.status(statusCode >= 400 ? statusCode : 500).json({
    message: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  verifyEmailTransport();
  registerBackgroundJobs(io);

  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer();

const shutdown = async (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    try {
      await mongoose.connection.close(false);
      console.log('Graceful shutdown completed.');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error.message);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
