'use strict';

// Колонки — вложены в доску: /api/boards/:boardId/columns
const router = require('express').Router({ mergeParams: true }); // mergeParams нужен чтобы получить boardId из parent router
const ctrl = require('../controllers/columnController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { requireBoardRole } = require('../middleware/rbac');
const { columnInBoard } = require('../middleware/resourceScope');
const {
  createColumnValidator, updateColumnValidator, moveColumnValidator,
} = require('../validators/columnValidator');

router.use(authenticate);

// GET  /api/boards/:boardId/columns        — все колонки (любой участник)
router.get('/',
  requireBoardRole(),
  ctrl.getColumns
);

// POST /api/boards/:boardId/columns        — создать колонку (admin доски)
router.post('/',
  requireBoardRole('admin'),
  createColumnValidator, validate,
  ctrl.createColumn
);

// PUT  /api/boards/:boardId/columns/:columnId      — переименовать (admin доски)
router.put('/:columnId',
  requireBoardRole('admin'),
  columnInBoard,
  updateColumnValidator, validate,
  ctrl.updateColumn
);

// PATCH /api/boards/:boardId/columns/:columnId/move — переместить (admin доски)
router.patch('/:columnId/move',
  requireBoardRole('admin'),
  columnInBoard,
  moveColumnValidator, validate,
  ctrl.moveColumn
);

// DELETE /api/boards/:boardId/columns/:columnId    — удалить (admin доски)
router.delete('/:columnId',
  requireBoardRole('admin'),
  columnInBoard,
  ctrl.deleteColumn
);

module.exports = router;
