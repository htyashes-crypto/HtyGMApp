/** GM 桥连接常量;与 Unity 侧 GmBridge 配置严格对齐。 */
export const GM_BRIDGE = { defaultPort: 17920, wsPath: '/gm-bridge/v1', discoveryDir: '.gm-bridge' }

/** 协议消息 type 字符串常量;与 Unity 侧 GmBridgeMessageTypes 严格对齐。 */
export const MsgType = {
  // C → S
  Auth: 'auth',
  ListCommands: 'list-commands',
  ExecuteCommand: 'execute-command',
  Ping: 'ping',
  // S → C
  AuthResult: 'auth-result',
  CommandList: 'command-list',
  CommandListBegin: 'command-list-begin',
  CommandListChunk: 'command-list-chunk',
  CommandListEnd: 'command-list-end',
  CommandResult: 'command-result',
  Pong: 'pong',
  Error: 'error'
} as const
export type MsgType = typeof MsgType[keyof typeof MsgType]

/** 帧统一封套;data 按 type 不同有不同结构。 */
export interface Envelope {
  type: string
  seq?: number
  data?: any
}

export type GmParamType = 'Int' | 'Float' | 'String' | 'Bool' | 'Enum'

export interface GmParameterMeta {
  name: string
  type: GmParamType
  tip?: string
  enumOptions?: string[]
  /** 与 enumOptions 一一对齐的显示名（可空）；非空时下拉显示它、value 仍用 enumOptions 实际值。 */
  enumDisplayNames?: string[]
  /** 枚举是否映射为整数：true 时仍下拉选择，但回传 args[].type 用 'Int'（enumOptions 为整数字符串），由服务端按整数执行。 */
  enumAsInt?: boolean
  defaultValue?: string
}

export interface GmCommandMeta {
  commandId: string
  displayName: string
  category?: string
  iconBase64?: string
  parameters: GmParameterMeta[]
}

export interface GmArgValue {
  name: string
  type: string
  value: string
}

export interface GmCommandResult {
  commandId: string
  ok: boolean
  output?: string
  error?: string
}

export interface DiscoveryInfo {
  host: string
  port: number
  token: string
  timestamp: number
  pid: number
  source: string
  productName: string
  serverVersion: string
}

/** 握手帧 data。 */
export interface AuthData { token: string }
export interface AuthResultData { ok: boolean; serverVersion?: string; reason?: string }
export interface CommandListData { commands: GmCommandMeta[] }
/** command-list-begin：命令总数，用于显示初始化进度。 */
export interface CommandListBeginData { total: number }
/** command-list-chunk：一批命令 + 本批起始索引。 */
export interface CommandListChunkData { commands: GmCommandMeta[]; index: number }
export interface ExecuteCommandData { commandId: string; args: GmArgValue[] }
export interface HeartbeatData { ts: number }
export interface ErrorData { code: string; message: string }

/** 构造 ws:// 端点 URL,与 Unity 侧 GmBridgeConfig.BuildWebSocketUrl 对齐。 */
export function buildWebSocketUrl(host: string, port: number): string {
  return `ws://${host}:${port}${GM_BRIDGE.wsPath}`
}
