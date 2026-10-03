"""Unlock-only device sync; never transfers runs, collections, or device statistics."""
import storage
from content import PLAYABLE_IDS
FLAGS=('gallery_unlocked','relicless_unlocked','cpu_viewer_unlocked')

def export():
 import achievement_model
 p=storage.profile()
 return dict(characters=sorted(set(p['unlocked'])&set(PLAYABLE_IDS)),achievements=sorted({r['id'] for r in achievement_model.entries(p) if r['done']}),levels={str(i):min(5,int(v)) for i,v in p.get('character_levels',{}).items() if str(i).isdigit() and int(i) in PLAYABLE_IDS and isinstance(v,int) and 0<=v<=5},flags=[k for k in FLAGS if p.get(k)])

def merge(data):
 if not isinstance(data,dict):raise ValueError('Invalid unlock data')
 p=storage.profile();valid=set(PLAYABLE_IDS)
 p['unlocked']=sorted(set(p['unlocked'])|{i for i in data.get('characters',[]) if type(i)==int and i in valid})
 earned={str(x) for x in data.get('achievements',[]) if str(x) in {'character:'+str(i) for i in valid}}
 p['synced_achievements']=sorted(set(p.get('synced_achievements',[]))|earned)
 p['unlocked']=sorted(set(p['unlocked'])|{int(x.split(':')[1]) for x in earned})
 for key,v in data.get('levels',{}).items():
  if str(key).isdigit() and int(key) in valid and type(v)==int and 0<=v<=5:p.setdefault('character_levels',{})[str(key)]=max(p.get('character_levels',{}).get(str(key),-1),v)
 for key in data.get('flags',[]):
  if key in FLAGS:p[key]=True
 storage.write(storage.ROOT/'profile.json',p)
 return export()

def dispatch(action,value):
 path=storage.ROOT/'device-sync.json'
 if action=='read':return dict(link=storage.read(path,{}) or {},progress=export())
 if action=='merge':return merge(value)
 if action=='link':
  if not isinstance(value,dict) or not isinstance(value.get('group'),str) or not isinstance(value.get('token'),str):raise ValueError('Invalid device link')
  storage.write(path,{'group':value['group'],'token':value['token']});return True
 if action=='unlink':storage.write(path,{});return True
 raise ValueError('Unknown sync operation')
