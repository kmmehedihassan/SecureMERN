// server/tests/auth.extra.test.js
const request   = require('supertest');
const app       = require('../index');            // your Express app
const { setupDB, teardownDB } = require('./setup');
const User      = require('../models/user');
const twofactor = require('node-2fa');

beforeAll(async () => {
  await setupDB();
});

afterAll(async () => {
  await teardownDB();
});

describe('SecureMERN Auth – error paths, 2FA & history', () => {
  let refreshCookie;
  let accessToken;

  it('POST /api/auth/register → 400 on invalid email/password', async () => {
    // invalid email
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);

    // valid email but short password
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'foo@bar.com', password: '123' })
      .expect(400);
  });

  it('POST /api/auth/register → 200 + twoFAUri', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'user@secure.com', password: 'password123' })
      .expect(200);

    expect(res.body).toHaveProperty('message', 'Registered');
    expect(res.body).toHaveProperty('twoFAUri');
  });

  it('POST /api/auth/login → 400 on invalid 2FA code', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@secure.com',
        password: 'password123',
        twoFactorCode: '000000'
      })
      .expect(400);
  });

  it('POST /api/auth/login → 200 + Set-Cookie + accessToken', async () => {
    const user = await User.findOne({ email: 'user@secure.com' });
    const validCode = twofactor.generateToken(user.twoFASecret).token;

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@secure.com',
        password: 'password123',
        twoFactorCode: validCode
      })
      .expect(200);

    // extract cookie & token
    const cookies = res.headers['set-cookie'];
    expect(cookies.some(c => c.startsWith('refreshToken='))).toBe(true);
    expect(res.body).toHaveProperty('accessToken');

    refreshCookie = cookies.find(c => c.startsWith('refreshToken='));
    accessToken   = res.body.accessToken;
  });

  it('GET /api/auth/me without token → 401', async () => {
    await request(app)
      .get('/api/auth/me')
      .expect(401);
  });

  it('GET /api/auth/me → 200 + user object', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('email', 'user@secure.com');
  });

  it('POST /api/auth/refresh without cookie → 401', async () => {
    await request(app)
      .post('/api/auth/refresh')
      .expect(401);
  });

  it('POST /api/auth/refresh → 200 + new accessToken', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    accessToken = res.body.accessToken;
  });

  it('GET /api/auth/history → 200 + array of events', async () => {
    const res = await request(app)
      .get('/api/auth/history')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('ip');
    expect(res.body[0]).toHaveProperty('time');
  });

  it('GET /api/auth/2fa & POST /api/auth/2fa/regenerate', async () => {
    // fetch current URI
    const getRes = await request(app)
      .get('/api/auth/2fa')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(getRes.body).toHaveProperty('twoFAUri');
    const firstUri = getRes.body.twoFAUri;

    // regenerate
    const regenRes = await request(app)
      .post('/api/auth/2fa/regenerate')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(regenRes.body).toHaveProperty('twoFAUri');
    expect(regenRes.body.twoFAUri).not.toBe(firstUri);
  });

  it('Rate‐limit login: after 5 failures → 429', async () => {
    // register fresh user
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'limit@secure.com', password: 'password123' })
      .expect(200);

    // 5 bad attempts
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'limit@secure.com',
          password: 'wrongpass',
          twoFactorCode: '000000'
        });
    }
    // 6th → 429
    await request(app)
      .post('/api/auth/login')
      .send({
        email: 'limit@secure.com',
        password: 'wrongpass',
        twoFactorCode: '000000'
      })
      .expect(429);
  });

  it('POST /api/auth/logout → 204 + clears cookie', async () => {
    await request(app)
      .post('/api/auth/logout')
      .set('Cookie', refreshCookie)
      .expect(204);

    // refresh now fails
    await request(app)
      .post('/api/auth/refresh')
      .expect(401);
  });
});
