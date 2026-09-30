'use strict';

/**
 * Парсит query-параметры пагинации и сортировки
 * Использование: const { limit, offset, order } = parsePagination(req.query, ['title','created_at'])
 */
const parsePagination = (query, allowedSortFields = ['created_at']) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;

  const sortField = allowedSortFields.includes(query.sort) ? query.sort : allowedSortFields[0];
  const sortDir = query.dir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const order = [[sortField, sortDir]];

  return { page, limit, offset, order };
};

/**
 * Формирует стандартный ответ с пагинацией
 */
const paginatedResponse = (res, { rows, count }, page, limit) => {
  return res.json({
    success: true,
    data: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      hasNextPage: page < Math.ceil(count / limit),
      hasPrevPage: page > 1,
    },
  });
};

module.exports = { parsePagination, paginatedResponse };
