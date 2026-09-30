'use strict';

const columnService = require('../services/columnService');
const asyncHandler = require('../utils/asyncHandler');

module.exports = {
  getColumns: asyncHandler(columnService.getColumns),
  createColumn: asyncHandler(columnService.createColumn),
  updateColumn: asyncHandler(columnService.updateColumn),
  moveColumn: asyncHandler(columnService.moveColumn),
  deleteColumn: asyncHandler(columnService.deleteColumn),
};
