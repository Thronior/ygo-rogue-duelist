"""Coin cap (2026-11-02): coins stop at 999,999, and a run saved above it opens instead of being refused."""
import sys,random,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,content as c
from tag_campaign import TagCampaign
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='coin-cap-'));g.SAVE=storage.ROOT/'run.json'
r=g.new_run(1,random.Random(1));g.auto_deck(r);r.update(stage='shop',_save_slot=1)
# Aevis: an existing save well past the old limit, written directly so nothing clamps it first.
over=dict(r,gold=1_200_000_000,lp=2_000_000);storage.write(storage.run_path(1),over)
loaded=g.load_run(1)
assert loaded and loaded['gold']==c.MAX_COINS and loaded['lp']==c.MAX_LP,loaded and (loaded['gold'],loaded['lp'])
loaded['gold']=c.MAX_COINS+5000;g.save(loaded);assert loaded['gold']==c.MAX_COINS
assert g.load_run(1)['gold']==c.MAX_COINS
# Below the cap nothing changes, and spending lowers the real value: the infinity is display only.
loaded['gold']=c.MAX_COINS-100;g.save(loaded);assert g.load_run(1)['gold']==c.MAX_COINS-100
p=storage.profile();t=TagCampaign([0,1],[p,p],seed=7);t.shared['gold']=c.MAX_COINS*3;t.sync()
assert t.shared['gold']==c.MAX_COINS and all(x['gold']==c.MAX_COINS for x in t.players)
print('PASS coin cap: oversized saves load, saves and Tag clamp, spending still counts')
