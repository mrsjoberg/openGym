# FitKat limits: the rules as they stand (20 November, after the second review)

A user can tell the app that a joint or tendon area is a problem: neck, shoulder, elbow, wrist or hand, lower back, hip, knee, ankle or foot. This is a "limit". The app does not know the diagnosis. Programme exercises that load the area are "flagged" and get a ladder of replacements. She approves or rejects each offer.

## How it flows

F1. Limits are set in onboarding and changed only in Settings.
F2. Each limit is "Go easy" or "Avoid".
F3. A ladder is one ordered list. If it has a hold, the hold is the last entry.
F4. Go easy offers entries 1 and 2, then "Skip it?".
F5. Avoid offers the entries after entry 1, in order, then "Skip it?". A one-entry ladder goes straight to "Skip it?", unless that entry is a hold with a valid reason.
F6. Avoid asks whether a doctor, physio or surgeon told her to rest it. If yes, no ladder is consulted, and the answer goes by a second opinion as well as the rules (readings.json: every strength and body-weight exercise read one by one by an AI reviewer). An exercise the rules flag for that area, or a reading calls loaded there, is skipped. An exercise the rules or a reading say only involves the area is not removed: she is asked "Keep or skip?", and it stays in until she answers. Go easy, and Avoid without an order to rest, stay on the rules alone, so the approved ladders behave as approved (owner, 21 and 22 Nov).
F7. "Keep it, easier" is offered under Go easy whenever nothing is left to offer, whether the ladder is empty or everything in it was filtered out. Easier means lighter where she sets the weight or band, and slower with a smaller movement where it is body weight. For a hold, easier means a shorter time (owner, 21 Nov).
F11. Jumping and running (moderate and high impact) and Olympic lifts with a knee, hip or ankle limit get "Skip it?" under Go easy as well: a smaller jump is still a jump (owner, 21 Nov).
F8. An accepted Go easy exercise is done at a slow tempo and keeps progressing, slowly. A short mobility block for the area is added.
F9. On a day she reports soreness in the daily check-in, the sore-day rule wins for that day: eased, and out of progression.
F10. When an exercise is both flagged and unavailable at her place, the limit's ladder comes first and entries she has no kit for are passed over. Positions are fixed before filtering, so Avoid never falls back to entry 1.

## How a ladder is built

L1. Same muscle. Every entry trains what the original trains. The trained muscle is set by hand for each programme exercise. An entry that covers only part of it says so.
L2. A reason per step. Every entry says why it asks less of the joint than the entry before it (entry 1: than the original). No reason, no entry.
L3. A hold is judged like any entry. Being static is not a reason.
L4. "Lighter" alone is not an entry where she sets the weight herself. Band entries are an exception (owner's decision).
L5. Kit is a set, not a level: what she has at the place she trains. An entry is usable only if its kit is in that set. A band entry is usable only if she has ticked bands at that place, in a gym or anywhere (owner, 21 Nov). Entries needing more are passed over.
L6. Same session. A replacement cannot be an exercise already in that session or already given as a replacement in it; the next entry is taken.
L7. Other limits. An entry flagged for one of her other limits is never offered.
L8. Not harder overall. No entry that needs more balance, more skill or less support than the original. Seated or lying one-sided work is allowed.
L9. Ladders agree. In one area, the same entry is always followed by the same entries, kit aside.
L10. A hold is counted in seconds. A replacement never inherits the original's weight; it starts light.

## Tags

T1. Tags decide only whether an exercise is flagged. The ladder order decides what is easier.
T2. Moderate and high impact count as loading the knee, hip and ankle.
T3. The two-leg glute bridge is not flagged for the hip (both reviews).

## Ladders per movement (owner, 20 and 21 Nov)

M1. Ladders are written per movement and limit; any library exercise of that movement inherits them. An exercise is offered only the steps below where it already sits.
M2. A movement is read from the exercise's name and must contain the movement's own word. Form checks, jumping, running, Olympic lifts, combinations and holds get no movement.
M3. No movement or no ladder: Go easy gives "keep it, easier", Avoid gives "Skip it?".
M4. A machine press (chest or overhead) first keeps the same machine: lighter, slower, palms facing each other where the handles allow. It skips the free-weight steps. Under Avoid a machine chest press goes straight to the wall push-up.
M5. A seated dumbbell overhead press first keeps the same exercise: palms facing each other, lighter and slower.
M6. Band exercises (owner, 21 Nov). Where the band is the resistance itself (press, overhead press, lateral raise, row, pulldown, curl, triceps extension, leg curl, leg extension), step 1 keeps the exercise with a lighter band, slower, and step 2 is the ladder's hold if it has one. It is never offered a step that needs other kit. Where the band only adds to a body-weight movement (squat, lunge, push-up, deadlift, bridge, calf raise, dip), the body-weight steps stay, as approved in the Bands programme.
M7. New ladders are written only where an approved ladder exists. Groups without one stay on M3 unless they need a different logic.
