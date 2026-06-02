/** 调试桥连接状态机。 */
export const ConnectionState = {
  Disconnected: 'disconnected',
  Connecting: 'connecting',
  Authenticating: 'authenticating',
  Ready: 'ready',
  Reconnecting: 'reconnecting',
  Failed: 'failed'
} as const
export type ConnectionState = typeof ConnectionState[keyof typeof ConnectionState]

/** UI 渲染时用:状态指示灯颜色。 */
export function getStateColor(state: ConnectionState): string {
  switch (state) {
    case ConnectionState.Ready: return '#4ec9b0'
    case ConnectionState.Connecting:
    case ConnectionState.Authenticating:
    case ConnectionState.Reconnecting: return '#febc2e'
    case ConnectionState.Failed: return '#ff5f57'
    case ConnectionState.Disconnected:
    default: return '#888'
  }
}

export function getStateLabel(state: ConnectionState): string {
  switch (state) {
    case ConnectionState.Ready: return '已连接'
    case ConnectionState.Connecting: return '连接中'
    case ConnectionState.Authenticating: return '鉴权中'
    case ConnectionState.Reconnecting: return '重连中'
    case ConnectionState.Failed: return '连接失败'
    case ConnectionState.Disconnected:
    default: return '未连接'
  }
}
