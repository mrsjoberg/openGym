# Brief for one reviewer: what does an exercise need to rest on?

You are one reviewer on a panel classifying exercises for a training app. You are an AI reviewer, not a
physiotherapist or trainer.

## Rules

- Read exactly two files: this brief, and the input file named in your task. Open no other file. Do not search the
  web. Never open images or video, or anything in a folder called `catalogue/media`. Do not start other agents.
- Judge by reading the text. Do not write code that decides answers. A short script only to assemble or check your
  output file is fine.

## The task

The input has `exercises`, each with a `key`, a `name`, its `equipment` (the main kit), a `description` and its
`steps`. For each, decide what it needs to sit, lie, lean, put a hand or foot on, or step onto, beyond its main kit.
The app uses this to avoid offering an exercise at a place that lacks that thing. Every place has a floor, a wall and
a sturdy chair.

Pick exactly one class:

- **none**: nothing beyond the main kit, the floor or a wall. Also when the bench or seat is part of the machine
  itself (a leg press, a seated machine row, a cable station's own seat).
- **chair**: a bench, box, chair or step is used to sit on, to put hands or a foot on for support, to hold, or to
  lean on, and a sturdy chair would do the same job. Examples: Bulgarian split squat with the back foot on a bench,
  dips with the hands on a bench, a seated dumbbell press, an incline push-up with hands on a bench.
- **flat**: she lies on (or across) a flat bench, and lying on the floor would make it a different exercise (the arms
  could not go below the body). A chair will not do. Examples: dumbbell bench press, dumbbell fly, lying triceps
  extension on a bench.
- **incline**: needs a bench set at an incline or decline, sitting or lying on it, face up or face down. Examples:
  incline dumbbell press, chest-supported incline row, decline sit-up on a decline bench.
- **box**: she steps up onto, or jumps onto, over or off, a box, step or platform. A chair is not safe for this.
  Examples: step-up, box jump, depth jump.
- **station**: needs another special piece of gym furniture: a preacher bench, a back extension or hyperextension
  bench, a Roman chair, a glute-ham developer, dip bars, a sit-up board. Not for a plain bench.
- **unclear**: the text does not let you tell, or contradicts itself (for example the name says bench and the steps
  say floor).

If an exercise could be done either way and the text says to use a bench only as an option, choose by what the
steps actually describe. Use `unclear` honestly rather than guessing.

## Output

Write the output file named in your task: one JSON object mapping EVERY `key` to `[class, quote]`. `quote` is 3 to 12
consecutive words copied exactly from that exercise's own `name`, `description` or `steps` that best support your
class. For `none`, quote the words that show where she is (for example "stand with your feet").

    {"e1234": ["flat", "lie on a flat bench"], "e1235": ["chair", "place your hands on a bench"]}

Every key in the input must be in the output, and no others. After writing, check that the file parses as JSON and
has as many keys as the input. Then reply with one line: how many of each class you gave.
