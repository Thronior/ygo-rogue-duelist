import sys,tempfile,random,json
from pathlib import Path
from copy import deepcopy
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import campaign as g,storage,content,challenge_levels as cl,secret_challenge,approved_relics as ar
from tag_campaign import TagCampaign
if True:
 td=ROOT/'temp/update32-tests';td.mkdir(parents=True,exist_ok=True)
 storage.ROOT=Path(td)/'saves';g.RUNTIME=Path(td)/'runtime';g.RUNTIME.mkdir(exist_ok=True)
 p=storage.profile();p.update(unlocked=list(range(len(content.CHARACTERS))),relicless_unlocked=True);storage.write(storage.ROOT/'profile.json',p)
 for char in content.PLAYABLE_IDS:assert cl.validate(char,-1)==-1
 r=g.new_run(0);g.auto_deck(r);r.update(stage='shop',gold=10000,opponent=r['routes'][0]);g.restock(r,random.Random(1))
 for count,price in enumerate([10,20,40,60,100,150,200,250,300,350,400,450]):
  assert g.reroll_price(r)==price
  gold=r['gold'];g.reroll_shop(r,random.Random(count));assert r['gold']==gold-price and r['shop_rerolls']==count+1
 g.save(r);loaded=g.load_run();assert loaded['shop_rerolls']==12
 r['gold']=0;old=deepcopy(r)
 try:g.reroll_shop(r);raise AssertionError('charged insufficient funds')
 except ValueError:assert r==old
 r['gold']=100;r['artifacts']=['ankh'];r['curses']=['drain'];r['cursed_artifacts']=['cursed_loaded_purse'];before=deepcopy(r)
 p=storage.profile();p.pop('relicless_unlocked',None);storage.write(storage.ROOT/'profile.json',p)
 secret=secret_challenge.relicless(g,r);assert r==before;assert storage.read(storage.ROOT/'before-relicless-secret-run.json')==before
 assert not secret['artifacts'] and not secret['curses'];req=g.prepare_duel(secret,random.Random(1));assert req['lp']==8000
 assert len(req['enemy_deck'])>=40
 g.finish_duel(secret,dict(protocol=1,id=req['id'],lp=8000,winner=0,events=[]),random.Random(1));assert storage.profile()['relicless_unlocked'] and secret['stage']=='complete'
 for rd in (0,2):
  r=g.new_run(0);g.auto_deck(r);r.update(round=rd,shop_rerolls=7);g.routes(r,random.Random(1));r['opponent']=r['routes'][0];req=g.prepare_duel(r,random.Random(1));g.finish_duel(r,dict(protocol=1,id=req['id'],lp=8000,winner=0,events=[]),random.Random(1));assert r['shop_rerolls']==(0 if rd==2 else 7)
 for char in (0,37,38):
  r=g.new_run(char,level=-1);assert not r['artifacts'];r.update(stage='shop',opponent=r['routes'][0]);g.restock(r,random.Random(9));assert not any(x['kind']=='artifact' for x in r['shop'])
 for loop in (0,1,2):
  for rd in range(9):
   for opponent in content.GAME_DECKS:
    record=content.opponent_record(rd,opponent,loop)
    assert record['tier']==(4 if loop else rd//3+1)
    assert set(record['main']+record['extra'])<=set(g.BY_ID)
 s=TagCampaign([0,1],[p,p],seed=23,lobby=True);s.phase='shop';s.shop_seat=0;s.shared['gold']=100
 s.sync();s.players[0]['stage']='shop';s.players[0]['opponent']=2
 with s.scope(0):g.restock(s.players[0],random.Random(1))
 s.shared['shop']=deepcopy(s.players[0]['shop']);s.sync()
 s.apply(0,'shop-reroll',None);assert s.shared['gold']==90 and s.shared['shop_rerolls']==1 and s.shop_seat==0 and s.phase=='shop'
 try:s.apply(1,'shop-reroll',None);raise AssertionError('wrong seat allowed')
 except ValueError:pass
 assert all(r['shop_rerolls']==1 for r in s.players)
 p=storage.profile();p['relicless_unlocked']=True
 guest=deepcopy(p);guest.pop('relicless_unlocked',None)
 from unittest.mock import patch
 with patch.dict(content.CHARACTERS[1],starting_relic='ankh'):
  tag=TagCampaign([0,1],[p,guest],seed=22,lobby=True,level=-1);assert tag.shared['lp']==8000 and not tag.shared['artifacts']
 print('PASS reroll prices/persistence/authorization, secret backup/champion/unlock, relicless shops/all characters, 594 tier mappings, shared tag reroll')




