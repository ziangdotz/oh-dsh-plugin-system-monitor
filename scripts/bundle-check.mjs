/** Verify the installable Host/Client bundle contract without starting a collector. */
import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import vm from 'node:vm'
import { createHash } from 'node:crypto'

const root = new URL('../', import.meta.url)
const read = relative => readFile(new URL(relative, root), 'utf8')
const manifest = JSON.parse(await read('package.json'))
assert.equal(manifest.dsh.manifestVersion, 1)
assert.deepEqual(manifest.dsh.bundle.platforms, ['win32'])
assert.equal(manifest.dsh.client.platform, 'web')
assert.ok(manifest.engines.dsh)
for (const target of Object.values(manifest.exports).filter(target => !target.includes('*'))) {
  await access(new URL(target, root))
}
const executable = new URL('lib/native/win32-x64/sysmon-probe.exe', root)
await access(executable)
assert.equal((await readFile(executable)).subarray(0, 2).toString(), 'MZ')
const build = JSON.parse(await read('lib/native/win32-x64/build.json'))
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
assert.equal(build.target, 'win32-x64')
assert.equal(build.sourceSha256, hash(await readFile(new URL('native/sysmon.c', root))))
assert.equal(build.binarySha256, hash(await readFile(executable)))
assert.match(await read(manifest.dsh.bundle.patch), /id: 'SysMon（System Monitor）'\s+name: 'dsh-plugin-sysmon'/)
const host = await import(new URL(manifest.main, root))
assert.equal(typeof host.apply, 'function')
assert.equal(host.name, 'SysMon（System Monitor）')
assert.deepEqual(host.inject, ['connection'])
let registration
vm.runInNewContext(await read(manifest.exports['./client']), {
  window: { __ModuleLoader__: { load(value) { registration = value } } },
})
assert.equal(registration.id, manifest.name)
assert.equal(typeof registration.factory, 'function')
for (const language of ['en', 'zh']) {
  const { meta } = JSON.parse(await read(`locale/${language}.json`))
  assert.ok(meta.title && meta.description)
  await access(new URL(meta.detail, root))
}
console.log('PASS: bundle manifest, exports, Host injection, lazy Client registration and localized metadata')
