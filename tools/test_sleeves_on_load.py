"""Sleeves already earned by past wins unlock when the profile loads (user report 2026-11-12: the "win with N duelists"
achievements showed done but their sleeves stayed locked, because the unlock check only ran at the end of a run)."""
import sys,json,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path[:0]=[str(ROOT),str(ROOT/'android')]
import storage,campaign as g
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='sleeves-on-load-'));g.SAVE=storage.ROOT/'run.json'
import mobile_backend,sleeve_progress
series=[s for s in sleeve_progress.SLEEVES if s['rule']['kind']=='duelists']
p=storage.profile();p['won_as']=list(range(10));p['sleeves_earned']=[];storage.write(storage.ROOT/'profile.json',p)
state=json.loads(json.dumps(mobile_backend.state()))
earned=set(state['profile']['sleeves_earned'])
want={s['id'] for s in series if s['rule']['min']<=10};missing={s['id'] for s in series if s['rule']['min']>10}
assert want and want<=earned,(want,earned)
assert not (missing&earned),missing&earned
assert set(storage.profile()['sleeves_earned'])>=want,'saved to the profile'
rows={r['name']:r for r in state['achievements'] if isinstance(r,dict) and r.get('name')} if isinstance(state['achievements'],list) else {}
print(f'PASS {len(want)} duelist-series sleeves unlock on load for 10 duelists won; {len(missing)} higher ones stay locked')
