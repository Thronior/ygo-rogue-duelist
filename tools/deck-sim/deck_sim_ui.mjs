#!/usr/bin/env node
// Local web UI for the deck balance simulator. Serves ui.html on 127.0.0.1, reuses the game's
// own stylesheet and art from android/web, and runs simulations through sim_core.mjs.
// Dev tool only; not part of the APK or webapp build.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {HERE, ROOT, loadSettings, saveSettings, loadOpponentDecks, runFull, runCustom, listReports, readReport, exportPath, addTierImages} from './sim_core.mjs';

// --port=<n> runs a second copy (e.g. for testing) beside the one the shortcut opens.
const PORT = Number(process.argv.find(arg => arg.startsWith('--port='))?.slice(7)) || 47830;
const WEB = path.join(ROOT, 'android', 'web');
const TYPES = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.gif': 'image/gif'};
// Quit on its own once no page has polled for this long and nothing is running.
const IDLE_EXIT_MS = 5 * 60 * 1000;

let job = null;          // {mode, info, done, total, elapsed, workers, error, report, controller, startedAt}
let lastSeen = Date.now();

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, {'Content-Type': type, 'Cache-Control': 'no-store'});
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

async function body(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

function jobView() {
  if (!job) return null;
  const {controller, report, ...rest} = job;
  // The report's path inside the output folder (run folder / file), with forward slashes.
  const reportFile = report?.files ? path.relative(path.resolve(ROOT, loadSettings().outputFolder), report.files.json).split(path.sep).join('/') : null;
  return {...rest, reportFile};
}

function start(mode, input) {
  if (job && !job.finished) throw new Error('A simulation is already running.');
  const settings = loadSettings();
  const controller = new AbortController();
  job = {mode, info: 'Loading decks…', done: 0, total: 0, elapsed: 0, workers: 0, error: null, finished: false, startedAt: Date.now(), controller};
  const current = job;
  const hooks = {
    signal: controller.signal,
    onInfo: text => { current.info = text; },
    onStart: ({total, workers}) => Object.assign(current, {total, workers}),
    onProgress: ({done, total, elapsed, workers}) => Object.assign(current, {done, total, elapsed, workers})
  };
  // Let the response go out before Python and the workers spin up.
  setImmediate(async () => {
    try { current.report = mode === 'full' ? await runFull(settings, hooks) : await runCustom(settings, input, hooks); }
    catch (error) { current.error = String(error?.message || error); }
    finally { current.finished = true; current.elapsed = (Date.now() - current.startedAt) / 1000; }
  });
}

// Average wall-clock seconds per duel over the last few real runs (1,000+ duels, so startup does not
// dominate), for the time estimates shown before a run starts. Duel length depends on the matchups
// (even within-tier duels run longer than lopsided cross-tier ones), so runs of the same kind are
// preferred: kind 'full' = within-tier full lists, 'custom' = custom entries. Falls back to any run,
// then to this PC's measured speed.
const FALLBACK_SECONDS_PER_DUEL = 1 / 17;
const sameKind = (r, kind) => kind === 'full' ? r.mode === 'full' && r.scope === 'within-tier' : kind === 'custom' ? r.mode === 'custom' : true;
function measuredSpeed(kind) {
  const settings = loadSettings();
  const reports = [];
  for (const {file} of listReports(settings)) {
    try { const r = readReport(settings, file); if (r.totalDuels >= 1000 && r.seconds > 0) reports.push(r); } catch {}
  }
  const matching = reports.filter(r => sameKind(r, kind));
  const used = (matching.length ? matching : reports).slice(0, 3);
  const duels = used.reduce((sum, r) => sum + r.totalDuels, 0), seconds = used.reduce((sum, r) => sum + r.seconds, 0);
  return used.length ? {secondsPerDuel: seconds / duels, runs: used.length, sameKind: !!matching.length} : {secondsPerDuel: FALLBACK_SECONDS_PER_DUEL, runs: 0, sameKind: false};
}

function browseForYdk() {
  const initial = path.join(ROOT, 'data', 'decks').replaceAll("'", "''");
  const script = `Add-Type -AssemblyName System.Windows.Forms; $o=New-Object System.Windows.Forms.Form -Property @{TopMost=$true}; $d=New-Object System.Windows.Forms.OpenFileDialog; $d.Filter='YGO deck (*.ydk)|*.ydk|All files (*.*)|*.*'; $d.InitialDirectory='${initial}'; if($d.ShowDialog($o) -eq 'OK'){$d.FileName}`;
  return new Promise(resolve => {
    const child = spawn('powershell.exe', ['-NoProfile', '-STA', '-Command', script], {windowsHide: true});
    let out = '';
    child.stdout.on('data', chunk => { out += chunk; });
    child.on('close', () => resolve(out.trim()));
    child.on('error', () => resolve(''));
  });
}

function serveStatic(res, base, relative) {
  const target = path.resolve(base, relative);
  if (!target.startsWith(base + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) return send(res, 404, 'Not found', 'text/plain');
  const type = TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, {'Content-Type': type, 'Cache-Control': type.startsWith('text/html') || base !== WEB ? 'no-store' : 'max-age=3600'});
  fs.createReadStream(target).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const route = `${req.method} ${url.pathname}`;
  if (url.pathname.startsWith('/api/')) lastSeen = Date.now();
  try {
    if (route === 'GET /' || route === 'GET /index.html') return serveStatic(res, HERE, 'ui.html');
    if (req.method === 'GET' && url.pathname.startsWith('/web/')) return serveStatic(res, WEB, decodeURIComponent(url.pathname.slice(5)));
    if (route === 'GET /api/ping') return send(res, 200, {app: 'deck-sim'});
    if (route === 'GET /api/status') return send(res, 200, {settings: loadSettings(), job: jobView()});
    if (route === 'GET /api/speed') return send(res, 200, measuredSpeed(url.searchParams.get('kind')));
    if (route === 'GET /api/decks') {
      const {source, decks} = loadOpponentDecks(loadSettings());
      return send(res, 200, {source, counts: [1, 2, 3].map(t => decks.filter(d => d.tier === t).length)});
    }
    if (route === 'POST /api/settings') return send(res, 200, {settings: saveSettings(await body(req))});
    if (route === 'POST /api/run/full') { start('full'); return send(res, 200, {job: jobView()}); }
    if (route === 'POST /api/run/custom') {
      const input = await body(req);
      if (!input.file && !input.text) throw new Error('Choose a .ydk file first.');
      start('custom', input);
      return send(res, 200, {job: jobView()});
    }
    if (route === 'POST /api/cancel') { job?.controller?.abort(); return send(res, 200, {job: jobView()}); }
    if (route === 'POST /api/dismiss') { if (job?.finished) job = null; return send(res, 200, {job: jobView()}); }
    if (route === 'POST /api/browse') return send(res, 200, {file: await browseForYdk()});
    if (route === 'GET /api/reports') return send(res, 200, {reports: listReports(loadSettings()).slice(0, 50)});
    if (route === 'GET /api/report') return send(res, 200, {report: readReport(loadSettings(), url.searchParams.get('file'))});
    if (req.method === 'GET' && url.pathname.startsWith('/export/')) {
      const settings = loadSettings();
      let target;
      try { target = exportPath(settings, decodeURIComponent(url.pathname.slice(8)), /^deck-sim-.*\.png$/); } catch { return send(res, 404, 'Not found', 'text/plain'); }
      return serveStatic(res, path.resolve(ROOT, settings.outputFolder), path.relative(path.resolve(ROOT, settings.outputFolder), target));
    }
    if (route === 'POST /api/images') {
      const settings = loadSettings(), {file} = await body(req);
      const report = readReport(settings, file);
      await addTierImages(report, exportPath(settings, file));
      if (report.imagesError) throw new Error(report.imagesError);
      return send(res, 200, {report});
    }
    if (route === 'POST /api/open-folder') {
      const dir = path.resolve(ROOT, loadSettings().outputFolder);
      fs.mkdirSync(dir, {recursive: true});
      spawn('explorer.exe', [dir], {detached: true, stdio: 'ignore'}).unref();
      return send(res, 200, {ok: true});
    }
    if (route === 'POST /api/quit') { send(res, 200, {ok: true}); job?.controller?.abort(); setTimeout(() => process.exit(0), 200); return; }
    send(res, 404, {error: 'Not found'});
  } catch (error) {
    send(res, 400, {error: String(error?.message || error)});
  }
});

function openWindow() {
  const url = `http://127.0.0.1:${PORT}/`;
  // An Edge app window looks like a program rather than a browser tab; fall back to the default browser.
  const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
  if (edge) spawn(edge, [`--app=${url}`, '--window-size=1280,860'], {detached: true, stdio: 'ignore'}).unref();
  else spawn('cmd.exe', ['/c', 'start', '', url], {detached: true, stdio: 'ignore', windowsHide: true}).unref();
}

server.on('error', async error => {
  if (error.code !== 'EADDRINUSE') throw error;
  // Already running: just bring up another window on it.
  try {
    const ping = await fetch(`http://127.0.0.1:${PORT}/api/ping`).then(r => r.json());
    if (ping.app === 'deck-sim') { openWindow(); console.log('Deck sim UI is already running; opened a window.'); process.exit(0); }
  } catch {}
  console.error(`Port ${PORT} is used by another program.`);
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Deck balance simulator UI: http://127.0.0.1:${PORT}/`);
  console.log('Closing this window stops the simulator.');
  if (!process.argv.includes('--no-open')) openWindow();
  setInterval(() => {
    if ((!job || job.finished) && Date.now() - lastSeen > IDLE_EXIT_MS) process.exit(0);
  }, 30000).unref();
});
