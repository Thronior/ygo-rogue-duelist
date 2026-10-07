"""Private local backup browser: --key-file <DPAPI file> [--port 4450]."""
import argparse,json,secrets,urllib.request,urllib.parse
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from backup_admin_credentials import load_key
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--key-file',type=Path,required=True);p.add_argument('--port',type=int,default=4450);args=p.parse_args()
key=load_key(args.key_file);session=secrets.token_urlsafe(32)
endpoint=json.loads((ROOT/'android/web/multiplayer-config.json').read_text())['signalingUrl'].rstrip('/')
def api(op,body):
 request=urllib.request.Request(endpoint+'/backup/'+op,data=json.dumps(body).encode(),headers={'Authorization':'Bearer '+key,'Content-Type':'application/json','User-Agent':'YGO-backup-admin'})
 with urllib.request.urlopen(request,timeout=60) as r:return r.read()
PAGE='''<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Save Recovery Admin</title><style>body{font:16px system-ui;background:#102732;color:#ecf3f3;max-width:1100px;margin:30px auto;padding:16px}input,button,select{font:inherit;padding:10px;margin:5px;background:#1d4555;color:white;border:1px solid #76939c;border-radius:5px}article{padding:15px;margin:15px 0;border:1px solid #76939c;border-radius:8px}code{overflow-wrap:anywhere;color:#ffe18d}small{display:block;color:#bbcdd3}</style><h1>Save Recovery</h1><p>Search by recovery code or Ultimate Collector name. Download a snapshot and send it privately to its owner. They restore it in Settings → Recover Save Data.</p><input id=q placeholder="Recovery code / collector name" size=35><button id=refresh>Refresh</button><p id=status></p><main id=rows></main><script>
const token=new URLSearchParams(location.search).get('session');let data=[];const status=document.querySelector('#status');
async function load(){try{status.textContent='Loading…';data=[];let cursor;do{const r=await fetch('/api/list?session='+encodeURIComponent(token)+(cursor?'&cursor='+encodeURIComponent(cursor):''));if(!r.ok)throw Error('Could not read backups');const v=await r.json();data.push(...v.backups);cursor=v.cursor}while(cursor);status.textContent=data.length+' devices backed up';draw()}catch(e){status.textContent=e.message}}
function draw(){const root=document.querySelector('#rows');root.replaceChildren();const query=document.querySelector('#q').value.toLowerCase();for(const row of data.filter(r=>JSON.stringify([r.code,r.summary]).toLowerCase().includes(query)).sort((a,b)=>b.updatedAt-a.updatedAt)){const a=document.createElement('article'),code=document.createElement('code');code.textContent=row.code;a.append(code);const detail=document.createElement('p');detail.textContent=(row.summary.platform||'Device')+' · '+new Date(row.updatedAt).toLocaleString()+' · version '+row.summary.version+' · '+(row.summary.runs||0)+' runs / '+(row.summary.wins||0)+' wins';a.append(detail);const names=document.createElement('p');names.textContent='Collectors: '+(row.summary.collectors.map(c=>c.name+' ('+c.status+')').join(', ')||'None yet');a.append(names);const select=document.createElement('select');for(const s of row.snapshots){const o=document.createElement('option');o.value=s.id;o.textContent=new Date(s.at).toLocaleString();select.append(o)}a.append(select);const b=document.createElement('button');b.textContent='Download recovery file';b.onclick=()=>{const link=document.createElement('a');link.href='/api/export?session='+encodeURIComponent(token)+'&code='+encodeURIComponent(row.code)+'&revision='+encodeURIComponent(select.value);link.click()};a.append(b);root.append(a)}}
document.querySelector('#refresh').onclick=load;document.querySelector('#q').oninput=draw;load();</script>'''
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  parts=urllib.parse.urlsplit(self.path);query=urllib.parse.parse_qs(parts.query)
  if not secrets.compare_digest(query.get('session',[''])[0],session):self.send_error(403);return
  try:
   mime='text/html; charset=utf-8';body=PAGE.encode();filename=None
   if parts.path=='/api/list':body=api('list',{'cursor':query.get('cursor',[None])[0]});mime='application/json'
   elif parts.path=='/api/export':
    code=query.get('code',[''])[0];body=api('export',{'code':code,'revision':query.get('revision',[None])[0]});mime='application/json';filename='YGO-'+json.loads(body)['code']+'-recovery.json'
   elif parts.path!='/':self.send_error(404);return
   self.send_response(200);self.send_header('Content-Type',mime);self.send_header('Cache-Control','no-store');self.send_header('Referrer-Policy','no-referrer');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'")
   if filename:self.send_header('Content-Disposition','attachment; filename="'+filename+'"')
   self.end_headers();self.wfile.write(body)
  except Exception:self.send_error(502,'Backup service unavailable; check admin credentials and connection')
print(f'http://127.0.0.1:{args.port}/?session={session}',flush=True)
ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
