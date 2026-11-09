		// Measure a collapsed copy so expanded details never become the alignment baseline.
		function useOverviewHeight(ref, snapshot) {
			useLayoutEffect(function () {
				var overview = ref.current;
				if (!overview) return;
				var lastWidth = -1;
				function measure() {
                    var root = overview.closest(".sys-root");
                    var header = root && root.querySelector(".sys-header");
                    if (header) root.style.setProperty("--sys-scroll-offset", Math.ceil(header.getBoundingClientRect().height + 20) + "px");
					var width = overview.getBoundingClientRect().width;
					lastWidth = width;
					if (!width || getComputedStyle(overview.querySelector(".sys-resource-grid")).display === "contents" || getComputedStyle(overview).gridTemplateColumns.split(" ").length !== 2) {
						overview.style.removeProperty("--sys-overview-height");
						return;
					}
					var copy = overview.cloneNode(true);
					copy.classList.add("sys-overview-measure");
					copy.setAttribute("aria-hidden", "true");
					copy.inert = true;
					Object.assign(copy.style, { position: "absolute", visibility: "hidden", pointerEvents: "none", width: width + "px", top: "0", left: "0" });
					copy.style.setProperty("--sys-overview-height", "0px");
					copy.querySelectorAll("details[open]").forEach(function (details) { details.removeAttribute("open"); });
					try {
						overview.parentElement.appendChild(copy);
						overview.style.setProperty("--sys-overview-height", copy.getBoundingClientRect().height + "px");
					} finally { copy.remove(); }
				}
				measure();
				var observer = new ResizeObserver(function () {
					if (Math.abs(overview.getBoundingClientRect().width - lastWidth) > .5) measure();
				});
				observer.observe(overview);
				return function () { observer.disconnect(); };
			}, [snapshot, detectChinese()]);
		}

		function SysMonBody(props) {
			const [sort, setSort] = useState({ key: "cpu", dir: -1 });
			const overviewRef = useRef(null);
            const processesRef = useRef(null);
			useOverviewHeight(overviewRef, props && props.snapshot);
			var source = props || {};
			var snapshot = obj(source.snapshot);
			var error = source.error ? String(source.error) : null;
			var paused = source.paused === true;
			var intervalMs = isNum(source.intervalMs) ? source.intervalMs : 2000;
			var updatedAt = num(source.updatedAt);
			var host = obj(snapshot ? snapshot.host : null);
			var load = obj(snapshot ? snapshot.load : null);
			var counts = obj(snapshot ? snapshot.counts : null);
			var hist = obj(snapshot ? snapshot.hist : null);
			var onTogglePause = typeof source.onTogglePause === "function" ? source.onTogglePause : noop;
			var onIntervalChange = typeof source.onIntervalChange === "function" ? source.onIntervalChange : noop;
			var onKill = typeof source.onKill === "function" ? source.onKill : noop;
			var onDismissKillError = typeof source.onDismissKillError === "function" ? source.onDismissKillError : noop;
			var totalProcs = pickNum(counts, "total");
			if (totalProcs === null) totalProcs = pickNum(load, "total");
			var state = error ? "offline" : !snapshot ? "idle" : paused ? "paused" : "live";
			var statusText = error ? TEXT.offline : !snapshot ? TEXT.collecting : paused ? TEXT.paused : TEXT.live;
			var statusTitle = error ? error : updatedAt !== null ? TEXT.updated + " " + formatClock(updatedAt) : "";
			var hostName = host && host.hostname ? String(host.hostname) : DASH;
			var kernel = host && host.osName ? String(host.osName) : "Windows 10 / 11";

			function fact(key, label, value, title) {
				return h("span", { className: "sys-fact", key: key, title: title || undefined },
					h("span", { className: "sys-fact-k" }, label),
					h("span", { className: "sys-fact-v" }, value));
			}

			var options = [];
			for (var index = 0; index < INTERVALS.length; index += 1) {
				var value = INTERVALS[index];
				options.push(h("option", { key: value, value: String(value) }, value / 1000 + "s"));
			}

			var banner = error ? h("div", {
				className: "sys-banner",
				role: "status",
				"aria-live": "polite",
				"data-sysmon-offline": "1",
			},
				h("span", { className: "sys-banner-text" }, TEXT.offline),
				h("span", { className: "sys-banner-msg", title: error }, error)) : null;

			return h("div", { className: "sys-root", "data-sysmon": "panel", "data-sysmon-root": "1", "data-sysmon-state": state },
				h("style", { dangerouslySetInnerHTML: { __html: CSS } }),
				h("header", { className: "sys-header" },
					h("div", { className: "sys-brand" },
						h("span", { className: "sys-mark" }, TEXT.pageTitle),
						h("span", { className: "sys-title" }, "Windows")),
					h("div", { className: "sys-facts" },
						fact("host", TEXT.host, hostName, host && host.cpuModel ? String(host.cpuModel) : undefined),
						fact("kernel", TEXT.kernel, kernel),
						fact("uptime", TEXT.uptime, formatUptime(pickNum(host, "uptime"))),
						fact("procs", TEXT.procs, formatCount(totalProcs))),
                    h("nav", { className: "sys-view-nav", "aria-label": TEXT.resources + " / " + TEXT.processPanel },
                        h("button", { type: "button", className: "sys-btn", onClick: function () { if (overviewRef.current) { overviewRef.current.scrollIntoView({ block: "start" }); overviewRef.current.focus({ preventScroll: true }); } } }, TEXT.resources),
                        h("button", { type: "button", className: "sys-btn", onClick: function () { if (processesRef.current) { processesRef.current.scrollIntoView({ block: "start" }); processesRef.current.focus({ preventScroll: true }); } } }, TEXT.processPanel)),
					h("div", { className: "sys-controls" },
						h("span", { className: "sys-status", role: "status", "aria-live": "polite", title: statusTitle },
							h("span", { className: "sys-dot", "data-state": state, "aria-hidden": "true" }),
							statusText),
						h("button", {
							type: "button",
							className: "sys-btn",
							"aria-pressed": paused,
							onClick: function () {
								onTogglePause(!paused);
							},
						}, paused ? TEXT.resume : TEXT.pause),
						h("label", { className: "sys-interval" },
							h("span", { className: "sys-interval-label" }, TEXT.refresh),
							h("select", {
								className: "sys-select",
								value: String(intervalMs),
								"aria-label": TEXT.refresh,
								onChange: function (event) {
									onIntervalChange(Number(event.target.value));
								},
							}, options)))),
				banner,
				updatedAt !== null && updatedAt > 0 ? h("div", { className: "sys-updated" }, TEXT.updated + " " + formatClock(updatedAt)) : null,
				snapshot && arr(snapshot.warnings).length ? h("div", { className: "sys-banner", role: "status" }, arr(snapshot.warnings).join(" · ")) : null,
				h("div", { className: "sys-body" },
					h("div", { className: "sys-section-head" }, h("h2", null, TEXT.overview), h("span", null, TEXT.overviewHint)),
					h("div", { className: "sys-overview", ref: overviewRef, tabIndex: -1, "aria-label": TEXT.overview },
						h("div", { className: "sys-resource-grid" },
							h(MemoryPanel, { loading: !error && !paused, mem: snapshot ? snapshot.mem : null, hist: hist, sort: sort, onSort: setSort }),
							h(GpuPanel, { hasData: !!snapshot, loading: !error && !paused, gpu: snapshot ? snapshot.gpu : null, hist: hist, legacy: !!snapshot && !("gpu" in snapshot) }),
							(snapshot && snapshot.disk && arr(snapshot.disk.devices).length ? snapshot.disk.devices : [null]).map(function (disk, i) { return h(DiskPanel, { key: disk ? disk.id || disk.name : "unavailable", disk: disk }); })),
						h("div", { className: "sys-resource-fixed" },
							h(CpuPanel, { loading: !error && !paused, cpu: snapshot ? snapshot.cpu : null, hist: hist, host: host, hasData: !!snapshot, sort: sort, onSort: setSort }),
							h(NetworkPanel, { loading: !error && !paused, net: snapshot ? snapshot.net : null, hist: hist }))),
					h(ProcessTable, {
                        sectionRef: processesRef,
						sort: sort, onSort: setSort,
						procs: snapshot ? snapshot.procs : null,
						hasData: !!snapshot,
						onKill: onKill,
						killing: source.killing === true,
						killError: source.killError || null,
						onDismissKillError: onDismissKillError,
					})));
		}

		/* ------------------------------------------------------------------
		 * page (stateful)
		 * ------------------------------------------------------------------ */

		function SysMonPage() {
			useLocale();
			const [intervalMs, setIntervalMs] = useState(2000);
			const [paused, setPaused] = useState(false);
			const data = useSysMonData(intervalMs, paused);
			const [killError, setKillError] = useState(null);
			const [killing, setKilling] = useState(false);
			const alive = useRef(true);

			useEffect(function () {
				alive.current = true;
				return function () {
					alive.current = false;
				};
			}, []);

			const killProcess = useCallback(async function (pid, signal, start) {
				if (!isNum(pid)) return false;
				if (typeof fetch !== "function") return false;
				if (alive.current) {
					setKilling(true);
					setKillError(null);
				}
				try {
					const response = await fetch(KILL_URL, {
						signal: AbortSignal.timeout(7000),
						method: "POST",
						credentials: "same-origin",
						cache: "no-store",
						headers: { "content-type": "application/json", accept: "application/json" },
						body: JSON.stringify({ pid: pid, signal: signal, start: start }),
					});
					var payload = null;
					try {
						payload = await response.json();
					} catch (parseError) {
						payload = null;
					}
					if (!response.ok || !payload || payload.ok !== true) {
						var message = payload && payload.error ? String(payload.error) : "HTTP " + response.status;
						if (alive.current) setKillError({ pid: pid, signal: signal, message: message });
						return false;
					}
					if (alive.current) setKillError(null);
					await data.refresh();
					return true;
				} catch (failure) {
					if (alive.current) {
						setKillError({
							pid: pid,
							signal: signal,
							message: failure && failure.message ? failure.message : String(failure),
						});
					}
					return false;
				} finally {
					if (alive.current) setKilling(false);
				}
			}, [data.refresh]);

			return h(SysMonBody, {
				snapshot: data.snapshot,
				error: data.error,
				updatedAt: data.updatedAt,
				paused: paused,
				intervalMs: intervalMs,
				killing: killing,
				killError: killError,
				onTogglePause: function (next) {
					setPaused(next === undefined ? !paused : next === true);
				},
				onIntervalChange: function (next) {
					if (isNum(next) && INTERVALS.indexOf(next) !== -1) setIntervalMs(next);
				},
				onKill: killProcess,
				onDismissKillError: function () {
					setKillError(null);
				},
			});
		}

		/* ------------------------------------------------------------------
		 * sidebar icon
		 * ------------------------------------------------------------------ */
