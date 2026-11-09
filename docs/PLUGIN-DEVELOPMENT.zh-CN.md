# 插件开发与本地安装

## 官方依据

以本机 DSH 0.2.2-rc.1 随应用分发的官方 README 与包协议为运行依据，并核对官方仓库：

- [插件入口、依赖注入和生命周期](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/index.md)
- [包清单协议](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/util/package-manifest/README.md)
- [客户端模块协议](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/modules/README.md)
- [CLI 与 profile](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md)

官方没有要求第三方插件照搬整个官方 monorepo。本项目发布可直接加载的 JavaScript Bundle，开发时通过轻量拼接脚本生成前端产物，按官方安装与加载契约规范化。

## 目录职责

| 路径 | 职责 |
| --- | --- |
| `package.json` | ESM Host 入口、Client 导出、bundle 清单、兼容版本和发布白名单 |
| `cordis.patch.yml` | 仅插入 `SysMon（System Monitor）` 条目，不修改宿主其他插件 |
| `lib/index.js` | Host：命名导出 `apply`、`name`、`inject`，注册认证路由并管理采集器 |
| `native/sysmon.c`、`lib/native/win32-x64/sysmon-probe.exe` | 原生 Windows x64 采集器源码与发行二进制 |
| `src/client/`、`lib/client.js` | Client 源码与生成产物：惰性 ModuleLoader factory，仅使用宿主 React 与 slots 服务 |
| `locale/en.json`、`locale/zh.json` | 插件管理页标题、描述及详情文档 |
| `icon.svg`、`LICENSE` | 插件图标、MIT 许可声明 |
| `scripts/` | 包契约、Host 和浏览器验证，不进入安装包 |
| `docs/` | 界面设计与开发记录；发布保留使用文档及 Windows 截图 |

## 协议约定

- 声明 `dsh.manifestVersion: 1`、`dsh.bundle.patch` 和 `dsh.bundle.platforms: ["win32"]`。
- 同时声明 npm `os: ["win32"]` 与 `cpu: ["x64"]`；Windows 10/11 版本限制由 Host 校验，Windows Server 不支持。
- `engines.node` 为 `>=24.9.0`；`engines.dsh` 暂锁定本机已核对的 `0.2.2-rc.1`。
- Client 导出 `./client`，声明 `dsh.client.platform: "web"`；该客户端协议也用于 DSH 桌面应用。
- React 属于宿主基线，不重复安装或打包；没有额外 external、生产依赖或安装生命周期脚本。
- Host 注入 `connection`，Client 注入 `slots`；Host 采集器和路由使用 `ctx.effect` 提供卸载清理，Client 使用 React effect 清理轮询与监听。
- 监控页 CSS 位于 React 页面生命周期内；插件列表包名隐藏样式由 `ctx.effect` 注入并在卸载时移除。
- 不添加无实际用途的 Config schema，不修改其他插件或 Agent preset。
- 包名为 `dsh-plugin-sysmon`，条目 ID 为 `SysMon（System Monitor）`，项目按自身的 Windows 系统监控需求开发和维护，版本保持 `0.1.0`。

## 本次本地安装

2026-11-06 使用桌面应用自带的官方命令完成：

```powershell
dsh plugin --profile desktop add "C:/Users/ziangdotz/Desktop/Projects/oh-dsh-plugin-system-monitor"
```

目标为 `C:/Users/ziangdotz/.dsh/profiles/desktop`，依赖为本地 `link:`，bundle 列表启用 `dsh-plugin-sysmon` 一次。
安装前的 manifest、lockfile、workspace 配置及用户 patch 备份到该 profile 的
`.plugin-manager/backups/sysmon-20261106/`。用户 patch 没有手工添加覆盖条目。

完整退出并重新打开 DSH 桌面应用，再手动验证：

1. 插件管理中显示「dsh-plugin-sysmon」，侧栏可打开「系统监控」。
2. 等待两次采样，确认 CPU、内存、网卡和磁盘数据更新；首次差值指标为 `—` 属正常情况。
3. 验证浅色/深色、窄栏折叠、排序、筛选、分页和固定详情。
4. 验证暂停/恢复；切换页面后后台采集约 6 秒无请求时退出。
5. 如需验证结束操作，仅对自己创建的临时进程操作，确认二次点击流程和结果。

CLI 安装、包契约和采集测试不代替用户在桌面应用中的视觉验收。依赖管理器曾提示 profile 的 peer 依赖警告；本插件没有新增运行时依赖，未对其他插件执行升级或修复。

安装链接指向当前项目；Host、Client、patch、图标与中英文 locale 均已验证可解析。Windows 11 原生采集、磁盘读取、进程身份保护、自建测试进程结束与空闲释放已通过。内存结果见 `MEMORY.zh-CN.md`。

## 原生构建与验证

版本保持 `0.1.0`。开发时执行 `npm run build:native`，安装时直接使用已编译程序，无安装脚本和第三方运行时 DLL。构建开启 `-Wall -Wextra -Werror`，使用 MinGW-w64 GCC。

`node scripts/native-smoke.mjs` 验证非法参数、Unicode 进程名与父进程退出清理；Host 测试验证累计磁盘计数器差值与重置、CPU、网络、PID 身份校验及原生结束操作。

## 统一回归入口

执行 `npm ci --ignore-scripts`、`npm run test:setup`、`npx playwright install chromium` 后运行 `npm test`。已有浏览器可设置 `CHROME_EXE`。完整测试会创建并结束自己的临时进程，不终止现有应用；浏览器使用模拟数据。原生改动执行 `npm run build:native`，前端改动执行 `npm run build:client`，然后运行统一验证。

新增异常回归覆盖原生协议字段验证及原子提交、墙上时间变化、网卡消失与重新出现、长间隔、空闲重启等待、采集器崩溃与卡死、旧 worker 输出、非法输出和卸载。浏览器回归覆盖重复快照去重、相同快照下断线恢复、历史断点和时间间隔、语言动态切换，以及大列表翻页滚动重置。

### 资源布局与设备信息

原生程序补充 CPU 物理核心、逻辑处理器及插槽信息；GPU 使用 DXGI 枚举硬件设备及容量，使用共享 PDH 查询采集每进程引擎利用率，按 LUID 在 Host 聚合。网络使用接口标志排除 FilterInterface 与 EndPointInterface，不根据名称猜测过滤器。资源区布局和多磁盘/无设备回退由浏览器 smoke 覆盖。

API 依据：[CPU 拓扑](https://learn.microsoft.com/en-us/windows/win32/api/sysinfoapi/nf-sysinfoapi-getlogicalprocessorinformationex)、[GPU 设备描述与容量](https://learn.microsoft.com/en-us/windows/win32/api/dxgi/ns-dxgi-dxgi_adapter_desc1)、[网络接口标志](https://learn.microsoft.com/en-us/windows/win32/api/netioapi/ns-netioapi-mib_if_row2)。
