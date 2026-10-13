"""Verify all live relic descriptions and generated UI data agree with definitions."""
import sys,json
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root))
import content,passives
web=json.loads((root/'android/web/content.json').read_text(encoding='utf-8'))
for key,row in content.ARTIFACTS.items():
 info=content.ART_INFO[key];text=row[2]
 assert text and '\ufffd' not in text and 'Ã' not in text and 'â€' not in text,key
 assert web['artifacts'][key]==list(row),key+' stale UI description'
 assert all(web['artifactInfo'][key].get(k)==v for k,v in info.items() if k!='art'),key+' stale effect metadata'
 if info['effect']=='atk':
  assert f"{info['amount']:,} ATK" in text,key
  for kind in info['filter'].split('/'):
   assert kind in text,key
  if info['filter'] in ('Warrior','Beast'):assert 'Beast-Warrior' in text,key
  lua=passives.script({'character':0,'artifacts':[key],'round':0,'curses':[]})
  assert 'EFFECT_UPDATE_ATTACK' in lua,key
print('PASS',len(content.ARTIFACTS),'normal/cursed relic descriptions, effect metadata, amounts and generated UI parity')
