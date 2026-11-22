// FitKat is written for women. Where she has not said otherwise, the muscle map, the exercise
// drawings and the strength table are the female ones. Set once, when the first-run setup ends;
// all three stay hers to change (Settings, Look & Home; "About you" beside the strength levels).

/** Mutates `s`: female figure and strength table, unless she has already said which she is. */
export function womenDefaults(s) {
  if (s.sex === 'female' || s.sex === 'male') return s
  s.sex = 'female'
  s.body = 'female'
  return s
}
