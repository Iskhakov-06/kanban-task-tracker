const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  token: {
    type: DataTypes.STRING(500),   // TEXT can't be indexed in MySQL without a key length
    allowNull: false,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  is_revoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  user_agent: {
    type: DataTypes.STRING(300),
    allowNull: true,
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
}, {
  tableName: 'refresh_tokens',
  timestamps: true,
  underscored: true,
  updatedAt: false,
  indexes: [
    { name: 'uq_refresh_token', unique: true, fields: ['token'] },
    { fields: ['user_id'] },
    { fields: ['expires_at'] },
  ],
});

module.exports = RefreshToken;
