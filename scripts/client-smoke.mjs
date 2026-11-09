import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import { pathToFileURL } from 'node:url'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright')
const hist = Array.from({ length: 60 }, (_, i) => 25 + Math.sin(i * .3) * 15)
hist[hist.length - 1] = 28.4
const fixture = { v: 1, ts: Date.now(), host: { hostname: 'DESKTOP-WORK', osName: 'Windows 11', kernel: '10.0.26100', uptime: 86400, cpuModel: '12-Core Processor', cores: 12, topology: { physicalCores: 6, logicalProcessors: 12, packages: 1 } }, gpu: { status: "available", utilizationStatus: "available", devices: [{ id: "gpu0", usage: 18.4, hist: hist.map((_, i) => 18.4 + Math.sin((i - 59) * .25) * 5), engines: [{ id: "0_0", name: "3D", usage: 18.4 }, { id: "0_1", name: "VideoDecode", usage: 6.2 }], name: "Intel Graphics", dedicatedBytes: 128 * 2 ** 20, sharedBytes: 16 * 2 ** 30 }, { id: "gpu1", usage: 55.2, hist: hist.map((_, i) => 55.2 + Math.sin((i - 59) * .25) * 10), engines: [{ id: "0_0", name: "3D", usage: 55.2 }], name: "Discrete GPU", dedicatedBytes: 8 * 2 ** 30, sharedBytes: 16 * 2 ** 30 }] }, cpu: { usage: 28.4, perCore: hist.slice(0, 12), freqMHz: [3400] }, mem: { total: 32 * 2 ** 30, used: 14.2 * 2 ** 30, available: 17.8 * 2 ** 30 }, net: { rxBps: 102400, txBps: 51200, ifaces: [{ name: 'Ethernet', rxBps: 102400, txBps: 51200 }, { name: 'Idle WiFi Direct', rxBps: 0, txBps: 0 }] }, disk: { readBps: 409600, writeBps: 204800, devices: [{ name: 'PhysicalDrive0', readBps: 409600, writeBps: 204800 }, { name: 'PhysicalDrive1', readBps: 0, writeBps: 0 }] }, hist: { t: hist.map((_, i) => Math.floor(Date.now() / 1000) - (59 - i) * 2), cpu: hist, mem: hist.map((_, i) => 44.375 + Math.sin((i - 59) * .12) * .8), rx: hist.map(v => v / 28.4 * 102400), tx: hist.map(v => v / 28.4 * 51200) }, counts: { total: 60 }, procs: Array.from({ length: 60 }, (_, i) => ({ pid: 100 + i, start: '123456789012345678', cmd: ['Code', 'chrome', 'explorer', 'powershell'][i % 4] + '.exe', cpu: (60 - i) / 10, mem: 2.4, rss: 300 * 2 ** 20, thr: 16, time: 120 + i })), warnings: [] }
let requests = 0, ended = [], offline = false
const theme = `:root{--dsw-font-family:"Segoe UI","Microsoft YaHei",sans-serif;--dsw-static-neutral-bluish-75:#f5f6f8;--color-blue-500:#3b82f6;--color-purple-500:#a855f7;--color-green-500:#22c55e;--color-teal-500:#14b8a6;--dsw-alias-button-primary-fill:#3978e8;--dsw-alias-label-primary-foreground:#fff;--dsw-alias-bg-base:#f6f7f9;--dsw-alias-bg-layer-1:#fff;--dsw-alias-bg-layer-2:#f2f4f7;--dsw-alias-bg-layer-3:#e8ecf1;--dsw-alias-label-primary:#202735;--dsw-alias-label-secondary:#4c5767;--dsw-alias-label-tertiary:#6b7586;--dsw-alias-label-caption:#727d8d;--dsw-alias-border-l2:#e4e7ec;--dsw-alias-border-l3:#d8dde5;--dsw-alias-brand-primary:#3978e8;--dsw-alias-state-success-primary:#238368;--dsw-alias-state-warn-primary:#a76a13;--dsw-alias-state-error-primary:#d94355;--dsw-alias-interactive-bg-hover:#edf2fb;--dsw-radius-sm:6px;--dsw-radius-lg:12px} :root.dark{--dsw-alias-bg-base:#12151b;--dsw-alias-bg-layer-1:#1b2028;--dsw-alias-bg-layer-2:#232a35;--dsw-alias-bg-layer-3:#2c3542;--dsw-alias-label-primary:#eef2f8;--dsw-alias-label-secondary:#bdc7d7;--dsw-alias-label-tertiary:#8f9cb0;--dsw-alias-label-caption:#94a1b4;--dsw-alias-border-l2:#303947;--dsw-alias-border-l3:#3b485a;--dsw-alias-brand-primary:#79a4ff;--dsw-alias-state-success-primary:#69cbb1;--dsw-alias-interactive-bg-hover:#293548}html,body,#app{height:100%;margin:0}body{font-family:var(--dsw-font-family);background:var(--dsw-alias-bg-base)}`
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${theme}</style></head><body><div id="app"></div><script src="/react.js"></script><script src="/react-dom.js"></script><script>window.__ModuleLoader__={load(b){window.plugin=b.factory(n=>React)}};</script><script src="/client.js"></script><script>ReactDOM.createRoot(document.getElementById('app')).render(React.createElement(plugin.__SysMonPage));</script></body></html>`
const server = http.createServer(async (req, res) => {
  if (req.url === '/api/sysmon.snapshot') { requests++; res.writeHead(offline ? 503 : 200, { 'content-type': 'application/json' }); res.end(JSON.stringify(offline ? { error: 'test connection interrupted' } : fixture)); return }
  if (req.url === '/api/sysmon.kill') { let body = ''; for await (const chunk of req) body += chunk; ended.push(JSON.parse(body)); res.setHeader('content-type', 'application/json'); res.end('{"ok":true}'); return }
  const files = { '/react.js': '.test-deps/react.js', '/react-dom.js': '.test-deps/react-dom.js', '/client.js': 'lib/client.js' }
  res.setHeader('content-type', files[req.url] ? 'application/javascript' : 'text/html; charset=utf-8')
  res.end(files[req.url] ? fs.readFileSync(files[req.url]) : html)
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_EXE ? { executablePath: process.env.CHROME_EXE } : {}) })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  // Hold the first response to verify startup feedback before any real data exists.
  const startup = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' })
  let releaseSnapshot
  const gate = new Promise(resolve => { releaseSnapshot = resolve })
  await startup.route('**/api/sysmon.snapshot', async route => { await gate; await route.continue() })
  await startup.goto(`http://127.0.0.1:${server.address().port}`)
  await startup.waitForSelector('.sys-chart-loading')
  assert.equal(await startup.locator('.sys-chart-loading').count(), 5, 'all expected plots provide startup feedback, including GPU')
  assert.equal(await startup.locator('.sys-chart[aria-busy=true]').count(), 5)
  const loadingHeight = await startup.locator('[data-panel=cpu] .sys-chart-plot').evaluate(el => el.getBoundingClientRect().height)
  await startup.screenshot({ path: 'artifacts/windows-loading.png', fullPage: true })
  await startup.emulateMedia({ reducedMotion: 'reduce' })
  assert.equal(await startup.locator('.sys-chart-scan').first().evaluate(el => getComputedStyle(el).animationName), 'none')
  releaseSnapshot()
  await startup.waitForSelector('.sys-chart[data-phase=ready]')
  assert.equal(await startup.locator('.sys-chart-loading').count(), 0)
  assert.equal(await startup.locator('[data-panel=cpu] .sys-chart-plot').evaluate(el => el.getBoundingClientRect().height), loadingHeight)
  await startup.close()
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await page.waitForSelector('[data-sysmon-proc-row]')
  assert.equal(await page.locator('.sys-panel').count(), 6)
  const coreDetails = page.locator('.sys-core-details')
  assert.equal(await coreDetails.getAttribute('open'), null)
  assert.equal(await page.locator('.sys-core').first().isVisible(), false)

  const collapsedColumns = await page.locator('.sys-overview').evaluate(el => {
    const nodes = [el.querySelector('.sys-resource-grid'), ...el.querySelectorAll('.sys-resource-fixed > .sys-panel')]
    return nodes.map(node => { const r = node.getBoundingClientRect(); return { top: r.top, bottom: r.bottom } })
  })
  assert.ok(collapsedColumns.every(rect => Math.abs(rect.top - collapsedColumns[0].top) < 1 && Math.abs(rect.bottom - collapsedColumns[0].bottom) < 1), 'collapsed resource columns share top and bottom edges')
  const diskEdges = await page.locator('[data-panel=disk]').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().bottom))
  assert.ok(diskEdges.every(bottom => Math.abs(bottom - collapsedColumns[0].bottom) < 1), 'left disk rows align with CPU and network bottoms')
  const stableLeft = await page.locator('.sys-resource-grid').boundingBox()
  async function assertStableLeft() {
    const rect = await page.locator('.sys-resource-grid').boundingBox()
    assert.ok(Math.abs(rect.height - stableLeft.height) < 1, 'left columns retain their collapsed baseline when details toggle')
    assert.ok(Math.abs(rect.y - stableLeft.y) < 1, 'left columns retain their top position')
  }
  await coreDetails.locator('summary').focus(); await page.keyboard.press('Enter')
  assert.equal(await page.locator('.sys-core').first().isVisible(), true)
  await assertStableLeft()
  assert.equal(await page.locator('.sys-cores').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 4)
  fixture.ts++; fixture.counts.total = 61
  await page.waitForFunction(() => document.querySelector('.sys-facts .sys-fact:last-child .sys-fact-v')?.textContent === '61')
  await assertStableLeft()
  fixture.counts.total = 60; fixture.ts++

  await coreDetails.locator('summary').click()
  await assertStableLeft()
  assert.equal(await page.locator('.sys-core').first().isVisible(), false)
  await coreDetails.locator('summary').click()

  const bounds = async kind => page.locator('[data-panel=' + kind + ']').first().boundingBox()
  const memBounds = await bounds('mem'), gpuBounds = await bounds('gpu'), cpuBounds = await bounds('cpu'), netBounds = await bounds('net'), diskBounds = await bounds('disk')
  assert.ok(memBounds.x < gpuBounds.x && gpuBounds.x < cpuBounds.x && cpuBounds.x < netBounds.x)
  assert.ok(Math.abs(memBounds.y - gpuBounds.y) < 1 && Math.abs(cpuBounds.y - netBounds.y) < 1)
  assert.ok(diskBounds.y >= memBounds.y + memBounds.height)
  assert.ok(netBounds.height < cpuBounds.height - 20, 'network card must not stretch to CPU height')
  const ifaceBounds = await page.locator('.sys-net-active').boundingBox()
  const graphBounds = await page.locator('[data-panel=net] .sys-io').last().boundingBox()
  assert.ok(ifaceBounds.y - (graphBounds.y + graphBounds.height) < 20, 'interfaces follow charts without a blank spacer')
  assert.equal(await page.locator('.sys-net-idle').getAttribute('open'), null)
  assert.equal(await page.getByText('Idle WiFi Direct', { exact: true }).isVisible(), false)
  await page.locator('.sys-net-idle summary').click()
  assert.equal(await page.getByText('Idle WiFi Direct', { exact: true }).isVisible(), true)
  await assertStableLeft()
  await page.locator('.sys-net-idle summary').click()

  await coreDetails.locator('summary').click()
  await page.locator('.sys-net-idle summary').click()
  await assertStableLeft()
  await page.locator('.sys-net-idle summary').click()
  await assertStableLeft()
  await coreDetails.locator('summary').click()
  assert.equal(await page.locator('[data-panel=disk]').count(), 2)
  assert.equal(await page.locator('.sys-core').count(), 12)
  const cpuPlot = page.locator('[data-panel=cpu] .sys-chart-plot')
  assert.equal(await page.locator('.sys-chart').count(), 5)
  assert.equal(await page.locator('[data-panel=cpu] .sys-chart-axis span').first().innerText(), '100.0%')
  const chartWidths = await page.locator('.sys-chart').evaluateAll(charts => charts.map(chart => {
    const layout = chart.querySelector('.sys-chart-layout').getBoundingClientRect()
    const plot = chart.querySelector('.sys-chart-plot').getBoundingClientRect()
    return { ratio: plot.width / layout.width, left: plot.left - layout.left }
  }))
  assert.ok(chartWidths.every(chart => chart.ratio > .95 && chart.left <= 5), 'all resource plots fill the chart width without an axis gutter')
  const memoryPlot = page.locator('[data-panel=mem] .sys-chart-plot')
  assert.equal(await page.locator('[data-panel=mem] .sys-chart-axis span').first().innerText(), '100.0%')
  assert.equal(await page.locator('[data-panel=mem] .sys-chart-stats').count(), 1)
  await memoryPlot.focus(); await memoryPlot.press('Home')
  assert.equal(await memoryPlot.getAttribute('aria-valuenow'), '0')
  await memoryPlot.press('End')
  assert.equal(await memoryPlot.getAttribute('aria-valuenow'), '59')

  await cpuPlot.focus(); await cpuPlot.press('Home')
  assert.equal(await cpuPlot.getAttribute('aria-valuenow'), '0')
  await cpuPlot.press('ArrowRight')
  assert.equal(await cpuPlot.getAttribute('aria-valuenow'), '1')
  await cpuPlot.press('End')
  assert.equal(await cpuPlot.getAttribute('aria-valuenow'), '59')
  await cpuPlot.hover({ position: { x: 0, y: 20 } })
  assert.equal(await cpuPlot.getAttribute('aria-valuenow'), '0')
  await page.locator('.sys-search').focus()

  assert.equal(await page.locator('.sys-gpu-device').count(), 1)
  assert.equal(await page.locator('[data-gpu-usage]').innerText(), '18.4%')
  await page.locator('.sys-gpu-tabs button').nth(1).click()
  assert.equal(await page.locator('[data-gpu-usage]').innerText(), '55.2%')
  assert.ok((await page.locator('.sys-gpu-device').innerText()).includes('Discrete GPU'))
  await page.locator('.sys-gpu-tabs button').first().click()
  assert.equal(await page.locator('[data-gpu-usage]').innerText(), '18.4%')

  assert.ok((await page.locator('[data-panel=cpu]').innerText()).includes('物理核心'))
  // Missing GPUs and arbitrary disk counts preserve the same two-column left grid.
  const originalGpu = fixture.gpu, originalDevices = fixture.disk.devices
  const originalMem = fixture.mem
  await page.locator('.sys-gpu-tabs button').nth(1).click()
  fixture.ts++; fixture.gpu = { ...originalGpu, devices: [originalGpu.devices[0]] }
  fixture.mem = { total: 64 * 2 ** 30, used: 24 * 2 ** 30, available: 40 * 2 ** 30 }
  await page.waitForFunction(() => document.querySelector('[data-panel=mem] .sys-hero').textContent.includes('64 GiB'))
  assert.equal(await page.locator('[data-gpu-usage]').innerText(), '18.4%', 'removing the selected GPU falls back to the remaining device')
  assert.equal(await page.locator('.sys-gpu-tabs').count(), 0)
  fixture.ts++; fixture.mem = originalMem; fixture.gpu = originalGpu
  await page.waitForSelector('.sys-gpu-tabs')

  fixture.ts++; fixture.gpu = { ...originalGpu, utilizationStatus: 'unavailable', devices: originalGpu.devices.map(device => ({ ...device, usage: null, engines: [], hist: hist.map(() => null) })) }
  await page.waitForFunction(() => document.querySelector('[data-gpu-usage]')?.textContent === '—%')
  assert.equal(await page.locator('[data-panel=gpu] .sys-chart-empty').count(), 1)
  assert.ok((await page.locator('[data-panel=gpu]').innerText()).includes('计数器不可用'))

  fixture.ts++; delete fixture.gpu
  await page.waitForSelector('.sys-gpu-legacy')
  assert.ok((await page.locator('.sys-gpu-legacy').innerText()).includes('完全退出'))

  fixture.ts++; fixture.gpu = null; fixture.disk.devices = []
  await page.waitForFunction(() => document.querySelector('[data-panel=gpu]').textContent.includes('未检测到 GPU'))
  assert.equal(await page.locator('[data-panel=disk]').count(), 1)
  fixture.ts++; fixture.disk.devices = Array.from({ length: 5 }, (_, i) => ({ name: 'Disk' + i, readBps: 0, writeBps: 0 }))
  await page.waitForFunction(() => document.querySelectorAll('[data-panel=disk]').length === 5)
  assert.equal(await page.locator('.sys-resource-fixed > .sys-panel').count(), 2)
  fixture.ts++; fixture.gpu = originalGpu; fixture.disk.devices = originalDevices
  await page.waitForFunction(() => document.querySelectorAll('[data-panel=disk]').length === 2)
  assert.equal(await page.locator('.sys-panel').first().evaluate(e => getComputedStyle(e).padding), '10px 12px')
  assert.equal(await page.locator('.sys-panel').first().evaluate(e => getComputedStyle(e).borderRadius), '12px')
  await page.locator('[data-sort-segment=mem]').click()
  assert.equal(await page.locator('.sys-list').getAttribute('data-sort'), 'mem')
  assert.equal(await page.locator('[data-resource=mem]').getAttribute('aria-pressed'), 'true')
  await page.locator('[data-sort-segment=cpu]').click()
  assert.equal(await page.locator('.sys-th').count(), 7)
  assert.equal(await page.locator('[data-sysmon-proc-row]').first().locator('[role=cell]').count(), 7)
  await page.locator('.sys-th-btn').nth(1).click()
  assert.equal(await page.locator('[data-sysmon-proc-row]').first().getAttribute('data-sysmon-proc-row'), '159')
  await page.locator('.sys-th-btn').nth(1).click()
  assert.equal(await page.locator('[data-sysmon-proc-row]').first().getAttribute('data-sysmon-proc-row'), '100')
  await page.locator('[data-resource=mem]').click()
  assert.equal(await page.locator('.sys-list').getAttribute('data-sort'), 'mem')
  assert.equal(await page.locator('.sys-th').nth(2).getAttribute('aria-sort'), 'descending')
  await page.locator('[data-resource=cpu]').click()
  await page.locator('[data-sysmon-proc-row="100"]').hover()
  assert.equal(await page.locator('.sys-inspector').getAttribute('data-inspector-state'), 'preview')
  assert.equal(await page.locator('.sys-inspector').getAttribute('data-inspector-pid'), '100')
  assert.equal(await page.locator('[data-sysmon-kill]').count(), 0, 'hover never exposes destructive actions')
  await page.locator('.sys-mark').hover()
  assert.equal(await page.locator('.sys-inspector').getAttribute('data-inspector-state'), 'empty')
  await page.locator('[data-sysmon-proc-row="101"] .sys-pid').focus()
  await page.keyboard.press('Enter')
  assert.equal(await page.locator('.sys-inspector').getAttribute('data-inspector-state'), 'pinned')
  await page.locator('[data-sysmon-proc-row="102"]').hover()
  assert.equal(await page.locator('.sys-inspector').getAttribute('data-inspector-pid'), '101', 'hover must not replace pin')
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('[data-sysmon-kill]').count(), 0)
  assert.equal(await page.locator('[data-sysmon-proc-row="101"] .sys-pid').evaluate(e => e === document.activeElement), true)
  const search = page.locator('.sys-search')
  await search.fill('explorer')
  assert.equal(await page.locator('[data-sysmon-proc-row]').count(), 15)
  await search.fill('no-such-process')
  assert.equal(await page.locator('[data-sysmon-proc-row]').count(), 0)
  await page.getByRole('button', { name: '清除搜索', exact: true }).click()
  assert.equal(await search.inputValue(), '')
  assert.equal(await search.evaluate(e => e === document.activeElement), true)
  await page.locator('[data-sysmon-proc-row]').first().click()
  const end = page.locator('[data-sysmon-kill=KILL]')
  assert.equal(await end.isEnabled(), true)
  await end.click(); assert.equal(ended.length, 0)
  await end.click(); await page.waitForTimeout(150)
  assert.equal(ended.length, 1); assert.equal(ended[0].start, '123456789012345678')
  fixture.ts++; fixture.procs[0].cpu = 9.9
  await page.locator('.sys-select').selectOption('1000')
  await page.waitForFunction(() => document.querySelector('.sys-detail-stats strong')?.textContent === '9.9%')
  fixture.ts++; fixture.procs[0].start = '223456789012345678'
  await page.waitForFunction(() => document.querySelector('.sys-inspector').dataset.inspectorState !== 'pinned')
  assert.equal(await page.locator('[data-sysmon-kill]').count(), 0, 'PID reuse clears old actions')
  await page.locator('[data-sysmon-proc-row="100"]').click()
  await page.locator('.sys-select').selectOption('2000')
  // Pause stops network polling; resume restores it.
  await page.locator('.sys-controls button').click()
  const count = requests
  await page.waitForTimeout(2200); assert.equal(requests, count)
  await page.locator('.sys-controls button').click()
  await page.waitForTimeout(150); assert.ok(requests > count)
  offline = true
  await page.waitForTimeout(2100)
  assert.equal(await page.locator('[data-sysmon-offline]').count(), 1)
  assert.equal(await page.locator('[data-sysmon-proc-row]').count(), 60)
  offline = false
  await page.waitForTimeout(2100)
  assert.equal(await page.locator('[data-sysmon-offline]').count(), 0)
  fs.mkdirSync('artifacts', { recursive: true })
  await coreDetails.locator('summary').click()
  await page.screenshot({ path: 'artifacts/windows-light.png', fullPage: true })
  await page.evaluate(() => { document.documentElement.classList.add('dark'); document.body.setAttribute('data-ds-dark-theme', ''); })
  assert.equal(await page.locator('.sys-panel').first().evaluate(e => getComputedStyle(e).borderRadius), '10px')
  await page.screenshot({ path: 'artifacts/windows-dark.png', fullPage: true })
  await coreDetails.locator('summary').click()
  // Non-maximized windows prioritize CPU/network, offer section navigation, and fit the table.
  for (const [width, height] of [[1024, 720], [900, 640], [620, 640]]) {
    await page.setViewportSize({ width, height })
    await page.locator('.sys-view-nav button').first().click()
    const layout = await page.locator('.sys-overview').evaluate(el => {
      const r = kind => el.querySelector('[data-panel=' + kind + ']').getBoundingClientRect()
      return { cpu: r('cpu').top, net: r('net').top, mem: r('mem').top, gpu: r('gpu').top, columns: getComputedStyle(el).gridTemplateColumns.split(' ').length }
    })
    assert.equal(layout.columns, 2)
    const overlappingTicks = await page.locator('.sys-chart-axis').evaluateAll(axes => axes.some(axis => {
      const labels = [...axis.children].map(label => label.getBoundingClientRect())
      return labels.some((label, i) => i > 0 && label.top < labels[i - 1].bottom)
    }))
    assert.equal(overlappingTicks, false, 'compact charts keep adjacent axis labels separated')

    assert.ok(Math.abs(layout.cpu - layout.net) < 1 && layout.mem > layout.cpu && Math.abs(layout.mem - layout.gpu) < 1)
    assert.equal(await page.locator('.sys-overview').evaluate(el => el.style.getPropertyValue('--sys-overview-height')), '')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.locator('.sys-view-nav button').nth(1).click()
    assert.equal(await page.locator('.sys-right').evaluate(el => el === document.activeElement), true)
    const header = await page.locator('.sys-header').boundingBox(), process = await page.locator('.sys-right').boundingBox()
    assert.ok(process.y >= header.y + header.height - 1, 'section navigation keeps the process heading below the sticky toolbar')
    const table = await page.locator('.sys-table').boundingBox()
    assert.ok(table.height <= height * .65 && table.height >= 240)
    if (width === 620) {
      assert.equal(await page.locator('.sys-scroll').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'narrow process table fits without horizontal scrolling')
    }
    await page.screenshot({ path: 'artifacts/windows-processes-window-' + width + '.png' })
    await page.locator('.sys-view-nav button').first().click()
    await coreDetails.locator('summary').click()
    await page.screenshot({ path: 'artifacts/windows-window-' + width + '.png' })
    await coreDetails.locator('summary').click()
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  // A narrow DSH pane inside a wide viewport must fold based on its container.
  await page.evaluate(() => document.getElementById('app').style.width = '760px')
  assert.equal(await page.locator('.sys-overview').evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length), 2)
  assert.equal(await page.locator('.sys-workspace').evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length), 1)
  await page.screenshot({ path: 'artifacts/windows-split-pane.png' })
  await page.evaluate(() => document.getElementById('app').style.width = '')
  await page.setViewportSize({ width: 390, height: 844 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  const chartOverflow = await page.locator('.sys-chart').evaluateAll(charts => charts.some(chart => {
    const rect = chart.getBoundingClientRect(), plot = chart.querySelector('.sys-chart-plot').getBoundingClientRect()
    return plot.left < rect.left || plot.right > rect.right + 1 || plot.width / rect.width < .95
  }))
  assert.equal(chartOverflow, false, 'mobile plots retain the full card width without overflow')
  assert.equal(await page.locator('.sys-cores').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 4)

  const panels = await page.locator('.sys-panel').evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return { x: r.x, right: r.right } }))
  assert.ok(panels.every(r => r.x >= 0 && r.right <= 390))
  await page.screenshot({ path: 'artifacts/windows-mobile.png', fullPage: true })
  await page.locator('.sys-right').scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'artifacts/windows-mobile-processes.png' })
  await page.locator('.sys-inspector-jump').click()
  assert.equal(await page.locator('.sys-inspector').evaluate(e => e === document.activeElement), true)
  await page.screenshot({ path: 'artifacts/windows-mobile-inspector.png' })
  // Large snapshots remain fully navigable instead of truncating after 400.
  fixture.ts++; fixture.procs = Array.from({ length: 1200 }, (_, i) => ({ pid: 1000 + i, start: '123456789012345678', cmd: 'worker-' + i, cpu: 1, mem: 1, rss: 1024, thr: 1, time: 1 }))
  await page.locator('.sys-select').selectOption('1000')
  await page.waitForFunction(() => document.querySelector('.sys-count')?.textContent.includes('1200'))
  await page.locator('.sys-search').focus()
  assert.ok(await page.locator('[data-sysmon-proc-row]').count() < 40)
  assert.equal(await page.locator('.sys-table').getAttribute('aria-rowcount'), '1201')
  await page.locator('.sys-scroll').evaluate(e => { e.scrollTop = e.scrollHeight; })
  await page.waitForSelector('[data-sysmon-proc-row="1099"]')
  assert.ok(await page.locator('[data-sysmon-proc-row]').count() < 40)
  // Focusing a row expands this bounded page, preserving the complete Tab order.
  await page.locator('[data-sysmon-proc-row="1099"] .sys-pid').focus()
  assert.equal(await page.locator('[data-sysmon-proc-row]').count(), 100)
  await page.locator('[data-sysmon-proc-row="1099"] .sys-pid').press('Enter')
  assert.equal(await page.locator('.sys-inspector').getAttribute('data-inspector-pid'), '1099')
  await page.locator('.sys-search').focus()
  assert.ok(await page.locator('[data-sysmon-proc-row]').count() < 40)

  await page.getByRole('button', { name: '下一页', exact: true }).click()
  assert.equal(await page.locator('[data-sysmon-proc-row]').first().getAttribute('data-sysmon-proc-row'), '1100')
  await search.fill('2199')
  await page.waitForFunction(() => document.querySelectorAll('[data-sysmon-proc-row]').length === 1)
  assert.equal(await page.locator('[data-sysmon-proc-row]').first().getAttribute('data-sysmon-proc-row'), '2199')
  await page.locator('[data-sysmon-proc-row="2199"]').click()
  await search.fill('no-match')
  assert.equal(await page.locator('.sys-selection-pill').count(), 1)
  await page.locator('.sys-selection-pill').click()
  assert.equal(await page.locator('[data-sysmon-kill]').count(), 0)
  // Explicit document language overrides the browser preference and updates live.
  await page.evaluate(() => document.documentElement.lang = 'en')
  await page.getByRole('button', { name: 'Clear search', exact: true }).waitFor()
  assert.equal(await page.locator('.sys-th').last().innerText(), 'Process name')
  await page.evaluate(() => document.documentElement.lang = 'zh-CN')
  await page.getByRole('button', { name: '清除搜索', exact: true }).waitFor()
  await page.locator('.sys-controls button').click()
  const dataChecks = await page.evaluate(async () => {
    const container = document.createElement('div'); document.body.appendChild(container)
    const root = ReactDOM.createRoot(container)
    let state, changes = 0
    function Probe() {
      state = plugin.__useSysMonData(60000, true)
      React.useEffect(() => { if (state.snapshot) changes++ }, [state.snapshot])
      return null
    }
    const original = window.fetch
    let payload = { v: 1, ts: 100, sequence: 1, generation: 1, procs: [] }
    window.fetch = async () => ({ ok: true, json: async () => payload })
    const settle = () => new Promise(resolve => setTimeout(resolve, 30))
    try {
      ReactDOM.flushSync(() => root.render(React.createElement(Probe)))
      await state.refresh(); await settle(); const first = state.snapshot
      await state.refresh(); await settle(); const repeated = state.snapshot === first && changes === 1
      payload = { ...payload, sequence: 2 }
      await state.refresh(); await settle(); const advanced = changes === 2
      window.fetch = async () => { throw Error('offline fixture') }
      await state.refresh(); await settle(); const retained = state.snapshot.sequence === 2 && !!state.error
      window.fetch = async () => ({ ok: true, json: async () => payload })
      await state.refresh(); await settle(); const recovered = !state.error && changes === 2
      ReactDOM.flushSync(() => root.render(React.createElement(plugin.__Sparkline, { values: [10, null, 30, 40], times: [0, 2, 4, 30] })))
      const line = container.querySelector('.sys-spark-line').getAttribute('d')
      const broken = (line.match(/M/g) || []).length === 3
      ReactDOM.flushSync(() => root.render(React.createElement(plugin.__Sparkline, { values: [10, 20, 30], times: [0, 2, 8] })))
      const timed = container.querySelector('.sys-spark-line').getAttribute('d').includes('L25.00,')
      ReactDOM.flushSync(() => root.render(React.createElement(plugin.__Sparkline, { detailed: true, mode: 'cpu', values: [10, null, 30], times: [1000, 1002, 1008] })))
      const cpuScale = container.querySelector('.sys-chart-axis').textContent.includes('100.0%')
      const slider = container.querySelector('[role=slider]'); slider.focus()
      slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })); await settle()
      slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await settle()
      const missing = slider.getAttribute('aria-valuetext').includes('采样缺失')
      ReactDOM.flushSync(() => root.render(React.createElement(plugin.__Sparkline, { detailed: true, mode: 'auto', values: [0, 0, 0], times: [1000, 1002, 1004] })))
      const zero = !container.innerHTML.includes('NaN') && container.querySelector('.sys-chart-axis').textContent.includes('1 B/s')
      ReactDOM.flushSync(() => root.render(React.createElement(plugin.__Sparkline, { detailed: true, mode: 'auto', values: [null, null], times: [1000, 1002] })))
      const empty = !!container.querySelector('.sys-chart-empty') && !container.querySelector('.sys-spark-line')
      ReactDOM.flushSync(() => root.render(React.createElement(plugin.__Sparkline, { detailed: true, pending: true, values: [null] })))
      const warming = container.querySelector('.sys-chart').getAttribute('aria-busy') === 'true' && !!container.querySelector('.sys-chart-loading') && !container.querySelector('.sys-spark-line')
      ReactDOM.flushSync(() => root.render(React.createElement(plugin.__Sparkline, { detailed: true, pending: true, values: [0] })))
      const building = container.querySelector('.sys-chart-loading').textContent.includes('正在形成趋势') && !!container.querySelector('.sys-spark-line')
      ReactDOM.flushSync(() => root.render(React.createElement(plugin.__Sparkline, { detailed: true, pending: true, values: [0, 0] })))
      const ready = container.querySelector('.sys-chart').getAttribute('data-phase') === 'ready' && !container.querySelector('.sys-chart-loading')

      return { repeated, advanced, retained, recovered, broken, timed, cpuScale, missing, zero, empty, warming, building, ready }
    } finally { window.fetch = original; root.unmount(); container.remove() }
  })
  assert.deepEqual(dataChecks, { repeated: true, advanced: true, retained: true, recovered: true, broken: true, timed: true, cpuScale: true, missing: true, zero: true, empty: true, warming: true, building: true, ready: true })
  console.log('PASS: repeated snapshot deduplication, error recovery, history gaps/time axis and live locale')
  assert.deepEqual(errors, [])
  console.log('PASS: resource sort linking, hover/pin, keyboard/Esc, live Inspector and PID reuse, search recovery, two-step action, pause/offline, split-pane/mobile, zero page errors')
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)) }
