'use strict';

// Оборачивает async route handler — пробрасывает ошибки в next()
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
