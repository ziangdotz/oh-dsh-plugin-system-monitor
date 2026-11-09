import { spawnSync } from 'node:child_process'
const commands = [
  ['scripts/build-client.mjs', '--check'],
  ['--check', 'lib/index.js'], ['--check', 'lib/client.js'],
  ['scripts/bundle-check.mjs'], ['scripts/sampler-regression.mjs'],
  ['scripts/host-smoke.mjs'], ['scripts/native-smoke.mjs'],
  ['scripts/client-smoke.mjs'],
]
for (const args of commands) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', windowsHide: true })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
