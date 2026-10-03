"""Host-authoritative two-player campaign. Isolated from the offline save/profile.
Transport messages carry commands, never client-supplied prices, card pools or rewards.
"""
from contextlib import contextmanager
from copy import deepcopy
from pathlib import Path
import json, random, re, uuid
import campaign as game, storage, content, passives, challenge_levels, shop_rewards, encounters
import cursed_relics,approved_relics as ar

class TagCampaign:
 def __init__(self, characters, profiles, level=0, seed=None, lobby=False):
  if len(characters)!=2 or len(profiles)!=2:raise ValueError('Two players are required.')
  self.trade=self.new_trade()
  self.finale={'votes':[False,False],'status':'available','winner':None};self.room_code=None;self.rng=random.Random(seed);self.profiles=deepcopy(profiles);self.players=[];self.revision=0;self.receipts={};self.ready=[False,False];self.phase='lobby' if lobby else 'draft';self.shop_seat=0;self.duel=None;self.paused=False
  if not (level==-1 and profiles[0].get('relicless_unlocked') or 0<=level<=challenge_levels.unlocked(profiles[0],characters[0])):raise ValueError('The host has not unlocked this level.')
  for seat,character in enumerate(characters):
   with self.scope(seat):run=game.new_run(character,self.rng,level if seat==0 else 0)
   run['history_mode']='tag';run['history_partner']=characters[1-seat]
   run['challenge_level']=level
   if level==-1:
    run['lp']=8000
    if run.get('starting_relic')=='final_hour' and run['pool'][-1]==game.BY_NAME['Final Countdown']['id']:run['pool'].pop()
   challenge_levels.suppress(run)
   if level>=4:run['lp']=4000
   self.players.append(run)
  self.shared={'boss_rerolls':0,'shop_rerolls':0,'gold':40,'lp':max(r['lp'] for r in self.players),'artifacts':list(dict.fromkeys(a for r in self.players for a in r['artifacts'])),'shop':[],'round':0,'curses':[],'cursed_offer':None,'cursed_artifacts':[]}
  self.sync();self.routes()
  if not lobby:
   for seat in (0,1):
    with self.scope(seat):storage.record_run_start(self.players[seat])
 @contextmanager
 def scope(self,seat):
  # Call the exact single-player rules without writing its run or profile.
  old_profile,old_write,old_runtime=storage.profile,storage.write,game.RUNTIME
  storage.profile=lambda:deepcopy(self.profiles[seat])
  def capture(path,value):
   if Path(path).name=='profile.json':self.profiles[seat]=deepcopy(value)
  storage.write=capture;game.RUNTIME=game.ROOT/'temp/tag-duel-preparation';game.RUNTIME.mkdir(parents=True,exist_ok=True)
  try:yield
  finally:storage.profile,storage.write,game.RUNTIME=old_profile,old_write,old_runtime
 def finish_shop_turn(self):
  self.shop_seat+=1
  if self.shop_seat==2:
   self.phase='draft';self.ready=[False,False]
   for r in self.players:r['stage']='draft';r['gold_leaving_shop']=self.shared['gold']
   self.routes()
 def sync(self):
  ar.reconcile_turn_order(self.shared)
  for run in self.players:
   run.update(loop=0,encore_active=False,encore_won=False)
   for key,value in self.shared.items():run[key]=deepcopy(value)
   shop_rewards.normalize_run(run)
 def routes(self):
  self.shared['revealed_opponents']=[]
  if self.shared['round']>=content.RUN_LENGTH:
   for run in self.players:run['routes']=[];run['opponent']=None
   return
  excluded={r['character'] for r in self.players}|set(self.players[0].get('defeated_opponents',[]))|set(self.players[1].get('defeated_opponents',[]))
  count=1 if (self.shared['round']+1)%3==0 else 5
  for seat,run in enumerate(self.players):
   with self.scope(seat):game.routes(run,self.rng)
   run['routes']=[i for i in run['routes'] if i not in excluded]
   choices=[i for i in content.eligible_opponents(run['round']) if i not in excluded and i not in run['routes']]
   for opponent in self.rng.sample(choices,min(max(0,count-len(run['routes'])),len(choices))):
    run['routes'].append(opponent)
    variant=content.TUTORIAL_OPPONENTS[opponent] if run['round']==0 else 0
    if run['round']==0:run.setdefault('tutorial_variants',{})[str(opponent)]=variant
    deck=game.opponent_deck(run['round'],random.Random(opponent+run['round']*101),opponent,variant)
    run['route_rewards'][str(opponent)]=shop_rewards.random_reward(self.rng,self.profiles[seat])
    if run.get('challenge_level')!=-1 and (run['round']+1)%3==0:run['route_curses'][str(opponent)]=self.rng.choices(list(content.CURSES),k=min(3,(run['round']+1)//3))
   if len(run['routes'])!=count:raise ValueError('Not enough undefeated opponents remain.')
   if count==1:excluded.update(run['routes'])
   run['opponent']=None
 def view(self,seat):
  run=deepcopy(self.players[seat])
  if self.duel and self.duel.get('mode')=='pvp':
   run['opponent']=self.players[1-seat]['character']
   run['artifacts']=deepcopy(self.finale.get('picks',[run['artifacts'],run['artifacts']])[seat])
  return dict(protocol=1,trade=self.trade_view(seat),finale=deepcopy(self.finale),revision=self.revision,phase=self.phase,paused=self.paused,seat=seat,shopSeat=self.shop_seat,ready=self.ready[:],characters=[r['character'] for r in self.players],opponents=[r['opponent'] for r in self.players],modifiers=challenge_levels.active_modifiers(self.players[seat]),run=run,profile=deepcopy(self.profiles[seat]),duel=deepcopy(self.duel) if self.phase=='duel' and seat==0 else None)
 def checkpoint(self):
  return deepcopy(dict(protocol=1,trade=self.trade,finale=self.finale,room_code=self.room_code,players=self.players,profiles=self.profiles,shared=self.shared,revision=self.revision,receipts=self.receipts,ready=self.ready,phase=self.phase,shop_seat=self.shop_seat,duel=self.duel,paused=self.paused,rng_state=self.rng.getstate()))
 @staticmethod
 def new_trade():return dict(id=uuid.uuid4().hex,status='idle',votes=[False,False],sent=[False,False],offers=[[],[]],received=[[],[]],ack=[False,False])
 def trade_view(self,seat):
  t=self.trade
  return dict(id=t['id'],status=t['status'],votes=t['votes'][:],sent=t['sent'][:],selected=t['offers'][seat][:],received=t['received'][seat][:],ack=t['ack'][:],available=not any(content.CHARACTERS[r['character']].get('copycat') or content.CHARACTERS[r['character']].get('engine_deck') for r in self.players))
 def trade_command(self,seat,action,value):
  legacy_trade=self.phase=='shop' and self.trade['status'] in ('select','received') and action!='trade-vote'
  if not legacy_trade and (self.phase!='draft' or self.shared.get('round',0)<1):raise ValueError('Trading is available in the deck editor after both players finish shopping.')
  t=self.trade
  if not isinstance(value,dict) or value.get('id')!=t['id']:raise ValueError('This trade has changed. Please try again.')
  if not self.trade_view(seat)['available']:raise ValueError('Borrowed and automatically replaced decks cannot trade cards.')
  if action=='trade-vote':
   if t['status']!='idle' or type(value.get('ready'))!=bool:raise ValueError('The trade has already started.')
   t['votes'][seat]=value['ready']
   if all(t['votes']):t['status']='select';self.ready=[False,False]
   return
  if action=='trade-send':
   if t['status']!='select' or t['sent'][seat]:raise ValueError('Your cards have already been submitted.')
   selected=value.get('cards')
   if not isinstance(selected,list) or any(type(i)!=int or not 0<=i<len(self.players[seat]['pool']) for i in selected) or len(set(selected))!=len(selected):raise ValueError('Choose valid, distinct copies from your collection.')
   t['offers'][seat]=selected[:];t['sent'][seat]=True
   if all(t['sent']):self.complete_trade()
   return
  if action=='trade-ack':
   if t['status']!='received':raise ValueError('Wait until both players have sent their cards.')
   t['ack'][seat]=True
   if all(t['ack']):self.trade=self.new_trade()
   return
  raise ValueError('Unknown trade operation.')
 def complete_trade(self):
  # Transfer physical pool copies atomically; preserve per-copy modifications and deck indices.
  t=self.trade;outgoing=[]
  for seat,run in enumerate(self.players):
   mods=run.setdefault('card_mods',{})
   if run.get('faulty'):
    for i,cid in enumerate(run['pool']):
     if str(cid) in run['faulty']:mods.setdefault(str(i),deepcopy(run['faulty'][str(cid)]))
    run.pop('faulty',None)
   outgoing.append([(run['pool'][i],deepcopy(mods.get(str(i)))) for i in t['offers'][seat]])
  for seat,run in enumerate(self.players):
   removed=set(t['offers'][seat]);kept=[i for i in range(len(run['pool'])) if i not in removed];remap={old:new for new,old in enumerate(kept)}
   mods=run.get('card_mods',{});run['card_mods']={str(remap[int(i)]):v for i,v in mods.items() if int(i) in remap}
   run['pool']=[run['pool'][i] for i in kept];run['selected']=[remap[i] for i in run['selected'] if i in remap]
   for cid,mod in outgoing[1-seat]:
    if mod is not None:run['card_mods'][str(len(run['pool']))]=mod
    run['pool'].append(cid)
   if run.get('golden_card') not in run['pool']:run.pop('golden_card',None)
   t['received'][seat]=[cid for cid,_ in outgoing[1-seat]]
  t['status']='received'
 def receipt(self,seat,key):
  if seat not in (0,1) or not isinstance(key,str):raise ValueError('Invalid receipt.')
  return deepcopy(self.receipts.get(str(seat)+':'+key))
 def journal(self,entry):
  if self.phase!='duel' or self.duel is None:raise ValueError('No active tag duel.')
  if entry.get('id') and self.receipt(entry['seat'],entry['id']) is not None:return
  self.duel['responses'].append(deepcopy(entry))
  if entry.get('id'):
   # Keep response receipts after the duel ends too. Losing the victory receipt
   # must not turn a successful response into a second action after reconnecting.
   self.receipts[str(entry['seat'])+':'+entry['id']]={'result':{'ok':True}}
 @classmethod
 def restore(cls,data):
  if data.get('protocol')!=1:raise ValueError('Unsupported tag save.')
  self=cls.__new__(cls)
  self.trade=deepcopy(data.get('trade',self.new_trade()))
  self.finale=deepcopy(data.get('finale',{'votes':[False,False],'status':'available','winner':None}))
  for key in ('room_code','players','profiles','shared','revision','receipts','ready','phase','shop_seat','duel','paused'):setattr(self,key,deepcopy(data[key]))
  def tuples(x):return tuple(tuples(v) for v in x) if isinstance(x,list) else x
  self.shared.setdefault('shop_rerolls',0);self.shared.setdefault('cursed_offer',None);self.shared.setdefault('cursed_artifacts',[])
  self.rng=random.Random();self.rng.setstate(tuples(data['rng_state']));self.sync()
  if self.phase=='draft' and (self.shared['round']+1)%3==0 and any(len(r.get('routes',[]))>1 for r in self.players):self.ready=[False,False];self.routes()
  if self.phase=='draft':
   for seat,run in enumerate(self.players):
    if run.get('reward_rules')!=5:run['route_rewards']={str(i):shop_rewards.random_reward(self.rng,self.profiles[seat]) for i in run['routes']};run['reward_rules']=5
  return self
 def command(self,seat,request):
  if seat not in (0,1):raise ValueError('Invalid seat.')
  key=str(seat)+':'+str(request.get('id',''))
  if not isinstance(request.get('id'),str) or not 1<=len(request['id'])<=80:raise ValueError('Command needs a unique ID.')
  if key in self.receipts:return deepcopy(self.receipts[key])
  if self.paused:raise ValueError('Waiting for your teammate to reconnect.')
  revision=request.get('revision')
  independent=request.get('action') in ('deck','auto','choose','ready','unready','golden-card','finale-vote','finale-skip','finale-mode','trade-vote','trade-send','trade-ack')
  if type(revision)!=int or revision>self.revision or (revision!=self.revision and not independent):raise ValueError('State changed. Refresh before trying again.')
  before=self.checkpoint()
  try:
   result=self.apply(seat,request['action'],request.get('value'));self.revision+=1
   receipt={'revision':self.revision,'result':result};self.receipts[key]=receipt
   # Keep all purchase IDs for this run: reconnect retries must never buy twice.
   return deepcopy(receipt)
  except Exception:
   restored=self.restore(before);self.__dict__.update(restored.__dict__);raise
 def apply(self,seat,action,value):
  run=self.players[seat]
  if action=='reveal-opponent':
   import boss_selection
   if self.phase!='draft':raise ValueError('Reveal opponents before the duel.')
   cost=boss_selection.reveal(run,value);self.shared['gold']=run['gold'];self.shared['revealed_opponents']=run.get('revealed_opponents',[])[:];self.sync();return cost
  if action=='boss-reroll':
   import boss_selection
   if self.phase!='draft' or (self.shared['round']+1)%3 or any(self.ready):raise ValueError('Unlock both selections before rerolling bosses.')
   cost=boss_selection.price(self.shared)
   if self.shared['gold']<cost:raise ValueError('Not enough coins to reroll the bosses.')
   self.routes();self.shared['gold']-=cost;self.shared['boss_rerolls']=self.shared.get('boss_rerolls',0)+1;self.sync();return cost
  if action=='peek-deck':
   if not ar.has(run,'deck_spyglass') or int(value) not in run['routes']:raise ValueError('Deck Spyglass is required.')
   i=int(value);main=game.opponent_deck(run['round'],random.Random(i+run['round']*101),i,run.get('tutorial_variants',{}).get(str(i),0));return main+([] if run['round']==0 else content.opponent_record(run['round'],i)['extra'])
  if action.startswith('trade-'):return self.trade_command(seat,action,value)
  if self.trade['status']!='idle':raise ValueError('Finish the card trade before continuing.')
  if action in ('finale-vote','finale-skip'):
   if self.phase!='complete' or self.finale['status']!='available':raise ValueError('The optional final duel is not available.')
   if action=='finale-skip':self.finale['status']='skipped';self.finale['votes']=[False,False];return
   if type(value)!=bool:raise ValueError('Choose whether to play the final duel.')
   self.finale['votes'][seat]=value
   if all(self.finale['votes']):self.finale.update(status='choosing',mode_votes=[None,None])
   return
  if action=='finale-mode':
   if self.phase!='complete' or self.finale['status']!='choosing':raise ValueError('Choose a mode after both players agree to duel.')
   if value not in ('none','draft','all'):raise ValueError('Invalid relic mode.')
   self.finale['mode_votes'][seat]=value
   votes=self.finale['mode_votes']
   if all(votes):
    if votes[0]==votes[1]:self.choose_finale_mode(votes[0])
    else:self.finale.update(status='resolving',mode=self.rng.choice(votes))
   return
  if action=='finale-resolve':
   if seat!=0 or self.phase!='complete' or self.finale['status']!='resolving':raise ValueError('No mode roll is waiting to resolve.')
   self.choose_finale_mode(self.finale['mode'])
   return
  if action=='finale-pick':
   f=self.finale
   if self.phase!='complete' or f['status']!='drafting' or seat!=f['turn']:raise ValueError('Wait for your relic draft turn.')
   if type(value)!=int or value not in f['remaining']:raise ValueError('That relic has already been picked.')
   f['picks'][seat].append(f['pool'][value]);f['remaining'].remove(value);f['turn']=1-seat
   if not f['remaining']:self.prepare_finale()
   return
  if self.phase=='lobby':
   if action!='start' or seat!=0:raise ValueError('Only the host can start the run.')
   self.phase='draft'
   for player in (0,1):
    with self.scope(player):storage.record_run_start(self.players[player])
   return
  if action in ('cursed-choose','cursed-reroll'):
   if self.phase!='shop' or seat!=0:raise ValueError('The host chooses the shared boss relic.')
   with self.scope(seat):
    if action=='cursed-choose':cursed_relics.choose(run,value,self.rng)
    else:cursed_relics.reroll(run,self.rng)
   for field in ('artifacts','cursed_artifacts','cursed_offer','shop'):self.shared[field]=deepcopy(run.get(field))
   self.sync();return
  if action=='shop-reroll':
   if self.phase!='shop' or self.shop_seat!=seat:raise ValueError('It is your teammate’s shopping turn.')
   with self.scope(seat):price=game.reroll_shop(run,self.rng)
   for key in ('gold','shop','shop_rerolls'):self.shared[key]=deepcopy(run[key])
   self.sync();return price
  if action in ('buy','skip'):
   cursed_relics.require_choice(run)
   if self.phase!='shop' or self.shop_seat!=seat:raise ValueError('It is your teammate’s shopping turn.')
   with self.scope(seat):result=game.buy_many(run,value or [],self.rng) if action=='buy' else []
   for key in ('gold','lp','artifacts','shop'):self.shared[key]=deepcopy(run[key])
   self.trade=self.new_trade()
   self.sync()
   from golden_cards import pending
   if pending(run):run['golden_shop_waiting']=True
   else:self.finish_shop_turn()
   return result
  if action=='golden-card':
   from golden_cards import choose,pending
   choose(run,value)
   if run.get('golden_shop_waiting') and not pending(run):
    run.pop('golden_shop_waiting');self.finish_shop_turn()
   return
  if self.phase!='draft':raise ValueError('Deck editing is not available now.')
  if self.ready[seat] and action!='unready':raise ValueError('Unlock your selection before editing.')
  if action=='unready':self.ready[seat]=False;return
  if action=='auto':game.auto_deck(run);return
  if action=='deck':
   if content.CHARACTERS[run['character']].get('copycat') or content.CHARACTERS[run['character']].get('engine_deck'):raise ValueError('This character uses a fixed deck.')
   if not isinstance(value,list) or len(value)>100 or len(value)!=len(set(value)) or any(type(i)!=int or not 0<=i<len(run['pool']) for i in value):raise ValueError('Invalid deck selection.')
   run['selected']=value[:];return
  if action=='choose':
   if value not in run['routes']:raise ValueError('Choose an offered opponent.')
   run['opponent']=value
   with self.scope(seat):
    if content.CHARACTERS[run['character']].get('copycat'):game.copy_deck(run,self.rng)
    if content.CHARACTERS[run['character']].get('engine_deck'):game.engine_deck(run,self.rng)
   return
  if action=='ready':
   # Commit the final local draft atomically; intermediate edits never travel.
   if value is not None:
    if not isinstance(value,dict):raise ValueError('Invalid final deck.')
    self.apply(seat,'choose',value.get('opponent'))
    character=content.CHARACTERS[run['character']]
    if not (character.get('copycat') or character.get('engine_deck')):self.apply(seat,'deck',value.get('selected'))
   if run['opponent'] is None:raise ValueError('Choose an opponent first.')
   if self.players[1-seat]['opponent']==run['opponent'] and self.ready[1-seat]:raise ValueError('Your teammate chose this opponent. Choose a different one.')
   error=game.validate(run)
   if error:raise ValueError(error)
   self.ready[seat]=True
   if all(self.ready):self.prepare()
   return
  raise ValueError('Unknown tag action.')
 def prepare(self):
  if self.shared['round']>=content.RUN_LENGTH:raise ValueError('The multiplayer campaign is complete.')
  configurations=[]
  for seat,run in enumerate(self.players):
   with self.scope(seat):
    game.prepare_duel(run,self.rng);lua=(game.RUNTIME/'puzzles/shadow-run.lua').read_text(encoding='utf8')
   groups={}
   for code,team,location in re.findall(r'Debug.AddCard\((\d+),(\d),\d,(LOCATION_\w+),',lua):groups.setdefault((int(team),location),[]).append(int(code))
   info=re.findall(r'Debug.SetPlayerInfo\((\d),(\d+),(\d+),1\)',lua)
   configurations.append({'teams':[{'main':groups.get((t,'LOCATION_DECK'),[]),'extra':groups.get((t,'LOCATION_EXTRA'),[])} for t in (0,1)],'lp':int(info[0][1]),'enemyLP':int(info[1][1]),'draw':int(info[0][2]),'enemyDraw':int(info[1][2])})
  combined=deepcopy(self.players[0]);combined['curses']=list(dict.fromkeys(c for r in self.players for c in r['curses']))
  self.shared['curses']=combined['curses'];self.sync()
  self.duel={'teams':[[c['teams'][t] for c in configurations] for t in (0,1)],'lp':min(c['lp'] for c in configurations),'enemyLP':max(c['enemyLP'] for c in configurations),'draw':max(c['draw'] for c in configurations),'enemyDraw':max(c['enemyDraw'] for c in configurations),'seed':self.rng.randrange(1,2**31),'passives':passives.script(combined),'names':[[content.CHARACTERS[r[key]]['name'] for r in self.players] for key in ('character','opponent')],'responses':[]}
  self.phase='duel'
 def choose_finale_mode(self,mode):
  pool=self.shared['artifacts'][:]
  self.finale.update(mode=mode,pool=pool,picks=[[],[]],remaining=list(range(len(pool))),turn=0)
  if mode=='draft' and pool:self.finale['status']='drafting'
  else:
   self.finale['picks']=[pool[:],pool[:]] if mode=='all' else [[],[]]
   self.prepare_finale()
 def prepare_finale(self):
  decks=[];runs=deepcopy(self.players)
  for run in runs:
   pairs=[(i,run['pool'][i]) for i in sorted(run['selected'])]
   main=[x for x in pairs if not game.is_extra(x[1])];extra=[x for x in pairs if game.is_extra(x[1])]
   if not main:raise ValueError('Both players need a main deck for the final duel.')
   self.rng.shuffle(main)
   decks.append({'main':[cid for _,cid in main],'extra':[cid for _,cid in extra]})
   run['duel_modifications']=[]
   for location,items in [('DECK',main),('EXTRA',extra)]:
    for sequence,(i,cid) in enumerate(items):
     if str(i) in run.get('card_mods',{}):
      a,d=run['card_mods'][str(i)];card=game.BY_ID[cid]
      run['duel_modifications'].append(dict(location=location,sequence=sequence,atk=max(0,card['atk']+a),defense=max(0,card['defense']+d)))
  originals=deepcopy(decks)
  for seat,run in enumerate(runs):
   if content.CHARACTERS[run['character']].get('copycat'):
    decks[seat]=deepcopy(originals[1-seat]);decks[seat]['main'].append(game.BY_NAME['Copycat']['id']);self.rng.shuffle(decks[seat]['main']);run['duel_modifications']=[]
  scripts=[];draws=[]
  for seat,run in enumerate(runs):
   artifacts=self.finale.get('picks',[self.shared['artifacts'][:],self.shared['artifacts'][:]])[seat][:]
   others=[a for a in artifacts if a not in ('magic_mirror','blank_relic')]
   mirror=self.rng.choice(others) if 'magic_mirror' in artifacts and others else None
   info=[content.ART_INFO[a] for a in artifacts if a!='magic_mirror']+([content.ART_INFO[mirror]] if mirror else [])
   opening=1 if any(a['effect']=='rulebook' for a in info) else 5+sum(a['amount'] for a in info if a['effect']=='opening')
   draws.append(ar.opening({'artifacts':artifacts,'mirror_copy':mirror},opening))
   run.update(artifacts=artifacts,curses=[],loop=0,first_player=0,mirror_copy=mirror,challenge_level=0)
   scripts.append(passives.multiplayer_script(run,seat))
  self.duel={'mode':'pvp','teams':[[decks[0]],[decks[1]]],'lp':8000,'enemyLP':8000,'draw':draws[0],'enemyDraw':draws[1],'seed':self.rng.randrange(1,2**31),'passives':'\n'.join(scripts),'names':[[content.CHARACTERS[r['character']]['name']] for r in runs],'responses':[]}
  self.finale['status']='playing';self.phase='duel';self.ready=[False,False]
 def finish(self,winner,lp,events,reason=0):
  """Host engine only. Never exposed as an action a remote player may submit."""
  if self.phase!='duel':raise ValueError('No active tag duel.')
  if self.duel and self.duel.get('mode')=='pvp':
   self.finale.update(status='finished',winner=winner if winner in (0,1) else None)
   self.phase='complete';self.duel=None;self.ready=[False,False];self.revision+=1;return
  # Snapshot both chosen rewards before either completion advances its routes.
  rewards=[shop_rewards.normalize_reward(r.get('route_rewards',{}).get(str(r['opponent']),shop_rewards.reward_for(r['opponent']))) for r in self.players]
  pack_character=self.players[self.shared['round']%2]['character']
  for run in self.players:run['tag_shop_rewards']=deepcopy(rewards);run['shop_pack_character']=pack_character
  burden_allowed=all(ar.eligible(dict(r,round=r['round']+1,blocked_cursed=[]),'cursed_collectors_burden') for r in self.players)
  for seat,run in enumerate(self.players):
   run['blocked_cursed']=[] if burden_allowed else ['cursed_collectors_burden']
   result={'protocol':1,'id':run['duel']['id'],'winner':winner,'lp':lp,'events':events,'reason':reason}
   with self.scope(seat):game.finish_duel(run,result,self.rng)
  host=self.players[0]
  # One team reward and healing, not a duplicate payout per connected player.
  for key in ('gold','lp','artifacts','shop','round','curses','cursed_offer','cursed_artifacts','shop_rerolls'):self.shared[key]=deepcopy(host.get(key))
  defeated=sorted(set(x for r in self.players for x in r.get('defeated_opponents',[])))
  for run in self.players:run['defeated_opponents']=defeated[:];run['last_rewards']=deepcopy(host['last_rewards']);run['last_gold']=host['last_gold']
  self.sync();self.phase=host['stage'];self.shop_seat=0;self.ready=[False,False];self.duel=None;self.revision+=1
