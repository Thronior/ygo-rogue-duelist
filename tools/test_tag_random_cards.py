"""Random Packs in Tag (user, 2026-11-16): the host rolls a seed per pack, keeps it in that player's run, and both
devices build the same cards from it (random_cards.tag_pack / draft_cards), in the seat's id blocks."""
import sys,json,uuid,random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT));sys.path.insert(0,str(ROOT/'android'))
import storage,campaign as g,random_cards,campaign_expansion as cx
base=ROOT/'temp'/('tag-random-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base;g.SAVE=base/'run.json'
from tag_campaign import TagCampaign
p=storage.profile();p['unlocked']=[0,1];p['character_levels']={'0':2}
s=TagCampaign([0,1],[p,p],level=0,seed=11)
assert [r['tag_seat'] for r in s.players]==[0,1]
# Seat 1 buys a Random Pack from the shared shop.
s.shared['gold']=999;s.sync();run=s.players[1];run['stage']='shop';run['gold']=999
run['shop'].append(dict(kind='pack',id=random_cards.RANDOM_PACK,price=35,sold=False,opponent_pack=False))
with s.scope(1):got=g.buy_many(run,[len(run['shop'])-1],random.Random(3))
ids=got[0]['cards'] if isinstance(got[0],dict) and 'cards' in got[0] else [c for x in got for c in (x.get('cards') or [])]
assert len(ids)==9,got
first=random_cards.DRAFT_FIRST+random_cards.DRAFT_SEAT
assert all(first<=c<first+random_cards.DRAFT_BLOCK for c in ids),ids
assert all(c in run['pool'] and c in g.BY_ID for c in ids)
assert run['random_boosters'] and len(run['random_boosters'])==1
view=s.view(0);assert view['randomBoosters']==[[],run['random_boosters']],view['randomBoosters']
# The partner's device builds the same cards from the seeds alone.
built=random_cards.draft_cards({'players':view['randomBoosters']})
assert built['boosters'][1][0]==ids and [c['card']['name'] for c in built['cards']]==[g.BY_ID[c]['name'] for c in ids]
# A reloaded host registers them again from the seeds.
for c in ids:g.BY_ID.pop(c,None)
restored=TagCampaign.restore(json.loads(json.dumps(s.checkpoint())))
assert all(c in g.BY_ID for c in ids) and restored.players[1]['random_boosters']==run['random_boosters']
# Absolute Random: a free pack for each player after a win, with its own seed in each seat's block.
for r in s.players:r['artifacts'].append('absolute_random')
assert cx.shop_relic_eligible(dict(s.players[0],artifacts=[]),'absolute_random')
for seat,r in enumerate(s.players):
 packs=random_cards.free_pack(r,random.Random(seat))
 assert len(packs)==1 and len(packs[0]['cards'])==9
 lo=random_cards.DRAFT_FIRST+seat*random_cards.DRAFT_SEAT;assert all(lo<=c<lo+random_cards.DRAFT_SEAT for c in packs[0]['cards'])
s.players[0]['free_packs']=[{'id':random_cards.RANDOM_PACK,'cards':[]}]
s.command(0,{'id':uuid.uuid4().hex,'revision':s.revision,'action':'free-packs-seen','value':None});assert s.players[0]['free_packs']==[]
# The shop can stock it in Tag now (1 in 20 shops, second booster slot only).
host=s.players[0];seen=0;host['opponent']=host.get('opponent') or 2
for k in range(300):
 host['stage']='shop';g.restock(host,random.Random(k))
 packs=[x['id'] for x in host['shop'] if x['kind']=='pack']
 if random_cards.RANDOM_PACK in packs:seen+=1;assert packs.index(random_cards.RANDOM_PACK)==1
assert 3<=seen<=40,seen
print(f'PASS: Tag Random Packs seeded per seat, rebuilt on restore and on the partner device; Absolute Random; shop slot in {seen}/300')
