import { contextBridge, ipcRenderer } from 'electron'

/** 与 Unity 侧 GmBridgeDiscovery.DiscoveryInfo 字段严格对齐。 */
export interface DiscoveryInfo {
  host: string
  port: number
  token: string
  timestamp: number
  pid: number
  source: string
  productName: string
  serverVersion: string
}

/** 受限暴露给渲染进程的 API;保持小而精,避免 nodeIntegration 风险。 */
const api = {
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
  /** 扫 ~/.gm-bridge/instances/ 返所有 Unity 实例,按 timestamp 降序(最新启动在前)。 */
  listDiscovery: () => ipcRenderer.invoke('discovery:list') as Promise<DiscoveryInfo[]>,
  getDiscoveryDir: () => ipcRenderer.invoke('discovery:dir') as Promise<string>,
  checkForUpdate: () => ipcRenderer.invoke('updater:checkNow'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdateChecking: (cb: () => void) => {
    const sub = (): void => cb()
    ipcRenderer.on('updater:checking', sub)
    return () => ipcRenderer.removeListener('updater:checking', sub)
  },
  onUpdateAvailable: (cb: (info: unknown) => void) => {
    const sub = (_e: unknown, info: unknown): void => cb(info)
    ipcRenderer.on('updater:available', sub)
    return () => ipcRenderer.removeListener('updater:available', sub)
  },
  onUpdateNotAvailable: (cb: (info: unknown) => void) => {
    const sub = (_e: unknown, info: unknown): void => cb(info)
    ipcRenderer.on('updater:notAvailable', sub)
    return () => ipcRenderer.removeListener('updater:notAvailable', sub)
  },
  onUpdateProgress: (cb: (progress: unknown) => void) => {
    const sub = (_e: unknown, progress: unknown): void => cb(progress)
    ipcRenderer.on('updater:progress', sub)
    return () => ipcRenderer.removeListener('updater:progress', sub)
  },
  onUpdateDownloaded: (cb: (info: unknown) => void) => {
    const sub = (_e: unknown, info: unknown): void => cb(info)
    ipcRenderer.on('updater:downloaded', sub)
    return () => ipcRenderer.removeListener('updater:downloaded', sub)
  },
  onUpdateError: (cb: (err: { message: string }) => void) => {
    const sub = (_e: unknown, err: { message: string }): void => cb(err)
    ipcRenderer.on('updater:error', sub)
    return () => ipcRenderer.removeListener('updater:error', sub)
  },
  /** 主进程菜单命令订阅;返回反订阅函数。命令字符串与 main/menu.ts MenuCommand 对齐。 */
  onMenuCommand: (cb: (cmd: string) => void) => {
    const sub = (_e: unknown, cmd: string): void => cb(cmd)
    ipcRenderer.on('menu:command', sub)
    return () => ipcRenderer.removeListener('menu:command', sub)
  }
}

contextBridge.exposeInMainWorld('gm', api)

export type GmApi = typeof api
