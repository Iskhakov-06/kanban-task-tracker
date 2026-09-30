'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/authController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const {
  registerValidator,
  loginValidator,
  verifyEmailValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require('../validators/authValidator');

// POST /api/auth/register
router.post('/register',
  registerValidator,
  validate,
  ctrl.register
);

// GET /api/auth/verify-email?token=...
router.get('/verify-email',
  verifyEmailValidator,
  validate,
  ctrl.verifyEmail
);

// POST /api/auth/login
router.post('/login',
  loginValidator,
  validate,
  ctrl.login
);

// POST /api/auth/refresh   (refresh token читается из cookie)
router.post('/refresh', ctrl.refresh);

// POST /api/auth/logout
router.post('/logout', ctrl.logout);

// POST /api/auth/forgot-password
router.post('/forgot-password',
  forgotPasswordValidator,
  validate,
  ctrl.forgotPassword
);

// POST /api/auth/reset-password
router.post('/reset-password',
  resetPasswordValidator,
  validate,
  ctrl.resetPassword
);

// GET /api/auth/me   — текущий пользователь (защищённый)
router.get('/me', authenticate, ctrl.getMe);

module.exports = router;
