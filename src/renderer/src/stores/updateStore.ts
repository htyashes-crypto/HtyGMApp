import { create } from 'zustand'

export interface UpdateInfo {
  version: string
  releaseNotes?: string | Array<{ version: string; note: string }> | null
  releaseName?: string | null
  releaseDate?: string | null
}

export interface UpdateProgress {
  bytesPerSecond: number
  percent: number
  transferred: number
  total: number
}

export type UpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'dismissed'

interface UpdateStore {
  state: UpdateState
  info: UpdateInfo | null
  progress: UpdateProgress | null
  errorMessage: string | null
  manuallyTriggered: boolean
  setState: (s: UpdateState) => void
  setInfo: (info: UpdateInfo | null) => void
  setProgress: (p: UpdateProgress | null) => void
  setError: (msg: string | null) => void
  setManuallyTriggered: (b: boolean) => void
  reset: () => void
}

export const useUpdateStore = create<UpdateStore>((set) => ({
  state: 'idle',
  info: null,
  progress: null,
  errorMessage: null,
  manuallyTriggered: false,
  setState: (state) => set({ state }),
  setInfo: (info) => set({ info }),
  setProgress: (progress) => set({ progress }),
  setError: (errorMessage) => set({ errorMessage }),
  setManuallyTriggered: (manuallyTriggered) => set({ manuallyTriggered }),
  reset: () => set({ state: 'idle', info: null, progress: null, errorMessage: null, manuallyTriggered: false })
}))

export function normalizeReleaseNotes(notes: UpdateInfo['releaseNotes']): string {
  if (!notes) return ''
  if (typeof notes === 'string') return notes
  if (Array.isArray(notes)) {
    return notes
      .map((n) => `### ${n.version}\n\n${n.note}`)
      .join('\n\n---\n\n')
  }
  return ''
}
