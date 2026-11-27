"""Relic Seal below Challenge Level 2 negates half of the relics, rounded up; from Level 2 on, all (user, Discord 2026-11-26).
The duel (approved_relics.seal_pick) and the screen (feedback-ui.js sealPick) must pick the same relics."""
import json, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import approved_relics as ar

cases = []
for n in range(0, 9):
    for level in (0, 1, 2, 6):
        for rnd in (2, 5, 8):
            run = {'artifacts': [f'relic{i}' for i in range(n)], 'challenge_level': level, 'round': rnd, 'loop': rnd % 2, 'started_at': 1795700000.75 + n, 'curses': ['relic_seal']}
            pick = ar.sealed_relics(run)
            assert len(pick) == (n if level >= 2 else (n + 1) // 2), (n, level, pick)
            kept = ar.duel_run(run)['artifacts']
            assert len(kept) == n - len(pick)
            cases.append({'run': run, 'pick': pick})
assert ar.sealed_relics({'artifacts': ['a', 'b'], 'curses': []}) == []
js = """import {sealPick} from './android/web/feedback-ui.js';const cases=JSON.parse(process.argv[1]);
let bad=cases.filter(c=>JSON.stringify(sealPick(c.run))!==JSON.stringify(c.pick));console.log(bad.length?JSON.stringify(bad[0]):'same')"""
out = subprocess.run([str(ROOT / 'runtime/ai/node.exe'), '--input-type=module', '-e', js, json.dumps(cases)], cwd=ROOT, capture_output=True, text=True)
assert out.stdout.strip() == 'same', out.stdout + out.stderr
print(f'PASS relic seal half: {len(cases)} runs, Python and the screen pick the same relics; Level 2+ seals all')
