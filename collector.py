"""Collector local save ownership. Server receipts decide elimination and prizes."""
import copy, time, uuid
import storage, content

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

def dispatch(action,value):
 data=load();value=value or {}
 if action=='list':return data
 if action=='import':
  slot=int(value['source']);source=storage.read(storage.run_path(slot))
  if not source or source.get('stage')=='gameover':raise ValueError('Choose an existing living single-player save.')
  if source.get('stage')=='duel':raise ValueError('finish your duel to import this collector')
  if content.CHARACTERS[source['character']].get('copycat'):raise ValueError('Copycat saves cannot enter Ultimate Collector.')
  name=str(value.get('name','')).strip()
  if not name or len(name)>32:raise ValueError('Use a duelist name with 1–32 characters.')
  occupied={d['slot'] for d in data['duelists'] if d['status']=='alive'}
  target=int(value['slot'])
  if target not in range(1,10) or target in occupied:raise ValueError('Choose an empty Collector slot.')
  duelist=dict(id=uuid.uuid4().hex,token=uuid.uuid4().hex+uuid.uuid4().hex,slot=target,name=name,character=source['character'],pool=copy.deepcopy(source['pool']),status='alive',wins=0,history=[],deck={'main':[],'side':[],'extra':[]},created=int(time.time()*1000))
  data['duelists'].append(duelist);data['pending_move']={'slot':slot,'run':source};save(data)
  storage.clear_run(slot);data.pop('pending_move');save(data)
  return data
 duelist=next((d for d in data['duelists'] if d['id']==value.get('id')),None)
 if not duelist:raise ValueError('Collector not found.')
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
