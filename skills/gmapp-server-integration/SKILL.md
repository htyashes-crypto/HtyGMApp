---
name: gmapp-server-integration
description: 在任意语言/引擎的项目中实现「GM 桥服务端」以接入 GMApp 桌面端（通用 GM 命令工具）。GMApp 通过 Discovery 文件自动发现 + WebSocket 协议连接你的程序，拉取命令清单、远程填参执行命令。涵盖 Discovery 服务发现文件（~/.gm-bridge/instances/{pid}.json）、WebSocket 协议（ws://127.0.0.1:port/gm-bridge/v1，封套 {type,seq,data}）、消息类型（auth / auth-result / list-commands / command-list / execute-command / command-result / ping / pong / error）、数据结构（GmCommandMeta / GmParameterMeta / GmArgValue / GmCommandResult，参数类型 Int/Float/String/Bool/Enum）、鉴权时序、心跳、最小服务端实现示例与接入检查清单。适用于"接入 GMApp"、"实现 GM 桥服务端"、"GM 命令服务"、"让 GMApp 发现我的游戏/程序"、"远程执行 GM 命令"、"connect my app to GMApp"、"implement GM bridge server"、"GM bridge protocol"等场景。
---

# 接入 GMApp：实现 GM 桥服务端

本 Skill 指导你在**任意语言/引擎**的程序里实现一个「GM 桥服务端」，从而接入 [GMApp](https://github.com/htyashes-crypto/HtyGMApp)（一个通用的 GM 命令桌面客户端）。

GMApp 是现成的**客户端**；你只需在自己的程序里实现本文描述的**服务端契约**（Discovery 文件 + WebSocket 协议），GMApp 就能自动发现你的程序、拉取命令清单、让用户填参后远程执行——**无需依赖任何特定框架**。

## 工作原理

```
GMApp（现成客户端）  ←──  WebSocket  ──→  你的程序（要实现的服务端）
        ↑
        └── 每 3 秒扫描 ~/.gm-bridge/instances/ 自动发现你的程序
```

两件事：
1. **服务发现**：你的程序启动时，在固定目录写一个描述自己的 JSON 文件（host/port/token）。GMApp 每 3 秒扫该目录，零配置自动列出所有在线程序。
2. **命令协议**：GMApp 连上 WebSocket 后，鉴权 → 拉命令清单 → 用户填参执行 → 你的程序执行并回结果。

## AI 实现工作流（被本 Skill 调用时按此推进）

1. **确认上下文**：问清楚（若未知）——目标程序的**语言/运行时**（Node/Python/Go/C#/Unity/Unreal…）、要暴露哪些 **GM 命令**（命令名 + 参数）、命令的执行逻辑挂在哪。
2. **选 WebSocket 库**：用该语言成熟的 WebSocket 服务端库（Node `ws`、Python `websockets`、Go `gorilla/websocket`、C# `System.Net.WebSockets`、Unity 因 Mono 限制需 `TcpListener` + 手写 RFC6455）。
3. **实现 Discovery 文件**：启动写 `~/.gm-bridge/instances/{pid}.json`，退出删除（见 §1）。
4. **实现 WebSocket 服务**：监听 `127.0.0.1`、路径 `/gm-bridge/v1`、端口扫描（见 §2）。
5. **实现协议 handler**：鉴权 / 命令清单 / 执行 / 心跳（见 §3、§4）。
6. **定义命令清单**：把目标程序的 GM 操作映射为 `GmCommandMeta[]`（见 §3.3）。
7. **实现执行**：按参数 `type` 解析字符串 `value` → 调用目标程序逻辑 → 回 `command-result`。
8. **测试**：启动程序 → 打开 GMApp → 确认左栏出现你的程序 → 填参执行 → 看结果（见 §6 检查清单）。

> 严格按本文档的字段名（**camelCase**）、消息类型、时序实现，GMApp 才能正确解析。

---

## §1 服务发现（Discovery）文件

程序启动时写一个 JSON 文件：

- **目录**：用户主目录下 `~/.gm-bridge/instances/`
  - Windows：`C:\Users\<用户>\.gm-bridge\instances\`
  - macOS/Linux：`$HOME/.gm-bridge/instances/`
- **文件名**：`{pid}.json`（pid = 当前进程 ID，多实例天然不冲突）

文件内容：

```json
{
  "host": "127.0.0.1",
  "port": 17920,
  "token": "随机生成的鉴权令牌",
  "timestamp": 1717300000000,
  "pid": 12345,
  "source": "my-app",
  "productName": "我的程序",
  "serverVersion": "1.0.0"
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `host` | string | 固定 `127.0.0.1`（仅本机回环） |
| `port` | number | WebSocket **实际**监听端口 |
| `token` | string | 鉴权令牌；GMApp 读取后自动用于鉴权（建议每次启动随机生成） |
| `timestamp` | number | 启动时间戳（毫秒）；GMApp 按它降序排列（最新在前） |
| `pid` | number | 当前进程 ID，必须与文件名一致；GMApp 用它检测进程存活 |
| `source` | string | 来源标识（自定义，如引擎/项目代号） |
| `productName` | string | 程序显示名；GMApp 左栏列表显示这个 |
| `serverVersion` | string | 你的服务端版本号（自定义） |

**生命周期**：
- **启动**：写入本文件；同时清理目录下「pid 已不存在」的残留死文件（推荐）。
- **退出**：删除自己的 `{pid}.json`。
- **GMApp 端行为**（你无需实现，仅供理解）：每 3 秒扫描整个 `instances/` 目录，逐个用「进程是否存活」过滤死文件，按 `timestamp` 降序展示；当前连接的实例离线时自动切到其它在线实例。

---

## §2 WebSocket 服务端

- **协议**：标准 WebSocket（RFC 6455）。除 Unity（Mono `HttpListener.AcceptWebSocketAsync` 是未实现桩，需 `TcpListener` + 手写 RFC6455）外，绝大多数语言直接用现成库。
- **URL 路径**：`/gm-bridge/v1`（GMApp 连接 `ws://{host}:{port}/gm-bridge/v1`）
- **端口**：默认 `17920`。建议「端口扫描」：从 17920 起，被占用则 +1 顺延，把**实际**端口写进 Discovery 文件。
- **绑定地址**：仅 `127.0.0.1`。GM 命令通常是高权限调试操作，**不要**暴露到局域网/公网。

---

## §3 协议

### 3.1 消息封套

所有消息都是 **UTF-8 JSON 文本帧**，统一封套：

```json
{ "type": "消息类型", "seq": 可选数字序号, "data": { 按 type 不同的负载 } }
```

### 3.2 消息类型一览

| 方向 | `type` | `data` | 说明 |
|---|---|---|---|
| 客户端→服务端 | `auth` | `{ token }` | 连接后的**第一条**消息 |
| 服务端→客户端 | `auth-result` | `{ ok, serverVersion?, reason? }` | 鉴权结果 |
| 客户端→服务端 | `list-commands` | (无) | 请求命令清单（鉴权通过后自动发） |
| 服务端→客户端 | `command-list` | `{ commands: GmCommandMeta[] }` | 命令清单 |
| 客户端→服务端 | `execute-command` | `{ commandId, args: GmArgValue[] }` | 执行命令 |
| 服务端→客户端 | `command-result` | `{ commandId, ok, output?, error? }` | 执行结果 |
| 客户端→服务端 | `ping` | `{ ts }` | 心跳（客户端每 15 秒发） |
| 服务端→客户端 | `pong` | `{ ts }` | 心跳响应（**原样回** ts） |
| 服务端→客户端 | `error` | `{ code, message }` | 错误通知 |

### 3.3 数据结构

**GmCommandMeta**（一条命令的元数据）：
```ts
{
  commandId: string        // 命令唯一 ID（执行时原样回传）
  displayName: string      // 显示名（GMApp 命令行标题）
  category?: string        // 分组名（可选，GMApp 按它分组）
  iconBase64?: string      // 图标：纯 base64 PNG 字符串，【不含】"data:image/png;base64," 前缀（GMApp 渲染时自动补前缀）；缺省用默认图标
  parameters: GmParameterMeta[]
}
```

**GmParameterMeta**（一个参数的定义）：
```ts
{
  name: string             // 参数名
  type: 'Int' | 'Float' | 'String' | 'Bool' | 'Enum'   // 参数类型（首字母大写，严格按此拼写）
  tip?: string             // 提示说明（可选；GMApp 作 placeholder / tooltip）
  enumOptions?: string[]   // 枚举可选项（仅 type='Enum' 时；GMApp 渲染为下拉，value 即选中的字符串项）
  defaultValue?: string    // 默认值（可选，字符串形式）
}
```

GMApp 按 `type` 渲染控件：`Int`/`Float`→数字框、`String`→文本框、`Bool`→开关、`Enum`→下拉（用 `enumOptions`）。

**GmArgValue**（执行时回传的一个参数值）：
```ts
{
  name: string    // 对应 GmParameterMeta.name
  type: string    // 对应 type（'Int'/'Float'/'String'/'Bool'/'Enum'）
  value: string   // 值的【字符串】形式，服务端按 type 解析
}
```

> **关键**：`value` 永远是字符串。服务端按 `type` 解析：
> - `Int` → 整数；`Float` → 浮点
> - `Bool` → `"true"`/`"false"`（GMApp 也可能发 `"1"`/`"0"`，建议都认）
> - `Enum` → `enumOptions` 中的某个字符串项
> - `String` → 原样字符串

**GmCommandResult**（执行结果）：
```ts
{
  commandId: string   // 对应执行的命令
  ok: boolean         // 是否成功
  output?: string     // 成功输出（可选，GMApp 显示在执行日志）
  error?: string      // 失败原因（可选）
}
```

### 3.4 完整时序

```
GMApp                                       你的服务端
  │  ws connect /gm-bridge/v1                 │
  │ ─────────────────────────────────────→   │  接受连接,启动 5s 鉴权超时计时
  │  { type:"auth", data:{ token } }          │  (连接后立即发)
  │ ─────────────────────────────────────→   │  校验 token
  │   { type:"auth-result",                   │
  │     data:{ ok:true, serverVersion } }     │
  │ ←─────────────────────────────────────   │  (ok=false 时带 reason,随后关闭连接)
  │  { type:"list-commands" }                 │  (鉴权通过后客户端自动发)
  │ ─────────────────────────────────────→   │
  │   { type:"command-list",                  │
  │     data:{ commands:[ GmCommandMeta… ] } }│
  │ ←─────────────────────────────────────   │
  │  { type:"execute-command",                │  (用户填参点执行)
  │    data:{ commandId, args:[ …GmArgValue ]}}│
  │ ─────────────────────────────────────→   │  按 commandId 找命令,args 按 type 解析后执行
  │   { type:"command-result",                │
  │     data:{ commandId, ok, output } }      │
  │ ←─────────────────────────────────────   │
  │  { type:"ping", data:{ ts } }   (每 15s)  │
  │ ─────────────────────────────────────→   │
  │   { type:"pong", data:{ ts } }            │  原样回传 ts
  │ ←─────────────────────────────────────   │
```

**鉴权规则**：
- 连接建立后服务端启动 **5 秒**计时；5 秒内未收到 `auth` → 关闭连接。
- token 不匹配 → 回 `{ ok:false, reason }` → 关闭连接。
- token 匹配 → 回 `{ ok:true, serverVersion }` → 进入正常服务。
- 鉴权通过前，除 `auth` 外的消息一律拒绝或忽略。

**心跳**：客户端每 15 秒发 `ping{ts}`，服务端**原样回** `pong{ts}`（客户端用它算延迟）。服务端可选：超过约 60 秒未收到任何消息则主动断开。（重连由客户端负责，指数退避 1→2→4→8→16→30s，服务端无需关心。）

---

## §4 最小服务端实现示例（Node.js）

> 参考骨架。其它语言同理：换 WebSocket 库 + JSON 序列化即可。Unity 见 §5。

```js
const { WebSocketServer } = require('ws')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')

const PORT = 17920
const TOKEN = crypto.randomBytes(16).toString('hex')
const INSTANCES_DIR = path.join(os.homedir(), '.gm-bridge', 'instances')
const FILE = path.join(INSTANCES_DIR, `${process.pid}.json`)

// —— 你的命令清单（按需替换为目标程序的真实 GM 操作）——
const COMMANDS = [
  {
    commandId: 'set-resolution',
    displayName: '分辨率修改',
    category: '显示',
    parameters: [
      { name: 'width',  type: 'Int',  tip: '宽',  defaultValue: '1920' },
      { name: 'height', type: 'Int',  tip: '高',  defaultValue: '1080' },
      { name: 'mode',   type: 'Enum', tip: '窗口模式', enumOptions: ['窗口', '全屏', '无边框'], defaultValue: '窗口' }
    ]
  }
]

// —— 执行：args = [{name,type,value(字符串)}]，按 type 解析后执行你的逻辑 ——
function executeCommand(commandId, args) {
  const arg = (n) => args.find((a) => a.name === n)?.value ?? ''
  if (commandId === 'set-resolution') {
    const w = parseInt(arg('width'), 10)
    const h = parseInt(arg('height'), 10)
    const mode = arg('mode')
    // ... 在这里调用你的程序逻辑 ...
    return { ok: true, output: `分辨率设为 ${w}x${h} (${mode})` }
  }
  return { ok: false, error: `未知命令: ${commandId}` }
}

// —— Discovery 文件 ——
fs.mkdirSync(INSTANCES_DIR, { recursive: true })
fs.writeFileSync(FILE, JSON.stringify({
  host: '127.0.0.1', port: PORT, token: TOKEN,
  timestamp: Date.now(), pid: process.pid,
  source: 'my-app', productName: '我的程序', serverVersion: '1.0.0'
}))
const cleanup = () => { try { fs.unlinkSync(FILE) } catch {} }
process.on('exit', cleanup)
process.on('SIGINT', () => { cleanup(); process.exit() })

// —— WebSocket 服务 ——
const wss = new WebSocketServer({ host: '127.0.0.1', port: PORT, path: '/gm-bridge/v1' })
wss.on('connection', (ws) => {
  let authed = false
  const authTimer = setTimeout(() => { if (!authed) ws.close() }, 5000) // 5s 鉴权超时
  const send = (type, data) => ws.send(JSON.stringify({ type, data }))

  ws.on('message', (buf) => {
    let msg; try { msg = JSON.parse(buf.toString()) } catch { return }
    switch (msg.type) {
      case 'auth':
        if (msg.data?.token === TOKEN) {
          authed = true; clearTimeout(authTimer)
          send('auth-result', { ok: true, serverVersion: '1.0.0' })
        } else {
          send('auth-result', { ok: false, reason: 'token 不匹配' }); ws.close()
        }
        break
      case 'list-commands':
        if (authed) send('command-list', { commands: COMMANDS })
        break
      case 'execute-command':
        if (authed) {
          const r = executeCommand(msg.data.commandId, msg.data.args ?? [])
          send('command-result', { commandId: msg.data.commandId, ...r })
        }
        break
      case 'ping':
        send('pong', { ts: msg.data?.ts ?? 0 })
        break
    }
  })
})
console.log(`GM 桥已启动 ws://127.0.0.1:${PORT}/gm-bridge/v1  token=${TOKEN}`)
```

跑起来后打开 GMApp，左栏即自动出现「我的程序」，可填参执行 `set-resolution`。

---

## §5 各语言/引擎要点

| 运行时 | WebSocket | 主目录 | 注意 |
|---|---|---|---|
| Node.js | `ws` | `os.homedir()` | 见 §4 |
| Python | `websockets` / `aiohttp` | `Path.home()` | `asyncio` 异步处理消息 |
| Go | `nhooyr.io/websocket` / `gorilla/websocket` | `os.UserHomeDir()` | 路径匹配 `/gm-bridge/v1` |
| C# (.NET) | `System.Net.WebSockets` + `HttpListener` | `Environment.GetFolderPath(UserProfile)` | .NET Core 的 `HttpListener` 支持 WS |
| **Unity** | **不可**用 `HttpListener.AcceptWebSocketAsync`（Mono 未实现）→ 用 `TcpListener` + 手写 RFC6455 帧编解码与握手 | `Environment.GetFolderPath(UserProfile)` 或 `~` | 命令执行、读取游戏状态要切回主线程；后台线程→主线程用队列泵 |

---

## §6 接入检查清单

- [ ] Discovery 文件写到 `~/.gm-bridge/instances/{pid}.json`，8 个字段齐全（host/port/token/timestamp/pid/source/productName/serverVersion）
- [ ] 退出时删除自己的 Discovery 文件；启动时清理死 pid 残留文件
- [ ] WebSocket 仅监听 `127.0.0.1`，路径 `/gm-bridge/v1`，端口被占则顺延、把实际端口写进 Discovery
- [ ] 连接后 5 秒内未收到 `auth` 则断开
- [ ] `auth` token 校验：通过回 `auth-result{ok:true,serverVersion}`，失败回 `{ok:false,reason}` 后断开
- [ ] `list-commands` → `command-list{commands}`；每条含 `commandId`/`displayName`/`parameters`
- [ ] `execute-command{commandId,args}` → 按 `type` 解析 `args[].value` → 执行 → `command-result{commandId,ok,output/error}`
- [ ] `ping{ts}` → 原样回 `pong{ts}`
- [ ] 所有消息 UTF-8 JSON，字段名 **camelCase**，封套 `{type,seq?,data?}`
- [ ] 图标（可选）：`iconBase64` 是纯 base64 PNG，**不含** `data:` 前缀

## §7 常见坑

- **字段名大小写**：必须 camelCase（`commandId` 不是 `CommandId` / `command_id`）。GMApp 严格按此解析，拼错则字段读不到。
- **`args[].value` 是字符串**：哪怕参数 `type` 是 Int/Float/Bool，传来的 `value` 也是字符串，服务端自己解析。
- **`type` 拼写**：首字母大写——`Int`/`Float`/`String`/`Bool`/`Enum`，不是小写。
- **端口冲突**：多个程序同时跑必须各用不同端口（扫描顺延），Discovery 写实际端口。
- **pid 文件名一致**：文件名必须是 `{pid}.json` 且与文件内 `pid` 字段一致——GMApp 靠它判存活并清理死实例。
- **只绑回环**：绑 `127.0.0.1`。GM 命令是高权限操作，勿暴露公网。
- **iconBase64 无前缀**：放纯 base64，GMApp 自己加 `data:image/png;base64,`；带了前缀会重复导致图裂。
