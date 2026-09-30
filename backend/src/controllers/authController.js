'use strict';

const authService = require('../services/authService');

// оборачивает async функцию — ловит ошибки и передаёт в errorHandler
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = {
  register: asyncHandler(authService.register),
  verifyEmail: asyncHandler(authService.verifyEmail),
  login: asyncHandler(authService.login),
  refresh: asyncHandler(authService.refresh),
  logout: asyncHandler(authService.logout),
  forgotPassword: asyncHandler(authService.forgotPassword),
  resetPassword: asyncHandler(authService.resetPassword),
  getMe: asyncHandler(authService.getMe),
};
