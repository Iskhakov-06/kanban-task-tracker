'use strict';

const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { Task, Column, Comment, ActionLog, User, Board } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { parsePagination, paginatedResponse } = require('../utils/pagination');

// Логирует действие с задачей (вызывается внутри транзакций)
const log = (taskId, userId, action, payload = null, transaction) =>
  ActionLog.create({ task_id: taskId, user_id: userId, action, payload }, { transaction });

//  Получить задачи колонки (с пагинацией и фильтром) 
const getTasks = async (req, res) => {
  const { columnId } = req.params;
  const { priority, assigneeId, search } = req.query;
  const { page, limit, offset, order } = parsePagination(
    req.query,
    ['position', 'created_at', 'due_date', 'priority']
  );

  const where = { column_id: columnId };
  if (priority) where.priority = priority;
  if (assigneeId) where.assignee_id = assigneeId;
  if (search) where.title = { [Op.like]: `%${search}%` };

  const result = await Task.findAndCountAll({
    where,
    include: [
      { model: User, as: 'assignee', attributes: ['id', 'username', 'avatar_url'] },
      { model: User, as: 'creator', attributes: ['id', 'username'] },
    ],
    order,
    limit,
    offset,
    distinct: true,
  });

  return paginatedResponse(res, result, page, limit);
};

//  Получить одну задачу с комментариями и историей 
const getTask = async (req, res) => {
  const task = await Task.findByPk(req.params.taskId, {
    include: [
      { model: User, as: 'assignee', attributes: ['id', 'username', 'avatar_url'] },
      { model: User, as: 'creator', attributes: ['id', 'username'] },
      {
        model: Comment, as: 'comments',
        include: [{ model: User, as: 'author', attributes: ['id', 'username', 'avatar_url'] }],
        order: [['created_at', 'ASC']],
      },
      {
        model: ActionLog, as: 'history',
        include: [{ model: User, as: 'actor', attributes: ['id', 'username'] }],
        order: [['created_at', 'DESC']],
        limit: 50,
      },
    ],
  });

  if (!task) throw new AppError('Задача не найдена', 404, 'NOT_FOUND');
  return res.json({ success: true, data: task });
};

//  Создать задачу 
const createTask = async (req, res) => {
  const { columnId } = req.params;
  const { title, description, assignee_id, priority, due_date } = req.body;

  const column = await Column.findByPk(columnId, { attributes: ['id'] });
  if (!column) throw new AppError('Колонка не найдена', 404, 'NOT_FOUND');

  const maxPosition = await Task.max('position', { where: { column_id: columnId } });
  const position = (maxPosition ?? -1) + 1;

  let task;
  await sequelize.transaction(async (t) => {
    task = await Task.create({
      column_id: columnId,
      title, description, assignee_id, priority, due_date,
      created_by: req.user.id,
      position,
    }, { transaction: t });

    await log(task.id, req.user.id, 'created', null, t);

    if (assignee_id) {
      const assignee = await User.findByPk(assignee_id, { attributes: ['username'] });
      await log(task.id, req.user.id, 'assigned', { assignee: assignee?.username }, t);
    }
  });

  return res.status(201).json({ success: true, data: task });
};

//  Обновить задачу 
const updateTask = async (req, res) => {
  const task = await Task.findByPk(req.params.taskId);
  if (!task) throw new AppError('Задача не найдена', 404, 'NOT_FOUND');

  const { title, description, assignee_id, priority, due_date } = req.body;

  await sequelize.transaction(async (t) => {
    // Логируем каждое конкретное изменение
    if (title !== undefined && title !== task.title) await log(task.id, req.user.id, 'title_changed', { from: task.title, to: title }, t);
    if (priority !== undefined && priority !== task.priority) await log(task.id, req.user.id, 'priority_changed', { from: task.priority, to: priority }, t);
    if (due_date !== undefined && String(due_date) !== String(task.due_date)) await log(task.id, req.user.id, 'due_date_changed', { from: task.due_date, to: due_date }, t);
    if (assignee_id !== undefined && assignee_id !== task.assignee_id) {
      const assignee = assignee_id ? await User.findByPk(assignee_id, { attributes: ['username'] }) : null;
      await log(task.id, req.user.id, assignee_id ? 'assigned' : 'unassigned', { assignee: assignee?.username ?? null }, t);
    }

    await task.update({ title, description, assignee_id, priority, due_date }, { transaction: t });
  });

  return res.json({ success: true, data: task });
};

//  Переместить задачу (между колонками / внутри) 
const moveTask = async (req, res) => {
  const { taskId } = req.params;
  const { column_id: newColumnId, position: newPos } = req.body;

  const task = await Task.findByPk(taskId, {
    include: [{ model: Column, as: 'column', attributes: ['title'] }],
  });
  if (!task) throw new AppError('Задача не найдена', 404, 'NOT_FOUND');

  const oldColumnId = task.column_id;
  const oldPos = task.position;
  const isSameCol = oldColumnId === newColumnId;

  await sequelize.transaction(async (t) => {
    if (!isSameCol) {
      // Сдвигаем задачи в старой колонке
      await Task.decrement('position', {
        where: { column_id: oldColumnId, position: { [Op.gt]: oldPos } },
        transaction: t,
      });
      // Освобождаем место в новой колонке
      await Task.increment('position', {
        where: { column_id: newColumnId, position: { [Op.gte]: newPos } },
        transaction: t,
      });

      // Логируем перемещение между колонками
      const newCol = await Column.findByPk(newColumnId, { attributes: ['title'] });
      await log(task.id, req.user.id, 'moved', {
        from: task.column?.title,
        to: newCol?.title,
      }, t);
    } else {
      // Перемещение внутри одной колонки
      if (newPos > oldPos) {
        await Task.decrement('position', {
          where: { column_id: oldColumnId, position: { [Op.between]: [oldPos + 1, newPos] } },
          transaction: t,
        });
      } else {
        await Task.increment('position', {
          where: { column_id: oldColumnId, position: { [Op.between]: [newPos, oldPos - 1] } },
          transaction: t,
        });
      }
    }

    await task.update({ column_id: newColumnId, position: newPos }, { transaction: t });
  });

  return res.json({ success: true, data: task });
};

//  Удалить задачу 
const deleteTask = async (req, res) => {
  const task = await Task.findByPk(req.params.taskId);
  if (!task) throw new AppError('Задача не найдена', 404, 'NOT_FOUND');

  // Только создатель, admin доски или глобальный admin может удалить
  const isCreator = task.created_by === req.user.id;
  const isGlobalAdmin = req.user.role === 'admin';
  const isBoardAdmin = req.boardRole === 'admin';

  if (!isCreator && !isGlobalAdmin && !isBoardAdmin) {
    throw new AppError('Only task creator or board admin can delete tasks', 403, 'FORBIDDEN');
  }

  await task.destroy();
  return res.json({ success: true, message: 'Task deleted.' });
};

//  Добавить комментарий 
const addComment = async (req, res) => {
  const { taskId } = req.params;
  const { body } = req.body;

  const task = await Task.findByPk(taskId, { attributes: ['id'] });
  if (!task) throw new AppError('Задача не найдена', 404, 'NOT_FOUND');

  let comment;
  await sequelize.transaction(async (t) => {
    comment = await Comment.create({ task_id: taskId, user_id: req.user.id, body }, { transaction: t });
    await log(taskId, req.user.id, 'commented', { comment_id: comment.id }, t);
  });

  // Подгружаем автора для ответа
  const full = await Comment.findByPk(comment.id, {
    include: [{ model: User, as: 'author', attributes: ['id', 'username', 'avatar_url'] }],
  });

  return res.status(201).json({ success: true, data: full });
};

//  Удалить комментарий 
const deleteComment = async (req, res) => {
  const comment = await Comment.findByPk(req.params.commentId);
  if (!comment) throw new AppError('Комментарий не найден', 404, 'NOT_FOUND');

  // Только автор или admin может удалить
  if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('Вы можете удалять только свои комментарии', 403, 'FORBIDDEN');
  }

  await comment.destroy();
  return res.json({ success: true, message: 'Comment deleted.' });
};

//  История задачи 
const getTaskHistory = async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);

  const result = await ActionLog.findAndCountAll({
    where: { task_id: req.params.taskId },
    include: [{ model: User, as: 'actor', attributes: ['id', 'username', 'avatar_url'] }],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  return paginatedResponse(res, result, page, limit);
};

module.exports = {
  getTasks, getTask, createTask, updateTask, moveTask, deleteTask,
  addComment, deleteComment, getTaskHistory,
};
