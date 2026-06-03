import { useState } from 'react'
import { ParamInput } from './ParamInput'
import type { GmCommandMeta, GmArgValue } from '../network/GmBridgeProtocol'

interface CommandRowProps {
  command: GmCommandMeta
  canExecute: boolean
  onExecute: (commandId: string, args: GmArgValue[]) => void
}

/** 单命令行:图标方块 + 名称 + commandId + 参数控件横排 + 执行按钮。 */
export function CommandRow({ command, canExecute, onExecute }: CommandRowProps): JSX.Element {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const p of command.parameters) {
      // Enum 无默认值时回退首个选项（保证下拉有合法选中值，避免映射整数时回传空串导致 int.Parse 失败）
      init[p.name] = p.defaultValue ?? (p.type === 'Enum' ? (p.enumOptions?.[0] ?? '') : defaultForType(p.type))
    }
    return init
  })

  const setValue = (name: string, value: string): void => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleExecute = (): void => {
    const args: GmArgValue[] = command.parameters.map((p) => ({
      name: p.name,
      // 枚举映射整数时按 Int 回传，服务端走 int.Parse 执行（操作是枚举、执行是整数）
      type: p.type === 'Enum' && p.enumAsInt ? 'Int' : p.type,
      value: values[p.name] ?? ''
    }))
    onExecute(command.commandId, args)
  }

  const initial = (command.displayName || '?').trim().charAt(0).toUpperCase()

  return (
    <div className="min-h-[62px] rounded-[12px] bg-card border border-borderSoft flex items-center px-3 py-2.5 gap-3">
      {/* 图标方块 */}
      <div className="w-[42px] h-[42px] rounded-[9px] bg-card2 flex items-center justify-center shrink-0 overflow-hidden">
        {command.iconBase64 ? (
          <img
            src={`data:image/png;base64,${command.iconBase64}`}
            alt=""
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="text-brand text-[17px] font-bold">{initial}</span>
        )}
      </div>

      {/* 名称 + commandId */}
      <div className="min-w-0 shrink-0" style={{ width: 120 }}>
        <div className="text-ink1 text-[13.5px] font-bold truncate">{command.displayName}</div>
        <div className="text-ink3 text-3xs font-mono truncate">{command.commandId}</div>
      </div>

      {/* 参数控件横排 */}
      <div className="flex-1 flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0">
        {command.parameters.map((p) => (
          <ParamInput key={p.name} meta={p} value={values[p.name] ?? ''} onChange={(v) => setValue(p.name, v)} />
        ))}
      </div>

      {/* 执行按钮 */}
      <button
        onClick={handleExecute}
        disabled={!canExecute}
        className="shrink-0 bg-brand text-brandInk text-xs font-bold px-4 py-2 rounded-[8px] hover:brightness-110 active:brightness-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
        title={canExecute ? '执行命令' : '需先连接到游戏实例'}
      >
        执行
      </button>
    </div>
  )
}

function defaultForType(type: GmCommandMeta['parameters'][number]['type']): string {
  switch (type) {
    case 'Int':
    case 'Float':
      return '0'
    case 'Bool':
      return 'false'
    default:
      return ''
  }
}
