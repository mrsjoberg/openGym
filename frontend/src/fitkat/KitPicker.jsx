// The equipment picker: a preset to start from, then chips grouped the way people think about kit.
// Used in onboarding and in Places and equipment. It owns nothing: the list comes in, the changed
// list goes out.
import { ft } from './strings.js'
import Icon from '../components/Icon.jsx'
import { KIT_GROUPS, PRESETS, PRESET_LABEL, presetOf, hasChip, toggleChip } from './places.js'

export default function KitPicker({ equipment, onChange }) {
  const preset = presetOf(equipment)
  return <div className="fk-kit">
    <div className="fk-tabs" role="group" aria-label={ft('Start from a preset, then tick anything else you have.')}>
      {Object.keys(PRESETS).map(k => (
        <button key={k} type="button" className={'fk-tab' + (preset === k ? ' on' : '')} aria-pressed={preset === k}
          onClick={() => onChange(PRESETS[k]())}>{ft(PRESET_LABEL[k])}</button>
      ))}
    </div>
    {KIT_GROUPS.map(g => (
      <div key={g.title} className="fk-kit-group">
        <h4 className="sec">{ft(g.title)}</h4>
        <div className="fk-kit-grid">
          {g.chips.map(c => {
            const on = hasChip(equipment, c)
            return <button key={c.id} type="button" className={'fk-kit-chip' + (on ? ' on' : '')} aria-pressed={on}
              onClick={() => onChange(toggleChip(equipment, c))}>
              {on && <Icon name="check" />}<span>{ft(c.label)}</span>
            </button>
          })}
        </div>
      </div>
    ))}
  </div>
}
