'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { query } = require('express-validator');
const validate = require('../middleware/validate');

// Все роуты требуют авторизации
router.use(authenticate);

// GET /api/users?search=alice&limit=10
router.get('/',
  [
    query('search')
      .trim()
      .notEmpty().withMessage('search is required')
      .isLength({ min: 2 }).withMessage('At least 2 characters'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 20 }).withMessage('limit must be 1–20'),
  ],
  validate,
  ctrl.searchUsers
);

// GET /api/users/:id
router.get('/:id',
  ctrl.getUser
);

module.exports = router;
