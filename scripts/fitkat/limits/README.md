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
- `export.py`: writes the data file.

What this is not: the tags are rule-derived and were not reviewed one by one. The reasons beside
each step are coaching convention, checked by AI reviewers against the catalogue's written steps.
No physiotherapist has verified them.
