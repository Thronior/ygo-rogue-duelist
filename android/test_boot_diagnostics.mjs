// "Could not start" diagnostics (2026-11-17): the stdlib zip check, the details text and the one automatic retry.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {inspectZip,checkStdlib,details,stderrTail,retryOnce,startupRetried,clearRetry} from './web/boot-diagnostics.js';

const zipPath=fileURLToPath(new URL('./web/pyodide/python_stdlib.zip',import.meta.url));
const real=readFileSync(zipPath),buffer=real.buffer.slice(real.byteOffset,real.byteOffset+real.byteLength);
let checks=0;const ok=(value,message)=>{assert.ok(value,message);checks++};

// The shipped zip passes and holds encodings/.
const good=inspectZip(buffer);
ok(good.ok&&good.size===real.byteLength&&good.entries>100,JSON.stringify(good));
// Truncated, HTML, empty and an archive without encodings/ fail with a reason.
ok(inspectZip(buffer.slice(0,real.byteLength-5000)).problem.startsWith('truncated'),'truncated');
ok(inspectZip(new TextEncoder().encode('<!doctype html><html>index</html>').buffer).problem==='HTML page instead of ZIP','html');
ok(inspectZip(new ArrayBuffer(0)).problem==='empty','empty');
const renamed=new Uint8Array(buffer.slice(0));
for(let i=0;i<renamed.length-10;i++)if(String.fromCharCode(...renamed.subarray(i,i+10))==='encodings/'){renamed[i]=0x45}
ok(inspectZip(renamed.buffer).problem==='no encodings module','no encodings');
const broken=new Uint8Array(buffer.slice(0));const end=broken.length-22;broken[end+16]^=0xff;
ok(inspectZip(broken.buffer).problem==='damaged ZIP directory','damaged directory');

// checkStdlib: a sound zip becomes a blob: URL for stdLibURL; a 404 or bad body leaves Pyodide's own URL.
const seen=[];
const fetchImpl=body=>async(url,options)=>{seen.push([url,options]);return body===404?{ok:false,status:404}:{ok:true,status:200,arrayBuffer:async()=>body}};
const passed=await checkStdlib('https://appassets.androidplatform.net/pyodide/',{fetchImpl:fetchImpl(buffer)});
ok(passed.url?.startsWith('blob:')&&passed.report.ok,'blob url');
ok(seen[0][0]==='https://appassets.androidplatform.net/pyodide/python_stdlib.zip'&&!seen[0][1].cache,'first fetch uses the normal cache');
passed.release();
const retried=await checkStdlib('https://x.test/pyodide/',{retry:true,fetchImpl:fetchImpl(buffer)});
ok(seen[1][1].cache==='reload'&&retried.report.retry,'retry bypasses the HTTP cache');retried.release();
const missing=await checkStdlib('https://x.test/pyodide/',{fetchImpl:fetchImpl(404)});
ok(missing.url===null&&missing.report.problem==='HTTP 404','404');
const thrown=await checkStdlib('https://x.test/pyodide/',{fetchImpl:async()=>{throw Error('offline')}});
ok(thrown.url===null&&thrown.report.problem==='fetch failed: offline','fetch error');

// Details: version, WebView, memory, zip result and only Python's cause lines (not the sys.path dump).
const tail=stderrTail(3),warn=console.warn;console.warn=()=>{};
for(const line of ["sys.path = [","  '/lib/python312.zip',","Fatal Python error: init_fs_encoding: failed to get the Python codec of the filesystem encoding","LookupError: no codec search functions registered: can't find encoding"])tail.write(line);
console.warn=warn;
ok(tail.lines.length===3,'tail keeps the last lines');
const nav={userAgent:'Mozilla/5.0 (Linux; Android 13; 23021RAAEG Build/TKQ1; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.135 Mobile Safari/537.36',deviceMemory:4};
const text=details({version:'0.2.36',error:Error('Program terminated with exit(1)'),zip:good,stderr:tail.lines,nav,native:true,retried:true});
ok(text.includes('Game v0.2.36 · Android app')&&text.includes('Chrome 131.0.6778.135 (WebView) · Android 13')&&text.includes('Device memory: 4 GB'),text);
ok(text.includes(`Stdlib zip: ${real.byteLength} bytes · ZIP ok`)&&text.includes('Automatic retry: used'),text);
ok(text.includes('Python: LookupError: no codec search functions registered')&&!text.includes('python312.zip'),text);
ok(details({version:'1',error:'x',zip:missing.report,nav:{userAgent:''}}).includes('Stdlib zip: HTTP 404\n'),'404 line');
ok(details({version:'1',error:'x',nav:{userAgent:''}}).includes('Stdlib zip: not checked'),'unchecked');

// Retry once per tab; a successful start clears the mark.
const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
let reloads=0;const reload=()=>reloads++;
ok(!startupRetried(storage)&&retryOnce({storage,reload})===true&&reloads===1&&startupRetried(storage),'first failure retries');
ok(retryOnce({storage,reload})===false&&reloads===1,'second failure shows the error');
clearRetry(storage);ok(!startupRetried(storage)&&retryOnce({storage,reload})===true,'cleared after a good start');
ok(retryOnce({storage:null,reload})===false,'no sessionStorage: no retry loop');

// mobile.js loads the checked bytes, retries only Python failures, and offers Copy details.
const mobile=readFileSync(fileURLToPath(new URL('./web/mobile.js',import.meta.url)),'utf8');
ok(mobile.includes('stdlib=await prepareStdlib(pyIndex,{retry:startupRetried()})')&&mobile.includes('py=await loadPyodide({indexURL:pyIndex,...stdlib.options,stderr:pyErrors.write});stdlib.started()}catch(error){stdlib.failed();throw error}finally{stdlib.release()}'),'stdlib wiring (test_boot_stdlib_fallback.mjs boots it)');
ok(mobile.includes('<p>The game engine could not start on this device. Your saves are safe.</p>'),'plain message after the retry');
ok(mobile.includes("bootDiag?.stage==='python'&&retryOnce(")&&mobile.includes('id="copy-boot-details"')&&mobile.includes('startDeviceSync();clearRetry();'),'error screen wiring');
console.log(`PASS boot diagnostics: ${checks} checks`);
