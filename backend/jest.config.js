'use strict';

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  globalSetup: '<rootDir>/tests/setup/globalSetup.js',
  setupFiles: ['<rootDir>/tests/setup/env.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/afterEnv.js'],
  // Все тесты используют одну БД — файлы запускаем по очереди
  maxWorkers: 1,
  testTimeout: 20000,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/migrate.js',
    '!src/migrations/**',
  ],
};
