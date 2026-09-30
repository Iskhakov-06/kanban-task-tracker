const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Токен не предоставлен', 401, 'NO_TOKEN');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findByPk(decoded.id);
    if (!user) {
      throw new AppError('Пользователь не найден', 401, 'USER_NOT_FOUND');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const requireVerified = (req, res, next) => {
  if (!req.user.is_verified) {
    return next(new AppError('Сначала подтвердите email', 403, 'EMAIL_NOT_VERIFIED'));
  }
  next();
};

module.exports = { authenticate, requireVerified };
