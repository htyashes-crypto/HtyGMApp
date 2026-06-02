import { app, Menu, MenuItemConstructorOptions, BrowserWindow } from 'electron'

/** 应用菜单命令通道:发给 renderer,由 App.tsx onMenuCommand 路由到具体业务 handler。 */
export const MenuChannel = 'menu:command'

/** 渲染端可识别的菜单命令字符串。 */
export type MenuCommand =
  | 'refresh-commands'
  | 'toggle-log'
  | 'reconnect'
  | 'check-for-update'
  | 'about'

/** 安装应用菜单;Mac 显示 dock 菜单,Win 启用菜单栏。 */
export function installApplicationMenu(getWindow: () => BrowserWindow | null): void {
  const isMac = process.platform === 'darwin'
  const send = (cmd: MenuCommand): void => getWindow()?.webContents.send(MenuChannel, cmd)

  const macAppMenu: MenuItemConstructorOptions = {
    label: app.name,
    submenu: [
      { role: 'about', label: '关于 GM 控制台' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide', label: '隐藏 GM 控制台' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit', label: '退出' }
    ]
  }

  const fileMenu: MenuItemConstructorOptions = {
    label: '文件',
    submenu: [
      { label: '重连游戏实例', accelerator: 'CmdOrCtrl+Shift+C', click: () => send('reconnect') },
      { type: 'separator' },
      isMac ? { role: 'close', label: '关闭窗口' } : { role: 'quit', label: '退出' }
    ]
  }

  const viewMenu: MenuItemConstructorOptions = {
    label: '视图',
    submenu: [
      { label: '刷新命令清单', accelerator: 'CmdOrCtrl+R', click: () => send('refresh-commands') },
      { label: '切换执行日志面板', accelerator: 'CmdOrCtrl+L', click: () => send('toggle-log') },
      { type: 'separator' },
      { role: 'reload', label: '重载渲染进程' },
      { role: 'forceReload', label: '强制重载' },
      { role: 'toggleDevTools', label: '切换开发者工具' },
      { type: 'separator' },
      { role: 'resetZoom', label: '实际大小' },
      { role: 'zoomIn', label: '放大' },
      { role: 'zoomOut', label: '缩小' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: '全屏' }
    ]
  }

  const helpMenu: MenuItemConstructorOptions = {
    label: '帮助',
    submenu: [
      { label: '检查更新…', click: () => send('check-for-update') },
      { type: 'separator' },
      { label: '关于 GM 控制台', click: () => send('about') }
    ]
  }

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [macAppMenu] : []),
    fileMenu,
    viewMenu,
    helpMenu
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
