"""Collector local save ownership. Server receipts decide elimination and prizes."""
import copy, time, uuid
import storage, content, random_cards

def load():
 data=storage.read(storage.ROOT/'collector.json',{'duelists':[]})
 storage.register_collection(data)
 # Complete an interrupted move before either roster can be used again.
 pending=data.get('pending_move')
 if pending:
  current=storage.read(storage.run_path(pending['slot']))
  if current==pending['run']:storage.clear_run(pending['slot'])
  data.pop('pending_move',None);save(data)
 return data

def save(data):storage.write(storage.ROOT/'collector.json',data)

# Import refusals (also checked against the run in memory by android/mobile_backend.py).
BETWEEN_DUELS='You can only import a run between duels, not during a duel. Finish the duel first, then import the run.'
EMPTY_SLOT='This save slot has no run to import. Choose another saved run.'
RUN_OVER='This run has ended and cannot be imported. Choose a run that is still going.'

def dispatch(action,value):
 data=load();value=value or {}
 # Card marks (★/✕, card-marks.js) in Ultimate Collector (CITYDRIVER, user 2026-11-24): each duelist keeps the marks of
 # the run it came from. Duelists imported before that start from their character's saved marks (Character settings).
 for d in data['duelists']:
  if d.get('status')=='alive' and not isinstance(d.get('card_marks'),dict):d['card_marks']=storage.saved_marks(d.get('character'))
 if action=='list':return data
 if action=='import':
  slot=int(value['source']);source=storage.read(storage.run_path(slot))
  # Plain sentences, shown as they are (collector-ui.js): a raw traceback reached a player importing a run mid-duel
  # (Discord, 2026-11-25). A run is saved with stage 'duel' (and its moves in mobile_duel) until the duel ends.
  if not source:raise ValueError(EMPTY_SLOT)
  if source.get('stage')=='gameover':raise ValueError(RUN_OVER)
  if source.get('stage')=='duel' or source.get('mobile_duel'):raise ValueError(BETWEEN_DUELS)
  if content.CHARACTERS[source['character']].get('copycat'):raise ValueError('Copycat saves cannot enter Ultimate Collector.')
  # Randomized cards are banned in Ultimate Collector (user, 2026-11-16): they only exist in the run that made them.
  # A Randomizer run (all of its cards randomized) cannot enter; any other run leaves its randomized cards behind.
  if content.randomized_run(source):raise ValueError('Randomizer saves cannot enter Ultimate Collector.')
  source_pool=[cid for cid in source['pool'] if not random_cards.is_random(cid)]
  name=str(value.get('name','')).strip()
  if not name or len(name)>32:raise ValueError('Use a duelist name with 1–32 characters.')
  occupied={d['slot'] for d in data['duelists'] if d['status']=='alive'}
  target=int(value['slot'])
  if target not in range(1,10) or target in occupied:raise ValueError('Choose an empty Collector slot.')
  marks={str(k):v for k,v in (source.get('card_marks') or {}).items() if v in (1,-1)}
  duelist=dict(id=uuid.uuid4().hex,token=uuid.uuid4().hex+uuid.uuid4().hex,slot=target,name=name,character=source['character'],pool=source_pool,status='alive',wins=0,history=[],deck={'main':[],'side':[],'extra':[]},created=int(time.time()*1000),card_marks=marks)
  data['duelists'].append(duelist);data['pending_move']={'slot':slot,'run':source};save(data)
  storage.clear_run(slot);data.pop('pending_move');save(data)
  return data
 duelist=next((d for d in data['duelists'] if d['id']==value.get('id')),None)
 if not duelist:raise ValueError('Collector not found.')
 if action=='delete':
  if duelist.get('status')!='deleted':raise ValueError('Confirm deletion with the server first.')
  data['duelists']=[d for d in data['duelists'] if d['id']!=duelist['id']]
  save(data);storage.write((storage.ROOT/'collector.json').with_suffix('.bak'),data);return data
 if action=='mark':
  # value: {id, card: one card id or a list, mark: 1 (★), -1 (✕) or 0 (none)}. Local only; the server never sees marks.
  if duelist['status']!='alive':raise ValueError('This duelist has been eliminated.')
  ids=value.get('card');ids=ids if isinstance(ids,list) else [ids];mark=value.get('mark')
  if mark not in (-1,0,1) or not ids or len(ids)>30000 or any(not isinstance(i,int) or isinstance(i,bool) for i in ids):raise ValueError('Unknown card')
  marks=dict(duelist.get('card_marks') or {})
  for cid in ids:
   if mark:marks[str(cid)]=mark
   else:marks.pop(str(cid),None)
  if len(marks)>30000:raise ValueError('Too many marked cards.')
  duelist['card_marks']=marks;save(data);return data
 if action=='draft':
  if duelist['status']!='alive':raise ValueError('This duelist has been eliminated.')
  deck=value.get('deck',{})
  if any(not isinstance(deck.get(k),list) or len(deck[k])>30000 or any(not isinstance(i,int) for i in deck[k]) for k in ('main','side','extra')):raise ValueError('Invalid deck draft.')
  duelist['draftDeck']=copy.deepcopy(deck);save(data);return data
 if action=='sync':
  # Transport supplies the authenticated server record, never a local timeout.
  record=value['record']
  if record.get('id')!=duelist['id']:raise ValueError('Wrong Collector receipt.')
  for key in ('status','wins','history','pool','deck','room','defeatedDeck','defeatedAt','defeatReason'):
   if key in record:duelist[key]=record[key]
  if duelist['status']!='alive':
   duelist.pop('pool',None);duelist.pop('deck',None);duelist.pop('draftDeck',None)
  save(data)
  # Scrub eliminated collections from the recovery backup, too.
  if duelist['status']!='alive':storage.write((storage.ROOT/'collector.json').with_suffix('.bak'),data)
  return data
 raise ValueError('Unknown Collector operation.')
