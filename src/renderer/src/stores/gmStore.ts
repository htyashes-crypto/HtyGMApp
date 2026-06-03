import { create } from 'zustand'
import type { GmCommandMeta } from '../network/GmBridgeProtocol'

/** 一条命令执行日志(倒序展示,新执行 unshift 到头部)。 */
export interface ExecutionLog {
  id: number
  command: string
  time: string
  ok: boolean
  output?: string
  error?: string
}

interface GmStore {
  commands: GmCommandMeta[]
  executionLogs: ExecutionLog[]
  searchKeyword: string
  logVisible: boolean
  // 命令清单分帧加载进度（命令多时服务端流式 begin→chunk→end，避免首屏卡顿）
  loadTotal: number
  loadReceived: number
  commandsLoading: boolean
  setCommands: (commands: GmCommandMeta[]) => void
  /** 分帧加载开始：清空旧命令、记总数、标记加载中。 */
  beginCommandLoad: (total: number) => void
  /** 分帧加载：追加一批命令并推进已收数。 */
  appendCommands: (batch: GmCommandMeta[]) => void
  /** 分帧加载结束：标记完成。 */
  endCommandLoad: () => void
  addLog: (log: Omit<ExecutionLog, 'id'>) => void
  clearLogs: () => void
  setSearch: (keyword: string) => void
  /** 启动还原日志面板显隐（不写回持久化）。 */
  setLogVisible: (visible: boolean) => void
  toggleLog: () => void
}

let m_logSeq = 1

export const useGmStore = create<GmStore>((set, get) => ({
  commands: [],
  executionLogs: [],
  searchKeyword: '',
  logVisible: true,
  loadTotal: 0,
  loadReceived: 0,
  commandsLoading: false,
  setCommands: (commands) => set({ commands, commandsLoading: false, loadTotal: 0, loadReceived: 0 }),
  beginCommandLoad: (total) => set({ commands: [], loadTotal: total, loadReceived: 0, commandsLoading: true }),
  appendCommands: (batch) =>
    set((s) => ({ commands: [...s.commands, ...batch], loadReceived: s.loadReceived + batch.length })),
  endCommandLoad: () => set({ commandsLoading: false }),
  addLog: (log) =>
    set((s) => ({ executionLogs: [{ id: m_logSeq++, ...log }, ...s.executionLogs] })),
  clearLogs: () => set({ executionLogs: [] }),
  setSearch: (searchKeyword) => set({ searchKeyword }),
  setLogVisible: (logVisible) => set({ logVisible }),
  toggleLog: () => {
    const next = !get().logVisible
    set({ logVisible: next })
    void window.gm.setSetting('logVisible', next)
  }
}))
