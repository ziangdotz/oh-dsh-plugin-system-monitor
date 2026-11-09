/** Repeatable real-process memory measurement; never trims working sets or forces GC. */
import fs from 'node:fs'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { createSampler, workerPath } from '../lib/index.js'
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const seconds = Number(process.env.SYSMON_MEMORY_SECONDS || 60)
if (!Number.isFinite(seconds) || seconds < 10 || seconds > 3600) throw Error('SYSMON_MEMORY_SECONDS must be 10–3600')
const mib = n => +(n / 1048576).toFixed(3)
const memory = () => {
  const m = process.memoryUsage()
  return { rss: m.rss, heapUsed: m.heapUsed, external: m.external }
}
function watchMemory(pid) {
  const child = spawn(workerPath, ['--watch-memory', String(pid)], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  const lines = createInterface({ input: child.stdout })
  let latest
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Memory meter timed out')), 5000)
    child.once('error', error => { clearTimeout(timer); reject(error) })
    child.once('close', () => { if (!latest) { clearTimeout(timer); reject(Error('Memory meter stopped')) } })
    lines.on('line', line => {
      try { latest = JSON.parse(line); clearTimeout(timer); resolve() } catch (error) { reject(error) }
    })
  })
  return { ready, latest: () => latest, stop: () => { lines.close(); child.kill() } }
}
const sampler = createSampler(), keepAlive = setInterval(() => {}, 1000)
const samples = [], hostMeter = watchMemory(process.pid)
let collectorMeter
try {
  await hostMeter.ready
  const baseline = memory(), baselinePrivateBytes = hostMeter.latest().privateBytes
  await sampler.getSnapshot()
  collectorMeter = watchMemory(sampler.worker.pid)
  await collectorMeter.ready
  const began = Date.now()
  while (Date.now() - began < seconds * 1000) {
    const snapshot = await sampler.getSnapshot()
    const hostCpu = process.cpuUsage()
    samples.push({ measuredAt: Date.now(), sampledAt: snapshot.sampledAt, collectorCpuSeconds: snapshot.procs.find(p => p.pid === sampler.worker.pid)?.time, hostCpuSeconds: (hostCpu.user + hostCpu.system) / 1000000, elapsed: Date.now() - began, collector: collectorMeter.latest(), host: memory(), hostPrivateBytes: hostMeter.latest().privateBytes, processes: snapshot.procs.length, warnings: snapshot.warnings })
    if (samples.length % 15 === 0) console.log(`Measured ${samples.length} samples, ${Math.round((Date.now() - began) / 1000)}s`)
    await sleep(2000)
  }
  const stats = values => ({ minMiB: mib(Math.min(...values)), meanMiB: mib(values.reduce((a, b) => a + b, 0) / values.length), maxMiB: mib(Math.max(...values)), firstMiB: mib(values[0]), lastMiB: mib(values.at(-1)) })
  const logicalProcessors = os.cpus().length
  const cpuStats = (cpuKey, timeKey) => {
    const rates = []
    for (let i = 1; i < samples.length; i++) {
      const current = samples[i], previous = samples[i - 1]
      const elapsed = (current[timeKey] - previous[timeKey]) / 1000
      if (elapsed > 0 && Number.isFinite(current[cpuKey]) && Number.isFinite(previous[cpuKey]))
        rates.push(100 * (current[cpuKey] - previous[cpuKey]) / elapsed / logicalProcessors)
    }
    const first = samples[0], last = samples.at(-1)
    return { meanMachinePercent: +(100 * (last[cpuKey] - first[cpuKey]) / ((last[timeKey] - first[timeKey]) / 1000) / logicalProcessors).toFixed(4), peakSampleMachinePercent: +Math.max(...rates).toFixed(4) }
  }
  await sleep(8000)
  const report = {
    measuredAt: new Date().toISOString(), logicalProcessors, cpu: { collector: cpuStats('collectorCpuSeconds', 'sampledAt'), isolatedHost: cpuStats('hostCpuSeconds', 'measuredAt') },
    durationSeconds: seconds, forcedGC: false, workingSetTrim: false, meter: 'persistent-native-processes-excluded-from-plugin-results',
    collector: { workingSet: stats(samples.map(s => s.collector.workingSet)), privateBytes: stats(samples.map(s => s.collector.privateBytes)), firstHandles: samples[0].collector.handles, lastHandles: samples.at(-1).collector.handles },
    host: { baseline, baselinePrivateBytes, privateBytesDelta: stats(samples.map(s => s.hostPrivateBytes - baselinePrivateBytes)), rssDelta: stats(samples.map(s => s.host.rss - baseline.rss)), heapDelta: stats(samples.map(s => s.host.heapUsed - baseline.heapUsed)) },
    workerStoppedAfterIdle: sampler.worker === null, samples,
  }
  fs.mkdirSync('artifacts', { recursive: true })
  const target = process.env.SYSMON_MEMORY_REPORT || 'artifacts/memory-native.json'
  fs.writeFileSync(target, JSON.stringify(report, null, 2))
  const { samples: _, ...summary } = report
  console.log(JSON.stringify(summary, null, 2))
} finally { collectorMeter?.stop(); hostMeter.stop(); sampler.stop(); clearInterval(keepAlive) }
