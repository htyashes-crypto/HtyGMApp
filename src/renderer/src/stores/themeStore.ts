import { create } from 'zustand'

/** 主题模式：黑夜（默认）/ 白天。 */
export type ThemeMode = 'dark' | 'light'

/** 把主题写到 &lt;html data-theme&gt;，globals.css 的 CSS 变量随之切换（tailwind 颜色全部引用这些变量）。 */
function applyTheme(theme: ThemeMode): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme
  }
}

interface ThemeStore {
  theme: ThemeMode
  /** 启动还原：仅应用，不写回持久化（值就是从持久化读出来的）。 */
  initTheme: (theme: ThemeMode) => void
  /** 用户切换：应用 + 持久化到主进程 settings。 */
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: 'dark',
  initTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
  toggleTheme: () => {
    const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    set({ theme: next })
    void window.gm.setSetting('theme', next)
  }
}))
