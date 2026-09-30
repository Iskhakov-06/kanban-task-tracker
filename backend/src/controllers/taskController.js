'use strict';

const taskService = require('../services/taskService');
const asyncHandler = require('../utils/asyncHandler');

module.exports = {
  getTasks: asyncHandler(taskService.getTasks),
  getTask: asyncHandler(taskService.getTask),
  createTask: asyncHandler(taskService.createTask),
  updateTask: asyncHandler(taskService.updateTask),
  moveTask: asyncHandler(taskService.moveTask),
  deleteTask: asyncHandler(taskService.deleteTask),
  addComment: asyncHandler(taskService.addComment),
  deleteComment: asyncHandler(taskService.deleteComment),
  getTaskHistory: asyncHandler(taskService.getTaskHistory),
};
