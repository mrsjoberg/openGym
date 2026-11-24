# What an exercise needs to sit, lie, lean or step on

`frontend/src/fitkat/needs-data.js` is generated here. Do not edit it by hand.

    python3 scripts/fitkat/bench/export.py            # writes it
    python3 scripts/fitkat/bench/export.py --check    # fails when it is out of date

## Why

openGym decides whether an exercise needs a bench from its name: "bench" in it means a flat bench, "incline" or
"decline" an adjustable one (`frontend/src/lib/equipment.js`, `accessoriesOf`). That hid exercises a chair does
just as well (bench dips, a hip thrust against a bench) and let through presses whose names do not say they are
done lying on a bench ("dumbbell larsen press", which a place with no bench was offered for a bench press). The
owner pointed out that a chair or a box often does the job, for stability (a Bulgarian split squat) or to hold
on to (dips), and asked for each exercise to be checked.

## The classes (`needs.json`)

| Class | Meaning | Where the app offers it |
|---|---|---|
| none | nothing beyond its own kit (a machine's own seat counts as its kit) | anywhere its kit is |
| chair | a chair, box, step or bench to sit, lean, put a hand or foot on, or hold | anywhere: every place has a chair |
| flat | lying on a flat bench, where the floor would make it another exercise | "Flat bench" ticked |
| incline | an incline or decline bench | "Adjustable bench" ticked |
| box | a box or step to stand, step or jump on, where a chair is not safe | "Box or step" ticked (a new option, on in the gym preset) |
| station | other gym furniture: preacher or back-extension bench, glute-ham, dip bars, strongman kit | "Weight machines" ticked, which stands for a gym |

Whatever else the name asks for, a pull-up bar, is kept. Exercises not in `needs.json` keep openGym's reading.

## How it was decided

The 1,362 strength and body-weight exercises whose name, description or steps mention a bench, box, chair, step,
platform, incline, decline, seat, sofa, bed or table were read by four AI model types (Haiku, Sonnet, Opus, Fable),
blind and in a different order each, from the catalogue text alone (`review-brief.md`). Each answer quoted the
text it rested on, and a script checked every quote. Known controls and repeated items were mixed in.

- All 5,676 answers quoted their text verbatim; all 108 control answers were right; all 120 repeats got the same
  answer twice.
- All four agreed on 1,261 exercises (`how` is `text`).
- For the other 101, where they disagreed or called the text unclear, the class was decided from the exercise's
  180 px animation in the repository (`how` is `animation`), viewed once in a working session and not kept,
  copied or published. The owner took legal advice that this use of the media, to classify the exercise and
  nothing else, is acceptable (24 November 2026). Only 43 of the 101 matched the reviewers' most common answer.

Result: none 527, chair 322, incline 185, flat 171, box 86, station 71.

The reviewers are AI models, not a physiotherapist or a trainer.
