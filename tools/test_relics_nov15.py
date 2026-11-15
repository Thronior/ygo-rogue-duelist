"""2026-11-15 Discord review: Magician's Bond, Blue-Eyes Radiance, Master and Apprentice, Black Chaos Rite, Dragon Lord's
Decree, Twin Eyes, Dragon Blood Fusion, Titan's Charge and the cursed relic Poison of the Old Man. Campaign side: texts,
prices, card lists, the Deck rules for the shop, weights (archetype themes, rules, the hidden loadout lists), Relic Mirror,
art and translations. The duel effects are tested in android/test_relics_nov15.mjs."""
import json,random,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,content,storage,passives,archetype_relics,relic_affinity,shop_rewards,campaign_expansion,cursed_relics
import approved_relics as ar,approved_relic_effects as fx
base=Path(tempfile.mkdtemp(prefix='relics-nov15-',dir=ROOT/'temp'));storage.ROOT=base;g.SAVE=base/'run.json'
profile=storage.profile();profile['unlocked']=list(content.PLAYABLE_IDS);storage.write(base/'profile.json',profile)
checks=0
def ok(value,why):
 global checks
 assert value,why;checks+=1

A=content.ARTIFACTS
# The user's texts, word for word (real card-text conventions).
NEW={
 'magicians_bond':("Magician's Bond",90,'Once per turn, if you Normal Summon a "Dark Magician" monster: You can add 1 card that mentions "Dark Magician" from your Deck to your hand.',"Sage's Stone"),
 'blue_eyes_radiance':('Blue-Eyes Radiance',85,'Once per turn: You can send 3 "Blue-Eyes White Dragon" from your hand and/or field to the GY; Special Summon 1 "Blue-Eyes Shining Dragon" from your hand or Deck, ignoring its Summoning conditions. It is unaffected by other card effects until the end of your opponent\'s next turn.','Blue-Eyes Shining Dragon'),
 'master_and_apprentice':('Master and Apprentice',100,'Once per turn, if a "Dark Magician" monster you control is destroyed: You can Special Summon 1 "Dark Magician" monster from your hand, ignoring its Summoning conditions.','Dark Magician Girl'),
 'black_chaos_rite':('Black Chaos Rite',110,'Once per Duel: You can Tribute 1 "Dark Magician" you control; Special Summon 1 "Dark Magician of Chaos" from your hand or Deck, ignoring its Summoning conditions.','Dark Magician of Chaos'),
 'dragon_lords_decree':("Dragon Lord's Decree",90,'Once per Duel: You can discard 2 Dragon monsters; Special Summon 1 Level 7 or higher Dragon monster from your hand.','Lord of D.'),
 'twin_eyes':('Twin Eyes',150,'Once per Duel, during your first Standby Phase: Special Summon 1 "Blue-Eyes" or "Red-Eyes" monster from your Deck in Attack Position.','Red-Eyes Black Dragon'),
 'dragon_blood_fusion':('Dragon Blood Fusion',100,'Once per turn: You can banish 1 "Blue-Eyes" or "Red-Eyes" monster you control; Special Summon 1 Fusion Monster from your Extra Deck that lists the banished monster as Fusion Material, ignoring its Summoning conditions.','Blue-Eyes Ultimate Dragon'),
 'titans_charge':("Titan's Charge",100,"Once per turn, when a Level 7 or higher monster you control destroys an opponent's monster by battle: It can make a second attack in a row.",'Tyrant Dragon'),
}
CURSE='cursed_poison_of_the_old_man'
for key,(name,price,text,art) in NEW.items():
 ok(A[key][:3]==(name,price,text),f'{name}: {price} coins and the agreed text')
 ok(content.ART_INFO[key]['art']==art and art in g.BY_NAME,f'{name}: art {art}')
ok(A[CURSE][0]=='Poison of the Old Man' and A[CURSE][2]=='Once per turn, during your End Phase: Toss a coin. Heads: Gain 500 LP. Tails: Lose 500 LP.','Poison of the Old Man text')
ok(content.ART_INFO[CURSE]['art']=='Poison of the Old Man','Poison of the Old Man art')
ok(CURSE in cursed_relics.approved() and CURSE in ar.CURSED_IDS,'the curse is offered after bosses')
ok(ar.CURSED_PARTS[CURSE]==('Once per turn, during your End Phase: Toss a coin. Heads: Gain 500 LP.','Tails: Lose 500 LP.'),'the cursed screen splits heads from tails')
ok(not any(k in A for k in ('dragon_riders_pact',)) and sum(a[0]=="Titan's Charge" for a in A.values())==1,"Titan's Charge has a unique name")
# No relic art is used twice.
arts=[content.ART_INFO[k]['art'] for k in list(NEW)+[CURSE]]
others={v['art'] for k,v in content.ART_INFO.items() if k not in NEW and k!=CURSE}
ok(len(set(arts))==len(arts) and not set(arts)&others,'new art not used by any other relic')
# Weighting stays hidden: no player-visible text mentions it.
for key in list(NEW)+[CURSE]:ok(not any(w in A[key][2].lower() for w in ('appear','weight','often','chance')),key+' text says nothing about offers')

# The card lists in the scripts match the card list.
monsters=lambda test:sorted(c['id'] for c in g.CARDS if c['data']['type']&1 and test(c))
ok(sorted(fx.DARK_MAGICIANS)==monsters(lambda c:'Dark Magician' in c['name']),'"Dark Magician" monsters: every monster whose name includes it')
ok(sorted(fx.DARK_MAGICIAN_MENTIONS)==sorted(c['id'] for c in g.CARDS if '"Dark Magician"' in c.get('desc','')),'cards that mention "Dark Magician"')
ok(sorted(fx.EYES)==monsters(lambda c:'Blue-Eyes' in c['name'] or 'Red-Eyes' in c['name']),'"Blue-Eyes" and "Red-Eyes" monsters')
for name,code in (('Dark Magician',fx.DARK_MAGICIAN),('Dark Magician of Chaos',fx.DARK_MAGICIAN_OF_CHAOS),('Blue-Eyes White Dragon',fx.BEWD),('Blue-Eyes Shining Dragon',fx.SHINING)):ok(g.BY_NAME[name]['id']==code,name)
for key in list(NEW)+[CURSE]:ok(passives.acts_in_duel(key),key+' changes the Duel')

# Shop: Magician's Bond needs a "Dark Magician" monster in the current Deck, Blue-Eyes Radiance a Blue-Eyes White Dragon.
def deck_run(names,extra_pool=()):
 r=g.new_run(0,random.Random(5),0);g.auto_deck(r)
 ids=[g.BY_NAME[n]['id'] for n in names]
 r['pool']=ids+[g.BY_NAME[n]['id'] for n in extra_pool];r['selected']=list(range(len(ids)));return r
filler=['Battle Ox','Mystical Elf','Waboku','Dark Hole']*5
for key,needs,other in (('magicians_bond','Skilled Dark Magician','Dark Magician Girl'),('blue_eyes_radiance','Blue-Eyes White Dragon','Blue-Eyes Shining Dragon')):
 ok(not campaign_expansion.shop_relic_eligible(deck_run(filler,[needs]),key),key+': card only in the pool, not offered')
 ok(campaign_expansion.shop_relic_eligible(deck_run(filler+[needs]),key),key+': card in the Deck, offered')
ok(campaign_expansion.shop_relic_eligible(deck_run(filler+['Dark Magician Girl']),'magicians_bond'),'any "Dark Magician" monster counts')
ok(not campaign_expansion.shop_relic_eligible(deck_run(filler+['Blue-Eyes Shining Dragon']),'blue_eyes_radiance'),'Shining Dragon alone is not enough')
for key in ('master_and_apprentice','black_chaos_rite','twin_eyes','dragon_blood_fusion'):ok(not campaign_expansion.shop_relic_eligible(deck_run(filler),key),key+': archetype relics need one of their cards in the pool')
ok(campaign_expansion.shop_relic_eligible(deck_run(filler,['Thousand Knives']),'master_and_apprentice'),'Master and Apprentice has no Deck rule: a Dark Magician card in the pool is enough')
ok(campaign_expansion.shop_relic_eligible(deck_run(filler,['Red-Eyes Black Dragon']),'twin_eyes'),'Twin Eyes with Red-Eyes Black Dragon in the pool')

# Weights. The Dark Magician, Blue-Eyes and Red-Eyes relics weigh as archetypes; Dragon Lord's Decree with Level 7+ Dragons,
# Titan's Charge with Level 7+ monsters (like Boss Monster), the curse with coin cards (like Jester's Coin).
empty={'artifacts':[],'pool':[]}
dm=archetype_relics.member_test('magicians_bond',empty)
ok(dm(g.BY_NAME['Dark Magician']) and dm(g.BY_NAME['Thousand Knives']) and not dm(g.BY_NAME['Battle Ox']),'Dark Magician archetype test')
eyes=archetype_relics.member_test('twin_eyes',empty);blue=archetype_relics.member_test('blue_eyes_radiance',empty)
ok(eyes(g.BY_NAME['Red-Eyes Black Dragon']) and eyes(g.BY_NAME['Blue-Eyes White Dragon']) and not blue(g.BY_NAME['Red-Eyes Black Dragon']),'Blue-Eyes / Red-Eyes tests')
ok(relic_affinity.RULES['titans_charge']==relic_affinity.RULES['boss_monster'],"Titan's Charge weighs like Boss Monster")
ok('level:7+dragon' in relic_affinity.card_tags(g.BY_NAME['Blue-Eyes White Dragon']) and 'level:7+dragon' not in relic_affinity.card_tags(g.BY_NAME['Dark Magician']),'Level 7+ Dragon tag')
ok('level:7+dragon' not in relic_affinity.card_weight_tags(g.BY_NAME['Blue-Eyes White Dragon']),'relic-only tag leaves single-card weights alone')
ok(relic_affinity.RULES[CURSE]==relic_affinity.RULES['cursed_jesters_coin'],'the curse weighs with coin cards')
mapped=set().union(*shop_rewards.CATEGORY_RELICS.values())
for key in NEW:ok(key in mapped,key+' has a shop category')
for key in ('magicians_bond','master_and_apprentice','black_chaos_rite'):
 ok(key in shop_rewards.CATEGORY_RELICS['darkmagician'],key+': Dark Magician category')
 for variant in (0,1):ok(key in archetype_relics.loadout_relics({'character':0,'variant':variant}),f'{key}: Yami Yugi loadout {variant}')
def themed(names):
 r=g.new_run(0,random.Random(1),0);ids=[g.BY_NAME[n]['id'] for n in names];r.update(pool=ids,selected=list(range(len(ids))),artifacts=[],round=0);return r
def theme_of(run,key):return next(((p,m) for p,m,x,rank in relic_affinity.theme_chances(run).values() if key in m),(0,[]))
dm_deck=(['Dark Magician','Dark Magician Girl','Skilled Dark Magician','Thousand Knives','Dark Magic Curtain']*4)
p,members=theme_of(themed(dm_deck),'magicians_bond')
ok(p>.4 and {'master_and_apprentice','black_chaos_rite'}<=set(members),f'an all-Dark Magician Deck: one Dark Magician theme, almost 50% ({p:.2f})')
ok(theme_of(themed(['Battle Ox','Mystical Elf','Waboku','Dark Hole']*5),'magicians_bond')[0]==0,'no Dark Magician cards: no theme chance')
p,members=theme_of(themed(['Blue-Eyes White Dragon','Red-Eyes Black Dragon']*3+['Battle Ox','Waboku']*7),'twin_eyes')
ok(p>.2 and {'dragon_blood_fusion','blue_eyes_radiance'}<=set(members),f'Blue-Eyes and Red-Eyes cards: their theme ({p:.2f})')
p,_=theme_of(themed(['Blue-Eyes White Dragon','Tri-Horned Dragon','Koumori Dragon']*4+['Waboku']*8),'dragon_lords_decree')
ok(p>.2,f"Level 7+ Dragons: Dragon Lord's Decree's theme ({p:.2f})")
p,members=theme_of(themed(['Summoned Skull','Dark Magician','Battle Ox']*4+['Waboku']*8),'titans_charge')
ok(p>0 and 'boss_monster' in members,f"Titan's Charge shares Boss Monster's Level 7+ theme ({p:.2f})")

# Relic Mirror can give the CPU any of them.
mirror={'artifacts':list(NEW)+[CURSE],'curses':['relic_mirror'],'challenge_level':2,'started_at':1,'round':1}
ok(set(passives.mirror_relics(mirror))<=set(mirror['artifacts']) and len(passives.mirror_relics(mirror))==4,'Relic Mirror copies them')
ok('Duel.ChainAttack' in passives.multiplayer_script({'artifacts':['titans_charge'],'curses':[],'challenge_level':0},1),'mirrored script')

for lang in ('de','es','fr','it','pt','ja','ko','zh'):
 bundle=json.loads((ROOT/f'android/web/i18n/{lang}.json').read_text(encoding='utf8'))['ui']
 for key in list(NEW)+[CURSE]:ok(A[key][0] in bundle and A[key][2] in bundle,f'{lang}: {A[key][0]}')
 for half in ar.CURSED_PARTS[CURSE]:ok(half in bundle,f'{lang}: {half}')
ok(json.loads(relic_affinity.THEMES_FILE.read_text(encoding='utf8'))==relic_affinity.compute_theme_card_lists(),'data/relic-theme-cards.json is current (run build_android.py --sync-only)')
ok(json.loads(relic_affinity.CEILINGS_FILE.read_text(encoding='utf8'))==relic_affinity.compute_ceilings(),'data/relic-ceilings.json is current (run build_android.py --sync-only)')
print('PASS Nov 15:',checks,'checks')
