"""Present the engine's result, never infer an unseen winning card."""
import json,re
from pathlib import Path
REASONS=json.loads((Path(__file__).parent/'data/victory-reasons.json').read_text(encoding='utf8'))
def describe(result,by_id):
 reason=int(result.get('reason',1 if result.get('lp',0)<=0 else 0));events=result.get('events',[])
 source=next((e for e in reversed(events) if e.get('kind')=='loss_source'),{})
 damage=next((e.get('amount',0) for e in reversed(events) if e.get('kind')=='loss_damage'),0)
 resolution=next((e.get('card',0) for e in reversed(events) if e.get('kind')=='resolution'),0)
 card=int(source.get('card',0));name=by_id.get(card,{}).get('name','')
 if reason==1:
  text=('Attacked by ' if source.get('battle') else 'Defeated by the effect of ')+name if name else 'Your life points reached 0'
  if damage:text+=f' — {damage:,} damage'
 elif reason==2:
  card=int(resolution);name=by_id.get(card,{}).get('name','')
  text='Decked out by the effect of '+name if name else 'Decked out: unable to draw during the Draw Phase'
 else:
  text=REASONS.get(str(reason),f'Duel ended by engine victory condition {reason}')
  names=re.findall(r'"([^"]+)"',text);card=next((i for i,c in by_id.items() if names and c['name']==names[0]),0)
  text=text.replace('Victory by','Defeated by')
 return dict(text=text,card=card if card in by_id else None,damage=damage if reason==1 else 0,reason=reason)
