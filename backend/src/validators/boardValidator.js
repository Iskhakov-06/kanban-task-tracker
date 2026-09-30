'use strict';

const { body, query } = require('express-validator');

const createBoardValidator = [
  body('title')
    .trim().notEmpty().withMessage('Название доски обязательно')
    .isLength({ max: 100 }).withMessage('Название не должно превышать 100 символов'),
  body('description')
    .optional().trim()
    .isLength({ max: 1000 }).withMessage('Описание не должно превышать 1000 символов'),
  body('background_color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Укажите корректный HEX-цвет (#RRGGBB)'),
];

const updateBoardValidator = [
  body('title')
    .optional().trim().notEmpty().withMessage('Название не может быть пустым')
    .isLength({ max: 100 }).withMessage('Название не должно превышать 100 символов'),
  body('description').optional().trim(),
  body('background_color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Укажите корректный HEX-цвет (#RRGGBB)'),
];

const addMemberValidator = [
  body('userId')
    .notEmpty().withMessage('ID пользователя обязателен')
    .isUUID().withMessage('Некорректный формат ID пользователя'),
  body('role')
    .optional()
    .isIn(['admin', 'member']).withMessage('Роль должна быть admin или member'),
];

const boardListValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Страница должна быть положительным числом'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Лимит должен быть от 1 до 100'),
  query('sortBy').optional().isIn(['title', 'created_at']).withMessage('Недопустимое поле сортировки'),
  query('order').optional().isIn(['ASC', 'DESC']).withMessage('Порядок сортировки: ASC или DESC'),
];

module.exports = { createBoardValidator, updateBoardValidator, addMemberValidator, boardListValidator };
