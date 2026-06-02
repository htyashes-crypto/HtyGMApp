import { useConnectionStore } from '../stores/connectionStore'
import type { DiscoveryInfo } from '../gm'

interface GameListProps {
  onSelectInstance: (pid: number) => void
}

/** 左栏 Menu:游戏实例列表(宽 248)。 */
export function GameList({ onSelectInstance }: GameListProps): JSX.Element {
  const instances = useConnectionStore((s) => s.availableInstances)
  const selectedPid = useConnectionStore((s) => s.selectedInstancePid)

  return (
    <div className="w-[248px] shrink-0 bg-sidebar border-r border-borderc flex flex-col">
      {/* 标题 + 在线徽章 */}
      <div className="flex items-center px-5 pt-9 pb-3">
        <span className="text-ink2 text-xs font-bold tracking-[0.8px]">游戏实例</span>
        <div className="flex-1" />
        <div className="px-2.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(45,212,167,0.14)' }}>
          <span className="text-brand text-[10.5px] font-bold">{instances.length} 在线</span>
        </div>
      </div>

      {/* 实例卡片列表 */}
      <div className="flex-1 overflow-y-auto gm-scroll px-3 space-y-2">
        {instances.length === 0 ? (
          <div className="text-ink3 text-2xs px-1 py-4 leading-relaxed">
            未发现 Unity 实例。
            <br />
            请确认 Unity 端 GM 桥已开启且 GMApp 启动。
          </div>
        ) : (
          instances.map((info) => (
            <InstanceCard
              key={info.pid}
              info={info}
              selected={info.pid === selectedPid}
              onClick={() => onSelectInstance(info.pid)}
            />
          ))
        )}
      </div>

      {/* 底部自动发现提示 */}
      <div className="border-t border-borderSoft mx-3 px-1 py-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-brand" />
        <span className="text-ink3 text-[10.5px]">每 3 秒自动发现</span>
      </div>
    </div>
  )
}

function InstanceCard({
  info,
  selected,
  onClick
}: {
  info: DiscoveryInfo
  selected: boolean
  onClick: () => void
}): JSX.Element {
  const initial = (info.productName || 'U').trim().charAt(0).toUpperCase()

  return (
    <button
      onClick={onClick}
      className={
        'relative w-full h-[60px] rounded-[11px] flex items-center px-3.5 text-left transition ' +
        (selected
          ? 'border border-brand/45'
          : 'bg-card border border-borderSoft hover:brightness-110')
      }
      style={selected ? { backgroundColor: 'rgba(45,212,167,0.10)' } : undefined}
    >
      {selected && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-[1.5px] bg-brand" />}
      <div className="w-[38px] h-[38px] rounded-[9px] bg-card2 flex items-center justify-center shrink-0">
        <span className={`text-[17px] font-bold ${selected ? 'text-brand' : 'text-ink2'}`}>{initial}</span>
      </div>
      <div className="flex-1 min-w-0 ml-3">
        <div className="text-ink1 text-[13.5px] font-bold truncate">{info.productName || 'Unity'}</div>
        <div className="text-ink3 text-[10.5px] font-mono truncate">
          pid {info.pid} · {info.source}
        </div>
      </div>
      <span className="w-[7px] h-[7px] rounded-full bg-brand shrink-0 self-start mt-1" />
    </button>
  )
}
