// tests/auth.limiter.test.js
jest.setTimeout(15_000);

const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
let app;

describe('🔒 Login Rate-Limiter', () => {
  let mongod, BASE = '/api/auth', GOOD_PW = 'Password123!';

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongod.getUri();
    await mongoose.connect(process.env.MONGO_URI);
    app = require('../index');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it('should return 429 after 5 consecutive bad logins', async () => {
    const email = 'rl@x.test';
    // register once
    await request(app).post(`${BASE}/register`).send({ email, password: GOOD_PW }).expect(200);

    // do 6 bad logins
    for (let i = 1; i <= 6; i++) {
      const res = await request(app)
        .post(`${BASE}/login`)
        .send({ email, password: GOOD_PW, twoFactorCode: '000000' });

      if (i < 6) {
        expect(res.status).toBe(400);
      } else {
        expect(res.status).toBe(429);
      }
    }
  });
});
