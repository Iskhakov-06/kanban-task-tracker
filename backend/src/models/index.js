const User = require('./User');
const Board = require('./Board');
const BoardMember = require('./BoardMember');
const Column = require('./Column');
const Task = require('./Task');
const Comment = require('./Comment');
const ActionLog = require('./ActionLog');
const RefreshToken = require('./RefreshToken');

User.hasMany(Board, { foreignKey: 'owner_id', as: 'ownedBoards' });
User.hasMany(BoardMember, { foreignKey: 'user_id', as: 'boardMemberships' });
User.hasMany(Task, { foreignKey: 'assignee_id', as: 'assignedTasks' });
User.hasMany(Task, { foreignKey: 'created_by', as: 'createdTasks' });
User.hasMany(Comment, { foreignKey: 'user_id', as: 'comments' });
User.hasMany(ActionLog, { foreignKey: 'user_id', as: 'actions' });
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });

Board.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });
Board.hasMany(Column, { foreignKey: 'board_id', as: 'columns', onDelete: 'CASCADE' });
Board.hasMany(BoardMember, { foreignKey: 'board_id', as: 'members', onDelete: 'CASCADE' });
Board.belongsToMany(User, {
  through: BoardMember,
  foreignKey: 'board_id',
  otherKey: 'user_id',
  as: 'memberUsers',
});

BoardMember.belongsTo(Board, { foreignKey: 'board_id', as: 'board' });
BoardMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Column.belongsTo(Board, { foreignKey: 'board_id', as: 'board' });
Column.hasMany(Task, { foreignKey: 'column_id', as: 'tasks', onDelete: 'CASCADE' });

Task.belongsTo(Column, { foreignKey: 'column_id', as: 'column' });
Task.belongsTo(User, { foreignKey: 'assignee_id', as: 'assignee' });
Task.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Task.hasMany(Comment, { foreignKey: 'task_id', as: 'comments', onDelete: 'CASCADE' });
Task.hasMany(ActionLog, { foreignKey: 'task_id', as: 'history', onDelete: 'CASCADE' });

Comment.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });
Comment.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

ActionLog.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });
ActionLog.belongsTo(User, { foreignKey: 'user_id', as: 'actor' });

RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  User,
  Board,
  BoardMember,
  Column,
  Task,
  Comment,
  ActionLog,
  RefreshToken,
};
