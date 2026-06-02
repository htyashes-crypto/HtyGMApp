import { useToastStore, type ToastKind } from '../stores/toastStore'

const KIND_STYLES: Record<ToastKind, { ring: string; icon: string; iconColor: string }> = {
  info: { ring: 'ring-brand/30', icon: 'ℹ', iconColor: 'text-brand' },
  success: { ring: 'ring-brand/50', icon: '✓', iconColor: 'text-brand' },
  warning: { ring: 'ring-err/40', icon: '⚠', iconColor: 'text-err' },
  error: { ring: 'ring-err/60', icon: '✕', iconColor: 'text-err' }
}

/** 右下角浮窗 Toast 容器;最多 4 条同时显示。 */
export function ToastContainer(): JSX.Element {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  const visible = toasts.slice(-4)

  return (
    <div className="pointer-events-none fixed right-4 bottom-11 z-50 flex flex-col-reverse gap-2 max-w-[420px]">
      {visible.map((t) => {
        const style = KIND_STYLES[t.kind]
        return (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-md bg-card2 border border-borderc ring-1 ${style.ring} px-3 py-2 shadow-lg flex items-start gap-2 animate-[fadeInUp_0.18s_ease-out]`}
          >
            <span className={`text-base font-bold leading-none mt-0.5 ${style.iconColor}`}>{style.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-ink1 text-xs font-semibold truncate">{t.title}</div>
              {t.message && (
                <div className="text-ink2 text-2xs mt-0.5 break-words whitespace-pre-wrap">{t.message}</div>
              )}
            </div>
            <button
              className="text-ink3 hover:text-ink1 text-xs leading-none px-1"
              onClick={() => dismiss(t.id)}
              title="关闭"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
