"""Removed relics are gone from the game, but saved runs and Tag rooms that hold them still load."""
import sys,random,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,content as c,cursed_relics,approved_relics as ar
from tag_campaign import TagCampaign
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='removed-relics-'));g.SAVE=storage.ROOT/'run.json'
profile=storage.profile();profile['unlocked']=list(c.PLAYABLE_IDS);storage.write(storage.ROOT/'profile.json',profile)
HEX='cursed_shared_hex';KEPT='cursed_blood_crown'
assert not {HEX}&(set(c.ARTIFACTS)|set(c.ART_INFO)|set(cursed_relics.approved())|set(ar.CURSED_IDS))
assert not ar.eligible({'character':1},HEX)

# A saved run keeps going: only the removed relic leaves, and its stale offer is redrawn.
r=g.new_run(1,random.Random(3));g.auto_deck(r);r.update(stage='shop',mirror_copy=HEX,cursed_artifacts=[HEX,KEPT])
r['artifacts']=list(r['artifacts'])+[HEX,KEPT]
r['shop'].append({'kind':'artifact','id':HEX,'price':1,'sold':False})
r['cursed_offer']={'options':[HEX,'cursed_hollow_chalice','cursed_loaded_purse'],'rerolls_left':1,'boss_round':2}
g.save(r)
loaded=g.load_run()
assert loaded,'a run holding a removed relic must not be discarded'
assert HEX not in loaded['artifacts'] and KEPT in loaded['artifacts'] and loaded['cursed_artifacts']==[KEPT]
assert 'mirror_copy' not in loaded and not any(item.get('id')==HEX for item in loaded['shop'])
assert len(loaded['cursed_offer']['options'])==3 and all(k in c.ARTIFACTS for k in loaded['cursed_offer']['options'])

# So does a Tag room, including a finale draft that indexes into its relic pool.
s=TagCampaign([0,1],[profile,profile],seed=12)
for run in s.players:g.auto_deck(run)
s.shared.update(artifacts=['eye',HEX],cursed_artifacts=[HEX],cursed_offer={'options':[HEX,KEPT,'cursed_hollow_chalice'],'rerolls_left':1,'boss_round':2});s.sync()
s.finale.update(pool=[HEX,'eye','razor'],remaining=[0,2],picks=[[HEX],['eye']])
restored=TagCampaign.restore(s.checkpoint())
assert restored.shared['artifacts']==['eye'] and restored.shared['cursed_artifacts']==[]
assert all(run['artifacts']==['eye'] for run in restored.players)
assert restored.finale['pool']==['eye','razor'] and restored.finale['remaining']==[1] and restored.finale['picks']==[[],['eye']]
offer=restored.shared['cursed_offer']['options']
assert len(offer)==3 and all(k in c.ARTIFACTS for k in offer) and all(run['cursed_offer']['options']==offer for run in restored.players)
print('PASS removed relics: gone from the game; saved runs and Tag rooms still load without them')
