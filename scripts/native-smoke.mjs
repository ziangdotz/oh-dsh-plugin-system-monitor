import assert from 'node:assert/strict'
import { copyFile, mkdir } from 'node:fs/promises'
import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { once } from 'node:events'
import { createInterface } from 'node:readline'
import { resolve } from 'node:path'
import { workerPath } from '../lib/index.js'
const run = promisify(execFile), sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
for (const args of [[], ['--watch-memory', '0'], ['--kill', '0', '1'], ['--kill', '-1', '1'], ['--kill', '4294967296', '1'], ['--kill', '999999999999999999999999', '1'], ['--kill', '1x', '1']]) {
  await assert.rejects(run(workerPath, args, { windowsHide: true, timeout: 5000 }))
}
await mkdir('artifacts', { recursive: true })
const unicodePath = resolve('artifacts/采集器-é.exe')
await copyFile(workerPath, unicodePath)
const child = spawn(unicodePath, ['--parent', String(process.pid)], { windowsHide: true })
const lines = createInterface({ input: child.stdout })
try {
  const [line] = await once(lines, 'line')
  const sample = JSON.parse(line)
  assert.ok(sample.procs.some(p => p.pid === child.pid && p.cmd === '采集器-é.exe'))
  assert.ok(sample.disks.every(d => typeof d.id === 'string' && d.id.includes(d.name)))
  assert.ok(sample.topology.logicalProcessors > 0)
  const [nextLine] = await once(lines, 'line')
  const nextSample = JSON.parse(nextLine)
  assert.ok(nextSample.monoMs > sample.monoMs)
  assert.ok(nextSample.disks.every(d => typeof d.id === 'string'))
  assert.ok(sample.procs.every(p => p.start === null || /^\d{10,20}$/.test(p.start)))
  console.log('PASS: malformed native commands refused; Unicode names and process identities preserved')
} finally { lines.close(); child.kill() }
const parent = spawn(process.execPath, ['--input-type=module', '-e', `
import {spawn} from 'node:child_process';
const child=spawn(${JSON.stringify(workerPath)},['--parent',String(process.pid)],{windowsHide:true,stdio:'ignore'});
child.once('spawn',()=>console.log(child.pid));setInterval(()=>{},1000);
`], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
const parentLines = createInterface({ input: parent.stdout })
let meter
try {
  const [line] = await once(parentLines, 'line')
  const pid = Number(line)
  assert.ok(Number.isSafeInteger(pid))
  await run(workerPath, ['--memory', String(pid)], { windowsHide: true, timeout: 5000 })
  meter = spawn(workerPath, ['--watch-memory', String(parent.pid)], { windowsHide: true })
  const meterClosed = once(meter, 'close')
  const [firstMemory] = await once(meter.stdout, 'data')
  assert.ok(JSON.parse(firstMemory.toString()).workingSet > 0)
  parent.kill()
  await meterClosed
  await sleep(2500)
  await assert.rejects(run(workerPath, ['--memory', String(pid)], { windowsHide: true, timeout: 5000 }))
  console.log('PASS: collector exits after its owning Host exits')
} finally { meter?.kill(); parentLines.close(); parent.kill() }
