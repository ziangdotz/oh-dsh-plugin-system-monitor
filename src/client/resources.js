		function panel(title, extra, children, kind) {
			return h("section", { className: "sys-panel", "data-panel": kind },
				h("div", { className: "sys-panel-head" },
					h("span", { className: "sys-panel-title" }, title),
					extra ? h("span", { className: "sys-panel-extra" }, extra) : null),
				children);
		}

		function detailRow(label, value) {
			return h("div", { className: "sys-kv-row", key: label },
				h("span", { className: "sys-k" }, label),
				h("span", { className: "sys-v" }, value));
		}

		function CoreBars(props) {
			var cores = arr(props.cores);
			if (!cores.length) return null;
			return h("div", { className: "sys-cores", role: "list", "aria-label": TEXT.logicalProcessors }, cores.map(function (value, index) {
				var label = TEXT.logicalProcessor + " " + index;
				return h("div", { className: "sys-core", key: index, role: "listitem", "aria-label": label + " · " + formatPercent(value), title: label + " · " + formatPercent(value) },
					h("div", { className: "sys-core-caption" }, h("span", null, "CPU " + index), h("strong", null, formatPercent(value))),
					h("div", { className: "sys-core-track" }, h("div", { className: "sys-core-fill", "data-active": num(value) !== null && value > 0, style: { height: (num(value) === null ? 0 : clamp(value, 0, 100)) + "%" } })));
			}));
		}

		function CpuPanel(props) {
			var cpu = obj(props.cpu);
			var host = obj(props.host);
			var hist = obj(props.hist);
			var usage = pickNum(cpu, "usage");
			var perCore = arr(cpu ? cpu.perCore : null);
			var freq = average(cpu ? cpu.freqMHz : null);
			var topology = obj(host ? host.topology : null);
			var cores = pickNum(topology, "logicalProcessors");
			if (cores === null) cores = pickNum(host, "cores");
			var model = host && host.cpuModel ? String(host.cpuModel) : "";
			var extraBits = [];
			if (freq !== null) extraBits.push((freq / 1000).toFixed(2) + " GHz");
			if (cores !== null) extraBits.push(formatCount(cores) + " " + TEXT.logicalProcessors);
			var note = props.hasData ? TEXT.cpuBasis : TEXT.collecting;
			return panel(TEXT.cpu, extraBits.join(" · "), [
				h("div", { className: "sys-hero", key: "hero" },
					h("span", { className: "sys-big " + severityClass(usage) },
						usage === null ? DASH : usage.toFixed(1),
						h("span", { className: "sys-big-unit" }, "%")),
					h("span", { className: "sys-hero-note", title: note }, note)),
				h(Sparkline, {
					key: "spark",
					values: arr(hist ? hist.cpu : null), times: arr(hist ? hist.t : null),
					mode: "cpu", detailed: true, label: TEXT.cpu, pending: props.loading && arr(hist && hist.cpu).length < 3,
					height: 120,
					className: severityClass(usage),
				}),
				h("div", { className: "sys-cpu-model", key: "model" }, model || DASH),
				h("div", { className: "sys-kv", key: "topology" },
					detailRow(TEXT.physicalCores, formatCount(pickNum(topology, "physicalCores"))),
					detailRow(TEXT.logicalProcessors, formatCount(cores)),
					detailRow(TEXT.packages, formatCount(pickNum(topology, "packages"))),
					detailRow(TEXT.frequency, freq === null ? DASH : (freq / 1000).toFixed(2) + " GHz")),
				perCore.length ? h("details", { key: "cores", className: "sys-core-details" },
					h("summary", null, TEXT.logicalProcessors + " · " + perCore.length),
					h(CoreBars, { cores: perCore })) : null,
				h("button", { key: "focus", className: "sys-resource-link", type: "button", "data-resource": "cpu", "aria-pressed": props.sort.key === "cpu", onClick: function () { props.onSort({ key: "cpu", dir: -1 }); } }, TEXT.focusCpu, h("span", { "aria-hidden": "true" }, "↗")),
			], "cpu");
		}

		function MemoryPanel(props) {
			var mem = obj(props.mem);
			var hist = obj(props.hist);
			var total = pickNum(mem, "total");
			var used = pickNum(mem, "used");
			var percent = total !== null && total > 0 && used !== null ? (used / total) * 100 : null;
			return panel(TEXT.mem, null, [
				h("div", { className: "sys-hero", key: "hero" },
					h("span", { className: "sys-mid" },
						h("span", { className: severityClass(percent) }, formatBytes(used)),
						h("span", { className: "sys-dim" }, " / " + formatBytes(total))),
					h("span", { className: "sys-mid " + severityClass(percent) }, formatPercent(percent))),
				h("div", { className: "sys-bar " + severityClass(percent), key: "bar" },
					h("div", { className: "sys-bar-fill", style: { width: clamp(percent === null ? 0 : percent, 0, 100) + "%" } })),
				h(Sparkline, {
					key: "spark",
					values: arr(hist ? hist.mem : null), times: arr(hist ? hist.t : null),
					mode: "fixed", detailed: true, label: TEXT.mem, pending: props.loading && arr(hist && hist.mem).length < 2,
					height: 120,
					className: severityClass(percent),
				}),
				h("div", { className: "sys-kv", key: "kv" },
					detailRow(TEXT.available, formatBytes(pickNum(mem, "available")))),
				h("button", { key: "focus", className: "sys-resource-link", type: "button", "data-resource": "mem", "aria-pressed": props.sort.key === "mem", onClick: function () { props.onSort({ key: "mem", dir: -1 }); } }, TEXT.focusMem, h("span", { "aria-hidden": "true" }, "↗")),
			], "mem");
		}

		function ioRow(key, label, value, series, toneClass, times, pending) {
			var children = [
				h("div", { className: "sys-io-head", key: "head" },
					h("span", { className: "sys-io-label" }, label),
					h("span", { className: "sys-io-value", title: formatRate(value) }, formatRate(value))),
			];
			if (Array.isArray(series)) {
				children.push(h(Sparkline, { key: "spark", values: series, times: times, pending: pending, mode: "auto", detailed: true, label: label, height: 88, className: toneClass }));
			}
			return h("div", { className: "sys-io", key: key }, children);
		}

		function NetworkPanel(props) {
			var net = obj(props.net), hist = obj(props.hist);
			var ifaces = arr(net ? net.ifaces : null);
			var active = [], idle = [];
			ifaces.forEach(function (iface) {
				if (!obj(iface)) return;
				(pickNum(iface, "rxBps") > 0 || pickNum(iface, "txBps") > 0 ? active : idle).push(iface);
			});
			active.sort(function (a, b) { return (num(b.rxBps) || 0) + (num(b.txBps) || 0) - (num(a.rxBps) || 0) - (num(a.txBps) || 0); });
			function interfaceRows(items) {
				return h("div", { className: "sys-ifaces" }, items.map(function (iface, index) {
					var name = String(iface.name || DASH);
					return h("div", { className: "sys-iface", key: name + ":" + index },
						h("span", { className: "sys-iface-name", title: name }, name),
						h("span", { className: "sys-iface-rate" }, "↓ " + formatRate(pickNum(iface, "rxBps"))),
						h("span", { className: "sys-iface-rate" }, "↑ " + formatRate(pickNum(iface, "txBps"))));
				}));
			}
			return panel(TEXT.net, ifaces.length + " " + TEXT.netInterfaces, [
				ioRow("rx", "↓ " + TEXT.rx, pickNum(net, "rxBps"), arr(hist ? hist.rx : null), "sys-tone-a", hist ? hist.t : null, props.loading && arr(hist && hist.t).length < 3 && (!net || net.status === "active")),
				ioRow("tx", "↑ " + TEXT.tx, pickNum(net, "txBps"), arr(hist ? hist.tx : null), "sys-tone-b", hist ? hist.t : null, props.loading && arr(hist && hist.t).length < 3 && (!net || net.status === "active")),
				active.length ? h("div", { key: "active", className: "sys-net-active" }, interfaceRows(active)) : null,
				idle.length ? h("details", { key: "idle", className: "sys-net-idle" }, h("summary", null, TEXT.netIdle + " · " + idle.length), interfaceRows(idle)) : null,
				!ifaces.length ? h("p", { key: "empty", className: "sys-net-empty" }, props.loading && !net ? TEXT.collecting : TEXT.netEmpty) : null
			], "net");
		}

		function GpuPanel(props) {
			const [selectedId, setSelectedId] = useState(null);
			var gpu = obj(props.gpu), devices = arr(gpu ? gpu.devices : null);
			var selectedIndex = devices.findIndex(function (device, i) { return (device.id || String(i)) === selectedId; });
			if (selectedIndex < 0) selectedIndex = 0;
			var device = obj(devices[selectedIndex]);
			var usage = pickNum(device, "usage");
			var engines = arr(device ? device.engines : null).slice().sort(function (a, b) { return (num(b.usage) || 0) - (num(a.usage) || 0) || Number(!!b.name) - Number(!!a.name); });
			var pending = props.loading && !props.legacy && ((!gpu && !props.hasData) || (gpu && gpu.utilizationStatus === "collecting"));
			var stateText = pending ? TEXT.collecting : props.legacy ? TEXT.gpuLegacy : !device ? TEXT.noGpu : !gpu.utilizationStatus || !("usage" in device) ? TEXT.gpuRestart : gpu.utilizationStatus === "collecting" ? TEXT.sampling : usage === null ? TEXT.gpuUnavailable : TEXT.gpuNote;
			return panel(TEXT.gpu, devices.length ? String(devices.length) : null, [
				devices.length > 1 ? h("div", { key: "select", className: "sys-segmented sys-gpu-tabs", role: "group", "aria-label": TEXT.gpuSelect }, devices.map(function (item, i) {
					return h("button", { type: "button", className: "sys-segment", key: item.id || i, "aria-pressed": selectedIndex === i, title: String(item.name || DASH), onClick: function () { setSelectedId(item.id || String(i)); } }, "GPU " + i);
				})) : null,
				device ? h("div", { key: "hero", className: "sys-hero" }, h("span", { className: "sys-big", "data-gpu-usage": "" }, usage === null ? DASH : usage.toFixed(1), h("span", { className: "sys-big-unit" }, "%")), h("span", { className: "sys-hero-note", title: usage === null ? stateText : TEXT.gpuBasis }, usage === null ? TEXT.unavailable : TEXT.gpuBasis)) : null,
				device || pending ? h(Sparkline, { key: "spark", pending: pending, detailed: true, label: TEXT.gpu, mode: "fixed", height: 120, values: arr(device && device.hist), times: arr(props.hist ? props.hist.t : null) }) : null,
				device ? h("div", { className: "sys-gpu-device", key: "device" },
					h("div", { className: "sys-device-name" }, "GPU " + selectedIndex + " · " + String(device.name || DASH)),
					h("div", { className: "sys-kv" }, detailRow(TEXT.dedicatedMemory, formatBytes(device.dedicatedBytes)), detailRow(TEXT.sharedMemory, formatBytes(device.sharedBytes)))) : null,
				engines.length ? h("details", { className: "sys-gpu-details", key: "engines" },
                    h("summary", null, TEXT.gpuEngines + " · " + Math.min(engines.length, 3)),
                    h("div", { className: "sys-gpu-engines" }, engines.slice(0, 3).map(function (engine) {
					return h("div", { className: "sys-gpu-engine", key: engine.id, title: (engine.name || "Engine") + " · " + engine.id },
						h("div", { className: "sys-io-head" }, h("span", null, engine.name || "Engine " + engine.id), h("strong", null, formatPercent(engine.usage))),
						h("div", { className: "sys-bar" }, h("div", { className: "sys-bar-fill", style: { width: clamp(num(engine.usage) || 0, 0, 100) + "%" } })));
				}))) : null,
				h("p", { className: "sys-resource-note" + (props.legacy ? " sys-gpu-legacy" : ""), key: "note" }, stateText)
			], "gpu");
		}

		function DiskPanel(props) {
			var disk = obj(props.disk);
			return panel(TEXT.disk, disk && disk.name ? String(disk.name) : null, [
				ioRow("read", TEXT.read, pickNum(disk, "readBps"), null, "sys-tone-a"),
				ioRow("write", TEXT.write, pickNum(disk, "writeBps"), null, "sys-tone-b")
			], "disk");
		}

		/* ------------------------------------------------------------------
		 * process table
		 * ------------------------------------------------------------------ */

		const COLUMNS = [
			{ key: "pid", get label() { return TEXT.colPid; }, numeric: true },
			{ key: "cpu", get label() { return TEXT.colCpu; }, numeric: true },
			{ key: "mem", get label() { return TEXT.colMem; }, numeric: true },
			{ key: "rss", get label() { return TEXT.colRss; }, numeric: true },
			{ key: "thr", get label() { return TEXT.colThr; }, numeric: true },
			{ key: "time", get label() { return TEXT.colTime; }, numeric: true },
			{ key: "cmd", get label() { return TEXT.colCmd; }, numeric: false },
		];

		function isTextColumn(key) {
			return key === "user" || key === "state" || key === "cmd";
		}

		function compareProcs(left, right, key, direction) {
			if (isTextColumn(key)) {
				var ltext = String(left && left[key] !== undefined && left[key] !== null ? left[key] : "");
				var rtext = String(right && right[key] !== undefined && right[key] !== null ? right[key] : "");
				return direction * ltext.localeCompare(rtext);
			}
			var lnum = num(left ? left[key] : null);
			var rnum = num(right ? right[key] : null);
			if (lnum === null && rnum === null) return 0;
			if (lnum === null) return 1;
			if (rnum === null) return -1;
			return direction * (lnum - rnum);
		}

		function cellClass(column) {
			return "sys-cell" + (column.numeric ? " sys-cell-num" : "");
		}

		function SysMonIcon(props) {
			var size = props && isNum(props.size) ? props.size : 16;
			return h("svg", {
				xmlns: "http://www.w3.org/2000/svg",
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 1.3,
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				focusable: "false",
			},
				h("rect", { x: 1.7, y: 2.3, width: 12.6, height: 8.6, rx: 1.6 }),
				h("path", { d: "M8 10.9v2.7" }),
				h("path", { d: "M5.6 13.6h4.8" }),
				h("path", { d: "M3.9 6.9h1.6l1.1-2.1 1.7 4.1 1-2h2.8" }));
		}
