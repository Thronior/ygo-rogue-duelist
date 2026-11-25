"""Sandbox duels (survey answers, 2026-11-25; sandbox.py): the relic list (Draft Duels' plus fused relics, user's choice),
the duel setup (one AI line with both sides' relics, the coin toss, unknown relics and cards dropped), and that asking
for a setup writes nothing: no run, profile or other save. Writes temp/sandbox-relic-scripts.json for
android/test_sandbox_relics_nov25.mjs to run in the engine."""
import json,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path[:0]=[str(ROOT),str(ROOT/'android')]
import sandbox,draft_relics,content,relic_fusions,approved_relics as ar

keys=sandbox.relics();eligible=draft_relics.eligible()
assert set(eligible)<=set(keys),'every Draft Duel relic is offered'
fused=[k for k in keys if k in relic_fusions.KEYS];assert len(fused)>=30,fused
assert not set(keys)&draft_relics.NOT_IN_DUEL and not set(keys)&set(ar.REMOVED) and not set(keys)&set(ar.CHOICE_RELICS)
assert not any(content.ART_INFO[k].get('tag')=='economy' for k in keys)
# Coins and shop only: their scripts differ from no relic by a blank line, which must not count (2026-11-25).
assert 'bottomless_purse' not in keys and 'grand_bazaar' not in keys
assert len(keys)==len(set(keys))
shipped=ROOT/'android/web/content.json'
if shipped.exists():
 meta=json.loads(shipped.read_text(encoding='utf-8'))
 if 'sandboxRelics' in meta:assert meta['sandboxRelics']==keys,'Run tools/build_android.py: content.json sandboxRelics is stale'

battle_ox,elf=5053103,15025844
deck={'main':[battle_ox]*20+[elf]*20,'extra':[]}
def setup(a,b,first=0,seed=7,**extra):return sandbox.duel_setup(dict(relics=[a,b],characters=[0,2],decks=[deck,deck],seed=seed,first=first,allowed=keys,**extra))
plain=setup([],[])
assert plain['relics']==[[],[]] and plain['draw']==5 and plain['enemyDraw']==5
assert plain['passives'].startswith('-- SHADOW_RUN_RNG 2\n') and 'EnableRogueAntiStreak' in plain['passives'] and 'SkipPhase' not in plain['passives']
assert 'Coin toss: opponent starts' in setup([],[],first=1)['passives']
mine,theirs=[k for k in keys if k not in ('magic_mirror','rulebook')][:3],[k for k in keys if k not in ('magic_mirror','rulebook')][3:6]
s=setup(mine+['not_a_relic',mine[0]],theirs,first=1)
assert s['relics']==[mine,theirs],s['relics']
lines=[l for l in s['passives'].splitlines() if l.startswith('-- SHADOW_RUN_AI ')]
assert len(lines)==1,'one AI line, so the CPU reads both sides right'
ai=json.loads(lines[0][len('-- SHADOW_RUN_AI '):])
assert [r['key'] for r in ai['statRelics'][0]]==mine and [r['key'] for r in ai['statRelics'][1]]==theirs
assert ai['activeRelics']==[mine,theirs] and ai['firstPlayer']==1
assert len(setup(keys[:40],[])['relics'][0])==sandbox.LIMIT
assert setup(['rulebook'],[])['draw']==1 and setup([],['rulebook'])['draw']==1
assert s==setup(mine+['not_a_relic',mine[0]],theirs,first=1),'deterministic for a seed'
print(f'PASS {len(keys)} sandbox relics ({len(fused)} fused), setup with one AI line, coin toss and limits')

# Asking for a setup or the relic list never touches a save.
import mobile_backend as b,storage,campaign as g
base=Path(tempfile.mkdtemp(prefix='sandbox-',dir=ROOT/'temp'));storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
call=lambda action,value=None:json.loads(b.dispatch(json.dumps(dict(action=action,value=value))))
call('new',dict(character=0,replace=True))
before={p.name:p.read_bytes() for p in base.iterdir() if p.is_file()};run=json.dumps(b.run,sort_keys=True)
writes=[];original=storage.write;storage.write=lambda p,v:(writes.append(Path(p).name),original(p,v))[1]
saves=[];original_save=g.save;g.save=lambda r:(saves.append(1),original_save(r))[1]
r=call('sandbox-setup',dict(relics=[mine,theirs],characters=[0,2],decks=[deck,deck],seed=9,first=0,allowed=keys))
assert r['persist'] is False and r['result']['relics']==[mine,theirs] and set(r)=={'partial','persist','result'}
assert call('sandbox-relics')['result']==keys
assert not writes and not saves and json.dumps(b.run,sort_keys=True)==run
assert {p.name:p.read_bytes() for p in base.iterdir() if p.is_file()}==before
print('PASS sandbox-setup and sandbox-relics write nothing and leave the run alone')

cases=[{'relics':[[k],[]],'first':0} for k in keys]+[{'relics':[[],[k]],'first':1} for k in keys]
for i in range(0,len(keys),6):cases.append({'relics':[keys[i:i+6],keys[i+6:i+12]],'first':i%2})
out=[]
for i,c in enumerate(cases):
 r=sandbox.duel_setup(dict(relics=c['relics'],characters=[0,2],decks=[deck,deck],seed=100+i,first=c['first'],allowed=keys))
 out.append(dict(relics=c['relics'],first=c['first'],seed=100+i,**{k:r[k] for k in ('passives','draw','enemyDraw')}))
(ROOT/'temp').mkdir(exist_ok=True);(ROOT/'temp/sandbox-relic-scripts.json').write_text(json.dumps(out),encoding='utf-8')
print(f'PASS {len(out)} engine cases written to temp/sandbox-relic-scripts.json')
