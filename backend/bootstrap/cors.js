/**
 * Module: backend/bootstrap/cors.js
 * Purpose: Initializes shared backend startup behavior so server bootstrapping stays organized by concern.
 */
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

const DEFAULT_PROD_ORIGINS = [
  'https://auctionspace-psi.vercel.app',
];

const isProduction = (process.env.NODE_ENV || 'development') === 'production';

const normalizeOrigin = (value) => String(value || '').trim().replace(/\/+$/, '');

const parseAllowedOrigins = () => {
  const baseOrigins = [
    process.env.CLIENT_URL,
    process.env.CLIENT_APP_URL,
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN,
  ]
    .map(normalizeOrigin)
    .filter(Boolean);

  const fromList = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  return Array.from(
    new Set([
      ...DEFAULT_PROD_ORIGINS,
      ...baseOrigins,
      ...fromList,
      ...(isProduction ? [] : DEFAULT_DEV_ORIGINS),
    ])
  );
};

const resolveAllowedOrigins = () => {
  const configuredOrigins = parseAllowedOrigins();
  if (configuredOrigins.length > 0) return configuredOrigins;
  if (!isProduction) return DEFAULT_DEV_ORIGINS;
  return DEFAULT_PROD_ORIGINS;
};

const isLocalDevOrigin = (origin) =>
  !isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(String(origin || ''));

const isAllowedOrigin = (origin, allowedOrigins = []) => {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  return allowedOrigins.includes(normalized) || isLocalDevOrigin(normalized);
};

const buildCorsOptions = (allowedOrigins) => ({
  origin(origin, callback) {
    if (isAllowedOrigin(origin, allowedOrigins)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

module.exports = {
  DEFAULT_DEV_ORIGINS,
  DEFAULT_PROD_ORIGINS,
  isProduction,
  normalizeOrigin,
  parseAllowedOrigins,
  resolveAllowedOrigins,
  isAllowedOrigin,
  buildCorsOptions,
};
