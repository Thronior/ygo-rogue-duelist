// "Could not start: exit(1)" with "no codec search functions registered" (2026-11-19). Boots the real Pyodide in Node:
// 1. reproduces the report: Python's copy of the zip loses its central directory after the `encodings/` entry, so
//    `encodings` becomes an empty namespace package, while the checked bytes are fine;
// 2. the retry's unpacked folder starts Python from the same checked bytes, and the device remembers it.
// Run: runtime/ai/node.exe android/test_boot_stdlib_fallback.mjs
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadPyodide} from './web/pyodide/pyodide.mjs';
import {prepareStdlib,unpackStdlib,details,stderrTail,STDLIB_DIR} from './web/boot-diagnostics.js';

process.on('unhandledRejection',()=>{});// Pyodide starts its stdlib fetch before it awaits it
const index=fileURLToPath(new URL('./web/pyodide/',import.meta.url)),real=readFileSync(join(index,'python_stdlib.zip'));
const buffer=real.buffer.slice(real.byteOffset,real.byteOffset+real.byteLength);
const temp=mkdtempSync(join(tmpdir(),'ygo-stdlib-'));
let checks=0;const ok=(value,message)=>{assert.ok(value,message);checks++};
const fetchImpl=async()=>({ok:true,status:200,arrayBuffer:async()=>buffer.slice(0)});
const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
const quiet=async run=>{const error=console.error,warn=console.warn;console.error=console.warn=()=>{};try{return await run()}finally{console.error=error;console.warn=warn}};

// The Python version the folder is named after matches Pyodide's.
const lock=JSON.parse(readFileSync(join(index,'pyodide-lock.json'),'utf8'));
ok(STDLIB_DIR===`/lib/python${lock.info.python.split('.').slice(0,2).join('.')}`,`${STDLIB_DIR} vs ${lock.info.python}`);

// Unpacking: every file, CRC-checked by the gzip wrapper; a damaged deflate stream is refused.
const files=await unpackStdlib(buffer);
ok(files.length===517&&files.some(([name])=>name==='encodings/__init__.py'),String(files.length));
const bad=new Uint8Array(buffer.slice(0)),name=Buffer.from('encodings/__init__.py');
const header=Buffer.from(bad.buffer).indexOf(Buffer.concat([Buffer.from('PK\x03\x04','latin1'),Buffer.alloc(22),Buffer.from([name.length,0])]).subarray(0,4));
ok(header===0,'zip starts with a local header');
const local=Buffer.from(bad.buffer).indexOf(name)-30;// the local header comes first in the file, before the directory
ok(bad[local]===0x50&&bad[local+3]===4,'local header of encodings/__init__.py');
for(let i=local+30+name.length+20;i<local+30+name.length+40;i++)bad[i]^=0x5a;
ok(await unpackStdlib(bad.buffer).then(()=>false,()=>true),'damaged deflate data refused');
ok(await unpackStdlib(buffer,{Stream:null}).then(()=>false,error=>/not available/.test(error.message)),'no DecompressionStream');

// 1. The report: Python reads a copy whose central directory breaks after the 7th record (`encodings/`).
const broken=new Uint8Array(buffer.slice(0));
{const b=broken,n=b.length,end=n-22,dir=b[end+16]|b[end+17]<<8|b[end+18]<<16|b[end+19]<<24;let i=dir;
 for(let k=0;k<7;k++)i+=46+(b[i+28]|b[i+29]<<8)+(b[i+30]|b[i+31]<<8)+(b[i+32]|b[i+33]<<8);b[i]=0}
const brokenPath=join(temp,'python_stdlib.zip');writeFileSync(brokenPath,broken);
const first=await prepareStdlib('https://appassets.androidplatform.net/pyodide/',{fetchImpl,storage});
ok(first.report.mode==='zip'&&first.report.ok&&first.options.stdLibURL?.startsWith('blob:'),JSON.stringify(first.report));
const tail=stderrTail(40);let failure=null;
await quiet(()=>loadPyodide({indexURL:index,...first.options,stdLibURL:brokenPath,stderr:tail.write}).catch(error=>{failure=error}));
ok(failure&&/exit\(1\)/.test(failure.message),String(failure));
ok(tail.lines.some(line=>line.includes("LookupError: no codec search functions registered: can't find encoding")),tail.lines.join('\n'));
first.failed();first.release();
ok(/^differs at byte \d+$/.test(first.report.copy),first.report.copy);
const text=details({version:'0.2.38',error:failure,zip:first.report,stderr:tail.lines,nav:{userAgent:''},native:true,retried:true});
ok(text.includes("Stdlib start: zip · Python's copy differs at byte"),text);
ok(store.size===0,'zip mode remembers nothing');

// 2. The retry: unpacked folder, empty zip, no bytecode files; Python and the stdlib work and the device remembers it.
const retry=await prepareStdlib('https://appassets.androidplatform.net/pyodide/',{retry:true,fetchImpl,storage});
ok(retry.report.mode==='unpacked'&&retry.options.stdLibURL.startsWith('blob:')&&retry.options.env.PYTHONDONTWRITEBYTECODE==='1',JSON.stringify(retry.report));
const emptyBytes=new Uint8Array(await (await fetch(retry.options.stdLibURL)).arrayBuffer());
ok(emptyBytes.length===22&&emptyBytes[0]===0x50&&emptyBytes[3]===6,'empty zip: end record only');
const emptyZip=join(temp,'empty.zip');writeFileSync(emptyZip,emptyBytes);// Pyodide's Node loader reads paths, not blob: URLs
const py=await quiet(()=>loadPyodide({indexURL:index,...retry.options,stdLibURL:emptyZip}));
retry.started();retry.release();
const result=py.runPython(`import encodings,json,re,random,collections,codecs,sys
'|'.join([encodings.__file__,json.dumps({'a':[1]}),codecs.lookup('latin-1').name,str(sys.dont_write_bytecode)])`);
ok(result===`${STDLIB_DIR}/encodings/__init__.py|{"a": [1]}|iso8859-1|True`,result);
ok(store.get('ygo-stdlib-unpacked')==='1','device remembers the unpacked start');
const later=await prepareStdlib('https://x.test/pyodide/',{fetchImpl,storage});
ok(later.report.mode==='unpacked'&&!later.report.retry,'next start goes straight to the folder');later.release();
ok(details({version:'1',error:'x',zip:later.report,nav:{userAgent:''}}).includes('Stdlib start: unpacked folder\n'),'details line');

// An unpack failure keeps the zip start.
const noStream=await prepareStdlib('https://x.test/pyodide/',{retry:true,fetchImpl,storage:null,Stream:null});
ok(noStream.report.mode==='zip'&&noStream.options.stdLibURL?.startsWith('blob:')&&/not available/.test(noStream.report.unpackProblem),JSON.stringify(noStream.report));noStream.release();

rmSync(temp,{recursive:true,force:true});
console.log(`PASS boot stdlib fallback: ${checks} checks`);
