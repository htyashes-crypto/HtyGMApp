import { useConnectionStore } from '../stores/connectionStore'
import { ConnectionState, getStateColor, getStateLabel } from '../models/ConnectionState'

/**
 * 顶部标题栏(高 46px,#15181E)。左侧品牌 logo + "GM 控制台",右侧连接状态 + 窗口控制(占位)。
 * 整条 drag-region 让用户可拖窗。
 */
export function TopBar(): JSX.Element {
  const state = useConnectionStore((s) => s.state)
  const params = useConnectionStore((s) => s.params)

  const isConnected = state === ConnectionState.Ready
  const dotColor = getStateColor(state)

  return (
    <div className="drag-region h-[46px] bg-titlebar border-b border-borderc flex items-center px-5 gap-3 shrink-0">
      {/* 品牌 logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-4 h-4 rounded-[5px] bg-brand flex items-center justify-center">
          <div className="w-2 h-2 rounded-[2.5px] bg-brandInk" />
        </div>
        <span className="text-ink1 text-[15px] font-bold tracking-[0.4px]">GM 控制台</span>
      </div>

      <div className="flex-1" />

      {/* 连接状态 */}
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${isConnected ? 'gm-breath' : ''}`}
          style={{ backgroundColor: dotColor }}
        />
        <span className="text-ink2 text-xs">{getStateLabel(state)}</span>
        <span className="text-ink3 text-2xs font-mono ml-2">
          {params.host}:{params.port}
        </span>
      </div>

      {/* 窗口控制(占位,真实窗口控制由 Win 系统标题栏提供) */}
      <div className="no-drag flex items-center gap-3 ml-4 text-ink3">
        <span className="inline-block w-3 h-px bg-ink3" title="最小化" />
        <span className="inline-block w-3 h-3 border border-ink3 rounded-[2px]" title="最大化" />
      </div>
    </div>
  )
}
