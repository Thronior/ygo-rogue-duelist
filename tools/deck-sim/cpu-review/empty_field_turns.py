"""List turns where the CPU ended Main Phase with an empty field although a summon or Set was offered.
Usage: python empty_field_turns.py <run dir> [glob, default *LOSS*.txt]
"""
import glob, re, sys, os
os.chdir(sys.argv[1])
pattern = sys.argv[2] if len(sys.argv) > 2 else '*LOSS*.txt'
for f in sorted(glob.glob(pattern)):
    t = open(f, encoding='utf8').read().split('\n')
    turn = None
    for i, l in enumerate(t):
        if l.startswith('=== Turn'):
            turn = l.strip()
        # End of our Main Phase 2 / end with an empty field while summons were offered.
        if l.startswith('  [IDLE ph256]') or l.startswith('  [IDLE ph4]'):
            me, opts, ch = t[i + 1], t[i + 3], t[i + 4].strip()
            if ch in ('=> 7',) and 'M[]' in me and ('sum:' in opts or 'mset:' in opts or 'ss:' in opts):
                print(f[:32], '|', turn, '|', t[i].split('hand:')[1].strip()[:90], '|', opts.strip()[:160])
