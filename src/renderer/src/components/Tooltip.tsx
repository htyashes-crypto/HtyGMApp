import { useRef, useState, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  children: ReactNode
  content: string
  placement?: 'right' | 'left' | 'top' | 'bottom'
  delayMs?: number
}

/**
 * 通用悬浮提示。Portal 到 document.body 避免被 ScrollView 裁切。
 * 仅在 content 非空时启用,方便调用方按"长名字才需要"做条件控制。
 */
export function Tooltip({ children, content, placement = 'right', delayMs = 350 }: TooltipProps): JSX.Element {
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current)
  }, [])

  const enabled = content.length > 0

  const onEnter = (): void => {
    if (!enabled) return
    if (timerRef.current != null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      const node = wrapperRef.current
      if (!node) return
      const rect = node.getBoundingClientRect()
      setPos(computePos(rect, placement))
      setOpen(true)
    }, delayMs)
  }

  const onLeave = (): void => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current)
    setOpen(false)
    setPos(null)
  }

  return (
    <span ref={wrapperRef} onMouseEnter={onEnter} onMouseLeave={onLeave} className="contents">
      {children}
      {open && pos &&
        createPortal(
          <div
            className="fixed z-50 max-w-[420px] px-3 py-2 rounded bg-card2 border border-borderc text-ink1 text-2xs whitespace-pre-wrap break-words shadow-xl pointer-events-none"
            style={{ left: pos.x, top: pos.y }}
          >
            {content}
          </div>,
          document.body
        )
      }
    </span>
  )
}

function computePos(rect: DOMRect, placement: 'right' | 'left' | 'top' | 'bottom'): { x: number; y: number } {
  const margin = 6
  const w = window.innerWidth
  const h = window.innerHeight
  let x = 0
  let y = 0
  switch (placement) {
    case 'right':
      x = rect.right + margin
      y = rect.top
      if (x + 420 > w) x = rect.left - 420 - margin
      break
    case 'left':
      x = rect.left - 420 - margin
      y = rect.top
      if (x < 0) x = rect.right + margin
      break
    case 'bottom':
      x = rect.left
      y = rect.bottom + margin
      if (y + 80 > h) y = rect.top - 80 - margin
      break
    case 'top':
      x = rect.left
      y = rect.top - 80 - margin
      if (y < 0) y = rect.bottom + margin
      break
  }
  return { x: Math.max(4, x), y: Math.max(4, y) }
}
