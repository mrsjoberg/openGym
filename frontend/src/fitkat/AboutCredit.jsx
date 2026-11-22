// The line at the foot of Settings, About. FitKat is a modified openGym: the licence (AGPL) expects
// the source of what is running to be on offer, so "Source code" goes to FitKat's own branch, and
// openGym is credited and linked beside it. A component of its own so that openGym's page keeps
// its three links where its tap-target test looks for them.
import { t } from '../lib/i18n.js'
import { ft } from './strings.js'

export default function AboutCredit({ version }) {
  return <>
    FitKat · {ft('built on openGym v{0}', version)} · {t('free & open source (AGPL v3)')}<br />
    <a href="https://github.com/mrsjoberg/openGym/tree/fitkat" target="_blank" rel="noopener"><span>{t('Source code')}</span></a><br />
    <a href="https://github.com/DuarteSantos8/openGym" target="_blank" rel="noopener"><span>openGym</span></a><br />
  </>
}
