'use strict';

// Точка входа: подключение к БД, миграции, запуск HTTP-сервера.
// Само приложение (роуты, middleware) собирается в app.js — так его можно тестировать без запуска сервера.
require('dotenv').config();

const app = require('./app');
const sequelize = require('./config/database');
const migrator = require('./migrator');
const logger = require('./config/logger');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Соединение с базой данных установлено');

    // Применяем миграции схемы (src/migrations). Отключить: AUTO_MIGRATE=false
    if (process.env.AUTO_MIGRATE !== 'false') {
      await migrator.up();
      logger.info('Схема базы данных актуальна');
    }

    app.listen(PORT, () => {
      logger.info(`Сервер стартанул на ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (err) {
    logger.error('Не удалось запустить сервер:', err);
    process.exit(1);
  }
};

start();
