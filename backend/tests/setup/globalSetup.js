'use strict';

// Выполняется один раз перед всеми тестами: создаёт тестовую БД (если её нет) и применяет миграции.
module.exports = async () => {
  require('./env');

  const mysql = require('mysql2/promise');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4`
  );
  await connection.end();

  const sequelize = require('../../src/config/database');
  const migrator = require('../../src/migrator');
  await migrator.up();
  await sequelize.close();
};
