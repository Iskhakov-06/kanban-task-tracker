'use strict';

const { resetDb, createUser, api } = require('./helpers');

beforeEach(resetDb);

describe('users', () => {
  test('search finds verified users by username, without secrets', async () => {
    const me = await createUser();
    await createUser({ username: 'bobby' });
    await createUser({ username: 'bobbie_unverified', is_verified: false });

    const res = await api('get', '/api/users?search=bob', me);

    expect(res.status).toBe(200);
    expect(res.body.data.map((u) => u.username)).toEqual(['bobby']);
    expect(JSON.stringify(res.body)).not.toMatch(/password|token/i);
  });

  test('search requires at least 2 characters', async () => {
    const me = await createUser();

    expect((await api('get', '/api/users?search=b', me)).status).toBe(422);
    expect((await api('get', '/api/users', me)).status).toBe(422);
  });

  test('GET /api/users/:id returns a profile without secrets, 404 if unknown', async () => {
    const me = await createUser();
    const other = await createUser({ username: 'other' });

    const found = await api('get', `/api/users/${other.id}`, me);
    expect(found.status).toBe(200);
    expect(found.body.data.username).toBe('other');
    expect(JSON.stringify(found.body)).not.toMatch(/password|token/i);

    const missing = await api('get', '/api/users/77777777-7777-4777-8777-777777777777', me);
    expect(missing.status).toBe(404);
  });
});
