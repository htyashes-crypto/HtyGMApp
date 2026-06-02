# GMApp

ActFramework 通用 **GM 命令工具**桌面端(Electron + React + TypeScript)。连接所有使用了 ActFramework 终端服务的游戏实例(Editor 或打包后均可),自动发现多个同时运行的游戏,按命令的结构化参数 schema 渲染输入控件,一键远程执行 GM 命令。

命令定义来自 Unity 侧 `TerminalCfg` 的 GM 富元数据(图标 / 显示名 / 分组 / 结构化参数),在框架中心「GM 命令配置」App 中图形化配置后,经 GM 桥下发给本工具。

> 仅供内部开发者与测试人员使用,不面向玩家;GM 桥在游戏内需手动开启,无自动启动。

## 功能

- **多实例自动发现**:扫 `~/.gm-bridge/instances/{pid}.json` 零配置发现所有运行中的游戏,左栏列出并点击切换;原实例离线时自动切到其它实例
- **命令面板**:中栏按命令的参数 schema 渲染输入控件(Int / Float / String / Bool / Enum 下拉),填好一键执行
- **执行日志**:右栏倒序展示执行结果(成功/失败 + 输出/错误),可隐藏/显示且**状态持久化**(下次启动保持上次显隐)
- **白天 / 黑夜主题**:顶栏一键切换,状态持久化
- **自动重连**:断线指数退避重连(1/2/4/8/16/30s),连续失败给出提示
- **GitHub 自动更新**:打包版本从 GitHub Releases(`htyashes-crypto/HtyGMApp`)检查并安装更新
- Toast 通知 + 连接状态指示 + 重连倒计时 + 全局快捷键

## 启动开发环境

```bash
cd GMApp
npm install
npm run dev
```

> 通过 `scripts/launch.cjs` 启动,规避 VSCode/Cursor 终端 `ELECTRON_RUN_AS_NODE=1` 导致 `require('electron')` 返回路径字符串的问题。

## 打包 / 发版

```bash
npm run icons:generate   # 由 resources/icon.svg 生成各尺寸图标(首次打包前)
npm run build:win        # Windows NSIS + portable
npm run build:mac        # macOS dmg arm64 + x64
npm run release          # 构建并发布到 GitHub Releases(触发自动更新)
```

构建产物输出到 `dist/`。应用图标取自 `resources/icon.{png,ico,icns}`(`buildResources: resources`)。

## 端到端验证(与 Unity 配合)

### 1. Unity 侧准备

- **配置命令元数据**:框架中心(`ActFramework → FrameworkCenter`)→「GM 命令配置」App → 勾"暴露给 GM",填显示名 / 分组 / 图标 / 结构化参数
- **启动 GM 桥**:`DebugCfg` 分区"GM 命令桥"勾总开关(并把 `GmBridgeLifecycle` 加入 `ModuleCfg`),或运行时用菜单 `ActFramework/GM命令桥/启动服务`

启动后 Unity Console 会输出 GM 桥服务地址 `ws://127.0.0.1:17920/gm-bridge/v1` 与鉴权 token,并在 `~/.gm-bridge/instances/<pid>.json` 写入发现文件。

### 2. 桌面 App

`npm run dev` 启动后自动扫 instances 目录 → 填 host/port/token → 自动连接 → 拉取命令清单。左栏选游戏实例,中栏选命令填参数执行,右栏看结果。

## 协议

- WebSocket `ws://127.0.0.1:17920/gm-bridge/v1`,帧封套 `{ type, seq, data }`(UTF-8 JSON,camelCase)
- 流程:客户端首条 `auth` 鉴权(5s 超时)→ 拉取命令清单(`list-commands` / `command-list`)→ 执行命令(`execute-command` / `command-result`)
- 心跳 ping/pong;鉴权失败服务端发 `auth-result{ok:false}` 后断连

> Unity 侧 GM 桥用自实现的 `TcpListener` + 手写 RFC6455(Mono 的 `HttpListener.AcceptWebSocketAsync` 不可用)。

## 端口 / 命名空间(与同框架其它外置 App 区分)

| 项 | GMApp(本) | BlueprintDebugApp |
|---|---|---|
| 端口 | **17920** | 17900 |
| Discovery 目录 | `~/.gm-bridge/instances/` | `~/.blueprint-debug/instances/` |
| 协议路径 | `/gm-bridge/v1` | `/bp-debug/v1` |

各 App 端口与 Discovery 目录独立,可同时运行。

## 工程结构

```
src/
├── main/index.ts        # 主进程:BrowserWindow + IPC + 自动更新 + Discovery 扫描 + settings 持久化
├── main/menu.ts         # 应用菜单(刷新命令 / 切换日志 / 重连 / 检查更新)
├── preload/index.ts     # contextBridge 受限 API(window.gm)
└── renderer/src/
    ├── App.tsx
    ├── models/          # ConnectionState
    ├── network/         # GmBridgeProtocol / GmBridgeClient / GmBridgeReconnector
    ├── stores/          # Zustand:connection / gm / toast / update / theme
    ├── components/      # TopBar / GameList / CommandPanel / CommandRow / ParamInput / ExecutionLog / StatusBar / UpdateModal 等
    └── styles/globals.css
```
