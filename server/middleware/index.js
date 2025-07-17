// server/index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');               // HTTP headers :contentReference[oaicite:0]{index=0}
const cors = require('cors');                   // CORS control :contentReference[oaicite:1]{index=1}
const rateLimit = require('express-rate-limit'); // Rate limiting :contentReference[oaicite:2]{index=2}

const app = express();

// 1. Secure headers
app.use(helmet());

// 2. Restrict CORS to React dev domain
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://192.168.203.25:3000'
  ],
  credentials: true
}));

// 3. JSON body parser
app.use(express.json());

// 4. Global rate limiter (100 reqs per 15 min per IP)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.'
}));

// 5. Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// 6. Mounting auth routes
app.use('/api/auth', require('./routes/auth'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
