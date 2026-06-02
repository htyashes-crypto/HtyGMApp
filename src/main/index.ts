import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import Store from 'electron-store'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { installApplicationMenu } from './menu'

/** Unity GM 桥每实例一份 JSON 的容器目录,与 Unity 侧 GmBridgeDiscovery.GetInstancesDirPath() 对齐。 */
const DISCOVERY_INSTANCES_DIR = join(homedir(), '.gm-bridge', 'instances')

/**
 * Unity 进程是否还活着。process.kill(pid, 0) 探测:
 * - 进程存在 → 正常返(不抛)
 * - 进程不存在 → 抛 ESRCH → 视为死
 * - 其他异常 → 保守视为活
 */
function isProcessAlive(pid: number): boolean {
  if (!Number.isFinite(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    const code = (e as NodeJS.ErrnoException)?.code
    if (code === 'ESRCH') return false
    return true
  }
}

/**
 * 扫 instances/ 目录读所有 .json 实例文件,按 timestamp 降序返(最新启动的在前)。
 * 单个文件读取/解析失败跳过不影响其它;目录不存在返空数组。
 * PID 已死的实例被过滤掉。
 */
async function readDiscoveryInstances(): Promise<Array<Record<string, unknown>>> {
  let files: string[]
  try {
    files = await readdir(DISCOVERY_INSTANCES_DIR)
  } catch {
    return []
  }
  const result: Array<Record<string, unknown>> = []
  for (const name of files) {
    if (!name.endsWith('.json')) continue
    try {
      const text = await readFile(join(DISCOVERY_INSTANCES_DIR, name), 'utf-8')
      const info = JSON.parse(text) as Record<string, unknown>
      if (info && typeof info === 'object' && typeof info.token === 'string' && info.token) {
        const pid = Number(info.pid ?? 0)
        if (pid > 0 && !isProcessAlive(pid)) continue
        result.push(info)
      }
    } catch {
      // 单文件损坏忽略
    }
  }
  result.sort((a, b) => Number(b.timestamp ?? 0) - Number(a.timestamp ?? 0))
  return result
}

interface AppSettings {
  windowBounds?: { width: number; height: number; x?: number; y?: number }
  lastConnection?: { host: string; port: number; token: string }
  theme?: 'dark' | 'light'
  logVisible?: boolean
}

const store = new Store<AppSettings>({
  name: 'gm-app-settings',
  defaults: { windowBounds: { width: 1280, height: 800 } }
})

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const bounds = store.get('windowBounds') ?? { width: 1280, height: 800 }
  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    autoHideMenuBar: process.platform !== 'darwin',
    title: 'GM 控制台',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0E1013',
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('close', () => {
    if (mainWindow) {
      const b = mainWindow.getBounds()
      store.set('windowBounds', b)
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.actframework.gm-app')

  ipcMain.handle('settings:get', (_e, key: keyof AppSettings) => store.get(key))
  ipcMain.handle('settings:set', (_e, key: keyof AppSettings, value: unknown) => {
    store.set(key, value as never)
    return true
  })

  ipcMain.handle('discovery:list', () => readDiscoveryInstances())
  ipcMain.handle('discovery:dir', () => DISCOVERY_INSTANCES_DIR)

  ipcMain.handle('updater:checkNow', () => autoUpdater.checkForUpdates())

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('updater:checking')
  })
  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('updater:available', info)
  })
  autoUpdater.on('update-not-available', (info) => {
    mainWindow?.webContents.send('updater:notAvailable', info)
  })
  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('updater:progress', progress)
  })
  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('updater:downloaded', info)
  })
  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('updater:error', { message: err?.message ?? String(err) })
  })
  ipcMain.handle('updater:download', () => autoUpdater.downloadUpdate())
  ipcMain.handle('updater:install', () => autoUpdater.quitAndInstall())

  installApplicationMenu(() => mainWindow)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  if (app.isPackaged) {
    // 自更新：从 GitHub Releases (htyashes-crypto/HtyGMApp) 拉取；网络不可达或暂无 release 时静默。
    autoUpdater.checkForUpdates().catch(() => {})
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
