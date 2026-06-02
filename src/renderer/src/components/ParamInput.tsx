import type { GmParameterMeta } from '../network/GmBridgeProtocol'

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
    case 'Enum':
      return (
        <select
          className="gm-field min-w-[96px]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {(meta.enumOptions ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )
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
