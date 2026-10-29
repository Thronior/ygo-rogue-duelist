from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
import os
os.chdir(Path(__file__).resolve().parents[1]/'android/web')
SimpleHTTPRequestHandler.extensions_map.update({'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.json':'application/json'})
def serve(handler,default):
 """Serve on $PORT, else the default port, moving to the next free one so parallel sessions don't collide."""
 import os,socket
 wanted=os.environ.get('PORT')
 for port in ([int(wanted)] if wanted else range(default,default+20)):
  try:server=ThreadingHTTPServer(('127.0.0.1',port),handler)
  except OSError:continue
  print(f'Serving on http://127.0.0.1:{port}',flush=True);server.serve_forever();return
 raise SystemExit(f'No free port from {wanted or default}')
serve(SimpleHTTPRequestHandler,4181)
