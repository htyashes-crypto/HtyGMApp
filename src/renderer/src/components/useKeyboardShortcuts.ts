import { useEffect } from 'react'

interface ShortcutHandlers {
  onRefresh?: () => void
  onToggleLog?: () => void
  onFocusSearch?: () => void
}

/**
 * 全局键盘快捷键。Mac 用 Cmd(metaKey),Win/Linux 用 Ctrl。
 * 输入框内(input/textarea/select/contenteditable)忽略。
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const listener = (e: KeyboardEvent): void => {
      if (isEditable(e.target as HTMLElement | null)) return
      const meta = e.ctrlKey || e.metaKey
      if (!meta) return

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        handlers.onRefresh?.()
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault()
        handlers.onToggleLog?.()
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        handlers.onFocusSearch?.()
      }
    }

    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [handlers])
}

function isEditable(el: HTMLElement | null): boolean {
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (el.isContentEditable) return true
  return false
}
