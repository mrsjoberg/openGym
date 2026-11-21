"""Pilot: ladders per movement, not per exercise (owner's decision, 20 Nov). Three movements, which split into four:
press with weights, push-up, free-standing squat, curl. Jumping, running and anything without a clear movement
fall back to "keep it, easier" (Go easy) or "Skip it?" (Avoid)."""
import json, re, sys, glob, collections
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ladder as L
EX, TAGS, FAM = L.EX, L.TAGS, L.FAM
BY = {}
for i, e in sorted(EX.items()): BY.setdefault(e['name'], i)
s = lambda p, n: bool(re.search(p, n))
GENTLE = ('stretching', 'mobility', 'yoga')

COMBO = r'\bto\b|\band\b|\bwith\b.*\b(press|curl|row|twist|kick|raise)|thruster|\bclean\b|snatch|jerk|burpee|renegade|\bkick|crawl|\bwalk'

form_check = lambda i: 'form check' in EX[i]['name'].lower()
PUSH_COMBO = r'rotat|twist|corkscrew|clock|\btap\b|\brow\b|\bpull\b|pullback|front raise|knee tuck|knee chest|grasshopper|spiderman|superman|bird dog|cobra|lunge|hindu|dive|\bseal\b|\bdrop\b|hand by hand|side push up|raise single arm'
LUNGE_SQUAT = r'cossack|curts[e]?y|side (bench )?squat|bench one leg squat'           # lunges that carry the word squat
SQUAT_OUT = LUNGE_SQUAT + r'|lateral squat|jefferson|clock|wall|stability ball|exercise ball|suspen|support|kneeling|on knees|sissy|twist|\brow\b|\bpress\b|pallof|power pull|turkish|\bdeck\b|\broll\b|step out|squat step|pulse|speed'

def movement(i):
    """The movement an exercise belongs to, or None. The movement's own word must be in the name: the first
    pilot run labelled kickboxing kicks as squats because only the target muscle was read."""
    e, t, n = EX[i], TAGS[i], EX[i]['name'].lower()
    if form_check(i): return None                    # a demonstration of form, not an exercise: never flagged, never replaced (owner)
    if e['category'] in GENTLE or t['impact'] >= 2 or e['category'] in ('plyometrics', 'cardio', 'olympic', 'combat'): return None
    if t['static'] or s(COMBO, n): return None       # a hold has nothing below it; a combination has no single job
    f, tg = FAM[i], e['target']
    if tg == 'pectorals' and (s(r'push.?up|press.?up', n) or (e['equipment'] == 'suspension trainer' and s(r'chest press', n))):
        # label review, 20 Nov: a push-up with a second action is a combination; hindu and dive-bomber go through a pike; drop is explosive
        if s(PUSH_COMBO, n): return None
        return 'push-up'
    if tg == 'pectorals' and f == 'h_press' and e['equipment'] != 'body weight' and s(r'\bpress\b', n) and not s(r'squat|lunge|crunch|bridge|sit.?up|twist|straight arm|california|sprinter|side lying|one arm reverse grip press', n): return 'press'
    if f == 'squat' and tg in ('quads', 'glutes') and s(r'squat|sit.to.stand|chair stand|stand.?up', n):
        if s(r'leg press|hack|sled', n) or e['equipment'] in ('sled machine', 'leverage machine', 'smith machine', 'assisted'): return None   # machine and supported squats: a later movement
        if s(SQUAT_OUT, n): return None        # label review, 20 Nov: side-to-side and one-foot-back squats are lunges; supported, kneeling and combined squats are left out
        return 'squat'
    if f == 'curl' and tg == 'biceps' and s(r'\bcurls?\b', n) and not s(r'press|lunge|squat|overhead extension|pulldown|under table|inverted|\bchin\b|cheat|swing|^bodyweight', n): return 'curl'
    return None

if __name__ == '__main__':
    lab = {i: movement(i) for i in EX}
    c = collections.Counter(v for v in lab.values() if v)
    print('labelled:', dict(c))
    for m in c:
        ids = [i for i, v in lab.items() if v == m]
        areas = collections.Counter(a for i in ids for a, v in TAGS[i]['limits'].items() if v == 2)
        eq = collections.Counter(EX[i]['equipment'] for i in ids)
        print(f'\n{m}: {len(ids)} | flagged areas {dict(areas)}\n   kit {dict(eq.most_common(12))}')
        words = collections.Counter(w for i in ids for w in set(re.findall(r'[a-z]+', EX[i]['name'])))
        print('   words', [w for w, k in words.most_common(60)])
