// server/tests/auth.test.js
const request = require('supertest');
const app     = require('../index');          // export your Express app from index.js
const { setupDB, teardownDB } = require('./setup');

let refreshCookie;
let accessToken;

beforeAll(async () => {
  await setupDB();
});

afterAll(async () => {
  await teardownDB();
});

describe('SecureMERN Auth Flow', () => {
  it('POST /api/auth/register → 200 + twoFAUri', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email:'test@secure.com', password:'password123' })
      .expect(200);
    expect(res.body).toHaveProperty('message','Registered');
    expect(res.body).toHaveProperty('twoFAUri');
  });

  it('POST /api/auth/login → 200 + Set-Cookie + accessToken', async () => {
    // fetch a valid 2FA code directly from DB
    const User = require('../models/user');
    const user = await User.findOne();
    const twofactor = require('node-2fa');
    const token = twofactor.generateToken(user.twoFASecret).token;

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@secure.com',
        password: 'password123',
        twoFactorCode: token
      })
      .expect(200);

    // extract cookie and accessToken
    const cookies = res.headers['set-cookie'];
    expect(cookies.some(c => c.startsWith('refreshToken='))).toBe(true);
    expect(res.body).toHaveProperty('accessToken');
    refreshCookie = cookies.find(c => c.startsWith('refreshToken='));
    accessToken   = res.body.accessToken;
  });

  it('GET /api/auth/me → 200 + user object', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', refreshCookie)
      .expect(200);
    expect(res.body).toHaveProperty('email','test@secure.com');
  });

  it('POST /api/auth/refresh → 200 + new accessToken', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);
    expect(res.body).toHaveProperty('accessToken');
    accessToken = res.body.accessToken; // update token
  });

  it('POST /api/auth/logout → 204 + clears cookie', async () => {
    await request(app)
      .post('/api/auth/logout')
      .set('Cookie', refreshCookie)
      .expect(204);
    // subsequent refresh should 401
    await request(app)
      .post('/api/auth/refresh')
      .expect(401);
  });
});
