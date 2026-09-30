'use strict';

/**
 * Проверка «вложенности» ресурсов из URL.
 *
 * requireBoardRole() проверяет, что пользователь — участник доски :boardId. Но колонки, задачи и комментарии
 * ищутся в БД по собственному id, поэтому без этих проверок участник доски B мог бы читать, менять и удалять
 * данные доски A, подставив в URL чужие id (IDOR / broken access control).
 *
 * Все middleware отвечают 404, если ресурс не принадлежит доске из URL — так не раскрывается, существует ли он.
 */

const { Column, Task, Comment } = require('../models');
const { AppError } = require('./errorHandler');

const guard = (check) => async (req, res, next) => {
  try {
    await check(req);
    next();
  } catch (err) {
    next(err);
  }
};

const notFound = (message) => new AppError(message, 404, 'NOT_FOUND');

// :columnId из URL принадлежит доске :boardId
const columnInBoard = guard(async (req) => {
  const column = await Column.findOne({
    where: { id: req.params.columnId, board_id: req.params.boardId },
    attributes: ['id'],
  });
  if (!column) throw notFound('Колонка не найдена');
});

// :taskId из URL лежит в какой-либо колонке доски :boardId
const taskInBoard = guard(async (req) => {
  const task = await Task.findOne({
    where: { id: req.params.taskId },
    attributes: ['id'],
    include: [{
      model: Column, as: 'column', attributes: [], required: true,
      where: { board_id: req.params.boardId },
    }],
  });
  if (!task) throw notFound('Задача не найдена');
});

// :commentId из URL относится к задаче :taskId
const commentInTask = guard(async (req) => {
  const comment = await Comment.findOne({
    where: { id: req.params.commentId, task_id: req.params.taskId },
    attributes: ['id'],
  });
  if (!comment) throw notFound('Комментарий не найден');
});

// Колонка назначения (body.column_id) при перемещении задачи — с той же доски
const targetColumnInBoard = guard(async (req) => {
  const column = await Column.findOne({
    where: { id: req.body.column_id, board_id: req.params.boardId },
    attributes: ['id'],
  });
  if (!column) throw notFound('Колонка назначения не найдена');
});

module.exports = { columnInBoard, taskInBoard, commentInTask, targetColumnInBoard };
