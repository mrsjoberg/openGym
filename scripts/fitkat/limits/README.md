# FitKat: injuries and limits, the data behind them

These scripts write `frontend/src/fitkat/limits-data.js`: which exercises load which joint, and the
ladder of gentler versions each is offered when she has a limit there. The app reads that file in
`frontend/src/fitkat/limits.js`. Nothing here runs in the app.

```
python3 scripts/fitkat/limits/moves.py                                        # the checks, see below
python3 scripts/fitkat/limits/export.py frontend/src/fitkat/limits-data.js   # the data file
```

Run both after a catalogue update. They read the text of `catalogue/exercises/*.json` only, never
the media.

- `tag.py`: draft tags for every exercise, by rule, from its target muscle, category, equipment and
  name: which areas it loads, impact, holds.
- `ladder.py`: the movement family of each exercise.
- `movement.py`, `pilot.py`, `moves.py`: the movement an exercise is (read from its name) and the
  ladders, one per movement and area. An exercise is offered only the steps below where it already
  sits. `moves.py` also holds the fallbacks for exercises with no ladder.
- `approved-ladders.json`: the 58 ladders the owner approved exercise by exercise for the built-in
  programmes. `moves.py` checks that the movement ladders still reproduce every one of them.
- `rules.md`: the rules the ladders and the app follow.
- `readings.json`: a second opinion. Every strength and body-weight exercise (3,886) read one by one by
  an AI reviewer from its name and written steps: the areas it loads, a bar, the areas it only involves,
  as area letters (n neck, s shoulder, e elbow, w wrist, b lower back, h hip, k knee, a ankle). The app uses
  it for an area she was told to rest and for what may be added to a session, never for a ladder. Two
  readers of the same 738 exercises agreed on 94% of exercise-and-area judgements and listed exactly the
  same areas for 63% of exercises, so it is an opinion, not a measurement.
- `fill-pool.json`: the ids of about 300 well-known exercises that "Build your own" suggests from.
  Five were taken out on 22 Nov because their written steps contradict their name (cable bench press
  0151, cable incline bench press 0169, dumbbell hammer curl 0313, deep push up 1274, Korean dips 3288);
  they can go back once the text is corrected.
- `export.py`: writes the data file.

What this is not: the tags behind the ladders are rule-derived. The readings were made by AI reviewers,
not by a person. The reasons beside each step are coaching convention, checked by AI reviewers against
the catalogue's written steps.
No physiotherapist has verified them.
