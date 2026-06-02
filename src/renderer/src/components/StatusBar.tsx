import { useConnectionStore } from '../stores/connectionStore'
import { useGmStore } from '../stores/gmStore'
import { ConnectionState, getStateLabel } from '../models/ConnectionState'
import { buildWebSocketUrl } from '../network/GmBridgeProtocol'
import { ReconnectIndicator } from './ReconnectIndicator'

interface StatusBarProps {
  onReconnectCancel: () => void
  onReconnectRetryNow: () => void
}

/** 底部状态栏:左「就绪 · 共 N 条命令」,右「当前实例 · ws 地址」。 */
export function StatusBar({ onReconnectCancel, onReconnectRetryNow }: StatusBarProps): JSX.Element {
  const state = useConnectionStore((s) => s.state)
  const params = useConnectionStore((s) => s.params)
  const instances = useConnectionStore((s) => s.availableInstances)
  const selectedPid = useConnectionStore((s) => s.selectedInstancePid)
  const commandCount = useGmStore((s) => s.commands.length)

  const current = instances.find((i) => i.pid === selectedPid)
  const wsUrl = buildWebSocketUrl(params.host, params.port)
  const leftText =
    state === ConnectionState.Ready ? `就绪 · 共 ${commandCount} 条命令` : getStateLabel(state)

  return (
    <div className="h-8 bg-titlebar border-t border-borderc flex items-center px-[24px] gap-4 shrink-0 select-none">
      <span className="text-ink3 text-2xs">{leftText}</span>
      <ReconnectIndicator onCancel={onReconnectCancel} onRetryNow={onReconnectRetryNow} />
      <div className="flex-1" />
      <span className="text-ink3 text-3xs font-mono">
        {current ? `${current.productName || 'Unity'} · ` : ''}
        {wsUrl}
      </span>
    </div>
  )
}
