window.__ModuleLoader__.load({
	id: "dsh-plugin-sysmon",
	factory: (require) => {
		"use strict";
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const React = require("react");
		const h = React.createElement;
		const { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } = React;

		/* ------------------------------------------------------------------
		 * locale — document language with browser fallback, refreshed on change
		 * ------------------------------------------------------------------ */

/* @include locale.js */
		const DASH = "—";
		const PAGE_SIZE = 100;
		const ARM_TIMEOUT_MS = 3000;
		const SNAPSHOT_URL = "/api/sysmon.snapshot";
		const KILL_URL = "/api/sysmon.kill";
		const INTERVALS = [1000, 2000, 5000];

		/* ------------------------------------------------------------------
		 * small typed helpers — never throw on a hostile snapshot
		 * ------------------------------------------------------------------ */

		function isNum(value) {
			return typeof value === "number" && isFinite(value);
		}

		function num(value) {
			return typeof value === "number" && isFinite(value) ? value : null;
		}

		function arr(value) {
			return Array.isArray(value) ? value : [];
		}

		function obj(value) {
			return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
		}

		function pickNum(source, key) {
			return num(source ? source[key] : null);
		}

		function clamp(value, low, high) {
			return value < low ? low : value > high ? high : value;
		}

		function noop() {
			return undefined;
		}

		function format(template, values) {
			return String(template).replace(/\{(\w+)\}/g, function (match, key) {
				var value = values ? values[key] : undefined;
				return value === undefined || value === null ? "" : String(value);
			});
		}

		function pad2(value) {
			return value < 10 ? "0" + value : String(value);
		}

		/* ------------------------------------------------------------------
		 * formatting
		 * ------------------------------------------------------------------ */

		const BYTE_UNITS = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];

		function formatBytes(value) {
			var n = num(value);
			if (n === null) return DASH;
			if (n < 0) n = 0;
			if (n < 1024) return Math.round(n) + " B";
			var unit = 0;
			var scaled = n;
			while (scaled >= 1024 && unit < BYTE_UNITS.length - 1) {
				scaled /= 1024;
				unit += 1;
			}
			var text = scaled.toFixed(1);
			if (text.slice(-2) === ".0") text = text.slice(0, -2);
			return text + " " + BYTE_UNITS[unit];
		}

		function formatRate(value) {
			if (num(value) === null) return DASH;
			return formatBytes(value) + "/s";
		}

		function formatPercent(value, digits) {
			var n = num(value);
			if (n === null) return DASH;
			return n.toFixed(digits === undefined ? 1 : digits) + "%";
		}

		/* A process may legitimately own more than one core, so drop the decimal
		 * once the number gets wide enough to crowd the CPU% column. */
		function formatProcessCpu(value) {
			var n = num(value);
			if (n === null) return DASH;
			if (n >= 100) return Math.round(n) + "%";
			return n.toFixed(1) + "%";
		}

		function formatCount(value) {
			var n = num(value);
			if (n === null) return DASH;
			return String(Math.round(n));
		}

		function formatLoad(value) {
			var n = num(value);
			if (n === null) return DASH;
			return n.toFixed(2);
		}

		function formatUptime(seconds) {
			var n = num(seconds);
			if (n === null || n < 0) return DASH;
			var whole = Math.floor(n);
			var days = Math.floor(whole / 86400);
			var hours = Math.floor((whole % 86400) / 3600);
			var minutes = Math.floor((whole % 3600) / 60);
			return days + ":" + pad2(hours) + ":" + pad2(minutes) + ":" + pad2(whole % 60);
		}

		function formatTimePlus(seconds) {
			var n = num(seconds);
			if (n === null || n < 0) return DASH;
			var hours = Math.floor(n / 3600);
			var minutes = Math.floor((n % 3600) / 60);
			var rest = n % 60;
			var restText = rest.toFixed(1);
			if (rest < 10) restText = "0" + restText;
			if (hours > 0) return hours + ":" + pad2(minutes) + ":" + restText;
			return minutes + ":" + restText;
		}

		function formatClock(epochMs) {
			var n = num(epochMs);
			if (n === null) return DASH;
			var date = new Date(n);
			if (isNaN(date.getTime())) return DASH;
			return pad2(date.getHours()) + ":" + pad2(date.getMinutes()) + ":" + pad2(date.getSeconds());
		}

		function severityClass(percent) {
			var n = num(percent);
			if (n === null) return "sys-sev-none";
			if (n < 60) return "sys-sev-ok";
			if (n < 85) return "sys-sev-warn";
			return "sys-sev-crit";
		}

		function stateClass(state) {
			var letter = String(state || "").toUpperCase();
			if (letter === "R") return "sys-sev-ok";
			if (letter === "D") return "sys-sev-warn";
			if (letter === "Z" || letter === "X") return "sys-sev-crit";
			return "sys-sev-none";
		}

		function average(values) {
			var list = arr(values);
			var total = 0;
			var count = 0;
			for (var index = 0; index < list.length; index += 1) {
				var value = num(list[index]);
				if (value === null) continue;
				total += value;
				count += 1;
			}
			return count === 0 ? null : total / count;
		}

		/* ------------------------------------------------------------------
		 * data access
		 * ------------------------------------------------------------------ */

/* @include data.js */

		/* ------------------------------------------------------------------
		 * sparkline
		 * ------------------------------------------------------------------ */

/* @include sparkline.js */

		/* ------------------------------------------------------------------
		 * panels
		 * ------------------------------------------------------------------ */

/* @include resources.js */
/* @include process-table.js */
/* @include page.js */

		/* ------------------------------------------------------------------
		 * plugin registration
		 * ------------------------------------------------------------------ */

		function apply(ctx) {
			// The host owns these technical labels and provides no per-row display option.
			// Keep this override alive on the Plugins page and dispose it with the plugin.
			ctx.effect(() => {
				const style = document.createElement("style");
				style.dataset.sysmonPluginLabels = "";
				style.textContent = `
[data-plugin-row$="SysMon（System Monitor）"] code + code{display:none!important}
`;
				document.head.appendChild(style);
				return () => style.remove();
			});
			ctx.slots.inject("main", function* () {
				yield ctx.slots.register({ name: "main", key: "sysmon" }, SysMonPage);
			});
			ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
				name: "sidebar.panellist",
				id: "sysmon",
				order: 25,
				label: () => TEXT.sidebarLabel,
			}, SysMonIcon));
		}

		const inject = ["slots"];

		/* ------------------------------------------------------------------
		 * styles
		 * ------------------------------------------------------------------ */

/* @include styles.js */

		/* ------------------------------------------------------------------
		 * exports
		 * ------------------------------------------------------------------ */

		exports.apply = apply;
		exports.inject = inject;
		/* test-only, harmless in production */
		exports.__SysMonPage = SysMonPage;
		exports.__SysMonIcon = SysMonIcon;
		exports.__SysMonBody = SysMonBody;
		exports.__Sparkline = Sparkline;
		exports.__useSysMonData = useSysMonData;

		return module.exports;
	}
});
