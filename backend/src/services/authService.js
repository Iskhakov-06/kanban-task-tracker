'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, RefreshToken } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { generateTokens, verifyRefreshToken, getRefreshTokenExpiry } = require('../utils/jwt');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

// ── helpers ───────────────────────────────────────────
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;
const randomToken = () => crypto.randomBytes(32).toString('hex');

/**
 * Сохраняет refresh-токен в БД и устанавливает httpOnly cookie
 */
const saveRefreshToken = async (userId, token, req, res) => {
  await RefreshToken.create({
    user_id: userId,
    token,
    expires_at: getRefreshTokenExpiry(),
    user_agent: req.headers['user-agent']?.slice(0, 300) || null,
    ip_address: req.ip || null,
  });

  // httpOnly — JS на клиенте не может прочитать этот cookie
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 дней в мс
  });
};

const register = async (req, res) => {
  const { username, email, password } = req.body;

  // Проверяем уникальность (доп. слой поверх unique constraint в БД)
  const existing = await User.findOne({
    where: { email },
    attributes: ['id'],
  });
  if (existing) throw new AppError('Email уже зарегистрирован', 409, 'EMAIL_TAKEN');

  const existingUsername = await User.findOne({
    where: { username },
    attributes: ['id'],
  });
  if (existingUsername) throw new AppError('Имя пользователя уже занято', 409, 'USERNAME_TAKEN');

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const verification_token = randomToken();

  const user = await User.create({
    username,
    email,
    password_hash,
    verification_token,
    is_verified: false,
  });

  sendVerificationEmail(email, username, verification_token).catch(console.error);

  return res.status(201).json({
    success: true,
    message: 'Регистрация прошла успешно. Проверьте почту для подтверждения аккаунта.',
    data: { id: user.id, username: user.username, email: user.email },
  });
};

const verifyEmail = async (req, res) => {
  const { token } = req.query;
  if (!token) throw new AppError('Токен подтверждения обязателен', 400);

  const user = await User.findOne({
    where: { verification_token: token },
    attributes: { include: ['verification_token', 'is_verified'] },
  });

  if (!user) throw new AppError('Недействительный или устаревший токен', 400, 'INVALID_TOKEN');
  if (user.is_verified) throw new AppError('Email уже подтверждён', 400, 'ALREADY_VERIFIED');

  await user.update({ is_verified: true, verification_token: null });

  return res.json({ success: true, message: 'Email успешно подтверждён.' });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  // Явно запрашиваем password_hash (он скрыт в defaultScope)
  const user = await User.scope('withPassword').findOne({
    where: { email },
    attributes: ['id', 'username', 'email', 'password_hash', 'role', 'is_verified'],
  });

  if (!user) throw new AppError('Неверный email или пароль', 401, 'INVALID_CREDENTIALS');

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw new AppError('Неверный email или пароль', 401, 'INVALID_CREDENTIALS');

  if (!user.is_verified) {
    throw new AppError('Подтвердите email перед входом', 403, 'EMAIL_NOT_VERIFIED');
  }

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  await saveRefreshToken(user.id, refreshToken, req, res);

  return res.json({
    success: true,
    data: {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    },
  });
};

const sequelize = require('../config/database');

const refresh = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new AppError('Токен обновления не найден', 401, 'NO_REFRESH_TOKEN');

  // Верифицируем подпись JWT до обращения к БД
  const decoded = verifyRefreshToken(token);

  // Всю ротацию делаем в транзакции — защита от гонки и deadlock
  const result = await sequelize.transaction(async (t) => {
    const stored = await RefreshToken.findOne({
      where: { token, user_id: decoded.id, is_revoked: false },
      transaction: t,
      lock: t.LOCK.UPDATE,  // SELECT FOR UPDATE — блокируем строку
    });

    if (!stored) throw new AppError('Токен обновления отозван или не найден', 401, 'TOKEN_REVOKED');

    if (new Date() > stored.expires_at) {
      await stored.update({ is_revoked: true }, { transaction: t });
      throw new AppError('Токен обновления истёк', 401, 'TOKEN_EXPIRED');
    }

    // Отзываем старый токен
    await stored.update({ is_revoked: true }, { transaction: t });

    const user = await User.findByPk(decoded.id, { transaction: t });
    if (!user) throw new AppError('Пользователь не найден', 401);

    // Генерируем новую пару токенов
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.role);

    // Сохраняем новый refresh токен в той же транзакции
    await RefreshToken.create({
      user_id: user.id,
      token: newRefreshToken,
      expires_at: getRefreshTokenExpiry(),
      user_agent: req.headers['user-agent']?.slice(0, 300) || null,
      ip_address: req.ip || null,
    }, { transaction: t });

    return { accessToken, newRefreshToken, user };
  });

  // Устанавливаем cookie уже после успешной транзакции
  res.cookie('refreshToken', result.newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({
    success: true,
    data: { accessToken: result.accessToken },
  });
};

const logout = async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    // Отзываем токен в БД
    await RefreshToken.update(
      { is_revoked: true },
      { where: { token } }
    );
  }

  // Удаляем cookie
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict' });

  return res.json({ success: true, message: 'Вы успешно вышли из системы.' });
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  const user = await User.scope('withPassword').findOne({
    where: { email },
    attributes: ['id', 'username', 'email'],
  });

  // Не раскрываем существование аккаунта — всегда одинаковый ответ
  if (!user) {
    return res.json({
      success: true,
      message: 'Если аккаунт с таким email существует — ссылка отправлена.',
    });
  }

  const reset_password_token = randomToken();
  const reset_password_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 час

  await user.update({ reset_password_token, reset_password_expires });

  sendPasswordResetEmail(email, user.username, reset_password_token).catch(console.error);

  return res.json({
    success: true,
    message: 'Если аккаунт с таким email существует — ссылка отправлена.',
  });
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  const user = await User.scope('withPassword').findOne({
    where: { reset_password_token: token },
    attributes: ['id', 'reset_password_token', 'reset_password_expires'],
  });

  if (!user) throw new AppError('Недействительный или устаревший токен сброса', 400, 'INVALID_TOKEN');

  if (new Date() > user.reset_password_expires) {
    throw new AppError('Токен сброса истёк. Запросите новую ссылку.', 400, 'TOKEN_EXPIRED');
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await user.update({
    password_hash,
    reset_password_token: null,
    reset_password_expires: null,
  });

  // Отзываем все refresh-токены пользователя (защита при компрометации)
  await RefreshToken.update(
    { is_revoked: true },
    { where: { user_id: user.id } }
  );

  return res.json({ success: true, message: 'Пароль успешно изменён. Войдите в аккаунт.' });
};

const getMe = async (req, res) => {
  return res.json({ success: true, data: req.user });
};

module.exports = { register, verifyEmail, login, refresh, logout, forgotPassword, resetPassword, getMe };