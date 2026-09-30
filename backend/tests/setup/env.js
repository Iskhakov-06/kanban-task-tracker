'use strict';

const path = require('path');

// Локальные переопределения (backend/.env.test). Уже заданные переменные (например, в CI) не перезаписываются.
require('dotenv').config({ path: path.join(__dirname, '../../.env.test') });

// Эти значения фиксируем всегда — тесты не должны зависеть от окружения разработчика
Object.assign(process.env, {
  NODE_ENV: 'test',
  JWT_ACCESS_SECRET: 'test-access-secret-test-access-secret',
  JWT_REFRESH_SECRET: 'test-refresh-secret-test-refresh-secret',
  JWT_ACCESS_EXPIRES: '15m',
  JWT_REFRESH_EXPIRES: '7d',
  BCRYPT_ROUNDS: '4', // быстрый bcrypt
  CLIENT_URL: 'http://localhost:3000',
});

// Параметры БД можно переопределить через окружение или .env.test
const dbDefaults = {
  DB_HOST: '127.0.0.1',
  DB_PORT: '3306',
  DB_NAME: 'task_tracker_test',
  DB_USER: 'root',
  DB_PASSWORD: '',
};
for (const [key, value] of Object.entries(dbDefaults)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

// Тесты очищают все таблицы — на рабочей базе их запускать нельзя
if (!/_test$/.test(process.env.DB_NAME)) {
  throw new Error(
    `Тесты отказываются работать с базой "${process.env.DB_NAME}": имя тестовой базы должно заканчиваться на "_test" ` +
    '(тесты удаляют все данные из таблиц).'
  );
}
