// FitKat's own tour (owner, 22 Nov): eight short stops on Home, in the order of a first day.
//
// openGym's tour (lib/tour.js STEPS) explains none of what FitKat added and mentions things FitKat
// hid, so under FitKat the tour runs these stops instead, in openGym's own tour engine
// (components/Tour.jsx): a spotlight on a real element, a small card, Back and Next. Nothing here
// leaves Home, starts a workout or changes her data. The workout is one card, not a practice run.
//
//   fk-today     what Home opens on
//   fk-tags      the labels on today's exercises
//   fk-place     the place menu, and that changing place asks first
//   fk-start     Start: a session's questions the first time (due.js), and the check-in every time
//   fk-workout   a workout in one card
//   fk-limit     the label under an exercise changed for a limit (only when she set a limit)
//   fk-progress  the Progress tab: bone and balance
//   fk-gear      Settings: places, limits, and the tour again
//
// `soft` (read by Tour.jsx): the element may not be there today (no exercise list on a rest day,
// no place menu before a place exists). The card then speaks from the middle at once instead of
// waiting for it, so the words must make sense without the spotlight.
import { ft } from './strings.js'
import { limitsOf } from './limits.js'

export const FK_STEPS = [
  { id: 'fk-today', route: '/home', anchor: 'fk-today', soft: true },
  { id: 'fk-tags', route: '/home', anchor: 'fk-tags', soft: true },
  { id: 'fk-place', route: '/home', anchor: 'fk-place', soft: true },
  { id: 'fk-start', route: '/home', anchor: 'today', soft: true },
  { id: 'fk-workout', route: '/home', anchor: null },
  { id: 'fk-limit', route: '/home', anchor: null, when: c => c.limits },
  { id: 'fk-progress', route: '/home', anchor: 'tab-stats', soft: true },
  { id: 'fk-gear', route: '/home', anchor: 'settings-gear', soft: true },
]

/** What decides which stops this profile gets (merged into Tour.jsx's profile). */
export const fitkatProfile = S => ({ limits: limitsOf(S).length > 0 })

// What each stop says: [title, body]. The comfort wording in fk-limit is the workout's own line
// and, like it, waits for a physiotherapist's check.
export const FK_COPY = {
  'fk-today': () => [ft('Today, first'), ft('Home opens on today: what you train, where, and about how long it takes. On a rest day it says so and shows what comes next.')],
  'fk-tags': () => [ft('The small labels'), ft('On a training day every exercise is listed as you will do it at this place. A label says what changed: Go easy or Avoid for a limit you set, Swapped when the place lacks the equipment, Mobility for a short warm-up, Sore area for something you said is sore today.')],
  'fk-place': () => [ft('Where you train'), ft('Training somewhere else today? Change the place here. If the session needs other equipment there, FitKat asks before it changes anything.')],
  'fk-start': () => [ft('Start, and one question'), ft('The first time you start a session, FitKat asks about any exercise it would change for you. Then, every time, one question: is anything off today? Say what is, and it offers an easier session.')],
  'fk-workout': () => [ft('In a workout'), ft('Each row is a set: the weight, then the reps. Tick a set when it is done and the rest clock starts by itself. Next moves to the following exercise, and Finish saves the session.')],
  'fk-limit': () => [ft('With a limit'), ft('An exercise changed for a limit keeps its label in the workout. A mild ache that has settled by tomorrow is fine. Sharper than that, stop that exercise. "Skip it today" takes it out of this session only.')],
  'fk-progress': () => [ft('Progress'), ft('Bone and balance are behind this tab: four weekly counts for strength, impact, balance and posture. They fill up from the sessions you log.')],
  'fk-gear': () => [ft('The gear'), ft('Your places and their equipment, your injuries and limits, and this tour again are all in Settings.')],
}

/** The line under "Want a 1-minute tour?" (the question itself is openGym's, already translated). */
export const fitkatOfferLine = () => ft('A few short stops on your own screens. You can stop at any time.')
