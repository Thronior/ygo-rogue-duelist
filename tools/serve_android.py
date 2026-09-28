from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
import os
os.chdir(Path(__file__).resolve().parents[1]/'android/web')
SimpleHTTPRequestHandler.extensions_map.update({'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.json':'application/json'})
ThreadingHTTPServer(('127.0.0.1',4181),SimpleHTTPRequestHandler).serve_forever()
