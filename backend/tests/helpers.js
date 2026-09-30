'use strict';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const sequelize = require('../src/config/database');
const mailer = require('../src/config/mailer');
const { User, BoardMember, Column } = require('../src/models');
const { generateTokens } = require('../src/utils/jwt');

const PASSWORD = 'Password123';

// Дочерние таблицы раньше родительских (внешние ключи)
const TABLES = [
  'action_logs', 'comments', 'tasks', 'columns',
  'board_members', 'boards', 'refresh_tokens', 'users',
];

const resetDb = async () => {
  for (const table of TABLES) {
    await sequelize.query(`DELETE FROM \`${table}\``);
  }
  mailer.sendMail.mockClear();
};

let counter = 0;

/** Создаёт пользователя напрямую в БД (по умолчанию — подтверждённого). */
const createUser = async (overrides = {}) => {
  counter += 1;
  const password = overrides.password || PASSWORD;
  const user = await User.create({
    username: overrides.username || `user${counter}`,
    email: overrides.email || `user${counter}@example.com`,
    password_hash: await bcrypt.hash(password, 4),
    role: overrides.role || 'user',
    is_verified: overrides.is_verified ?? true,
    verification_token: overrides.verification_token ?? null,
  });
  user.plainPassword = password;
  return user;
};

/** Заголовок Authorization с валидным access-токеном пользователя. */
const authHeader = (user) => ({
  Authorization: `Bearer ${generateTokens(user.id, user.role).accessToken}`,
});

/** Короткая обёртка над supertest: api('get', '/api/boards', user) */
const api = (method, url, user) => {
  const req = request(app)[method](url);
  return user ? req.set(authHeader(user)) : req;
};

/** Достаёт значение cookie из Set-Cookie ответа. */
const getCookie = (res, name) => {
  const raw = (res.headers['set-cookie'] || []).find((c) => c.startsWith(`${name}=`));
  return raw ? { raw, value: raw.split(';')[0].slice(name.length + 1) } : null;
};

/** Реальный вход через API. Возвращает access-токен и refresh-токен из cookie. */
const loginAs = async (user, password = user.plainPassword || PASSWORD) => {
  const res = await request(app).post('/api/auth/login').send({ email: user.email, password });
  return {
    res,
    accessToken: res.body?.data?.accessToken,
    refreshToken: getCookie(res, 'refreshToken')?.value,
  };
};

/** Токен из ссылки в последнем отправленном письме. */
const tokenFromLastEmail = () => {
  const calls = mailer.sendMail.mock.calls;
  const html = calls[calls.length - 1][0].html;
  return html.match(/token=([a-f0-9]{64})/)[1];
};

/** Access-токен с произвольными параметрами (для негативных сценариев). */
const signAccessToken = (payload, secret = process.env.JWT_ACCESS_SECRET, options = {}) =>
  jwt.sign(payload, secret, options);

// ── доски ──────────────────────────────────────────────

/** Создаёт доску через API от имени owner (владелец — admin доски, + 3 колонки по умолчанию). */
const createBoard = async (owner, data = {}) => {
  const res = await api('post', '/api/boards', owner).send({ title: 'Board', ...data });
  const board = res.body.data;
  const columns = await Column.findAll({ where: { board_id: board.id }, order: [['position', 'ASC']] });
  return { board, columns };
};

const addMember = (board, user, role = 'member') =>
  BoardMember.create({ board_id: board.id, user_id: user.id, role });

/** Создаёт задачу через API. */
const createTask = async (user, board, column, data = {}) => {
  const res = await api('post', `/api/boards/${board.id}/columns/${column.id}/tasks`, user)
    .send({ title: 'Task', ...data });
  return res.body.data;
};

const taskUrl = (board, column, task, suffix = '') =>
  `/api/boards/${board.id}/columns/${column.id}/tasks/${task.id}${suffix}`;

module.exports = {
  app, PASSWORD, resetDb, createUser, authHeader, api, getCookie, loginAs,
  tokenFromLastEmail, signAccessToken, createBoard, addMember, createTask, taskUrl,
};
