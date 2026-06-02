import { useConnectionStore } from '../stores/connectionStore'
import { ConnectionState, getStateColor, getStateLabel } from '../models/ConnectionState'
import { useThemeStore } from '../stores/themeStore'

/**
 * 顶部标题栏(高 46px)。左侧品牌 logo + "GM 控制台",右侧连接状态 + 主题切换 + 窗口控制(占位)。
 * 整条 drag-region 让用户可拖窗。
 */
export function TopBar(): JSX.Element {
  const state = useConnectionStore((s) => s.state)
  const params = useConnectionStore((s) => s.params)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)

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

      {/* 主题切换（白天 / 黑夜，状态持久化） */}
      <button
        type="button"
        onClick={toggleTheme}
        title={theme === 'dark' ? '切换到白天模式' : '切换到黑夜模式'}
        className="no-drag ml-3 w-7 h-7 rounded-md flex items-center justify-center text-ink2 hover:text-ink1 hover:bg-card2 transition"
      >
        {theme === 'dark' ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        )}
      </button>

      {/* 窗口控制(占位,真实窗口控制由 Win 系统标题栏提供) */}
      <div className="no-drag flex items-center gap-3 ml-4 text-ink3">
        <span className="inline-block w-3 h-px bg-ink3" title="最小化" />
        <span className="inline-block w-3 h-3 border border-ink3 rounded-[2px]" title="最大化" />
      </div>
    </div>
  )
}
