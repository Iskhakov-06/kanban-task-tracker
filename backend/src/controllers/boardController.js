'use strict';

const boardService = require('../services/boardService');
const asyncHandler = require('../utils/asyncHandler');

module.exports = {
  getBoards: asyncHandler(boardService.getBoards),
  getBoard: asyncHandler(boardService.getBoard),
  createBoard: asyncHandler(boardService.createBoard),
  updateBoard: asyncHandler(boardService.updateBoard),
  deleteBoard: asyncHandler(boardService.deleteBoard),
  addMember: asyncHandler(boardService.addMember),
  removeMember: asyncHandler(boardService.removeMember),
};
