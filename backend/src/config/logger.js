const { createLogger, format, transports } = require('winston');
const path = require('path');

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  // В тестах логи не пишем (ни в консоль, ни в файлы)
  transports: process.env.NODE_ENV === 'test'
    ? [new transports.Console({ silent: true })]
    : [
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.printf(({ timestamp, level, message, stack }) =>
              stack
                ? `${timestamp} [${level}]: ${message}\n${stack}`
                : `${timestamp} [${level}]: ${message}`
            )
          ),
        }),
        // файл для ошибок
        new transports.File({
          filename: path.join(__dirname, '../../logs/error.log'),
          level: 'error',
        }),
        // файл для всех логов
        new transports.File({
          filename: path.join(__dirname, '../../logs/combined.log'),
        }),
      ],
});

module.exports = logger;
