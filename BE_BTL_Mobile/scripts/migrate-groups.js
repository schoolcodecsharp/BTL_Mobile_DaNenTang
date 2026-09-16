require('dotenv').config();
const { sequelize } = require('../models');
const { migrateGroups } = require('../migrations/groups');

(async () => {
  try {
    await sequelize.authenticate();
    await migrateGroups();
    console.log('Group/session migration complete. Existing data preserved.');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally { await sequelize.close(); }
})();
