/** Windows 10/11 sampler: shared, demand-driven native worker. */
import { spawn, execFile } from 'node:child_process'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'
export const name = 'SysMon（System Monitor）'
export const inject = ['connection']
export const workerPath = fileURLToPath(new URL(`./native/win32-${process.arch}/sysmon-probe.exe`, import.meta.url))
const protectedPids = new Set([process.pid, process.ppid])
const supported = process.platform === 'win32' && os.release().startsWith('10.0.') && Number(os.release().split('.')[2]) >= 10240 && !/server/i.test(os.version())
const sum = (items, key) => items.reduce((n, item) => n + (item[key] || 0), 0)
const rate = (a, b, dt) => !Number.isFinite(a) || !Number.isFinite(b) || dt <= 0 ? null : a < b ? null : (a - b) / dt
export class Sampler {
  constructor({ spawnWorker = spawn } = {}) {
    this.spawnWorker = spawnWorker; this.ready = false; this.sequence = 0; this.generation = 0
    this.worker = null; this.timer = null; this.lastRequestAt = 0; this.updatedAt = 0
    this.previous = null; this.prevCpu = null; this.error = null; this.stopped = false
    this.hist = { t: [], cpu: [], mem: [], rx: [], tx: [] }
    this.waiters = new Set()
    this.gpuHistory = new Map()
  }
  start() {
    if (this.timer) return
    this.timer = setInterval(() => this.checkHealth(), 1000)
    this.timer.unref?.()
  }
  checkHealth() {
    if (!this.waiters.size && Date.now() - this.lastRequestAt > 6000) this.stopWorker()
    else if (this.worker && Date.now() - Math.max(this.updatedAt, this.workerStartedAt) > 15000) {
      this.error = 'Windows collector timed out'; this.stopWorker(); this.wakeWaiters()
    }
  }
  wakeWaiters() { for (const done of this.waiters) done(); this.waiters.clear() }
  ensureWorker() {
    if (this.worker || this.stopped) return
    this.error = null; this.previous = null; this.prevCpu = null; this.ready = false; this.generation++
    for (const values of Object.values(this.hist)) values.length = 0
    const worker = this.spawnWorker(workerPath, ['--parent', String(process.pid)], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    this.worker = worker; this.workerStartedAt = Date.now()
    if (worker.pid) protectedPids.add(worker.pid)
    worker.unref(); worker.stdout.unref?.(); worker.stderr.unref?.()
    const lines = createInterface({ input: worker.stdout })
    lines.on('line', line => {
      if (this.worker !== worker) return
      try { this.accept(JSON.parse(line)) } catch { this.error = 'Invalid Windows collector response'; this.wakeWaiters() }
    })
    worker.stderr.on('data', () => { if (this.worker === worker) { this.error = 'Windows native collector failed'; this.wakeWaiters() } })
    worker.on('error', () => { if (this.worker === worker) { this.error = `Cannot start native collector for ${process.arch}; check the packaged executable`; this.wakeWaiters() } })
    worker.on('close', () => {
      lines.close(); protectedPids.delete(worker.pid)
      if (this.worker === worker) { this.worker = null; this.ready = false; this.error ||= 'Windows collector stopped'; this.wakeWaiters() }
    })
  }
  stopWorker() { const worker = this.worker; this.worker = null; this.ready = false; worker?.kill() }
  stop() {
    this.stopped = true; clearInterval(this.timer); this.timer = null; this.stopWorker()
    for (const done of this.waiters) done()
    this.waiters.clear()
    this.previous = null; this.prevCpu = null; this.procs = []
    this.gpu = null; this.topology = null; this.cpu = null; this.mem = null; this.net = null; this.disk = null
    for (const values of Object.values(this.hist)) values.length = 0
    this.gpuHistory.clear()
  }
  accept(sample) {
    const nonnegative = x => Number.isFinite(x) && x >= 0
    const optional = x => x === null || nonnegative(x)
    if (!sample || sample.v !== 1 || !nonnegative(sample.ts) || !nonnegative(sample.monoMs)
      || !Array.isArray(sample.procs) || !sample.procs.every(p => p && Number.isSafeInteger(p.pid) && p.pid >= 0 && typeof p.cmd === 'string' && (p.start === null || typeof p.start === 'string' && /^\d{10,20}$/.test(p.start)) && optional(p.time) && optional(p.rss) && Number.isSafeInteger(p.thr) && p.thr >= 0)
      || !Array.isArray(sample.net) || !sample.net.every(n => n && typeof n.id === 'string' && typeof n.name === 'string' && nonnegative(n.rx) && nonnegative(n.tx))
      || !Array.isArray(sample.disks) || !sample.disks.every(d => d && typeof d.name === 'string' && optional(d.readBytes) && optional(d.writeBytes) && (d.id === undefined || typeof d.id === 'string'))
      || sample.gpu !== undefined && (!sample.gpu || !['available', 'unavailable'].includes(sample.gpu.status) || !Array.isArray(sample.gpu.devices) || !sample.gpu.devices.every(g => g && typeof g.name === 'string' && nonnegative(g.dedicatedBytes) && nonnegative(g.sharedBytes) && (g.id === undefined || typeof g.id === 'string')))
      || sample.gpu !== undefined && sample.gpu.utilizationStatus !== undefined && !['available', 'collecting', 'unavailable'].includes(sample.gpu.utilizationStatus)
      || sample.gpu !== undefined && sample.gpu.engines !== undefined && (!Array.isArray(sample.gpu.engines) || !sample.gpu.engines.every(e => e && typeof e.adapter === 'string' && typeof e.id === 'string' && typeof e.name === 'string' && nonnegative(e.usage)))
      || sample.topology !== undefined && (!sample.topology || !optional(sample.topology.physicalCores) || !optional(sample.topology.packages) || !nonnegative(sample.topology.logicalProcessors))
      || !Array.isArray(sample.errors) || !sample.errors.every(e => typeof e === 'string')) throw new Error('invalid sample')
    const elapsed = this.previous ? sample.monoMs - this.previous.monoMs : 0
    const continuous = elapsed > 0 && elapsed <= 10000
    const previous = continuous ? this.previous : null
    const now = Date.now(), cpus = os.cpus()
    const prevCpu = continuous && this.prevCpu?.length === cpus.length ? this.prevCpu : null
    const cpuModel = cpus[0]?.model, cores = Math.max(1, cpus.length)
    const totals = cpus.map(c => ({ idle: c.times.idle, total: Object.values(c.times).reduce((a, b) => a + b, 0) }))
    const usage = (cur, prev) => !prev || cur.total <= prev.total ? null : Math.max(0, Math.min(100, 100 * (1 - (cur.idle - prev.idle) / (cur.total - prev.total))))
    const cpu = {
      usage: usage({ idle: sum(totals, 'idle'), total: sum(totals, 'total') }, prevCpu && { idle: sum(prevCpu, 'idle'), total: sum(prevCpu, 'total') }),
      perCore: totals.map((cur, i) => usage(cur, prevCpu?.[i])), freqMHz: cpus.map(c => c.speed),
    }
    const dt = continuous ? elapsed / 1000 : 0
    const prevProcs = new Map(previous?.procs.map(p => [p.pid, p]) || [])
    const total = os.totalmem(), available = os.freemem()
    const mem = { total, available, used: total - available }
    const procs = sample.procs.map(p => ({ ...p }))
    for (const p of procs) {
      const prev = prevProcs.get(p.pid)
      p.cpu = prev && p.start && prev.start === p.start && Number.isFinite(p.time) && Number.isFinite(prev.time) && dt > 0 ? Math.max(0, Math.min(100, 100 * (p.time - prev.time) / dt / cores)) : null
      p.mem = Number.isFinite(p.rss) ? p.rss / total * 100 : null
    }
    const prevNet = new Map(previous?.net.map(n => [n.id, n]) || [])
    const ifaces = sample.net.map(n => ({ name: n.name, rxBps: rate(n.rx, prevNet.get(n.id)?.rx, dt), txBps: rate(n.tx, prevNet.get(n.id)?.tx, dt) }))
    const aggregate = (items, key) => items.some(item => Number.isFinite(item[key])) ? sum(items, key) : null
    const net = { rxBps: aggregate(ifaces, 'rxBps'), txBps: aggregate(ifaces, 'txBps'), status: sample.errors.includes('network unavailable') ? 'unavailable' : ifaces.length ? 'active' : 'no-active-interface', ifaces }
    const prevDisks = new Map(previous?.disks.map(d => [d.id || d.name, d]) || [])
    const devices = sample.disks.map(d => ({
      id: d.id || d.name, name: d.name, readBps: rate(d.readBytes, prevDisks.get(d.id || d.name)?.readBytes, dt), writeBps: rate(d.writeBytes, prevDisks.get(d.id || d.name)?.writeBytes, dt),
    }))
    const disk = {
      readBps: devices.some(d => Number.isFinite(d.readBps)) ? sum(devices, 'readBps') : null,
      writeBps: devices.some(d => Number.isFinite(d.writeBps)) ? sum(devices, 'writeBps') : null, devices,
    }
    const gpuHistory = continuous ? new Map(this.gpuHistory) : new Map()
    const { engines: rawGpuEngines, ...gpuMetadata } = sample.gpu || {}
    const gpu = sample.gpu ? { ...gpuMetadata, devices: sample.gpu.devices.map((device, index) => {
      const id = device.id || String(index)
      const engines = new Map()
      for (const entry of rawGpuEngines || []) {
        if (entry.adapter !== device.id) continue
        const engine = engines.get(entry.id) || { id: entry.id, name: entry.name, usage: 0 }
        engine.usage += entry.usage; engines.set(entry.id, engine)
      }
      const engineValues = [...engines.values()].map(e => ({ ...e, usage: Math.min(100, e.usage) }))
      const usage = sample.gpu.utilizationStatus === 'available' && engineValues.length ? Math.max(...engineValues.map(e => e.usage)) : null
      const hist = [...(gpuHistory.get(id) || []), usage].slice(-90)
      gpuHistory.set(id, hist)
      return { ...device, usage, engines: engineValues, hist }
    }) } : null
    const activeGpuIds = new Set(gpu?.devices.map((g, i) => g.id || String(i)))
    for (const id of gpuHistory.keys()) if (!activeGpuIds.has(id)) gpuHistory.delete(id)
    const capacityChanged = this.mem && this.mem.total !== total
    Object.assign(this, { cpuModel, cores, cpu, mem, procs, net, disk, gpu, gpuHistory, topology: sample.topology || null, prevCpu: totals, warnings: sample.errors, previous: sample, updatedAt: now, sampledAt: sample.ts, error: null, ready: true })
    if (capacityChanged) this.hist.mem.fill(null)
    this.sequence++
    if (!continuous) for (const values of Object.values(this.hist)) values.length = 0
    for (const [key, value] of Object.entries({ t: now / 1000, cpu: this.cpu.usage, mem: this.mem.used / total * 100, rx: this.net.rxBps, tx: this.net.txBps })) {
      this.hist[key].push(value); if (this.hist[key].length > 90) this.hist[key].shift()
    }
    for (const done of this.waiters) done()
    this.waiters.clear()
  }
  async getSnapshot() {
    if (!supported) throw new Error('Only Windows 10 and Windows 11 are supported')
    if (this.stopped) throw new Error('Collector disposed')
    this.start(); this.lastRequestAt = Date.now(); this.ensureWorker()
    const generation = this.generation
    if (!this.ready && !this.error) await new Promise(resolve => {
      const done = () => { clearTimeout(timeout); this.waiters.delete(done); resolve() }
      const timeout = setTimeout(done, 10000); this.waiters.add(done)
    })
    if (this.stopped || generation !== this.generation || !this.ready || !this.updatedAt || this.error || Date.now() - this.updatedAt > 15000) throw new Error(this.error || 'Waiting for Windows collector')
    return { v: 1, ts: this.updatedAt, sampledAt: this.sampledAt, sequence: this.sequence, generation: this.generation,
      host: { hostname: os.hostname(), platform: 'win32', arch: os.arch(), kernel: os.release(), osName: Number(os.release().split('.')[2]) >= 22000 ? 'Windows 11' : 'Windows 10', uptime: os.uptime(), cpuModel: this.cpuModel, cores: this.cores, topology: this.topology },
      cpu: this.cpu, mem: this.mem, net: this.net, disk: this.disk, gpu: this.gpu,
      counts: { total: this.procs.length, threads: sum(this.procs, 'thr') }, procs: this.procs,
      hist: { ...this.hist, step: 2000 }, warnings: this.warnings,
      capabilities: { terminate: true, processCpu: 'machine-percent', gpuUsage: 'busiest-engine' } }
  }
}
export const createSampler = () => new Sampler()
export async function collectOnce() {
  const sampler = createSampler()
  try { return await sampler.getSnapshot() } finally { sampler.stop() }
}
export async function killProcess(pid, signal = 'KILL', start) {
  const fail = (error, status = 400) => ({ status, body: { ok: false, error } })
  if (!Number.isSafeInteger(pid) || pid <= 4 || protectedPids.has(pid)) return fail('Protected or invalid process ID')
  if (signal !== 'KILL') return fail('Windows supports the KILL action only')
  if (typeof start !== 'string' || !/^\d{10,20}$/.test(start)) return fail('Process identity is required; refresh and select again')
  if (!supported) return fail('Windows 10/11 required')
  return new Promise(resolve => execFile(workerPath, ['--kill', String(pid), start], { windowsHide: true, timeout: 5000, maxBuffer: 4096 }, (error, stdout) => {
    resolve(error ? fail(stdout.trim() || 'Unable to end process (permission denied or process exited)') : { status: 200, body: { ok: true } })
  }))
}
const json = (body, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
export async function handleSnapshotRequest(sampler, request) {
  if (new URL(request.url).pathname !== '/api/sysmon.snapshot') return json({ error: 'not found' }, 404)
  if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405)
  try { return json(await sampler.getSnapshot()) } catch (error) { return json({ error: error.message }, 503) }
}
export async function handleKillRequest(request) {
  if (new URL(request.url).pathname !== '/api/sysmon.kill') return json({ ok: false, error: 'not found' }, 404)
  if (request.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405)
  try {
    const payload = await request.json()
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return json({ ok: false, error: 'Invalid request body' }, 400)
    const result = await killProcess(payload.pid, payload.signal, payload.start); return json(result.body, result.status)
  } catch { return json({ ok: false, error: 'Invalid JSON body' }, 400) }
}
export function apply(ctx) {
  const sampler = createSampler()
  ctx.effect(() => { sampler.start(); return () => sampler.stop() }, 'sysmon: sampler')
  for (const [routePath, handler] of [['/api/sysmon.snapshot', request => handleSnapshotRequest(sampler, request)], ['/api/sysmon.kill', handleKillRequest]]) {
    ctx.effect(() => ctx.connection.fetch.register({ path: routePath, methods: ['GET', 'POST'], requestBody: 'buffered', fetch: handler }), routePath)
  }
}
