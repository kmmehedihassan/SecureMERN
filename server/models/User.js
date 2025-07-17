// server/models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type:      String,
    required:  true,
    unique:    true,
    trim:      true,
    lowercase: true
  },
  password: {
    type:     String,
    required: true
  },
  twoFASecret: {
    type:     String,
    required: true
  },
  isVerified:   { type: Boolean, default: false },
  verifyToken:  String,
  resetToken:   String,
  resetExpires: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
