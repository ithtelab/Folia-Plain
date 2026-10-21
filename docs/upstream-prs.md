# 上游 PR 筛选与移植记录

筛选日期：2026-10-21。上游：[chthollyphile/folia-major](https://github.com/chthollyphile/folia-major)。当时公开未合并 PR 共 **22 个**。本轮对全部 PR 做范围初筛，对候选修复阅读差异与讨论，最终移植 **7 个**。

这是 Folia Plain 的选择性移植，不表示上游已经合并或认可。未合入不等于拒绝该功能；较大的平台、UI、原生与协议改动留待独立验收。本轮没有加入依赖、二次元素材、原版反馈/更新地址或上游发布流程。

## 已合入

| PR | 功能/修复 | 本分支处理 |
| --- | --- | --- |
| [#555](https://github.com/chthollyphile/folia-major/pull/555) | fix(visualizer): fade out completed subtitles during interludes | 长间奏的翻译/音译在播放时间经过 1.5 秒后淡出；暂停冻结保留期，跳转重新选行。适配了当前 Fume 目录，保留低频 React 更新。 |
| [#654](https://github.com/chthollyphile/folia-major/pull/654) | fix(electron): 内嵌后端 7 条 IPC 通道补来源校验（fail closed） | 内嵌后端 7 条 IPC 仅信任主窗口和遥控窗，缺少校验时拒绝访问。移植保留当前版的异步诊断与 restart reason 参数，未照搬旧版实现。 |
| [#686](https://github.com/chthollyphile/folia-major/pull/686) | fix(stage): 进入舞台前收到的 Now Playing 播放状态不再丢失 | 保留进入舞台前收到的 Now Playing 暂停状态。适配到现有 playback 目录；补真实 hook/store 回归，旧行为在新测试中失败。 |
| [#763](https://github.com/chthollyphile/folia-major/pull/763) | perf(i18n): 去掉 flattenLocale 启动时的重复拷贝 | 将中文兜底词典展平时的重复对象拷贝改为单个累加表，保留键顺序、覆盖、数组与空值语义。 |
| [#768](https://github.com/chthollyphile/folia-major/pull/768) | fix(remote): 遥控窗口关闭后重新打开时记住上次的位置 | 遥控窗重新打开时恢复位置。另修补原 PR 的横向拔屏遗漏、不同尺寸屏幕和任务栏工作区边界，避免窗口在屏幕外恢复。 |
| [#795](https://github.com/chthollyphile/folia-major/pull/795) | fix(lyrics): 避免深色歌词光晕形成黑色模糊 | 按实际颜色亮度平滑降低深色歌词光晕，避免黑色模糊；保留字形边界、位置、时序与用户开关。 |
| [#796](https://github.com/chthollyphile/folia-major/pull/796) | fix(theme): 防止切歌后旧生成结果覆盖当前主题 | AI 或封面主题完成时重新核对当前歌曲，迟到结果只保存到原歌曲缓存，不覆盖另一首的画面、缓存标记和提示。 |

## 来源与作者

以下为评估时锁定的 PR head；实现和测试来自对应贡献者，并按当前源码适配。既有版权与 AGPL-3.0 保留。

| PR | 贡献者 | 上游 head SHA |
| --- | --- | --- |
| [#555](https://github.com/chthollyphile/folia-major/pull/555) | [mercury125](https://github.com/mercury125) | `d5c7ba7e7ea321fcdacaf7972394e5f16933afb3` |
| [#654](https://github.com/chthollyphile/folia-major/pull/654) | [rui08984-dot](https://github.com/rui08984-dot) | `efc256dda679e165c7e23ed7aee0f962722ae35a` |
| [#686](https://github.com/chthollyphile/folia-major/pull/686) | [haixianma422-maker](https://github.com/haixianma422-maker) | `ffdd389dce651341249e12294670a533bb960840` |
| [#763](https://github.com/chthollyphile/folia-major/pull/763) | [MaybeJustLikeThis](https://github.com/MaybeJustLikeThis) | `620645864103c5effe4b6ee0a5a0ccf90f592426` |
| [#768](https://github.com/chthollyphile/folia-major/pull/768) | [wenqa1](https://github.com/wenqa1) | `0d8a97949539fd844493aa09aec843b83c963520` |
| [#795](https://github.com/chthollyphile/folia-major/pull/795) | [pcppp](https://github.com/pcppp) | `cf35dc659d9d33ce002c03334d034b413162f327` |
| [#796](https://github.com/chthollyphile/folia-major/pull/796) | [pcppp](https://github.com/pcppp) | `b970bb2550500b2c016c7b2614a15359a6246dbe` |

## 本轮暂缓

| PR | 内容 | 原因/下一步 |
| --- | --- | --- |
| [#544](https://github.com/chthollyphile/folia-major/pull/544) | feat(i18n): add Vietnamese localization support | 新增大规模越南语翻译，需要同步本分支中性化文案、所有语言选择入口、打包与翻译完整性；本轮不优先。 |
| [#810](https://github.com/chthollyphile/folia-major/pull/810) | feat(folium): mod-writable graph equalizer (folium.audioMix) | 新增模组写 EQ 的权限/API，但尚无对应回归测试；需单独验证权限边界、槽位持久化和文档生成。 |
| [#760](https://github.com/chthollyphile/folia-major/pull/760) | feat(qishui): 桌面端接入汽水音乐扫码登录、曲库和场景电台 | 汽水接入涉及 81 个文件、新平台包和真实登录/长期续期；依赖 #799，需独立做桌面和平台验收。 |
| [#799](https://github.com/chthollyphile/folia-major/pull/799) | feat(playback): 试听片段的歌词时钟按片段起点对齐 | 是试听起点的通用契约，但当前平台均未填写字段；先保留为汽水等后续接入的前置项。 |
| [#790](https://github.com/chthollyphile/folia-major/pull/790) | fix(onlineMusic): 登录态搜索返回空首页时回退匿名搜索 | 维护者已指出第一页回退后翻页又走会话路径，以及 QQ/酷狗对匿名失败的处理不一致；本轮不引入这份不完整回退。 |
| [#785](https://github.com/chthollyphile/folia-major/pull/785) | fix(wallpaper/mac): 壁纸模式点击不再触发台前调度收走窗口 | 涉及 macOS 原生 Swift、辅助功能授权与窗口层级；本机 Windows 无法完成实机验证。 |
| [#777](https://github.com/chthollyphile/folia-major/pull/777) | feat: 支持拖动调整歌曲信息卡片位置 | 有用的交互功能，涉及拖拽、持久化、导入导出和布局；单独一轮 UI 验证后再纳入。 |
| [#774](https://github.com/chthollyphile/folia-major/pull/774) | feat: AI 供应商预设与模型下拉选择 | 有用的新功能，涉及多个 AI 协议、模型列表、密钥与代理；需要单独的服务和界面验收。 |
| [#741](https://github.com/chthollyphile/folia-major/pull/741) | feat(lyrics): 全曲扫描制作人员块，不再只认开头 | 会改变全曲制作人员块判定和歌词过滤，需单独用多来源歌词检验误判与预览一致性。 |
| [#706](https://github.com/chthollyphile/folia-major/pull/706) | feat(build): add native Windows ARM64 releases | 改动面向上游发布工作流，且 PR 描述依赖 FFmpeg ARM64 产物；我们使用独立工作流，不能直接套用。 |
| [#689](https://github.com/chthollyphile/folia-major/pull/689) | feat(stage): 舞台来源为 Now Playing 时可自动启动它 | 基于旧设置页/播放器入口，需移植并实测 Windows 外部程序启动、路径与进程生命周期。 |
| [#668](https://github.com/chthollyphile/folia-major/pull/668) | feat(tools): macOS Now Playing bridge for Music.app / Apple Music | 新增 macOS 播放器桥接服务，需要 macOS/Apple Music 实机检验与生命周期检查。 |
| [#601](https://github.com/chthollyphile/folia-major/pull/601) | feat(visualizer): 添加持久保存的手动随机样式 | 手动随机样式及壁纸修复混在同一 PR，并使用旧设置页和共享组件路径；需拆分适配与 UI 验证。 |
| [#539](https://github.com/chthollyphile/folia-major/pull/539) | feat(graphics): 增加后台暂停动效开关 | 全局暂停 RAF/动效会牵涉播放、OBS、录制及模组；PR 自述仍有实机与测试待补，不适合直接合入。 |
| [#564](https://github.com/chthollyphile/folia-major/pull/564) | feat(netease): 支持心动模式与退出后恢复原队列 | 网易心动模式是较大的播放队列功能，部分代码仍在旧目录，需单独迁移并验证真实队列恢复与账号流程。 |

## 验证范围

- 类型检查通过；桌面、主题、歌词渲染、舞台、遥控、翻译等 197 个测试文件共 2,169 项通过、1 项跳过。
- Now Playing 新回归使用真实 hook 和 Zustand store，只替换外部提供者事件；临时恢复旧 ref 镜像后确实复现失败。
- 字幕的 7 项浏览器验证全部通过，使用隔离测试端口，覆盖双行、翻译/音译、短间隔、长间奏、暂停和前后跳转；不连接真实音乐账号。
- 本轮没有声称完成真实 AI 供应商调用、真实 Now Playing 服务或全部操作系统桌面安装包验收。
