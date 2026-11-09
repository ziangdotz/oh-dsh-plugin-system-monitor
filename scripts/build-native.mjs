import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
if (process.platform !== 'win32' || process.arch !== 'x64') throw Error('This build requires Windows x64 and MinGW-w64 GCC')
const output = new URL('../lib/native/win32-x64/sysmon-probe.exe', import.meta.url)
mkdirSync(new URL('.', output), { recursive: true })
const { fileURLToPath } = await import('node:url')
const compiler = process.env.CC || 'gcc'
const result = spawnSync(compiler, ['-std=c11', '-Os', '-s', '-Wall', '-Wextra', '-Werror', '-static-libgcc',
  fileURLToPath(new URL('../native/sysmon.c', import.meta.url)), '-o', fileURLToPath(output), '-liphlpapi', '-lpsapi', '-ldxgi', '-lpdh', '-lcfgmgr32'],
{ stdio: 'inherit', windowsHide: true })
if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex')
writeFileSync(new URL('./build.json', output), JSON.stringify({
  target: 'win32-x64', sourceSha256: hash(new URL('../native/sysmon.c', import.meta.url)), binarySha256: hash(output),
}, null, 2) + '\n')
console.log('Built Windows x64 collector')
