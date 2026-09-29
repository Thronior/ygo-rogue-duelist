"""Thin mobile transport over the unchanged desktop campaign rules."""
import json, random, re, time
import campaign as g, content, storage, achievement_model, passives

run=None
tag_session=None

def state():
 return dict(history=storage.run_history(),run=run,slots=storage.run_slots(),activeSlot=storage.active_slot(),profile=storage.profile(),settings=storage.settings(),achievements=achievement_model.entries())

def dispatch(raw):
 global run,tag_session
 req=json.loads(raw);action=req['action'];value=req.get('value');result=None
 if action=='reward-progress':
  from duel_rewards import progress
  return json.dumps({'result':progress(value['run'],value['events'],g.BY_ID,value.get('victory',False))})
 if action.startswith('tag-'):
  from tag_campaign import TagCampaign
  def checkpoint():
   storage.write(storage.ROOT/'tag-host.json',tag_session.checkpoint())
  if action=='tag-auto-preview':
   from copy import deepcopy
   preview=deepcopy(value);g.auto_deck(preview);result=preview['selected']
  elif action=='tag-profile':storage.write(storage.ROOT/'profile.json',value)
  elif action=='tag-create':
   tag_session=TagCampaign(value['characters'],value['profiles'],value.get('level',0),lobby=value.get('lobby',False));tag_session.room_code=value['code'];checkpoint();result=tag_session.view(0)
  elif action=='tag-restore':
   data=storage.read(storage.ROOT/'tag-host.json')
   code=value['code'] if isinstance(value,dict) else value
   if not data or data.get('room_code')!=code:
    if not (isinstance(value,dict) and value.get('optional')):raise ValueError('This host has no saved run for that room.')
   else:
    tag_session=TagCampaign.restore(data);result=tag_session.view(0)
  elif tag_session is None:raise ValueError('No tag run is active.')
  elif action=='tag-command':result=tag_session.command(value['seat'],value['request']);checkpoint()
  elif action=='tag-view':result=tag_session.view(int(value))
  elif action=='tag-receipt':result=tag_session.receipt(value['seat'],value['id'])
  elif action=='tag-pause':tag_session.paused=bool(value);checkpoint()
  elif action=='tag-journal':tag_session.journal(value);checkpoint()
  elif action=='tag-finish':tag_session.finish(value['winner'],value['lp'],value['events'],value.get('reason',0));checkpoint()
  else:raise ValueError('Unknown tag operation.')
 elif action=='import-profile':result=storage.merge_desktop_profile(value,[g.unlock_rule(i)[0] for i in content.PLAYABLE_IDS[2:]])
 elif action=='init':run=g.load_run()
 elif action=='select-slot':
  slot=int(value);candidate=g.load_run(slot)
  if not candidate:raise ValueError('This slot has no valid saved run.')
  storage.select_slot(slot);run=candidate
 elif action=='new':
  value=value if isinstance(value,dict) else {'character':int(value)}
  slot=int(value.get('slot',storage.active_slot()));storage.run_path(slot)
  if storage.read(storage.run_path(slot)) and not value.get('replace'):raise ValueError('Confirm before replacing this saved run.')
  candidate=g.new_run(int(value['character']),level=int(value.get('level',0)));candidate['_save_slot']=slot
  g.save(candidate);storage.record_run_start(candidate);storage.select_slot(slot);run=candidate
 elif action=='secret-champion':
  import secret_challenge
  run=secret_challenge.create(g)
 elif action=='secret-relicless':
  import secret_challenge
  run=secret_challenge.relicless(g,run)
 elif action=='champion':
  import endless
  endless.challenge(g,run)
 elif action=='next-loop':
  import endless
  endless.next_loop(g,run)
 elif action=='auto':g.auto_deck(run)
 elif action=='deselect-all':
  c=content.CHARACTERS[run['character']]
  if c.get('copycat') or c.get('engine_deck'):raise ValueError('This character uses a fixed deck.')
  run['selected']=[]
 elif action=='toggle':
  if content.CHARACTERS[run['character']].get('copycat'):raise ValueError('Copycat uses the borrowed deck plus one Copycat.')
  if content.CHARACTERS[run['character']].get('engine_deck'):raise ValueError('The Dueling Engine runs a fixed random starter deck.')
  index=int(value)
  if index<0 or index>=len(run['pool']):raise ValueError('Unknown card')
  if index in run['selected']:run['selected'].remove(index)
  else:
   cid=run['pool'][index]
   if sum(g.card_identity(run['pool'][i])==g.card_identity(cid) for i in run['selected'])>=3:raise ValueError('Maximum three copies of a card.')
   run['selected'].append(index)
 elif action=='choose':
  if int(value) not in run['routes']:raise ValueError('Unavailable opponent')
  run['opponent']=int(value)
  if content.CHARACTERS[run['character']].get('copycat'):g.copy_deck(run)
  if content.CHARACTERS[run['character']].get('engine_deck'):g.engine_deck(run)
 elif action=='begin':
  g.prepare_duel(run)
  lua=(g.RUNTIME/'puzzles/shadow-run.lua').read_text(encoding='utf8')
  groups={}
  for cid,player,location in re.findall(r'Debug.AddCard\((\d+),(\d),\d,(LOCATION_\w+),',lua):groups.setdefault((int(player),location),[]).append(int(cid))
  info=re.findall(r'Debug.SetPlayerInfo\((\d),(\d+),(\d+),1\)',lua)
  run['mobile_duel']=dict(deck=groups.get((0,'LOCATION_DECK'),[]),enemy=groups.get((1,'LOCATION_DECK'),[]),extra=groups.get((0,'LOCATION_EXTRA'),[]),enemyExtra=groups.get((1,'LOCATION_EXTRA'),[]),lp=int(info[0][1]),enemyLP=int(info[1][1]),draw=int(info[0][2]),enemyDraw=int(info[1][2]),seed=random.randrange(1,2**31),responses=[],passives=passives.script(run))
 elif action=='response':run['mobile_duel']['responses'].append(value)
 elif action=='finish':
  result=dict(protocol=1,id=run['duel']['id'],winner=value['winner'],lp=value['lp'],reason=value.get('reason',0),events=value.get('events',[]))
  g.finish_duel(run,result);run.pop('mobile_duel',None)
 elif action=='active-curses':
  import challenge_levels
  result=challenge_levels.active_modifiers(run or {})
 elif action=='peek-deck':
  if 'deck_spyglass' not in run['artifacts'] and run.get('mirror_copy')!='deck_spyglass':raise ValueError('Deck Spyglass is required.')
  opponent=int(value)
  if opponent not in run['routes']:raise ValueError('Unavailable opponent')
  main=g.opponent_deck(run['round'],random.Random(opponent+run['round']*101),opponent,run.get('tutorial_variants',{}).get(str(opponent),0),loop=run.get('loop',0))
  extra=[] if run['round']==0 and not run.get('loop') else content.opponent_record(run['round'],opponent,run.get('loop',0))['extra']
  result=main+extra
 elif action=='cursed-choose':
  import cursed_relics
  cursed_relics.choose(run,str(value))
 elif action=='cursed-reroll':
  import cursed_relics
  cursed_relics.reroll(run)
 elif action=='shop-reroll':result=g.reroll_shop(run)
 elif action=='buy-many':result=g.buy_many(run,value)
 elif action=='buy':result=g.buy(run,int(value))
 elif action=='reset-progress':storage.reset_progress();run=None
 elif action=='golden-card':
  if 'golden_sleeve' not in run['artifacts'] or int(value) not in g.deck(run):raise ValueError('Select a card in your deck with Golden Card Sleeve owned.')
  run['golden_card']=None if run.get('golden_card')==int(value) else int(value)
 elif action=='settings':storage.write(storage.ROOT/'settings.json',value)
 elif action=='notices':
  p=storage.profile();result=p.pop('achievement_notices',[]);storage.write(storage.ROOT/'profile.json',p)
 elif action=='cheat':
  if value!='heartofthecards':raise ValueError('Unknown code')
  p=storage.profile();p['unlock_all']=True;p['unlocked']=content.PLAYABLE_IDS;storage.write(storage.ROOT/'profile.json',p)
 else:raise ValueError('Unknown mobile action')
 if run and action!='import-profile':g.save(run)
 return json.dumps(dict(**state(),result=result),ensure_ascii=False)
