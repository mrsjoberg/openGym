"""Replacement ladders for a limit: same job, less and less asked of the joint.

rung 1  a friendlier variant of the same movement (grip, handles, load position)
rung 2  lighter still, or a shorter range
rung 3  a hold for the same muscle
rung 4  a neighbouring muscle that spares the joint
Go easy offers rungs 1 and 2. Avoid offers rungs 2, 3 and 4. Then the skip question.
"""
import json, re, sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tag as T

EX = T.load()
TAGS = {i: T.tag(e) for i, e in EX.items()}
s = lambda p, n: bool(re.search(p, n))


def family(e):
    n, t = e['name'].lower(), e.get('target')
    lunge = s(r'lunge|split squat|step.?up|step.?down|bulgarian|curtsy', n)
    hinge = s(r'deadlift|good morning|romanian|\brdl\b|pull.?through|swing|hyperextension|back extension|rack pull', n)
    bridge = s(r'hip thrust|bridge|hip raise|frog pump', n)
    if s(r'push.?up|press.?up', n) and t in ('pectorals', 'front delts', 'triceps'): return 'v_press' if s(r'pike|handstand', n) else 'h_press'
    if s(r'\bdips?\b', n) and t in ('pectorals', 'triceps'): return 'dip'
    if t == 'pectorals': return 'fly' if s(r'fly|flye|crossover|pec deck|svend|squeeze|pullover', n) else 'h_press'
    if t == 'front delts': return 'v_press' if s(r'press|jerk|pike|handstand', n) else 'raise'
    if t == 'side delts': return 'upright' if s(r'upright', n) else 'raise'
    if t == 'rear delts': return 'rear'
    if t == 'lats': return 'v_pull' if s(r'pull.?up|chin.?up|pull.?down|pulldown', n) else 'row' if s(r'\brows?\b', n) else 'lat_other'
    if t == 'upper back': return 'rear' if s(r'face pull|pull.?apart|reverse fly|rear delt', n) else 'row' if s(r'\brows?\b|pull', n) else 'upper_other'
    if t == 'traps': return 'shrug'
    if t == 'biceps': return 'curl'
    if t == 'triceps': return 'h_press' if s(r'bench press|close.?grip press|floor press', n) else 'tri_ext'
    if t == 'forearms': return 'forearm'
    if t == 'quads': return 'knee_ext' if s(r'leg extension|knee extension', n) else 'lunge' if lunge else 'squat'
    if t == 'glutes':
        return 'bridge' if bridge else 'lunge' if lunge else 'hinge' if hinge else 'squat' if s(r'squat|leg press', n) else 'abduction' if s(r'abduct|kickback|clam|hydrant|donkey|side.?l', n) else 'glute_other'
    if t == 'hamstrings': return 'knee_flex' if s(r'curl|nordic|glute.?ham', n) else 'hinge'
    if t == 'calves': return 'calf'
    if t == 'spine': return 'hinge' if hinge else 'back_ext'
    if t in ('abs', 'obliques'): return 'plank' if s(r'plank|hollow|side bridge|dead bug|bird', n) else 'core_flex'
    if t in ('abductors', 'adductors'): return t
    return 'other'


FAM = {i: family(e) for i, e in EX.items()}
BAR = ('barbell', 'olympic barbell', 'smith machine')


def stress(i, area):
    """How much the exercise asks of the area, 0 to about 5. 3 is an ordinary exercise that loads it."""
    e, t = EX[i], TAGS[i]
    lvl = t['limits'].get(area, 0)
    if lvl < 2: return float(lvl)
    n, eq, f = e['name'].lower(), e.get('equipment') or '', FAM[i]
    if t['static']: return 1.25
    v = 3.0
    neutral = s(r'neutral|hammer|palms in|parallel grip', n)
    light = (-1 if eq in ('band', 'resistance band') else 0) + (-1 if s(r'assisted', n) or eq == 'assisted' else 0)
    if area == 'shoulder':
        if eq in BAR and f in ('h_press', 'v_press', 'upright'): v += 1
        if s(r'behind (the )?(neck|head)', n) or f in ('dip', 'upright'): v += 1
        if s(r'\bwide', n) or f == 'fly': v += 0.5
        if neutral: v -= 1
        if s(r'floor press|landmine', n): v -= 1
        if s(r'push.?up', n): v -= 0.5
        if s(r'incline push|wall|on knees|knee push|\(knee', n) and s(r'push.?up', n): v -= 1
        if eq in ('cable', 'leverage machine'): v -= 0.5
        if s(r'scaption|\by raise', n): v -= 0.5
        if s(r'decline push|deficit|deep|clap|plyo|archer|one arm push|handstand', n): v += 1
        if s(r'pull.?up|chin.?up', n): v += 1
    elif area == 'elbow':
        if eq in BAR and f in ('curl', 'tri_ext'): v += 1
        if eq == 'ez barbell': v += 0.5
        if s(r'skull|french|lying.*extension|overhead', n) and f == 'tri_ext': v += 0.5
        if f == 'dip' or s(r'chin.?up|pull.?up|muscle.?up', n): v += 1
        if neutral or s(r'rope', n) or eq == 'rope': v -= 1
        if eq == 'cable': v -= 0.5
        if s(r'preacher|spider|drag|21|cheat|reverse', n): v += 0.5
    elif area == 'wrist':
        if s(r'handle|parallel bars|off dumbbell|on dumbbell|knuckle|fist', n): v -= 1
        if s(r'incline push|wall|on knees|knee push', n): v -= 0.5
        if eq in BAR and f in ('curl',): v += 1
        if neutral: v -= 1
        if s(r'handstand|planche|clap|plyo|front squat|\bclean\b|snatch', n): v += 1
        if f == 'dip': v += 0.5
    elif area == 'knee':
        if t['impact'] >= 2: v += 1 + (t['impact'] - 2) * 0.5
        if eq in BAR and f in ('squat', 'lunge'): v += 1
        if s(r'full|deep|sissy|pistol|bulgarian|deficit|single.?leg|one.?leg|hack|atg', n): v += 0.5
        if s(r'goblet', n): v -= 0.5
        if s(r'box|to bench|chair|quarter|half squat|partial|sit to stand|wall squat|stability ball wall', n): v -= 1
        if s(r'leg press', n): v -= 0.5
        if eq == 'body weight' and f in ('squat', 'lunge'): v -= 0.5
        if s(r'reverse lunge|rear lunge|step.?back', n): v -= 0.5
    elif area == 'hip':
        if t['impact'] >= 2: v += 1 + (t['impact'] - 2) * 0.5
        if eq in BAR and f in ('squat', 'lunge', 'hinge'): v += 1
        if s(r'sumo|wide|deficit|bulgarian|single.?leg|one.?leg|full|deep|pistol', n): v += 0.5
        if s(r'goblet', n): v -= 0.5
        if s(r'box|to bench|chair|quarter|half squat|partial|sit to stand', n): v -= 1
        if f == 'bridge' and eq in ('body weight',): v -= 1
        if f == 'bridge' and eq in ('dumbbell', 'kettlebell', 'weight plate'): v -= 0.5
        if eq == 'leverage machine' and f in ('abduction', 'abductors', 'adductors'): v -= 0.5
    elif area == 'lower back':
        if eq in BAR and (f in ('hinge', 'row') or s(r'good morning', n)): v += 1
        if eq == 'trap bar': v += 0.5
        if s(r'good morning|stiff|straight.?leg|deficit|jefferson', n): v += 0.5
        if s(r'pull.?through', n): v -= 1
        if s(r'single.?leg|one.?leg|b.?stance|kickstand', n) and f == 'hinge': v -= 0.5
        if eq == 'body weight': v -= 0.5
        if s(r'swing|\bclean\b|snatch', n): v += 0.5
    elif area == 'ankle':
        if t['impact'] >= 2: v += 1 + (t['impact'] - 2) * 0.5
        if s(r'single.?leg|one.?leg|deficit|elevated', n): v += 0.5
        if s(r'seated', n): v -= 1
        if eq in ('leverage machine', 'sled machine', 'smith machine'): v += 0
        if eq == 'body weight': v -= 0.5
    return max(1.5, v + light)


COMMON = {'dumbbell': 2, 'body weight': 2, 'band': 1.5, 'resistance band': 1.5, 'cable': 1.5, 'kettlebell': 1, 'barbell': 1, 'ez barbell': 0.5, 'leverage machine': 1, 'sled machine': 1, 'landmine': 0.5, 'weight plate': 0}
ODD = r'v\. ?\d|\(male\)|\(female\)|\bwith\b|\bto\b|\band\b|complex|alternate|alternating|one.?arm|single.?arm|unilateral|single.?leg|one.?leg|decline|reverse|\bwide|close|narrow|twist|rotation|kneeling|lying|seated|standing|stability|exercise ball|bosu|\(|bottle|backpack|towel|chair|bed sheet|table|pause|tempo|pulse|1 ?1/?2|iso|wall ball|against wall|side pov'


VOCAB = set("""dumbbell dumbbells barbell band bands cable kettlebell lever smith landmine bodyweight resistance machine ez bar sled weighted
incline seated standing lying bench press chest floor push-up push up shoulder shoulders overhead lateral raise front row rows bent over pulldown lat pull curl curls hammer biceps
bicep triceps pushdown extension kickback squat squats goblet box leg legs split lunge lunges reverse rear step-up step romanian deadlift hip thrust glute bridge calf wall sit neutral
grip palms in assisted rope face apart pull-through through good morning back hyperextension hold isometric plank svend squeeze hamstring quarter half supported two on
single one arm alternating alternate""".split())
WORD = re.compile(r"[a-z0-9°'-]+")


def canon(i, base):
    """How plain and how like the original a candidate is."""
    e, b = EX[i], EX[base]
    n, bn = e['name'].lower(), b['name'].lower()
    v = (3 if e.get('target') == b.get('target') else 0) + COMMON.get(e.get('equipment'), -2)
    words, bwords = WORD.findall(n.replace('(', ' ').replace(')', ' ')), set(WORD.findall(bn))
    v -= 0.3 * max(0, len(words) - 3)
    v -= 1.5 * sum(1 for w in set(words) if w not in VOCAB and w not in bwords)
    v += min(2, sum(1 for w in set(words) if w in bwords and w in VOCAB and w not in COMMON and w not in ('band', 'resistance', 'lever', 'bar')))
    for m in set(re.findall(ODD, n)):
        if m not in bn: v -= 1.2
    return v


NEIGH = {
    ('h_press', 'shoulder'): ['tri_ext'], ('v_press', 'shoulder'): ['tri_ext'], ('dip', 'shoulder'): ['tri_ext'], ('raise', 'shoulder'): [], ('fly', 'shoulder'): ['tri_ext'],
    ('v_pull', 'shoulder'): ['row'], ('rear', 'shoulder'): ['row'], ('curl', 'elbow'): ['row'], ('tri_ext', 'elbow'): ['h_press'], ('dip', 'elbow'): ['h_press'],
    ('squat', 'knee'): ['bridge', 'hinge'], ('lunge', 'knee'): ['bridge', 'hinge'], ('knee_ext', 'knee'): ['bridge'], ('knee_flex', 'knee'): ['bridge', 'hinge'],
    ('squat', 'hip'): ['knee_ext'], ('lunge', 'hip'): ['knee_ext'], ('hinge', 'hip'): ['knee_flex'], ('bridge', 'hip'): ['knee_flex'],
    ('hinge', 'lower back'): ['bridge', 'knee_flex'], ('row', 'lower back'): [], ('calf', 'ankle'): [],
    ('h_press', 'wrist'): [], ('v_press', 'wrist'): ['raise'], ('dip', 'wrist'): ['tri_ext'], ('squat', 'ankle'): ['knee_ext'], ('lunge', 'ankle'): ['knee_ext'],
}
OKCAT = ('strength', 'calisthenics', 'pilates')


def ladder(i, area):
    sE, f, tgt = stress(i, area), FAM[i], EX[i].get('target')
    if TAGS[i]['limits'].get(area) != 2: return None
    pool = [j for j in EX if j != i and FAM[j] == f and EX[j].get('category') in OKCAT and TAGS[j]['impact'] <= max(TAGS[i]['impact'], 0) and not TAGS[j]['static']]
    best = lambda js, key=None: max(js, key=key or (lambda j: canon(j, i))) if js else None
    r1 = best([j for j in pool if sE - 2 <= stress(j, area) <= sE - 0.75]) or best([j for j in pool if stress(j, area) <= sE - 0.5])
    s1 = stress(r1, area) if r1 else sE
    r2 = best([j for j in pool if j != r1 and stress(j, area) <= s1 - 0.5]) or best([j for j in pool if j != r1 and stress(j, area) <= min(s1, 1) and EX[j].get('equipment') != EX[r1].get('equipment')] if r1 else [])
    holds = [j for j in EX if TAGS[j]['static'] and EX[j].get('target') == tgt and j != i]
    r3 = best(holds)
    neigh = [j for j in EX if FAM[j] in NEIGH.get((f, area), []) and TAGS[j]['limits'].get(area) != 2 and EX[j].get('category') in OKCAT and not TAGS[j]['impact']]
    r4 = best(neigh, key=lambda j: canon(j, j) - 3)
    return {'id': i, 'area': area, 'stress': sE, 'family': f, 'rungs': [(j, stress(j, area)) for j in (r1, r2, r3, r4) if j]}


if __name__ == '__main__':
    ids = json.load(open(os.path.dirname(os.path.abspath(__file__)) + '/starter_ids.json'))
    out = []
    for area in ['shoulder', 'elbow', 'wrist', 'lower back', 'hip', 'knee', 'ankle', 'neck']:
        for i in ids:
            L = ladder(i, area)
            if not L: continue
            out.append(L)
            print(f"{area:10} {EX[i]['name'][:34]:34} {L['stress']:.1f} [{L['family']}] -> " + ' | '.join(f"{EX[j]['name']} ({v:.1f})" for j, v in L['rungs']))
    json.dump(out, open(os.path.dirname(os.path.abspath(__file__)) + '/ladders.json', 'w'))
    print(len(out), 'ladders')
