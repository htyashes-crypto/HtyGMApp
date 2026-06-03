import { useMemo } from 'react'
import { CommandRow } from './CommandRow'
import { useGmStore } from '../stores/gmStore'
import { useConnectionStore } from '../stores/connectionStore'
import { ConnectionState } from '../models/ConnectionState'
import type { GmArgValue, GmCommandMeta } from '../network/GmBridgeProtocol'

interface CommandPanelProps {
  onRefresh: () => void
  onExecute: (commandId: string, args: GmArgValue[]) => void
}

const UNGROUPED = '其它'

/** 中栏:搜索栏 + 刷新 + (日志隐藏时)展开按钮 + 命令按 category 分组列表。 */
export function CommandPanel({ onRefresh, onExecute }: CommandPanelProps): JSX.Element {
  const commands = useGmStore((s) => s.commands)
  const keyword = useGmStore((s) => s.searchKeyword)
  const setSearch = useGmStore((s) => s.setSearch)
  const logVisible = useGmStore((s) => s.logVisible)
  const toggleLog = useGmStore((s) => s.toggleLog)
  const commandsLoading = useGmStore((s) => s.commandsLoading)
  const loadTotal = useGmStore((s) => s.loadTotal)
  const loadReceived = useGmStore((s) => s.loadReceived)
  const state = useConnectionStore((s) => s.state)

  const canExecute = state === ConnectionState.Ready

  const grouped = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    const filtered = kw
      ? commands.filter(
          (c) =>
            c.displayName.toLowerCase().includes(kw) ||
            c.commandId.toLowerCase().includes(kw) ||
            (c.category ?? '').toLowerCase().includes(kw)
        )
      : commands
    const map = new Map<string, GmCommandMeta[]>()
    for (const c of filtered) {
      const cat = c.category?.trim() || UNGROUPED
      const list = map.get(cat)
      if (list) list.push(c)
      else map.set(cat, [c])
    }
    return Array.from(map.entries())
  }, [commands, keyword])

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      {/* 搜索栏 + 刷新 + 展开日志 */}
      <div className="flex items-center gap-2 px-[24px] pt-5 pb-3">
        <div className="flex-1 h-10 rounded-[10px] bg-card border border-borderc flex items-center px-3.5 gap-2.5 focus-within:border-brand/70 transition">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="shrink-0">
            <circle cx="5.5" cy="5.5" r="4.5" stroke="#626B7A" strokeWidth="1.4" />
            <line x1="9" y1="9" x2="12" y2="12" stroke="#626B7A" strokeWidth="1.4" />
          </svg>
          <input
            id="gm-search"
            className="flex-1 bg-transparent outline-none text-ink1 text-[13px] placeholder:text-ink3"
            placeholder="搜索命令…"
            value={keyword}
            onChange={(e) => setSearch(e.target.value)}
            spellCheck={false}
          />
        </div>
        <button
          onClick={onRefresh}
          className="w-10 h-10 rounded-[10px] bg-card border border-borderc flex items-center justify-center hover:brightness-110 transition"
          title="重新拉取命令清单"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M 2 6 A 5 5 0 1 0 3 3 M 3 3 L 3 6.5 M 3 3 L 6.5 3"
              stroke="#9BA4B3"
              strokeWidth="1.4"
              fill="none"
            />
          </svg>
        </button>
        {!logVisible && (
          <button
            onClick={toggleLog}
            className="h-10 px-3.5 rounded-[10px] bg-card border border-borderc flex items-center gap-1.5 hover:brightness-110 transition"
            title="展开执行日志"
          >
            <span className="text-ink2 text-[15px] font-bold leading-none">«</span>
            <span className="text-ink2 text-[12.5px] font-semibold">执行日志</span>
          </button>
        )}
      </div>

      {/* 命令分组列表 */}
      <div className="flex-1 overflow-y-auto gm-scroll px-[24px] pb-4">
        {commandsLoading && (
          <div className="pt-4 pb-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-ink2 text-2xs font-semibold">正在加载命令清单…</span>
              <span className="text-ink3 text-2xs font-mono">
                {loadReceived}/{loadTotal}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-card2 overflow-hidden">
              <div
                className="h-full bg-brand transition-[width] duration-150"
                style={{ width: `${loadTotal > 0 ? Math.round((loadReceived / loadTotal) * 100) : 0}%` }}
              />
            </div>
          </div>
        )}
        {commands.length === 0 && !commandsLoading ? (
          <div className="text-ink3 text-xs py-10 text-center">
            {canExecute ? '该实例未注册任何 GM 命令。' : '连接到游戏实例后将自动拉取命令清单。'}
          </div>
        ) : grouped.length === 0 && !commandsLoading ? (
          <div className="text-ink3 text-xs py-10 text-center">无匹配「{keyword}」的命令。</div>
        ) : (
          grouped.map(([category, cmds]) => (
            <div key={category} className="mb-2">
              {/* 组标题 + 分隔线 */}
              <div className="flex items-center gap-3 pt-4 pb-3">
                <span className="text-ink3 text-2xs font-bold tracking-[1.4px] uppercase whitespace-nowrap">
                  {category}
                </span>
                <span className="flex-1 h-px bg-borderSoft" />
              </div>
              <div className="space-y-2">
                {cmds.map((c) => (
                  <CommandRow key={c.commandId} command={c} canExecute={canExecute} onExecute={onExecute} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
