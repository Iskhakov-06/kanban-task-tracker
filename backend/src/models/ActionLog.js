const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// история всех действий с задачей
const ActionLog = sequelize.define('ActionLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  task_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  action: {
    type: DataTypes.ENUM(
      'created',
      'moved',
      'assigned',
      'commented',
      'priority_changed',
      'due_date_changed',
      'title_changed'
    ),
    allowNull: false,
  },
  payload: {
    // JSON с деталями: { from: 'To Do', to: 'In Progress' }
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: 'action_logs',
  timestamps: true,
  underscored: true,
  updatedAt: false, // логи только создаются, не обновляются
  indexes: [
    { fields: ['task_id'] },
    { fields: ['user_id'] },
    { fields: ['created_at'] },
  ],
});

module.exports = ActionLog;
