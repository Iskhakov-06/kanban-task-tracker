'use strict';

const { body, query } = require('express-validator');

const createTaskValidator = [
  body('title')
    .trim().notEmpty().withMessage('Название задачи обязательно')
    .isLength({ max: 200 }).withMessage('Название не должно превышать 200 символов'),
  body('description')
    .optional().trim()
    .isLength({ max: 10000 }).withMessage('Описание не должно превышать 10000 символов'),
  body('assignee_id')
    .optional({ nullable: true })
    .isUUID().withMessage('Некорректный формат ID исполнителя'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical']).withMessage('Недопустимое значение приоритета'),
  body('due_date')
    .optional({ nullable: true })
    .isISO8601().withMessage('Некорректный формат даты'),
];

const updateTaskValidator = [
  body('title')
    .optional().trim().notEmpty().withMessage('Название не может быть пустым')
    .isLength({ max: 200 }).withMessage('Название не должно превышать 200 символов'),
  body('description').optional().trim(),
  body('assignee_id')
    .optional({ nullable: true })
    .isUUID().withMessage('Некорректный формат ID исполнителя'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical']).withMessage('Недопустимое значение приоритета'),
  body('due_date')
    .optional({ nullable: true })
    .isISO8601().withMessage('Некорректный формат даты'),
];

const moveTaskValidator = [
  body('column_id')
    .notEmpty().withMessage('ID колонки обязателен')
    .isUUID().withMessage('Некорректный формат ID колонки'),
  body('position')
    .notEmpty().withMessage('Позиция обязательна')
    .isInt({ min: 0 }).withMessage('Позиция должна быть неотрицательным числом'),
];

const addCommentValidator = [
  body('body')
    .trim().notEmpty().withMessage('Текст комментария обязателен')
    .isLength({ max: 5000 }).withMessage('Комментарий не должен превышать 5000 символов'),
];

const taskListValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isIn(['position', 'created_at', 'due_date', 'priority']),
  query('order').optional().isIn(['ASC', 'DESC']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('assigneeId').optional().isUUID(),
];

module.exports = {
  createTaskValidator, updateTaskValidator, moveTaskValidator,
  addCommentValidator, taskListValidator,
};
