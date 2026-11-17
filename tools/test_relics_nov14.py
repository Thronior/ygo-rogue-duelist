"""2026-11-14 Discord review: Guardian's Call, Soul Fusion, Gate Calling, Dark Lotus and Ring of Defense. Campaign side:
prices, rarity, Gate Calling's Deck rule for the shop, Ring of Defense's healing after the Duel, Relic Mirror, art and
translations. The duel effects are tested in android/test_relics_nov14.mjs."""
import json,random,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,content,storage,passives,archetype_relics,relic_affinity,shop_rewards,campaign_expansion
import approved_relics as ar
base=Path(tempfile.mkdtemp(prefix='relics-nov14-',dir=ROOT/'temp'));storage.ROOT=base;g.SAVE=base/'run.json'
profile=storage.profile();profile['unlocked']=list(content.PLAYABLE_IDS);storage.write(base/'profile.json',profile)
checks=0
def ok(value,why):
 global checks
 assert value,why;checks+=1

A=content.ARTIFACTS
# Guardian's Call 90 -> 70 in the 2026-11-16 balance picks.
NEW={'guardians_call':("Guardian's Call",70),'soul_fusion':('Soul Fusion',120),'gate_calling':('Gate Calling',80),'dark_lotus':('Dark Lotus',500),'ring_of_defense':('Ring of Defense',110),'ultimate_armory':('Ultimate Armory',130)}
for key,(name,price) in NEW.items():ok(A[key][:2]==(name,price),f'{name} costs {price}')
ok('Once per turn' in A['guardians_call'][2] and 'Once per turn' in A['gate_calling'][2],"Guardian's Call and Gate Calling are once per turn")
ok('from your hand' in A['gate_calling'][2] and 'Deck' not in A['gate_calling'][2],'Gate Calling summons from the hand only')
ok(archetype_relics.RARITY['dark_lotus']==.1,'Dark Lotus is very rare (Almighty rarity)')
ok('guardians_call' in shop_rewards.CATEGORY_RELICS['guardian'] and 'soul_fusion' in shop_rewards.CATEGORY_RELICS['fusion'],'shop categories')
# Every new relic sits in at least one shop category and has a collection weight rule.
mapped=set().union(*shop_rewards.CATEGORY_RELICS.values())
for key in NEW:ok(key in mapped and key in relic_affinity.RULES,key+' has a shop category and a weight rule')
ok('ultimate_armory' in shop_rewards.CATEGORY_RELICS['equip'] and 'ring_of_defense' in shop_rewards.CATEGORY_RELICS['heal'],'Ultimate Armory: equip, Ring of Defense: heal')
ok(content.ART_INFO['ultimate_armory']['art']=='Gearfried the Swordmaster','Ultimate Armory art')
ok('EFFECT_INDESTRUCTABLE_EFFECT' in passives.script({'artifacts':['ultimate_armory'],'curses':[],'challenge_level':0},telemetry=False),'Ultimate Armory protects in the duel')
grarl=g.BY_NAME['Guardian Grarl'];suijin=g.BY_NAME['Suijin']
ok('guardian' in relic_affinity.card_tags(grarl) and 'gate_trio' in relic_affinity.card_tags(suijin),'Guardians and the trio carry their tags')

# Gate Calling is only offered while the current Deck holds Sanga, Kazejin or Suijin.
run=g.new_run(0,random.Random(5),0);g.auto_deck(run)
trio=[g.BY_NAME[n]['id'] for n in ('Sanga of the Thunder','Kazejin','Suijin')]
run['pool']=[c for c in run['pool'] if c not in trio];run['selected']=[i for i in run['selected'] if i<len(run['pool'])]
ok(not campaign_expansion.shop_relic_eligible(run,'gate_calling'),'no trio card in the Deck: not offered')
run['pool'].append(trio[2])
ok(not campaign_expansion.shop_relic_eligible(run,'gate_calling'),'Suijin only in the card pool, not the Deck: not offered')
run['selected'].append(len(run['pool'])-1)
ok(campaign_expansion.shop_relic_eligible(run,'gate_calling'),'Suijin in the Deck: offered')
ok(campaign_expansion.shop_relic_eligible(run,'guardians_call'),"Guardian's Call has no Deck rule")

# Ring of Defense: own card losses come back after a won Duel, up to the LP limit; nothing without the relic.
def finish(artifacts,lp,lost,**extra):
 r=g.new_run(1,random.Random(1));g.auto_deck(r);r.update(stage='shop',round=1,lp=8000,challenge_level=0,artifacts=list(artifacts),**extra);g.routes(r)
 r['opponent']=r['routes'][0] if isinstance(r['routes'][0],int) else r['routes'][0]['id']
 g.prepare_duel(r,random.Random(2))
 g.finish_duel(r,dict(protocol=1,id=r['duel']['id'],winner=0,lp=lp,events=[{'kind':'self_lp_loss','amount':n} for n in lost]),random.Random(3))
 return r['lp']
ok(finish(['ring_of_defense'],5000,[1000,500])==6500,'1500 LP lost to own cards come back')
ok(finish(['ring_of_defense'],7800,[1000])==8000,'never past the LP limit')
ok(finish([],5000,[1000,500])==5000,'without the relic nothing comes back')
ok(finish(['ring_of_defense','cursed_glass_treasury'],5000,[1000])==5000,'Glass Treasury blocks it like all healing between Duels')
ok(ar.self_lp_lost({'artifacts':['ring_of_defense']},[{'kind':'loss_damage','amount':900}])==0,'damage from the opponent is not counted')

# Relic Mirror never gives the opponent Ring of Defense: its healing happens after the Duel.
mirror={'artifacts':['ring_of_defense','dark_lotus'],'curses':['relic_mirror'],'challenge_level':0,'started_at':1,'round':1}
ok(passives.mirror_relics(mirror)==['dark_lotus'],'Relic Mirror skips Ring of Defense')

# Art: card crops for Guardian's Call (Guardian Ceal) and Gate Calling (Suijin); custom art for the other three.
art=json.loads((ROOT/'data/relic-custom-art.json').read_text(encoding='utf8'))
for key in ('soul_fusion','dark_lotus','ring_of_defense'):ok((ROOT/'assets/relics'/art[key]).is_file(),key+' has its artwork')
ok(content.ART_INFO['guardians_call']['art']=='Guardian Ceal' and content.ART_INFO['gate_calling']['art']=='Suijin','card art picks')
ok(content.ART_INFO['gate_calling']['art']!=content.ART_INFO['almighty']['art'],'Gate Calling does not reuse the Gate Guardian art')

for lang in ('de','es','fr','it','pt','ja','ko','zh'):
 bundle=json.loads((ROOT/f'android/web/i18n/{lang}.json').read_text(encoding='utf8'))['ui']
 for key in NEW:ok(A[key][0] in bundle and A[key][2] in bundle,f'{lang}: {A[key][0]}')
# A relic in two weight groups takes the stronger group's boost, never both multiplied (Dark Lotus: Level 7+ and Fusion).
def deck_of(names):
 pool=[g.BY_NAME[n]['id'] for n in names];return {'pool':pool,'selected':list(range(len(pool))),'artifacts':[]}
big=['Gate Guardian','Summoned Skull','Dark Magician']*4+['Waboku']*28
fus=['Gaia the Dragon Champion','Polymerization']*6+['Waboku']*28
both=['Gate Guardian','Summoned Skull','Dark Magician']*4+['Gaia the Dragon Champion','Polymerization']*6+['Waboku']*16
m=lambda names:relic_affinity.details(['dark_lotus'],deck_of(names))['dark_lotus'][0]
ok(m(big)>1 and m(fus)>1,'each group boosts on its own')
ok(abs(m(both)-max(m(big),m(fus)))<.5 and m(both)<m(big)*m(fus)-.5,f'both groups: the stronger boost, not the product ({m(big):.2f}, {m(fus):.2f}, {m(both):.2f})')
# Deck-style relics now weighted; coin and shop relics stay unweighted.
for key in ('cursed_scorched_clock','cursed_brittle_armor','cursed_crowded_crypt','solo','stars_aligned','no_pain_no_gain'):ok(key in relic_affinity.RULES,key+' has a weight rule')
for key in ('urn','bargain','map','ankh'):ok(key not in relic_affinity.RULES,key+' stays unweighted')
ok('wall' in relic_affinity.card_tags(g.BY_NAME['Giant Soldier of Stone']) and 'wall' not in relic_affinity.card_tags(g.BY_NAME['Battle Ox']),'walls')
ok('wall' not in relic_affinity.card_weight_tags(g.BY_NAME['Giant Soldier of Stone']),'relic-only tags leave single-card weights alone')
# Theme chances (user, 2026-11-14): the chance that a shop stock offers at least one relic of a theme the Deck fits.
import time,cursed_relics as _cr
_cursed=_cr.approved()
def stock_chance(r,targets,favored=frozenset(),trials=2500):
 avail=[k for k in A if campaign_expansion.shop_relic_eligible(r,k) and k not in content.RETIRED_ARTIFACTS and k not in _cursed and k not in r['artifacts']]
 rng=random.Random(11)
 return sum(bool(set(archetype_relics.shop_sample(avail,3,r,rng,favored,shop_rewards.CATEGORY_RELIC_BOOST))&set(targets)) for _ in range(trials))/trials
def themed(names,artifacts=()):
 r=g.new_run(0,random.Random(1),0);ids=[g.BY_NAME[n]['id'] for n in names];r.update(pool=ids,selected=list(range(len(ids))),artifacts=list(artifacts),round=0);return r
earthy=[c['name'] for c in g.CARDS if c['data']['type']&1 and c.get('attribute')=='EARTH' and not c['data']['type']&0x40 and not c['data'].get('setcodes')][:20]
p=stock_chance(themed(earthy),['earth','attribute_earth']);ok(.2<p<.31,f'all-EARTH Deck: about 25% for Earth Orb or EARTH Surgery ({p:.3f})')
p=stock_chance(themed(earthy,['earth']),['attribute_earth']);ok(.2<p<.31,f'owning Earth Orb leaves EARTH Surgery its theme chance (user, 2026-11-17) ({p:.3f})')
amz=[c['name'] for c in g.CARDS if 'Amazoness' in c['name'] and c['data']['type']&1 and not c['data']['type']&0x40]
amz_relics=['amazoness_standard','amazoness_hunters']
p=stock_chance(themed((amz*4)[:20]),amz_relics);ok(.4<p<.55,f'all-Amazoness Deck: almost 50% ({p:.3f})')
fav=frozenset(shop_rewards.category_relics('amazoness'))
p=stock_chance(themed((amz*4)[:20]),amz_relics,fav);ok(p>.8,f'with the Amazoness category: almost 90% ({p:.3f})')
# Specific themes before broad ones: an all-Archfiend Deck (DARK Fiends) gets far more Archfiend relics than DARK or Fiend ones.
arch=[c['name'] for c in g.CARDS if 'Archfiend' in c['name'] and c['data']['type']&1 and not c['data']['type']&0x40]
ar_=themed((arch*4)[:20]);ranks={tuple(m):(rank,p) for p,m,x,rank in relic_affinity.theme_chances(ar_).values()}
arch_theme=next(v for m,v in ranks.items() if 'archfiend_contract' in m);dark_theme=next(v for m,v in ranks.items() if 'dark' in m)
ok(arch_theme[0]<dark_theme[0] and arch_theme[1]>dark_theme[1],f'Archfiend ranks before DARK and has the higher chance ({arch_theme}, {dark_theme})')
p_arch=stock_chance(ar_,['archfiend_contract','demonic_pact','all_for_one_terrorking']);p_dark=stock_chance(ar_,['dark','attribute_dark'])
ok(p_arch>.4 and p_arch>p_dark+.1,f'Archfiend {p_arch:.3f} vs DARK {p_dark:.3f}')
started=time.perf_counter();relic_affinity.theme_chances(themed(earthy));took=time.perf_counter()-started
ok(took<.05,f'theme chances are cheap per stock ({took*1000:.1f} ms)')
ok(json.loads(relic_affinity.THEMES_FILE.read_text(encoding='utf8'))==relic_affinity.compute_theme_card_lists(),'data/relic-theme-cards.json is current (run build_android.py --sync-only)')
print('PASS Nov 14:',checks,'checks')
