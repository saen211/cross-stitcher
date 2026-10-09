// Builds a static export into ./out (cross-platform way to set STATIC_EXPORT).
const { spawnSync } = require('child_process');

const result = spawnSync('npx', ['next', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, STATIC_EXPORT: 'true' },
});

process.exit(result.status ?? 1);
