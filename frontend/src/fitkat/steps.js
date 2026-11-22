// Written steps corrected where the catalogue's contradict the exercise.
//
// For these exercises the catalogue's steps describe something other than the name, the
// description and the animation show (a "cable bench press" told standing, a hammer curl with the
// palms turned forward). The owner watched each animation (22 Nov) and said what it shows; the
// steps below were then written by Claude to match. They are plain descriptions of the movement,
// not coaching advice, and no physiotherapist has checked them.
//
// The catalogue itself is left as openGym ships it, so its updates still merge; the same list was
// passed on for openGym's author. Shown in every language until someone writes a translation:
// a right English text beats a wrong translated one.
import { overlayOn } from './brand.js'

export const STEPS = {
  // cable bench press: lying on a bench
  '0151': [
    'Place a flat bench midway between the two cable columns and take a handle in each hand.',
    'Lie back on the bench with your feet flat on the floor and the handles beside your chest.',
    'Press the handles up until your arms are straight.',
    'Lower them slowly until your hands are level with your chest.',
    'Repeat for the planned number of reps.',
  ],
  // cable incline bench press: on an incline bench, facing away from the machine
  '0169': [
    'Set a bench to an incline in front of the cable machine, with its back to the machine.',
    'Sit back against the pad, facing away from the machine, with a handle in each hand beside your chest.',
    'Press the handles up and forward until your arms are straight.',
    'Bring them back slowly to your chest.',
    'Repeat for the planned number of reps.',
  ],
  // dumbbell hammer curl: palms face each other the whole way
  '0313': [
    'Stand tall with a dumbbell in each hand, arms by your sides and palms facing each other.',
    'Keep your elbows close to your body and your upper arms still.',
    'Curl the weights up toward your shoulders, palms still facing each other.',
    'Pause briefly at the top, then lower slowly to the start.',
    'Repeat for the planned number of reps.',
  ],
  // deep push up: hands on dumbbells
  '1274': [
    'Place two dumbbells that will not roll on the floor, a little wider than your shoulders, and grip one in each hand.',
    'Step back until your body is straight from head to heels, arms straight.',
    'Lower your chest between the dumbbells, lower than the floor would allow, only as far as is comfortable for your shoulders.',
    'Press back up until your arms are straight.',
    'Repeat for the planned number of reps.',
  ],
  // korean dips: on one bar, behind the body
  '3288': [
    'Support yourself on a single bar with the bar behind your body, hands gripping it beside your hips and arms straight.',
    'Lower yourself slowly by bending your elbows, keeping the bar behind you.',
    'Go only as far as is comfortable for your shoulders.',
    'Press back up until your arms are straight.',
    'Repeat for the planned number of reps.',
  ],
  // isometric chest squeeze: palms pressed together in front of the chest
  '1297': [
    'Stand or sit tall and bring your palms together in front of your chest.',
    'Press your palms firmly into each other until you feel your chest tighten.',
    'Hold the squeeze for the planned time, breathing normally.',
    'Release, rest, and repeat.',
  ],
  // dumbbell palms in incline bench press: palms face each other
  '1623': [
    'Set a bench to an incline and sit back against it with your feet flat on the floor.',
    'Hold a dumbbell in each hand above your chest, arms straight and palms facing each other.',
    'Lower the dumbbells slowly toward your shoulders, keeping your elbows close to your body.',
    'Press them back up until your arms are straight.',
    'Repeat for the planned number of reps.',
  ],
}

/** FitKat's own steps for an exercise, or null: outside FitKat the catalogue's stand. */
export const correctedSteps = id => (overlayOn() && STEPS[id]) || null
