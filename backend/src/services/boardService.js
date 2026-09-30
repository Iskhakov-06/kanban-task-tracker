'use strict';

const { Op } = require('sequelize');
const { Board, BoardMember, Column, User } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { parsePagination, paginatedResponse } = require('../utils/pagination');

//  Получить все доски пользователя 
const getBoards = async (req, res) => {
  const { page, limit, offset, order } = parsePagination(req.query, ['title', 'created_at']);

  const result = await Board.findAndCountAll({
    include: [
      { model: BoardMember, as: 'members', where: { user_id: req.user.id }, attributes: ['role'] },
      { model: User, as: 'owner', attributes: ['id', 'username', 'avatar_url'] },
    ],
    order,
    limit,
    offset,
    distinct: true,
  });

  return paginatedResponse(res, result, page, limit);
};

//  Получить одну доску 
const getBoard = async (req, res) => {
  const board = await Board.findByPk(req.params.id, {
    include: [
      { model: User, as: 'owner', attributes: ['id', 'username', 'avatar_url'] },
      {
        model: BoardMember, as: 'members',
        include: [{ model: User, as: 'user', attributes: ['id', 'username', 'email', 'avatar_url'] }],
      },
      {
        model: Column, as: 'columns',
        order: [['position', 'ASC']],
      },
    ],
  });

  if (!board) throw new AppError('Доска не найдена', 404, 'NOT_FOUND');

  return res.json({ success: true, data: board });
};

//  Создать доску 
const createBoard = async (req, res) => {
  const { title, description, background_color } = req.body;

  const board = await Board.create({
    title,
    description,
    background_color,
    owner_id: req.user.id,
  });

  // Создатель автоматически становится admin-ом доски
  await BoardMember.create({
    board_id: board.id,
    user_id: req.user.id,
    role: 'admin',
  });

  // Создаём стандартные колонки
  await Column.bulkCreate([
    { board_id: board.id, title: 'To Do', position: 0 },
    { board_id: board.id, title: 'In Progress', position: 1 },
    { board_id: board.id, title: 'Done', position: 2 },
  ]);

  return res.status(201).json({ success: true, data: board });
};

//  Обновить доску 
const updateBoard = async (req, res) => {
  const board = await Board.findByPk(req.params.id);
  if (!board) throw new AppError('Доска не найдена', 404, 'NOT_FOUND');

  const { title, description, background_color } = req.body;
  await board.update({ title, description, background_color });

  return res.json({ success: true, data: board });
};

//  Удалить доску 
const deleteBoard = async (req, res) => {
  const board = await Board.findByPk(req.params.id);
  if (!board) throw new AppError('Доска не найдена', 404, 'NOT_FOUND');

  // Только владелец или глобальный admin может удалить доску
  if (board.owner_id !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('Недостаточно прав: удалить доску может только её владелец', 403, 'FORBIDDEN');
  }

  await board.destroy(); // CASCADE удалит колонки, задачи, комментарии
  return res.json({ success: true, message: 'Доска удалена.' });
};

//  Добавить участника 
const addMember = async (req, res) => {
  const { userId, role = 'member' } = req.body;

  const user = await User.findByPk(userId, { attributes: ['id', 'username', 'email'] });
  if (!user) throw new AppError('Пользователь не найден', 404, 'NOT_FOUND');

  const existing = await BoardMember.findOne({
    where: { board_id: req.params.id, user_id: userId },
  });
  if (existing) throw new AppError('Пользователь уже является участником доски', 409, 'ALREADY_MEMBER');

  const member = await BoardMember.create({
    board_id: req.params.id,
    user_id: userId,
    role,
  });

  return res.status(201).json({ success: true, data: { member, user } });
};

//  Удалить участника 
const removeMember = async (req, res) => {
  const { id: boardId, userId } = req.params;

  // Нельзя удалить владельца доски
  const board = await Board.findByPk(boardId, { attributes: ['owner_id'] });
  if (board.owner_id === userId) {
    throw new AppError('Нельзя удалить владельца доски', 400, 'CANNOT_REMOVE_OWNER');
  }

  const member = await BoardMember.findOne({ where: { board_id: boardId, user_id: userId } });
  if (!member) throw new AppError('Участник не найден', 404, 'NOT_FOUND');

  await member.destroy();
  return res.json({ success: true, message: 'Участник удалён.' });
};

module.exports = { getBoards, getBoard, createBoard, updateBoard, deleteBoard, addMember, removeMember };