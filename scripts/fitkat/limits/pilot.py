"""Pilot ladders per movement and area, the offers they give any library exercise, and the two checks:
they must reproduce the ladders already approved, and a random sample must read right."""
import json, re, sys, random, collections
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from movement import movement, EX, TAGS, BY, s
R, H = 'rung', 'hold'
GYM = {'barbell', 'ez barbell', 'dumbbell', 'cable', 'leverage machine', 'sled machine', 'smith machine', 'body weight', 'weight plate', 'bench'}
KITS = {'gym': GYM, 'dumbbells': {'dumbbell', 'body weight'}, 'bands': {'band', 'resistance band', 'body weight'}, 'body weight': {'body weight'}}
NEEDS_BENCH = {'dumbbell neutral grip bench press', 'dumbbell palms in incline bench press'}
TRAINS = {'press': ('Chest and triceps', {'pectorals', 'triceps'}), 'push-up': ('Chest', {'pectorals'}), 'squat': ('Thighs and glutes', {'quads', 'glutes'}), 'curl': ('Biceps', {'biceps'})}
loaded = lambda i: EX[i]['equipment'] not in ('body weight',)
machine = lambda i: EX[i]['equipment'] in ('leverage machine', 'smith machine', 'sled machine')
band = lambda i: EX[i]['equipment'] in ('band', 'resistance band')

# A step: (id, what changes, reason against everything above it, kind, pick(original) -> [exercise names in order of preference])
LADDERS = {
 ('press', 'shoulder'): [
  ('machine', 'Same machine, adjusted', 'The same machine, so nothing new to learn: lighter, slower, and palms facing each other where the handles allow', 'adjust', lambda i: [EX[i]['name']]),
  ('neutral', 'Palms face each other', 'Palms face each other and the elbows stay close to the body', R, lambda i: ['dumbbell palms in incline bench press' if s(r'incline', EX[i]['name']) else 'dumbbell neutral grip bench press']),
  ('floor', 'Pressed from the floor', 'The floor stops the elbows, so the shoulder never reaches the deep position', R, lambda i: ['dumbbell alternating floor press']),
  ('wall', 'Push-up against a wall', 'Almost upright, so little weight goes through the shoulder', R, lambda i: ['push-up (wall)']),
  ('hold', 'Hold', 'Hands pressed together in front of the chest: the arms do not move and carry no weight', H, lambda i: ['sitting prayer chest squeeze on a chair']),
 ],
 ('push-up', 'shoulder'): [
  ('incline', 'Hands raised', 'Hands raised, so less body weight goes through the arms', R, lambda i: ['incline push-up']),
  ('wall', 'Against a wall', 'More upright still, so less body weight goes through the shoulder', R, lambda i: ['push-up (wall)']),
  ('hold', 'Hold', 'Hands pressed together in front of the chest: the arms do not move and carry no weight', H, lambda i: ['sitting prayer chest squeeze on a chair']),
 ],
 ('push-up', 'wrist'): [
  ('wall', 'Against a wall', 'Almost upright, so little body weight rests on the hands', R, lambda i: ['push-up (wall)']),
  ('nohands', 'No body weight on the hands', 'No body weight on the hands, and the wrist stays straight', R, lambda i: ['dumbbell alternating floor press', 'band standing chest press']),
  ('hold', 'Hold', 'Nothing in the hands and no body weight on them', H, lambda i: ['isometric chest squeeze']),
 ],
 ('squat', 'knee'): [
  ('box', 'Squat to a box', 'A box at chair height or higher stops the squat before the deep part', R, lambda i: ['dumbbell goblet box squat', 'bodyweight box squat'] if loaded(i) else ['bodyweight box squat']),
  ('quarter', 'Top part only', 'No box to sit to: only the top part of the squat', R, lambda i: ['bodyweight quarter squat']),
  ('hold', 'Hold', 'The knee stays straight and carries no weight (thighs only)', H, lambda i: ['static quadriceps contraction (isometric)']),
 ],
 ('squat', 'hip'): [
  ('box', 'Squat to a box', 'A box at chair height or higher stops the squat before the deep part', R, lambda i: ['dumbbell goblet box squat', 'bodyweight box squat'] if loaded(i) else ['bodyweight box squat']),
  ('seated', 'Seated', 'Seated: the thigh muscle works while the hip stays still (thighs only)', R, lambda i: ['lever leg extension', 'band seated leg extension']),
 ],
 ('curl', 'elbow'): [
  ('angled', 'Angled bar', 'The angled bar takes some twist off the wrist and elbow', R, lambda i: ['ez barbell curl']),
  ('band', 'Band', 'A band is light and pulls least at the start, when the elbow is straight', R, lambda i: ['band hammer curl'] if s(r'hammer|neutral', EX[i]['name']) else ['band biceps curl']),
 ],
}

def start(i, m, area):
    """Where the original already sits: the first step it has not got. Returns (index, why)."""
    n, e = EX[i]['name'], EX[i]
    if m == 'press':
        if band(i): return 99, 'a band press: nothing replaces it without a band'
        if machine(i): return 0, 'a machine press'
        if s(r'floor|^bottle weighted lying chest press', n): return 3, 'already pressed from the floor'
        if s(r'neutral|hammer|palms?.in|parallel grip', n): return 2, 'already palms in'
        return 1, ''
    if m == 'push-up':
        # label review, 20 Nov: "decline ... against wall" has the feet up the wall; "knee" alone can be a knee drive; "modified" is not easier
        kneel = s(r'kneeling|on knees|knee push|child pose', n)
        if s(r'\bwall\b', n) and not s(r'decline', n): return (2 if area == 'shoulder' else 1), 'already against a wall'
        if area == 'shoulder' and (kneel or (s(r'incline|elevated push', n) and not s(r'decline', n))) and not s(r'single arm|one arm', n): return 1, 'already an easier angle'
    if m == 'squat':
        if s(r'single.?leg|one.?leg|pistol', n): return 0, ''          # on one leg: a two-leg box squat is still a step down
        if s(r'quarter|half squat|partial', n): return 2, 'already the top part only'
        if s(r'\bbox\b|\bbench\b|chair|sit.to.stand|stand.?up|^sit squat', n): return 1, 'already to a box'
    if m == 'curl':
        if band(i): return 2, 'already a band'
        if e['equipment'] not in ('barbell', 'olympic barbell', 'smith machine') or s(r'\bez\b', n): return 1, 'not a straight bar'
    return 0, ''

def usable(name, kit):
    eq = EX[BY[name]]['equipment']
    return eq in KITS[kit] and not (name in NEEDS_BENCH and kit == 'dumbbells')

def offers(i, area, kit=None):
    """The ordered entries an exercise is offered. kit None: every option, for review."""
    m = movement(i)
    lad = LADDERS.get((m, area))
    if not lad or TAGS[i]['limits'].get(area) != 2: return None
    k0, why0 = start(i, m, area)
    out = []
    for sid, what, why, kind, pick in lad[k0:]:
        if m == 'press' and machine(i) and sid in ('neutral', 'floor'): continue      # free weights need more skill than a machine
        if kind == 'adjust':
            if machine(i): out.append({'step': sid, 'names': [EX[i]['name']], 'why': why if not s(r'neutral|hammer|parallel', EX[i]['name']) else 'The same machine, so nothing new to learn: lighter and slower', 'kind': kind})
            continue
        names = [n for n in pick(i) if n != EX[i]['name'] and EX[BY[n]]['target'] in TRAINS[m][1]]
        if kit: names = [n for n in names if usable(n, kit)][:1]
        if names: out.append({'step': sid, 'names': names, 'why': why, 'kind': kind})
    return {'movement': m, 'start': k0, 'start_why': why0, 'entries': out}

def kit_of(i):
    eq = EX[i]['equipment']
    if eq == 'dumbbell' and s(r'bench|incline|decline', EX[i]['name']): return 'gym'     # she has a bench
    return 'dumbbells' if eq in ('dumbbell',) else 'bands' if eq in ('band', 'resistance band') else 'body weight' if eq == 'body weight' else 'gym'

if __name__ == '__main__':
    cap = lambda x: x[:1].upper() + x[1:] if x else x
    # ---- check 1: reproduce the approved ladders
    approved = json.load(open('ladders7.json')); ok = bad = 0; diffs = []
    for a in approved:
        i, area = a['id'], a['area']
        o = offers(i, area)
        if o is None: continue
        want = [e['name'] for e in a['entries']]
        got_steps = o['entries']
        # every approved entry must be an option of an offered step, in order, and no offered step may be missing
        idx = []
        for w in want:
            hit = [k for k, st in enumerate(got_steps) if w in st['names']]
            idx.append(hit[0] if hit else None)
        good = None not in idx and idx == sorted(idx) and len(set(idx)) == len(idx) and len(idx) == len(got_steps)
        if good: ok += 1
        else: bad += 1; diffs.append(f"{a['name']} / {area}: approved {want} | movement ladder {[st['names'] for st in got_steps]}")
    print('approved ladders in the pilot movements:', ok + bad, '| reproduced:', ok, '| differ:', bad)
    for d in diffs: print('  ', d[:400])
    # ---- coverage
    lab = {i: movement(i) for i in EX}
    cov = collections.Counter(); emp = collections.Counter()
    for i, m in lab.items():
        for (mm, area) in LADDERS:
            if mm == m and TAGS[i]['limits'].get(area) == 2:
                cov[(m, area)] += 1
                if not offers(i, area, kit_of(i))['entries']: emp[(m, area)] += 1
    print('library exercises covered per ladder:', dict(cov)); print('of them, nothing left with their own kit:', dict(emp))
    # ---- check 2: a random sample
    random.seed(20261121); rows = []
    seen = json.load(open('pilot_sample.json'))['rows']
    for m in ('press', 'push-up', 'squat', 'curl'):
        ids = sorted(i for i, v in lab.items() if v == m and any(TAGS[i]['limits'].get(a) == 2 for (mm, a) in LADDERS if mm == m))
        areas = [a for (mm, a) in LADDERS if mm == m]
        keep = [(BY[r['exercise']], r['area']) for r in seen if r['movement'] == m and lab.get(BY[r['exercise']]) == m]
        fresh = [i for i in random.sample(ids, 30) if i not in {k for k, _ in keep}][:20 - len(keep)]
        for k, (i, area) in enumerate(keep + [(i, None) for i in fresh]):
            area = area or areas[k % len(areas)]
            if TAGS[i]['limits'].get(area) != 2: area = next(a for a in areas if TAGS[i]['limits'].get(a) == 2)
            kit = kit_of(i); o = offers(i, area, kit); ent = o['entries']
            show = lambda e: ('KEEP: ' if e['kind'] == 'adjust' else '') + e['names'][0]
            easy = [show(e) for e in ent]; avoid = [show(e) for e in ent[1:]]
            rows.append({'movement': m, 'exercise': EX[i]['name'], 'equipment': EX[i]['equipment'], 'area': area, 'kit': kit, 'sits': o['start_why'] or 'at the top',
                         'easy': easy, 'avoid': avoid, 'entries': [(e['names'][0], e['why'], e['kind']) for e in ent]})
    json.dump({'rows': rows}, open('pilot_sample2.json', 'w'), ensure_ascii=False)
    for r in rows: print(f"{r['movement']:8} {r['exercise'][:44]:44} [{r['equipment'][:10]:10}] {r['area']:8} {r['sits'][:28]:28} | easy: {' > '.join(r['easy']) or 'KEEP IT, EASIER'} | avoid: {' > '.join(r['avoid']) or 'SKIP'}")
