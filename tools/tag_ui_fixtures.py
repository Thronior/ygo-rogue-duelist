"""Tag screen fixtures from a real TagCampaign, for android/test_tag_offline_ui.cjs. Usage: tag_ui_fixtures.py <out.json>"""
import sys,json,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import storage
from tag_campaign import TagCampaign
p=storage.profile();p['unlocked']=[0,1,2,3];p['character_levels']={'0':2}
s=TagCampaign([0,2],[p,p],level=0,seed=5)
def command(seat,action,value=None):return s.command(seat,{'id':uuid.uuid4().hex,'revision':s.revision,'action':action,'value':value})['result']
out={}
for seat in (0,1):command(seat,'auto')
r=s.players[0]['routes']
command(1,'ready',{'opponent':r[1],'selected':s.players[1]['selected']})
out['draft']=s.view(0)
command(0,'ready',{'opponent':r[0],'selected':s.players[0]['selected']})
s.finish(0,7000,[]);s.shared['gold']=400;s.sync()
shop=s.shared['shop'];free=[i for i,x in enumerate(shop) if not x['sold']]
command(1,'shop-cart',{'items':[free[1],free[-1]]});command(0,'shop-cart',{'items':[free[0]]})
command(0,'shop-lock',{'intent':'buy','cartRev':s.shopping['cart_rev']})
out['shop-host-waiting']=s.view(0);out['shop-guest-partner-ready']=s.view(1)
command(1,'shop-lock',{'intent':'next'})
out['shop-host-partner-next']=s.view(0)
s.shopping['locks']=[None,None]
s.shared['round']=2;s.sync();s.phase='draft';s.routes()
for seat in (0,1):s.players[seat]['stage']='draft'
b=s.players[0]['routes']
command(0,'ready',{'opponent':b[0],'selected':s.players[0]['selected']})
out['boss-guest']=s.view(1)
Path(sys.argv[1]).write_text(json.dumps(out),encoding='utf8')
