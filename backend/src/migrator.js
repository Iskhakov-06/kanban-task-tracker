'use strict';

const { Umzug, SequelizeStorage } = require('umzug');
const sequelize = require('./config/database');
const logger = require('./config/logger');

/**
 * Schema migrations (src/migrations/*.js), applied in filename order.
 * Applied migrations are recorded in the "SequelizeMeta" table.
 */
const migrator = new Umzug({
  migrations: { glob: ['migrations/*.js', { cwd: __dirname }] },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: {
    info: (msg) => {
      if (msg.event === 'migrating') logger.info(`Миграция: применяется ${msg.name}`);
      else if (msg.event === 'migrated') logger.info(`Миграция: ${msg.name} применена (${msg.durationSeconds}s)`);
      else if (msg.event === 'reverting') logger.info(`Миграция: откатывается ${msg.name}`);
      else if (msg.event === 'reverted') logger.info(`Миграция: ${msg.name} откачена (${msg.durationSeconds}s)`);
    },
    warn: (msg) => logger.warn(msg),
    error: (msg) => logger.error(msg),
    debug: () => {},
  },
});

module.exports = migrator;
