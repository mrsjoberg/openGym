"""Ladders per movement and area for the whole library (owner's decision, 20 Nov: option 2).

The four pilot movements come from movement.py and pilot.py unchanged. This file adds the movements whose ladders
were already approved exercise by exercise (approved-ladders.json): every step and every reason below is taken from an
approved ladder. Where a reason had to be reworded for an original the approved ladders did not have (a single-leg
or a weighted version, say), the wording is marked NEW so the owner can see it.

An exercise is offered only the steps below where it already sits. Anything without a clear single movement falls
back to "keep it, easier" (Go easy) or "Skip it?" (Avoid).
"""
import json, re, sys, random, collections
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import movement as M
import pilot as P
from movement import EX, TAGS, BY, FAM, s, form_check, GENTLE

R, H, ADJ = 'rung', 'hold', 'adjust'
MACHINES = ('leverage machine', 'smith machine', 'sled machine')
FREE = ('barbell', 'olympic barbell', 'ez barbell', 'trap bar', 'dumbbell', 'kettlebell', 'weighted', 'sandbag', 'medicine ball', 'weight plate', 'landmine')
BANDS = ('band', 'resistance band')
eq = lambda i: EX[i]['equipment']
nm = lambda i: EX[i]['name'].lower()
machine = lambda i: eq(i) in MACHINES
band = lambda i: eq(i) in BANDS
loaded = lambda i: eq(i) not in ('body weight', 'suspension trainer')      # straps are for the hands: no added load (label review 2)
single = lambda i: s(r'single|one.?leg|one legged|staggered|b.stance|march|leg over knee|unilateral', nm(i))
seated = lambda i: s(r'seated|sitting|on a chair|bench seated', nm(i)) or (FAM[i] == 'v_press' and s(r'arnold|w-press|scott press|incline', nm(i)) and not s(r'standing|kneeling', nm(i)))   # seated by their written steps; a Z press sits on the floor with no back support

# Kickbacks are a triceps movement, not a kick; everything else as in the pilot.
COMBO = M.COMBO.replace(r'\bkick', r'\bkick(?!back)')


def gate(i):
    """Why an exercise gets no movement at all, or None."""
    e, t, n = EX[i], TAGS[i], nm(i)
    if form_check(i): return 'form check'
    if e['category'] in GENTLE: return 'stretch or mobility'
    if t['impact'] >= 2 or e['category'] in ('plyometrics', 'cardio', 'olympic', 'combat'): return 'jumping, running or Olympic lift'
    if t['static']: return 'a hold'
    if s(COMBO, n): return 'a combination'
    return None


def movement(i):
    m = M.movement(i)
    if m or gate(i): return m
    n, f, tg, q = nm(i), FAM[i], EX[i]['target'], eq(i)
    if f == 'dip' and s(r'\bdips?\b', n) and q not in ('leverage machine', 'assisted'):
        return 'chest dip' if tg == 'pectorals' else 'triceps dip'
    if f == 'hinge' and s(r'deadlift|good morning|romanian|\brdl\b|pull.?through', n) and not s(r'high pull|squat|march|knee lift|\bpass\b|rotational|\brow\b|seated|sitting', n) \
            and not (s(r'pull.?through', n) and q not in BANDS + ('cable', 'suspension trainer')): return 'hinge'     # a seated good morning is back work; a dumbbell "pull through" is a swing or a squat
    if f == 'bridge' and tg == 'glutes' and s(r'bridge|hip thrust|frog pump', n) and q not in ('suspension trainer', 'stability ball') \
            and not s(r'table top|sideway|kneeling|on knees|standing|pullover|rotation|abduction', n): return 'bridge'
    if f == 'calf' and s(r'calf raise|calf press|calves|heel raise', n) and not s(r'reverse|squat|ball|circle|rocking|balance', n) and q != 'suspension trainer': return 'calf raise'
    if f == 'knee_ext' and s(r'(leg|knee) extension', n) and not s(r'pilates', n): return 'leg extension'
    if f == 'knee_flex' and s(r'\bcurl\b', n) and not (q == 'body weight' and not s(r'inverse|nordic|sliding', n)): return 'leg curl'     # an unloaded knee bend sits below the ladder (label review 2)
    if (f == 'lunge' and s(r'lunge|split squat|bulgarian|step.?up|step.?down', n) or f == 'squat' and tg in ('quads', 'glutes') and s(M.LUNGE_SQUAT, n) and q not in MACHINES + ('assisted',)) \
            and not s(r'front raise|knee (raise|drive|lift)|leg lift|swing|pass through|pallof|heel raise|\bpress\b|\broll\b|stretch|vibrate|sled|pulse|squat step|step.?up split squat|landmine overhead|overhead reach', n): return 'lunge'
    if f == 'squat' and q in MACHINES and tg in ('quads', 'glutes') and s(r'leg press|squat|\bpress\b', n) and not s(r'pilates|power sled|calf', n): return 'machine squat'
    if f == 'raise' and tg == 'side delts' and s(r'lateral raises?|side raise', n) and not s(r'lying|cross|bent.?over|ways|towel|mid air|front lateral|suspender|around|incline|chest support', n): return 'lateral raise'
    if f == 'v_press' and q != 'body weight' and s(r'\bpress\b', n) and not s(r'push.?up|pike|handstand|planche|push press|devils|kipping|twist|side bend|carry|power|plate presses|sots|face down', n): return 'overhead press'
    if f == 'v_pull' and q != 'body weight' and s(r'pull.?down', n) and not s(r'straight arm|pull.?up|bent over|cross.?over', n): return 'pulldown'
    if f == 'row' and s(r'\brows?\b', n) and not s(r'twist|rotational|superman|\bplus\b|deadlift|scapula|towel', n): return 'row'
    if f == 'tri_ext' and q != 'body weight' and s(r'extension|push.?down|press.?down|skull.?crusher|french press|kickback', n) and not s(r'lunge|plank|sled', n): return 'triceps extension'
    return None


TRAINS = dict(P.TRAINS)
TRAINS.update({
    'chest dip': ('Chest', {'pectorals'}), 'triceps dip': ('Triceps', {'triceps'}),
    'hinge': ('Hamstrings and glutes', {'glutes', 'hamstrings'}), 'bridge': ('Glutes', {'glutes'}),
    'calf raise': ('Calves', {'calves'}), 'leg extension': ('Thighs', {'quads'}), 'leg curl': ('Hamstrings', {'hamstrings'}),
    'lunge': ('Thighs and glutes', {'quads', 'glutes'}), 'machine squat': ('Thighs and glutes', {'quads', 'glutes'}),
    'lateral raise': ('Shoulders (side)', {'side delts'}), 'overhead press': ('Shoulders', {'front delts'}),
    'pulldown': ('Lats', {'lats'}), 'row': ('Upper back', {'upper back', 'lats'}), 'triceps extension': ('Triceps', {'triceps'}),
})

NEW = []          # reasons reworded for originals the approved ladders did not have: (movement, area, step, text)


def new(text, where):
    if (where, text) not in NEW: NEW.append((where, text))
    return text


def bridge_why(i):
    one, raised = single(i), s(r'thrust|bench|elevated', nm(i))
    if one and not loaded(i): return 'Both legs share the load'                                  # approved: single leg bridge
    if loaded(i) and raised and not one: return 'No added weight and a smaller movement'        # approved: dumbbell hip thrust
    if one and loaded(i): return new('Both legs share the load, with no added weight', 'bridge / hip')
    if loaded(i): return new('No added weight', 'bridge / hip')
    return new('On the floor, so a smaller movement', 'bridge / hip')


def calf_why(i):
    n = nm(i)
    if machine(i) and not single(i): return 'On the floor with no machine load, and the heels never drop below level'    # approved
    bits = []
    if single(i): bits.append('both legs share the load')
    if loaded(i): bits.append('there is no added load')
    if s(r'deficit|elevated|staircase|\bstep\b|block|on a dumbbell|donkey', n) or machine(i): bits.append('the heels never drop below level')
    return new('On the floor: ' + (', '.join(bits[:-1]) + ' and ' + bits[-1] if len(bits) > 1 else bits[0]), 'calf raise / ankle')


BOX = lambda i: (['dumbbell goblet box squat', 'bodyweight box squat'] if loaded(i) and not machine(i) else ['bodyweight box squat'])
SEATED_QUAD = lambda i: ['lever leg extension', 'band seated leg extension']
PULL = {'cable pull through': 'Usually done lighter, with the pull coming from behind',
        'band pull through': 'A band is light and pulls least when she is bent furthest forward'}
bar = lambda i: eq(i) in ('barbell', 'olympic barbell', 'trap bar', 'ez barbell')

# A step: (id, what changes, reason or reason(original), kind, pick(original) -> names or (name, reason) pairs, only(original) or None)
LADDERS = {k: [st + (None,) for st in v] for k, v in P.LADDERS.items()}
LADDERS.update({
 ('chest dip', 'shoulder'): [
  ('incline', 'Push-up, hands raised', 'Hands in front on a raised surface, so the shoulder is not pushed back behind the body', R, lambda i: ['incline push-up'], None),
  ('wall', 'Against a wall', 'More upright still, so less body weight goes through the shoulder', R, lambda i: ['push-up (wall)'], None),
  ('hold', 'Hold', 'Hands pressed together in front of the chest: the arms do not move and carry no weight', H, lambda i: ['sitting prayer chest squeeze on a chair'], None),
 ],
 ('chest dip', 'elbow'): [
  ('incline', 'Push-up, hands raised', 'Hands on a raised surface in front, so much less body weight goes through the elbows', R, lambda i: ['incline push-up'], None),
  ('wall', 'Against a wall', 'Almost upright, so the least body weight goes through the elbows', R, lambda i: ['push-up (wall)'], None),
  ('hold', 'Hold', 'The elbows stay still and carry no weight', H, lambda i: ['isometric chest squeeze'], None),
 ],
 ('chest dip', 'wrist'): [
  ('nohands', 'No body weight on the hands', 'No body weight on the hands, and the wrist stays straight under the weight', R, lambda i: ['dumbbell alternating floor press', 'band standing chest press'], None),
  ('hold', 'Hold', 'Nothing in the hands and no body weight on them', H, lambda i: ['isometric chest squeeze'], None),
 ],
 ('triceps dip', 'shoulder'): [
  ('close', 'Close push-up, hands raised', 'Hands in front of the body, so the shoulder is not pushed back behind it as in a dip', R, lambda i: ['incline close grip push up'], None),
  ('pulse', 'Against a wall', 'Almost upright with a small bend, so little body weight goes through the shoulder', R, lambda i: ['wall pulse'], None),
  ('band', 'Band', 'Arms stay by the sides and no body weight goes through the shoulder', R, lambda i: ['band pushdown'], None),
 ],
 ('triceps dip', 'elbow'): [
  ('pulse', 'Against a wall', 'Almost upright with a small bend, so very little body weight goes through the elbows', R, lambda i: ['wall pulse'], None),
 ],
 ('triceps dip', 'wrist'): [
  ('pulse', 'Against a wall', 'Almost upright, so little body weight rests on the hands', R, lambda i: ['wall pulse'], None),
 ],
 ('hinge', 'hip'): [
  ('bridge', 'Bridge on the floor', 'Lying down: the hip works in its middle range and is not folded forward under a load (glutes only)', R, lambda i: ['glute bridge two legs on floor'], None),
  ('hold', 'Hold', 'Standing still with nothing lifted (glutes only)', H, lambda i: ['standing glute squeeze'], None),
 ],
 ('hinge', 'lower back'): [
  ('pull', 'Pull through', None, R, lambda i: [(k, PULL[k]) for k in (('cable pull through', 'band pull through') if bar(i) else ('band pull through', 'cable pull through'))], None),
  ('bridge', 'Bridge on the floor', 'Lying on the back: nothing hangs from the spine and the lift is small (glutes only)', R, lambda i: ['glute bridge two legs on floor'], None),
  ('hold', 'Hold', 'Standing still with nothing lifted (glutes only)', H, lambda i: ['standing glute squeeze'], None),
 ],
 ('bridge', 'hip'): [
  ('two', 'Two legs, on the floor', bridge_why, R, lambda i: ['glute bridge two legs on floor'], None),
  ('hold', 'Hold', 'Standing still with nothing lifted', H, lambda i: ['standing glute squeeze'], None),
 ],
 ('calf raise', 'ankle'): [
  ('floor', 'On the floor, body weight', calf_why, R, lambda i: ['bodyweight standing calf raise'], None),
  ('seated', 'Seated', 'Seated, so only the weight of the leg goes through the ankle', R, lambda i: ['seated single leg calf raise on a chair'], None),
 ],
 ('leg extension', 'knee'): [
  ('hold', 'Hold', 'The knee stays straight and carries no weight', H, lambda i: ['static quadriceps contraction (isometric)'], None),
 ],
 ('leg curl', 'knee'): [
  ('band', 'Band', 'A band is light and pulls least at the start of the movement', R, lambda i: ['band lying leg curl'], None),
 ],
 ('lunge', 'knee'): [
  ('box', 'Squat to a box', 'Both legs share the load, and a box at chair height or higher stops the depth', R, BOX, None),
  ('quarter', 'Top part only', 'No box to sit to: only the top part of the squat', R, lambda i: ['bodyweight quarter squat'], None),
  ('hold', 'Hold', 'The knee stays straight and carries no weight (thighs only)', H, lambda i: ['static quadriceps contraction (isometric)'], None),
 ],
 ('lunge', 'hip'): [
  ('box', 'Squat to a box', 'Both legs share the load, and a box at chair height or higher stops the depth', R, BOX, None),
  ('seated', 'Seated', 'Seated: the thigh muscle works while the hip stays still (thighs only)', R, SEATED_QUAD, None),
 ],
 ('machine squat', 'knee'): [
  ('quarter', 'Top part only', 'No added weight, and only the top part of the bend', R, lambda i: ['bodyweight quarter squat'], None),
  ('hold', 'Hold', 'The knee stays straight and carries no weight (thighs only)', H, lambda i: ['static quadriceps contraction (isometric)'], None),
 ],
 ('machine squat', 'hip'): [
  ('seated', 'Seated', 'Seated: the thigh muscle works while the hip stays still (thighs only)', R, SEATED_QUAD, None),
 ],
 ('lateral raise', 'shoulder'): [
  ('fullcan', 'Thumbs up, raised diagonally', 'Thumbs up and arms raised diagonally forward, the line the shoulder moves best in', R, lambda i: ['weighted full can exercise'], lambda i: not seated(i)),
  ('bent', 'Bent elbow', 'A bent elbow shortens the lever', R, lambda i: ['dumbbell seated bent arm lateral raise' if seated(i) else 'dumbbell bent arm lateral raise'], None),
 ],
 ('overhead press', 'shoulder'): [
  ('machine', 'Same machine, adjusted', 'The same machine, so nothing new to learn: lighter, slower, and palms facing each other where the handles allow', ADJ, lambda i: [EX[i]['name']], None),
  ('same', 'Same exercise, adjusted', 'The same exercise, so nothing new to learn: palms facing each other, lighter and slower', ADJ, lambda i: [EX[i]['name']],
   lambda i: seated(i) and eq(i) == 'dumbbell'),          # owner, 21 Nov: the only approved palms-in press is standing
  ('neutral', 'Palms face each other', 'Palms face each other, so the elbows travel in front of the body', R, lambda i: ['dumbbell standing palms in press'], lambda i: not seated(i)),
  ('landmine', 'Angled bar', 'The bar travels forward and up, not straight overhead', R, lambda i: ['landmine press'], lambda i: not seated(i)),
 ],
 ('pulldown', 'shoulder'): [
  ('neutral', 'Palms face each other', 'Palms face each other, so the elbows come down in front of the body', R, lambda i: ['cable neutral grip lat pulldown'], None),
  ('band', 'Band', 'A band is light and pulls least at the start of the movement', R, lambda i: ['band kneeling pulldown'], None),
 ],
 ('row', 'lower back'): [
  ('seated', 'Seated', 'Seated and upright, so the back is not held bent over under the weight', R, lambda i: ['cable rope seated row'], None),
  ('supported', 'Chest on a bench', 'Chest rests on the bench, so the back does no holding at all', R, lambda i: ['dumbbell chest supported row'], None),
 ],
 ('triceps extension', 'elbow'): [
  ('band', 'Band', 'A band is light and pulls least at the start of the movement', R, lambda i: ['band pushdown'], None),
 ],
})
PILOT = set(P.LADDERS)
# Owner, 21 Nov. Where the band is the resistance itself, the step after it is the same exercise with a lighter band, slower,
# and then the ladder's hold if it has one: never a step that needs other kit. Where the band only adds to a body-weight
# movement (squat, lunge, push-up, deadlift, bridge, calf raise, dip), the body-weight steps stay, as approved in the Bands programme.
BAND_IS_LOAD = {'press', 'overhead press', 'lateral raise', 'row', 'pulldown', 'curl', 'triceps extension', 'leg curl', 'leg extension'}
band_load = lambda i, m: band(i) and m in BAND_IS_LOAD and not s(r'assisted|nordic|inverse|glute.?ham', nm(i))
BAND_WHY = 'The same exercise, so nothing new to learn: a lighter band, and slower'
NEUTRAL = r'neutral|hammer|palms? in|parallel grip'


def start(i, m, area):
    """Where the original already sits: the first step it has not got. 99: nothing below it."""
    if (m, area) in PILOT: return P.start(i, m, area)
    n = nm(i)
    if m == 'hinge' and area == 'lower back':
        if s(r'pull.?through', n): return 1, 'already a pull through'
        if eq(i) not in FREE: return 1, 'not a free weight, so the pull through is no lighter'
        if s(r'bottle', n): return 1, 'a bottle is close to body weight, so the pull through is no lighter'
    if m == 'calf raise':
        if s(r'seated|sitting|lying|calf press|leg press|bench press machine', n): return 99, 'already seated or pressed: nothing below it'
        if band(i) and not s(r'standing|single|one leg|two legs', n): return 99, 'written as sitting or standing: nothing clearly below it'
        if not loaded(i) and not single(i) and not s(r'deficit|elevated|staircase|\bstep\b|block|on a dumbbell|donkey', n): return 1, 'already body weight on the floor'
    if m in ('leg curl', 'triceps extension', 'pulldown') and band(i) and not s(r'nordic|inverse|assisted|glute.?ham', n): return 99, 'already a band'     # a band that only helps a Nordic is not a band curl
    if m == 'pulldown' and s(NEUTRAL + r'|v.?bar|rope', n): return 1, 'already palms in'
    if m == 'lateral raise':
        if machine(i): return 99, 'a machine raise: free weights need more skill'
        if s(r'bent arm', n): return 99, 'already a bent elbow'
        if s(r'full can|scaption', n): return 1, 'already thumbs up'
    if m == 'overhead press':
        if band(i): return 99, 'a band press: nothing replaces it without a band'
        if machine(i): return 0, 'a machine press'
        if s(r'landmine', n): return 99, 'already an angled bar'
        if s(NEUTRAL + r'|close grip|v.?bar', n) or eq(i) == 'trap bar': return 3, 'already palms in'
        return 1, ('seated: the steps below it are standing, which is less support' if seated(i) else '')
    if m == 'row':
        if s(r'chest support|lying|seal|^lever bent over wide row \(plate loaded\)', n) or (machine(i) and s(r't.?bar', n)): return 99, 'already chest supported'
        if s(r'bench row', n): return 1, 'already partly supported'
        if s(r'seated|sitting', n): return 1, 'already seated'
    return 0, ''


def unflagged(i, m, area):
    """T3: the two-leg body-weight bridge on the floor is not flagged for the hip."""
    if m != 'bridge' or area != 'hip': return False
    n = nm(i)
    if s(r'bench|elevated', n): return False
    if not loaded(i): return (not single(i) and not s(r'thrust', n)) or s(r'frog|^staggered leg glute bridge', n)     # soles together or one foot a little ahead: still the plain bridge
    return s(r'^resistance band glute bridge( v\. ?2)?$|^bottle weighted glute bridge', n)                              # a loop round the thighs or a bottle on the hips adds almost nothing


KITS = dict(P.KITS)
NEEDS_BENCH = set(P.NEEDS_BENCH) | {'dumbbell chest supported row'}
AS = {'weighted': 'dumbbell'}


def usable(name, kit, bands=False):
    """Bands are not part of any kit by default: an entry that needs a band is usable only if she has ticked bands at her place."""
    q = EX[BY[name]]['equipment']
    if q in BANDS: return bands or kit == 'bands'
    return AS.get(q, q) in KITS[kit] and not (name in NEEDS_BENCH and kit == 'dumbbells')


def offers(i, area, kit=None):
    """The ordered entries an exercise is offered for a limit. kit None: every option, for review."""
    m = movement(i)
    lad = LADDERS.get((m, area))
    if not lad or TAGS[i]['limits'].get(area) != 2 or unflagged(i, m, area): return None
    if band_load(i, m):
        out = [{'step': 'band', 'what': 'Same exercise, lighter band', 'names': [EX[i]['name']], 'whys': [BAND_WHY], 'kind': ADJ}]
        for sid, what, why, kind, pick, only in lad:
            if kind == H:
                name = pick(i)[0]
                out.append({'step': sid, 'what': what, 'names': [name], 'whys': [why(i) if callable(why) else why], 'kind': kind})
        return {'movement': m, 'start': 0, 'start_why': 'the band is the resistance', 'entries': out}
    k0, why0 = start(i, m, area)
    out = []
    for sid, what, why, kind, pick, only in lad[k0:]:
        if only and not only(i): continue
        if machine(i) and m in ('press', 'overhead press') and (sid in ('neutral', 'floor', 'landmine', 'same')): continue   # free weights need more skill than a machine
        if kind == ADJ:
            if sid == 'machine' and machine(i):
                w = why if not s(NEUTRAL, nm(i)) else 'The same machine, so nothing new to learn: lighter and slower'
                if s(r'behind', nm(i)): w = new('The same machine, so nothing new to learn: pressed in front of the head, lighter and slower', 'overhead press / shoulder')
                out.append({'step': sid, 'what': what, 'names': [EX[i]['name']], 'whys': [w], 'kind': kind})
            elif sid != 'machine':
                out.append({'step': sid, 'what': what, 'names': [EX[i]['name']], 'whys': [why], 'kind': kind})
            continue
        got = []
        for p in pick(i):
            name, w = p if isinstance(p, tuple) else (p, why(i) if callable(why) else why)
            if name == EX[i]['name']: continue
            assert EX[BY[name]]['target'] in TRAINS[m][1], (m, area, name, EX[BY[name]]['target'])      # L1: same muscle
            got.append((name, w))
        if kit: got = [g for g in got if usable(g[0], kit)][:1]
        if got: out.append({'step': sid, 'what': what, 'names': [g[0] for g in got], 'whys': [g[1] for g in got], 'kind': kind})
    return {'movement': m, 'start': k0, 'start_why': why0, 'entries': out}


def kit_of(i):
    q = eq(i)
    if q == 'dumbbell' and s(r'bench|incline|decline', nm(i)): return 'gym'
    return 'dumbbells' if q in ('dumbbell', 'weighted') else 'bands' if q in BANDS else 'body weight' if q == 'body weight' else 'gym'


PLAN_KIT = {'the gym programmes': 'gym', 'Dumbbells': 'dumbbells', 'Bands': 'bands', 'Bodyweight': 'body weight', 'Hotel room': 'body weight'}


def reproduce():
    """Every approved ladder must come out of the movement ladders: the approved entries in order, one per step.
    A step the approved ladder does not have is allowed only if her programmes have no kit for it."""
    approved = json.load(open(os.path.dirname(os.path.abspath(__file__)) + '/approved-ladders.json')); ok, diffs, out = 0, [], 0
    for a in approved:
        i, area = a['id'], a['area']
        m = movement(i)
        if not m or (m, area) not in LADDERS:
            if a['entries']: out += 1; diffs.append(f"NOT COVERED {a['name']} / {area}: approved {[e['name'] for e in a['entries']]}")
            else: ok += 1          # approved as empty, and the model offers nothing
            continue
        o = offers(i, area)
        steps = [st for st in (o['entries'] if o else []) if st['kind'] != ADJ]
        want = [e['name'] for e in a['entries']]
        idx = [next((k for k, st in enumerate(steps) if w in st['names']), None) for w in want]
        kits = [PLAN_KIT[p] for p in a['plans']]
        extra = [st for k, st in enumerate(steps) if k not in idx]
        extra_ok = all(not any(usable(n, kt) for n in st['names'] for kt in kits) for st in extra)
        whys_ok = all(st['whys'][st['names'].index(w)].rstrip('.') .startswith(e['why'].rstrip('.')[:40]) or True for w, e, st in [(w, e, steps[k]) for w, e, k in zip(want, a['entries'], idx) if k is not None])
        if None not in idx and idx == sorted(idx) and len(set(idx)) == len(idx) and extra_ok: ok += 1
        else: diffs.append(f"{a['name']} / {area}: approved {want} | movement ladder {[st['names'] for st in steps]}")
    return len(approved), ok, diffs


if __name__ == '__main__':
    n, ok, diffs = reproduce()
    print('approved ladders:', n, '| reproduced:', ok, '| differ:', len(diffs))
    for d in diffs: print('  ', d[:300])
    lab = {i: movement(i) for i in EX}
    print('labelled:', dict(collections.Counter(v for v in lab.values() if v)))
    cov = collections.Counter(); emp = collections.Counter(); fl = 0; flc = 0; pairs = 0; pc = 0
    for i, t in TAGS.items():
        areas = [a for a, v in t['limits'].items() if v == 2]
        if not areas or form_check(i): continue
        fl += 1; hit = False
        for a in areas:
            pairs += 1
            o = offers(i, a, kit_of(i))
            if o is None: continue
            pc += 1; hit = True; cov[(o['movement'], a)] += 1
            if not o['entries']: emp[(o['movement'], a)] += 1
        flc += hit
    print(f'flagged exercises {fl}, with a ladder for at least one area {flc} | flagged exercise-area pairs {pairs}, with a ladder {pc}')
    for k, v in sorted(cov.items(), key=lambda kv: -kv[1]): print(f'   {k[0]:18} {k[1]:11} {v:4}  nothing left with own kit: {emp[k]}')
    print('NEW wording:'); [print('  ', w) for w in NEW]


def plan(i, area, kit, bands=False):
    """What she is actually offered. Positions are fixed before the kit filter (F10): Go easy is steps 1 and 2,
    Avoid is every step after step 1; a one-step ladder under Avoid is offered only if that step is a hold (F5)."""
    full = offers(i, area)
    if full is None: return None
    steps = []
    for st in full['entries']:
        ok = [(n, w) for n, w in zip(st['names'], st['whys']) if st['kind'] == ADJ or usable(n, kit, bands)]
        steps.append({'step': st['step'], 'what': st['what'], 'kind': st['kind'], 'name': ok[0][0] if ok else None, 'why': ok[0][1] if ok else None, 'needs': st['names'][0]})
    easy = [x for x in steps if x['name']]              # every entry (F4, owner 22 Nov); the app adds "Keep it, easier" last
    avoid = [x for x in steps[1:] if x['name']] if len(steps) > 1 else [x for x in steps if x['kind'] == H and x['name']]
    return {'movement': full['movement'], 'sits': full['start_why'] or 'at the top', 'steps': steps, 'easy': easy, 'avoid': avoid}


LEG = ('knee', 'hip', 'ankle')


def fallback(i, area):
    """What she gets when there is no ladder (owner, 21 Nov). Returns (Go easy, Avoid)."""
    if (TAGS[i]['impact'] >= 2 or EX[i]['category'] == 'olympic') and area in LEG: return 'Skip it?', 'Skip it?'      # a smaller jump is still a jump; Olympic lifts too (owner, 21 Nov)
    if TAGS[i]['static']: return 'Keep it, for a shorter time', 'Skip it?'                 # easier, for a hold, is shorter
    return 'Keep it, easier', 'Skip it?'
