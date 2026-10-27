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

const isProduction = (process.env.NODE_ENV || 'development') === 'production';

const parseAllowedOrigins = () => {
  const baseOrigins = [process.env.CLIENT_URL, process.env.CORS_ORIGIN]
    .filter(Boolean)
    .map((origin) => origin.trim());

  const fromList = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set([...baseOrigins, ...fromList, ...(isProduction ? [] : DEFAULT_DEV_ORIGINS)]));
};

const resolveAllowedOrigins = () => {
  const configuredOrigins = parseAllowedOrigins();
  if (configuredOrigins.length > 0) return configuredOrigins;
  if (!isProduction) return DEFAULT_DEV_ORIGINS;
  return [];
};

const isLocalDevOrigin = (origin) =>
  !isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(String(origin || ''));

const buildCorsOptions = (allowedOrigins) => ({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || isLocalDevOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
});

module.exports = {
  DEFAULT_DEV_ORIGINS,
  isProduction,
  parseAllowedOrigins,
  resolveAllowedOrigins,
  buildCorsOptions,
};
