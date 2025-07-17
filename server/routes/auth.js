// server/routes/auth.js
const router               = require('express').Router();
const { body, validationResult } = require('express-validator');
const bcrypt               = require('bcrypt');
const jwt                  = require('jsonwebtoken');
const crypto               = require('crypto');
const twofactor            = require('node-2fa');
const User                 = require('../models/user');
const LoginHistory         = require('../models/loginHistory');
const rateLimit            = require('express-rate-limit');


const ACCESS_EXPIRES  = '15m';
const REFRESH_EXPIRES = '7d';


const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skip: () => process.env.RATE_LIMIT_ENABLED !== 'true',
  handler: (req, res) => {
    res
      .status(429)
      .json({ message: 'Too many login attempts, please try again later.' });
  }
});

// ── PUBLIC: FETCH 2FA URI ──────────────────────────────────────────────────────
router.post('/2fa-uri', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const issuer = 'SecureMERN';
  const label  = `${issuer}:${user.email}`;
  const uri    = `otpauth://totp/${encodeURIComponent(label)}` +
                   `?secret=${user.twoFASecret}` +
                   `&issuer=${encodeURIComponent(issuer)}`;

  res.json({ twoFAUri: uri });
});

// ── REGISTER ──────────────────────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Min 8 chars')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    if (await User.findOne({ email }))
      return res.status(400).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const { secret, uri } = twofactor.generateSecret({
      name: 'SecureMERN',
      account: email
    });

    const user = await User.create({
      email,
      password: hashed,
      twoFASecret: secret
    });

    res.json({
      message: 'Registered',
      twoFAUri: uri
    });
  }
);

// ── LOGIN (issues both tokens + records history) ───────────────────────────────
router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').exists().withMessage('Password required'),
    body('twoFactorCode').isLength({ min: 6, max: 6 }).withMessage('Invalid 2FA code')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { email, password, twoFactorCode } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: 'Invalid credentials' });

    const twoOk = twofactor.verifyToken(user.twoFASecret, twoFactorCode);
    if (!twoOk || twoOk.delta !== 0)
      return res.status(400).json({ message: 'Invalid 2FA code' });

    // generate tokens
    const accessToken  = jwt.sign({ id: user._id }, process.env.JWT_SECRET,  { expiresIn: ACCESS_EXPIRES });
    const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });

    // record login event
    await LoginHistory.create({
      user: user._id,
      ip: req.ip
    });

    // send refreshToken as HTTP-only cookie + return accessToken
    res
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
      .json({ accessToken });
  }
);


// ── REFRESH ACCESS TOKEN ───────────────────────────────────────────────────────
router.post('/refresh', (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.REFRESH_SECRET, (err, payload) => {
    if (err) return res.sendStatus(403);
    const newAccess = jwt.sign(
      { id: payload.id },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_EXPIRES }
    );
    res.json({ accessToken: newAccess });
  });
});

// ── LOGOUT (clear cookie) ──────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res
    .clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    })
    .sendStatus(204);
});

// ── PROTECT MIDDLEWARE ─────────────────────────────────────────────────────────
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) return res.sendStatus(403);
    req.userId = payload.id;
    next();
  });
};

// ── WHO AM I ───────────────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  const user = await User.findById(req.userId).select('-password -twoFASecret');
  if (!user) return res.sendStatus(404);
  res.json(user);
});

// ── LOGIN HISTORY ───────────────────────────────────────────────────────────────
router.get('/history', authenticate, async (req, res) => {
  const events = await LoginHistory
    .find({ user: req.userId })
    .sort({ time: -1 })
    .limit(10)
    .lean();
  res.json(events.map(e => ({ time: e.time, ip: e.ip })));
});

// ── GET CURRENT 2FA URI ─────────────────────────────────────────────────────────
router.get('/2fa', authenticate, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.sendStatus(404);

  const issuer = 'SecureMERN';
  const label  = `${issuer}:${user.email}`;
  const uri    = `otpauth://totp/${encodeURIComponent(label)}?secret=${user.twoFASecret}&issuer=${encodeURIComponent(issuer)}`;
  res.json({ twoFAUri: uri });
});

// ── REGENERATE 2FA SECRET & URI ────────────────────────────────────────────────
router.post('/2fa/regenerate', authenticate, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.sendStatus(404);

  const { secret, uri } = twofactor.generateSecret({
    name: 'SecureMERN',
    account: user.email
  });

  user.twoFASecret = secret;
  await user.save();

  res.json({ twoFAUri: uri });
});


module.exports = router;
