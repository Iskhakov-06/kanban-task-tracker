'use strict';

const { Column, Board, BoardMember } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const sequelize = require('../config/database');

// Проверяет что пользователь — участник доски
const assertMember = async (boardId, userId) => {
  const member = await BoardMember.findOne({ where: { board_id: boardId, user_id: userId } });
  if (!member) throw new AppError('You are not a member of this board', 403, 'FORBIDDEN');
  return member;
};

//  Получить колонки доски 
const getColumns = async (req, res) => {
  const { boardId } = req.params;

  const board = await Board.findByPk(boardId, { attributes: ['id'] });
  if (!board) throw new AppError('Доска не найдена', 404, 'NOT_FOUND');

  const columns = await Column.findAll({
    where: { board_id: boardId },
    order: [['position', 'ASC']],
  });

  return res.json({ success: true, data: columns });
};

//  Создать колонку 
const createColumn = async (req, res) => {
  const { boardId } = req.params;
  const { title } = req.body;

  // Определяем следующую позицию
  const maxPosition = await Column.max('position', { where: { board_id: boardId } });
  const position = (maxPosition ?? -1) + 1;

  const column = await Column.create({ board_id: boardId, title, position });
  return res.status(201).json({ success: true, data: column });
};

//  Обновить колонку 
const updateColumn = async (req, res) => {
  const column = await Column.findByPk(req.params.columnId);
  if (!column) throw new AppError('Колонка не найдена', 404, 'NOT_FOUND');

  await column.update({ title: req.body.title });
  return res.json({ success: true, data: column });
};

//  Переместить колонку (drag & drop) 
// Принимает newPosition и пересчитывает позиции остальных
const moveColumn = async (req, res) => {
  const { boardId, columnId } = req.params;
  const { position: newPos } = req.body;

  const column = await Column.findOne({ where: { id: columnId, board_id: boardId } });
  if (!column) throw new AppError('Колонка не найдена', 404, 'NOT_FOUND');

  const oldPos = column.position;
  if (oldPos === newPos) return res.json({ success: true, data: column });

  // Транзакция: атомарно сдвигаем все затронутые колонки
  await sequelize.transaction(async (t) => {
    if (newPos > oldPos) {
      // Двигаем вправо — сдвигаем промежуточные влево
      await Column.decrement('position', {
        where: { board_id: boardId, position: { [require('sequelize').Op.between]: [oldPos + 1, newPos] } },
        transaction: t,
      });
    } else {
      // Двигаем влево — сдвигаем промежуточные вправо
      await Column.increment('position', {
        where: { board_id: boardId, position: { [require('sequelize').Op.between]: [newPos, oldPos - 1] } },
        transaction: t,
      });
    }
    await column.update({ position: newPos }, { transaction: t });
  });

  return res.json({ success: true, data: column });
};

//  Удалить колонку 
const deleteColumn = async (req, res) => {
  const column = await Column.findByPk(req.params.columnId);
  if (!column) throw new AppError('Колонка не найдена', 404, 'NOT_FOUND');

  await column.destroy(); // CASCADE удалит все задачи внутри
  return res.json({ success: true, message: 'Column deleted.' });
};

module.exports = { getColumns, createColumn, updateColumn, moveColumn, deleteColumn };
