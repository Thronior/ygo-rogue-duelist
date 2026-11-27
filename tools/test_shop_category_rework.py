"""Shop category rework (user, 2026-11-26): merged/renamed/new categories, broad shelves that follow the Deck,
Type/Attribute support x1.5, weak (Stinkers) Normal Monsters x0.5, labels translated, icons and relics present."""
import json,random,re,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,shop_rewards as s,relic_affinity as ra,content,custom_cards
N=g.BY_NAME;keys=s.reward_keys()
# Renames, merges and retired keys (old saves map onto the new ones).
assert s.LABELS['exodia']=='Exodia' and s.LABELS['summon']=='Special Summons' and s.LABELS['direct']=='Piercing and direct attacks'
for old,new in [('pierce','direct'),('hole','staple_trap'),('normal_spell','spell'),('normal_trap','trap')]:
 assert old not in keys and s.normalize_reward({'key':old,'label':'x','pack':'EN-LOB'})['key']==new,old
new_keys={'staple_trap','staple_spell','staple_monster','spell','trap','lv','tribute','spell_counter','token','search','blueeyes','ninja','chaos','ojama'}
assert new_keys<=set(keys) and 'redeyes' not in keys
# Every Type and every Attribute but the retired Divine-Beast is a category.
assert set(s.MONSTER_TYPES)|set(s.ATTRIBUTES)<=set(keys)
themed=[c for c in g.CARDS if c['id'] not in custom_cards.IDS]
size={k:sum(s.matches(c,k) for c in themed) for k in keys}
assert all(size[k]>=8 for k in new_keys),{k:size[k] for k in new_keys}
assert size['spell']>300 and size['trap']>250,size
# Pools.
M=lambda n,k:s.matches(N[n],k)
assert M('Exxod, Master of The Guard','exodia') and s.is_core(N['Exxod, Master of The Guard'],'exodia') and M('Exodia Necross','exodia')
assert M('Dark Factory of Mass Production','exodia') and M('Pot of Greed','exodia') and not s.is_core(N['Pot of Greed'],'exodia')
assert M('Spear Dragon','direct') and M('Jowls of Dark Demise','direct')
assert M('Mystical Space Typhoon','spell') and M('Polymerization','spell') and not M('Black Luster Ritual','spell') and M('Magic Jammer','trap')
assert M('Mirror Force','staple_trap') and M('Pot of Greed','staple_spell') and M('Sangan','staple_monster') and not M('Sangan','staple_spell')
assert M('Armed Dragon LV5','lv') and M('Level Up!','lv') and M('Zaborg the Thunder Monarch','tribute') and not M('Scapegoat','tribute')
assert M('Royal Magical Library','spell_counter') and M('Scapegoat','token') and M('Sangan','search')
assert M('Blue-Eyes White Dragon','blueeyes') and M('Armed Ninja','ninja') and M('Chaos Sorcerer','chaos') and M('Ojama Yellow','ojama')
# Hand return and Discard are a little narrower.
assert not M('Asura Priest','bounce') and M('Compulsory Evacuation Device','bounce') and 50<=size['bounce']<=58
assert not M('Magic Jammer','discard') and M('Delinquent Duo','discard') and 90<=size['discard']<=101
# Shelf weights: Type/Attribute support x1.5, weak Normal Monsters x0.5 except in Normal Monsters.
assert s.focus_weight(N['Umi'],'Fish')==s.SUPPORT_WEIGHT and s.focus_weight(N['Umi'],'WATER')==s.SUPPORT_WEIGHT
weak=next(c for c in themed if s.weak_normal(c) and c['race']=='Fish' and not s.supports(c,'Fish'))
assert s.focus_weight(weak,'Fish')==s.WEAK_NORMAL_WEIGHT and s.focus_weight(weak,'normal')==1.0
assert not s.weak_normal(N['Blue-Eyes White Dragon'])
# Which featured cards follow the Deck.
assert s.deck_weighted_slots('Fish')==5 and s.deck_weighted_slots('DARK')==5 and s.deck_weighted_slots('spell')==3 and s.deck_weighted_slots('trap')==3
assert s.deck_weighted_slots('harpie')==0 and s.deck_weighted_slots('normal_spell')==3 and s.deck_weighted_slots('spell',3)==2
# Every category has an opponent-screen weight, a relic mapping (all real relics) and an icon; every label is translated.
ceil=json.loads(ra.CATEGORY_CEILINGS_FILE.read_text(encoding='utf8'));assert set(keys)<=set(ceil),set(keys)-set(ceil)
assert set(keys)<=set(s.CATEGORY_RELICS) and all(r in content.ARTIFACTS for v in s.CATEGORY_RELICS.values() for r in v)
icons=(ROOT/'android/web/reward-icons.js').read_text(encoding='utf8')
assert all(k in s.ATTRIBUTES or k in s.MONSTER_TYPES or re.search(r'\b'+k+r':',icons) for k in keys),[k for k in keys if not re.search(r'\b'+k+r':',icons)]
for lang in ['de','es','fr','it','ja','ko','pt','zh']:
 table=json.loads((ROOT/f'data/i18n/ui/{lang}.json').read_text(encoding='utf-8-sig'))
 missing=[s.LABELS[k] for k in keys if s.LABELS[k] not in table];assert not missing,(lang,missing)
# The opponent screen still offers 5 different categories and packs with a Deck.
HARPIE=[c['id'] for c in g.CARDS if 'Harpie' in c['name']]
deck=lambda ids:{'pool':ids,'selected':list(range(len(ids))),'round':1,'artifacts':[],'character':0}
rng=random.Random(9)
for _ in range(30):
 r=s.route_rewards([1,2,3,4,5],rng,None,deck(HARPIE*4))
 assert len({v['key'] for v in r.values()})==5 and len({v['pack'] for v in r.values()})==5
 # Guaranteed shop relics: every opponent has one, all different, all ones the shop could offer.
 relics=[v.get('relic') for v in r.values()];pool=set(g.shop_relic_pool(deck(HARPIE*4)))
 assert all(relics) and len(set(relics))==5 and set(relics)<=pool,relics
# No run (old callers, tests): no relic.
assert all('relic' not in v for v in s.route_rewards([1,2,3],random.Random(1),None,None).values())
# Weighted opponents lean on their category's relics; the 2 random ones don't.
run=deck(HARPIE*4);pool=list(g.shop_relic_pool(run));fav=s.category_relics('harpie');w_hits=r_hits=0
for seed in range(300):
 picked=s.route_relics(['harpie']*2,[True,False],run,random.Random(seed))
 w_hits+=picked[0] in fav;r_hits+=picked[1] in fav
assert w_hits>3*max(1,r_hits),(w_hits,r_hits)
# The shop after the duel stocks the beaten opponent's relic; a reroll doesn't have to.
from unittest.mock import patch
import storage
profile=storage.profile()
with patch.object(storage,'profile',return_value=profile):
 for seed in range(40):
  rr=dict(character=seed%30,opponent=0,artifacts=[],bias='Fish',shop_reward={'key':'Fish','label':'x','pack':'EN-LOB','relic':'tide'})
  g.restock(rr,random.Random(seed))
  assert 'tide' in [x['id'] for x in rr['shop'] if x['kind']=='artifact'],seed
  assert 'tide' not in (rr.get('relic_locks') or [])
 # Tag: both opponents' relics.
 rr=dict(character=1,opponent=0,artifacts=[],bias='Fish',history_mode='tag',tag_shop_rewards=[{'key':'Fish','label':'x','pack':'EN-LOB','relic':'tide'},{'key':'DARK','label':'y','pack':'EN-MRD','relic':'dark'}])
 g.restock(rr,random.Random(3));arts=[x['id'] for x in rr['shop'] if x['kind']=='artifact']
 assert 'tide' in arts and 'dark' in arts,arts
print('PASS category rework: renames/merges, new categories, narrower bounce/discard, shelf weights, deck-weighted slots, ceilings, relics, icons, labels, guaranteed shop relics')
