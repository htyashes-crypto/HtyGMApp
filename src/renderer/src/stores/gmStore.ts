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
  toggleLog: () => void
}

let m_logSeq = 1

export const useGmStore = create<GmStore>((set) => ({
  commands: [],
  executionLogs: [],
  searchKeyword: '',
  logVisible: true,
  setCommands: (commands) => set({ commands }),
  addLog: (log) =>
    set((s) => ({ executionLogs: [{ id: m_logSeq++, ...log }, ...s.executionLogs] })),
  clearLogs: () => set({ executionLogs: [] }),
  setSearch: (searchKeyword) => set({ searchKeyword }),
  toggleLog: () => set((s) => ({ logVisible: !s.logVisible }))
}))
