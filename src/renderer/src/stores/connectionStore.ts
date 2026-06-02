import { create } from 'zustand'
import { ConnectionState } from '../models/ConnectionState'
import type { DiscoveryInfo } from '../gm'

export interface ConnectionParams {
  host: string
  port: number
  token: string
}

interface ConnectionStore {
  state: ConnectionState
  params: ConnectionParams
  pingMs: number
  recvCount: number
  sentCount: number
  reconnectAttempt: number
  nextAttemptAtMs: number | null
  serverVersion: string
  lastError: string | null
  availableInstances: DiscoveryInfo[]
  selectedInstancePid: number | null
  setState: (s: ConnectionState) => void
  setParams: (p: Partial<ConnectionParams>) => void
  setPing: (ms: number) => void
  setCounts: (recv: number, sent: number) => void
  setReconnectAttempt: (n: number) => void
  setNextAttemptAt: (ms: number | null) => void
  setServerVersion: (v: string) => void
  setLastError: (e: string | null) => void
  setAvailableInstances: (list: DiscoveryInfo[]) => void
  setSelectedInstancePid: (pid: number | null) => void
  reset: () => void
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  state: ConnectionState.Disconnected,
  params: { host: '127.0.0.1', port: 17920, token: '' },
  pingMs: 0,
  recvCount: 0,
  sentCount: 0,
  reconnectAttempt: 0,
  nextAttemptAtMs: null,
  serverVersion: '',
  lastError: null,
  availableInstances: [],
  selectedInstancePid: null,
  setState: (state) => set({ state }),
  setParams: (p) => set((s) => ({ params: { ...s.params, ...p } })),
  setPing: (pingMs) => set({ pingMs }),
  setCounts: (recvCount, sentCount) => set({ recvCount, sentCount }),
  setReconnectAttempt: (reconnectAttempt) => set({ reconnectAttempt }),
  setNextAttemptAt: (nextAttemptAtMs) => set({ nextAttemptAtMs }),
  setServerVersion: (serverVersion) => set({ serverVersion }),
  setLastError: (lastError) => set({ lastError }),
  setAvailableInstances: (availableInstances) => set({ availableInstances }),
  setSelectedInstancePid: (selectedInstancePid) => set({ selectedInstancePid }),
  reset: () => set({
    state: ConnectionState.Disconnected,
    pingMs: 0,
    recvCount: 0,
    sentCount: 0,
    reconnectAttempt: 0,
    nextAttemptAtMs: null,
    serverVersion: '',
    lastError: null
  })
}))
