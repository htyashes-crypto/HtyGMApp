import { useUpdateStore, normalizeReleaseNotes } from '../stores/updateStore'

interface UpdateModalProps {
  onDownload: () => void
  onInstall: () => void
  onDismiss: () => void
  onRetry: () => void
}

/** GitHub 自动更新弹窗。 */
export function UpdateModal({ onDownload, onInstall, onDismiss, onRetry }: UpdateModalProps): JSX.Element | null {
  const { state, info, progress, errorMessage } = useUpdateStore()

  if (state === 'idle' || state === 'checking' || state === 'dismissed') return null

  const version = info?.version ?? '?'
  const notes = normalizeReleaseNotes(info?.releaseNotes ?? null)
  const releaseDate = info?.releaseDate ? new Date(info.releaseDate).toLocaleDateString() : ''

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[640px] max-w-[92vw] max-h-[80vh] flex flex-col overflow-hidden rounded-xl bg-card border border-brand/40 shadow-2xl">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-borderc bg-card2">
          <div className="text-2xl">{state === 'error' ? '⚠️' : '🚀'}</div>
          <div className="flex-1 min-w-0">
            <div className="text-ink1 text-sm font-semibold">
              {state === 'available' && '检测到新版本可用'}
              {state === 'downloading' && '正在下载更新…'}
              {state === 'downloaded' && '更新已下载完成'}
              {state === 'error' && '更新检查失败'}
            </div>
            {state !== 'error' && (
              <div className="text-ink3 text-2xs mt-0.5 font-mono">
                v{version}{releaseDate ? ` · ${releaseDate}` : ''}
              </div>
            )}
          </div>
          <button
            className="text-ink3 hover:text-ink1 text-lg leading-none px-1"
            onClick={onDismiss}
            title="关闭"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto gm-scroll px-5 py-4">
          {state === 'available' && (
            <>
              <div className="text-ink2 text-xs mb-2">本次更新内容:</div>
              <pre className="text-ink1 text-xs leading-relaxed whitespace-pre-wrap break-words font-ui bg-field rounded p-3 border border-borderc">
                {notes || '(GitHub Release 未提供更新说明)'}
              </pre>
            </>
          )}

          {state === 'downloading' && progress && (
            <div className="space-y-3">
              <div className="text-ink2 text-xs">正在从 GitHub 下载新版本,请稍候…</div>
              <div className="h-3 bg-field rounded overflow-hidden">
                <div
                  className="h-full bg-brand transition-all duration-200"
                  style={{ width: `${Math.max(0, Math.min(100, progress.percent))}%` }}
                />
              </div>
              <div className="flex justify-between text-2xs text-ink3 font-mono">
                <span>{progress.percent.toFixed(1)}%</span>
                <span>
                  {formatBytes(progress.transferred)} / {formatBytes(progress.total)}
                </span>
                <span>{formatBytes(progress.bytesPerSecond)}/s</span>
              </div>
            </div>
          )}

          {state === 'downloaded' && (
            <div className="space-y-3">
              <div className="text-ink1 text-sm">
                v{version} 已下载完成。点击"立即重启"完成安装;
              </div>
              <div className="text-ink3 text-2xs">
                也可以选择"稍后",应用退出时会自动安装。
              </div>
              {notes && (
                <details className="mt-3">
                  <summary className="text-ink3 text-2xs cursor-pointer hover:text-ink1">
                    查看更新内容
                  </summary>
                  <pre className="mt-2 text-ink1 text-xs leading-relaxed whitespace-pre-wrap break-words font-ui bg-field rounded p-3 border border-borderc max-h-48 overflow-y-auto gm-scroll">
                    {notes}
                  </pre>
                </details>
              )}
            </div>
          )}

          {state === 'error' && (
            <div className="space-y-3">
              <div className="text-err text-xs font-mono whitespace-pre-wrap break-words">
                {errorMessage || '(无错误详情)'}
              </div>
              <div className="text-ink3 text-2xs">
                常见原因:网络不通、GitHub API 限流、Release 还没发布、本地版本号已是最新。
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-5 py-3 border-t border-borderc bg-card2">
          <div className="flex-1 text-ink3 text-3xs">
            {state === 'available' && '更新会从 GitHub Releases 拉取,需要网络'}
            {state === 'downloading' && progress && progress.percent > 99
              ? '即将完成…'
              : state === 'downloading' && '下载完成后会提示重启'}
            {state === 'downloaded' && '安装会关闭当前应用'}
          </div>

          {state === 'available' && (
            <>
              <button className="gm-mini-btn" onClick={onDismiss}>稍后</button>
              <button
                className="bg-brand text-brandInk text-xs font-bold px-4 py-1.5 rounded hover:brightness-110"
                onClick={onDownload}
              >
                立即更新
              </button>
            </>
          )}

          {state === 'downloading' && (
            <button className="gm-mini-btn" onClick={onDismiss}>后台下载</button>
          )}

          {state === 'downloaded' && (
            <>
              <button className="gm-mini-btn" onClick={onDismiss}>稍后</button>
              <button
                className="bg-brand text-brandInk text-xs font-bold px-4 py-1.5 rounded hover:brightness-110"
                onClick={onInstall}
              >
                立即重启安装
              </button>
            </>
          )}

          {state === 'error' && (
            <>
              <button className="gm-mini-btn" onClick={onDismiss}>关闭</button>
              <button
                className="bg-brand text-brandInk text-xs font-bold px-4 py-1.5 rounded hover:brightness-110"
                onClick={onRetry}
              >
                重试
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let v = bytes
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}
