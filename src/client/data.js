		function useSysMonData(intervalMs, paused) {
			const [snapshot, setSnapshot] = useState(null);
			const [error, setError] = useState(null);
			const [updatedAt, setUpdatedAt] = useState(0);
			const mounted = useRef(true);
			const inFlight = useRef(false);
			const activeRequest = useRef(null);

			useEffect(function () {
				mounted.current = true;
				return function () {
					mounted.current = false;
					if (activeRequest.current) activeRequest.current.abort();
				};
			}, []);

			const refresh = useCallback(async function () {
				if (typeof fetch !== "function") return null;
				if (inFlight.current) return null;
				inFlight.current = true;
				const controller = new AbortController();
				activeRequest.current = controller;
				const timeout = setTimeout(function () { controller.abort(); }, 12000);
				try {
					const response = await fetch(SNAPSHOT_URL, {
						signal: controller.signal,
						credentials: "same-origin",
						cache: "no-store",
						headers: { accept: "application/json" },
					});
					if (!response || !response.ok) {
						var detail = response ? await response.json().catch(function () { return {}; }) : {};
						throw new Error(detail.error || "HTTP " + (response ? response.status : "?"));
					}
					const payload = await response.json();
					if (!payload || typeof payload !== "object") throw new Error("invalid snapshot payload");
					if (mounted.current && !controller.signal.aborted) {
						setSnapshot(function (previous) {
							if (previous && (payload.sequence !== undefined
								? previous.sequence === payload.sequence && previous.generation === payload.generation && previous.ts === payload.ts
								: previous.ts === payload.ts)) return previous;
							return payload;
						});
						setError(null);
						setUpdatedAt(payload.ts || Date.now());
					}
					return payload;
				} catch (failure) {
					if (mounted.current && controller.signal.reason !== "paused") setError(failure && failure.message ? failure.message : String(failure));
					return null;
				} finally {
					clearTimeout(timeout);
					activeRequest.current = null;
					inFlight.current = false;
				}
			}, []);

			useEffect(function () {
				if (paused) { if (activeRequest.current) activeRequest.current.abort("paused"); return undefined; }
				var timer = 0;
				function tick() {
					if (typeof document !== "undefined" && document && document.visibilityState === "hidden") return;
					refresh();
				}
				function onVisibility() {
					if (typeof document !== "undefined" && document && document.visibilityState === "visible") refresh();
				}
				tick();
				timer = setInterval(tick, intervalMs);
				if (typeof document !== "undefined" && document && document.addEventListener) {
					document.addEventListener("visibilitychange", onVisibility);
				}
				return function () {
					clearInterval(timer);
					if (typeof document !== "undefined" && document && document.removeEventListener) {
						document.removeEventListener("visibilitychange", onVisibility);
					}
				};
			}, [intervalMs, paused, refresh]);

			return { snapshot: snapshot, error: error, updatedAt: updatedAt, refresh: refresh };
		}
