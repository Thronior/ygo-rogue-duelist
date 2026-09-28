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
   fixture=r"""await command('init');const scenario=new URLSearchParams(location.search).get('scenario');if(['shop','boss'].includes(scenario)){await command('new',0);await py.runPythonAsync("mobile_backend.run.update(stage='shop',gold=999,round=5,gold_leaving_shop=9999)\nmobile_backend.g.restock(mobile_backend.run)\nmobile_backend.g.routes(mobile_backend.run)");state=JSON.parse(await py.runPythonAsync('mobile_backend.json.dumps(mobile_backend.state())'));screen=scenario==='boss'?'routes':'shop'}render();"""
   text=text.replace("await command('init');render();",fixture)
   data=text.encode();self.send_response(200);self.send_header('Content-Type','text/javascript; charset=utf-8');self.end_headers();self.wfile.write(data)
  else:super().do_GET()
QA.extensions_map.update({'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm'})
ThreadingHTTPServer(('127.0.0.1',4191),QA).serve_forever()
