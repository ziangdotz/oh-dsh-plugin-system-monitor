		const CSS = `
/* Host-native canvas / card / subpanel with restrained semantic color. */
.sys-root{
 --sys-canvas:var(--dsw-alias-bg-base,#f7f8fa);--sys-card:var(--dsw-alias-bg-layer-1,#fff);--sys-subtle:var(--dsw-alias-bg-layer-2,#f2f4f7);
 --sys-text:var(--dsw-alias-label-primary,#222);--sys-secondary:var(--dsw-alias-label-secondary,#555);--sys-muted:var(--dsw-alias-label-tertiary,#777);
 --sys-line:var(--dsw-alias-border-l2,#e4e7ec);--sys-brand:var(--dsw-alias-brand-primary,#3978e8);--sys-hover:var(--dsw-alias-interactive-bg-hover,var(--sys-subtle));
 --sys-control:var(--dsw-alias-bg-layer-2,#f2f4f7);--sys-subpanel:var(--dsw-alias-bg-layer-2,#f2f4f7);--sys-primary-fill:var(--dsw-alias-button-primary-fill,var(--sys-brand));--sys-primary-text:var(--dsw-alias-label-primary-foreground,#fff);
 --sys-fine:1px solid var(--sys-line);--sys-strong:1px solid var(--sys-line);--sys-card-radius:10px;--sys-card-shadow:none;--sys-tile-shadow:none;
 --sys-blue:var(--color-blue-500,#3b82f6);--sys-purple:var(--color-purple-500,#a855f7);--sys-green:var(--color-green-500,#22c55e);--sys-teal:var(--color-teal-500,#14b8a6);
 --sys-motion:var(--ds-transition-duration,.2s);--sys-ease:var(--ds-ease-in-out,ease-in-out);
 --sys-warn:var(--dsw-alias-state-warn-primary,#a76a13);--sys-danger:var(--dsw-alias-state-error-primary,#d94355);
 container:sysmon / inline-size;height:100%;min-height:0;box-sizing:border-box;display:flex;flex-direction:column;gap:14px;padding:16px;overflow:auto;background:var(--sys-canvas);color:var(--sys-text);font-family:var(--dsw-font-family,inherit);font-size:13px;line-height:1.5;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased
}
/* Explicit host theme marker; changes follow the host theme live. */
body:not([data-ds-dark-theme]) .sys-root{
 --sys-canvas:var(--dsw-static-neutral-bluish-75,var(--dsw-alias-bg-base,#f7f8fa));
 --sys-subpanel:var(--dsw-alias-bg-layer-1,#fff);--sys-control:var(--dsw-static-neutral-bluish-75,var(--sys-subtle));
 --sys-fine:.5px solid var(--dsw-alias-border-l3,var(--sys-line));--sys-strong:.5px solid var(--dsw-alias-border-l4,var(--sys-line));
 --sys-card-radius:12px;--sys-card-shadow:var(--dsw-shadow-lv1,0 1px 2px #00000008),var(--dsw-shadow-lv1-blur,0 2px 8px #00000004);--sys-tile-shadow:var(--dsw-shadow-lv1,0 1px 2px #00000008)
}
.sys-root *,.sys-root *::before,.sys-root *::after{box-sizing:border-box}
.sys-root button,.sys-root input,.sys-root select{font:inherit;color:inherit}
.sys-root button{cursor:pointer}.sys-root button:disabled{cursor:default;opacity:.5}
.sys-root :is(button,input,select):focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--sys-brand));outline-offset:3px}
.sys-root h2,.sys-root h3,.sys-root h4,.sys-root p{margin:0}
.sys-root h2,.sys-root h3{font-size:12px;font-weight:600}
.sys-dim{color:var(--sys-muted)}
.sys-view-nav{display:none;gap:4px}.sys-overview,.sys-right{scroll-margin-top:var(--sys-scroll-offset,120px)}.sys-overview:focus,.sys-right:focus{outline:none}
.sys-header{display:flex;align-items:center;flex-wrap:wrap;gap:12px 20px;min-width:0;flex:none}
.sys-brand{display:flex;align-items:center;gap:8px}.sys-mark{font-size:20px;line-height:28px;letter-spacing:-.02em;font-weight:500}
.sys-title,.sys-badge{font-size:10px;line-height:20px;padding:0 7px;border:var(--sys-strong);background:var(--sys-subpanel);border-radius:999px;color:var(--sys-muted);white-space:nowrap}
.sys-facts{display:flex;align-items:center;flex-wrap:wrap;gap:8px 16px;min-width:0;flex:1}
.sys-fact{display:inline-flex;gap:5px;align-items:center;min-width:0;white-space:nowrap;font-size:11px}
.sys-fact-k{color:var(--sys-muted)}.sys-fact-v{color:var(--sys-secondary);max-width:25ch;overflow:hidden;text-overflow:ellipsis}
.sys-controls{display:flex;align-items:center;gap:10px;margin-left:auto;flex-wrap:wrap}
.sys-status{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;font-size:11px;color:var(--sys-muted)}
.sys-dot{width:6px;height:6px;border-radius:50%;background:var(--sys-muted)}
.sys-dot[data-state=live]{background:var(--dsw-alias-state-success-primary,var(--sys-brand))}.sys-dot[data-state=offline]{background:var(--sys-danger)}
.sys-btn,.sys-select,.sys-kill{transition:background-color var(--sys-motion) var(--sys-ease),border-color var(--sys-motion) var(--sys-ease);appearance:none;border:var(--sys-strong);background:var(--sys-subtle);border-radius:6px;min-height:28px;padding:3px 12px;font-size:12px;white-space:nowrap}
.sys-select{appearance:auto;padding:4px 6px;color-scheme:dark}
body:not([data-ds-dark-theme]) .sys-select{color-scheme:light}
.sys-select option{background:var(--sys-subpanel);color:var(--sys-text)}
.sys-select option:checked{background:var(--sys-primary-fill);color:var(--sys-primary-text)}
.sys-interval{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--sys-muted)}
.sys-updated{font-size:10px;color:var(--sys-muted);margin-top:-12px}
.sys-banner{padding:8px 12px;border:1px solid color-mix(in srgb,var(--sys-danger) 25%,transparent);border-radius:8px;background:color-mix(in srgb,var(--sys-danger) 6%,var(--sys-card));color:var(--sys-danger);display:flex;flex-wrap:wrap;gap:6px;font-size:11px}
.sys-banner-text{font-weight:600}.sys-banner-msg{color:var(--sys-secondary);overflow-wrap:anywhere}
.sys-body{display:flex;flex-direction:column;gap:12px;min-width:0;flex:none}
.sys-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.sys-section-head>span{color:var(--sys-muted);font-size:10px}
.sys-overview{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start}
.sys-resource-grid,.sys-resource-fixed{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;min-width:0;align-items:stretch}
.sys-resource-grid{grid-template-rows:minmax(min-content,1fr);grid-auto-rows:min-content}
.sys-resource-grid,.sys-resource-fixed>.sys-panel{min-height:var(--sys-overview-height,0px)}
.sys-resource-fixed{align-self:start;align-items:start}
.sys-overview-measure{align-items:stretch}.sys-overview-measure .sys-resource-fixed{align-self:stretch;align-items:stretch}
.sys-resource-grid>[data-panel=disk]{min-height:110px}
.sys-cpu-model,.sys-device-name{font-size:11px;font-weight:500;overflow-wrap:anywhere;color:var(--sys-text)}
.sys-gpu-devices{display:flex;flex-direction:column;gap:12px;max-height:220px;overflow:auto;scrollbar-width:thin}
.sys-gpu-tabs{align-self:flex-start;flex-wrap:wrap}.sys-gpu-engines{display:flex;flex-direction:column;gap:7px;padding-top:8px}.sys-gpu-engine{display:flex;flex-direction:column;gap:4px;font-size:10px;color:var(--sys-secondary)}.sys-gpu-engine strong{font-weight:500}
.sys-gpu-device{display:flex;flex-direction:column;gap:8px}.sys-resource-note{font-size:10px;color:var(--sys-muted);margin:0;margin-top:auto;padding-top:8px}
.sys-core-caption{position:relative;z-index:1;display:flex;flex-direction:column;justify-content:space-between;gap:8px;height:100%;font-size:9px;color:var(--sys-secondary);pointer-events:none}.sys-core-caption strong{font-size:14px;line-height:1.2;font-weight:600;color:var(--sys-text);letter-spacing:-.02em;align-self:flex-start;padding:1px 3px;margin-left:-3px;border-radius:3px;background:color-mix(in srgb,var(--sys-subpanel) 90%,transparent)}
.sys-core-track{position:absolute;inset:0;display:flex;align-items:flex-end;overflow:hidden;pointer-events:none}
.sys-panel{min-width:0;display:flex;flex-direction:column;gap:8px;padding:10px 12px;background:var(--sys-card);border:var(--sys-fine);border-radius:var(--sys-card-radius);box-shadow:var(--sys-card-shadow)}
.sys-panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0}
.sys-panel-title{font-size:12px;font-weight:600}.sys-panel-extra{font-size:10px;color:var(--sys-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sys-hero{display:flex;align-items:end;justify-content:space-between;gap:8px;min-width:0;min-height:30px}
.sys-big{font-size:24px;line-height:1.1;font-weight:600;letter-spacing:-.04em}.sys-big-unit{font-size:13px;letter-spacing:0;font-weight:400;margin-left:3px;color:var(--sys-muted)}
.sys-mid{font-size:15px;font-weight:500;white-space:nowrap}.sys-hero-note{font-size:10px;color:var(--sys-muted);text-align:right;max-width:52%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sys-spark-wrap{width:100%;overflow:hidden;min-width:0;flex:none;color:var(--sys-brand)}.sys-spark{display:block;overflow:visible}.sys-spark-grid{stroke:var(--sys-line);stroke-width:1;stroke-dasharray:3 4;fill:none}.sys-spark-area{fill:currentColor;opacity:.08;stroke:none}.sys-spark-line{fill:none;stroke:currentColor;stroke-width:1.5;stroke-linejoin:round;stroke-linecap:round}
.sys-chart{min-width:0;color:var(--sys-series,var(--sys-brand));font-variant-numeric:tabular-nums;display:flex;flex-direction:column;gap:7px;margin:4px 0 2px}
.sys-chart-readout{display:flex;justify-content:space-between;gap:6px;color:var(--sys-secondary);font-size:10px;white-space:nowrap;min-height:14px}.sys-chart-readout>span:last-child{color:var(--sys-muted)}
.sys-chart-layout{position:relative;padding:3px 4px;min-width:0}
.sys-chart-axis{position:absolute;top:3px;right:8px;z-index:2;pointer-events:none;color:var(--sys-muted);font-size:10px;line-height:1.2}.sys-chart-axis span{position:absolute;right:0;transform:translateY(calc(-100% - 2px));white-space:nowrap;padding:0 2px;background:color-mix(in srgb,var(--sys-card) 90%,transparent);border-radius:2px}.sys-chart-axis span:first-child{transform:translateY(1px)}
.sys-chart-plot{position:relative;min-width:0;background:color-mix(in srgb,var(--sys-series,var(--sys-brand)) 3%,var(--sys-card));touch-action:pan-y;border-radius:2px;outline-offset:4px}
.sys-chart-plot:focus-visible{outline:2px solid var(--sys-series,var(--sys-brand))}
.sys-chart-grid-v{stroke:var(--sys-line);stroke-width:1;stroke-opacity:.45;stroke-dasharray:2 5}.sys-chart .sys-spark-grid{stroke-width:1;stroke-opacity:.8;stroke-dasharray:3 5}.sys-chart .sys-spark-line{stroke-width:1.6}.sys-chart .sys-spark-area{opacity:.12}
.sys-chart-cursor{stroke:var(--sys-secondary);stroke-width:1;stroke-dasharray:3 3}
.sys-chart-dot{position:absolute;transform:translate(-50%,-50%);width:5px;height:5px;border:1.5px solid var(--sys-card);background:currentColor;border-radius:50%;pointer-events:none}.sys-chart-latest{width:4px;height:4px;border-width:1px}
.sys-chart-time{padding:0 4px;display:flex;justify-content:space-between;color:var(--sys-muted);font-size:10px;line-height:1.3}
.sys-chart-stats{display:flex;justify-content:space-between;gap:6px;padding-top:6px;border-top:1px solid var(--sys-line);color:var(--sys-muted);font-size:10px}.sys-chart-stats strong{font-weight:500;color:var(--sys-secondary)}
@keyframes sys-chart-scan{from{transform:translateX(-100%)}to{transform:translateX(340%)}}
@keyframes sys-chart-pulse{50%{opacity:.35}}
@keyframes sys-chart-reveal{from{opacity:0}to{opacity:1}}
.sys-chart-loading{position:absolute;inset:0;overflow:hidden;pointer-events:none;display:grid;place-items:center;border-radius:inherit}
.sys-chart-scan{position:absolute;inset:0 auto 0 0;width:30%;background:linear-gradient(90deg,transparent,color-mix(in srgb,currentColor 10%,transparent),transparent);animation:sys-chart-scan 2.4s linear infinite}
.sys-chart-loading-label{display:flex;align-items:center;gap:7px;padding:6px 10px;border-radius:20px;background:color-mix(in srgb,var(--sys-card) 92%,transparent);color:var(--sys-secondary);font-size:11px;z-index:1}
.sys-chart-loading-label i{width:5px;height:5px;border-radius:50%;background:var(--sys-series,var(--sys-brand));animation:sys-chart-pulse 1.4s ease-in-out infinite}
.sys-chart[data-phase=ready] .sys-spark-line,.sys-chart[data-phase=ready] .sys-spark-area{animation:sys-chart-reveal .45s ease-out}
.sys-chart-empty{position:absolute;inset:0;display:grid;place-items:center;font-size:10px;color:var(--sys-muted)}
.sys-bar{height:4px;border-radius:4px;background:var(--sys-subtle);overflow:hidden;color:var(--sys-brand)}.sys-bar-fill{height:100%;border-radius:4px;background:currentColor;transition:width .2s ease}
.sys-cores{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;color:var(--sys-blue);max-height:260px;overflow:auto;scrollbar-width:thin}.sys-core{position:relative;isolation:isolate;min-width:0;height:72px;box-sizing:border-box;padding:7px 8px;background:var(--sys-subpanel);border:var(--sys-fine);border-radius:5px;overflow:hidden}.sys-core-fill{box-sizing:border-box;width:100%;background:color-mix(in srgb,currentColor 22%,transparent);border-top:2px solid color-mix(in srgb,currentColor 75%,transparent);transition:height .2s ease}.sys-core-fill[data-active=false]{border-top:0}

.sys-kv{display:flex;flex-direction:column;gap:6px;font-size:11px}.sys-kv-row{display:flex;justify-content:space-between;gap:12px;min-width:0}.sys-k{color:var(--sys-muted)}.sys-v{color:var(--sys-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sys-resource-link{display:flex;align-items:center;justify-content:space-between;gap:8px;background:none;border:0;border-top:1px solid var(--sys-line);padding:8px 0 0;margin-top:auto;text-align:left;color:var(--sys-muted)!important;font-size:10px!important}
.sys-resource-link[aria-pressed=true]{color:var(--sys-brand)!important}
.sys-io{display:flex;flex-direction:column;gap:4px}.sys-io-head{display:flex;justify-content:space-between;gap:8px;font-size:11px}.sys-io-label{color:var(--sys-muted)}.sys-io-value{color:var(--sys-text)}
.sys-ifaces{max-height:260px;overflow:auto;scrollbar-width:thin;display:flex;flex-direction:column;gap:5px;border-top:1px solid var(--sys-line);padding-top:8px;margin-top:2px}
.sys-iface{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;font-size:10px;color:var(--sys-secondary)}.sys-iface-name{color:var(--sys-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sys-iface-rate{white-space:nowrap}
.sys-net-idle,.sys-core-details,.sys-gpu-details{border-top:1px solid var(--sys-line);padding-top:8px;font-size:10px;color:var(--sys-muted)}.sys-net-idle summary,.sys-core-details summary,.sys-gpu-details summary{cursor:pointer;padding:2px 0;user-select:none}.sys-core-details .sys-cores{margin-top:8px}.sys-net-idle .sys-ifaces{border:0;padding-top:6px}.sys-net-empty{font-size:11px;color:var(--sys-muted);margin:0}.sys-gpu-legacy{color:var(--sys-warn);font-size:11px;line-height:1.6}
.sys-right{display:flex;flex-direction:column;gap:12px;min-width:0;margin-top:8px}
.sys-workspace{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;align-items:start;min-width:0}
.sys-list{grid-column:span 3;container:syslist / inline-size;min-width:0;display:flex;flex-direction:column;gap:10px}
.sys-table-bar{display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-width:0}
.sys-search-wrap{position:relative;flex:1;min-width:100px;max-width:380px;display:flex;align-items:center}.sys-search-icon{position:absolute;left:10px;color:var(--sys-muted);font-size:18px;pointer-events:none}
.sys-search{width:100%;height:30px;border:var(--sys-strong);border-radius:6px;background:var(--sys-subtle);padding:0 30px!important;color:var(--sys-text);font-size:12px!important;outline-offset:1px!important}
.sys-search::placeholder{color:var(--dsw-alias-label-dimmed,var(--sys-muted))}.sys-search:focus{border-color:var(--dsw-alias-state-business-primary,var(--sys-brand))}.sys-search::-webkit-search-cancel-button{display:none}.sys-search-clear{position:absolute;right:5px}.sys-count{margin-left:auto;font-size:11px;color:var(--sys-secondary);white-space:nowrap;background:var(--sys-subpanel);border-radius:8px;padding:1px 7px}
.sys-table{height:clamp(240px,55dvh,440px);min-height:200px;border:var(--sys-fine);border-radius:var(--sys-card-radius);box-shadow:var(--sys-card-shadow);background:var(--sys-card);overflow:hidden}
.sys-scroll{overflow-anchor:none;height:100%;overflow:auto;scrollbar-width:thin;overscroll-behavior:contain}
.sys-tr{display:grid;grid-template-columns:64px 60px 60px 86px 44px 82px minmax(135px,1fr);align-items:center;min-width:600px;height:32px;padding:0 10px;font-size:11px;cursor:pointer;border-bottom:1px solid color-mix(in srgb,var(--sys-line) 45%,transparent)}
.sys-thead{position:sticky;top:0;z-index:1;height:32px;background:var(--sys-subtle);cursor:default;color:var(--sys-muted);border-bottom:1px solid var(--sys-line)}
.sys-th{display:flex;align-items:center;min-width:0;height:100%}.sys-th-btn{appearance:none;background:none;border:0;padding:0;width:100%;height:100%;display:flex;align-items:center;gap:3px;color:inherit;font-size:10px!important}.sys-th.sys-cell-num .sys-th-btn{justify-content:end}
.sys-sort-mark{font-size:7px;color:var(--sys-brand)}.sys-cell{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;padding-right:6px;color:var(--sys-secondary)}.sys-cell-num{text-align:right;padding-left:4px;padding-right:10px}
.sys-cmd{color:var(--sys-text)}.sys-pid{background:none;border:0;padding:0;color:inherit;font-size:11px!important;cursor:pointer}
.sys-row-selected{background:color-mix(in srgb,var(--sys-brand) 7%,var(--sys-card));box-shadow:inset 2px 0 var(--sys-brand)}.sys-row-selected .sys-pid{color:var(--sys-brand);font-weight:600}
.sys-list[data-sort=cpu] .sys-th:nth-child(2),.sys-list[data-sort=mem] .sys-th:nth-child(3){color:var(--sys-brand)}
.sys-empty{display:flex;align-items:center;justify-content:center;min-height:240px;text-align:center}.sys-empty-cell{padding:24px;color:var(--sys-secondary)}.sys-empty-cell p{margin-top:8px;color:var(--sys-muted);font-size:11px}
.sys-pager{display:flex;justify-content:center;align-items:center;gap:10px;font-size:11px;color:var(--sys-secondary)}.sys-pager .sys-btn{padding:0;width:26px;min-height:24px}
.sys-selection-pill{align-self:start;display:inline-flex;align-items:center;gap:6px;max-width:100%;padding:3px 10px;border:1px solid color-mix(in srgb,var(--sys-blue) 40%,transparent);border-radius:999px;background:color-mix(in srgb,var(--sys-blue) 8%,var(--sys-card));color:var(--sys-blue)!important;font-size:11px!important}.sys-selection-pill strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}.sys-selection-pill span{flex:none}

.sys-inspector-jump{display:none;align-self:flex-end}
.sys-inspector{position:sticky;top:0;min-width:0;min-height:482px;padding:10px 12px;border:var(--sys-fine);border-radius:var(--sys-card-radius);box-shadow:var(--sys-card-shadow);background:var(--sys-card);display:flex;flex-direction:column;gap:14px}
.sys-inspector:focus-visible{outline:2px solid var(--sys-brand);outline-offset:2px}
.sys-inspector-head{display:flex;align-items:center;gap:8px}.sys-inspector-head h3{margin-right:auto}.sys-inspector[data-inspector-state=pinned] .sys-badge{color:var(--sys-brand);border-color:color-mix(in srgb,var(--sys-brand) 20%,var(--sys-line))}
.sys-inspector-content{display:flex;flex-direction:column;gap:12px;min-width:0}.sys-process-avatar{width:32px;height:32px;display:grid;place-items:center;background:var(--sys-subtle);border:1px solid var(--sys-line);border-radius:8px;font-size:15px;color:var(--sys-muted)}
.sys-inspector-content h4{font-size:14px;overflow-wrap:anywhere;font-weight:600}.sys-inspector-sub{font-size:10px;color:var(--sys-muted);margin-top:-10px}
.sys-detail-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sys-detail-stats>div{display:flex;flex-direction:column;gap:2px;padding:8px;border:var(--sys-fine);background:var(--sys-subpanel);border-radius:8px;box-shadow:var(--sys-tile-shadow)}.sys-detail-stats span{font-size:10px;color:var(--sys-muted)}.sys-detail-stats strong{font-size:20px;font-weight:600}
.sys-inspector-note{font-size:10px;color:var(--sys-muted)}.sys-inspector-actions{border-top:1px solid var(--sys-line);padding-top:12px;display:flex;flex-direction:column;gap:8px}.sys-inspector-actions p{font-size:10px;color:var(--sys-muted)}
.sys-kill{color:var(--sys-danger)!important;align-self:start}.sys-kill[data-armed=true]{border-color:var(--sys-danger);background:color-mix(in srgb,var(--sys-danger) 8%,var(--sys-card))}
.sys-icon-btn{border:0;background:none;width:22px;height:22px;display:grid;place-items:center;padding:0;flex:none;color:var(--sys-muted);border-radius:4px;font-size:15px!important}
.sys-kill-error{display:flex;align-items:start;gap:6px;color:var(--sys-danger);font-size:11px;overflow-wrap:anywhere}.sys-kill-error>span{flex:1}
.sys-inspector-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;padding:30px 8px;color:var(--sys-muted)}.sys-inspector-empty strong{font-size:12px;color:var(--sys-secondary)}.sys-inspector-empty p{font-size:11px;max-width:190px}
.sys-sev-ok,.sys-sev-none{color:inherit}.sys-root .sys-sev-warn{color:var(--sys-warn)}.sys-root .sys-sev-crit{color:var(--sys-danger)}.sys-tone-a{color:var(--sys-brand)}.sys-tone-b{color:var(--sys-secondary)}
@media(hover:hover){.sys-btn:hover,.sys-icon-btn:hover,.sys-select:hover,.sys-kill:hover:not(:disabled){background:var(--sys-hover)}.sys-tr:not(.sys-thead):not(.sys-row-selected):hover{background:var(--sys-hover)}.sys-resource-link:hover{color:var(--sys-brand)!important}.sys-pid:hover{text-decoration:underline}}

/* Category colors stay stable; severity colors still override actual warnings. */
.sys-panel[data-panel=cpu]{--sys-series:var(--sys-blue)}.sys-panel[data-panel=mem]{--sys-series:var(--sys-purple)}.sys-panel[data-panel=net]{--sys-series:var(--sys-green)}.sys-panel[data-panel=disk]{--sys-series:var(--sys-teal)}
.sys-panel .sys-spark-wrap,.sys-panel .sys-bar,.sys-panel .sys-cores{color:var(--sys-series)}
.sys-panel .sys-spark-wrap.sys-sev-warn,.sys-panel .sys-bar.sys-sev-warn{color:var(--sys-warn)}.sys-panel .sys-spark-wrap.sys-sev-crit,.sys-panel .sys-bar.sys-sev-crit{color:var(--sys-danger)}
.sys-panel-title::before{content:"";display:inline-block;width:7px;height:7px;margin-right:6px;border-radius:2px;background:var(--sys-series)}
body:not([data-ds-dark-theme]) .sys-panel-head{padding-bottom:7px;margin-bottom:1px;border-bottom:var(--sys-strong)}
.sys-segmented{display:flex;gap:2px;padding:1px;background:var(--sys-control);border:var(--sys-fine);border-radius:6px;flex:none}
.sys-segment{border:0;border-radius:5px;background:transparent;color:var(--sys-secondary)!important;line-height:1;min-height:24px;padding:3px 8px;font-size:11px!important;white-space:nowrap;transition:background-color var(--sys-motion) var(--sys-ease),color var(--sys-motion) var(--sys-ease)}
.sys-segment[aria-pressed=true]{background:var(--sys-primary-fill);color:var(--sys-primary-text)!important}
.sys-segment:not([aria-pressed=true]):hover{background:var(--sys-hover)}
.sys-row-selected{background:color-mix(in srgb,var(--sys-blue) 9%,var(--sys-card));box-shadow:inset 2px 0 var(--sys-blue)}
.sys-detail-stats>div:first-child strong{color:var(--sys-blue)}.sys-detail-stats>div:last-child strong{color:var(--sys-purple)}
[data-sidebar-right-open] .sys-root,[data-sidebar-right-float-host] .sys-root{padding:12px}

.sys-panel[data-panel=gpu]{--sys-series:var(--sys-blue)}
/* Respond to the DSH pane and list widths, even in a wide browser window. */
@container sysmon (max-width:1100px){.sys-inspector-jump{display:block}.sys-facts{order:3;flex-basis:100%}.sys-workspace{grid-template-columns:minmax(0,1fr)}.sys-list{grid-column:auto}.sys-inspector{position:static;min-height:0}.sys-inspector-content{display:grid;grid-template-columns:1fr 1fr;align-items:start;gap:12px 24px}.sys-inspector-content .sys-process-avatar{display:none}.sys-inspector-content h4,.sys-inspector-sub{grid-column:1}.sys-inspector-sub{margin-top:0}.sys-detail-stats{grid-column:2;grid-row:1 / span 3}.sys-inspector-actions{grid-column:1 / -1}.sys-inspector-empty{padding:12px;min-height:120px}}
@container sysmon (max-width:1000px){
.sys-view-nav{display:flex}.sys-header{position:sticky;top:-16px;z-index:5;background:var(--sys-canvas);padding:8px 0;border-bottom:1px solid var(--sys-line);gap:8px 12px}.sys-mark{font-size:18px}.sys-facts{order:3;flex-basis:100%;gap:5px 12px}.sys-updated{margin-top:-6px}
.sys-overview{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}.sys-resource-grid,.sys-resource-fixed{display:contents}.sys-resource-grid,.sys-resource-fixed>.sys-panel{min-height:0}
.sys-overview [data-panel=cpu]{grid-column:1;grid-row:1}.sys-overview [data-panel=net]{grid-column:2;grid-row:1}.sys-overview [data-panel=mem]{grid-column:1;grid-row:2}.sys-overview [data-panel=gpu]{grid-column:2;grid-row:2}
.sys-overview [data-panel=disk]{grid-row:auto;grid-column:auto}.sys-panel{align-self:start}.sys-resource-note{margin-top:0}.sys-panel .sys-chart-plot{height:112px!important}.sys-panel[data-panel=net] .sys-chart-plot{height:76px!important}.sys-chart-axis{height:112px!important}.sys-panel[data-panel=net] .sys-chart-axis{height:76px!important}
.sys-search-wrap{max-width:none}.sys-panel-head{flex-wrap:wrap;gap:4px}.sys-panel-extra{max-width:100%}
}

@container sysmon (max-width:900px){.sys-section-head>span{max-width:100%}.sys-controls{gap:8px}}
@container syslist (max-width:700px){.sys-tr{grid-template-columns:62px 58px 58px 82px minmax(140px,1fr);min-width:440px}.sys-tr>:nth-child(4),.sys-tr>:nth-child(5){display:none}}
@container sysmon (max-width:580px){.sys-overview{grid-template-columns:minmax(0,1fr)}.sys-overview [data-panel]{grid-column:1;grid-row:auto}.sys-overview [data-panel=cpu]{order:0}.sys-overview [data-panel=net]{order:1}.sys-overview [data-panel=mem]{order:2}.sys-overview [data-panel=gpu]{order:3}.sys-overview [data-panel=disk]{order:4}.sys-fact{font-size:10px}.sys-header{gap:6px 10px}.sys-title{display:none}.sys-controls{gap:6px}.sys-view-nav .sys-btn{padding:3px 9px}}
@container syslist (max-width:520px){.sys-tr{grid-template-columns:52px 54px 54px minmax(130px,1fr);min-width:306px;padding:0 8px}.sys-tr>:nth-child(6){display:none}}
@container sysmon (max-width:480px){.sys-controls{margin-left:0;flex-basis:100%}.sys-facts{gap:5px 12px}.sys-inspector-content{display:flex;flex-direction:column;align-items:stretch}.sys-detail-stats{width:100%}.sys-mark{font-size:17px}.sys-section-head{gap:4px}.sys-table-bar{gap:8px}.sys-count{font-size:9px}}
@media(prefers-reduced-motion:reduce){.sys-root *{transition:none!important;animation:none!important}}

`;
