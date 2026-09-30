'use strict';

// Задачи — вложены в колонку: /api/boards/:boardId/columns/:columnId/tasks
const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/taskController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { requireBoardRole } = require('../middleware/rbac');
const {
  createTaskValidator, updateTaskValidator, moveTaskValidator,
  addCommentValidator, taskListValidator,
} = require('../validators/taskValidator');

router.use(authenticate);
router.use(requireBoardRole()); // Все роуты задач требуют участия в доске

// GET  .../tasks                  — список задач (с пагинацией и фильтрами)
router.get('/',
  taskListValidator, validate,
  ctrl.getTasks
);

// POST .../tasks                  — создать задачу (любой участник)
router.post('/',
  createTaskValidator, validate,
  ctrl.createTask
);

// GET  .../tasks/:taskId           — одна задача с комментариями и историей
router.get('/:taskId', ctrl.getTask);

// PUT  .../tasks/:taskId           — обновить задачу (создатель или admin доски)
router.put('/:taskId',
  updateTaskValidator, validate,
  ctrl.updateTask
);

// PATCH .../tasks/:taskId/move     — переместить задачу (любой участник)
router.patch('/:taskId/move',
  moveTaskValidator, validate,
  ctrl.moveTask
);

// DELETE .../tasks/:taskId         — удалить (создатель или admin доски)
router.delete('/:taskId', ctrl.deleteTask);

// POST .../tasks/:taskId/comments  — добавить комментарий (любой участник)
router.post('/:taskId/comments',
  addCommentValidator, validate,
  ctrl.addComment
);

// DELETE .../tasks/:taskId/comments/:commentId — удалить комментарий (автор или admin)
router.delete('/:taskId/comments/:commentId', ctrl.deleteComment);

// GET .../tasks/:taskId/history    — история изменений задачи
router.get('/:taskId/history', ctrl.getTaskHistory);

module.exports = router;
