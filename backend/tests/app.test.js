'use strict';

const request = require('supertest');
const { app } = require('./helpers');

describe('app', () => {
  test('GET /health', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('unknown routes return a JSON 404', async () => {
    const res = await request(app).get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, code: 'NOT_FOUND' });
  });

  test('CORS allows only the configured client origin, with credentials', async () => {
    const allowed = await request(app).get('/health').set('Origin', 'http://localhost:3000');
    const foreign = await request(app).get('/health').set('Origin', 'https://evil.example');

    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    expect(foreign.headers['access-control-allow-origin']).not.toBe('https://evil.example');
  });

  test('malformed JSON does not crash the server', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect((await request(app).get('/health')).status).toBe(200);
  });
});
