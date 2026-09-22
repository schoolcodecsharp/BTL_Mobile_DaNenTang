// Compatibility entry point for the former manual migration command.
const path = require('path');
const { spawnSync } = require('child_process');
const result = spawnSync(process.execPath,
  [require.resolve('sequelize-cli/lib/sequelize'), 'db:migrate'],
  { cwd: path.resolve(__dirname), stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
