'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/boardController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { requireBoardRole } = require('../middleware/rbac');
const {
  createBoardValidator, updateBoardValidator,
  addMemberValidator, boardListValidator,
} = require('../validators/boardValidator');

// Все роуты досок требуют авторизации
router.use(authenticate);

// GET  /api/boards          — список своих досок (с пагинацией)
router.get('/',
  boardListValidator, validate,
  ctrl.getBoards
);

// POST /api/boards          — создать доску (любой авторизованный)
router.post('/',
  createBoardValidator, validate,
  ctrl.createBoard
);

// GET  /api/boards/:id      — получить доску (только участник)
router.get('/:id',
  requireBoardRole(),        // любая роль на доске
  ctrl.getBoard
);

// PUT  /api/boards/:id      — обновить (только admin доски)
router.put('/:id',
  requireBoardRole('admin'),
  updateBoardValidator, validate,
  ctrl.updateBoard
);

// DELETE /api/boards/:id    — удалить (только владелец или глобальный admin)
router.delete('/:id',
  requireBoardRole('admin'),
  ctrl.deleteBoard
);

// POST /api/boards/:id/members        — добавить участника (admin доски)
router.post('/:id/members',
  requireBoardRole('admin'),
  addMemberValidator, validate,
  ctrl.addMember
);

// DELETE /api/boards/:id/members/:userId — удалить участника (admin доски)
router.delete('/:id/members/:userId',
  requireBoardRole('admin'),
  ctrl.removeMember
);

module.exports = router;
