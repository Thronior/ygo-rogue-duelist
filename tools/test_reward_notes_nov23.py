"""Payout card multipliers (Discord 2026-11-23: a mirrored Glass Shard's "+1704" looked wrong). rewards() records how
each multiplying line was worked out in run['last_reward_notes'], and the card shows it beside the line."""
import sys,random,tempfile,copy,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage
sys.stdout.reconfigure(encoding='utf8')
base=Path(tempfile.mkdtemp(prefix='reward-notes-',dir=ROOT/'temp'));storage.ROOT=base;g.SAVE=base/'run.json'
r=g.new_run(0,random.Random(7));r.update(stage='shop',gold=0)
def pay(relics,level=0,mirror=None):
 run=copy.deepcopy(r);run.update(artifacts=relics,challenge_level=level)
 if mirror:run['mirror_copy']=mirror
 tally,total=g.rewards(run,[]);return tally,total,run.get('last_reward_notes')
tally,total,notes=pay([])
assert notes=={},notes
tally,total,notes=pay(['glass_shard'])
assert notes=={'Glass Shard':['×3','']},notes and tally['Glass Shard']==total*2//3
# The Discord case: Magic Mirror copying Glass Shard multiplies again, then Challenge LVL 3+ takes a quarter.
tally,total,notes=pay(['glass_shard','magic_mirror'],level=3,mirror='glass_shard')
assert notes=={'Glass Shard':['×9','Magic Mirror'],'Challenge level penalty':['−25%','']},notes
base_total=total-tally['Glass Shard']-tally['Challenge level penalty']
assert tally['Glass Shard']==base_total*8 and tally['Challenge level penalty']==base_total*9*3//4-base_total*9,(tally,total)
tally,total,notes=pay(['cursed_glass_treasury'])
assert notes=={'Glass Treasury':['+25%','']},notes
# An Exodia win tops the payout up to its floor after the LVL 3+ penalty; the floor shows beside the line (Discord 2026-11-23).
run=copy.deepcopy(r);run.update(artifacts=[],challenge_level=3);tally,total=g.rewards(run,[],reason=0x10);notes=run['last_reward_notes']
assert total>=150 and ('Exodia win' not in tally or notes.get('Exodia win')==['≥150','']),(tally,notes)
if 'Exodia win' in tally:print('Exodia floor note',notes['Exodia win'])
# The card draws the note beside its line.
js="import {victoryRewardsMarkup} from './android/web/experience-ui.js';const h=victoryRewardsMarkup({'Victory':30,'Glass Shard':1704,'Challenge level penalty':-480},[],[],{'Glass Shard':['×9','Magic Mirror'],'Challenge level penalty':['−25%','']});if(!h.includes('×9')||!h.includes('Magic Mirror')||!h.includes('−25%'))throw Error(h);console.log('ok')"
node=ROOT/'runtime/ai/node.exe'
out=subprocess.run([str(node) if node.exists() else 'node','--input-type=module','-e',js],cwd=ROOT,capture_output=True,text=True,encoding='utf8')
assert out.stdout.strip()=='ok',out.stderr[-800:]
print('PASS payout notes: Glass Shard ×3 / ×9 (Magic Mirror), Glass Treasury +25%, Challenge level penalty −25%, drawn on the card')
