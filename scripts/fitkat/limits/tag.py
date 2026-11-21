"""Candidate FitKat tags for every catalogue exercise, for the owner's review. Nothing is applied.

Per exercise:
  limits   {area: 1 | 2}  how much it asks of each of the eight limit areas
           2 = loads it (flagged when she has a limit there), 1 = involves it (left in a plan,
           never offered as a replacement under Avoid)
  impact   0 none, 1 low, 2 moderate, 3 high: ground impact through the legs and hips
  balance  True for balance work
  posture  True for work that strengthens upright posture
  static   True for a hold
  mobility area it mobilises, for the Go easy mobility block
"""
import glob
import os
import json
import re
import sys

ROOT = os.environ.get('OPENGYM_ROOT') or os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
AREAS = ['neck', 'shoulder', 'elbow', 'wrist', 'lower back', 'hip', 'knee', 'ankle']
GENTLE = {'stretching', 'mobility', 'yoga'}


def rx(p):
    return re.compile(p)


P = {
    'squat': rx(r'squat|pistol|sissy|wall sit|leg press|hack|thruster|wall ball|sit to stand|chair stand|get.?up'),
    'lunge': rx(r'lunge|step.?up|step.?down|bulgarian|curtsy|skater|split jump|box step'),
    'knee_ext': rx(r'leg extension|knee extension|terminal knee'),
    'knee_flex': rx(r'leg curl|hamstring curl|nordic|glute.?ham|leg.?curl'),
    'hinge': rx(r'deadlift|good morning|romanian|\brdl\b|hip hinge|pull.?through|hyperextension|back extension|superman|reverse hyper|\bclean\b|snatch|rack pull'),
    'bridge': rx(r'hip thrust|glute bridge|hip bridge|hip raise|bridge'),
    'kneel': rx(r'kneeling|on knees|quadruped|bird.?dog|all fours|donkey kick|fire hydrant|knee push|tall.?kneel|half.?kneel|camel|child'),
    'overhead': rx(r'overhead|shoulder press|military|arnold|push press|jerk|snatch|handstand|pike|z press|thruster|bradford|landmine press|wall ball|waiter|windmill|turkish'),
    'push': rx(r'bench press|chest press|push.?up|press.?up|\bdips?\b|fly|flye|pec deck|crossover|floor press|chest dip|svend|squeeze press'),
    'raise': rx(r'raise|upright row|face pull|external rotation|internal rotation|cuban|scaption|reverse fly|rear delt|\by\b|\bw\b|around the world|halo'),
    'vpull': rx(r'pull.?up|chin.?up|pull.?down|pulldown|muscle.?up|hang|lever|skin the cat'),
    'row': rx(r'\brows?\b'),
    'bentover': rx(r'bent.?over|pendlay|t.?bar|bent.?arm barbell pullover|seal'),
    'hands': rx(r'push.?up|press.?up|plank on hands|high plank|straight.?arm plank|plank (jack|jump|walk|to push|up)|handstand|burpee|crawl|\bbear\b|mountain climber|\bdips?\b|l.?sit|planche|crow|walk.?out|inchworm|renegade|crab|sprawl|kick.?through|down.?dog|downward|cartwheel|tabletop|quadruped|bird.?dog|all fours'),
    'forearm_support': rx(r'forearm plank|elbow plank|plank on elbows|on forearms'),
    'rack': rx(r'front squat|\bclean\b|thruster|snatch|overhead squat|zercher'),
    'grip': rx(r'farmer|carry|\bhang|deadlift|shrug|pinch|plate hold|pull.?up|chin.?up|swing|rack pull|suitcase'),
    'wrist': rx(r'wrist|finger|gripper|grip strength|forearm curl'),
    'flex': rx(r'sit.?up|v.?up|jack.?knife|toes to bar|roll.?out|ab wheel|russian twist|wood.?chop|\btwist|side bend|windmill|crunch|hollow|dragon flag'),
    'legraise': rx(r'leg raise|knee raise|leg lift|flutter|scissor|l.?sit|knee tuck|leg lower|hanging|captain'),
    'neck': rx(r'(?<!behind )(?<!behind the )\bneck\b|wrestler.?s? bridge|neck bridge|headstand|head stand|chin tuck'),
    'run': rx(r'\brun\b|running|jog|sprint|treadmill|high knee|butt kick|shuffle|carioca|agility|ladder|shuttle'),
    'jump': rx(r'jump|\bhops?\b|hopping|bound|plyo|burpee|\btuck\b|depth|pogo|leap|star jack|scissor jack|split jack|skier|ski jump|skater|power skip'),
    'seated': rx(r'seated|sitting|lying|supine|prone|floor|machine|lever'),
    'single': rx(r'single.?leg|one.?leg|1.?leg|one.?legged|single leg|unilateral|pistol'),
    'balance': rx(r'balance|tandem|stork|tree pose|warrior iii|airplane|heel.?to.?toe|wobble|on one foot|tightrope|flamingo|star excursion|single.?leg stand|one.?leg stand|standing on one|single.?leg (rdl|romanian|deadlift|reach|hinge|squat to|toe touch)|toe stand|eyes closed'),
    'posture': rx(r'face pull|pull.?apart|wall angel|wall slide|prone (y|t|w|i)\b|superman|bird.?dog|chin tuck|reverse fly|scapular|scap |retraction|cobra|back extension|hyperextension|prone cobra'),
}
HIGH = rx(r'depth|box jump|tuck|broad|bound|jump squat|squat jump|jump lunge|lunge jump|split jump|burpee|long jump|hurdle|sprint|drop jump|180|jump to|knee jump|star jump|power skip|leap|plyo')
MOD = rx(r'jump rope|rope jump|skipping|skip rope|jack\b|jacks\b|\brun\b|running|jog|high knee|butt kick|skater|\bhops?\b|hopping|pogo|shuffle|carioca|ladder|skier|\bdrill\b|agility')
LOW = rx(r'step.?up|march|stomp|heel drop|\bwalk|stair|stepmill|step.?down|box step|elliptical')

MOB = [
    ('ankle', rx(r'ankle|calf|calves|achilles|foot|feet|toe|plantar|shin|soleus|tibialis')),
    ('knee', rx(r'knee|quad|hamstring|it band|iliotibial')),
    ('hip', rx(r'hip|glute|piriformis|groin|pigeon|adductor|abductor|butterfly|90.?90|frog|figure.?4|figure four|lizard|psoas')),
    ('lower back', rx(r'lower back|low back|lumbar|cat|cow|child|spine|spinal|pelvic|knees? to chest|cobra|sphinx|jefferson')),
    ('shoulder', rx(r'shoulder|rotator|chest|pec|\blats?\b|thoracic|t.?spine|arm circle|wall slide|thread the needle|dislocate|doorway|scap')),
    ('elbow', rx(r'elbow|bicep|tricep')),
    ('wrist', rx(r'wrist|forearm|finger|hand')),
    ('neck', rx(r'neck|trap|levator|chin tuck')),
]
MOB_BY_TARGET = {
    'calves': 'ankle', 'shins': 'ankle', 'quads': 'knee', 'hamstrings': 'knee', 'glutes': 'hip', 'abductors': 'hip', 'adductors': 'hip',
    'hip flexors': 'hip', 'spine': 'lower back', 'abs': 'lower back', 'obliques': 'lower back', 'front delts': 'shoulder', 'side delts': 'shoulder',
    'rear delts': 'shoulder', 'pectorals': 'shoulder', 'lats': 'shoulder', 'upper back': 'shoulder', 'serratus anterior': 'shoulder',
    'biceps': 'elbow', 'triceps': 'elbow', 'forearms': 'wrist', 'levator scapulae': 'neck', 'traps': 'neck',
}
LEG_TARGETS = {'quads', 'glutes', 'hamstrings', 'calves', 'abductors', 'adductors', 'shins', 'hip flexors'}
UPPER_PARTS = {'chest', 'shoulders', 'upper arms', 'lower arms', 'back', 'neck'}


def tag(e):
    n, T, S = e['name'].lower(), e.get('target'), set(e.get('secondaryMuscles') or [])
    cat, part, eq = e.get('category'), e.get('bodyPart'), e.get('equipment') or ''
    swing = False
    gentle = cat in GENTLE or eq in ('roller', 'massage ball')
    has = lambda k: bool(P[k].search(n)) or (k == 'hinge' and swing)
    swing = bool(re.search(r'\bswing', n)) and (T in ('glutes', 'hamstrings', 'spine') or part in ('upper legs', 'full body', 'cardio'))
    legs = T in LEG_TARGETS or part in ('upper legs', 'lower legs') or has('squat') or has('lunge')

    # ---- impact: only what lands through the legs
    impact = 0
    lower_landing = legs or part in ('cardio', 'full body') or T == 'cardiovascular system'
    if not gentle and lower_landing and not re.search(r'seated|sitting|on a chair|chair ', n):
        if HIGH.search(n) or (has('jump') and not MOD.search(n)): impact = 3
        elif MOD.search(n): impact = 2
        elif LOW.search(n) and not re.search(r'seated|sitting|lying|supine|prone|wall|plank|crab|bridge', n): impact = 1
    if re.search(r'bike|cycling|row(ing)? machine|ergometer|swim|elliptical', n) or eq in ('stationary bike', 'elliptical machine', 'upper body ergometer'):
        impact = min(impact, 1)

    L = {}
    def put(area, lvl):
        if lvl > L.get(area, 0): L[area] = lvl

    upright = not has('seated')
    # ---- knee
    if has('squat') or has('lunge') or has('knee_ext') or has('knee_flex') or T == 'quads': put('knee', 2)
    if T in ('hamstrings', 'glutes', 'adductors', 'abductors') or has('hinge') or has('bridge') or has('kneel'): put('knee', 1)
    if 'quadriceps' in S: put('knee', 1)
    # ---- hip
    if has('squat') or has('lunge') or has('hinge') or has('bridge') or T in ('glutes', 'abductors', 'adductors', 'hip flexors'): put('hip', 2)
    if T == 'hamstrings' and not has('knee_flex'): put('hip', 2)
    if has('legraise') or S & {'hip flexors', 'glutes', 'groin', 'inner thighs'} or T in ('quads', 'hamstrings'): put('hip', 1)
    # ---- ankle or foot
    if T in ('calves', 'shins'): put('ankle', 2)
    if (has('squat') or has('lunge') or has('single')) and upright and legs: put('ankle', 1)
    if S & {'ankles', 'feet', 'soleus', 'ankle stabilizers', 'calves', 'shins'}: put('ankle', 1)
    # ---- lower back
    if has('hinge') or T == 'spine' or (has('bentover') and has('row')) or (has('flex') and not re.search(r'crunch|hollow', n)): put('lower back', 2)
    if 'lower back' in S or has('bentover') or has('flex') or has('legraise') or has('rack') or re.search(r'barbell.*squat|back squat|plank|carry|farmer', n): put('lower back', 1)
    # ---- shoulder
    if T in ('front delts', 'side delts', 'rear delts') or has('overhead') or 'rotator cuff' in S: put('shoulder', 2)
    if T == 'pectorals' or (has('push') and part in UPPER_PARTS): put('shoulder', 2)
    if has('vpull') and part in UPPER_PARTS | {'waist'}: put('shoulder', 2)
    if re.search(r'behind (the )?(neck|head)', n) and part in UPPER_PARTS: put('shoulder', 2); put('neck', 1)
    if re.search(r'plank', n): put('shoulder', 1); put('wrist', 1)
    if T in ('upper back', 'lats', 'traps', 'serratus anterior') or has('row') or S & {'front delts', 'rear delts', 'side delts'} or (has('hands') and not has('forearm_support')) or has('forearm_support'): put('shoulder', 1)
    if T == 'triceps' and re.search(r'overhead|skull|french|dip|kickback|pullover', n): put('shoulder', 1)
    # ---- elbow
    if T in ('biceps', 'triceps', 'forearms'): put('elbow', 2)
    if re.search(r'pull.?up|chin.?up|\bdips?\b|muscle.?up', n) and part in UPPER_PARTS: put('elbow', 2)
    if S & {'biceps', 'triceps', 'brachialis', 'forearms'} or has('row') or has('push') or has('overhead'): put('elbow', 1)
    # ---- wrist or hand
    if T == 'forearms' or has('wrist') or has('rack') or re.search(r'handstand|planche|crow', n): put('wrist', 2)
    if has('hands') and not has('forearm_support') and eq in ('body weight', 'weighted', 'suspension trainer', 'stability ball', 'bosu ball', 'medicine ball', 'band', 'resistance band', 'dumbbell', 'kettlebell'): put('wrist', 2)
    if S & {'grip muscles', 'forearms', 'wrist flexors', 'wrist extensors', 'hands', 'wrists'} or has('grip'): put('wrist', 1)
    if (has('push') or has('overhead')) and eq in ('barbell', 'dumbbell', 'kettlebell', 'ez barbell', 'olympic barbell', 'smith machine'): put('wrist', 1)
    # ---- neck
    if part == 'neck' or T == 'levator scapulae' or has('neck'): put('neck', 2)
    if T == 'traps' or re.search(r'shrug|upright row', n) or 'sternocleidomastoid' in S: put('neck', 1)
    if re.search(r'sit.?up|crunch', n) and re.search(r'behind (the )?head|hands behind', n): put('neck', 1)
    # ---- what an exercise involves without it being the point (tag review, 21 Nov). All level 1: never flagged
    # for a ladder, but not something to add to a session while she rests that area. The test for each rule is
    # whether someone told to rest the area would be told off for doing the exercise.
    if not gentle:
        legs_only = T in LEG_TARGETS and not (has('hinge') or has('squat') or has('lunge'))
        off_hands = bool(re.search(r'hip thrust|glute bridge|hip bridge|between (the )?(feet|legs|knees|ankles)|ankle weight|on (the )?(lap|hips|knees|thighs)|around|vest|belt squat', n))
        free = eq in ('barbell', 'olympic barbell', 'ez barbell', 'trap bar', 'dumbbell', 'kettlebell', 'medicine ball', 'weighted', 'sandbag', 'weight plate', 'landmine')
        pulled = eq in ('cable', 'band', 'resistance band', 'suspension trainer', 'rope') and not legs_only
        machine_arms = eq in ('leverage machine', 'smith machine', 'assisted') and part in UPPER_PARTS
        # a load held in, hanging from or pulled by the hands goes through the wrist, elbow and shoulder
        if ((free and not (legs_only and eq == 'weighted')) or pulled or machine_arms) and not off_hands:
            for a in ('wrist', 'elbow', 'shoulder'): put(a, 1)
        # body weight through the hands or forearms, or hanging from them
        if has('hands') or has('forearm_support') or re.search(r'plank|push.?up|\bdips?\b|handstand|crawl|\bbear\b|crab', n):
            for a in ('elbow', 'shoulder', 'lower back'): put(a, 1)
            if not has('forearm_support'): put('wrist', 1)
        if re.search(r'hang|pull.?up|chin.?up|toes to bar|captain|muscle.?up|skin the cat|monkey|rope climb|inverted row|body row', n):
            for a in ('wrist', 'elbow', 'shoulder'): put(a, 1)
        # a held bent-over or hinged position
        if has('bentover') or re.search(r'bent.?over|good morning|romanian|stiff.?leg|kickback.*bent|reverse fly|rear delt (raise|fly)', n) and upright and not re.search(r'chest support|incline|seated|lying|prone|machine|lever', n):
            put('hip', 1); put('lower back', 1)
        # standing or walking under a load
        if upright and free and (has('squat') or has('lunge') or has('overhead') or re.search(r'carry|farmer|walk|step.?up|suitcase|standing', n)):
            put('lower back', 1)
        if re.search(r'carry|farmer|suitcase|yoke|sled|prowler|walking', n):
            for a in ('hip', 'knee', 'ankle', 'lower back'): put(a, 1)
        # the trunk: sit-ups pull on the hip flexors and the neck, rows and bridges hold the back
        if re.search(r'sit.?up|v.?up|jack.?knife|toes to bar|roll.?out|ab wheel|dragon flag', n): put('hip', 1); put('neck', 1)
        if re.search(r'crunch', n): put('neck', 1)
        if has('bridge') or has('row') or re.search(r'leg press|hack squat', n): put('lower back', 1)
        if has('legraise'): put('lower back', 1)
        # standing leg work goes through the ankle, kneeling through the knee, most leg work through the knee and hip
        if legs and upright and not re.search(r'curl|extension|machine|lever|lying|seated', n): put('ankle', 1); put('knee', 1); put('hip', 1)
        if T == 'calves' and upright: put('knee', 1)
        # ---- second pass, from what the reviewers found the first rules missed (pool and first sample half)
        handless = eq in ('body weight', 'leverage machine', 'sled machine', 'smith machine', 'assisted', 'stability ball', 'bosu ball', 'roller',
                          'stationary bike', 'elliptical machine', 'stepmill machine', 'skierg machine', 'upper body ergometer')
        # anything else is held in the hands: a mace, a tyre, a wheel, a rope, a hammer
        if not handless and not free and not pulled and eq not in ('cable', 'band', 'resistance band', 'suspension trainer', 'rope') and not off_hands and not legs_only:
            for a in ('wrist', 'elbow', 'shoulder'): put(a, 1)
        # a bar or pads across the shoulders
        on_back = (eq in ('barbell', 'olympic barbell', 'smith machine') and (has('squat') or has('lunge') or re.search(r'good morning|calf raise|step.?up', n)) and not re.search(r'front|zercher|hack|jefferson|deadlift|overhead|goblet|landmine', n)) \
            or (eq in ('leverage machine', 'sled machine', 'smith machine') and re.search(r'hack squat|standing calf|calf raise|squat', n) and not re.search(r'seated|leg press|lying|belt', n))
        if on_back:
            for a in ('neck', 'shoulder', 'lower back'): put(a, 1)
        if eq == 'smith machine' and (has('hinge') or has('squat') or has('lunge') or has('row')): put('shoulder', 1); put('elbow', 1); put('wrist', 1)
        if eq in ('leverage machine', 'smith machine', 'trap bar') and has('hinge'):
            for a in ('wrist', 'elbow', 'shoulder', 'ankle'): put(a, 1)
        # on hands and knees, or leaning on a wheel or straps
        if re.search(r'quadruped|bird.?dog|all fours|donkey kick|fire hydrant|kneeling.*kick|kick.*kneeling|kicks? leg|bent leg kickback|kneeling.*(extension|push)', n) and T not in ('triceps',) or re.search(r'roll.?out|rollerout|ab wheel|ab roller|fallout|body saw|body.?up', n):
            for a in ('wrist', 'elbow', 'shoulder', 'lower back'): put(a, 1)
        if re.search(r'roll.?out|rollerout|ab wheel|ab roller|fallout|body saw', n): put('hip', 1); put('knee', 1)
        if eq == 'suspension trainer' or re.search(r'inverted row|body row|bench pull|exercise ball|stability ball|pullover', n): put('lower back', 1)
        if re.search(r'inverted row|body row|bench pull', n): put('hip', 1)
        # pressing or pushing on the feet
        if upright and (has('overhead') or re.search(r'standing.*press|press.*standing|block press', n)): put('lower back', 1)
        if re.search(r'push press|jerk|thruster|tire flip|tyre|sled|prowler|judo|skier|windmill|wood.?chop|180|mountain climber|climber', n):
            for a in ('hip', 'knee', 'ankle', 'lower back'): put(a, 1)
        if re.search(r'tire flip|tyre|sled|prowler', n):
            for a in ('wrist', 'elbow', 'shoulder'): put(a, 1)
        # bent over without the words for it, and every squat and stand-up
        if upright and (re.search(r'rear delt|rear fly|concentration curl|landmine row', n) or (T == 'triceps' and re.search(r'kickback', n)) or (has('row') and free and not re.search(r'upright|seated|chest support|incline|lying|prone|supported', n))):
            put('hip', 1); put('lower back', 1)
        if has('squat') or re.search(r'stand.?up|step.?up', n): put('lower back', 1)
        # the neck: held weights around the head, sit-ups, lifting the chest off the floor
        if re.search(r'halo|\bmace\b|arm blaster|otis|sit.?up|cocoon|russian twist|handstand|headstand|windmill|hyperextension|back extension|superman|\bw raise|prone', n): put('neck', 1)
        if re.search(r'russian twist|twist', n) and part == 'waist': put('hip', 1)
        # ---- third pass, from the second sample half. These follow the conventions written into the reviewers'
        # brief: toes on the floor in a push-up or plank, standing while holding a load, feet anchored, a band at the ankle.
        if has('hands') or re.search(r'plank|push.?up|press.?up|wall walk|planche|diamond press|floor fly|body saw|fallout', n):
            put('ankle', 1)
            if re.search(r'crawl|\bbear\b|planche|pike|side plank|wall walk', n): put('hip', 1); put('knee', 1)
        if upright and (free or pulled) and part in UPPER_PARTS and not re.search(r'bench|incline|decline|preacher|kneeling|spider|chest support', n): put('lower back', 1)
        if re.search(r'larsen|v.?sit|air bike|in.?out|toe tap|pallof|anti.?rotation|hollow', n): put('lower back', 1); put('hip', 1)
        if re.search(r'v.?sit|air bike|toe tap', n): put('neck', 1)
        if re.search(r'v.?sit|table top|\bcrab\b|kneeling glute|l.?sit|in.?out leg raise|parallel bars|dip bars?|sliding|slider|towel|floor fly|on a chair', n) and eq == 'body weight':
            for a in ('wrist', 'elbow', 'shoulder'): put(a, 1)
        if re.search(r'sliding|slider|towel|floor fly', n) and eq == 'body weight': put('lower back', 1); put('knee', 1); put('ankle', 1)
        if eq in ('band', 'resistance band', 'cable') and re.search(r'hip extension|abduction|adduction|kickback|side step|lateral walk|monster|leg (raise|lift|curl|extension)|foot|ankle', n): put('ankle', 1); put('knee', 1)
        if re.search(r'roman chair|45 degrees?|back extension|glute.?ham|\bghd\b|hyperextension|nordic|ab coaster|seated calf|sit.?up', n): put('knee', 1); put('ankle', 1)
        if re.search(r'(stability|exercise) ball', n) and re.search(r'press|fly|pullover|extension|curl', n) and part in UPPER_PARTS: put('hip', 1); put('knee', 1)
        if has('squat') or has('lunge') or re.search(r'stand.?up|step.?up|step.?down', n): put('ankle', 1); put('lower back', 1)
        # ---- fourth pass, from the first fresh sample (16% of exercises still had a missed area, 1% a loaded one)
        arms = lambda: [put(x, 1) for x in ('wrist', 'elbow', 'shoulder')]
        if free and re.search(r'hip thrust|glute bridge|hip bridge', n): arms()                       # the hands steady the weight on the hips
        if eq in ('cable', 'band', 'resistance band') and re.search(r'stand.?up|calf raise|chair|squat|lunge|step', n): arms(); put('lower back', 1)
        if T == 'calves' and upright and (free or eq in ('band', 'resistance band', 'cable')): put('lower back', 1)
        if re.search(r'reverse hyper|inverted|dragon flag|lying leg raise|leg raise.*bench|bench.*leg raise|swimmer|incline reverse', n): arms()
        if re.search(r'standing', n) and part == 'waist':
            for x in ('ankle', 'knee', 'hip', 'lower back'): put(x, 1)
        if re.search(r'air bike|jack.?knife|knee tuck|pike', n): put('knee', 1); put('ankle', 1)
        if eq == 'suspension trainer' or re.search(r'strongman|\baxle\b|wheelbarrow|\byoke\b|atlas|sandbag|\bkeg\b|\blog\b|\bstone\b', n):
            for x in ('wrist', 'elbow', 'shoulder', 'lower back', 'hip', 'knee', 'ankle'): put(x, 1)
        if re.search(r'front rack|zercher|clean grip|side ben[dt]|swimmer|lower back curl|head up|cobra', n): put('neck', 1)
        if has('row') and upright and (free or pulled) and not re.search(r'upright|chest support|incline|lying|prone|supported', n): put('hip', 1); put('lower back', 1)
        if re.search(r'(standing|cable|kneeling).*crunch|crunch.*(standing|cable|kneeling)', n): put('hip', 1)
        if re.search(r'calf press|seated.*calf|calf.*seated', n): put('knee', 1)
        if re.search(r'seated|sitting', n) and (free or pulled) and part in UPPER_PARTS and not re.search(r'bench|incline|support|preacher|lying|machine|lever', n): put('lower back', 1)
    # ---- impact reaches the joints it lands through
    if impact >= 2:
        for a in ('knee', 'hip', 'ankle'): put(a, 2)
        put('lower back', 1)
    elif impact == 1:
        for a in ('knee', 'ankle'): put(a, 1)
    # ---- gentle work never "loads"; it is the mobility pool
    if gentle:
        L = {a: 1 for a in L}
    L = {a: v for a, v in L.items() if v}

    static = bool(e.get('hold')) or cat == 'isometric'
    mobility = None
    if gentle or cat == 'rehab':
        for area, pat in MOB:
            if pat.search(n): mobility = area; break
        if not mobility: mobility = MOB_BY_TARGET.get(T)
        if mobility: L[mobility] = max(L.get(mobility, 0), 1)
    standing = bool(re.search(r'stand|squat|lunge|single.?leg|one.?leg|step', n))
    balance = (has('balance') or ('bosu' in n or eq == 'bosu ball') and legs and standing) and impact < 3 and cat != 'olympic' and 'snatch' not in n
    if has('single') and upright and legs and not gentle and re.search(r'stand|balance|reach|deadlift|rdl|romanian|squat|hinge|toe touch', n) and not re.search(r'support|assisted|calf|smith|lever|machine|seated|lying', n) and impact < 2: balance = True
    posture = not gentle and ((T == 'spine') or has('posture') or (T in ('rear delts', 'upper back') and re.search(r'reverse fly|face pull|pull.?apart|prone|retraction|\by\b|\bt\b|\bw\b', n)))
    return {'limits': L, 'impact': impact, 'balance': bool(balance), 'posture': bool(posture), 'static': static, 'mobility': mobility}


def load():
    out = {}
    for f in glob.glob(ROOT + '/catalogue/exercises/*.json'):
        e = json.load(open(f, encoding='utf8'))
        if e.get('name'):
            out[e['id']] = e
    return out


if __name__ == '__main__':
    ex = load()
    tags = {i: tag(e) for i, e in ex.items()}
    json.dump({'ex': {i: {k: e.get(k) for k in ('name', 'bodyPart', 'target', 'equipment', 'category')} for i, e in ex.items()}, 'tags': tags},
              open(os.path.dirname(os.path.abspath(__file__)) + '/tags.json', 'w'))
    print(len(tags), 'tagged')
