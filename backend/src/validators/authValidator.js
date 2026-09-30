'use strict';

const { body, query } = require('express-validator');

const registerValidator = [
  body('username')
    .trim()
    .notEmpty().withMessage('Имя пользователя обязательно')
    .isLength({ min: 3, max: 50 }).withMessage('Имя пользователя должно быть от 3 до 50 символов')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Имя пользователя может содержать только буквы, цифры и _'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Некорректный формат email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Пароль обязателен')
    .isLength({ min: 8 }).withMessage('Пароль должен содержать минимум 8 символов')
    .matches(/[A-Z]/).withMessage('Пароль должен содержать хотя бы одну заглавную букву')
    .matches(/[0-9]/).withMessage('Пароль должен содержать хотя бы одну цифру'),
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Некорректный формат email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Пароль обязателен'),
];

const verifyEmailValidator = [
  query('token')
    .notEmpty().withMessage('Токен подтверждения обязателен')
    .isHexadecimal().withMessage('Некорректный формат токена')
    .isLength({ min: 64, max: 64 }).withMessage('Некорректная длина токена'),
];

const forgotPasswordValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Некорректный формат email')
    .normalizeEmail(),
];

const resetPasswordValidator = [
  body('token')
    .notEmpty().withMessage('Токен сброса обязателен')
    .isHexadecimal().withMessage('Некорректный формат токена')
    .isLength({ min: 64, max: 64 }).withMessage('Некорректная длина токена'),

  body('password')
    .notEmpty().withMessage('Пароль обязателен')
    .isLength({ min: 8 }).withMessage('Пароль должен содержать минимум 8 символов')
    .matches(/[A-Z]/).withMessage('Пароль должен содержать хотя бы одну заглавную букву')
    .matches(/[0-9]/).withMessage('Пароль должен содержать хотя бы одну цифру'),

  body('confirmPassword')
    .notEmpty().withMessage('Подтвердите пароль')
    .custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Пароли не совпадают');
      return true;
    }),
];

module.exports = {
  registerValidator,
  loginValidator,
  verifyEmailValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
};
