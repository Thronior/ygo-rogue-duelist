"""Versioned JSON, atomic replacement, fsync and last-known-good backup."""
import hashlib, json, os, shutil, uuid
from pathlib import Path
ROOT=Path(__file__).parent/'saves'
def encoded(value): return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode('utf8')
def read(path,default=None,validate=None):
 path=Path(path)
 for candidate in (path,path.with_suffix('.bak')):
  try:
   if candidate.stat().st_size>8_000_000: continue
   obj=json.loads(candidate.read_text(encoding='utf-8-sig'))
   if 'payload' in obj:
    if obj.get('schema')!=1 or hashlib.sha256(encoded(obj['payload'])).hexdigest()!=obj.get('sha256'): continue
    obj=obj['payload']
   if validate and not validate(obj): continue
   return obj
  except (OSError,ValueError,TypeError,KeyError): pass
 return default
def write(path,value):
 path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
 if path.parent==ROOT and path.name in ('run.json','run-2.json','run-3.json','collector.json'):
  register_collection(value)
 envelope={'schema':1,'sha256':hashlib.sha256(encoded(value)).hexdigest(),'payload':value}
 tmp=path.with_name(path.name+'.'+uuid.uuid4().hex+'.tmp')
 try:
  with tmp.open('wb') as f: f.write(encoded(envelope));f.flush();os.fsync(f.fileno())
  if path.exists() and read(path) is not None:
   # Back up validated data, never replace a good backup with corrupt bytes.
   previous=read(path);backup=path.with_suffix('.bak');bt=backup.with_suffix('.tmp')
   bt.write_bytes(encoded({'schema':1,'sha256':hashlib.sha256(encoded(previous)).hexdigest(),'payload':previous}));os.replace(bt,backup)
  os.replace(tmp,path)
 finally: tmp.unlink(missing_ok=True)
def profile():
 p=read(ROOT/'profile.json',{})
 if not isinstance(p,dict): p={}
 for k,v in {'unlocked':[0,1],'wins':0,'runs':0,'victories':0,'won_as':[],'max_gold':0,'max_bought':0,'max_artifacts':0,'decks_bought':0}.items():p.setdefault(k,v)
 if 'achievement_notices' in p:p['achievement_notices']=[n for n in p['achievement_notices'] if not str(n.get('id','')).startswith(('card:','pack:'))]
 return p
def record_run_start(run):
 p=profile()
 ident=str(run.get('started_at'))+':'+str(run.get('character'))
 if p.get('last_counted_run')!=ident:
  history=p.get('run_history',[])
  p['runs']=max(int(p.get('runs',0)),len(history),int(p.get('wins',0)))+1
  p['last_counted_run']=ident
  write(ROOT/'profile.json',p)

def settings():
 p=read(ROOT/'settings.json',{})
 if not isinstance(p,dict):p={}
 def volume(key,default):
  try:return max(0,min(100,int(p.get(key,default))))
  except (ValueError,TypeError):return default
 resolution=p.get('resolution','1280x880')
 if resolution not in ['1024x768','1280x720','1280x880','1600x900','1920x1080']:resolution='1280x880'
 return dict(simpleBackgrounds=bool(p.get('simpleBackgrounds',False)),duelBackground='tunnel' if p.get('duelBackground')=='tunnel' else 'spiral',resolution=resolution,fullscreen=bool(p.get('fullscreen',False)),music=volume('music',35),sound=volume('sound',65))


def migrate_previous_install():
 """Keep progress when the installer creates a newer versioned folder on D:."""
 app=Path(__file__).parent
 if not app.name.startswith('Shadow Run Playable ') or any((ROOT/n).exists() for n in ('run.json','profile.json','settings.json')):return
 candidates=[]
 for other in app.parent.glob('Shadow Run Playable *'):
  if other==app or not other.is_dir():continue
  try:version=tuple(map(int,(other/'VERSION').read_text().strip().split('.')))
  except (OSError,ValueError):continue
  if (other/'saves/profile.json').exists():candidates.append((version,other/'saves'))
 if not candidates:return
 source=max(candidates,key=lambda row:row[0])[1]
 ROOT.mkdir(exist_ok=True)
 for name in ('run.json','run.bak','run-2.json','run-2.bak','run-3.json','run-3.bak','run-slots.json','run-slots.bak','profile.json','profile.bak','settings.json','settings.bak'):
  candidate=source/name
  if candidate.exists() and read(candidate) is not None and not (ROOT/name).exists():shutil.copy2(candidate,ROOT/name)

migrate_previous_install()


def reset_progress():
 """Called only after the settings screen's two explicit confirmations."""
 fresh={'unlocked':[0,1],'wins':0,'runs':0,'victories':0,'won_as':[],'max_gold':0,'max_bought':0,'max_artifacts':0}
 # Replace both current state and recovery backup so recovery cannot restore it.
 for name,value in [('profile.json',fresh),('registered-cards.json',{'cards':[]}),('run.json',None),('run-2.json',None),('run-3.json',None),('run-slots.json',{'active':1})]:
  write(ROOT/name,value)
  write((ROOT/name).with_suffix('.bak'),value)


def run_path(slot=None):
 slot=active_slot() if slot is None else slot
 if type(slot) is not int or slot not in (1,2,3):raise ValueError('Choose save slot 1, 2 or 3.')
 # Keep the existing save in slot 1 without moving or rewriting it.
 return ROOT/('run.json' if slot==1 else f'run-{slot}.json')

def active_slot():
 value=read(ROOT/'run-slots.json',{})
 slot=value.get('active',1) if isinstance(value,dict) else 1
 return slot if type(slot) is int and slot in (1,2,3) else 1

def select_slot(slot):
 run_path(slot)
 write(ROOT/'run-slots.json',{'active':slot})

def clear_run(slot=None):
 # Replace both copies so recovery can never resurrect a lost run.
 path=run_path(slot)
 write(path,None)
 write(path.with_suffix('.bak'),None)

def run_slots():
 slots=[]
 for slot in (1,2,3):
  run=read(run_path(slot))
  if isinstance(run,dict) and run.get('stage')=='gameover':archive_run(run);clear_run(slot);run=None
  occupied=run_path(slot).exists() or run_path(slot).with_suffix('.bak').exists()
  summary={k:run.get(k) for k in ('character','round','loop','stage','lp','challenge_level','last_played_at')} if isinstance(run,dict) else None
  slots.append(dict(slot=slot,run=summary,occupied=occupied and run is not None))
 return slots


def archive_run(run):
 """Compact terminal summary, saved before a lost slot is cleared. Upsert per loop."""
 if not isinstance(run,dict) or run.get('stage') not in ('complete','gameover'):return
 stable=run.get('history_id') or hashlib.sha256(encoded([run.get('started_at'),run.get('character'),run.get('_save_slot'),run.get('packs',[])])).hexdigest()[:24]
 run['history_id']=stable;key=stable+':'+str(run.get('loop',0))
 row={k:run.get(k) for k in ('character','challenge_level','round','loop','lp','gold','started_at','finished_at','stats','loss','artifacts','encore_won','unlocks_earned','content_unlocks_earned')}
 row.update(id=key,mode=run.get('history_mode','solo'),partner=run.get('history_partner'),result='complete' if run.get('round',0)>=9 or run.get('stage')=='complete' else 'lost',timeline=[x for x in run.get('timeline',[]) if x.get('loop',1)==run.get('loop',0)+1])
 p=profile();rows=p.setdefault('run_history',[])
 old=next((i for i,x in enumerate(rows) if x.get('id')==key),None)
 if old is not None:
  if rows[old]==row:return
  rows[old]=row
 else:rows.append(row)
 write(ROOT/'profile.json',p)

def run_history():
 # Recover summaries from any terminal legacy saves still present on this device.
 for slot in (1,2,3):
  run=read(run_path(slot))
  if isinstance(run,dict) and run.get('stage') in ('complete','gameover'):archive_run(run)
 return sorted(profile().get('run_history',[]),key=lambda row:row.get('finished_at') or row.get('started_at') or 0,reverse=True)


def merge_desktop_profile(raw, metrics=()):
 """Validate a desktop profile and merge monotonically; never import save slots."""
 if not isinstance(raw,str) or len(raw.encode('utf8'))>8_000_000:
  raise ValueError('Choose a profile.json file smaller than 8 MB.')
 try: incoming=json.loads(raw.lstrip('\ufeff'))
 except (ValueError,TypeError):raise ValueError('This is not a valid JSON profile.')
 if isinstance(incoming,dict) and 'payload' in incoming:
  if incoming.get('schema')!=1 or hashlib.sha256(encoded(incoming['payload'])).hexdigest()!=incoming.get('sha256'):
   raise ValueError('The profile checksum is invalid. Try profile.bak instead.')
  incoming=incoming['payload']
 if not isinstance(incoming,dict) or not {'unlocked','wins','runs','won_as','run_history'} & incoming.keys():
  raise ValueError('Choose profile.json from the desktop saves folder, not a run save.')
 current=profile(); merged=json.loads(json.dumps(current))
 for key in ('unlocked','won_as'):
  values=incoming.get(key,[])
  if not isinstance(values,list) or any(type(x)!=int or x<0 or x>1000 for x in values):raise ValueError('Invalid character unlock data.')
  merged[key]=sorted(set(current.get(key,[]))|set(values))
 keys=set(metrics)|{'wins','runs','victories','max_gold','max_bought','max_artifacts','decks_bought','packs_variety','relic_variety','singles_bought'}
 for key in keys:
  if key.startswith('won_as:') or key not in incoming:continue
  value=incoming[key]
  if type(value) not in (int,bool) or not 0<=value<=10**12:raise ValueError('Invalid achievement progress.')
  merged[key]=max(current.get(key,0),value)
 for key in ('gallery_unlocked','relicless_unlocked','unlock_all'):
  if key in incoming:
   if type(incoming[key])!=bool:raise ValueError('Invalid unlock flag.')
   merged[key]=bool(current.get(key)) or incoming[key]
 levels=incoming.get('character_levels',{})
 if not isinstance(levels,dict):raise ValueError('Invalid difficulty unlocks.')
 for key,value in levels.items():
  if not key.isdigit() or type(value)!=int or not -1<=value<=5:raise ValueError('Invalid difficulty unlocks.')
  merged.setdefault('character_levels',{})[key]=max(current.get('character_levels',{}).get(key,-1),value)
 rows=incoming.get('run_history',[])
 if not isinstance(rows,list) or len(rows)>10000:raise ValueError('Invalid run history.')
 def identity(row):return row.get('id') or hashlib.sha256(encoded(row)).hexdigest()
 history=merged.setdefault('run_history',[]);seen={identity(row) for row in history};added=0
 for row in rows:
  if not isinstance(row,dict) or type(row.get('character'))!=int or row.get('result') not in ('complete','lost'):raise ValueError('Invalid run history entry.')
  if 'id' in row and not isinstance(row['id'],str):raise ValueError('Invalid run history ID.')
  for key in ('finished_at','started_at','round','loop','lp','gold','challenge_level'):
   if row.get(key) is not None and (type(row[key]) not in (int,float) or not -1<=row[key]<=10**12):raise ValueError('Invalid run history value.')
  for key in ('artifacts','timeline'):
   if key in row and not isinstance(row[key],list):raise ValueError('Invalid run history details.')
  if any(not isinstance(x,dict) or type(x.get('lp_after_healing')) not in (int,float) for x in row.get('timeline',[])):raise ValueError('Invalid run timeline.')
  if row.get('loss') is not None and not isinstance(row['loss'],dict):raise ValueError('Invalid loss details.')
  if identity(row) not in seen:history.append(row);seen.add(identity(row));added+=1
 # All validation completes before any write; storage.write keeps the old profile as .bak.
 write(ROOT/'profile.json',merged)
 return dict(historyAdded=added,unlocksAdded=len(set(merged['unlocked'])-set(current.get('unlocked',[]))))


_registration_migrated=None
def register_collection(value):
 """Register owned cards only, never shop offers, opponents, or preview decks."""
 if not isinstance(value,dict):return
 ids=set()
 def collect(row):
  if not isinstance(row,dict):return
  ids.update(x for x in row.get('pool',[]) if type(x)==int and x>0)
  for key in ('deck','draftDeck','defeatedDeck'):
   deck=row.get(key)
   if isinstance(deck,dict):
    for zone in ('main','side','extra'):
     ids.update(x for x in deck.get(zone,[]) if type(x)==int and x>0)
 collect(value)
 for row in value.get('duelists',[]):collect(row)
 if not ids:return
 path=ROOT/'registered-cards.json';old=read(path,{});known=set(old.get('cards',[]))
 if not ids<=known:write(path,{'cards':sorted(known|ids)})

def registered_cards():
 global _registration_migrated
 if _registration_migrated!=ROOT:
  for name in ('run.json','run-2.json','run-3.json','collector.json'):
   register_collection(read(ROOT/name))
  _registration_migrated=ROOT
 return read(ROOT/'registered-cards.json',{}).get('cards',[])
