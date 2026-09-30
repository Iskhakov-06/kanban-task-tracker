'use strict';

const { Op } = require('sequelize');
const { User } = require('../models');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/users?search=alice&limit=10
 * Поиск пользователей по username или email.
 * Возвращает только безопасные поля — без хэша пароля.
 */
const searchUsers = async (req, res) => {
  const search = (req.query.search || '').trim();
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));

  if (search.length < 2) {
    throw new AppError('Поисковый запрос должен содержать минимум 2 символа', 400, 'SEARCH_TOO_SHORT');
  }

  const users = await User.findAll({
    where: {
      [Op.or]: [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ],
      is_verified: true,   // только подтверждённые аккаунты
    },
    attributes: ['id', 'username', 'email', 'role', 'avatar_url'],
    limit,
    order: [['username', 'ASC']],
  });

  return res.json({ success: true, data: users });
};

/**
 * GET /api/users/:id
 * Публичный профиль пользователя
 */
const getUser = async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    attributes: ['id', 'username', 'email', 'role', 'avatar_url', 'created_at'],
  });

  if (!user) throw new AppError('Пользователь не найден', 404, 'NOT_FOUND');

  return res.json({ success: true, data: user });
};

module.exports = { searchUsers, getUser };
