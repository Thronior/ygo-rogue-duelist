"""Relic Mirror: which relics the opponent gets, and what they change at the start of a duel."""
import sys,json,random,re,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,content as c,passives,challenge_levels
from feedback_update import opponent_relic
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='relic-mirror-'));g.SAVE=storage.ROOT/'run.json'
profile=storage.profile();profile['unlocked']=list(c.PLAYABLE_IDS);storage.write(storage.ROOT/'profile.json',profile)

def boss(artifacts,seed=7,level=0,curses=('relic_mirror',)):
 r=g.new_run(1,random.Random(seed));g.auto_deck(r);r.update(stage='shop',round=2,challenge_level=level)
 r['artifacts']=list(artifacts);r.pop('cursed_offer',None)
 g.routes(r);r['opponent']=r['routes'][0] if isinstance(r['routes'][0],int) else r['routes'][0]['id']
 r['route_curses'][str(r['opponent'])]=list(curses)
 g.prepare_duel(r,random.Random(seed))
 lua=(g.RUNTIME/'puzzles/shadow-run.lua').read_text(encoding='utf8')
 info=re.findall(r'Debug.SetPlayerInfo\((\d),(\d+),(\d+),1\)',lua)
 return r,dict(lp=int(info[0][1]),hand=int(info[0][2]),enemy_lp=int(info[1][1]),enemy_hand=int(info[1][2])),lua

SHOP=['interest','bargain','map'];DUEL=['sword','flame','pierce']
# Base: 2 relics that can do something in a duel, never a shop or coin relic.
r,_,lua=boss(SHOP+DUEL)
assert len(r['mirrored_relics'])==2 and set(r['mirrored_relics'])<=set(DUEL),r['mirrored_relics']
assert 'Duel.RegisterEffect(' in lua
again,_,_=boss(SHOP+DUEL);assert again['started_at']!=None
same=dict(r);assert passives.mirror_relics(same)==r['mirrored_relics'],'the same duel keeps the same copies'
one,_,_=boss(SHOP+['sword']);assert one['mirrored_relics']==['sword'],'only 1 relic to copy'
none,_,_=boss(SHOP);assert none['mirrored_relics']==[],'shop relics have nothing to copy'

# Amplified: 4 random ones (2026-11-05, was all of them), and duplicates count.
r,_,_=boss(SHOP+DUEL+['sword'],level=2)
assert sorted(r['mirrored_relics'])==sorted(DUEL+['sword']),r['mirrored_relics']
r,_,_=boss(SHOP+DUEL+['sword','glass_shard','sword'],level=2)
assert len(r['mirrored_relics'])==4 and all(k in DUEL+['sword','glass_shard'] for k in r['mirrored_relics']),r['mirrored_relics']

# It only happens with the curse, and Relic Seal leaves nothing to copy.
r,_,_=boss(DUEL,curses=('frailty',));assert r['mirrored_relics']==[]
r,_,_=boss(DUEL,curses=('relic_seal','relic_mirror'),level=2);assert r['mirrored_relics']==[]
# Protection Charm can lift the curse for this duel.
r,_,_=boss(DUEL+['protection_charm'],level=0,curses=('relic_mirror',))
assert r['charmed_curse']=='relic_mirror' and r['mirrored_relics']==[]

# Relics that change the start of a duel are copied too, in the opponent's favour.
plain=boss(['eye'],curses=('frailty',))[1];copied=boss(['eye'],level=0)[1]
assert copied['enemy_hand']==plain['enemy_hand']+c.ART_INFO['eye']['amount'],'an opening-hand relic adds to the opponent\'s hand'
assert copied['hand']==plain['hand'],'your own hand is unchanged'
plain=boss(['seal'],curses=('frailty',))[1];copied=boss(['seal'],level=0)[1]
assert copied['lp']==plain['lp']-c.ART_INFO['seal']['amount'],'an LP-cut relic now cuts your LP'
assert copied['enemy_lp']==plain['enemy_lp'],'and your copy of it still cuts theirs'
plain=boss(['glass_shard'],curses=('frailty',))[1];copied=boss(['glass_shard'],level=0)[1]
assert copied['enemy_lp']==c.ART_INFO['glass_shard']['amount']

# The CPU, the curse dialog and the duel's relic strip all see the copies.
r,_,lua=boss(DUEL,level=2)
ai=json.loads(re.search(r'-- SHADOW_RUN_AI (.*)',lua).group(1))
assert ai['activeRelics'][1]==r['mirrored_relics'] and [x['effect'] for x in ai['statRelics'][1]]==[c.ART_INFO[k]['effect'] for k in r['mirrored_relics']]
assert lua.count('-- SHADOW_RUN_AI')==1,'the mirrored script does not repeat the header'
rows=[x for x in challenge_levels.active_modifiers(r) if x['kind']=='opponent-relic']
assert [x['id'] for x in rows]==r['mirrored_relics'],rows
assert len(json.dumps(ai))<20000

# A LVL 5 opponent keeps its own relic alongside the copies.
r,_,lua=boss(['interest','sword'],level=5)
enemy=opponent_relic(r);ai=json.loads(re.search(r'-- SHADOW_RUN_AI (.*)',lua).group(1))
assert ai['activeRelics'][1]==[enemy,'sword'],ai['activeRelics'][1]
assert [x['id'] for x in challenge_levels.active_modifiers(r) if x['kind']=='opponent-relic']==list(dict.fromkeys([enemy,'sword']))
# The copy carries only the copied relics: the swapped side must not hand the opponent's own relic or Endless buff to the player (2026-11-05).
mirror=passives.mirrored_script(dict(r,loop=1))
assert 'Duel.RegisterEffect(e,1) end' not in mirror,'the opponent relic block is not inside the mirrored script'
assert 'Duel.RegisterEffect(e,1) end' in passives.script(r,telemetry=False),'the opponent still has its own relic'
print('PASS Relic Mirror: picks, start-of-duel relics, Relic Seal, Protection Charm, CPU data and curse dialog')
