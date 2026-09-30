const { validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

// !!!Ставится ПОСЛЕ правил express-validator 
// ~3 часа потратил на то, чтобы понять, что нужно ставить ПОСЛЕ правил, а не до них. Иначе всегда будет пустой результат и 500 ошибка из-за того, что пытается вызвать join у undefined
// Если есть ошибки — возвращает 422 со списком полей
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => `${e.path}: ${e.msg}`).join('; ');
    return next(new AppError(messages, 422, 'VALIDATION_ERROR'));
  }
  next();
};

module.exports = validate;
