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
  setCommands: (commands: GmCommandMeta[]) => void
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
  setCommands: (commands) => set({ commands }),
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
