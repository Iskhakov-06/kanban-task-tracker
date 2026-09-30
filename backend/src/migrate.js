'use strict';

/**
 * Manual migration runner:
 *   npm run migrate          apply all pending migrations
 *   npm run migrate:down     revert the last applied migration
 *   npm run migrate:status   show applied / pending migrations
 */
require('dotenv').config();

const sequelize = require('./config/database');
const migrator = require('./migrator');

const commands = {
  up: () => migrator.up(),
  down: () => migrator.down(),
  status: async () => {
    const executed = await migrator.executed();
    const pending = await migrator.pending();
    executed.forEach((m) => console.log(`  applied  ${m.name}`));
    pending.forEach((m) => console.log(`  pending  ${m.name}`));
    if (!executed.length && !pending.length) console.log('  no migrations found');
  },
};

(async () => {
  const command = process.argv[2] || 'up';
  if (!commands[command]) {
    console.error(`Unknown command "${command}". Use: ${Object.keys(commands).join(' | ')}`);
    process.exit(1);
  }
  try {
    await commands[command]();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
