const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Промежуточная таблица: участники доски с ролью
const BoardMember = sequelize.define('BoardMember', {
  id: {
    type:         DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey:   true,
  },
  board_id: {
    type:      DataTypes.UUID,
    allowNull: false,
  },
  user_id: {
    type:      DataTypes.UUID,
    allowNull: false,
  },
  role: {
    type:         DataTypes.ENUM('admin', 'member'),
    defaultValue: 'member',
    allowNull:    false,
  },
}, {
  tableName:   'board_members',
  timestamps:  true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['board_id', 'user_id'] },
  ],
});

module.exports = BoardMember;
