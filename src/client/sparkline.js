		function Sparkline(props) {
			const [inspected, setInspected] = useState(null);
			var values = arr(props.values);
			var mode = props.mode === "cpu" ? "cpu" : props.mode === "auto" ? "auto" : "fixed";
			var detailed = props.detailed === true;
			var height = isNum(props.height) ? props.height : 34;
			var max = mode === "fixed" ? 100 : 0;
			var index;
			if (mode !== "fixed") {
				for (index = 0; index < values.length; index += 1) {
					var sample = num(values[index]);
					if (sample !== null && sample > max) max = sample;
				}
			}
			if (mode === "cpu") max = Math.max(100, max);
			if (mode === "auto") {
				var target = Math.max(max * 1.15, 1);
				var unit = Math.pow(1024, Math.max(0, Math.floor(Math.log(target) / Math.log(1024))));
				var magnitude = Math.pow(10, Math.floor(Math.log10(target / unit)));
				var normalized = target / unit / magnitude;
				var step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
				max = step * magnitude * unit;
			}
			var times = arr(props.times);
			var timed = times.length === values.length && times.length > 1 && times.every(isNum) && times[times.length - 1] > times[0];
			var segments = [], segment = [];
			for (index = 0; index < values.length; index += 1) {
				var value = num(values[index]);
				var gap = timed && index > 0 && (times[index] <= times[index - 1] || times[index] - times[index - 1] > 10);
				if (value === null || gap) { if (segment.length) segments.push(segment); segment = []; }
				if (value === null) continue;
				var x = timed ? (times[index] - times[0]) / (times[times.length - 1] - times[0]) * 100 : values.length <= 1 ? 0 : index / (values.length - 1) * 100;
				segment.push([x, 100 - clamp(value / max, 0, 1) * 100]);
			}
			if (segment.length) segments.push(segment);
			var line = "", area = "";
			segments.forEach(function (points) {
				var path = "M" + points.map(function (p) { return p[0].toFixed(2) + "," + p[1].toFixed(2); }).join(" L");
				if (points.length === 1) path += " l0.01,0";
				line += path;
				area += path + " L" + points[points.length - 1][0].toFixed(2) + ",100 L" + points[0][0].toFixed(2) + ",100 Z";
			});
			if (detailed) {
				var rateChart = mode === "auto";
				var formatValue = rateChart ? formatRate : formatPercent;
				var valid = values.filter(isNum);
				var pending = props.pending === true && valid.length < 2;
				var peak = valid.length ? Math.max.apply(null, valid) : null;
				var mean = valid.length ? valid.reduce(function (a, b) { return a + b; }, 0) / valid.length : null;
				var current = values.length ? num(values[values.length - 1]) : null;
				var selected = inspected === null ? null : clamp(inspected, 0, Math.max(0, values.length - 1));
				function position(i) { return timed ? (times[i] - times[0]) / (times[times.length - 1] - times[0]) * 100 : values.length < 2 ? 0 : i / (values.length - 1) * 100; }
				function sampleTime(i) { return timed ? formatClock(times[i] * 1000) : TEXT.chartSample + " " + (i + 1); }
				function inspectPointer(event) {
					if (!values.length) return;
					var rect = event.currentTarget.getBoundingClientRect();
					var target = clamp((event.clientX - rect.left) / rect.width * 100, 0, 100);
					var nearest = 0;
					for (var i = 1; i < values.length; i++) if (Math.abs(position(i) - target) < Math.abs(position(nearest) - target)) nearest = i;
					setInspected(nearest);
				}
				var ticks = rateChart ? [0, 50, 100] : [0, 25, 50, 75, 100];
				var duration = timed ? Math.round(times[times.length - 1] - times[0]) : null;
				var period = duration === null ? values.length + " " + TEXT.chartSamples : (duration >= 60 ? Math.floor(duration / 60) + "m " : "") + duration % 60 + "s";
				var sampleLabel = selected === null ? TEXT.chartCurrent + " " + formatValue(current) : sampleTime(selected) + " · " + (num(values[selected]) === null ? TEXT.chartMissing : formatValue(values[selected]));
				var cursorX = selected === null ? null : position(selected);
				var cursorY = selected === null || num(values[selected]) === null ? null : 100 - clamp(values[selected] / max, 0, 1) * 100;
				var last = values.length - 1;
				return h("div", { className: "sys-chart", "data-chart": props.label || mode, "data-phase": pending ? "loading" : valid.length ? "ready" : "empty", "aria-busy": pending },
					h("div", { className: "sys-chart-readout", "aria-hidden": "true" }, h("span", null, sampleLabel), h("span", null, TEXT.chartRange + " " + period)),
					h("div", { className: "sys-chart-layout" },
						h("div", { className: "sys-chart-axis", "aria-hidden": "true", style: { height: height } }, ticks.map(function (percent) { return h("span", { key: percent, style: { top: percent + "%" } }, formatValue(max * (1 - percent / 100))); })),
						h("div", { className: "sys-chart-plot", style: { height: height }, tabIndex: values.length ? 0 : -1, role: values.length ? "slider" : "img", "aria-label": (props.label || TEXT.chartHistory) + " · " + TEXT.chartKeyboard, "aria-valuemin": values.length ? 0 : undefined, "aria-valuemax": values.length ? last : undefined, "aria-valuenow": values.length ? selected === null ? last : selected : undefined, "aria-valuetext": sampleLabel,
							onPointerMove: inspectPointer, onPointerDown: inspectPointer,
							onPointerLeave: function (event) { if (document.activeElement !== event.currentTarget) setInspected(null); },
							onFocus: function () { setInspected(last); }, onBlur: function () { setInspected(null); },
							onKeyDown: function (event) {
								var i = selected === null ? last : selected;
								if (event.key === "ArrowLeft") i--;
								else if (event.key === "ArrowRight") i++;
								else if (event.key === "Home") i = 0;
								else if (event.key === "End") i = last;
								else return;
								event.preventDefault(); setInspected(clamp(i, 0, last));
							} },
							h("svg", { className: "sys-spark", viewBox: "0 0 100 100", preserveAspectRatio: "none", width: "100%", height: "100%", "aria-hidden": "true" },
								ticks.map(function (percent) { return h("line", { key: "h" + percent, className: "sys-spark-grid", x1: 0, x2: 100, y1: percent, y2: percent, vectorEffect: "non-scaling-stroke" }); }),
								[0,25,50,75,100].map(function (percent) { return h("line", { key: "v" + percent, className: "sys-chart-grid-v", x1: percent, x2: percent, y1: 0, y2: 100, vectorEffect: "non-scaling-stroke" }); }),
								area ? h("path", { className: "sys-spark-area", d: area }) : null,
								line ? h("path", { className: "sys-spark-line", d: line, vectorEffect: "non-scaling-stroke" }) : null,
								cursorX === null ? null : h("line", { className: "sys-chart-cursor", x1: cursorX, x2: cursorX, y1: 0, y2: 100, vectorEffect: "non-scaling-stroke" })),
							cursorY === null ? null : h("span", { className: "sys-chart-dot", style: { left: cursorX + "%", top: cursorY + "%" } }),
							last >= 0 && num(values[last]) !== null ? h("span", { className: "sys-chart-dot sys-chart-latest", style: { left: position(last) + "%", top: (100 - clamp(values[last] / max, 0, 1) * 100) + "%" } }) : null,
							pending ? h("div", { className: "sys-chart-loading", role: "status" }, h("span", { className: "sys-chart-scan", "aria-hidden": "true" }), h("span", { className: "sys-chart-loading-label" }, h("i", { "aria-hidden": "true" }), valid.length ? TEXT.chartBuilding : TEXT.chartPreparing)) : !valid.length ? h("span", { className: "sys-chart-empty" }, TEXT.chartWaiting) : null)),
					h("div", { className: "sys-chart-time", "aria-hidden": "true" }, h("span", null, timed ? period + " " + TEXT.chartAgo : TEXT.chartFirst), h("span", null, TEXT.chartLatest)),
					h("div", { className: "sys-chart-stats" }, h("span", null, TEXT.chartPeak + " ", h("strong", null, formatValue(peak))), h("span", null, TEXT.chartAverage + " ", h("strong", null, formatValue(mean)))));
			}
			var hundredLine = max > 100.5 ? 100 - (100 / max) * 100 : null;
			return h("div", {
				className: "sys-spark-wrap" + (props.className ? " " + props.className : ""),
				style: { height: height + "px" },
			},
				h("svg", {
					className: "sys-spark",
					viewBox: "0 0 100 100",
					preserveAspectRatio: "none",
					width: "100%",
					height: "100%",
					"aria-hidden": "true",
					focusable: "false",
				},
					h("line", { className: "sys-spark-grid", x1: 0, y1: 0.5, x2: 100, y2: 0.5, vectorEffect: "non-scaling-stroke" }),
					hundredLine === null ? null : h("line", { className: "sys-spark-grid", x1: 0, y1: hundredLine, x2: 100, y2: hundredLine, vectorEffect: "non-scaling-stroke" }),
					area ? h("path", { className: "sys-spark-area", d: area }) : null,
					line ? h("path", { className: "sys-spark-line", d: line, vectorEffect: "non-scaling-stroke" }) : null
				)
			);
		}
