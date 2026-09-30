const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  column_id: {
    type: DataTypes.UUID,
    references: {
      model: 'columns',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: { len: [1, 200] },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  assignee_id: {
    type: DataTypes.UUID,
    allowNull: true,  // задача может быть без исполнителя
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium',
    allowNull: false,
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Порядок задачи внутри колонки',
  },
}, {
  tableName: 'tasks',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['column_id'] },
    { fields: ['assignee_id'] },
    { fields: ['created_by'] },
    { fields: ['priority'] },
    { fields: ['due_date'] },
  ],
});

module.exports = Task;
