'use strict';

const { body } = require('express-validator');

const createColumnValidator = [
  body('title')
    .trim().notEmpty().withMessage('Название колонки обязательно')
    .isLength({ max: 100 }).withMessage('Название не должно превышать 100 символов'),
];

const updateColumnValidator = [
  body('title')
    .trim().notEmpty().withMessage('Название колонки обязательно')
    .isLength({ max: 100 }).withMessage('Название не должно превышать 100 символов'),
];

const moveColumnValidator = [
  body('position')
    .notEmpty().withMessage('Позиция обязательна')
    .isInt({ min: 0 }).withMessage('Позиция должна быть неотрицательным числом'),
];

module.exports = { createColumnValidator, updateColumnValidator, moveColumnValidator };
