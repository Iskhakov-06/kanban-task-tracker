'use strict';

const request = require('supertest');
const bcrypt = require('bcryptjs');

const mailer = require('../src/config/mailer');
const { User, RefreshToken } = require('../src/models');
const {
  app, PASSWORD, resetDb, createUser, authHeader, getCookie, loginAs,
  tokenFromLastEmail, signAccessToken,
} = require('./helpers');

beforeEach(resetDb);

const validRegistration = {
  username: 'alice',
  email: 'alice@example.com',
  password: PASSWORD,
};

describe('POST /api/auth/register', () => {
  test('creates an unverified user and sends a verification email', async () => {
    const res = await request(app).post('/api/auth/register').send(validRegistration);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      id: expect.any(String),
      username: 'alice',
      email: 'alice@example.com',
    });

    const user = await User.scope('withPassword').findByPk(res.body.data.id);
    expect(user.is_verified).toBe(false);

    expect(mailer.sendMail).toHaveBeenCalledTimes(1);
    expect(mailer.sendMail.mock.calls[0][0].to).toBe('alice@example.com');
    expect(mailer.sendMail.mock.calls[0][0].html).toMatch(/verify-email\?token=[a-f0-9]{64}/);
  });

  test('stores a bcrypt hash, never the plain password', async () => {
    const res = await request(app).post('/api/auth/register').send(validRegistration);
    const user = await User.scope('withPassword').findByPk(res.body.data.id);

    expect(user.password_hash).not.toBe(PASSWORD);
    expect(user.password_hash).toMatch(/^\$2[aby]\$/);
    expect(await bcrypt.compare(PASSWORD, user.password_hash)).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain('password');
  });

  test('rejects an already registered email with 409', async () => {
    await createUser({ email: 'alice@example.com' });

    const res = await request(app).post('/api/auth/register').send(validRegistration);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_TAKEN');
  });

  test('rejects an already taken username with 409', async () => {
    await createUser({ username: 'alice' });

    const res = await request(app).post('/api/auth/register').send({
      ...validRegistration,
      email: 'other@example.com',
    });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('USERNAME_TAKEN');
  });

  test.each([
    ['too short', 'Ab1'],
    ['no uppercase letter', 'password123'],
    ['no digit', 'PasswordOnly'],
  ])('rejects a weak password (%s) with 422', async (_name, password) => {
    const res = await request(app).post('/api/auth/register').send({ ...validRegistration, password });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(await User.count()).toBe(0);
  });

  test.each([
    ['invalid email', { email: 'not-an-email' }],
    ['username with forbidden characters', { username: 'bad name!' }],
    ['username that is too short', { username: 'ab' }],
    ['missing fields', { username: '', email: '', password: '' }],
  ])('rejects %s with 422', async (_name, override) => {
    const res = await request(app).post('/api/auth/register').send({ ...validRegistration, ...override });

    expect(res.status).toBe(422);
    expect(await User.count()).toBe(0);
  });
});

describe('GET /api/auth/verify-email', () => {
  test('verifies the email using the token from the email', async () => {
    await request(app).post('/api/auth/register').send(validRegistration);
    const token = tokenFromLastEmail();

    const res = await request(app).get('/api/auth/verify-email').query({ token });

    expect(res.status).toBe(200);
    const user = await User.findOne({ where: { email: 'alice@example.com' } });
    expect(user.is_verified).toBe(true);
  });

  test('token is single-use', async () => {
    await request(app).post('/api/auth/register').send(validRegistration);
    const token = tokenFromLastEmail();

    await request(app).get('/api/auth/verify-email').query({ token });
    const second = await request(app).get('/api/auth/verify-email').query({ token });

    expect(second.status).toBe(400);
    expect(second.body.code).toBe('INVALID_TOKEN');
  });

  test('rejects an unknown token with 400', async () => {
    const res = await request(app).get('/api/auth/verify-email').query({ token: 'a'.repeat(64) });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  test('rejects a malformed token with 422', async () => {
    const res = await request(app).get('/api/auth/verify-email').query({ token: 'nope' });

    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  test('returns an access token and sets an httpOnly refresh cookie', async () => {
    const user = await createUser();

    const { res } = await loginAs(user);

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.user).toEqual({
      id: user.id, username: user.username, email: user.email, role: 'user',
    });

    const cookie = getCookie(res, 'refreshToken');
    expect(cookie).not.toBeNull();
    expect(cookie.raw).toMatch(/HttpOnly/i);
    expect(cookie.raw).toMatch(/SameSite=Strict/i);
    expect(await RefreshToken.count({ where: { user_id: user.id, token: cookie.value } })).toBe(1);
  });

  test('never leaks the password hash', async () => {
    const user = await createUser();

    const { res } = await loginAs(user);

    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  test('rejects a wrong password with 401', async () => {
    const user = await createUser();

    const { res } = await loginAs(user, 'WrongPassword1');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
    expect(getCookie(res, 'refreshToken')).toBeNull();
  });

  test('gives the same error for unknown email and wrong password (no user enumeration)', async () => {
    const user = await createUser();

    const wrongPassword = await loginAs(user, 'WrongPassword1');
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: PASSWORD });

    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body.message).toBe(wrongPassword.res.body.message);
    expect(unknownEmail.body.code).toBe(wrongPassword.res.body.code);
  });

  test('rejects an unverified account with 403', async () => {
    const user = await createUser({ is_verified: false });

    const { res } = await loginAs(user);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  test('rejects a missing password with 422', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@example.com' });

    expect(res.status).toBe(422);
  });
});

describe('GET /api/auth/me', () => {
  test('returns the current user without secrets', async () => {
    const user = await createUser();

    const res = await request(app).get('/api/auth/me').set(authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(user.id);
    expect(res.body.data.email).toBe(user.email);
    expect(res.body.data).not.toHaveProperty('password_hash');
    expect(res.body.data).not.toHaveProperty('verification_token');
    expect(res.body.data).not.toHaveProperty('reset_password_token');
  });

  test('requires a token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('NO_TOKEN');
  });

  test('rejects a malformed token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer garbage');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  test('rejects an expired token', async () => {
    const user = await createUser();
    const token = signAccessToken({ id: user.id, role: user.role }, undefined, { expiresIn: -10 });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
  });

  test('rejects a token signed with a different secret', async () => {
    const user = await createUser();
    const token = signAccessToken({ id: user.id, role: user.role }, 'some-other-secret-some-other-secret');

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  test('rejects a valid token of a user that no longer exists', async () => {
    const user = await createUser();
    const header = authHeader(user);
    await user.destroy();

    const res = await request(app).get('/api/auth/me').set(header);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('USER_NOT_FOUND');
  });

  test('ignores the role claim in the token: the role comes from the database', async () => {
    const user = await createUser({ role: 'user' });
    const forged = signAccessToken({ id: user.id, role: 'admin' });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);

    expect(res.body.data.role).toBe('user');
  });
});

describe('POST /api/auth/refresh', () => {
  const refresh = (token) => {
    const req = request(app).post('/api/auth/refresh');
    return token ? req.set('Cookie', `refreshToken=${token}`) : req;
  };

  test('requires the refresh cookie', async () => {
    const res = await refresh();

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('NO_REFRESH_TOKEN');
  });

  test('rotates the refresh token, even when called right after login', async () => {
    const user = await createUser();
    const { refreshToken: oldToken } = await loginAs(user);

    const res = await refresh(oldToken);

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));

    const newToken = getCookie(res, 'refreshToken').value;
    expect(newToken).not.toBe(oldToken);

    const oldRow = await RefreshToken.findOne({ where: { token: oldToken } });
    const newRow = await RefreshToken.findOne({ where: { token: newToken } });
    expect(oldRow.is_revoked).toBe(true);
    expect(newRow.is_revoked).toBe(false);
  });

  test('a rotated (already used) token cannot be reused', async () => {
    const user = await createUser();
    const { refreshToken } = await loginAs(user);

    await refresh(refreshToken);
    const reuse = await refresh(refreshToken);

    expect(reuse.status).toBe(401);
    expect(reuse.body.code).toBe('TOKEN_REVOKED');
  });

  test('two logins in the same second both get a working session', async () => {
    const user = await createUser();

    const first = await loginAs(user);
    const second = await loginAs(user);

    expect(first.res.status).toBe(200);
    expect(second.res.status).toBe(200);
    expect(await RefreshToken.count({ where: { user_id: user.id } })).toBe(2);
    expect((await refresh(first.refreshToken)).status).toBe(200);
    expect((await refresh(second.refreshToken)).status).toBe(200);
  });

  test('rejects a tampered token', async () => {
    const res = await refresh('not.a.jwt');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  test('rejects an access token used as a refresh token', async () => {
    const user = await createUser();
    const { accessToken } = await loginAs(user);

    const res = await refresh(accessToken);

    expect(res.status).toBe(401);
  });

  test('rejects an expired stored token and revokes it', async () => {
    const user = await createUser();
    const { refreshToken } = await loginAs(user);
    await RefreshToken.update({ expires_at: new Date(Date.now() - 1000) }, { where: { token: refreshToken } });

    const res = await refresh(refreshToken);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
    expect((await RefreshToken.findOne({ where: { token: refreshToken } })).is_revoked).toBe(true);
  });
});

describe('POST /api/auth/logout', () => {
  test('revokes the refresh token and clears the cookie', async () => {
    const user = await createUser();
    const { refreshToken } = await loginAs(user);

    const res = await request(app).post('/api/auth/logout').set('Cookie', `refreshToken=${refreshToken}`);

    expect(res.status).toBe(200);
    expect(getCookie(res, 'refreshToken').value).toBe('');
    expect((await RefreshToken.findOne({ where: { token: refreshToken } })).is_revoked).toBe(true);

    const afterLogout = await request(app).post('/api/auth/refresh').set('Cookie', `refreshToken=${refreshToken}`);
    expect(afterLogout.status).toBe(401);
  });

  test('is harmless without a cookie', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
  });
});

describe('password reset', () => {
  const NEW_PASSWORD = 'NewPassword456';

  const requestReset = async (user) => {
    await request(app).post('/api/auth/forgot-password').send({ email: user.email });
    return tokenFromLastEmail();
  };

  const reset = (token, password = NEW_PASSWORD, confirmPassword = password) =>
    request(app).post('/api/auth/reset-password').send({ token, password, confirmPassword });

  test('answers identically for known and unknown emails (no user enumeration)', async () => {
    const user = await createUser();

    const known = await request(app).post('/api/auth/forgot-password').send({ email: user.email });
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'ghost@example.com' });

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual(known.body);
    expect(mailer.sendMail).toHaveBeenCalledTimes(1); // письмо только существующему пользователю
  });

  test('changes the password with a valid token', async () => {
    const user = await createUser();
    const token = await requestReset(user);

    const res = await reset(token);

    expect(res.status).toBe(200);
    expect((await loginAs(user, NEW_PASSWORD)).res.status).toBe(200);
    expect((await loginAs(user, PASSWORD)).res.status).toBe(401);
  });

  test('revokes all existing sessions', async () => {
    const user = await createUser();
    const { refreshToken } = await loginAs(user);
    const token = await requestReset(user);

    await reset(token);

    const res = await request(app).post('/api/auth/refresh').set('Cookie', `refreshToken=${refreshToken}`);
    expect(res.status).toBe(401);
  });

  test('reset token is single-use', async () => {
    const user = await createUser();
    const token = await requestReset(user);

    await reset(token);
    const second = await reset(token, 'AnotherPassword789');

    expect(second.status).toBe(400);
    expect(second.body.code).toBe('INVALID_TOKEN');
  });

  test('rejects an expired token', async () => {
    const user = await createUser();
    const token = await requestReset(user);
    await User.update({ reset_password_expires: new Date(Date.now() - 1000) }, { where: { id: user.id } });

    const res = await reset(token);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
  });

  test('rejects mismatching password confirmation with 422', async () => {
    const user = await createUser();
    const token = await requestReset(user);

    const res = await reset(token, NEW_PASSWORD, 'Different123');

    expect(res.status).toBe(422);
  });

  test('applies the same strength rules to the new password', async () => {
    const user = await createUser();
    const token = await requestReset(user);

    const res = await reset(token, 'weak');

    expect(res.status).toBe(422);
  });
});
