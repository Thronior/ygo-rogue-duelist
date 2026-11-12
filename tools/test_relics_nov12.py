"""2026-11-12: Cursed Restock's shop rules, Dimensional Rift's rarity, the Yami Yugi and Mako Tsunami pack changes and
Enchanted Javelin's dev note. The relics' duel effects are tested in android/test_relics_nov12.mjs."""
import json,random,sys,tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import campaign as g,storage,content,approved_relics as ar,choice_relics,cursed_relics
from pack_odds import inspect_pack
base=Path(tempfile.mkdtemp());storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
p=storage.profile();p['unlocked']=list(content.PLAYABLE_IDS);storage.write(base/'profile.json',p)
checks=0
def ok(value,why):
 global checks
 assert value,why;checks+=1

def shop(artifacts):
 r=g.new_run(0,random.Random(5),0);r['artifacts']+=artifacts;r['cursed_artifacts']=[a for a in artifacts if a.startswith('cursed_')]
 r['stage']='shop';r['gold']=5000;r['round']=2;g.restock(r,random.Random(9));return r
def buyable(r):return [i for i,x in enumerate(r['shop']) if not x['sold'] and x['kind'] in ('single','pack')]

# Two free rerolls in each shop, then the usual prices.
r=shop(['cursed_cursed_restock'])
ok([g.reroll_shop(r,random.Random(n)) for n in range(3)]==[0,0,10],'two free rerolls, then 10 coins')
r['round']+=1;g.restock(r,random.Random(3))
ok(g.reroll_price(r)==0,'the next shop has its own two free rerolls')
# With Dice Jar too, its free reroll is used first: 3 free in all.
r=shop(['cursed_cursed_restock','dice_jar'])
ok([g.reroll_shop(r,random.Random(n)) for n in range(4)]==[0,0,0,10],'Dice Jar adds its own free reroll')

# One purchase per stock; a reroll opens the shop again.
r=shop(['cursed_cursed_restock']);items=buyable(r)
g.buy(r,items[0],random.Random(1))
try:g.buy(r,items[1],random.Random(1));ok(False,'a second purchase is refused')
except ValueError as error:ok('one item per reroll' in str(error),'a second purchase is refused')
ok(ar.restock_locked(r,r['shop'][items[1]]) and not ar.restock_locked(r,r['shop'][items[0]]),'the rest of the stock is locked, the bought item stays sold')
g.reroll_shop(r,random.Random(2));items=buyable(r)
ok(not r.get('restock_bought'),'a reroll opens the shop again')
g.buy(r,items[0],random.Random(1))
r2=shop(['cursed_cursed_restock'])
try:g.buy_many(r2,buyable(r2)[:2],random.Random(1));ok(False,'buying two at once is refused')
except ValueError as error:ok('one item per reroll' in str(error),'buying two at once is refused')
r3=shop([]);g.buy_many(r3,buyable(r3)[:2],random.Random(1))
ok(sum(x['sold'] for x in r3['shop'])==2,'without the relic several purchases work')
ok(not ar.eligible(dict(r3,history_mode='tag'),'cursed_cursed_restock') and ar.eligible(r3,'cursed_cursed_restock'),'offered in solo runs, not in Tag')

# Dimensional Rift is a very rare 300-coin relic, like The Creator.
ok(content.ARTIFACTS['dimensional_rift'][1]==300 and 'dimensional_rift' in choice_relics.VERY_RARE,'Dimensional Rift: 300 coins, very rare')
ok(content.ARTIFACTS['machine_duplication'][1]==110 and content.ARTIFACTS['ghost_destruction'][1]==80,'prices from the user')
ok({'cursed_anime_rule_3','cursed_cursed_restock'}<=set(cursed_relics.approved()),'Anime Rule #3 and Cursed Restock are cursed relics')

# Yami Yugi's pack: Exodia's five pieces only in the premium slot, at Ultra Rare weight; weak cards gone.
packs={x['id']:x for x in json.loads((g.ROOT/'data/packs.json').read_text(encoding='utf8'))}
yami=packs['DRAFT-YAMI-YUGI'];odds={x['id']:x['chance'] for x in inspect_pack('DRAFT-YAMI-YUGI',{})}
for name in ['Exodia the Forbidden One','Left Arm of the Forbidden One','Right Arm of the Forbidden One','Left Leg of the Forbidden One','Right Leg of the Forbidden One']:
 cid=g.BY_NAME[name]['id']
 ok(cid in yami['rare'] and cid not in yami['common'] and yami['rarities'][str(cid)]==['Ultra Rare'],name+' is an Ultra Rare in the premium slot')
 ok(odds[cid]<.012,name+' is in about 1 pack in 100')
for name in ['Beaver Warrior','Feral Imp','Ojama King','Shield Crush','Blackland Fire Dragon']:ok(g.BY_NAME[name]['id'] not in yami['common']+yami['rare'],name+' is out of the pack')
for name in ['Dark Magician','Dark Magician Girl','Magician of Faith','Skilled Dark Magician','Old Vindictive Magician','Granmarg the Rock Monarch','Giant Soldier of Stone']:ok(g.BY_NAME[name]['id'] in yami['common']+yami['rare'],name+' stays (Yugi Muto shares this pack)')
# Mako Tsunami: Orca Mega-Fortress of Darkness, with both of its Tribute cards already in the pack.
mako=packs['DRAFT-MAKO-TSUNAMI']
ok(all(g.BY_NAME[n]['id'] in mako['common']+mako['rare'] for n in ['Orca Mega-Fortress of Darkness','Torpedo Fish','Cannonball Spear Shellfish']),'Orca and its torpedoes are in Mako Tsunami\'s pack')

# Enchanted Javelin's dev note, in English and in every translation bundle.
ok(g.BY_ID[96355986]['desc'].endswith("(Dev note: this only works on your opponent's attacks)"),'English text ends with the dev note')
notes=json.loads((g.ROOT/'data/card-dev-notes.json').read_text(encoding='utf8'))['cards']['96355986']
for lang in ('de','es','fr','it','pt','ja','ko','zh'):
 bundle=json.loads((g.ROOT/f'android/web/i18n/{lang}.json').read_text(encoding='utf8'))
 ok(bundle['cards']['96355986'][1].endswith(notes[lang]),lang+' card text ends with the dev note')
 for key in ('Cursed Restock','You get 2 free rerolls per shop. You can only buy one item per reroll.','Coin Reward Pop-ups','Cursed Restock: you can only buy one item per reroll.',content.ARTIFACTS['dimensional_rift'][2],content.ARTIFACTS['cursed_anime_rule_3'][2]):ok(key in bundle['ui'],lang+': '+key[:40])
print('PASS Nov 12:',checks,'checks')
