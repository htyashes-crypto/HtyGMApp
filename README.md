# ConsoleLoggerDebug

ActFramework `ConsoleLogger` 的跨进程实时调试器(Electron + React + TypeScript),让开发者在 Unity Editor 或打包游戏中都能实时查看 ConsoleLogger 收集树,并远程触发 Begin/End/Clear。

与 [BlueprintDebugApp](../BlueprintDebugApp/README.md) 完全平行的另一个外置调试 App,两者端口与 Discovery 目录不同,可同时运行。

## 功能

- 实时连接 Unity 调试桥(WebSocket),看到 ConsoleLogger 收集的嵌套日志树
- 历史面板:最多 50 条快照,倒序展示,支持搜索 + 颜色框
- 日志树:递归卡片,独立展开/收纳,命中关键词黄色加粗高亮
- **三级日志着色**:Info(默认)/ Warning(`#ffd700`)/ Error(`#f44336`)
- **远程 Begin / End**:在顶栏选色 → 点 Begin / End 远程触发 Unity 端 `ConsoleLogger.BeginCollect/EndCollect`
- **远程 Clear**:工具栏一键清空 live / history / all,Unity 端同步
- 复制:单层 / 带子级
- 离线 Dump:从 Unity Editor 导出的 `*.cl-dump.json` 文件加载(支持拖拽)
- 应用菜单(文件 / 收集 / 视图 / 帮助)+ 全局快捷键(`Ctrl+R/L/F/K/B/E`、`Ctrl+O/W`、`Ctrl+Shift+C`、`Esc`)
- Toast 通知 + 重连倒计时 + 长名字悬浮提示 + Welcome 引导页
- 自动重连:指数退避 1/2/4/8/16/30s
- GitHub 自动更新(仓库占位 `htyashes-crypto/ConsoleLoggerDebugApp`,首次发布前请改为正确仓库)

## 启动开发环境

```bash
cd ConsoleLoggerDebugApp
npm install
npm run dev
```

## 打包

```bash
npm run icons:generate
npm run build:win        # Windows NSIS + portable
npm run build:mac        # macOS dmg arm64 + x64
```

构建产物输出到 `dist/`。

## 端到端验证(与 Unity 配合)

### 自动发现连接(推荐)

桌面 App 通过 `~/.console-logger-debug/instances/{pid}.json` 共享文件零配置发现 Unity,打包游戏也无需复制 Token。

1. **Unity 侧准备**(一次性):
   - 在 `DebugCfg` SO 中找到分区"ConsoleLogger 调试桥",勾"总开关 + 自动启动"
   - 把 `ActFramework_ByHZR.MainLoop.ConsoleLoggerDebugBridge.Lifecycle.ConsoleLoggerDebugBridgeLifecycle` 加入 `ModuleCfg` 静态配置
2. **启动 Unity**:进入 Play Mode 或运行打包游戏,Console 输出:
   ```
   [ConsoleLogger DebugBridge] 服务启动:ws://127.0.0.1:17910/console-logger-debug/v1  token=xxx
   [ConsoleLogger DebugBridge] Discovery 实例文件已写入:C:\Users\<user>\.console-logger-debug\instances\<pid>.json
   ```
3. **桌面 App**:`npm run dev` 启动,App 自动读 instances 文件 → 自动填 host/port/token → 自动连接
4. **触发收集**:在 Unity 中调 `ConsoleLogger.BeginCollect("X") / Log("hello") / EndCollect()`,App 在 50ms 内看到历史新增 + 实时数据增量
5. **远程触发**:在 App 顶栏选色 → 点 **Begin** → Unity Console 看到新 context;再点 **End** 收尾

### 手动连接(备选)

如不想用自动发现:顶栏点"断开"后改为手动模式。粘贴 token → 点"连接"。

Token 来源:
- Editor 菜单 `ActFramework/ConsoleLogger/调试桥/复制 Token 到剪贴板`

### 离线 Dump 模式

1. Unity 菜单 `ActFramework/ConsoleLogger/调试桥/导出调试 Dump` → 选保存路径(默认 `*.cl-dump.json`)
2. 桌面 App 加载 dump 的三种方式(任选):
   - 顶栏 `📂 Dump` 按钮 → 文件选择对话框
   - 应用菜单 `文件 → 打开 Dump…`(`Ctrl/Cmd+O`)
   - **直接拖拽 .json 文件到窗口**
3. 进入离线模式后顶部出现紫色 banner,显示 dump 文件名 / 记录数 / 导出时间 / 协议版本
4. 历史面板自动填入 dump 内容,点击任一条查看树形
5. 点击 banner 右侧"× 关闭 Dump"或快捷键 `Ctrl/Cmd+W` 回到实时模式

## 协议

- WebSocket `ws://127.0.0.1:17910/console-logger-debug/v1`
- 帧封套 `{ type, seq, data }`,UTF-8 JSON
- 鉴权:客户端首条 `auth { token }`,5s 超时
- 心跳:服务端 15s ping,60s 静默断连
- 双向命令集:
  - C→S:`auth` / `subscribe` / `request-history` / `clear-live` / `clear-history` / `clear-all` / **`begin-collect{name,displayColor}`** / **`end-collect{name?}`** / `ping`
  - S→C:`auth-result` / `history-snapshot` / `log-added{stackPath,entry}` / `context-ended{context}` / `cleared{scope}` / `error{code,message}` / `pong`

详见 Unity 侧 `ActFramework_ByHZR.MainLoop.ConsoleLoggerDebugBridge.Protocol.DebugBridgeMessageTypes`。

## 端口与命名空间总览

| 项 | ConsoleLoggerDebugApp(本) | BlueprintDebugApp |
|---|---|---|
| 端口 | **17910** | 17900 |
| Discovery 目录 | `~/.console-logger-debug/instances/` | `~/.blueprint-debug/instances/` |
| 协议路径 | `/console-logger-debug/v1` | `/bp-debug/v1` |
| Token EditorPrefs key | `ConsoleLogger.DebugBridge.AuthToken` | `Blueprint.DebugBridge.AuthToken` |
| 命令行覆盖 | `--console-logger-debug-on` / `--console-logger-debug-port` | `--blueprint-debug-on` / `--blueprint-debug-port` |
| 桥 asmdef | `ActFramework.Main.ConsoleLoggerDebugBridge` | `ActFramework.RuntimeEditorSupportPlus.Blueprint.CodeBridge.DebugBridge` |

两端独立,可同时运行。

## 调色板(与 BlueprintDebugApp 共享 + ConsoleLogger 三色 token)

| 用途 | 颜色 |
|---|---|
| 主背景 | `#1e1e1e` |
| 顶栏渐变 | `#323233 → #2d2d2d` |
| 左栏 | `#252525` |
| 卡片 | `#2d2d2d` |
| 边框 | `#3e3e3e` / `#555` |
| 主文字 | `#cccccc` |
| 弱文字 | `#888` |
| 高亮(搜索命中) | `#ffd700` |
| 强调(连接) | `#0098ff` / `#9cdcfe` |
| 状态栏 | `#0078d4` |
| 实时增量 | `#4ec9b0` |
| **Warning** | `#ffd700` |
| **Error** | `#f44336` |

## 工程结构

```
src/
├── main/index.ts           # Electron 主进程:BrowserWindow + IPC + 自动更新
├── main/menu.ts            # 应用菜单(文件 / 收集 / 视图 / 帮助)
├── preload/index.ts        # contextBridge 受限 API(window.cl)
└── renderer/
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── models/         # CollectContext / CollectEntry / ConnectionState
        ├── network/        # DebugBridgeProtocol / Client / Reconnector
        ├── stores/         # Zustand:connection / history / toast / update
        ├── services/       # SearchService / DumpFileLoader / LiveContextBuilder
        ├── components/     # MacTitleBar / TopBar / HistoryPanel / LogTreeView 等 14 个
        └── styles/globals.css
```
