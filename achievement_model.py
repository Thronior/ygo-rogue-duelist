import campaign as game,storage,unlocks
from content import CHARACTERS,PLAYABLE_IDS

def entries(profile=None):
 p=profile or storage.profile();rows=[]
 for i in PLAYABLE_IDS[2:]:
  metric,target=game.unlock_rule(i)
  value=int(int(metric.split(':')[1]) in p['won_as']) if metric.startswith('won_as:') else p.get(metric,0)
  if 'character:'+str(i) in p.get('synced_achievements',[]):value=max(value,target)
  rows.append(dict(id='character:'+str(i),name=CHARACTERS[i]['name'],reward='Unlock duelist',description=game.unlock_text(i),value=value,target=target,done=value>=target or 'character:'+str(i) in p.get('synced_achievements',[]),cumulative=metric in ('victories','wins','singles_bought'),testing=i in p['unlocked'] and value<target))
 for row in rows:
  kind,key=row['id'].split(':',1)
  row['image']=CHARACTERS[int(key)]['sprite'] if kind=='character' else 'packs/'+key+'.jpg' if kind=='pack' else 'cards/'+str(game.BY_NAME[key]['id'] if key in game.BY_NAME else key)+'.jpg'
 return rows
