import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface SelectOption {
  value: string
  label: string
  /** 选项图标 base64 PNG（可空）；非空时显示「图标 - 名称」。 */
  icon?: string
}

interface SearchableSelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  minWidth?: number
}

/**
 * 可搜索下拉:触发按钮 + portal 浮层(搜索框 + 选项列表)。
 * 深色主题、宽度大气、支持键盘 ↑↓ + Enter + Esc、点击外部/滚动自动关闭。
 * 选项可带图标(base64 PNG),显示「图标 - 名称」。
 * 浮层经 createPortal 渲染到 body,不被命令列表的 overflow 裁剪;近视口底自动向上展开。
 */
export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = '请选择…',
  minWidth = 150
}: SearchableSelectProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; width: number } | null>(null)

  const selected = options.find((o) => o.value === value)
  const display = selected?.label ?? value ?? ''

  const kw = keyword.trim().toLowerCase()
  const filtered = kw
    ? options.filter((o) => o.label.toLowerCase().includes(kw) || o.value.toLowerCase().includes(kw))
    : options

  // 浮层定位(打开时按触发按钮 rect 计算;近底向上展开、超右回拉)
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const width = Math.max(r.width, 240)
    let left = r.left
    if (left + width > window.innerWidth - 8) left = window.innerWidth - 8 - width
    if (left < 8) left = 8
    const spaceBelow = window.innerHeight - r.bottom
    if (spaceBelow < 300) {
      setPos({ left, bottom: window.innerHeight - r.top + 4, width })
    } else {
      setPos({ left, top: r.bottom + 4, width })
    }
  }, [open])

  // 打开时重置搜索 / 高亮
  useEffect(() => {
    if (open) {
      setKeyword('')
      setActiveIndex(0)
    }
  }, [open])

  // 键盘高亮项滚动可见
  useEffect(() => {
    if (open) activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  // 点击外部 / Esc / 滚动 / resize 关闭
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      const t = e.target as Node
      if (
        popupRef.current &&
        !popupRef.current.contains(t) &&
        triggerRef.current &&
        !triggerRef.current.contains(t)
      ) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    // 仅「外部(命令列表/窗口)滚动」时关闭以避免浮层错位;浮层内部选项列表滚动(点击/拖动滚动条)不关闭
    const onScroll = (e: Event): void => {
      const t = e.target
      if (popupRef.current && t instanceof Node && popupRef.current.contains(t)) return
      setOpen(false)
    }
    const onResize = (): void => setOpen(false)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  const choose = (v: string): void => {
    onChange(v)
    setOpen(false)
  }

  const onSearchKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const o = filtered[activeIndex]
      if (o) choose(o.value)
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="gm-field flex items-center justify-between gap-2 text-left"
        style={{ minWidth }}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {selected?.icon && (
            <img
              src={`data:image/png;base64,${selected.icon}`}
              alt=""
              className="w-4 h-4 object-contain shrink-0"
            />
          )}
          <span className={`truncate ${display ? 'text-ink1' : 'text-ink3'}`}>{display || placeholder}</span>
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0" style={{ color: 'rgb(var(--c-ink3))' }}>
          <path d="M2 3.5 L5 6.5 L8 3.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
        </svg>
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={popupRef}
            className="fixed z-[9999] rounded-[10px] bg-card2 border border-borderc overflow-hidden"
            style={{
              left: pos.left,
              top: pos.top,
              bottom: pos.bottom,
              width: pos.width,
              boxShadow: '0 12px 32px rgba(0,0,0,0.45)'
            }}
          >
            {/* 搜索框 */}
            <div className="p-2 border-b border-borderSoft">
              <input
                autoFocus
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={onSearchKey}
                placeholder="搜索…"
                spellCheck={false}
                className="w-full bg-field border border-borderc rounded-[7px] text-ink1 text-xs px-2.5 py-1.5 outline-none focus:border-brand/70 placeholder:text-ink3"
              />
            </div>
            {/* 选项列表 */}
            <div className="max-h-[260px] overflow-y-auto gm-scroll py-1">
              {filtered.length === 0 ? (
                <div className="text-ink3 text-xs px-3 py-3 text-center">无匹配项</div>
              ) : (
                filtered.map((o, i) => {
                  const isSel = o.value === value
                  const isActive = i === activeIndex
                  return (
                    <button
                      key={o.value}
                      ref={isActive ? activeRef : undefined}
                      type="button"
                      onClick={() => choose(o.value)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-xs transition"
                      style={{
                        backgroundColor: isActive ? 'rgba(45,212,167,0.12)' : 'transparent',
                        color: isSel ? 'rgb(var(--c-brand))' : 'rgb(var(--c-ink1))'
                      }}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-[11px] shrink-0 flex items-center justify-center">
                          {isSel && (
                            <svg width="11" height="11" viewBox="0 0 11 11">
                              <path d="M2 5.5 L4.5 8 L9 3" stroke="currentColor" strokeWidth="1.6" fill="none" />
                            </svg>
                          )}
                        </span>
                        {o.icon && (
                          <img
                            src={`data:image/png;base64,${o.icon}`}
                            alt=""
                            className="w-[18px] h-[18px] object-contain shrink-0"
                          />
                        )}
                        <span className="truncate">{o.label}</span>
                      </span>
                      {o.label !== o.value && (
                        <span className="text-ink3 font-mono text-3xs shrink-0">{o.value}</span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
