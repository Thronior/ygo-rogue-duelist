"""Live 10K survey results (user, 2026-11-25: "make a version that live updates, so i can just keep it open and refresh").

Serves the same page as tools/survey_report.py on http://127.0.0.1:4240/. A page load downloads the newest answers from
the stats Worker at most once every 2 minutes (user, 2026-11-25: "make it only refresh every 2 minutes"); refreshes in
between show the last download. Nothing is written to disk. The SURVEY_ADMIN_TOKEN stays in this
process: it is read like survey_report.py does ($env:YGO_SURVEY_ADMIN_TOKEN or multiplayer/global-stats/.admin-token) and
never sent to the browser. Listens on 127.0.0.1 only, because the page holds players' free-text wishes.

Usage: python tools/survey_live.py [port]          (opens the page in your browser; Ctrl+C stops it)
       python tools/survey_live.py [port] --no-open
"""
import runpy, sys, threading, time, webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
report = runpy.run_path(str(ROOT / 'tools/survey_report.py'), run_name='survey_live')
REUSE_SECONDS = 120
_lock = threading.Lock()
_cache = {'at': 0.0, 'csv': None, 'page': b''}


def page():
    """The report for the newest answers; rebuilt only when the downloaded CSV changed."""
    with _lock:
        if time.time() - _cache['at'] >= REUSE_SECONDS or not _cache['page']:
            text = report['download']()
            _cache['at'] = time.time()
            if text != _cache['csv']:
                _cache['csv'], _cache['page'] = text, report['build'](text).encode('utf8')
        return _cache['page']


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.split('?')[0] not in ('/', '/index.html'):
            self.send_error(404)
            return
        try:
            body, status = page(), 200
        except SystemExit as error:  # download() reports a missing token or a refused download this way
            body, status = f'<!doctype html><meta charset="utf-8"><title>Survey</title><p>{error}</p>'.encode('utf8'), 502
        except Exception as error:
            body, status = f'<!doctype html><meta charset="utf-8"><title>Survey</title><p>Could not load the survey: {type(error).__name__}</p>'.encode('utf8'), 502
        self.send_response(status)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    port = int(args[0]) if args else 4240
    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    url = f'http://127.0.0.1:{port}/'
    print(f'Survey results live at {url} (refresh the page for new answers; Ctrl+C stops)', flush=True)
    if '--no-open' not in sys.argv:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
