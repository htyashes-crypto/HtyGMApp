import { useGmStore, type ExecutionLog as ExecutionLogEntry } from '../stores/gmStore'

/** 右栏:执行日志(宽 344)。标题 + 清空 + 隐藏按钮 + 日志卡片列表(倒序)。 */
export function ExecutionLog(): JSX.Element {
  const logs = useGmStore((s) => s.executionLogs)
  const clearLogs = useGmStore((s) => s.clearLogs)
  const toggleLog = useGmStore((s) => s.toggleLog)

  return (
    <div className="w-[344px] shrink-0 bg-sidebar border-l border-borderc flex flex-col">
      {/* 标题 + 清空 + 隐藏 */}
      <div className="flex items-center px-5 pt-[34px] pb-3 gap-2">
        <span className="text-ink2 text-[13px] font-bold tracking-[0.5px]">执行日志</span>
        <div className="flex-1" />
        <button
          onClick={clearLogs}
          className="px-2.5 py-1 rounded-[6px] border border-borderc text-ink3 text-[10.5px] hover:brightness-125 transition"
          title="清空执行日志"
        >
          清空
        </button>
        <button
          onClick={toggleLog}
          className="w-7 h-6 rounded-[6px] border border-borderc flex items-center justify-center text-ink2 text-sm font-bold hover:brightness-125 transition"
          title="隐藏执行日志"
        >
          »
        </button>
      </div>
      <div className="border-t border-borderSoft mx-5" />

      {/* 日志卡片列表 */}
      <div className="flex-1 overflow-y-auto gm-scroll px-5 py-2.5 space-y-2">
        {logs.length === 0 ? (
          <div className="text-ink3 text-2xs py-8 text-center">暂无执行记录。</div>
        ) : (
          logs.map((log) => <LogCard key={log.id} log={log} />)
        )}
      </div>
    </div>
  )
}

function LogCard({ log }: { log: ExecutionLogEntry }): JSX.Element {
  return (
    <div
      className="relative rounded-[10px] bg-card px-3.5 py-2.5 pl-4 border"
      style={{ borderColor: log.ok ? '#20252E' : '#3A1E24' }}
    >
      <span
        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-[1.5px]"
        style={{ backgroundColor: log.ok ? '#2DD4A7' : '#FF5C72' }}
      />
      <div className="flex items-center gap-2">
        <span
          className="w-[7px] h-[7px] rounded-full shrink-0"
          style={{ backgroundColor: log.ok ? '#2DD4A7' : '#FF5C72' }}
        />
        <span className="text-ink1 text-[12.5px] font-bold truncate flex-1">{log.command}</span>
        <span className="text-ink3 text-3xs font-mono shrink-0">{log.time}</span>
      </div>
      {log.ok
        ? log.output && (
            <div className="text-ink2 text-[10.5px] font-mono mt-1.5 break-words whitespace-pre-wrap">
              {log.output}
            </div>
          )
        : (
            <div className="text-err text-[10.5px] font-mono mt-1.5 break-words whitespace-pre-wrap">
              {log.error || '执行失败'}
            </div>
          )}
    </div>
  )
}
