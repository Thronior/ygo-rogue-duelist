"""Tag's larger shop (Nemu on Discord, user agreed 2026-11-20): two players split one shop, so Tag sells 2 more booster
packs (campaign_expansion.TAG_EXTRA_PACKS). Singles and the relic count stay as in solo play, and solo shops don't change."""
import sys,tempfile,random,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import storage,content,campaign as game,campaign_expansion as ce
(ROOT/'temp').mkdir(exist_ok=True)
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='tag-extra-packs-'));game.SAVE=storage.ROOT/'run.json'
from tag_campaign import TagCampaign
assert ce.TAG_EXTRA_PACKS==2
kinds=lambda shop:{k:sum(x['kind']==k for x in shop) for k in ('single','pack','artifact')}
p=storage.profile();p['unlocked']=list(range(len(content.CHARACTERS)));p['character_levels']={'0':2}
checked=0
for seed in range(6):
 s=TagCampaign([0,2],[p,p],level=0,seed=40+seed)
 def command(seat,action,value=None):return s.command(seat,{'id':uuid.uuid4().hex,'revision':s.revision,'action':action,'value':value})['result']
 for seat in (0,1):command(seat,'auto')
 r=s.players[0]['routes']
 command(1,'ready',{'opponent':r[1],'selected':s.players[1]['selected']});command(0,'ready',{'opponent':r[0],'selected':s.players[0]['selected']})
 s.finish(0,7000,[])
 assert s.phase=='shop',s.phase
 shop=s.shared['shop'];n=kinds(shop);packs=[x['id'] for x in shop if x['kind']=='pack']
 # The host's run rolls the shared stock: 10 singles, 5 packs (no repeats), the usual 3 relics.
 assert n['single']==10 and n['pack']==5 and n['artifact']==3,(seed,n)
 assert len(set(packs))==5,packs
 # Both players' character packs in every Tag shop (ATM, user 2026-11-21): this round's player, then the teammate's.
 own=[content.CHARACTERS[c]['pack'] for c in (0,2)]
 assert all(pid in packs for pid in own),(seed,own,packs)
 assert shop==s.players[0]['shop']==s.players[1]['shop'],'both seats see the shared stock'
 # A reroll keeps the larger shelf and the relic count.
 s.shared['gold']=s.players[0]['gold']=500;s.sync()
 command(0,'shop-lock',{'intent':'reroll'});command(1,'shop-lock',{'intent':'reroll'})
 n=kinds(s.shared['shop']);packs=[x['id'] for x in s.shared['shop'] if x['kind']=='pack']
 assert n['pack']==5 and n['artifact']==3 and n['single']==10 and len(set(packs))==5,(seed,n,packs)
 # Booster Shelf adds its pack on top: 6 in Tag.
 host=s.players[0]
 with s.scope(0):game.acquire_relic(host,'booster_shelf',random.Random(seed))
 assert sum(x['kind']=='pack' for x in host['shop'])==6,host['shop']
 with s.scope(0):game.restock(host,random.Random(seed))
 packs=[x['id'] for x in host['shop'] if x['kind']=='pack']
 assert len(packs)==6 and len(set(packs))==6 and kinds(host['shop'])['artifact']==3,packs
 checked+=1
# Solo shops are unchanged: 10 singles, 3 packs (4 with Booster Shelf), 3 relics.
for seed in range(6):
 run=game.new_run(0,random.Random(seed));run['stage']='shop'
 game.restock(run,random.Random(seed));n=kinds(run['shop'])
 assert n=={'single':10,'pack':3,'artifact':3},(seed,n)
 run['artifacts']=run['artifacts']+['booster_shelf'];game.restock(run,random.Random(seed))
 assert kinds(run['shop'])['pack']==4
assert ce.shop_pack_count({'artifacts':[]})==3 and ce.shop_pack_count({'artifacts':[],'history_mode':'tag'})==5
print(f'PASS: Tag shops sell 5 packs (6 with Booster Shelf) with 10 singles and 3 relics in {checked} runs, rerolls included; solo shops keep 3 packs')
