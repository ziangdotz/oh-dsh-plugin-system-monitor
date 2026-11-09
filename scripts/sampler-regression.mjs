import assert from 'node:assert/strict'
import os from 'node:os'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { Sampler } from '../lib/index.js'

const record = (monoMs, extra = {}) => ({ v: 1, monoMs, ts: monoMs, procs: [{ pid: 100, cmd: 'fixture', start: '123456789012345678', thr: 1, time: monoMs / 1000, rss: 1024 }], net: [{ id: 'n', name: 'net', rx: monoMs, tx: monoMs }], disks: [], errors: [], ...extra })
const sampler = new Sampler()
sampler.accept(record(1000))
sampler.accept(record(3000, { ts: 1 }))
assert.equal(sampler.net.rxBps, 1000, 'wall clock changes do not affect rates')
const retained = { cpu: sampler.cpu, procs: sampler.procs, previous: sampler.previous, sequence: sampler.sequence, hist: [...sampler.hist.t] }
for (const bad of [{ v: 2 }, { monoMs: NaN }, { procs: [null] }, { net: [{ id: 'n', name: 'n', rx: -1, tx: 0 }] }, { disks: [null] }, { errors: [3] }, { gpu: { status: "available", devices: [{ name: "gpu", dedicatedBytes: -1, sharedBytes: 0 }] } }, { topology: { physicalCores: -1, logicalProcessors: 1, packages: 1 } }]) {
  assert.throws(() => sampler.accept(record(4000, bad)))
  assert.equal(sampler.cpu, retained.cpu); assert.equal(sampler.procs, retained.procs)
  assert.equal(sampler.previous, retained.previous); assert.equal(sampler.sequence, retained.sequence)
  assert.deepEqual(sampler.hist.t, retained.hist)
}
sampler.accept(record(5000, { net: [], errors: ['network unavailable'] }))
assert.equal(sampler.net.rxBps, null); assert.equal(sampler.net.status, 'unavailable')
sampler.accept(record(7000, { net: [] }))
assert.equal(sampler.net.status, 'no-active-interface'); assert.equal(sampler.net.rxBps, null)
sampler.accept(record(9000))
assert.equal(sampler.net.rxBps, null, 'new interfaces need a baseline')
sampler.accept(record(11000))
assert.equal(sampler.net.rxBps, 1000)
sampler.accept(record(50000))
assert.equal(sampler.net.rxBps, null); assert.equal(sampler.procs[0].cpu, null)
assert.equal(sampler.hist.t.length, 1, 'long pauses reset history')
sampler.accept(record(1000))
assert.equal(sampler.net.rxBps, null, 'regressing monotonic clocks reset the baseline')
sampler.stop()

// Device removal, rapid number reuse and missing counters must not inherit stale rates.
const hotplug = new Sampler()
const disk = (id, readBytes, writeBytes = readBytes) => ({ id, name: 'PhysicalDrive2', readBytes, writeBytes })
hotplug.accept(record(1000, { disks: [disk('usb-a', 100)] }))
assert.equal(hotplug.disk.devices[0].readBps, null)
hotplug.accept(record(3000, { disks: [disk('usb-a', 300)] }))
assert.equal(hotplug.disk.devices[0].readBps, 100)
hotplug.accept(record(5000, { disks: [disk('usb-b', 10000)] }))
assert.equal(hotplug.disk.devices[0].readBps, null, 'same disk number with a different device requires a new baseline')
hotplug.accept(record(7000, { disks: [disk('usb-b', 10)] }))
assert.equal(hotplug.disk.devices[0].readBps, null, 'counter resets are missing data, not zero traffic')
hotplug.accept(record(9000, { disks: [disk('usb-b', null)] }))
assert.equal(hotplug.disk.devices.length, 1, 'devices remain visible when their counters are unavailable')
assert.equal(hotplug.disk.devices[0].readBps, null)
hotplug.accept(record(11000, { disks: [] }))
assert.equal(hotplug.disk.devices.length, 0)
hotplug.accept(record(13000, { disks: [disk('usb-b', 100)] }))
assert.equal(hotplug.disk.devices[0].readBps, null, 'reinserted devices warm up again')
const originalTotal = os.totalmem, originalFree = os.freemem, originalCpus = os.cpus
try {
  os.totalmem = () => 16 * 2 ** 30; os.freemem = () => 8 * 2 ** 30
  hotplug.accept(record(15000))
  assert.equal(hotplug.mem.total, 16 * 2 ** 30)
  os.totalmem = () => 32 * 2 ** 30
  hotplug.accept(record(17000))
  assert.equal(hotplug.mem.total, 32 * 2 ** 30)
  assert.equal(hotplug.mem.used, 24 * 2 ** 30)
  assert.ok(hotplug.hist.mem.slice(0, -1).every(v => v === null), 'old memory percentages do not span a capacity change')
  os.cpus = () => [{ model: 'Hot-added CPU', speed: 3000, times: { idle: 10, user: 20 } }]
  hotplug.accept(record(19000))
  assert.equal(hotplug.cpu.perCore.length, 1)
  assert.equal(hotplug.cpu.usage, null, 'CPU topology changes require a new baseline')
} finally { os.totalmem = originalTotal; os.freemem = originalFree; os.cpus = originalCpus; hotplug.stop() }
console.log('PASS: hotplug removal/reinsertion, disk identity reuse, counter resets, unavailable counters, memory capacity and CPU changes')

// Per-process loads sum within an engine; parallel engines must never be added together.
const gpuSampler = new Sampler()
const gpuRecord = (ts, status = 'available', entries = []) => record(ts, { gpu: { status: 'available', utilizationStatus: status, devices: [{ id: 'a', name: 'GPU', dedicatedBytes: 1, sharedBytes: 2 }], engines: entries } })
const engine = (id, usage, adapter = 'a') => ({ adapter, id, name: '3D', usage })
gpuSampler.accept(gpuRecord(1000, 'collecting'))
assert.equal(gpuSampler.gpu.devices[0].usage, null)
gpuSampler.accept(gpuRecord(3000, 'available', [engine('e0', 20), engine('e0', 30), engine('e1', 40), engine('e0', 99, 'other')]))
assert.equal(gpuSampler.gpu.devices[0].usage, 50)
assert.deepEqual(gpuSampler.gpu.devices[0].hist, [null, 50])
assert.equal(gpuSampler.gpu.engines, undefined, 'raw per-process counters are not transmitted to the browser')
gpuSampler.accept(gpuRecord(5000, 'available', [engine('e0', 0)]))
assert.equal(gpuSampler.gpu.devices[0].usage, 0, 'a measured idle GPU is a real zero')
gpuSampler.accept(gpuRecord(7000, 'available', []))
assert.equal(gpuSampler.gpu.devices[0].usage, null, 'missing adapter counters are not zero')
gpuSampler.accept(gpuRecord(9000, 'unavailable'))
assert.equal(gpuSampler.gpu.devices[0].usage, null)
for (let ts = 11000; ts < 215000; ts += 2000) gpuSampler.accept(gpuRecord(ts, 'available', [engine('e0', 60), engine('e0', 60)]))
assert.equal(gpuSampler.gpu.devices[0].usage, 100)
assert.equal(gpuSampler.gpu.devices[0].hist.length, 90)
gpuSampler.accept(gpuRecord(300000, 'collecting'))
assert.deepEqual(gpuSampler.gpu.devices[0].hist, [null])
assert.throws(() => gpuSampler.accept(gpuRecord(302000, 'available', [engine('e0', NaN)])))
gpuSampler.accept(record(304000, { gpu: { status: 'available', devices: [] } }))
assert.equal(gpuSampler.gpu.devices.length, 0)
assert.equal(gpuSampler.gpuHistory.size, 0, 'removed GPU history is discarded')
gpuSampler.accept(gpuRecord(306000, 'collecting'))
assert.deepEqual(gpuSampler.gpu.devices[0].hist, [null], 'reinserted GPUs do not inherit old history')

gpuSampler.stop(); assert.equal(gpuSampler.gpuHistory.size, 0)
console.log('PASS: GPU engine aggregation, adapter identity, warmup, idle/unavailable, capped histories and disposal')

let worker
const subject = new Sampler({ spawnWorker() {
  worker = new EventEmitter(); worker.stdout = new PassThrough(); worker.stderr = new PassThrough()
  worker.unref = () => {}; worker.kill = () => { worker.killed = true }
  return worker
} })
const emit = (target, ms) => target.stdout.write(JSON.stringify(record(ms)) + '\n')
try {
  const first = subject.getSnapshot(); emit(worker, 1000); const snapshot = await first
  subject.lastRequestAt = Date.now() - 7000; subject.checkHealth()
  assert.equal(subject.worker, null)
  let resolved = false
  const second = subject.getSnapshot().then(value => { resolved = true; return value })
  await Promise.resolve(); assert.equal(resolved, false, 'restart must wait for current worker')
  emit(worker, 3000); const resumed = await second
  assert.ok(resumed.generation > snapshot.generation); assert.equal(resumed.hist.t.length, 1)
  const old = worker; old.emit('close')
  const crashed = subject.getSnapshot(); const rejection = assert.rejects(crashed, /stopped/)
  worker.emit('close'); await rejection
  const restarted = subject.getSnapshot(); const current = worker
  emit(old, 9999); assert.equal(subject.ready, false, 'old worker output is ignored')
  emit(current, 5000); await restarted
  subject.lastRequestAt = Date.now(); subject.updatedAt = subject.workerStartedAt = Date.now() - 16000
  subject.checkHealth(); assert.equal(subject.worker, null); assert.match(subject.error, /timed out/)
  const stalled = subject.getSnapshot(); const timeoutFailure = assert.rejects(stalled, /timed out/)
  subject.updatedAt = subject.workerStartedAt = Date.now() - 16000
  subject.checkHealth(); await timeoutFailure
  const invalid = subject.getSnapshot(); const invalidFailure = assert.rejects(invalid, /Invalid/)
  worker.stdout.write('{bad}\n'); await invalidFailure
  subject.stopWorker()
  const disposing = subject.getSnapshot(); const disposeFailure = assert.rejects(disposing, /Waiting/)
  subject.stop(); await disposeFailure
} finally { subject.stop() }
console.log('PASS: atomic validation, monotonic rates, missing interfaces, long gaps, idle restart, crash, stale worker, timeout, malformed output and disposal')
