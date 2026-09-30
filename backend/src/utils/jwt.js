'use strict';

const jwt = require('jsonwebtoken');

/**
 * Генерирует пару access + refresh токенов
 * @param {string} userId
 * @param {string} role
 */
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { id: userId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );

  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * Верифицирует access-токен
 */
const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET);

/**
 * Верифицирует refresh-токен
 */
const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET);

/**
 * Возвращает дату истечения refresh-токена как объект Date
 */
const getRefreshTokenExpiry = () => {
  const expires = process.env.JWT_REFRESH_EXPIRES || '7d';
  const days = parseInt(expires);   // '7d' → 7
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

module.exports = { generateTokens, verifyAccessToken, verifyRefreshToken, getRefreshTokenExpiry };
