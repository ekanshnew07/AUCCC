/**
 * Module: backend/sockets/createSocketServer.js
 * Purpose: Configures realtime socket behavior and related notification wiring.
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const User = require('../models/User');

const STATIC_ADMIN_DB_ID = '000000000000000000000999';

const createSocketServer = (server, allowedOrigins) => {
  const isProd = (process.env.NODE_ENV || 'development') === 'production';
  const io = new Server(server, {
    cors: {
      origin: isProd ? (allowedOrigins.length > 0 ? allowedOrigins : false) : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  io.use(async (socket, next) => {
    try {
      const rawAuthToken = socket.handshake?.auth?.token;
      const rawHeader = socket.handshake?.headers?.authorization;
      const headerToken =
        typeof rawHeader === 'string' && rawHeader.startsWith('Bearer ')
          ? rawHeader.slice(7).trim()
          : '';
      const token = rawAuthToken || headerToken;

      if (!token || !process.env.JWT_SECRET) return next();

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded?.id) return next();

      if (decoded.id === 'static_admin_id_999') {
        socket.data.userId = STATIC_ADMIN_DB_ID;
        socket.data.legacyUserId = 'static_admin_id_999';
        socket.data.role = 'admin';
        return next();
      }

      const user = await User.findById(decoded.id).select('role').lean();
      if (user) {
        socket.data.userId = String(decoded.id);
        socket.data.role = user.role || 'user';
      }
    } catch (_error) {
      // Guests may still connect even if auth fails.
    }

    return next();
  });

  io.on('connection', (socket) => {
    if (socket.data?.userId) {
      socket.join(`user:${socket.data.userId}`);
    }
    if (socket.data?.legacyUserId) {
      socket.join(`user:${socket.data.legacyUserId}`);
    }
    if (socket.data?.role === 'admin') {
      socket.join('role:admin');
    }

    socket.on('joinAuction', (auctionId) => {
      socket.join(auctionId);
    });

    socket.on('support:join', ({ name, role }) => {
      socket.join('support-room');
      io.to('support-room').emit('support:system', {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        message: `${name || 'Guest'} joined support chat`,
        role: role || 'user',
        createdAt: new Date().toISOString(),
      });
    });

    socket.on('support:message', ({ name, message, role }) => {
      if (!message) return;
      io.to('support-room').emit('support:message', {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: name || 'Guest',
        message,
        role: role || 'user',
        createdAt: new Date().toISOString(),
      });
    });
  });

  return io;
};

module.exports = {
  STATIC_ADMIN_DB_ID,
  createSocketServer,
};
