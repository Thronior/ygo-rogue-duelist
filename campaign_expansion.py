import variant_relics
import challenge_levels
"""Nine-duel progression and persistent profile integration."""
import random,uuid,json,time
import shop_rewards,card_rarity,archetype_relics
from collections import Counter
import storage
from content import *
import passives,unlocks,encounters,endless
import cursed_relics,approved_relics as ar

BOUNTY_OBJECTIVES=(
 {'id':'ritual_summon','title':'Ritual Summon','description':'Ritual Summon a monster this Duel.'},
 {'id':'fusion_summon','title':'Fusion Summon','description':'Fusion Summon a monster this Duel.'},
 {'id':'five_monsters','title':'Full Field','description':'Control at least 5 monsters at once this Duel.'},
 {'id':'eleven_activations','title':'Keep the Pressure','description':'Activate at least 11 cards or effects this Duel.'},
 {'id':'over_3000_atk','title':'Heavy Hitter','description':'Control a monster with over 3,000 ATK this Duel.'},
)

def bounty_complete(objective,events,by_id):
 if not objective:return False
 key=objective.get('id')
 if key in ('ritual_summon','fusion_summon'):
  mask=0x80 if key=='ritual_summon' else 0x40
  return any(e.get('kind')=='summon' and (by_id.get(int(e.get('card',0)),{}).get('data',{}).get('type',0)&mask) for e in events)
 if key=='five_monsters':
  return any(e.get('kind')=='duel_metrics' and max(int(e.get('peak_monsters',0)),int(e.get('peak_field',0)))>=5 for e in events)
 if key=='eleven_activations':return sum(1 for e in events if e.get('kind')=='activate')>=11
 if key=='over_3000_atk':return any(e.get('kind')=='duel_metrics' and int(e.get('peak_attack',0))>3000 for e in events)
 return False

# These effects require buying or changing card stock, unavailable to fixed-deck characters.
FIXED_DECK_UNUSED_SHOP_EFFECTS=frozenset({
 'archetype_stock','like_archfiend','like_exodia','like_toon','like_ritual',
 'single_stamp','pack_refund','purchase_clone','faulty',
 'approved_booster_shelf','approved_duelist_catalogue','approved_prospector_lens',
 'approved_morphing_jar_2','approved_deck_thinning','approved_card_picker',
})

def shop_relic_eligible(run,key):
 character=CHARACTERS[run['character']]
 effect=ART_INFO[key]['effect']
 if (character.get('copycat') or character.get('engine_deck')) and effect in FIXED_DECK_UNUSED_SHOP_EFFECTS:return False
 if key in ar.CHOICE_RELICS and run.get('history_mode')=='tag':return False
 if not archetype_relics.has_member(key,run):return False
 # Singleton Pact fixes the deck rules these relics would change.
 if key in ('deck_thinning','broken_limiter') and ar.has(run,'cursed_singleton_pact'):return False
 if key=='deck_thinning' and run.get('secret_challenge'):return False
 # Engine converts this bonus into an extra reward-deck choice.
 return not (character.get('copycat') and effect=='reward_card')

def install(g):
 g.CARDS=json.loads((g.ROOT/'data/era-cards.json').read_text(encoding='utf8'))+custom_cards.CARDS
 g.BY_ID={c['id']:c for c in g.CARDS};g.BY_NAME={c['name']:c for c in g.CARDS}
 # Pre-errata cards keep their passcode; the build bundles the matching script.
 for cid,row in json.loads((g.ROOT/'data/pre-errata.json').read_text(encoding='utf8'))['cards'].items():g.BY_ID[int(cid)]['desc']=row['desc']
 aliases={int(k):v for k,v in json.loads((g.ROOT/'data/card-aliases.json').read_text()).items()}
 g.CHARACTERS=CHARACTERS;g.ARTIFACTS=ARTIFACTS;g.OPPONENTS=['Act I']*3+['Act II']*3+['Act III']*3
 def ensure_bounty(run,rng=random,force=False):
  if 'bounty_list' not in run.get('artifacts',[]):
   run.pop('bounty_objective',None)
   return None
  if force or not run.get('bounty_objective'):
   previous=(run.get('last_bounty') or {}).get('id')
   choices=[item for item in BOUNTY_OBJECTIVES if item['id']!=previous] or list(BOUNTY_OBJECTIVES)
   objective=dict(rng.choice(choices))
   objective['reward']=rng.randint(50,120)
   run['bounty_objective']=objective
  elif 'reward' not in run['bounty_objective']:
   run['bounty_objective']=dict(run['bounty_objective'],reward=rng.randint(50,120))
  return run['bounty_objective']
 def load_run(slot=None):
  slot=storage.active_slot() if slot is None else slot
  def valid(r):
   try:
    return (isinstance(r,dict) and 0<=r['character']<len(CHARACTERS) and 0<=r['round']<=12
     and 0<=r['lp']<=999999 and 0<=r['gold']<=99999999
     and len(r['pool'])<=10000 and all(aliases.get(c,c) in g.BY_ID for c in r['pool'])
     and all(isinstance(i,int) and 0<=i<len(r['pool']) for i in r['selected'])
     and len(set(r['selected']))==len(r['selected'])
     and all(a in ARTIFACTS or a=='purse' for a in r.get('artifacts',[]))
     and r.get('stage','draft') in ('draft','shop','duel','gameover','complete'))
   except (KeyError,TypeError): return False
  r=storage.read(storage.run_path(slot),None,valid)
  if r and r.get('stage')=='gameover':storage.archive_run(r);storage.clear_run(slot);return None
  if r:
   normalize_pack_references(r)
   if r.get('challenge_level',0)>=6:r.setdefault('persistent_curses',list(r.get('curses',[])))
   shop_rewards.normalize_run(r)
   # Retire Silken Purse without invalidating an existing run.
   r['artifacts']=[a for a in r.get('artifacts',[]) if a!='purse']
   r['shop']=[item for item in r.get('shop',[]) if not (item.get('kind')=='artifact' and item.get('id')=='purse')]
   if r.get('mirror_copy')=='purse':r.pop('mirror_copy',None)
   if r.get('starting_relic')=='purse':r['starting_relic']='none'
   ar.reconcile_turn_order(r)
   r['_save_slot']=slot
   r['content_unlocks_earned']=[]
   r['pool']=[aliases.get(c,c) for c in r['pool']]
   r['guaranteed']=[aliases.get(c,c) for c in r['guaranteed']]
   r['packs']=[[aliases.get(c,c) for c in p] for p in r.get('packs',[])]
   for item in r.get('shop',[]):
    if item['kind']=='single':item['id']=aliases.get(item['id'],item['id'])
   for k,v in dict(version=3,stage='draft',curses=[],boss_cursed=[],purchased=0,artifacts=[],history=[],shop=[],duel=None,routes=[],opponent=None).items():r.setdefault(k,v)
   if r.get('stage')!='duel' and (r['round']+1)%3==0 and len(r.get('routes',[]))>1:
    r['routes']=r['routes'][:1];r['opponent']=r['routes'][0]
   if r['version']<3:r['shop']=[];r['version']=3
   if r.get('boss_rules')!=3:
    r['boss_rules']=3
    if r['stage']!='duel':r['routes']=[];r['curses']=[];r['boss_curse']=None
   if r.get('campaign_rules')!=4:
    r['campaign_rules']=4;r['routes']=[];r['curses']=[];r['boss_curse']=None
    if r['round']>=RUN_LENGTH and r['stage']!='gameover':r['round']=RUN_LENGTH;r['stage']='complete'
   r.setdefault('stats',{});r.setdefault('unlocks_earned',[]);r.setdefault('started_at',time.time())
   bounty_reward_migrated=r.get('stage')!='duel' and 'bounty_list' in r.get('artifacts',[]) and 'reward' not in (r.get('bounty_objective') or {})
   if r.get('stage')!='duel':ensure_bounty(r)
   # Repair old over-limit decks without discarding owned cards or resetting a run.
   counts=Counter();selected=[]
   for i in sorted(set(r['selected'])):
    key=g.card_identity(r['pool'][i])
    if ar.copy_limit(r) is None or counts[key]<ar.copy_limit(r):selected.append(i);counts[key]+=1
   r['selected']=selected
   if r['stage']!='duel' and not r.get('encore_active') and (len(r['routes'])!=(1 if (r['round']+1)%BOSS_EVERY==0 else 5) or any(i not in eligible_opponents(r['round'],r.get('loop',0)) or i==r['character'] or i in r.get('defeated_opponents',[]) for i in r['routes'])) and r['round']<RUN_LENGTH:routes(r)
   if r.get('reward_rules')!=5 and r['stage']!='duel':
    r['route_rewards']=shop_rewards.route_rewards(r['routes'],random,storage.profile())
    r['reward_rules']=5;save(r)
   if r['stage']=='shop' and (not r['shop'] or any(not item['sold'] and ((item['kind']=='single' and not unlocks.card_allowed(g.BY_ID[item['id']])) or (item['kind']=='pack' and not unlocks.available('pack',item['id']))) for item in r['shop'])):restock(r)
   if r['stage']=='shop' and ensure_shop_packs(r):save(r)
   if bounty_reward_migrated:save(r)
  if r:
   challenge_levels.suppress(r)
   if cursed_relics.pending(r):cursed_relics.create_offer(r)
  return r
 def save(run):
  if '_save_slot' not in run:run['_save_slot']=storage.active_slot()
  run['last_played_at']=time.time()
  storage.archive_run(run)
  if run.get('stage')=='gameover':storage.clear_run(run['_save_slot'])
  else:storage.write(storage.run_path(run['_save_slot']),run)
 def open_pack(name,rng=random):
  p=PACK_BY_ID.get(name) or next((p for p in PACKS if p['name']==name and p['region']=='EN'),None)
  if not p:raise ValueError('Unknown booster')
  # Expanded draft boosters: nine cards even for five-card OCG originals,
  # otherwise four packs cannot reliably make a legal 20-card draft.
  profile=storage.profile()
  if not unlocks.available('pack',p['id'],profile):raise ValueError('This booster is still locked. See Collection unlocks.')
  common=[cid for cid in p['common'] if unlocks.card_allowed(g.BY_ID[cid],profile)]
  rare=[cid for cid in p['rare'] if unlocks.card_allowed(g.BY_ID[cid],profile)]
  basic=[cid for cid in set(common if p.get('draft_only') else common+rare+p.get('starter_support',[])) if g.normal_starter(cid) and unlocks.card_allowed(g.BY_ID[cid],profile)]
  if not basic and not p.get('shop_only'):raise ValueError('Booster has no playable starter monsters.')
  # Reserve the premium slot first; exclude already-pulled identities everywhere.
  def unique(pool):
   seen=set();out=[]
   for cid in pool:
    key=g.card_identity(cid)
    if key not in seen:seen.add(key);out.append(cid)
   return out
  common,rare,basic=unique(common),unique(rare),unique(basic)
  all_cards=unique(common+rare+basic)
  if len(all_cards)<9:raise ValueError('Booster needs at least nine different cards.')
  premium=card_rarity.choose(rare or common,rng,p.get('rarity_weights'));used={g.card_identity(premium)}
  starters=[cid for cid in basic if g.card_identity(cid) not in used]
  count=max(0,min(3,len(basic))-int(g.normal_starter(premium)))
  pulls=card_rarity.sample(starters,min(count,len(starters)),rng)
  used.update(g.card_identity(cid) for cid in pulls)
  while len(pulls)<8:
   available=[cid for cid in common if g.card_identity(cid) not in used]
   if not available:available=[cid for cid in all_cards if g.card_identity(cid) not in used]
   # A pack's rarity_weights also tune its common draws, e.g. Polymerization in fusion packs.
   cid=card_rarity.choose(available,rng,p.get('rarity_weights'));pulls.append(cid);used.add(g.card_identity(cid))
  return pulls+[premium]
 def routes(run,rng=random,exclude=()):
  rd=run['round'];boss=(rd+1)%BOSS_EVERY==0
  if rd==0 and not run.get('loop'):choices=list(TUTORIAL_OPPONENTS)
  elif rd>=6:choices=[0,1,6,15,17,27]
  elif boss:choices=[0,1,3,4,6,7,11,15,17,27]
  else:choices=list(GAME_DECKS)
  eligible=eligible_opponents(rd,run.get('loop',0))
  choices+=[i for i in eligible if (i in TIER_EXCLUSIVE_OPPONENTS or i in UC_OPPONENTS) and i not in choices]
  choices=[i for i in choices if i in eligible]
  defeated=set(run.get('defeated_opponents',[]))
  choices=[i for i in choices if i not in defeated and i!=run['character']]
  if len(choices)<5:
   extra=[i for i in eligible if i not in defeated and i!=run['character'] and i not in choices]
   choices+=rng.sample(extra,min(5-len(choices),len(extra)))
  if not choices:choices=[i for i in eligible if i not in defeated and i!=run['character']]
  if not choices:raise ValueError('All eligible opponents in this journey have been defeated.')
  alternatives=[i for i in choices if i not in exclude]
  if exclude:
   if not alternatives:raise ValueError('No different eligible opponent remains. Your coins were not spent.')
   choices=alternatives
  run['routes']=rng.sample(choices,min(1 if boss else 5,len(choices)));run['opponent']=run['routes'][0]
  if rd==0 and not run.get('loop'):run['tutorial_variants']={str(i):TUTORIAL_OPPONENTS[i] for i in run['routes']}
  else:run.pop('tutorial_variants',None)
  import fallen_collectors
  fallen_collectors.add_route(run,rng)
  run['route_rewards']=shop_rewards.route_rewards(run['routes'],rng,storage.profile())
  count=min(3,(rd+1)//BOSS_EVERY)+3*run.get('loop',0)
  from feedback_update import draw_curses
  if run.get('challenge_level',0)>=6:count=1
  count+=ar.extra_curses(run)
  draw_routes=bool(boss or (rd==0 and not run.get('loop') and run.get('challenge_level',0)>=6))
  distinct_opening=bool(rd==0 and not run.get('loop') and run.get('challenge_level',0)>=6)
  choices=[]
  if draw_routes:
   for _ in run['routes']:
    blocked=list(run.get('persistent_curses',[]))
    if distinct_opening:blocked.extend(key for option in choices for key in option)
    choices.append(draw_curses(rng,count,run.get('challenge_level',0),blocked,distinct=distinct_opening))
  run['route_curses']={str(i):list(c) for i,c in zip(run['routes'],choices)}
  run['boss_curse']=choices[0][0] if choices else None
  challenge_levels.suppress(run)
  run['reward_rules']=5
  run['revealed_opponents']=[]
 def new_run(index,rng=random,level=0,variant=0):
  level=challenge_levels.validate(index,level)
  reload_tuning()
  if index not in PLAYABLE_IDS or index not in storage.profile()['unlocked']:raise ValueError('This duelist is locked.')
  import character_variants
  char=character_variants.loadout(CHARACTERS,index,variant,storage.profile());signatures=[g.BY_NAME[n]['id'] for n in char['cards']]
  pack_ids=char.get('starting_packs') if variant and char.get('starting_packs') else starting_packs(index,rng)
  for _ in range(500):
   packs=[open_pack(pack,rng) for pack in pack_ids]
   counts=Counter(g.card_identity(cid) for cid in signatures+sum(packs,[]) if not g.is_extra(cid))
   if char.get('copycat') or char.get('engine_deck') or (sum(min(3,n) for n in counts.values())>=20 and (char.get('random_packs') or sum(min(3,n) for cid,n in Counter(cid for cid in signatures+sum(packs,[]) if g.normal_starter(cid)).items())>=9)):break
  else:raise ValueError('This pack could not provide a legal draft. Please try another duelist.')
  r=dict(version=3,shop_rerolls=0,character=index,lp=8000,gold=40,round=0,stage='draft',pool=signatures+sum(packs,[]),selected=[0,1],guaranteed=signatures,packs=packs,artifacts=[],history=[],shop=[],duel=None,curses=[],boss_cursed=[],boss_rules=3,boss_curse=None,purchased=0)
  r['new_cards_from']=0
  r.update(variant=variant,variant_name=char.get('alternate',{}).get('name') if variant else 'Standard',campaign_rules=4,started_at=time.time(),unlocks_earned=[],stats={},pack_ids=pack_ids)
  if char.get('copycat') or char.get('engine_deck'):r['selected']=[];r['guaranteed']=[];r['stage']='draft'
  r['challenge_level']=level
  if level>=4:r['lp']=4000
  relic='none' if level==-1 else char['starting_relic']
  cursed=cursed_relics.approved()
  if relic=='random':relic=archetype_relics.sample([k for k in ARTIFACTS if k not in RETIRED_ARTIFACTS and k not in cursed],1,r,rng)[0]
  elif relic=='random_archetype':relic=archetype_relics.sample([k for k in ARTIFACTS if k not in RETIRED_ARTIFACTS and k not in cursed and ART_INFO.get(k,{}).get('effect')=='archetype_stock'],1,r,rng)[0]
  if relic in (None,'none'):r['artifacts']=[];r['starting_relic']='none'
  else:
   r['artifacts']=[relic];r['starting_relic']=relic
   if relic=='ankh':r['lp']+=2000
  ensure_bounty(r,rng)
  if relic=='final_hour':r['pool'].append(g.BY_NAME['Final Countdown']['id'])
  routes(r,rng)
  if char.get('copycat'):copy_deck(r,rng)
  if char.get('engine_deck'):engine_deck(r,rng)
  return r
 def opponent_deck(round_index,rng=random,opponent=None,tutorial_variant=0,loop=0):
  # Round 0 is tier 0: the weak tutorial pool, always stupid easy.
  if round_index==0 and not loop:
   from deck_files import read
   n=tutorial_variant%len(encounters.TUTORIALS);result=read('tutorial-'+str(n+1),encounters.TUTORIALS[n])['main'][:]
  else:
   # One exact deck for this opponent and tier. Only draw order changes.
   result=opponent_record(round_index,opponent if opponent is not None else 2,loop)['main'][:]
  rng.shuffle(result);return result
 def copy_deck(run,rng=random):
  if not CHARACTERS[run['character']].get('copycat'):return
  import fallen_collectors
  fallen=fallen_collectors.opponent(run)
  if fallen:
   main=fallen['deck']['main'][:];extra=fallen['deck']['extra'][:]
  else:
   encore=endless.encore_record(run) if run.get('encore_active') else None
   main=encore['main'][:] if encore else opponent_deck(run['round'],rng,run['opponent'],run.get('tutorial_variants',{}).get(str(run['opponent']),0),loop=run.get('loop',0))
   extra=encore['extra'][:] if encore else ([] if run['round']==0 and not run.get('loop') else opponent_record(run['round'],run['opponent'],run.get('loop',0))['extra'])
  signature=g.BY_NAME['Copycat']['id']
  if main.count(signature)>=3:main.remove(signature)
  main.append(signature)
  if not run.get('encore_active'):main,extra=g.legal_fixed_cards(main,extra)
  run['pool']=main+extra;run['selected']=list(range(len(run['pool'])));run['guaranteed']=[signature];run['copied_opponent']=run['opponent']
 def engine_deck(run,rng=random):
   if not CHARACTERS[run['character']].get('engine_deck'):return
   if run.get('engine_reward_selected'):return
   pre=json.loads((g.ROOT/'data/preconstructed.json').read_text(encoding='utf8'))
   # Exclude the original low-power Starter Box lists only from Dueling Engine.
   choice=rng.choice([d for d in pre['decks'] if d['id'] not in {'SB99','SBTH'}])
   main=[c for c in choice['cards'] if not g.is_extra(c)];extra=[c for c in choice['cards'] if g.is_extra(c)]
   main,extra=g.legal_fixed_cards(main,extra)
   run['pool']=main+extra;run['selected']=list(range(len(run['pool'])));run['guaranteed']=[];run['engine_deck']=choice['id']
 def owns(run,key):return ar.has(run,key)
 def amount(run,kind):
  if run.get('challenge_level')==-1:return 0
  total=sum(ART_INFO[a]['amount'] for a in run['artifacts'] if ART_INFO[a]['effect']==kind)
  copy=run.get('mirror_copy')
  if copy and copy in ART_INFO and ART_INFO[copy]['effect']==kind:total+=ART_INFO[copy]['amount']
  return total
 def prepare_duel(run,rng=random):
  challenge_levels.suppress(run)
  ensure_bounty(run,rng)
  if run.get('reward_slots',{}).get('kind')=='deck' and run['reward_slots'].get('pending'):raise ValueError('Choose your reward deck before starting the duel.')
  cursed_relics.require_choice(run)
  reload_tuning()
  if run['stage']=='shop':run['gold_leaving_shop']=run['gold']
  if CHARACTERS[run['character']].get('copycat'):
   if not run.get('routes'):routes(run,rng)
   if run['opponent'] not in run['routes']:raise ValueError('Choose an available opponent.')
   copy_deck(run,rng)
  if CHARACTERS[run['character']].get('engine_deck'):
   if not run.get('routes'):routes(run,rng)
   if run['opponent'] not in run['routes']:raise ValueError('Choose an available opponent.')
   engine_deck(run,rng)
  error=g.validate(run)
  if error:raise ValueError(error)
  if run['lp']<=0 or (run['round']>=RUN_LENGTH and not run.get('encore_active')):raise ValueError('This run has ended.')
  if not run.get('routes'):routes(run,rng)
  if run['opponent'] not in run['routes']:raise ValueError('Choose an available opponent.')
  number=run['round']+1
  from feedback_update import draw_curses, dedupe_curses, require_type_choice
  require_type_choice(run)
  persistent=run.get('challenge_level',0)>=6
  boss=number%BOSS_EVERY==0 or (persistent and number==1 and not run.get('loop'))
  if boss:
   count=(1 if persistent else min(3,number//BOSS_EVERY)+3*run.get('loop',0))+ar.extra_curses(run)
   selected=run.get('route_curses',{}).get(str(run['opponent']))
   if not selected or len(selected)!=count or any(c not in CURSES for c in selected) or selected!=dedupe_curses(selected,run.get('challenge_level',0),per_encounter=True):
    selected=draw_curses(rng,count,run.get('challenge_level',0),run.get('persistent_curses',[]))
    run.setdefault('route_curses',{})[str(run['opponent'])]=selected
   if persistent:
    encounter=str(run.get('loop',0))+':'+str(run['round'])
    if run.get('curse_committed')!=encounter:
     run['persistent_curses']=dedupe_curses(run.get('persistent_curses',[]) + selected[:],run.get('challenge_level',0));run['curse_committed']=encounter
    run['curses']=dedupe_curses(run['persistent_curses'],run.get('challenge_level',0))
   else:run['curses']=dedupe_curses(selected,run.get('challenge_level',0))
   run['boss_curse']=selected[0]
  else:run['curses']=dedupe_curses(run.get('persistent_curses',[]),run.get('challenge_level',0)) if persistent else []
  challenge_levels.suppress(run)
  # Every curse active in this duel, for the run card; finish_duel clears run['curses'] before the timeline is written.
  run['duel_curses']=list(run['curses'])
  lp=max(1,run['lp']-(1000*challenge_levels.curse_scale(run)*run['curses'].count('drain')))
  if 'magic_mirror' in run.get('artifacts',[]):
   # Run-level deck rules and choice relics have nothing to copy for one duel.
   others=[a for a in run['artifacts'] if a not in ('magic_mirror','blank_relic','deck_thinning','cursed_singleton_pact',*ar.CHOICE_RELICS)]
   run['mirror_copy']=rng.choice(others) if others else None
  else:run['mirror_copy']=None
  duel_run=ar.duel_run(run)
  if duel_run.get('mirror_copy')=='ankh' and ar.can_heal(duel_run,between=True):lp=lp+2000
  if owns(duel_run,'glass_shard'):lp=max(1,ART_INFO['glass_shard']['amount']-(1000*challenge_levels.curse_scale(run)*run['curses'].count('drain')))
  run['golden_hits']=0
  run['first_player']=ar.first(duel_run,0 if rng.random()<0.5 else 1)
  lp=max(1,lp-1000*ar.copies(duel_run,'cursed_wounded_merchant'))
  request=dict(protocol=1,id=uuid.uuid4().hex,lp=lp,round=run['round'],opponent=run['opponent'])
  char=CHARACTERS[run['opponent']];enemy_lp=(8000 if run.get('encore_active') or run.get('challenge_level',0)>=1 else encounters.LP[run['round']])+run.get('loop',0)*endless.LOOP['lp']-amount(duel_run,'enemy_lp')
  enemy_lp=max(1,enemy_lp+2000*ar.copies(duel_run,'cursed_loaded_purse'))
  if ar.has(duel_run,'cursed_shared_hex'):enemy_lp=max(1,enemy_lp-1000*challenge_levels.curse_scale(run)*run['curses'].count('drain'))
  main_pairs=[(i,run['pool'][i]) for i in sorted(run['selected']) if not g.is_extra(run['pool'][i])]
  extra_pairs=[(i,run['pool'][i]) for i in sorted(run['selected']) if g.is_extra(run['pool'][i])]
  rng.shuffle(main_pairs)
  main=[cid for _,cid in main_pairs];extra=[cid for _,cid in extra_pairs]
  if owns(duel_run,'level_up_relic'):
   level_up=g.BY_NAME['Level Up!']['id']
   if level_up not in main:main.append(level_up)
  mods=run.setdefault('card_mods',{})
  if run.get('faulty'):
   for i,cid in enumerate(run['pool']):
    if str(cid) in run['faulty']:mods.setdefault(str(i),run['faulty'][str(cid)])
   run.pop('faulty',None)
  run['duel_modifications']=[]
  for location,pairs in [('DECK',main_pairs),('EXTRA',extra_pairs)]:
   for sequence,(i,cid) in enumerate(pairs):
    if str(i) in mods:
     a,d=mods[str(i)][:2];card=g.BY_ID[cid]
     run['duel_modifications'].append(dict(location=location,sequence=sequence,atk=max(0,card['atk']+a),defense=max(0,card['defense']+d),race=mods[str(i)][2] if len(mods[str(i)])>2 else int(card['data']['race']),attribute=mods[str(i)][3] if len(mods[str(i)])>3 else card['data']['attribute']))
  # Shuffle both main decks before the engine draws opening hands, on every attempt.
  import fallen_collectors
  fallen=fallen_collectors.opponent(run)
  if fallen:
   # A saved Collector encounter owns its deck; it may predate roster restrictions.
   enemy=fallen['deck']['main'][:];enemy_extra=fallen['deck']['extra'][:]
  elif run.get('encore_active'):
   encore=endless.encore_record(run);enemy=encore['main'][:];enemy_extra=encore['extra'][:]
  else:
   enemy=opponent_deck(run['round'],rng,run['opponent'],run.get('tutorial_variants',{}).get(str(run['opponent']),0),loop=run.get('loop',0))
   enemy_extra=[] if run['round']==0 and not run.get('loop') else opponent_record(run['round'],run['opponent'],run.get('loop',0))['extra']
  rng.shuffle(enemy)
  run['new_cards_from']=len(run['pool'])
  request['enemy_deck']=enemy[:]+enemy_extra[:]
  from feedback_update import opponent_relic
  run['opponent_relic']=opponent_relic(dict(run,opponent_cards=request['enemy_deck']))
  enemy_name=('BOSS: '+char['name']+' - '+' + '.join(CURSES[c][0] for c in run['curses'])) if number%BOSS_EVERY==0 else char['name']
  if fallen:enemy_name='Fallen '+fallen['name']
  if run.get('encore_active'):enemy_name=endless.encore_record(run)['name']
  hand0=ar.opening(duel_run,1 if owns(duel_run,'rulebook') else 5+amount(duel_run,"opening"))
  hand0=challenge_levels.curse_opening_hand(run,hand0)
  hand1=1 if owns(duel_run,'rulebook') else 5
  if ar.has(duel_run,'cursed_shared_hex'):hand1=challenge_levels.curse_opening_hand(run,hand1)
  lua=['-- Shadow Run: native EDOPro campaign.','Debug.SetAIName('+json.dumps(enemy_name)+')','Debug.ReloadFieldBegin(DUEL_MODE_MR1|DUEL_SIMPLE_AI,1)',f'Debug.SetPlayerInfo(0,{lp},{hand0},1)',f'Debug.SetPlayerInfo(1,{enemy_lp},{hand1},1)']
  for p,cards,loc in [(0,main,'LOCATION_DECK'),(0,extra,'LOCATION_EXTRA'),(1,enemy,'LOCATION_DECK'),(1,enemy_extra,'LOCATION_EXTRA')]:
   lua += [f'Debug.AddCard({cid},{p},{p},{loc},0,POS_FACEDOWN_DEFENSE)' for cid in cards]
  # Legacy native result events do not include damage-tracker hint messages.
  lua += ['Debug.ReloadFieldEnd()',passives.script(run,telemetry=False)]
  (g.RUNTIME/'puzzles').mkdir(exist_ok=True)
  (g.RUNTIME/'puzzles/shadow-run.lua').write_text('\n'.join(lua),encoding='utf8')
  (g.RUNTIME/'campaign-result.json').unlink(missing_ok=True)
  tmp=g.RUNTIME/'campaign-request.tmp';tmp.write_text(json.dumps(request),encoding='utf8');tmp.replace(g.RUNTIME/'campaign-request.json')
  run['duel']=request;run['stage']='duel';save(run);return request
 old_rewards=g.rewards
 def rewards(run,events):
  tally,_=old_rewards(run,events)
  tally['Artifacts']=amount(run,'gold')
  if amount(run,'interest'):tally['Interest']=min(90,int(run['gold']*amount(run,'interest')/100))
  if amount(run,'lean_bonus') and sum(not g.is_extra(c) for c in g.deck(run))==ar.minimum(run):tally['Razor Ledger']=amount(run,'lean_bonus')
  if amount(run,'clutch_bonus') and run['lp']<2000:tally['Phoenix IOU']=amount(run,'clutch_bonus')
  if owns(run,'golden_sleeve'):
   from golden_cards import choices
   hits=sum(min(5,sum(1 for e in events if e.get('kind') in ('summon','set','activate') and e.get('card')==cid)) for cid in choices(run))
   if hits:tally['Golden Card']=hits*10
  if owns(run,'underdog_clause'):
   pups=0
   for _cid in g.deck(run):
    _c=g.BY_ID.get(_cid)
    if _c and _c['data']['type']&1 and _c['data']['type']&16 and _c['level']<=2:pups+=1
   if pups:tally["Underdog's Clause"]=pups*amount(run,'underdog_gold')
  if (run['round']+1)%BOSS_EVERY==0 and amount(run,'boss_gold'):tally['Champion Trophy']=amount(run,'boss_gold')
  tally.update(ar.rewards(run,events,(run['round']+1)%BOSS_EVERY==0))
  total=sum(tally.values())
  if total>400:tally['Payout cap']=400-total;total=400
  if owns(run,'glass_shard'):
   multiplier=4 if 'glass_shard' in run['artifacts'] and run.get('mirror_copy')=='glass_shard' else 2
   tally['Glass Shard']=total*(multiplier-1);total*=multiplier
  if ar.has(run,'cursed_glass_treasury'):
   bonus=int(total*((1.25**ar.copies(run,'cursed_glass_treasury'))-1));tally['Glass Treasury']=bonus;total+=bonus
  if run.get('challenge_level',0)>=3:
   reduced=total*3//4;tally['Challenge level penalty']=reduced-total;total=reduced
  bonus=custom_cards.coins(events)
  if bonus:tally['Ancient Treasure']=bonus;total+=bonus
  bonus=variant_relics.coins(run,events)
  if bonus:tally['Fusion Dividend']=bonus;total+=bonus
  return {k:v for k,v in tally.items() if v},total
 def update_profile(run,won=False):
  import achievement_model
  p=storage.profile();previous={x['id'] for x in achievement_model.entries(p) if x['done']}
  p['max_gold']=max(p['max_gold'],run['gold']);p['max_bought']=max(p['max_bought'],run.get('purchased',0));p['max_artifacts']=max(p['max_artifacts'],len(run['artifacts']))
  if won:p['victories']+=1
  if run['stage']=='complete' and not run.get('profile_complete') and not run.get('secret_challenge'):
   challenge_levels.award(p,run)
   p['highest_challenge_level']=max(challenge_levels.highest(p,i) for i in PLAYABLE_IDS)
   p['wins']+=1;p['won_as']=list(set(p['won_as']+[run['character']]));run['profile_complete']=True
  import character_progression
  character_progression.observe(p,run)
  unlocked=set(p['unlocked'])|{0,1}
  for i in PLAYABLE_IDS[2:]:
   metric,target=unlock_rule(i)
   value=(int(metric.split(':')[1]) in p['won_as']) if metric.startswith('won_as:') else p.get(metric,0)
   if value>=target:unlocked.add(i)
  run['unlocks_earned']=sorted(set(run.get('unlocks_earned',[]))|(unlocked-set(p['unlocked'])))
  p['unlocked']=sorted(unlocked);unlocks.award(p,run,run.get('opponent') if won else None)
  notices=[dict(id=x['id'],name=x['name'],reward=x['reward']) for x in achievement_model.entries(p) if x['done'] and x['id'] not in previous]
  p.setdefault('achievement_notices',[]).extend(notices)
  storage.write(storage.ROOT/'profile.json',p)
 def unlock_rule(i):
  rule=PROGRESSION['unlocks'][str(i)]
  return rule['metric'],rule['target']
 def unlock_text(i):
  if i in (0,1):return 'Available from the beginning'
  return PROGRESSION['unlocks'][str(i)]['description']
 def finish_duel(run,result,rng=random):
  if result.get('protocol')!=1 or not run.get('duel') or result.get('id')!=run['duel']['id']:raise ValueError('Duel result does not belong to this run.')
  if run['stage']!='duel':raise ValueError('Result already processed.')
  minimum_before=ar.minimum(run)
  run['new_cards_from']=len(run['pool'])
  run['last_deck_minimum_increase']=0
  duel_number=run['round']+1
  duel_opponent=run.get('duel',{}).get('opponent',run['opponent'])
  boss=duel_number%BOSS_EVERY==0
  run['lp']=max(0,int(result['lp']));won=result['winner']==0 and run['lp']>0
  # Solo duels report the save itself (passives.py hint 900000001). Only Tag duels, whose relic scripts carry no
  # such signal, still treat a win at 1,000 LP or less as the save; a plain low-LP win must not spend it.
  saved=any(e.get('kind')=='relic_used' and e.get('relic')=='phoenix_rebirth' for e in result.get('events',[]))
  if not saved and result.get('phoenix_signal') is False:saved=result.get('winner')==0 and run['lp']<=1000
  if 'relic_seal' not in run.get('curses',[]) and 'phoenix_rebirth' in run.get('artifacts',[]) and saved:
   run['artifacts']=[a for a in run['artifacts'] if a!='phoenix_rebirth'];run['phoenix_spent']=True
  import character_progression
  character_progression.duel(g,run,result,won,boss)
  run['last_rewards']={};run['last_gold']=0
  run['last_boss_heal']=0
  if 'bounty_list' in run.get('artifacts',[]):ensure_bounty(run,rng)
  active_bounty=dict(run.get('bounty_objective') or {}) if 'bounty_list' in run.get('artifacts',[]) else None
  run['shop_rerolls']=0
  # Curses end with this encounter, including defeats and the final boss.
  run['curses']=run.get('persistent_curses',[])[:] if run.get('challenge_level',0)>=6 else [];run['boss_curse']=None
  if not won:
   import loss_reason
   run['stage']='gameover';run['loss']=loss_reason.describe(result,g.BY_ID)
   bonus=custom_cards.coins(result.get('events',[]))
   if bonus:run['last_rewards']['Ancient Treasure']=bonus;run['last_gold']=bonus;run['gold']+=bonus
   bonus=variant_relics.coins(run,result.get('events',[]))
   if bonus:run['last_rewards']['Fusion Dividend']=bonus;run['last_gold']+=bonus;run['gold']+=bonus
  else:
   defeated_deck=run['duel'].get('enemy_deck') or opponent_deck(run['round'],rng,run['opponent'],run.get('tutorial_variants',{}).get(str(run['opponent']),0),loop=run.get('loop',0))
   defeated_deck=[] if CHARACTERS[run['character']].get('copycat') else [cid for cid in defeated_deck if cid not in custom_cards.IDS]
   # A custom-only test/imported deck has no eligible post-duel card reward.
   reward_start=len(run['pool'])
   run['last_reward_cards']=rng.sample(defeated_deck,min(5 if boss else 1,len(defeated_deck)));run['last_reward_card']=next(iter(run['last_reward_cards']),None);run['pool'].extend(run['last_reward_cards'])
   run['defeated_opponents']=sorted(set(run.get('defeated_opponents',[]))|{run['opponent']})
   coins_before_rewards=run['gold']
   run['last_rewards'],gold=rewards(run,result.get('events',[]));run['last_gold']=gold;run['gold']+=gold
   run['shop_reward']=run.get('route_rewards',{}).get(str(run['opponent']),shop_rewards.reward_for(run['opponent']));run['bias']=run['shop_reward']['key'];run['round']+=0 if run.get('encore_active') else 1
   if boss:run['last_deck_minimum_increase']=max(0,ar.minimum(run)-minimum_before)
   cap=(4000 if run.get('challenge_level',0)>=4 else 8000)+2000*ar.copies(run,'ankh');overflow=0
   if boss and ar.can_heal(run,between=True):
    healed=max(0,min(2000,cap-run['lp']));run['lp']+=healed;run['last_boss_heal']=healed;overflow=2000-healed
   heal=(amount(run,'victory_heal')+amount(run,'shop_heal')+(coins_before_rewards//10)*amount(run,'coin_heal')) if ar.can_heal(run,between=True) else 0
   # Silver Chalice: all post-duel healing past the limit (boss, relic and coin healing) is not lost; every
   # 100 LP over becomes 3 coins.
   overflow+=max(0,run['lp']+heal-max(cap,run['lp']))
   run['lp']=max(run['lp'],min(cap,run['lp']+heal))
   if ar.has(run,'chalice') and overflow>=100:
    coins=3*(overflow//100);run['gold']+=coins;run['last_gold']=run.get('last_gold',0)+coins;run['last_rewards']['Silver Chalice']=run['last_rewards'].get('Silver Chalice',0)+coins
    stats=run.setdefault('stats',{});stats['coins_earned']=stats.get('coins_earned',0)+coins
   for _ in range(int(amount(run,'reward_card')) if defeated_deck and not CHARACTERS[run['character']].get('copycat') and not CHARACTERS[run['character']].get('engine_deck') else 0):
    bonus=rng.choice(defeated_deck);run['pool'].append(bonus);run['last_reward_cards'].append(bonus)
   for _ in range(2*ar.copies(run,'cursed_collectors_burden') if defeated_deck else 0):
    bonus=rng.choice(defeated_deck);run['pool'].append(bonus);run['last_reward_cards'].append(bonus)
   import reward_slots
   if CHARACTERS[run['character']].get('engine_deck'):
    del run['pool'][reward_start:]
    reward_slots.prepare_decks(run,1+int(amount(run,'reward_card'))+2*ar.copies(run,'cursed_collectors_burden'),rng)
   else:reward_slots.prepare(run,defeated_deck,reward_start)
   if run.get('encore_active'):run.update(encore_active=False,encore_won=True)
   run['stage']='complete' if run['round']==RUN_LENGTH or run.get('secret_challenge') else 'shop'
   # Award collection progress before generating this victory's shop.
   update_profile(run,True)
   if run['stage']=='shop':
    routes(run,rng)
    if not boss:restock(run,rng)
  if active_bounty and bounty_complete(active_bounty,result.get('events',[]),g.BY_ID):
   reward=max(50,min(120,int(active_bounty.get('reward',50))))
   run['last_rewards']['Bounty List']=reward
   run['last_gold']+=reward
   run['gold']+=reward
   run['last_bounty']={'id':active_bounty.get('id'),'title':active_bounty.get('title'),'completed':True,'reward':reward}
  elif active_bounty:
   run['last_bounty']={'id':active_bounty.get('id'),'title':active_bounty.get('title'),'completed':False,'reward':0}
  if run['stage']=='shop' and 'bounty_list' in run.get('artifacts',[]):ensure_bounty(run,rng,force=True)
  elif 'bounty_list' not in run.get('artifacts',[]):run.pop('bounty_objective',None)
  if 'blank_relic' in run.get('artifacts',[]):
   _attrs={}
   for _cid in g.deck(run):
    _c=g.BY_ID.get(_cid)
    if _c and _c['data']['type']&1 and _c.get('attribute'):_attrs[_c['attribute']]=_attrs.get(_c['attribute'],0)+1
   _orb={'LIGHT':'light','DARK':'dark','FIRE':'ember','WATER':'tide','WIND':'gale','EARTH':'earth'}.get(max(_attrs,key=_attrs.get) if _attrs else None)
   _new=_orb or 'earth'
   run['artifacts']=[_new if a=='blank_relic' else a for a in run['artifacts']];run['blank_became']=_new
  stats=run.setdefault('stats', {})
  stats['coins_earned']=stats.get('coins_earned',0)+run['last_gold']
  if boss and won:stats['bosses_defeated']=stats.get('bosses_defeated',0)+1
  for event in result.get('events',[]):
   key={'summon':'monsters_summoned','activate':'cards_activated','attack':'attacks_declared','damage':'damage_dealt'}.get(event.get('kind'))
   if key:stats[key]=stats.get(key,0)+(event.get('amount',0) if key=='damage_dealt' else 1)
  if run['stage'] in ('complete','gameover'):run['finished_at']=time.time()
  run.setdefault('timeline',[]).append(dict(duel=duel_number,loop=run.get('loop',0)+1,opponent=duel_opponent,won=won,lp_before_healing=int(result.get('lp',0)),lp_after_healing=run['lp'],curses=list(run.get('duel_curses') or []),coins=run.get('last_gold',0),turns=next((e.get('turns',0) for e in result.get('events',[]) if e.get('kind')=='duel_metrics'),0)))
  run['last_healing']={'before':int(result.get('lp',0)),'after':run['lp']}
  run['history'].append(result)
  if not won:update_profile(run)
  if won and boss and run['stage']=='shop':
   cursed_relics.create_offer(run,rng)
   if cursed_relics.pending(run):run['shop']=[]
   else:restock(run,rng)
  save(run)
 def ensure_shop_packs(run,rng=random):
  if run.get('stage')!='shop' or CHARACTERS[run['character']].get('copycat') or CHARACTERS[run['character']].get('engine_deck'):return
  current=[x['id'] for x in run.get('shop',[]) if x['kind']=='pack']
  count=(4 if ar.has(run,'booster_shelf') else 3)-len(current)
  if count<=0:return
  profile=storage.profile()
  options=[p['id'] for p in PACKS if (not p.get('draft_only') or ar.has(run,'duelist_catalogue')) and p['id'] not in current and unlocks.available('pack',p['id'],profile)]
  price=ar.price(run,'pack',max(1,round(35*max(0,1-amount(run,'discount')/100))))
  for pid in rng.sample(options,min(count,len(options))):run['shop'].append(dict(kind='pack',id=pid,price=price,sold=False,opponent_pack=False))
  return bool(options)
 def restock(run,rng=random,general_stock=False):
  challenge_levels.suppress(run)
  reload_tuning()
  shop_rewards.normalize_run(run)
  profile=storage.profile();eligible=[c for c in g.CARDS if unlocks.card_allowed(c,profile)]
  removal_pool=[c for c in eligible if shop_rewards.removes_backrow(c)]
  removal=rng.choices(removal_pool,weights=[card_rarity.weight(c['id']) for c in removal_pool],k=1)[0]
  eligible=[c for c in eligible if c['id']!=removal['id']]
  bias=run.get('bias','');preferred=[c for c in eligible if shop_rewards.matches(c,bias)]
  like=set();_arts=set(run.get('artifacts',[]))|{run.get('mirror_copy')}
  # Legendary Shackles likewise grants its own slot below.
  # Toon World now grants a separate guaranteed slot instead of weighting general stock.
  if 'ritual_dagger' in _arts:like|={c['id'] for c in eligible if shop_rewards.matches(c,'ritual')}
  def stock_sample(cards,count):
   return sorted(cards,key=lambda c:rng.random()**(1/((4 if c['id'] in like else 1)*card_rarity.weight(c['id']))),reverse=True)[:count]
  themed=[c for c in eligible if c['id'] not in custom_cards.IDS]
  pool=preferred or themed
  if general_stock:
   top=stock_sample(eligible,5)
  elif run.get('history_mode')=='tag' and len(run.get('tag_shop_rewards',[]))==2:
   top=shop_rewards.tag_featured(themed+[removal],run['tag_shop_rewards'],rng)
  else:
   top=stock_sample(pool,min(5,len(pool)))
   top+=stock_sample([c for c in themed if c not in top],5-len(top))
  # Exodia always shows at least one Forbidden One piece in its featured stock.
  tag_rewards=run.get('tag_shop_rewards',[])
  if 'exodia' in {bias}|{r['key'] for r in tag_rewards}:
   slots=None
   if len(tag_rewards)==2:
    slots=[]
    if tag_rewards[0]['key']=='exodia':slots+=[0,1,2]
    if tag_rewards[1]['key']=='exodia':slots+=[3,4]
   top=shop_rewards.guarantee_exodia(top,eligible,rng,slots)
  remaining=[c for c in eligible if c not in top]
  rest=stock_sample(remaining,4)
  lens_count=ar.copies(run,'prospector_lens')
  if lens_count:
   # The same cards the shop shows with the ultra rare finish (shop-ultra.js).
   is_ultra=lambda c:c['id'] in card_rarity.ULTRA or any(str(printing.get('rarity',''))=='Ultra Rare' for printing in c.get('sets',[]))
   ultra_pool=[c for c in eligible if is_ultra(c)]
   ultra_bonus=stock_sample([c for c in ultra_pool if c not in top and c not in rest],lens_count)
   while len(ultra_bonus)<lens_count and ultra_pool:
    ultra_bonus.append(rng.choice(ultra_pool))
   rest.extend(ultra_bonus)
  rest.append(removal)
  singles=top+rest
  # Bonus stock is additional to the ten normal singles and refreshes on rerolls.
  for relic,bonus in [('archfiend_contract',[c for c in eligible if 'archfiend' in c['name'].lower() or any(int(code)&0xfff==0x45 for code in c.get('data',{}).get('setcodes',[]))] if 'archfiend_contract' in _arts else []),('toon_world',[c for c in eligible if 'toon' in c['name'].lower()] if 'toon_world' in _arts else []),('legendary_shackles',[g.BY_NAME[n] for n in ('Exodia the Forbidden One','Right Arm of the Forbidden One','Left Arm of the Forbidden One','Right Leg of the Forbidden One','Left Leg of the Forbidden One')])]:
   if relic in _arts and bonus:singles.append(rng.choice(bonus))
  for relic in sorted(archetype_relics.NEW_IDS & _arts):
   bonus=[c for c in eligible+[removal] if archetype_relics.matches(relic,c)]
   if bonus:singles.append(rng.choice(bonus))
  items=[dict(kind='single',id=c['id'],price=15+(10 if c['level']>=5 else 0),sold=False) for c in singles]
  tied=run.get('shop_reward',shop_rewards.reward_for(run['opponent']))['pack']
  if PACK_BY_ID.get(tied,{}).get('draft_only') or not unlocks.available('pack',tied,profile):
   # Old shops/routes can predate progression; an unlocked early pack is the fallback.
   tied='EN-LOB'
  pack_count=4 if ar.has(run,'booster_shelf') else 3
  others=rng.sample([p['id'] for p in PACKS if (not p.get('draft_only') or ar.has(run,'duelist_catalogue')) and p['id']!=tied and unlocks.available('pack',p['id'],profile)],pack_count-1)
  pack_ids=[tied]+others
  personal=CHARACTERS[run.get('shop_pack_character',run['character'])]['pack']
  if (not general_stock or ar.has(run,'morphing_jar_2')) and personal in PACK_BY_ID and not (CHARACTERS[run['character']].get('copycat') or CHARACTERS[run['character']].get('engine_deck')):pack_ids[2]=personal
  items += [dict(kind='pack',id=p,price=35,sold=False,opponent_pack=(n==0)) for n,p in enumerate(pack_ids)]
  pre=json.loads((g.ROOT/'data/preconstructed.json').read_text(encoding='utf8'))
  chance=min(pre['max_chance'],pre['base_chance']+max(0,run.get('gold_leaving_shop',0))*pre['chance_per_gold'])
  if not CHARACTERS[run['character']].get('copycat') and not CHARACTERS[run['character']].get('engine_deck') and rng.random()<chance:
   # Exclude the original low-power Starter Box lists only from Dueling Engine.
   choice=rng.choice([d for d in pre['decks'] if d['id'] not in {'SB99','SBTH'}])
   items.append(dict(kind='deck',id=choice['id'],name=choice['name'],art=choice['art'],cards=choice['cards'][:],price=pre['price'],sold=False))
  cursed=cursed_relics.approved()
  available=[a for a in ARTIFACTS if shop_relic_eligible(run,a) and a not in RETIRED_ARTIFACTS and a not in cursed and (a not in run['artifacts'] or a=='golden_sleeve') and (a not in ('traps_no_more','spells_no_more') or rng.random()<0.25) and (a!='duelist_catalogue' or rng.random()<0.20) and (a!='almighty' or rng.random()<0.10)]
  preferred_art=[a for a in available if shop_rewards.artifact_matches(bias,a)]
  count=min(3+amount(run,'extra_artifact')+2*ar.copies(run,'cursed_rusted_compass'),len(available));chosen=archetype_relics.sample(preferred_art,min(1,len(preferred_art)),run,rng)
  chosen+=archetype_relics.sample([a for a in available if a not in chosen],count-len(chosen),run,rng)
  items += [dict(kind='artifact',id=a,price=ARTIFACTS[a][1],sold=False) for a in chosen]
  modifier=max(0,1-amount(run,'discount')/100)
  for item in items:
   item['price']=max(1,round(item['price']*modifier))
  for item in items:item['price']=ar.price(run,item['kind'],item['price'])
  run['shop']=items
  challenge_levels.suppress(run)
 def reroll_price(run):
  if ar.free_use(run,'dice_jar','shop'):return 0
  count=max(0,int(run.get('shop_rerolls',0) or 0))
  return [10,20,40,60,100,150][count] if count<6 else 200+50*(count-6)
 def reroll_shop(run,rng=random):
  cursed_relics.require_choice(run)
  if run.get('stage')!='shop':raise ValueError('Shop is closed.')
  if run.get('challenge_level')==-1 and run.get('history_mode')!='tag' and (CHARACTERS[run['character']].get('copycat') or CHARACTERS[run['character']].get('engine_deck')):raise ValueError('There is no purchasable stock to reroll at LVL -1.')
  price=reroll_price(run)
  import payment
  if not payment.can_pay(run,price):payment.pay(run,price,'a reroll')
  # Rerolls replace the encounter's featured singles with general stock.
  # Generate first so a failed restock cannot charge the player.
  restock(run,rng,general_stock=True)
  payment.pay(run,price,'a reroll')
  if price==0:ar.use_free(run,'shop')
  else:run['shop_rerolls']=int(run.get('shop_rerolls',0) or 0)+1
  return price
 def sell_relic(run,key):
  cursed_relics.require_choice(run)
  if run.get('stage')!='shop':raise ValueError('Relics can only be sold in the shop.')
  if key not in ARTIFACTS or key not in run.get('artifacts',[]):raise ValueError('You do not own that relic.')
  if key in run.get('cursed_artifacts',[]) or key in cursed_relics.approved():raise ValueError('Cursed relics cannot be sold.')
  if key=='broken_limiter' and run['artifacts'].count(key)==1:
   counts=Counter(g.card_identity(run['pool'][i]) for i in run.get('selected',[]))
   if max(counts.values(),default=0)>3:raise ValueError('Remove extra copies from your deck before selling Broken Limiter.')
  price=ARTIFACTS[key][1]//2
  run['artifacts'].remove(key);run['gold']+=price
  if key=='bounty_list':run.pop('bounty_objective',None)
  if key=='name_changer' and run.get('name_changes'):run['name_changes'].pop()
  stats=run.setdefault('stats',{});stats['coins_earned']=stats.get('coins_earned',0)+price
  save(run)
  return dict(relic=key,coins=price,gold=run['gold'])
 def acquire_relic(run,key,rng=random):
  """Add a relic and run its on-acquire effects; returns any cards it grants."""
  import choice_relics
  _pre_discount=amount(run,'discount');obtained=[]
  run['artifacts'].append(key)
  if key=='bounty_list':ensure_bounty(run,rng,force=True)
  if key=='booster_shelf':ensure_shop_packs(run,rng)
  if key=='final_hour':obtained.append(g.BY_NAME['Final Countdown']['id'])
  if key=='stamp':run['stamped_singles']=0
  if key=='ankh' and ar.can_heal(run,between=True):run['lp']=run['lp']+2000
  if ART_INFO.get(key,{}).get('effect')=='discount':
   _new_mod=max(0,1-amount(run,'discount')/100);_old_mod=max(0,1-_pre_discount/100)
   if _old_mod>0:
    for _it in run['shop']:
     if not _it.get('sold'):_it['price']=max(1,round(_it['price']*_new_mod/_old_mod))
  # Choice relics wait for the player's pick; Relic Picker and Card Picker are used up by it.
  if key in ar.CONSUMED_RELICS:run['artifacts'].remove(key)
  if key=='relic_picker':choice_relics.queue_relic_pick(run,rng)
  if key=='card_picker':run['card_picks']=run.get('card_picks',0)+1
  if key=='name_changer':run['name_change_picks']=run.get('name_change_picks',0)+1
  return obtained
 def buy(run,index,rng=random):
  cursed_relics.require_choice(run)
  if run['stage']!='shop':raise ValueError('Shop is closed.')
  item=run['shop'][index]
  if run.get('challenge_level')==-1 and item['kind']=='artifact':raise ValueError('Relics are disabled at LVL -1.')
  if CHARACTERS[run['character']].get('copycat') and item['kind']!='artifact':raise ValueError('Copycat borrows the opponent deck and can only buy relics.')
  if CHARACTERS[run['character']].get('engine_deck') and item['kind']!='artifact':raise ValueError('The Dueling Engine uses reward decks and can only buy relics.')
  import payment
  if item['sold']:raise ValueError('Item unavailable.')
  if not payment.can_pay(run,item['price']):payment.pay(run,item['price'],'this item')
  if item['kind']=='artifact' and item['id']=='golden_sleeve':
   from golden_cards import choices,pending
   available=set(run['pool'][i] for i in run.get('selected',[]))-set(choices(run))
   if len(available)<=pending(run):raise ValueError('Your current deck has no undesignated card for another Golden Card Sleeve.')
  obtained=[]
  if item['kind']=='single':
   if not unlocks.card_allowed(g.BY_ID[item['id']]):raise ValueError('This card is still locked. See Collection unlocks.')
   obtained=[item['id']]
   if amount(run,'single_stamp'):
    run['stamped_singles']=run.get('stamped_singles',0)+1
    if run['stamped_singles']%max(1,amount(run,'single_stamp'))==0:obtained.append(rng.choice([c for c in g.CARDS if unlocks.card_allowed(c)])['id'])
  elif item['kind']=='pack':obtained=open_pack(item['id'],rng)
  elif item['kind']=='deck':
   obtained=item['cards'][:]
   if not obtained or any(cid not in g.BY_ID for cid in obtained):raise ValueError('This starter deck is invalid.')
  if item['kind']=='deck':
   _prof=storage.profile();_prof['decks_bought']=_prof.get('decks_bought',0)+1;storage.write(storage.ROOT/'profile.json',_prof)
  elif item['kind']=='artifact':obtained+=acquire_relic(run,item['id'],rng)
  if item['kind'] in ('single','pack') and amount(run,'purchase_clone'):
   obtained+= [cid for cid in obtained[:] if rng.random()<amount(run,'purchase_clone')/100]
  run['last_misprints']=[]
  if owns(run,'faulty_printer') and item['kind'] in ('single','pack'):
   _chance=amount(run,'faulty')/100;_faulty=run.setdefault('card_mods',{});_fresh=[]
   for _offset,_cid in enumerate(obtained):
    _c=g.BY_ID.get(_cid)
    if not _c or not _c['data']['type']&1:continue
    if rng.random()<_chance:
     _delta=[max(-(_c['atk'] or 0),rng.randint(-1000,1000)),max(-(_c['defense'] or 0),rng.randint(-1000,1000))]
     from feedback_update import RACE_VALUES, ATTRIBUTE_VALUES
     # Only Types that monsters in the card pool actually have (no Psychic, Wyrm, Cyberse...).
     _pool_types=sorted({RACE_VALUES[c['race']] for c in g.CARDS if c['data']['type']&1 and c['race'] in RACE_VALUES})
     _delta.extend([rng.choice(_pool_types),rng.choice(list(ATTRIBUTE_VALUES.values()))])
     _faulty[str(len(run['pool'])+_offset)]=_delta
     _race={v:k for k,v in RACE_VALUES.items()}.get(_delta[2],_c['race']);_attribute={v:k for k,v in ATTRIBUTE_VALUES.items()}.get(_delta[3],_c['attribute'])
     _fresh.append(dict(pool=len(run['pool'])+_offset,id=_cid,name=_c['name'],atk=_c['atk'] or 0,defense=_c['defense'] or 0,datk=_delta[0],ddef=_delta[1],race=_c['race'],new_race=_race,attribute=_c['attribute'],new_attribute=_attribute))
   run['last_misprints']=_fresh
  stats=run.setdefault('stats',{})
  if not payment.in_lp(run):stats['coins_spent']=stats.get('coins_spent',0)+item['price']
  if item['kind']=='pack':stats['packs_bought']=stats.get('packs_bought',0)+1
  if item['kind']=='single':run['singles_bought']=run.get('singles_bought',0)+1
  if item['kind']=='artifact':run['relics_bought']=run.get('relics_bought',0)+1
  if item['kind']=='pack':run['bought_pack_ids']=sorted(set(run.get('bought_pack_ids',[]))|{item['id']})
  if item['kind'] in ('single','pack','deck'):run['card_purchases']=run.get('card_purchases',0)+1
  run['pool']+=obtained;run['purchased']+=len(obtained);payment.pay(run,item['price'],'this item');item['sold']=True
  if item['kind']=='pack' and (amount(run,'pack_refund') or ar.has(run,'cursed_cursed_refund')):
   refund=min(item['price']-1,amount(run,'pack_refund')+20*ar.copies(run,'cursed_cursed_refund'));run['gold']+=refund;stats=run.setdefault('stats',{});stats['coins_earned']=stats.get('coins_earned',0)+refund
  update_profile(run);save(run);return obtained
 def buy_many(run,indices,rng=random):
  indices=list(dict.fromkeys(int(i) for i in indices))
  if not indices:return []
  if any(i<0 or i>=len(run['shop']) for i in indices):raise ValueError('Unknown shop item.')
  items=[run['shop'][i] for i in indices]
  import payment
  if not payment.can_pay(run,sum(x['price'] for x in items)):payment.pay(run,sum(x['price'] for x in items),'these items')
  if run['stage']!='shop' or any(x['sold'] for x in items):raise ValueError('Item unavailable.')
  if CHARACTERS[run['character']].get('copycat') and any(x['kind']!='artifact' for x in items):raise ValueError('Copycat can only buy relics.')
  if CHARACTERS[run['character']].get('engine_deck') and any(x['kind']!='artifact' for x in items):raise ValueError('The Dueling Engine can only buy relics.')
  if any(x['kind']=='single' and not unlocks.card_allowed(g.BY_ID[x['id']]) for x in items):raise ValueError('Card is locked.')
  _out=[];_all_mis=[]
  for i in indices:
   _cards=buy(run,i,rng);_all_mis+=run.get('last_misprints',[])
   _out.append(dict(kind=run['shop'][i]['kind'],id=run['shop'][i]['id'],cards=_cards))
  run['last_misprints']=_all_mis
  return _out
 for name in ['acquire_relic','load_run','save','open_pack','new_run','copy_deck','engine_deck','routes','prepare_duel','opponent_deck','rewards','finish_duel','restock','reroll_price','reroll_shop','sell_relic','buy','buy_many','unlock_text','unlock_rule','update_profile']:
  setattr(g,name,locals()[name])
 g.bounty_complete=bounty_complete
 g.ensure_bounty=ensure_bounty
 g.bounty_objectives=BOUNTY_OBJECTIVES
