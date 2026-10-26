"""Local-only fixture server. No fixture code is bundled in either release."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
import os
ROOT=Path(__file__).resolve().parents[1]
os.chdir(ROOT/'android/web')
class QA(SimpleHTTPRequestHandler):
 def do_GET(self):
  if self.path.split('?')[0]=='/mobile.js':
   text=Path('mobile.js').read_text(encoding='utf8')
   fixture=r"""screen='title';const scenario=new URLSearchParams(location.search).get('scenario');if(['shop','boss','misprints'].includes(scenario)){await command('new',{character:0,replace:true});if(scenario==='misprints')await py.runPythonAsync("import content;content.ART_INFO['faulty_printer']['amount']=100;r=mobile_backend.run;r['artifacts']=r['artifacts']+['faulty_printer'];r.setdefault('card_mods',{}).update({str(i):[200,-300,[32,8192,2,16384][i%4],[4,16,2,1][i%4]] for i,cid in enumerate(r['pool'][:16]) if mobile_backend.g.BY_ID[cid]['data']['type']&1 and i%2==0})");await py.runPythonAsync("mobile_backend.run.update(stage='shop',gold=999,round=5,gold_leaving_shop=9999)\nmobile_backend.g.restock(mobile_backend.run)\nmobile_backend.g.routes(mobile_backend.run)");state=JSON.parse(await py.runPythonAsync('mobile_backend.json.dumps(mobile_backend.state())'));screen=scenario==='boss'?'routes':'shop'}render();await notices();"""
   # Scenarios start right after loading finishes, in place of the title screen.
   anchor="screen='title';render();await notices();"
   assert anchor in text,'mobile.js startup changed; update the QA fixture'
   text=text.replace(anchor,fixture,1)
   data=text.encode();self.send_response(200);self.send_header('Content-Type','text/javascript; charset=utf-8');self.end_headers();self.wfile.write(data)
  else:super().do_GET()
QA.extensions_map.update({'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm'})
ThreadingHTTPServer(('127.0.0.1',4191),QA).serve_forever()
