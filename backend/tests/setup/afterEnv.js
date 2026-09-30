'use strict';

// Письма в тестах не отправляем: подменяем SMTP-транспорт заглушкой,
// а тесты проверяют, что письмо ушло и достают из него токен.
jest.mock('../../src/config/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message' }),
  verify: jest.fn(),
}));

const sequelize = require('../../src/config/database');

afterAll(async () => {
  await sequelize.close();
});
