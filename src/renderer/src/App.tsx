import { useEffect, useMemo, useRef } from 'react'
import { TopBar } from './components/TopBar'
import { GameList } from './components/GameList'
import { CommandPanel } from './components/CommandPanel'
import { ExecutionLog } from './components/ExecutionLog'
import { StatusBar } from './components/StatusBar'
import { ToastContainer } from './components/ToastContainer'
import { UpdateModal } from './components/UpdateModal'
import { useUpdateStore, type UpdateInfo, type UpdateProgress } from './stores/updateStore'
import { useThemeStore, type ThemeMode } from './stores/themeStore'
import { useKeyboardShortcuts } from './components/useKeyboardShortcuts'
import { useConnectionStore } from './stores/connectionStore'
import { useGmStore } from './stores/gmStore'
import { ConnectionState } from './models/ConnectionState'
import { GmBridgeClient } from './network/GmBridgeClient'
import { GmBridgeReconnector } from './network/GmBridgeReconnector'
import { toast } from './stores/toastStore'
import type { DiscoveryInfo } from './gm'
import type { GmArgValue } from './network/GmBridgeProtocol'

export function App(): JSX.Element {
  const clientRef = useRef<GmBridgeClient | null>(null)
  const reconnectorRef = useRef<GmBridgeReconnector>(new GmBridgeReconnector())

  const conn = useConnectionStore()
  const gm = useGmStore()

  const userWantsConnectRef = useRef(true)

  const readyStableTimerRef = useRef<number | null>(null)
  const READY_STABLE_MS = 3000

  const cancelReadyStableTimer = (): void => {
    if (readyStableTimerRef.current != null) {
      window.clearTimeout(readyStableTimerRef.current)
      readyStableTimerRef.current = null
    }
  }

  const pickInstance = (list: DiscoveryInfo[], selectedPid: number | null): DiscoveryInfo | null => {
    if (list.length === 0) return null
    if (selectedPid != null) {
      const hit = list.find((i) => i.pid === selectedPid)
      if (hit) return hit
    }
    return list[0]
  }

  // 启动时还原上次连接信息 + 扫 instances/ 自动连接
  useEffect(() => {
    let cancelled = false
    void (async () => {
      // 还原主题（白天/黑夜）与日志面板显隐（持久化在主进程 settings）
      const savedTheme = (await window.gm.getSetting('theme')) as ThemeMode | undefined
      useThemeStore.getState().initTheme(savedTheme === 'light' ? 'light' : 'dark')
      const savedLogVisible = await window.gm.getSetting('logVisible')
      if (typeof savedLogVisible === 'boolean') useGmStore.getState().setLogVisible(savedLogVisible)

      const last = (await window.gm.getSetting('lastConnection')) as
        | { host?: string; port?: number; token?: string }
        | undefined
      if (last && !cancelled) {
        conn.setParams({
          host: last.host ?? '127.0.0.1',
          port: last.port ?? 17920,
          token: last.token ?? ''
        })
      }
      const list = await window.gm.listDiscovery()
      if (cancelled) return
      conn.setAvailableInstances(list)
      const pick = pickInstance(list, useConnectionStore.getState().selectedInstancePid)
      if (pick) {
        conn.setSelectedInstancePid(pick.pid)
        applyDiscoveryAndConnect(pick)
      }
    })()

    const offChecking = window.gm.onUpdateChecking(() => {
      const m = useUpdateStore.getState()
      if (m.state === 'idle' || m.state === 'error') m.setState('checking')
    })
    const offAvail = window.gm.onUpdateAvailable((info) => {
      const m = useUpdateStore.getState()
      m.setInfo(info as UpdateInfo)
      m.setState('available')
    })
    const offNot = window.gm.onUpdateNotAvailable(() => {
      const m = useUpdateStore.getState()
      if (m.manuallyTriggered) toast.info('已是最新版本')
      m.setState('idle')
      m.setManuallyTriggered(false)
    })
    const offProgress = window.gm.onUpdateProgress((p) => {
      const m = useUpdateStore.getState()
      m.setProgress(p as UpdateProgress)
      if (m.state !== 'downloading') m.setState('downloading')
    })
    const offDone = window.gm.onUpdateDownloaded((info) => {
      const m = useUpdateStore.getState()
      m.setInfo(info as UpdateInfo)
      m.setState('downloaded')
    })
    const offErr = window.gm.onUpdateError((err) => {
      const m = useUpdateStore.getState()
      m.setError(err.message)
      if (m.manuallyTriggered) {
        m.setState('error')
        m.setManuallyTriggered(false)
      } else {
        m.setState('idle')
      }
    })
    return () => {
      cancelled = true
      offChecking()
      offAvail()
      offNot()
      offProgress()
      offDone()
      offErr()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyDiscoveryAndConnect = (info: DiscoveryInfo): void => {
    conn.setParams({ host: info.host, port: info.port, token: info.token })
    void window.gm.setSetting('lastConnection', { host: info.host, port: info.port, token: info.token })
    gm.setCommands([])
    reconnectorRef.current.reset()
    conn.setReconnectAttempt(0)
    conn.setNextAttemptAt(null)
    userWantsConnectRef.current = true
    doConnect()
  }

  // 周期 poll instances/(每 3 秒)
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!userWantsConnectRef.current) return
      void (async () => {
        const list = await window.gm.listDiscovery()
        const prev = useConnectionStore.getState().availableInstances
        conn.setAvailableInstances(list)
        const state = useConnectionStore.getState().state
        const selectedPid = useConnectionStore.getState().selectedInstancePid
        const selectedAlive = selectedPid != null && list.some((i) => i.pid === selectedPid)

        if (!selectedAlive && list.length > 0) {
          const pick = list[0]
          toast.info('原游戏实例已离线', `自动切换到 ${pick.productName} (pid ${pick.pid})`)
          conn.setSelectedInstancePid(pick.pid)
          applyDiscoveryAndConnect(pick)
          return
        }

        if (state === ConnectionState.Ready) {
          const prevPids = new Set(prev.map((i) => i.pid))
          for (const info of list) {
            if (!prevPids.has(info.pid) && info.pid !== selectedPid) {
              toast.info('检测到新游戏实例', `${info.productName} (pid ${info.pid}) — 在左栏点击切换`)
            }
          }
        }
      })()
    }, 3000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const client = useMemo(() => {
    if (!clientRef.current) clientRef.current = new GmBridgeClient()
    return clientRef.current
  }, [])

  const handleSelectInstance = (pid: number): void => {
    const list = useConnectionStore.getState().availableInstances
    const target = list.find((i) => i.pid === pid)
    if (!target) {
      toast.warning('该游戏实例已离线', `pid ${pid}`)
      return
    }
    conn.setSelectedInstancePid(pid)
    reconnectorRef.current.cancel()
    client.disconnect()
    applyDiscoveryAndConnect(target)
  }

  const doConnect = (): void => {
    conn.setNextAttemptAt(null)
    const params = useConnectionStore.getState().params
    client.connect({
      host: params.host,
      port: params.port,
      token: params.token,
      handlers: {
        onStateChange: (st) => {
          if (st === 'connecting') conn.setState(ConnectionState.Connecting)
          else if (st === 'authenticating') conn.setState(ConnectionState.Authenticating)
          else if (st === 'ready') {
            conn.setState(ConnectionState.Ready)
            cancelReadyStableTimer()
            readyStableTimerRef.current = window.setTimeout(() => {
              reconnectorRef.current.reset()
              conn.setReconnectAttempt(0)
              conn.setNextAttemptAt(null)
              readyStableTimerRef.current = null
            }, READY_STABLE_MS)
            toast.success('已连接到游戏实例', `${params.host}:${params.port}`)
          } else if (st === 'closed') {
            cancelReadyStableTimer()
            const wasReady = useConnectionStore.getState().state === ConnectionState.Ready
            conn.setState(ConnectionState.Disconnected)
            if (wasReady) toast.warning('连接已断开', '尝试自动重连…')
            scheduleReconnect()
          } else if (st === 'failed') {
            cancelReadyStableTimer()
            conn.setState(ConnectionState.Failed)
            scheduleReconnect()
          }
        },
        onAuthResult: (data) => {
          if (data.ok) conn.setServerVersion(data.serverVersion ?? '')
          else {
            const reason = data.reason ?? '鉴权失败'
            conn.setLastError(reason)
            toast.error('鉴权失败', reason)
          }
        },
        onCommandList: (data) => {
          gm.setCommands(data.commands ?? [])
          toast.info('命令清单已就绪', `共 ${data.commands?.length ?? 0} 条命令`)
        },
        onCommandListBegin: (total) => {
          gm.beginCommandLoad(total)
        },
        onCommandListChunk: (commands) => {
          gm.appendCommands(commands)
        },
        onCommandListEnd: () => {
          gm.endCommandLoad()
          toast.info('命令清单已就绪', `共 ${useGmStore.getState().commands.length} 条命令`)
        },
        onCommandResult: (data) => {
          const meta = useGmStore.getState().commands.find((c) => c.commandId === data.commandId)
          const name = meta?.displayName ?? data.commandId
          gm.addLog({
            command: name,
            time: new Date().toLocaleTimeString(),
            ok: data.ok,
            output: data.output,
            error: data.error
          })
          if (data.ok) toast.success('执行成功', name)
          else toast.error('执行失败', data.error ?? name)
        },
        onError: (data) => {
          const text = `${data.code}: ${data.message}`
          conn.setLastError(text)
          toast.error('GM 桥错误', text)
        },
        onPongLatencyMs: (latency) => conn.setPing(latency),
        onMessageCounts: (recv, sent) => conn.setCounts(recv, sent)
      }
    })
  }

  const MAX_AUTO_RECONNECT_ATTEMPTS = 6

  const scheduleReconnect = (): void => {
    const params = useConnectionStore.getState().params
    if (!params.token) return
    if (reconnectorRef.current.attempt >= MAX_AUTO_RECONNECT_ATTEMPTS) {
      conn.setState(ConnectionState.Failed)
      conn.setLastError(`已自动重连 ${MAX_AUTO_RECONNECT_ATTEMPTS} 次仍失败,可能 Unity 端 GM 桥异常。请检查 Unity 控制台。`)
      conn.setNextAttemptAt(null)
      userWantsConnectRef.current = false
      toast.error('自动重连已停止', `${MAX_AUTO_RECONNECT_ATTEMPTS} 次失败,需在左栏重新选择实例`)
      return
    }
    conn.setState(ConnectionState.Reconnecting)
    const delay = reconnectorRef.current.schedule(() => {
      conn.setReconnectAttempt(reconnectorRef.current.attempt)
      doConnect()
    })
    conn.setNextAttemptAt(Date.now() + delay)
  }

  const handleDisconnect = (): void => {
    userWantsConnectRef.current = false
    cancelReadyStableTimer()
    reconnectorRef.current.cancel()
    client.disconnect()
    conn.setState(ConnectionState.Disconnected)
    conn.setReconnectAttempt(0)
    conn.setNextAttemptAt(null)
  }

  const handleRefreshCommands = (): void => {
    if (conn.state === ConnectionState.Ready) {
      client.listCommands()
      toast.info('已请求命令清单')
    } else {
      toast.warning('未连接', '需先连接到游戏实例')
    }
  }

  const handleExecute = (commandId: string, args: GmArgValue[]): void => {
    if (conn.state !== ConnectionState.Ready) {
      toast.warning('未连接', '需先连接到游戏实例才能执行命令')
      return
    }
    client.executeCommand(commandId, args)
  }

  const handleReconnect = (): void => {
    const pid = useConnectionStore.getState().selectedInstancePid
    if (pid != null) handleSelectInstance(pid)
    else {
      void window.gm.listDiscovery().then((list) => {
        conn.setAvailableInstances(list)
        const pick = pickInstance(list, null)
        if (pick) {
          conn.setSelectedInstancePid(pick.pid)
          applyDiscoveryAndConnect(pick)
        } else {
          toast.warning('未找到游戏实例', '请确认 Unity 端 GM 桥已开启')
        }
      })
    }
  }

  const handleRetryReconnectNow = (): void => {
    reconnectorRef.current.cancel()
    conn.setNextAttemptAt(null)
    conn.setReconnectAttempt(reconnectorRef.current.attempt + 1)
    doConnect()
  }

  useEffect(() => {
    return () => {
      reconnectorRef.current.cancel()
      client.disconnect()
    }
  }, [client])

  useEffect(() => {
    const off = window.gm.onMenuCommand((cmd) => {
      switch (cmd) {
        case 'refresh-commands': handleRefreshCommands(); break
        case 'toggle-log': gm.toggleLog(); break
        case 'reconnect': handleReconnect(); break
        case 'check-for-update': {
          const m = useUpdateStore.getState()
          m.setManuallyTriggered(true)
          m.setError(null)
          m.setState('checking')
          void window.gm.checkForUpdate()
          break
        }
        case 'about':
          toast.info('GM 控制台 v0.1.0', 'ActFramework GM 命令工具')
          break
      }
    })
    return off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conn.state])

  useKeyboardShortcuts({
    onRefresh: handleRefreshCommands,
    onToggleLog: gm.toggleLog,
    onFocusSearch: () => {
      const el = document.getElementById('gm-search') as HTMLInputElement | null
      el?.focus()
      el?.select()
    }
  })

  return (
    <div className="flex flex-col h-full bg-bg text-ink1 font-ui">
      <TopBar />
      <div className="flex-1 flex min-h-0">
        <GameList onSelectInstance={handleSelectInstance} />
        <CommandPanel onRefresh={handleRefreshCommands} onExecute={handleExecute} />
        {gm.logVisible && <ExecutionLog />}
      </div>
      <StatusBar onReconnectCancel={handleDisconnect} onReconnectRetryNow={handleRetryReconnectNow} />
      <ToastContainer />
      <UpdateModal
        onDownload={() => {
          useUpdateStore.getState().setState('downloading')
          void window.gm.downloadUpdate()
        }}
        onInstall={() => {
          void window.gm.installUpdate()
        }}
        onDismiss={() => {
          useUpdateStore.getState().setState('dismissed')
        }}
        onRetry={() => {
          const m = useUpdateStore.getState()
          m.setManuallyTriggered(true)
          m.setError(null)
          m.setState('checking')
          void window.gm.checkForUpdate()
        }}
      />
    </div>
  )
}
