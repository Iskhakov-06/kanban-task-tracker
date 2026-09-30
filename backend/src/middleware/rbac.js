const { AppError }    = require('./errorHandler');
const { BoardMember } = require('../models');

const ROLE_HIERARCHY = { user: 0, moderator: 1, admin: 2 };

const requireRole = (...roles) => (req, res, next) => {
  const userLevel   = ROLE_HIERARCHY[req.user.role] ?? -1;
  const minRequired = Math.min(...roles.map((r) => ROLE_HIERARCHY[r] ?? 99));

  if (userLevel < minRequired) {
    return next(new AppError('Недостаточно прав', 403, 'FORBIDDEN'));
  }
  next();
};

const requireBoardRole = (...roles) => async (req, res, next) => {
  try {
    const boardId = req.params.boardId || req.params.id;

    if (req.user.role === 'admin') return next();

    const membership = await BoardMember.findOne({
      where: { board_id: boardId, user_id: req.user.id },
    });

    if (!membership) {
      return next(new AppError('Вы не являетесь участником этой доски', 403, 'NOT_BOARD_MEMBER'));
    }

    if (roles.length && !roles.includes(membership.role)) {
      return next(new AppError('Недостаточно прав на этой доске', 403, 'FORBIDDEN'));
    }

    req.boardRole = membership.role;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireRole, requireBoardRole, ROLE_HIERARCHY };
