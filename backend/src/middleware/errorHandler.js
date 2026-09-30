const logger = require('../config/logger');

class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const notFound = (req, res, next) => {
  next(new AppError(`Маршрут ${req.originalUrl} не найден`, 404, 'NOT_FOUND'));
};

const handleSequelizeError = (err) => {
  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map((e) => e.message);
    return new AppError(messages.join(', '), 400, 'VALIDATION_ERROR');
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'поле';
    return new AppError(`Значение поля "${field}" уже занято`, 409, 'DUPLICATE_ERROR');
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return new AppError('Связанный ресурс не найден', 404, 'FK_ERROR');
  }
  return err;
};

const handleJWTError = () =>
  new AppError('Недействительный токен. Войдите снова.', 401, 'INVALID_TOKEN');

const handleJWTExpiredError = () =>
  new AppError('Токен истёк. Войдите снова.', 401, 'TOKEN_EXPIRED');

const errorHandler = (err, req, res, next) => {
  let error = { ...err, message: err.message };

  if (err.name?.startsWith('Sequelize')) error = handleSequelizeError(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_ERROR';

  if (statusCode >= 500) {
    logger.error(`${statusCode} - ${error.message}`, { stack: err.stack, url: req.originalUrl });
  } else {
    logger.warn(`${statusCode} - ${error.message}`, { url: req.originalUrl });
  }

  res.status(statusCode).json({
    success: false,
    code,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { AppError, notFound, errorHandler };
