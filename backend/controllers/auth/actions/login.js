/**
 * Module: backend/controllers/auth/actions/login.js
 * Purpose: Implements one focused controller action so endpoint behavior stays separated by responsibility.
 */
const User = require('../../../models/User');
const { validateTurnstileToken } = require('../../../utils/turnstile');
const { generateToken, serializeUser } = require('../authHelpers');

const login = async (req, res) => {
  const { email, password, turnstileToken } = req.body;

  try {
    const remoteip =
      req.headers['cf-connecting-ip'] ||
      String(req.headers['x-forwarded-for'] || '')
        .split(',')
        .map((item) => item.trim())
        .find(Boolean) ||
      req.ip;

    const turnstileValidation = await validateTurnstileToken({
      token: turnstileToken || req.body['cf-turnstile-response'],
      remoteip,
    });

    if (!turnstileValidation.success) {
      return res
        .status(turnstileValidation.status)
        .json({ message: turnstileValidation.message, errorCodes: turnstileValidation.errorCodes });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPass = process.env.ADMIN_PASS || process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPass && email === adminEmail && password === adminPass) {
      return res.json({
        _id: 'static_admin_id_999',
        name: 'Super Admin',
        email: adminEmail,
        role: 'admin',
        emailVerified: true,
        avatarEmoji: '\u{1F6E1}\u{FE0F}',
        createdAt: new Date(),
        token: generateToken('static_admin_id_999'),
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (user?.isBanned) {
      return res.status(403).json({ message: 'Your account has been suspended. Contact support.' });
    }

    if (user && (await user.matchPassword(password))) {
      return res.json(serializeUser(user));
    }

    return res.status(401).json({ message: 'Invalid email or password' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = login;
