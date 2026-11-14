"""Linked devices share card-art sleeves, their achievements and the sleevesforall unlock (user, 2026-11-14).
Uses a temporary save folder; never touches saves/."""
import sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,progress_sync,sleeve_progress,achievement_model
(ROOT/'temp').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='link-sleeves-',dir=ROOT/'temp') as tmp:
 storage.ROOT=Path(tmp);g.SAVE=Path(tmp)/'run.json'
 # Device A earned one card-art sleeve and used the sleeve code.
 p=storage.profile();p['sleeves_earned']=['gate-guardian'];p['sleeves_all']=True;storage.write(storage.ROOT/'profile.json',p)
 sent=progress_sync.export()
 assert 'sleeve:gate-guardian' in sent['achievements'] and 'sleeves_all' in sent['flags'],sent
 # Device B starts empty and receives A's progress.
 p=storage.profile();p.pop('sleeves_earned',None);p.pop('sleeves_all',None);p['synced_achievements']=[];storage.write(storage.ROOT/'profile.json',p)
 assert 'sleeve:gate-guardian' not in progress_sync.export()['achievements']
 back=progress_sync.merge(dict(sent,achievements=sent['achievements']+['sleeve:not-a-sleeve','sleeve:../x']))
 p=storage.profile()
 assert p['sleeves_earned']==['gate-guardian'] and p.get('sleeves_all') is True,p.get('sleeves_earned')
 assert 'sleeve:not-a-sleeve' not in p['synced_achievements'] and 'sleeve:../x' not in p['synced_achievements']
 row=next(r for r in achievement_model.entries(p) if r['id']=='sleeve:gate-guardian');assert row['done']
 assert 'sleeve:gate-guardian' in back['achievements']
 # Evaluating sleeves later (run end, profile load) never drops a synced one.
 sleeve_progress.evaluate(p);assert 'gate-guardian' in p['sleeves_earned']
print('PASS linked devices share card sleeves, sleeve achievements and sleevesforall; unknown sleeve ids ignored')
