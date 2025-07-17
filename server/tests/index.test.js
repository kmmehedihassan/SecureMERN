// tests/index.test.js
const express = require('express');
jest.mock('mongoose');
const mongoose = require('mongoose');
mongoose.connect = jest.fn().mockResolvedValue();

const request = require('supertest');
const app = require('../index'); // your Express app

describe('Global middleware & index', () => {
  it('should respond 404 on unknown route', async () => {
    await request(app).get('/does-not-exist').expect(404);
  });
});
