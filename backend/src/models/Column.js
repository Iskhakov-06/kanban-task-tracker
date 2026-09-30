const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Column = sequelize.define('Column', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  board_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { len: [1, 100] },
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Порядок колонки на доске',
  },
}, {
  tableName: 'columns',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['board_id', 'position']
    }
  ],
});

module.exports = Column;
