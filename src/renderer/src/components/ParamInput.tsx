import type { GmParameterMeta } from '../network/GmBridgeProtocol'
import { SearchableSelect, type SelectOption } from './SearchableSelect'

interface ParamInputProps {
  meta: GmParameterMeta
  value: string
  onChange: (value: string) => void
}

/** 单参数控件:Label(参数名) + 按 type 渲染的受控控件。 */
export function ParamInput({ meta, value, onChange }: ParamInputProps): JSX.Element {
  return (
    <div className="flex items-center gap-2" title={meta.tip || undefined}>
      <span className="text-ink2 text-2xs whitespace-nowrap">{meta.name}</span>
      {renderControl(meta, value, onChange)}
    </div>
  )
}

function renderControl(
  meta: GmParameterMeta,
  value: string,
  onChange: (value: string) => void
): JSX.Element {
  switch (meta.type) {
    case 'Int':
    case 'Float':
      return (
        <input
          type="number"
          step={meta.type === 'Float' ? 'any' : '1'}
          className="gm-field font-mono w-[64px]"
          value={value}
          placeholder={meta.tip || undefined}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
        />
      )
    case 'Bool': {
      const on = value === 'true' || value === '1'
      return (
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => onChange(on ? 'false' : 'true')}
          className="relative w-[38px] h-[22px] rounded-full transition border"
          style={{
            backgroundColor: on ? 'rgba(45,212,167,0.25)' : '#0E1013',
            borderColor: on ? 'rgba(45,212,167,0.5)' : '#262B34'
          }}
        >
          <span
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full transition-all"
            style={{
              left: on ? 'calc(100% - 18px)' : '2px',
              backgroundColor: on ? '#2DD4A7' : '#626B7A'
            }}
          />
        </button>
      )
    }
    case 'Enum': {
      // 可搜索下拉:value=实际执行值,label=显示名(无则回退实际值),icon=枚举图标 base64(可空);映射整数时 label=关闭/开启、value=0/1
      const options: SelectOption[] = (meta.enumOptions ?? []).map((opt, i) => ({
        value: opt,
        label: meta.enumDisplayNames?.[i] || opt,
        icon: meta.enumIconsBase64?.[i] || undefined
      }))
      return <SearchableSelect value={value} options={options} onChange={onChange} minWidth={150} />
    }
    case 'String':
    default:
      return (
        <input
          type="text"
          className="gm-field w-[160px]"
          value={value}
          placeholder={meta.tip || '输入文本…'}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
        />
      )
  }
}
