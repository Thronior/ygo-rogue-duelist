import challenge_levels
"""Nine-duel progression and persistent profile integration."""
import random,uuid,json,time
import shop_rewards,card_rarity
from collections import Counter
import storage
from content import *
import passives,unlocks,encounters,endless
import cursed_relics,approved_relics as ar

def install(g):
 g.CARDS=json.loads((g.ROOT/'data/era-cards.json').read_text(encoding='utf8'))
 g.BY_ID={c['id']:c for c in g.CARDS};g.BY_NAME={c['name']:c for c in g.CARDS}
 aliases={int(k):v for k,v in json.loads((g.ROOT/'data/card-aliases.json').read_text()).items()}
 g.CHARACTERS=CHARACTERS;g.ARTIFACTS=ARTIFACTS;g.OPPONENTS=['Act I']*3+['Act II']*3+['Act III']*3
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
   # Repair old over-limit decks without discarding owned cards or resetting a run.
   counts=Counter();selected=[]
   for i in sorted(set(r['selected'])):
    key=g.card_identity(r['pool'][i])
    if counts[key]<3:selected.append(i);counts[key]+=1
   r['selected']=selected
   if r['stage']!='duel' and not r.get('encore_active') and (len(r['routes'])!=(1 if (r['round']+1)%BOSS_EVERY==0 else 5) or any(i not in eligible_opponents(r['round'],r.get('loop',0)) or i==r['character'] or i in r.get('defeated_opponents',[]) for i in r['routes'])) and r['round']<RUN_LENGTH:routes(r)
   if r.get('reward_rules')!=5 and r['stage']!='duel':
    r['route_rewards']={str(i):shop_rewards.random_reward(random,storage.profile()) for i in r['routes']}
    r['reward_rules']=5;save(r)
   if r['stage']=='shop' and (not r['shop'] or any(not item['sold'] and ((item['kind']=='single' and not unlocks.card_allowed(g.BY_ID[item['id']])) or (item['kind']=='pack' and not unlocks.available('pack',item['id']))) for item in r['shop'])):restock(r)
   if r['stage']=='shop' and ensure_shop_packs(r):save(r)
  if r:challenge_levels.suppress(r)
  return r
 def save(run):
  run.setdefault('_save_slot',storage.active_slot())
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
  premium=card_rarity.choose(rare or common,rng);used={g.card_identity(premium)}
  starters=[cid for cid in basic if g.card_identity(cid) not in used]
  count=max(0,min(3,len(basic))-int(g.normal_starter(premium)))
  pulls=card_rarity.sample(starters,min(count,len(starters)),rng)
  used.update(g.card_identity(cid) for cid in pulls)
  while len(pulls)<8:
   available=[cid for cid in common if g.card_identity(cid) not in used]
   if not available:available=[cid for cid in all_cards if g.card_identity(cid) not in used]
   cid=card_rarity.choose(available,rng);pulls.append(cid);used.add(g.card_identity(cid))
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
  run['route_rewards']={str(i):shop_rewards.random_reward(rng,storage.profile()) for i in run['routes']}
  count=min(3,(rd+1)//BOSS_EVERY)+3*run.get('loop',0)
  choices=[rng.choices(list(CURSES),k=count) for _ in run['routes']] if boss else []
  run['route_curses']={str(i):list(c) for i,c in zip(run['routes'],choices)}
  run['boss_curse']=choices[0][0] if choices else None
  challenge_levels.suppress(run)
  run['reward_rules']=5
  run['revealed_opponents']=[]
 def new_run(index,rng=random,level=0):
  level=challenge_levels.validate(index,level)
  reload_tuning()
  if index not in PLAYABLE_IDS or index not in storage.profile()['unlocked']:raise ValueError('This duelist is locked.')
  char=CHARACTERS[index];signatures=[g.BY_NAME[n]['id'] for n in char['cards']]
  pack_ids=starting_packs(index,rng)
  for _ in range(500):
   packs=[open_pack(pack,rng) for pack in pack_ids]
   counts=Counter(g.card_identity(cid) for cid in signatures+sum(packs,[]) if not g.is_extra(cid))
   if char.get('copycat') or char.get('engine_deck') or (sum(min(3,n) for n in counts.values())>=20 and (char.get('random_packs') or sum(min(3,n) for cid,n in Counter(cid for cid in signatures+sum(packs,[]) if g.normal_starter(cid)).items())>=9)):break
  else:raise ValueError('This pack could not provide a legal draft. Please try another duelist.')
  r=dict(version=3,shop_rerolls=0,character=index,lp=8000,gold=40,round=0,stage='draft',pool=signatures+sum(packs,[]),selected=[0,1],guaranteed=signatures,packs=packs,artifacts=[],history=[],shop=[],duel=None,curses=[],boss_cursed=[],boss_rules=3,boss_curse=None,purchased=0)
  r.update(campaign_rules=4,started_at=time.time(),unlocks_earned=[],stats={},pack_ids=pack_ids)
  if char.get('copycat') or char.get('engine_deck'):r['selected']=[];r['guaranteed']=[];r['stage']='draft'
  r['challenge_level']=level
  if level>=4:r['lp']=4000
  relic='none' if level==-1 else char['starting_relic']
  if relic=='random':relic=rng.choice([k for k in ARTIFACTS if k not in RETIRED_ARTIFACTS and k not in cursed_relics.approved()])
  if relic in (None,'none'):r['artifacts']=[];r['starting_relic']='none'
  else:
   r['artifacts']=[relic];r['starting_relic']=relic
   if relic=='ankh':r['lp']+=2000
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
   main=endless.CHAMPION['main'][:] if run.get('encore_active') else opponent_deck(run['round'],rng,run['opponent'],run.get('tutorial_variants',{}).get(str(run['opponent']),0),loop=run.get('loop',0))
   extra=endless.CHAMPION['extra'][:] if run.get('encore_active') else ([] if run['round']==0 and not run.get('loop') else opponent_record(run['round'],run['opponent'],run.get('loop',0))['extra'])
  signature=g.BY_NAME['Copycat']['id']
  if main.count(signature)>=3:main.remove(signature)
  main.append(signature)
  run['pool']=main+extra;run['selected']=list(range(len(run['pool'])));run['guaranteed']=[signature];run['copied_opponent']=run['opponent']
 def engine_deck(run,rng=random):
   if not CHARACTERS[run['character']].get('engine_deck'):return
   if run.get('engine_reward_selected'):return
   pre=json.loads((g.ROOT/'data/preconstructed.json').read_text(encoding='utf8'))
   # Exclude the original low-power Starter Box lists only from Dueling Engine.
   choice=rng.choice([d for d in pre['decks'] if d['id'] not in {'SB99','SBTH'}])
   main=[c for c in choice['cards'] if not g.is_extra(c)];extra=[c for c in choice['cards'] if g.is_extra(c)]
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
  if number%BOSS_EVERY==0:
   count=min(3,number//BOSS_EVERY)+3*run.get('loop',0)
   selected=run.get('route_curses',{}).get(str(run['opponent']))
   if not selected or len(selected)!=count or any(c not in CURSES for c in selected):
    selected=rng.choices(list(CURSES),k=count)
    run.setdefault('route_curses',{})[str(run['opponent'])]=selected
   run['curses']=selected[:];run['boss_curse']=selected[0]
  else:run['curses']=[]
  challenge_levels.suppress(run)
  lp=max(1,run['lp']-(1000*challenge_levels.curse_scale(run)*run['curses'].count('drain')))
  if 'magic_mirror' in run.get('artifacts',[]):
   others=[a for a in run['artifacts'] if a not in ('magic_mirror','blank_relic')]
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
  main_pairs=[(i,run['pool'][i]) for i in sorted(run['selected']) if not g.is_extra(run['pool'][i])]
  extra_pairs=[(i,run['pool'][i]) for i in sorted(run['selected']) if g.is_extra(run['pool'][i])]
  rng.shuffle(main_pairs)
  main=[cid for _,cid in main_pairs];extra=[cid for _,cid in extra_pairs]
  mods=run.setdefault('card_mods',{})
  if run.get('faulty'):
   for i,cid in enumerate(run['pool']):
    if str(cid) in run['faulty']:mods.setdefault(str(i),run['faulty'][str(cid)])
   run.pop('faulty',None)
  run['duel_modifications']=[]
  for location,pairs in [('DECK',main_pairs),('EXTRA',extra_pairs)]:
   for sequence,(i,cid) in enumerate(pairs):
    if str(i) in mods:
     a,d=mods[str(i)];card=g.BY_ID[cid]
     run['duel_modifications'].append(dict(location=location,sequence=sequence,atk=max(0,card['atk']+a),defense=max(0,card['defense']+d)))
  # Shuffle both main decks before the engine draws opening hands, on every attempt.
  import fallen_collectors
  fallen=fallen_collectors.opponent(run)
  if fallen:
   # A saved Collector encounter owns its deck; it may predate roster restrictions.
   enemy=fallen['deck']['main'][:];enemy_extra=fallen['deck']['extra'][:]
  elif run.get('encore_active'):
   enemy=endless.CHAMPION['main'][:];enemy_extra=endless.CHAMPION['extra'][:]
  else:
   enemy=opponent_deck(run['round'],rng,run['opponent'],run.get('tutorial_variants',{}).get(str(run['opponent']),0),loop=run.get('loop',0))
   enemy_extra=[] if run['round']==0 and not run.get('loop') else opponent_record(run['round'],run['opponent'],run.get('loop',0))['extra']
  rng.shuffle(enemy)
  request['enemy_deck']=enemy[:]+enemy_extra[:]
  enemy_name=('BOSS: '+char['name']+' - '+' + '.join(CURSES[c][0] for c in run['curses'])) if number%BOSS_EVERY==0 else char['name']
  if fallen:enemy_name='Fallen '+fallen['name']
  if run.get('encore_active'):enemy_name=endless.CHAMPION['name']
  hand0=ar.opening(duel_run,1 if owns(duel_run,'rulebook') else 5+amount(duel_run,"opening"))
  hand1=1 if owns(duel_run,'rulebook') else 5
  lua=['-- Shadow Run: native EDOPro campaign.','Debug.SetAIName('+json.dumps(enemy_name)+')','Debug.ReloadFieldBegin(DUEL_MODE_MR1|DUEL_SIMPLE_AI,1)',f'Debug.SetPlayerInfo(0,{lp},{hand0},1)',f'Debug.SetPlayerInfo(1,{enemy_lp},{hand1},1)']
  for p,cards,loc in [(0,main,'LOCATION_DECK'),(0,extra,'LOCATION_EXTRA'),(1,enemy,'LOCATION_DECK'),(1,enemy_extra,'LOCATION_EXTRA')]:
   lua += [f'Debug.AddCard({cid},{p},{p},{loc},0,POS_FACEDOWN_DEFENSE)' for cid in cards]
  # Desktop uses native result events; never emit damage-tracker hint messages.
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
  if amount(run,'interest'):tally['Interest']=min(30,int(run['gold']*amount(run,'interest')/100))
  if amount(run,'lean_bonus') and sum(not g.is_extra(c) for c in g.deck(run))==20:tally['Razor Ledger']=amount(run,'lean_bonus')
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
  return {k:v for k,v in tally.items() if v},total
 def update_profile(run,won=False):
  import achievement_model
  p=storage.profile();previous={x['id'] for x in achievement_model.entries(p) if x['done']}
  p['max_gold']=max(p['max_gold'],run['gold']);p['max_bought']=max(p['max_bought'],run.get('purchased',0));p['max_artifacts']=max(p['max_artifacts'],len(run['artifacts']))
  if won:p['victories']+=1
  if run['stage']=='complete' and not run.get('profile_complete') and not run.get('secret_challenge'):
   challenge_levels.award(p,run)
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
  duel_number=run['round']+1
  boss=duel_number%BOSS_EVERY==0
  run['lp']=max(0,int(result['lp']));won=result['winner']==0 and run['lp']>0
  if 'relic_seal' not in run.get('curses',[]) and 'phoenix_rebirth' in run.get('artifacts',[]) and (any(e.get('kind')=='relic_used' and e.get('relic')=='phoenix_rebirth' for e in result.get('events',[])) or (result.get('winner')==0 and run['lp']<=1000)):
   run['artifacts']=[a for a in run['artifacts'] if a!='phoenix_rebirth'];run['phoenix_spent']=True
  import character_progression
  character_progression.duel(g,run,result,won,boss)
  run['last_rewards']={};run['last_gold']=0
  run['last_boss_heal']=0
  run['shop_rerolls']=0
  # Curses end with this encounter, including defeats and the final boss.
  run['curses']=[];run['boss_curse']=None
  if not won:
   import loss_reason
   run['stage']='gameover';run['loss']=loss_reason.describe(result,g.BY_ID)
  else:
   defeated_deck=run['duel'].get('enemy_deck') or opponent_deck(run['round'],rng,run['opponent'],run.get('tutorial_variants',{}).get(str(run['opponent']),0),loop=run.get('loop',0))
   reward_start=len(run['pool'])
   run['last_reward_cards']=rng.sample(defeated_deck,min(5 if boss else 1,len(defeated_deck)));run['last_reward_card']=run['last_reward_cards'][0];run['pool'].extend(run['last_reward_cards'])
   run['defeated_opponents']=sorted(set(run.get('defeated_opponents',[]))|{run['opponent']})
   run['last_rewards'],gold=rewards(run,result.get('events',[]));run['last_gold']=gold;run['gold']+=gold
   run['shop_reward']=run.get('route_rewards',{}).get(str(run['opponent']),shop_rewards.reward_for(run['opponent']));run['bias']=run['shop_reward']['key'];run['round']+=0 if run.get('encore_active') else 1
   cap=(4000 if run.get('challenge_level',0)>=4 else 8000)+2000*ar.copies(run,'ankh')
   if boss and ar.can_heal(run,between=True):
    healed=max(0,min(2000,cap-run['lp']));run['lp']+=healed;run['last_boss_heal']=healed
   heal=(amount(run,'victory_heal')+amount(run,'shop_heal')) if ar.can_heal(run,between=True) else 0
   run['lp']=max(run['lp'],min(cap,run['lp']+heal))
   for _ in range(int(amount(run,'reward_card')) if not CHARACTERS[run['character']].get('copycat') and not CHARACTERS[run['character']].get('engine_deck') else 0):
    bonus=rng.choice(defeated_deck);run['pool'].append(bonus);run['last_reward_cards'].append(bonus)
   for _ in range(2*ar.copies(run,'cursed_collectors_burden')):
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
  if 'blank_relic' in run.get('artifacts',[]):
   _attrs={}
   for _cid in g.deck(run):
    _c=g.BY_ID.get(_cid)
    if _c and _c['data']['type']&1 and _c.get('attribute'):_attrs[_c['attribute']]=_attrs.get(_c['attribute'],0)+1
   _orb={'LIGHT':'light','DARK':'dark','FIRE':'ember','WATER':'tide','WIND':'gale','EARTH':'earth'}.get(max(_attrs,key=_attrs.get) if _attrs else None)
   _order=([_orb] if _orb else [])+[o for o in ('light','dark','ember','tide','gale','earth') if o!=_orb]
   _new=_orb or 'earth'
   if _new:run['artifacts']=[_new if a=='blank_relic' else a for a in run['artifacts']];run['blank_became']=_new
  stats=run.setdefault('stats', {})
  stats['coins_earned']=stats.get('coins_earned',0)+run['last_gold']
  if boss and won:stats['bosses_defeated']=stats.get('bosses_defeated',0)+1
  for event in result.get('events',[]):
   key={'summon':'monsters_summoned','activate':'cards_activated','attack':'attacks_declared','damage':'damage_dealt'}.get(event.get('kind'))
   if key:stats[key]=stats.get(key,0)+(event.get('amount',0) if key=='damage_dealt' else 1)
  if run['stage'] in ('complete','gameover'):run['finished_at']=time.time()
  run.setdefault('timeline',[]).append(dict(duel=duel_number,loop=run.get('loop',0)+1,opponent=run['opponent'],won=won,lp_before_healing=int(result.get('lp',0)),lp_after_healing=run['lp'],coins=run.get('last_gold',0),turns=next((e.get('turns',0) for e in result.get('events',[]) if e.get('kind')=='duel_metrics'),0)))
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
  if 'fusion_chamber' in _arts:like|={c['id'] for c in eligible if c['data']['type']&0x40}|{g.BY_NAME['Polymerization']['id'],g.BY_NAME['Fusion Sage']['id']}&{c['id'] for c in eligible}
  def stock_sample(cards,count):
   return sorted(cards,key=lambda c:rng.random()**(1/((4 if c['id'] in like else 1)*card_rarity.weight(c['id']))),reverse=True)[:count]
  pool=preferred or eligible
  if general_stock:
   top=stock_sample(eligible,5)
  elif run.get('history_mode')=='tag' and len(run.get('tag_shop_rewards',[]))==2:
   top=shop_rewards.tag_featured(eligible+[removal],run['tag_shop_rewards'],rng)
  else:
   top=stock_sample(pool,min(5,len(pool)))
   top+=stock_sample([c for c in eligible if c not in top],5-len(top))
  rest=stock_sample([c for c in eligible if c not in top],4+ar.copies(run,'prospector_lens'))+[removal]
  singles=top+rest
  # Bonus stock is additional to the ten normal singles and refreshes on rerolls.
  for relic,bonus in [('archfiend_contract',[c for c in eligible if 'archfiend' in c['name'].lower() or any(int(code)&0xfff==0x45 for code in c.get('data',{}).get('setcodes',[]))]),('toon_world',[c for c in eligible if 'toon' in c['name'].lower()]),('legendary_shackles',[g.BY_NAME[n] for n in ('Exodia the Forbidden One','Right Arm of the Forbidden One','Left Arm of the Forbidden One','Right Leg of the Forbidden One','Left Leg of the Forbidden One')])]:
   if relic in _arts and bonus:singles.append(rng.choice(bonus))
  items=[dict(kind='single',id=c['id'],price=15+(10 if c['level']>=5 else 0),sold=False) for c in singles]
  tied=run.get('shop_reward',shop_rewards.reward_for(run['opponent']))['pack']
  if PACK_BY_ID.get(tied,{}).get('draft_only') or not unlocks.available('pack',tied,profile):
   # Old shops/routes can predate progression; an unlocked early pack is the fallback.
   tied='EN-LOB'
  pack_count=4 if ar.has(run,'booster_shelf') else 3
  others=rng.sample([p['id'] for p in PACKS if (not p.get('draft_only') or ar.has(run,'duelist_catalogue')) and p['id']!=tied and unlocks.available('pack',p['id'],profile)],pack_count-1)
  pack_ids=[tied]+others
  personal=CHARACTERS[run.get('shop_pack_character',run['character'])]['pack']
  if not general_stock and personal in PACK_BY_ID and not (CHARACTERS[run['character']].get('copycat') or CHARACTERS[run['character']].get('engine_deck')):pack_ids[2]=personal
  items += [dict(kind='pack',id=p,price=35,sold=False,opponent_pack=(n==0)) for n,p in enumerate(pack_ids)]
  pre=json.loads((g.ROOT/'data/preconstructed.json').read_text(encoding='utf8'))
  chance=min(pre['max_chance'],pre['base_chance']+max(0,run.get('gold_leaving_shop',0))*pre['chance_per_gold'])
  if not CHARACTERS[run['character']].get('copycat') and not CHARACTERS[run['character']].get('engine_deck') and rng.random()<chance:
   # Exclude the original low-power Starter Box lists only from Dueling Engine.
   choice=rng.choice([d for d in pre['decks'] if d['id'] not in {'SB99','SBTH'}])
   items.append(dict(kind='deck',id=choice['id'],name=choice['name'],art=choice['art'],cards=choice['cards'][:],price=pre['price'],sold=False))
  available=[a for a in ARTIFACTS if a not in RETIRED_ARTIFACTS and a not in cursed_relics.approved() and not (a in ('booster_shelf','duelist_catalogue') and (CHARACTERS[run['character']].get('copycat') or CHARACTERS[run['character']].get('engine_deck'))) and (a not in run['artifacts'] or a=='golden_sleeve') and not (CHARACTERS[run['character']].get('copycat') and ART_INFO[a]['effect'] in ('reward_card','single_stamp','pack_refund','purchase_clone')) and (a not in ('traps_no_more','spells_no_more') or rng.random()<0.25) and (a!='duelist_catalogue' or rng.random()<0.20)]
  preferred_art=[a for a in available if shop_rewards.artifact_matches(bias,a)]
  count=min(3+amount(run,'extra_artifact')+2*ar.copies(run,'cursed_rusted_compass'),len(available));chosen=rng.sample(preferred_art,min(1,len(preferred_art)))
  chosen+=rng.sample([a for a in available if a not in chosen],count-len(chosen))
  items += [dict(kind='artifact',id=a,price=ARTIFACTS[a][1],sold=False) for a in chosen]
  modifier=max(0,1-amount(run,'discount')/100)
  for item in items:
   item['price']=max(1,round(item['price']*modifier))
  for item in items:item['price']=ar.price(run,item['kind'],item['price'])
  run['shop']=items
  challenge_levels.suppress(run)
 def reroll_price(run):
  count=max(0,int(run.get('shop_rerolls',0) or 0))
  return [10,20,40,60,100,150][count] if count<6 else 200+50*(count-6)
 def reroll_shop(run,rng=random):
  cursed_relics.require_choice(run)
  if run.get('stage')!='shop':raise ValueError('Shop is closed.')
  if run.get('challenge_level')==-1 and run.get('history_mode')!='tag' and (CHARACTERS[run['character']].get('copycat') or CHARACTERS[run['character']].get('engine_deck')):raise ValueError('There is no purchasable stock to reroll at LVL -1.')
  price=reroll_price(run)
  if run['gold']<price:raise ValueError('Not enough coins to reroll.')
  # Rerolls replace the encounter's featured singles with general stock.
  # Generate first so a failed restock cannot charge the player.
  restock(run,rng,general_stock=True)
  run['gold']-=price;run['shop_rerolls']=int(run.get('shop_rerolls',0) or 0)+1
  return price
 def buy(run,index,rng=random):
  cursed_relics.require_choice(run)
  if run['stage']!='shop':raise ValueError('Shop is closed.')
  item=run['shop'][index]
  if run.get('challenge_level')==-1 and item['kind']=='artifact':raise ValueError('Relics are disabled at LVL -1.')
  if CHARACTERS[run['character']].get('copycat') and item['kind']!='artifact':raise ValueError('Copycat borrows the opponent deck and can only buy relics.')
  if CHARACTERS[run['character']].get('engine_deck') and item['kind']!='artifact':raise ValueError('The Dueling Engine uses reward decks and can only buy relics.')
  if item['sold'] or item['price']>run['gold']:raise ValueError('Item unavailable or not enough coins.')
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
  elif item['kind']=='artifact':
   _pre_discount=amount(run,'discount')
   run['artifacts'].append(item['id'])
   if item['id']=='booster_shelf':ensure_shop_packs(run,rng)
   if item['id']=='final_hour':obtained.append(g.BY_NAME['Final Countdown']['id'])
   if item['id']=='stamp':run['stamped_singles']=0
   if item['id']=='ankh' and ar.can_heal(run,between=True):run['lp']=run['lp']+2000
   if ART_INFO.get(item['id'],{}).get('effect')=='discount':
    _new_mod=max(0,1-amount(run,'discount')/100);_old_mod=max(0,1-_pre_discount/100)
    if _old_mod>0:
     for _it in run['shop']:
      if not _it.get('sold'):_it['price']=max(1,round(_it['price']*_new_mod/_old_mod))
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
     _faulty[str(len(run['pool'])+_offset)]=_delta
     _fresh.append(dict(pool=len(run['pool'])+_offset,id=_cid,name=_c['name'],atk=_c['atk'] or 0,defense=_c['defense'] or 0,datk=_delta[0],ddef=_delta[1]))
   run['last_misprints']=_fresh
  stats=run.setdefault('stats',{});stats['coins_spent']=stats.get('coins_spent',0)+item['price']
  if item['kind']=='pack':stats['packs_bought']=stats.get('packs_bought',0)+1
  if item['kind']=='single':run['singles_bought']=run.get('singles_bought',0)+1
  if item['kind']=='artifact':run['relics_bought']=run.get('relics_bought',0)+1
  if item['kind']=='pack':run['bought_pack_ids']=sorted(set(run.get('bought_pack_ids',[]))|{item['id']})
  if item['kind'] in ('single','pack','deck'):run['card_purchases']=run.get('card_purchases',0)+1
  run['pool']+=obtained;run['purchased']+=len(obtained);run['gold']-=item['price'];item['sold']=True
  if item['kind']=='pack' and (amount(run,'pack_refund') or ar.has(run,'cursed_cursed_refund')):
   refund=min(item['price']-1,amount(run,'pack_refund')+20*ar.copies(run,'cursed_cursed_refund'));run['gold']+=refund;stats=run.setdefault('stats',{});stats['coins_earned']=stats.get('coins_earned',0)+refund
  update_profile(run);save(run);return obtained
 def buy_many(run,indices,rng=random):
  indices=list(dict.fromkeys(int(i) for i in indices))
  if not indices:return []
  if any(i<0 or i>=len(run['shop']) for i in indices):raise ValueError('Unknown shop item.')
  items=[run['shop'][i] for i in indices]
  if sum(x['price'] for x in items)>run['gold']:raise ValueError('Not enough gold')
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
 for name in ['load_run','save','open_pack','new_run','copy_deck','engine_deck','routes','prepare_duel','opponent_deck','rewards','finish_duel','restock','reroll_price','reroll_shop','buy','buy_many','unlock_text','unlock_rule','update_profile']:
  setattr(g,name,locals()[name])
