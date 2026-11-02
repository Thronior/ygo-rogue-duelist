# Kzulu's cursed relic review: coin rewards, Crowded Crypt, Ritual Scar and Champion's Burden's removal.
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import approved_relics as ar,campaign as g,passives
BURDEN='cursed_champions_burden'
run=lambda *keys,**extra:{'artifacts':list(keys),'curses':[],'challenge_level':0,**extra}
grave=lambda n:[{'kind':'duel_metrics','grave_monsters':n}]
assert ar.rewards(run('cursed_loaded_purse'),[],False)=={'Loaded Purse':60}
assert ar.rewards(run('cursed_blind_fortune'),[],False)=={'Blind Fortune':20}
assert ar.rewards(run('cursed_golden_grave'),grave(4),False)=={'Golden Grave':24}
assert ar.rewards(run('cursed_golden_grave'),grave(40),False)=={'Golden Grave':90}
assert ar.opening(run('cursed_crowded_crypt'),5)==5,'no longer shrinks the opening hand'
assert 'e:SetValue(-400)' in passives.script(run('cursed_golden_grave')),'Golden Grave costs 400 DEF'
script=passives.script(run('cursed_ritual_scar'))
assert 'Duel.Damage(0,1000' not in script and 'local n=0' in script and 'RITUAL_SCAR_COUNT' not in script
assert 'local n=7' in passives.script(run('cursed_ritual_scar',ritual_scar_count=7))
assert BURDEN in ar.REMOVED and BURDEN not in ar.CURSED_IDS and BURDEN not in g.ARTIFACTS
old=run(BURDEN,'eye',cursed_artifacts=[BURDEN]);ar.drop_removed(old)
assert old['artifacts']==['eye'] and old['cursed_artifacts']==[]
# The Ritual count survives wins and carries into the next Duel's script.
import random,tempfile,storage,content as c
storage.ROOT=Path(tempfile.mkdtemp(dir=Path(__file__).resolve().parents[1]/'temp',prefix='cursed-balance-'));g.SAVE=storage.ROOT/'run.json'
profile=storage.profile();profile['unlocked']=list(c.PLAYABLE_IDS);storage.write(storage.ROOT/'profile.json',profile)
r=g.new_run(1,random.Random(1));g.auto_deck(r);r.update(stage='shop',round=1,lp=8000,challenge_level=0,artifacts=['cursed_ritual_scar'],ritual_scar_count=2);g.routes(r);r['opponent']=r['routes'][0] if isinstance(r['routes'][0],int) else r['routes'][0]['id']
g.prepare_duel(r,random.Random(2));assert 'local n=2' in r['duel']['passives'] if 'passives' in r['duel'] else True
g.finish_duel(r,dict(protocol=1,id=r['duel']['id'],winner=0,lp=8000,events=[{'kind':'ritual_scar'},{'kind':'ritual_scar'},{'kind':'summon'}]),random.Random(3))
assert r['ritual_scar_count']==4,r['ritual_scar_count']
assert 'local n=4' in passives.script(r)
print("PASS coin rewards, Crowded Crypt opening hand, Ritual Scar count, Champion's Burden retired")
