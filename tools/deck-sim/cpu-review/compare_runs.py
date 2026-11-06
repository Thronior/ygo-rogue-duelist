"""Compare two card_trace.mjs runs of the same deck (same seeds): wins, the duels whose result flipped, and how
each watched card's use changed. A flipped duel is where a policy change mattered; read both traces of it.
Usage: python compare_runs.py <before run dir> <after run dir>
"""
import json, sys, os

a = json.load(open(os.path.join(sys.argv[1], 'summary.json'), encoding='utf8'))
b = json.load(open(os.path.join(sys.argv[2], 'summary.json'), encoding='utf8'))
wins = lambda s: sum(g['result'] == 'WIN' for g in s['games'])
print(f"wins: {wins(a)}/{len(a['games'])} -> {wins(b)}/{len(b['games'])}")
for x, y in zip(a['games'], b['games']):
    if x['result'] != y['result']:
        print(f"  game {x['g']:02d} {x['opp']} (seat {x['seat']}): {x['result']} turn {x['turns']} -> {y['result']} turn {y['turns']}")
print('\ncard use changes (offered/used counts):')
for card in sorted(set(a['cardUse']) | set(b['cardUse'])):
    before, after = a['cardUse'].get(card, {}), b['cardUse'].get(card, {})
    if before != after:
        keys = sorted(set(before) | set(after))
        print(f"  {card}: " + ', '.join(f"{k} {before.get(k, 0)}->{after.get(k, 0)}" for k in keys if before.get(k, 0) != after.get(k, 0)))
