// server/utils/encryption.js
const { createCipheriv, createDecipheriv, randomBytes } = require('crypto');
const algorithm = 'aes-256-cbc';
// ENV variable must be a 64-hex-char string (32 bytes)
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

exports.encryptField = (text) => {
  const iv = randomBytes(16);
  const cipher = createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

exports.decryptField = (data) => {
  const [ivHex, enc] = data.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(enc, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};
