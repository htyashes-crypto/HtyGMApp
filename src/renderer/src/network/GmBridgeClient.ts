import {
  buildWebSocketUrl,
  Envelope,
  MsgType,
  AuthResultData,
  CommandListData,
  GmCommandResult,
  GmArgValue,
  HeartbeatData,
  ErrorData
} from './GmBridgeProtocol'

/** 客户端事件回调集合;外部按需订阅。 */
export interface GmBridgeClientHandlers {
  onStateChange?: (state: 'connecting' | 'authenticating' | 'ready' | 'closed' | 'failed') => void
  onAuthResult?: (data: AuthResultData) => void
  onCommandList?: (data: CommandListData) => void
  onCommandResult?: (data: GmCommandResult) => void
  onError?: (data: ErrorData) => void
  onPongLatencyMs?: (latency: number) => void
  onMessageCounts?: (recv: number, sent: number) => void
}

interface ConnectOptions {
  host: string
  port: number
  token: string
  handlers: GmBridgeClientHandlers
}

/** WebSocket 客户端封装:连接 → auth → list-commands → 接收循环 → 心跳。 */
export class GmBridgeClient {
  private m_socket: WebSocket | null = null
  private m_handlers: GmBridgeClientHandlers = {}
  private m_options: ConnectOptions | null = null
  private m_pingTimer: number | null = null
  private m_lastPingSentTs = 0
  private m_recvCount = 0
  private m_sentCount = 0

  private m_recvBytes = 0
  private m_lastMsgTs = 0
  private m_errorBeforeClose = false
  private m_errorEvent: Event | null = null

  get isOpen(): boolean { return this.m_socket?.readyState === WebSocket.OPEN }

  connect(options: ConnectOptions): void {
    this.disconnect()
    this.m_options = options
    this.m_handlers = options.handlers
    this.m_recvCount = 0
    this.m_sentCount = 0
    this.m_recvBytes = 0
    this.m_lastMsgTs = 0
    this.m_errorBeforeClose = false
    this.m_errorEvent = null

    const url = buildWebSocketUrl(options.host, options.port)
    console.log('[GmBridge] connecting →', url, 'token=', options.token ? options.token.slice(0, 8) + '…' : '(empty)')
    this.m_handlers.onStateChange?.('connecting')
    let socket: WebSocket
    try {
      socket = new WebSocket(url)
    } catch (e) {
      console.error('[GmBridge] WebSocket 构造失败:', e)
      this.m_handlers.onStateChange?.('failed')
      this.m_handlers.onError?.({ code: 'CONNECT_FAILED', message: String(e) })
      return
    }
    this.m_socket = socket
    const createdAt = Date.now()
    let openedAt = 0

    socket.onopen = () => {
      openedAt = Date.now()
      console.log(`[GmBridge] WebSocket 已 OPEN (${openedAt - createdAt}ms),发送 auth`)
      this.m_handlers.onStateChange?.('authenticating')
      this.send({ type: MsgType.Auth, data: { token: options.token } })
    }
    socket.onmessage = (ev) => {
      this.m_lastMsgTs = Date.now()
      if (typeof ev.data === 'string') this.m_recvBytes += ev.data.length
      this.handleMessage(ev.data)
    }
    socket.onclose = (ev) => {
      const now = Date.now()
      const sinceCreate = now - createdAt
      const sinceOpen = openedAt > 0 ? now - openedAt : -1
      const sinceLastMsg = this.m_lastMsgTs > 0 ? now - this.m_lastMsgTs : -1
      console.warn(
        `[GmBridge] WebSocket CLOSE code=${ev.code} reason=${ev.reason || '(empty)'} wasClean=${ev.wasClean}` +
        ` lifetime=${sinceCreate}ms openedFor=${sinceOpen}ms msSinceLastRecv=${sinceLastMsg}` +
        ` recvCount=${this.m_recvCount} recvBytes=${this.m_recvBytes} sentCount=${this.m_sentCount}` +
        ` errorBeforeClose=${this.m_errorBeforeClose}`
      )
      if (this.m_errorBeforeClose && this.m_errorEvent) {
        console.warn('[GmBridge] preceding ERROR event:', this.m_errorEvent)
      }
      this.stopPing()
      this.m_handlers.onStateChange?.('closed')
    }
    socket.onerror = (ev) => {
      this.m_errorBeforeClose = true
      this.m_errorEvent = ev
      console.error(`[GmBridge] WebSocket ERROR readyState=${socket.readyState}`, ev)
      this.m_handlers.onStateChange?.('failed')
    }
  }

  disconnect(): void {
    this.stopPing()
    if (this.m_socket) {
      const sock = this.m_socket
      this.m_socket = null
      sock.onopen = null
      sock.onmessage = null
      sock.onclose = null
      sock.onerror = null
      if (sock.readyState !== WebSocket.CLOSED) {
        try { sock.close(1000, 'client disconnect') } catch { /* 已关 */ }
      }
    }
  }

  send(envelope: Envelope): void {
    if (!this.isOpen) return
    const text = JSON.stringify(envelope)
    this.m_socket!.send(text)
    this.m_sentCount++
    this.m_handlers.onMessageCounts?.(this.m_recvCount, this.m_sentCount)
  }

  /** 请求命令清单。 */
  listCommands(): void {
    this.send({ type: MsgType.ListCommands })
  }

  /** 执行命令;args 为 {name,type,value} 列表。 */
  executeCommand(commandId: string, args: GmArgValue[]): void {
    this.send({ type: MsgType.ExecuteCommand, data: { commandId, args } })
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== 'string') return
    let envelope: Envelope
    try { envelope = JSON.parse(raw) }
    catch (e) {
      console.warn('[GmBridge] JSON parse fail, raw len=', raw.length, 'err=', (e as Error).message)
      return
    }
    this.m_recvCount++
    this.m_handlers.onMessageCounts?.(this.m_recvCount, this.m_sentCount)

    switch (envelope.type) {
      case MsgType.AuthResult: {
        const data = envelope.data as AuthResultData
        this.m_handlers.onAuthResult?.(data)
        if (data?.ok) {
          this.m_handlers.onStateChange?.('ready')
          this.listCommands()
          this.startPing()
        }
        break
      }
      case MsgType.Pong: {
        const data = envelope.data as HeartbeatData
        if (this.m_lastPingSentTs > 0) {
          const latency = Date.now() - this.m_lastPingSentTs
          this.m_handlers.onPongLatencyMs?.(latency)
        }
        void data
        break
      }
      case MsgType.CommandList:
        this.m_handlers.onCommandList?.(envelope.data as CommandListData)
        break
      case MsgType.CommandResult:
        this.m_handlers.onCommandResult?.(envelope.data as GmCommandResult)
        break
      case MsgType.Error:
        this.m_handlers.onError?.(envelope.data as ErrorData)
        break
      default: break
    }
  }

  private startPing(): void {
    this.stopPing()
    this.m_pingTimer = window.setInterval(() => {
      if (!this.isOpen) return
      this.m_lastPingSentTs = Date.now()
      this.send({ type: MsgType.Ping, data: { ts: this.m_lastPingSentTs } })
    }, 15000)
  }

  private stopPing(): void {
    if (this.m_pingTimer != null) {
      window.clearInterval(this.m_pingTimer)
      this.m_pingTimer = null
    }
  }
}
