'use strict';

const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');

module.exports = {
  searchUsers: asyncHandler(userService.searchUsers),
  getUser: asyncHandler(userService.getUser),
};
