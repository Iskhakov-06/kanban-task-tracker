const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Comment = sequelize.define('Comment', {
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
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: { notEmpty: true, len: [1, 5000] },
  },
}, {
  tableName: 'comments',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['task_id'] },
    { fields: ['user_id'] },
  ],
});

module.exports = Comment;
