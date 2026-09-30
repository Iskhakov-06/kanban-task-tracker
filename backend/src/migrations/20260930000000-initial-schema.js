'use strict';

/**
 * Initial schema: mirrors the Sequelize models (src/models/*).
 *
 * Idempotent on purpose: a table that already exists (e.g. a database created
 * earlier by `sequelize.sync()`) is left untouched, so upgrading an existing
 * database just records this migration as applied.
 */

const { DataTypes: T } = require('sequelize');

const TABLE_OPTIONS = { charset: 'utf8mb4' };

const id = () => ({ type: T.UUID, primaryKey: true, allowNull: false });

const foreignKey = (table, { allowNull = false, onDelete = 'CASCADE' } = {}) => ({
  type: T.UUID,
  allowNull,
  references: { model: table, key: 'id' },
  onUpdate: 'CASCADE',
  onDelete,
});

const timestamps = ({ updatedAt = true } = {}) => ({
  created_at: { type: T.DATE, allowNull: false },
  ...(updatedAt ? { updated_at: { type: T.DATE, allowNull: false } } : {}),
});

async function createTable(qi, name, attributes, indexes = []) {
  const existing = await qi.showAllTables();
  if (existing.includes(name)) return;

  await qi.createTable(name, attributes, TABLE_OPTIONS);
  for (const { name: indexName, fields, unique = false } of indexes) {
    await qi.addIndex(name, fields, { name: indexName, unique });
  }
}

module.exports = {
  async up({ context: qi }) {
    await createTable(qi, 'users', {
      id: id(),
      username: { type: T.STRING(50), allowNull: false },
      email: { type: T.STRING(100), allowNull: false },
      password_hash: { type: T.STRING(255), allowNull: false },
      role: { type: T.ENUM('admin', 'moderator', 'user'), allowNull: false, defaultValue: 'user' },
      is_verified: { type: T.BOOLEAN, defaultValue: false },
      verification_token: { type: T.STRING(255), allowNull: true },
      reset_password_token: { type: T.STRING(255), allowNull: true },
      reset_password_expires: { type: T.DATE, allowNull: true },
      avatar_url: { type: T.STRING(500), allowNull: true },
      ...timestamps(),
    }, [
      { name: 'uq_users_email', fields: ['email'], unique: true },
      { name: 'uq_users_username', fields: ['username'], unique: true },
    ]);

    await createTable(qi, 'boards', {
      id: id(),
      title: { type: T.STRING(100), allowNull: false },
      description: { type: T.TEXT, allowNull: true },
      owner_id: foreignKey('users'),
      background_color: { type: T.STRING(7), defaultValue: '#0079BF' },
      ...timestamps(),
    }, [
      { name: 'idx_boards_owner_id', fields: ['owner_id'] },
    ]);

    await createTable(qi, 'board_members', {
      id: id(),
      board_id: foreignKey('boards'),
      user_id: foreignKey('users'),
      role: { type: T.ENUM('admin', 'member'), allowNull: false, defaultValue: 'member' },
      ...timestamps(),
    }, [
      { name: 'uq_board_members_board_user', fields: ['board_id', 'user_id'], unique: true },
    ]);

    await createTable(qi, 'columns', {
      id: id(),
      board_id: foreignKey('boards'),
      title: { type: T.STRING(100), allowNull: false },
      position: { type: T.INTEGER, allowNull: false, defaultValue: 0, comment: 'Порядок колонки на доске' },
      ...timestamps(),
    }, [
      { name: 'idx_columns_board_position', fields: ['board_id', 'position'] },
    ]);

    await createTable(qi, 'tasks', {
      id: id(),
      column_id: foreignKey('columns', { allowNull: true }),
      title: { type: T.STRING(200), allowNull: false },
      description: { type: T.TEXT, allowNull: true },
      assignee_id: foreignKey('users', { allowNull: true, onDelete: 'SET NULL' }),
      created_by: foreignKey('users'),
      priority: { type: T.ENUM('low', 'medium', 'high', 'critical'), allowNull: false, defaultValue: 'medium' },
      due_date: { type: T.DATE, allowNull: true },
      position: { type: T.INTEGER, allowNull: false, defaultValue: 0, comment: 'Порядок задачи внутри колонки' },
      ...timestamps(),
    }, [
      { name: 'idx_tasks_column_id', fields: ['column_id'] },
      { name: 'idx_tasks_assignee_id', fields: ['assignee_id'] },
      { name: 'idx_tasks_created_by', fields: ['created_by'] },
      { name: 'idx_tasks_priority', fields: ['priority'] },
      { name: 'idx_tasks_due_date', fields: ['due_date'] },
    ]);

    await createTable(qi, 'comments', {
      id: id(),
      task_id: foreignKey('tasks'),
      user_id: foreignKey('users'),
      body: { type: T.TEXT, allowNull: false },
      ...timestamps(),
    }, [
      { name: 'idx_comments_task_id', fields: ['task_id'] },
      { name: 'idx_comments_user_id', fields: ['user_id'] },
    ]);

    await createTable(qi, 'action_logs', {
      id: id(),
      task_id: foreignKey('tasks'),
      user_id: foreignKey('users'),
      action: {
        type: T.ENUM(
          'created', 'moved', 'assigned', 'commented',
          'priority_changed', 'due_date_changed', 'title_changed'
        ),
        allowNull: false,
      },
      payload: { type: T.JSON, allowNull: true },
      ...timestamps({ updatedAt: false }),
    }, [
      { name: 'idx_action_logs_task_id', fields: ['task_id'] },
      { name: 'idx_action_logs_user_id', fields: ['user_id'] },
      { name: 'idx_action_logs_created_at', fields: ['created_at'] },
    ]);

    await createTable(qi, 'refresh_tokens', {
      id: id(),
      user_id: foreignKey('users'),
      // VARCHAR, not TEXT: MySQL can't put a unique index on TEXT without a key length
      token: { type: T.STRING(500), allowNull: false },
      expires_at: { type: T.DATE, allowNull: false },
      is_revoked: { type: T.BOOLEAN, defaultValue: false },
      user_agent: { type: T.STRING(300), allowNull: true },
      ip_address: { type: T.STRING(45), allowNull: true },
      ...timestamps({ updatedAt: false }),
    }, [
      { name: 'uq_refresh_tokens_token', fields: ['token'], unique: true },
      { name: 'idx_refresh_tokens_user_id', fields: ['user_id'] },
      { name: 'idx_refresh_tokens_expires_at', fields: ['expires_at'] },
    ]);
  },

  async down({ context: qi }) {
    // children first, parents last
    for (const table of [
      'refresh_tokens', 'action_logs', 'comments', 'tasks',
      'columns', 'board_members', 'boards', 'users',
    ]) {
      await qi.dropTable(table);
    }
  },
};
