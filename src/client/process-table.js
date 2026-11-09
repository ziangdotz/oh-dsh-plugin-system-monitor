		// Fixed-height process window. Keyboard
		// focus keeps this bounded page fully mounted so Tab never skips rows.
		function useProcessWindow(ref, count, page, resetKey) {
			const [range, setRange] = useState({ from: 0, to: 30 });
			const [focused, setFocused] = useState(false);
			useLayoutEffect(function () {
				var el = ref.current;
				if (!el) return undefined;
				el.scrollTop = 0;
				if (count <= 80) return undefined;
				var frame = 0;
				function update() {
					frame = 0;
					var from = Math.max(0, Math.floor(Math.max(0, el.scrollTop - 32) / 32) - 8);
					var to = Math.min(count, Math.ceil((el.scrollTop + el.clientHeight) / 32) + 8);
					setRange(function (old) { return old.from === from && old.to === to ? old : { from: from, to: to }; });
				}
				function schedule() { if (!frame) frame = requestAnimationFrame(update); }
				var observer = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
				if (observer) observer.observe(el);
				el.addEventListener("scroll", schedule, { passive: true });
				update();
				return function () {
					el.removeEventListener("scroll", schedule);
					if (frame) cancelAnimationFrame(frame);
					if (observer) observer.disconnect();
				};
			}, [ref, count, page, resetKey]);
			var enabled = count > 80 && !focused;
			var from = enabled ? Math.min(range.from, Math.max(0, count - 1)) : 0;
			return { from: from, to: enabled ? Math.max(from + 1, Math.min(range.to, count)) : count, setFocused: setFocused };
		}

		function ProcessTable(props) {
			var procs = arr(props.procs);
			const [search, setSearch] = useState("");
			const searchInput = useRef(null);
			const inspectorRef = useRef(null);
			const listScroll = useRef(null);
			const [page, setPage] = useState(0);
			var sortKey = props.sort.key;
			var sortDir = props.sort.dir;
			const [hovered, setHovered] = useState(null);
			const [selected, setSelected] = useState(null);
			const [armed, setArmed] = useState(null);
			const armTimer = useRef(0);

			var selectedPid = selected && selected.pid !== undefined ? selected.pid : null;

			useEffect(function () {
				if (armTimer.current) {
					clearTimeout(armTimer.current);
					armTimer.current = 0;
				}
				setArmed(null);
			}, [selectedPid, selected && selected.start]);

			/* Drop a selection whose process no longer exists, so a successful
			 * kill leaves no stale signal controls behind. The check reads the
			 * unfiltered list, so a search filter cannot clear a live selection. */
			useEffect(function () {
				if (!selected || !Array.isArray(props.procs)) return;
				var pid = selected.pid;
				if (pid === undefined || pid === null) return;
				for (var index = 0; index < procs.length; index += 1) {
					var candidate = obj(procs[index]);
					if (candidate && String(candidate.pid) === String(pid) && candidate.start === selected.start) return;
				}
				setSelected(null);
			}, [procs, selected]);

			useEffect(function () {
				return function () {
					if (armTimer.current) clearTimeout(armTimer.current);
				};
			}, []);

			const rows = useMemo(function () {
				var query = String(search || "").trim().toLowerCase();
				var filtered = [];
				for (var index = 0; index < procs.length; index += 1) {
					var proc = obj(procs[index]);
					if (!proc) continue;
					if (query) {
						var haystack = (String(proc.pid === undefined || proc.pid === null ? "" : proc.pid) +
							" " + String(proc.user || "") +
							" " + String(proc.cmd || "") +
							" " + String(proc.args || "")).toLowerCase();
						if (haystack.indexOf(query) === -1) continue;
					}
					filtered.push(proc);
				}
				filtered.sort(function (left, right) {
					var result = compareProcs(left, right, sortKey, sortDir);
					if (result !== 0) return result;
					return (num(left && left.pid) || 0) - (num(right && right.pid) || 0);
				});
				return filtered;
			}, [procs, search, sortKey, sortDir]);

			var pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
			var currentPage = Math.min(page, pageCount - 1);
			var pageRows = rows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
			var windowed = useProcessWindow(listScroll, pageRows.length, currentPage, search + ":" + sortKey + ":" + sortDir);
			var rendered = pageRows.slice(windowed.from, windowed.to);
			useEffect(function () { setPage(0); if (listScroll.current) listScroll.current.scrollTop = 0; }, [search, sortKey, sortDir]);
			useEffect(function () { if (page >= pageCount) setPage(pageCount - 1); }, [page, pageCount]);
			function changePage(next) {
				setPage(next);
				setHovered(null);
				if (listScroll.current) listScroll.current.scrollTop = 0;
			}
			var killError = obj(props.killError);
			var killing = props.killing === true;

			function toggleSort(key) {
				props.onSort({ key: key, dir: key === sortKey ? -sortDir : isTextColumn(key) || key === "pid" ? 1 : -1 });
			}

			function selectRow(proc) {
				if (!proc || killing) return;
				setSelected({
					pid: proc.pid,
					start: proc.start,
					user: proc.user,
					cmd: proc.cmd,
					args: proc.args,
				});
			}

			function armSignal(signal) {
				if (!selected) return;
				if (armed === signal) {
					if (armTimer.current) {
						clearTimeout(armTimer.current);
						armTimer.current = 0;
					}
					setArmed(null);
					if (typeof props.onKill === "function") props.onKill(selected.pid, signal, selected.start);
					return;
				}
				setArmed(signal);
				if (armTimer.current) clearTimeout(armTimer.current);
				armTimer.current = setTimeout(function () {
					armTimer.current = 0;
					setArmed(null);
				}, ARM_TIMEOUT_MS);
			}

			var headerCells = [];
			for (var columnIndex = 0; columnIndex < COLUMNS.length; columnIndex += 1) {
				var column = COLUMNS[columnIndex];
				var active = column.key === sortKey;
				headerCells.push(h("div", {
					key: column.key,
					role: "columnheader",
					className: "sys-th" + (column.numeric ? " sys-cell-num" : ""),
					"aria-sort": active ? (sortDir > 0 ? "ascending" : "descending") : "none",
				},
					h("button", {
						type: "button",
						className: "sys-th-btn",
						onClick: function (key) {
							return function () {
								toggleSort(key);
							};
						}(column.key),
						"aria-label": format(TEXT.sortBy, { name: column.label }),
						title: format(TEXT.sortBy, { name: column.label }),
					},
						h("span", null, column.label),
						active ? h("span", { className: "sys-sort-mark", "aria-hidden": "true" }, sortDir > 0 ? "▲" : "▼") : null)));
			}

			var bodyRows = [];
			for (var rowIndex = 0; rowIndex < rendered.length; rowIndex += 1) {
				var proc = rendered[rowIndex];
				var pid = proc.pid;
				var isSelected = selectedPid !== null && String(selectedPid) === String(pid);
				var command = proc.args || proc.cmd;
				bodyRows.push(h("div", {
					role: "row",
					key: String(pid) + ":" + String(proc.start),
					"aria-rowindex": currentPage * PAGE_SIZE + windowed.from + rowIndex + 2,
					className: "sys-tr" + (isSelected ? " sys-row-selected" : ""),
					"data-sysmon-proc-row": pid === undefined || pid === null ? "" : String(pid),
					"data-sysmon-selected": isSelected ? "true" : undefined,
					onMouseEnter: function (target) { return function () { setHovered({ pid: target.pid, start: target.start }); }; }(proc),
					onMouseLeave: function () { setHovered(null); },
					onFocus: function (target) { return function () { setHovered({ pid: target.pid, start: target.start }); }; }(proc),
					onBlur: function () { setHovered(null); },
					title: command ? String(command) : undefined,
					"aria-current": isSelected ? "true" : undefined,
					onClick: function (target) {
						return function () {
							selectRow(target);
						};
					}(proc),
				},
					h("div", { role: "cell", className: cellClass(COLUMNS[0]) },
						h("button", {
							type: "button",
							className: "sys-pid",
							title: pid === undefined || pid === null ? undefined : String(pid),
							"aria-label": TEXT.selectPid + " " + String(pid),
							"aria-pressed": isSelected,
							onClick: function (target) {
								return function (event) {
									event.stopPropagation();
									selectRow(target);
								};
							}(proc),
						}, pid === undefined || pid === null ? DASH : String(pid))),
					h("div", { role: "cell", className: cellClass(COLUMNS[1]) + " " + severityClass(proc.cpu) }, formatProcessCpu(proc.cpu)),
					h("div", { role: "cell", className: cellClass(COLUMNS[2]) + " " + severityClass(proc.mem) }, formatPercent(proc.mem)),
					h("div", { role: "cell", className: cellClass(COLUMNS[3]) }, formatBytes(proc.rss)),
					h("div", { role: "cell", className: cellClass(COLUMNS[4]) }, formatCount(proc.thr)),
					h("div", { role: "cell", className: cellClass(COLUMNS[5]) }, formatTimePlus(proc.time)),
					h("div", { role: "cell", className: cellClass(COLUMNS[6]) + " sys-cmd", title: String(command || "") }, String(command || DASH))));
			}

			var selectedProc = selected && procs.find(function (p) { return p && p.pid === selected.pid && p.start === selected.start; });
			var hoveredProc = hovered && procs.find(function (p) { return p && p.pid === hovered.pid && p.start === hovered.start; });
			var inspected = selectedProc || hoveredProc;
			function unpin() {
				if (killing) return;
				var button = document.querySelector('[data-sysmon-proc-row="' + selectedPid + '"] .sys-pid');
				setSelected(null);
				setHovered(null);
				if (button) button.focus();
			}
			var inspector = h("aside", { className: "sys-inspector", ref: inspectorRef, tabIndex: -1, "aria-label": TEXT.processDetails, "data-inspector-pid": inspected ? inspected.pid : "", "data-inspector-state": selectedProc ? "pinned" : inspected ? "preview" : "empty" },
				h("div", { className: "sys-inspector-head" }, h("h3", null, TEXT.processDetails),
					inspected ? h("span", { className: "sys-badge" }, selectedProc ? TEXT.pinned : TEXT.preview) : null,
					selectedProc ? h("button", { type: "button", className: "sys-icon-btn", "aria-label": TEXT.unpin, disabled: killing, onClick: unpin }, "×") : null),
				inspected ? h("div", { className: "sys-inspector-content" },
					h("div", { className: "sys-process-avatar", "aria-hidden": "true" }, String(inspected.cmd || "P").slice(0, 1).toUpperCase()),
					h("h4", { title: inspected.cmd }, inspected.cmd || DASH),
					h("span", { className: "sys-inspector-sub" }, "PID " + inspected.pid),
					h("div", { className: "sys-detail-stats" },
						h("div", null, h("span", null, TEXT.cpu), h("strong", null, formatProcessCpu(inspected.cpu))),
						h("div", null, h("span", null, TEXT.mem), h("strong", null, formatPercent(inspected.mem)))),
					h("div", { className: "sys-kv" }, detailRow(TEXT.workingSet, formatBytes(inspected.rss)), detailRow(TEXT.colThr, formatCount(inspected.thr)), detailRow(TEXT.colTime, formatTimePlus(inspected.time))),
					h("p", { className: "sys-inspector-note" }, TEXT.cpuBasis),
					selectedProc ? h("div", { className: "sys-inspector-actions" },
						h("p", null, TEXT.endHint),
						h("button", { type: "button", className: "sys-kill sys-kill-hard", "data-sysmon-kill": "KILL", "data-armed": armed === "KILL" ? "true" : "false", disabled: killing || selected.pid <= 4 || !selected.start, "aria-pressed": armed === "KILL", "aria-label": TEXT.killKill + " " + selected.pid, onClick: function () { armSignal("KILL"); } }, killing ? TEXT.processing : armed === "KILL" ? TEXT.confirmKill : TEXT.killKill)) : h("p", { className: "sys-inspector-note" }, TEXT.inspectHint)) :
					h("div", { className: "sys-inspector-empty" }, h("span", { className: "sys-process-avatar", "aria-hidden": "true" }, "⌖"), h("strong", null, TEXT.emptyInspector), h("p", null, TEXT.inspectHint)),
				killError ? h("div", { className: "sys-kill-error", role: "alert" },
					h("span", null, TEXT.killFailed + String(killError.message || "")),
					h("button", { type: "button", className: "sys-icon-btn", "aria-label": TEXT.dismiss, onClick: props.onDismissKillError }, "×")) : null);

			return h("section", { className: "sys-right", ref: props.sectionRef, tabIndex: -1, "aria-label": TEXT.processPanel, onKeyDown: function (event) { if (event.key === "Escape" && selected && !killing) { event.preventDefault(); unpin(); } } },
				h("div", { className: "sys-section-head" }, h("h2", null, TEXT.processPanel), h("span", null, TEXT.cpuBasis)),
				h("div", { className: "sys-workspace" }, h("div", { className: "sys-list", "data-sort": sortKey },
				h("div", { className: "sys-table-bar" },
					h("div", { className: "sys-segmented", role: "group", "aria-label": TEXT.linked }, ["cpu", "mem"].map(function (key) { return h("button", { key: key, type: "button", className: "sys-segment", "data-sort-segment": key, "aria-pressed": sortKey === key, onClick: function () { props.onSort({ key: key, dir: -1 }); } }, key === "cpu" ? TEXT.cpu : TEXT.mem); })),
					h("div", { className: "sys-search-wrap" }, h("span", { className: "sys-search-icon", "aria-hidden": "true" }, "⌕"),
					h("input", {
						className: "sys-search",
						type: "search",
						"data-sysmon-search": "1",
						ref: searchInput,
						value: search,
						placeholder: TEXT.search,
						"aria-label": TEXT.search,
						spellCheck: false,
						autoComplete: "off",
						onChange: function (event) {
							setSearch(event.target.value);
						},
					}),
					search ? h("button", { type: "button", className: "sys-search-clear sys-icon-btn", "aria-label": TEXT.clearSearch, onClick: function () { setSearch(""); if (searchInput.current) searchInput.current.focus(); } }, "×") : null),
					h("span", { className: "sys-count", role: "status" },
						format(TEXT.showing, { n: pageRows.length, m: rows.length }))),
				h("div", { className: "sys-table", role: "table", "aria-label": TEXT.processPanel, "aria-rowcount": rows.length + 1 },
					h("div", { className: "sys-scroll", ref: listScroll, role: "rowgroup", onFocusCapture: function () { windowed.setFocused(true); }, onBlurCapture: function (event) { if (!event.currentTarget.contains(event.relatedTarget)) windowed.setFocused(false); } },
						h("div", { className: "sys-tr sys-thead", role: "row", "aria-rowindex": 1 }, headerCells),
						windowed.from > 0 ? h("div", { "aria-hidden": "true", style: { height: windowed.from * 32, flexShrink: 0 } }) : null,
						bodyRows.length > 0
							? bodyRows
							: h("div", { className: "sys-empty", role: "row" },
								h("div", { className: "sys-empty-cell", role: "cell" }, h("strong", null, props.hasData ? TEXT.noProcs : TEXT.waiting), h("p", null, props.hasData ? TEXT.noMatchHint : TEXT.collecting))),
						windowed.to < pageRows.length ? h("div", { "aria-hidden": "true", style: { height: (pageRows.length - windowed.to) * 32, flexShrink: 0 } }) : null)),
				pageCount > 1 ? h("nav", { className: "sys-pager", "aria-label": TEXT.processPanel },
					h("button", { type: "button", className: "sys-btn", "aria-label": TEXT.previousPage, disabled: currentPage === 0, onClick: function () { changePage(currentPage - 1); } }, "‹"),
					h("span", { role: "status" }, format(TEXT.pageOf, { n: currentPage + 1, m: pageCount })),
					h("button", { type: "button", className: "sys-btn", "aria-label": TEXT.nextPage, disabled: currentPage === pageCount - 1, onClick: function () { changePage(currentPage + 1); } }, "›")) : null,
				selectedProc ? h("button", { type: "button", className: "sys-selection-pill", "aria-label": TEXT.unpin + " " + selectedProc.cmd, disabled: killing, onClick: unpin }, h("span", null, TEXT.pinned), h("strong", null, selectedProc.cmd + " · " + selectedProc.pid), h("span", { "aria-hidden": "true" }, "×")) : null,
				selectedProc ? h("button", { type: "button", className: "sys-btn sys-inspector-jump", onClick: function () { if (inspectorRef.current) { inspectorRef.current.scrollIntoView({ block: "nearest" }); inspectorRef.current.focus({ preventScroll: true }); } } }, TEXT.viewDetails + " ↗") : null), inspector));
		}

		/* ------------------------------------------------------------------
		 * page body: linked resource sort and process explorer
		 * ------------------------------------------------------------------ */
