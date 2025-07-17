// tests/auth.validation.test.js
jest.setTimeout(30_000);

const request = require('supertest');
const twofactor = require('node-2fa');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let app;
const BASE     = '/api/auth';
const GOOD_PW  = 'Password123!';

describe('🔒 Functional Endpoint Validation', () => {
  let mongod;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongod.getUri();
    // only connect once
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true, useUnifiedTopology: true
    });
    app = require('../index');  // grab your app after mongoose is wired up
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    // clear any data between tests
    await mongoose.connection.db.dropDatabase();
  });

  it('POST /register → 200 valid, 400 missing/short', async () => {
    await request(app)
      .post(`${BASE}/register`)
      .send({ email: 'ok@x.test', password: GOOD_PW })
      .expect(200);

    await request(app)
      .post(`${BASE}/register`)
      .send({ password: GOOD_PW })
      .expect(400);

    await request(app)
      .post(`${BASE}/register`)
      .send({ email: 'ok2@x.test', password: 'short' })
      .expect(400);
  });

  it('POST /login → 200 valid creds, 400 bad creds', async () => {
    const email = 'user@x.test';
    await request(app).post(`${BASE}/register`).send({ email, password: GOOD_PW }).expect(200);

    const User   = mongoose.model('User');
    const u      = await User.findOne({ email });
    const totp   = twofactor.generateToken(u.twoFASecret).token;

    // successful
    await request(app)
      .post(`${BASE}/login`)
      .send({ email, password: GOOD_PW, twoFactorCode: totp })
      .expect(200);

    // bad password
    await request(app)
      .post(`${BASE}/login`)
      .send({ email, password: 'nope', twoFactorCode: totp })
      .expect(400);

    // malformed TOTP
    await request(app)
      .post(`${BASE}/login`)
      .send({ email, password: GOOD_PW, twoFactorCode: '123' })
      .expect(400);
  });

  it('POST /refresh → 200 with cookie, 401 without', async () => {
    const email = 'r2@x.test';
    await request(app).post(`${BASE}/register`).send({ email, password: GOOD_PW }).expect(200);

    const User = mongoose.model('User');
    const u    = await User.findOne({ email });
    const totp = twofactor.generateToken(u.twoFASecret).token;

    const loginRes = await request(app)
      .post(`${BASE}/login`)
      .send({ email, password: GOOD_PW, twoFactorCode: totp })
      .expect(200);

    const cookie = loginRes.headers['set-cookie'].find(c => c.startsWith('refreshToken='));

    await request(app)
      .post(`${BASE}/refresh`)
      .set('Cookie', cookie)
      .expect(200);

    await request(app)
      .post(`${BASE}/refresh`)
      .expect(401);
  });

  it('POST /logout → 204 always (idempotent)', async () => {
    // without cookie → still 204
    await request(app).post(`${BASE}/logout`).expect(204);
  });

  it('GET /me & /history → 200 with Bearer, 401 without', async () => {
    const email = 'm2@x.test';
    await request(app).post(`${BASE}/register`).send({ email, password: GOOD_PW }).expect(200);

    const User = mongoose.model('User');
    const u    = await User.findOne({ email });
    const totp = twofactor.generateToken(u.twoFASecret).token;

    const loginRes = await request(app)
      .post(`${BASE}/login`)
      .send({ email, password: GOOD_PW, twoFactorCode: totp })
      .expect(200);

    const token = loginRes.body.accessToken;

    await request(app)
      .get(`${BASE}/me`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app).get(`${BASE}/me`).expect(401);

    await request(app)
      .get(`${BASE}/history`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app).get(`${BASE}/history`).expect(401);
  });

  it('POST /2fa-uri & /2fa/regenerate → 200 & 400/401', async () => {
    const email = 'f2@x.test';
    await request(app).post(`${BASE}/register`).send({ email, password: GOOD_PW }).expect(200);

    await request(app).post(`${BASE}/2fa-uri`).send({ email }).expect(200);
    await request(app).post(`${BASE}/2fa-uri`).send({}).expect(400);

    const User = mongoose.model('User');
    const u    = await User.findOne({ email });
    const totp = twofactor.generateToken(u.twoFASecret).token;

    const loginRes = await request(app)
      .post(`${BASE}/login`)
      .send({ email, password: GOOD_PW, twoFactorCode: totp })
      .expect(200);

    const token = loginRes.body.accessToken;
    await request(app).post(`${BASE}/2fa/regenerate`).set('Authorization', `Bearer ${token}`).expect(200);
    await request(app).post(`${BASE}/2fa/regenerate`).expect(401);
  });
});
