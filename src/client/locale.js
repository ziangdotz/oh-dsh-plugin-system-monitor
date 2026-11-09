		function detectChinese() {
			var nav = "";
			var doc = "";
			try {
				if (typeof navigator !== "undefined" && navigator) nav = String(navigator.language || "");
			} catch (error) {
				nav = "";
			}
			try {
				if (typeof document !== "undefined" && document && document.documentElement) doc = String(document.documentElement.lang || "");
			} catch (error) {
				doc = "";
			}
			return /^zh/i.test(doc || nav);
		}

		function buildText(chinese) {
			if (chinese) return {
				chartPreparing: "正在采集首批数据…", chartBuilding: "正在形成趋势…", chartCurrent: "当前", chartRange: "窗口", chartSample: "采样点", chartSamples: "个采样点", chartMissing: "采样缺失", chartHistory: "历史曲线", chartKeyboard: "左右键查看采样点，Home/End 跳转", chartAgo: "前", chartFirst: "首个采样", chartLatest: "最近采样", chartPeak: "峰值", chartAverage: "均值", chartWaiting: "等待有效采样",
				gpuEngines: "引擎占用", gpuBasis: "最繁忙引擎", gpuSelect: "选择 GPU", gpuRestart: "当前采集接口未提供 GPU 利用率，请完全退出并重启 DSH。", gpuUnavailable: "GPU 利用率计数器不可用，设备信息仍可查看。",
				gpuLegacy: "宿主接口尚未提供 GPU 信息，请完全退出并重新启动 DSH。", netIdle: "其他接口（暂无流量）", netInterfaces: "个接口", netEmpty: "暂无可用网络接口",
				gpu: "GPU", dedicatedMemory: "专用显存容量", sharedMemory: "共享内存上限", gpuNote: "显存显示容量与共享上限，非当前使用量", noGpu: "未检测到 GPU 或设备信息不可用", physicalCores: "物理核心", logicalProcessors: "逻辑处理器", packages: "插槽", logicalProcessor: "逻辑处理器", frequency: "平均频率",
				overview: "资源概览", processDetails: "进程详情", preview: "悬停预览", pinned: "已固定", unpin: "取消固定", inspectHint: "悬停预览进程，点击或按 Enter 固定详情。", cpuBasis: "CPU 以整机容量为基准", focusCpu: "查看 CPU 占用最高的进程", focusMem: "查看内存占用最高的进程", linked: "联动排序", clearSearch: "清除搜索", endHint: "结束进程将丢失未保存的数据。", unavailable: "无权限读取或暂不可用", processCount: "个进程", workingSet: "工作集", resources: "资源", overviewHint: "最近 90 次采样 · 点击资源查看相关进程", waiting: "等待首份系统快照", noMatchHint: "尝试其他名称或 PID，或清除搜索。", processing: "正在结束…", searchHint: "按名称或 PID 查找进程", emptyInspector: "选择一个进程", viewDetails: "查看详情", previousPage: "上一页", nextPage: "下一页", pageOf: "第 {n} / {m} 页",
				sidebarLabel: "系统监控",
				pageTitle: "系统监控",
				host: "主机",
				kernel: "系统",
				uptime: "正常运行时间",
				load: "负载",
				procs: "进程",
				pause: "暂停",
				resume: "继续",
				refresh: "间隔",
				live: "实时",
				paused: "已暂停",
				offline: "离线 — 重试中",
				collecting: "采集数据中…",
				sampling: "采样中…",
				cpu: "处理器",
				mem: "内存",
				net: "网络",
				disk: "磁盘",
				pressure: "压力",
				cores: "核",
				rx: "下行",
				tx: "上行",
				read: "读",
				write: "写",
				available: "可用",
				buffers: "缓冲",
				cached: "缓存",
				swap: "交换",
				pressureCpu: "CPU",
				pressureIo: "IO",
				pressureMem: "内存",
				search: "搜索进程名称或 PID…",
				processPanel: "进程",
				showing: "显示 {n} / {m}",
				colPid: "PID",
				colUser: "用户",
				colCpu: "CPU%",
				colMem: "内存%",
				colRss: "工作集",
				colThr: "线程",
				colState: "状态",
				colTime: "CPU 时间",
				colCmd: "进程名称",
				selectPid: "选择进程",
				selected: "已选",
				killKill: "结束进程",
				confirmKill: "再次点击确认结束",
				killFailed: "终止失败：",
				dismiss: "关闭",
				selectHint: "选择进程以查看操作 · CPU 占比以整机为基准",
				noProcs: "无匹配进程",
				sortBy: "按 {name} 排序",
				updated: "更新于",
			};
			return {
				chartPreparing: "Collecting initial samples…", chartBuilding: "Building the trend…", chartCurrent: "Current", chartRange: "Window", chartSample: "Sample", chartSamples: "samples", chartMissing: "Missing sample", chartHistory: "History", chartKeyboard: "Use arrow keys to inspect samples, Home/End to jump", chartAgo: "ago", chartFirst: "First sample", chartLatest: "Latest sample", chartPeak: "Peak", chartAverage: "Average", chartWaiting: "Waiting for valid samples",
				gpuEngines: "Engine usage", gpuBasis: "Busiest engine", gpuSelect: "Select GPU", gpuRestart: "The collector has no GPU utilization data. Fully quit and restart DSH.", gpuUnavailable: "GPU utilization counters unavailable; device information remains available.",
				gpuLegacy: "The host API has no GPU information yet. Fully quit and restart DSH.", netIdle: "Other interfaces (no traffic)", netInterfaces: "interfaces", netEmpty: "No network interfaces available",
				gpu: "GPU", dedicatedMemory: "Dedicated memory capacity", sharedMemory: "Shared memory limit", gpuNote: "Memory values show capacity and shared limit, not current usage", noGpu: "No GPU detected or device information unavailable", physicalCores: "Physical cores", logicalProcessors: "Logical processors", packages: "Sockets", logicalProcessor: "Logical processor", frequency: "Average frequency",
				overview: "Resource overview", processDetails: "Process details", preview: "Preview", pinned: "Pinned", unpin: "Unpin process", inspectHint: "Hover to preview. Click or press Enter to pin details.", cpuBasis: "CPU is % of total machine capacity", focusCpu: "Show top CPU processes", focusMem: "Show top memory processes", linked: "Linked sort", clearSearch: "Clear search", endHint: "Ending a process discards unsaved work.", unavailable: "Access denied or unavailable", processCount: "processes", workingSet: "Working set", resources: "Resources", overviewHint: "Last 90 samples · Select a resource to explore processes", waiting: "Waiting for the first system snapshot", noMatchHint: "Try another name or PID, or clear the search.", processing: "Ending…", searchHint: "Find a process by name or PID", emptyInspector: "Choose a process", viewDetails: "View details", previousPage: "Previous page", nextPage: "Next page", pageOf: "Page {n} of {m}",
				sidebarLabel: "System Monitor",
				pageTitle: "System Monitor",
				host: "host",
				kernel: "System",
				uptime: "uptime",
				load: "load",
				procs: "procs",
				pause: "pause",
				resume: "resume",
				refresh: "interval",
				live: "live",
				paused: "paused",
				offline: "offline — retrying",
				collecting: "collecting…",
				sampling: "sampling…",
				cpu: "CPU",
				mem: "Memory",
				net: "Network",
				disk: "Disk",
				pressure: "Pressure",
				cores: "cores",
				rx: "rx",
				tx: "tx",
				read: "read",
				write: "write",
				available: "available",
				buffers: "buffers",
				cached: "cached",
				swap: "swap",
				pressureCpu: "CPU",
				pressureIo: "IO",
				pressureMem: "Mem",
				search: "Search processes or PID…",
				processPanel: "Processes",
				showing: "showing {n} of {m}",
				colPid: "PID",
				colUser: "USER",
				colCpu: "CPU%",
				colMem: "MEM%",
				colRss: "Working set",
				colThr: "THR",
				colState: "STATE",
				colTime: "CPU time",
				colCmd: "Process name",
				selectPid: "select process",
				selected: "selected",
				killKill: "End process",
				confirmKill: "Confirm end process",
				killFailed: "kill failed: ",
				dismiss: "Dismiss",
				selectHint: "Select a process for actions · CPU is % of total capacity",
				noProcs: "no matching processes",
				sortBy: "sort by {name}",
				updated: "updated",
			};
		}

		const dictionaries = { zh: buildText(true), en: buildText(false) };
		const TEXT = new Proxy({}, { get: function (_, key) { return dictionaries[detectChinese() ? "zh" : "en"][key]; } });
		function useLocale() {
			const [, update] = useState(0);
			useEffect(function () {
				function changed() { update(function (n) { return n + 1; }); }
				const observer = new MutationObserver(changed);
				observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
				window.addEventListener("languagechange", changed);
				return function () { observer.disconnect(); window.removeEventListener("languagechange", changed); };
			}, []);
		}
