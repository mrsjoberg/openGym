# Stand-ins for an exercise her place has no kit for

`frontend/src/fitkat/swap-data.js` is generated here. Do not edit it by hand.

    python3 scripts/fitkat/swaps/export.py            # writes it
    python3 scripts/fitkat/swaps/export.py --check    # fails when it is out of date

It needs `scripts/fitkat/limits/tags.json` (see that folder's README), since the movement rules live there.

## Why

Until 22 November the app picked a stand-in by the words two names share and by the catalogue's helper-muscle
fields. A cable triceps pushdown was offered a lying triceps extension where a dumbbell kickback is the natural
choice: "pushdown" and "kickback" share no word, and the catalogue files both the pushdown and that extension
under "forearms". The owner asked for the cause and for a fix in two parts.

## What is in the file

- `MOVE`: the movement of an exercise, read from its name by the rules the limits ladders use
  (`../limits/moves.py`). The same movement comes before the same muscle alone.
- `POS`: for a triceps extension, where the upper arm is: by the side, overhead, or lying. Read from the name,
  then from the written steps. No other movement has a position yet.
- `PICKS`: reviewed first choices for the 45 exercises of the built-in programmes, from `picks.json`.

## How the picks were reviewed

For each programme exercise a pool of candidates was drawn across every kind of kit (bar, dumbbell, kettlebell,
cable, machine, band, body weight). Four AI model types (Haiku, Sonnet, Opus, Fable) graded every pair blind,
from the catalogue text alone: no pictures, no ids, a different order for each. A is a close stand-in a trainer
would offer first, B acceptable, C not a stand-in. Each grade had to quote the candidate's own text, and a script
checked every quote. Control pairs with a known answer and repeated pairs were mixed in.

A candidate is a pick only where all four said A (213 of 1,070 pairs, for 40 of the 45 exercises). What all four
called C (75 pairs) is never offered for that exercise. All four said B for 436. The other 345 pairs, where they
did not agree, are in `council.json` and change nothing; 4 of them split between A and C. The reviewers' brief is
`council-brief.md`.

Checks on the run: every one of the 4,592 answers quoted its candidate's text verbatim; all 96 control pairs with
an unrelated exercise were graded C; 30 of 32 controls with the same lift on other kit were graded A (two B); all
216 repeated pairs got the same grade twice.

Known limits: the catalogue does not say when an exercise needs a bench or a box, so a pick can still be offered
at a place without one. The five programme exercises with no unanimous pick (band pull apart, dips between chairs,
front plank, pike push up, side plank) and every exercise outside the built-in programmes go by the general rule.

The reviewers are AI models, not a physiotherapist or a trainer.
