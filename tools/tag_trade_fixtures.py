"""Tag trade-request screen fixtures from a real TagCampaign, for android/test_tag_trade_requests.cjs.
Usage: tag_trade_fixtures.py <out.json>"""
import sys,json,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import storage
from tag_campaign import TagCampaign
p=storage.profile();p['unlocked']=[0,1,2,3];p['character_levels']={'0':2}
s=TagCampaign([0,2],[p,p],level=0,seed=5)
def command(seat,action,value=None):return s.command(seat,{'id':uuid.uuid4().hex,'revision':s.revision,'action':action,'value':value})['result']
for seat in (0,1):command(seat,'auto')
s.phase='draft';s.shared['round']=1
for run in s.players:run['round']=1
tid=s.trade['id']
for seat in (0,1):command(seat,'trade-vote',{'id':tid,'ready':True})
command(0,'trade-request',{'id':tid,'cards':[0,1]})
Path(sys.argv[1]).write_text(json.dumps({'requester':s.view(0),'owner':s.view(1)}),encoding='utf8')
