// server/index.js
require('dotenv').config();
const express       = require('express');
const helmet        = require('helmet');
const cors          = require('cors');
const rateLimit     = require('express-rate-limit');
const cookieParser  = require('cookie-parser');
const mongoose      = require('mongoose');
const authRouter    = require('./routes/auth');

const app = express();
app.use(express.json())
app.use(cookieParser())

// ─── Trust proxy (for rate-limit behind proxies) ───────────────────────────────
app.set('trust proxy', 1);

// ─── 1) Secure HTTP headers ─────────────────────────────────────────────────────
app.use(helmet());

// ─── 2) CORS – only allow our React app ──────────────────────────────────────────
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.options('*', cors());

// ─── 3) JSON body parser & cookie parser ────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());

// ─── 4) Rate limiting – 100 requests per 15 min ─────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests; try again later'
}));

// Health check (and for smoke tests)
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// health‐check at root so scanners (and you) get a 200
app.get('/', (req, res) => {
  res.json({ status: 'SecureMERN OK' });
});


// ─── 5) Mount the auth router ───────────────────────────────────────────────────
app.use('/api/auth', authRouter);

// app.use((err, req, res, next) => {
//   console.error(err);
//   res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
// });

// ─── 6) Connect to MongoDB & Start server (only when run directly) ─────────────
if (require.main === module) {
  mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB error:', err));

  const PORT = process.env.PORT || 5002;
  app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
}

// ─── 7) Export app for testing ───────────────────────────────────────────────────
module.exports = app;
