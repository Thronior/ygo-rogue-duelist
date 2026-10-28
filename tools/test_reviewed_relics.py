"""Run-side rules of Muniqui's reviewed relics: deck size, copy limits, offers and the three choice relics."""
import sys,random,tempfile,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,content as c,approved_relics as ar,choice_relics,cursed_relics,passives
from campaign_expansion import shop_relic_eligible
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='reviewed-relics-'));g.SAVE=storage.ROOT/'run.json'
profile=storage.profile();profile['unlocked']=list(c.PLAYABLE_IDS);storage.write(storage.ROOT/'profile.json',profile)

def run_at(round_=6,**extra):
 r=g.new_run(1,random.Random(round_));g.auto_deck(r);r.update(stage='shop',round=round_,**extra);return r

# Deck size: Deck Thinning -10, Collector's Burden +10, Singleton Pact always 20, floor 20.
r=run_at()
assert ar.minimum(r)==40
r['artifacts']+=['deck_thinning'];assert ar.minimum(r)==30
r['artifacts']+=['cursed_collectors_burden'];assert ar.minimum(r)==40,'the two relics stack'
assert ar.minimum(dict(run_at(0),artifacts=['deck_thinning']))==20,'never below 20'
assert ar.minimum(dict(run_at(),artifacts=['cursed_singleton_pact','cursed_collectors_burden']))==20
assert ar.minimum(dict(run_at(),artifacts=['cursed_collectors_burden']))==50,"Collector's Burden alone is unchanged at round 6"
assert ar.minimum(dict(run_at(),secret_challenge=True,secret_deck_minimum=40,artifacts=['deck_thinning']))==40,'secret challenges keep their minimum'

# Copy limit: Singleton Pact allows one copy; Broken Limiter removes the limit.
r=run_at();assert ar.copy_limit(r)==3
r['artifacts']+=['cursed_singleton_pact'];assert ar.copy_limit(r)==1
assert ar.copy_limit(dict(r,artifacts=['broken_limiter']))is None
vorse=g.BY_NAME['Vorse Raider']['id']
r['pool']=r['pool']+[vorse,vorse];r['selected']=list(range(len(r['pool'])))
assert 'Singleton Pact' in (g.validate(r) or ''),g.validate(r)

# Singleton Pact offers: not with Collector's Burden or Broken Limiter, not for fixed decks, Tag or secret challenges.
r=run_at();assert ar.eligible(r,'cursed_singleton_pact')
for extra in [dict(artifacts=['broken_limiter']),dict(artifacts=['cursed_collectors_burden']),dict(history_mode='tag'),dict(secret_challenge=True)]:
 assert not ar.eligible(dict(r,**extra),'cursed_singleton_pact'),extra
assert not ar.eligible(dict(r,artifacts=['cursed_singleton_pact']),'cursed_collectors_burden')
for key in ('cursed_singleton_pact','cursed_defense_proficiency','cursed_jesters_coin'):assert key in cursed_relics.approved(),key

# Shop offers: choice relics never in Tag, deck rules blocked by Singleton Pact, Card Picker and Deck Thinning not for fixed decks.
r=run_at()
for key in ar.CHOICE_RELICS:assert shop_relic_eligible(r,key) and not shop_relic_eligible(dict(r,history_mode='tag'),key),key
pact=dict(r,artifacts=['cursed_singleton_pact'])
assert not shop_relic_eligible(pact,'deck_thinning') and not shop_relic_eligible(pact,'broken_limiter')
copycat=next(i for i,ch in enumerate(c.CHARACTERS) if ch.get('copycat'))
assert not shop_relic_eligible(dict(r,character=copycat),'card_picker') and not shop_relic_eligible(dict(r,character=copycat),'deck_thinning')
# Almighty is very rare: far less often than an ordinary relic across the same shops.
seen=normal=0
for seed in range(600):
 g.restock(r,random.Random(seed));ids={x['id'] for x in r['shop'] if x['kind']=='artifact'}
 seen+='almighty' in ids;normal+='grave_lantern' in ids
assert normal>=5 and seen*3<normal,(seen,normal)

def shop_with(r,key):
 r['shop']=[dict(kind='artifact',id=key,price=c.ARTIFACTS[key][1],sold=False)];r['gold']=999;return 0

# Relic Picker: consumed, offers 3 unowned regular relics, one reroll, the pick runs its on-acquire effects.
r=run_at();g.buy(r,shop_with(r,'relic_picker'),random.Random(1))
assert 'relic_picker' not in r['artifacts'] and len(r['relic_offer']['options'])==3
assert not set(r['relic_offer']['options'])&(set(ar.CHOICE_RELICS)|{'almighty','golden_sleeve'}|set(r['artifacts']))
first=list(r['relic_offer']['options']);choice_relics.reroll_relic(r,random.Random(2))
assert r['relic_offer']['rerolls_left']==0 and not set(first)&set(r['relic_offer']['options'])
try:choice_relics.reroll_relic(r,random.Random(3));raise AssertionError('second reroll')
except ValueError:pass
pick=r['relic_offer']['options'][0];choice_relics.choose_relic(r,pick,random.Random(4))
assert pick in r['artifacts'] and not r.get('relic_offer') and r['relic_picks']==0
r['relic_offer']={'options':['final_hour'],'rerolls_left':0};r['relic_picks']=1;size=len(r['pool'])
choice_relics.choose_relic(r,'final_hour');assert g.BY_NAME['Final Countdown']['id'] in r['pool'][size:],'on-acquire effects run for picked relics'

# Card Picker: consumed, any card except Ancient Treasure.
r=run_at();g.buy(r,shop_with(r,'card_picker'))
assert 'card_picker' not in r['artifacts'] and r['card_picks']==1
try:choice_relics.pick_card(r,choice_relics.ANCIENT_TREASURE);raise AssertionError('Ancient Treasure')
except ValueError:pass
bewd=g.BY_NAME['Blue-Eyes White Dragon']['id'];choice_relics.pick_card(r,bewd)
assert r['pool'][-1]==bewd and r['card_picks']==0

# Name Changer: kept, one archetype per copy, removed when sold; the duel script adds the archetype.
r=run_at();g.buy(r,shop_with(r,'name_changer'))
assert 'name_changer' in r['artifacts'] and r['name_change_picks']==1
ojama=next(a['setcode'] for a in choice_relics.archetypes() if a['name']=='Ojama')
choice_relics.change_name(r,ojama);assert r['name_changes']==[ojama]
assert f'EFFECT_ADD_SETCODE) e:SetTargetRange(LOCATION_HAND|LOCATION_DECK|LOCATION_GRAVE|LOCATION_MZONE,0) e:SetTarget(function(e,c) return c:IsMonster() end) e:SetValue({ojama})' in passives.script(r)
g.sell_relic(r,'name_changer');assert r['name_changes']==[] and 'EFFECT_ADD_SETCODE' not in passives.script(r)
try:choice_relics.change_name(r,ojama);raise AssertionError('no pick waiting')
except ValueError:pass

# Magic Mirror never copies the deck-rule or choice relics.
r=run_at();r['artifacts']=['magic_mirror','deck_thinning','name_changer','cursed_singleton_pact']
g.auto_deck(r);assert g.validate(r) is None,'auto-build follows Singleton Pact'
for seed in range(20):
 g.routes(r);r['opponent']=r['routes'][0] if isinstance(r['routes'][0],int) else r['routes'][0]['id'];g.prepare_duel(r,random.Random(seed))
 assert r.get('mirror_copy') is None,r.get('mirror_copy')
 r['stage']='shop'
# Archetype list: real names, two or more monsters each.
rows=choice_relics.archetypes();assert len(rows)>=40 and all(a['monsters']>=2 and a['name'] for a in rows)
print(f'PASS reviewed relics: deck rules, Singleton Pact limits, shop and offer rules, Almighty in {seen} of 600 shops vs {normal} for a normal relic, Relic/Card Picker and Name Changer flows')
