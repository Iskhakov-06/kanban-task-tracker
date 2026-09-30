const morgan  = require('morgan');
const logger  = require('../config/logger');

// Стрим для Morgan → Winston
const stream = {
  write: (message) => logger.http(message.trim()),
};

// Формат: метод, url, статус, время ответа, размер
const format = ':method :url :status :res[content-length] - :response-time ms';

const requestLogger = morgan(format, { stream });

module.exports = requestLogger;
