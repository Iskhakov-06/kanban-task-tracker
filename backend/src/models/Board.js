const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Board = sequelize.define('Board', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100],
      notEmpty: true,
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  owner_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  background_color: {
    type: DataTypes.STRING(7),  // hex
    defaultValue: '#0079BF',
  },
}, {
  tableName: 'boards',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['owner_id'] },
  ],
});

module.exports = Board;
