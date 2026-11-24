// Startup diagnostics for "Could not start: Program terminated with exit(1)" (Discord, 2026-11-17: Redmi Note 12 in the
// APK and Kiwi, and another phone in Chrome; 2026-11-19: Android 14 WebView, Chrome 157). Python stopped in
// init_fs_encoding with "LookupError: no codec search functions registered"; on v0.2.39 (unpacked folder, 2026-11-20) it
// got further and stopped in jsproxy with "UnicodeDecodeError: 'utf-8' codec can't decode byte 0xd8 in position 8".
// Real cause (both reproduced exactly in Node, 2026-11-20): the phone's language. See asciiTimeZoneNames() below.
// - asciiTimeZoneNames: the fix. Pyodide's time zone setup gets English (ASCII) zone names.
// - checkStdlib fetches the zip itself, checks it is a complete ZIP holding `encodings`, and hands Pyodide those bytes.
// - prepareStdlib (v0.2.39, written for a wrong first diagnosis of the same report, kept as a harmless fallback): on the
//   automatic retry the checked zip is unpacked by DecompressionStream into a plain folder, /lib/python3.12, and Pyodide
//   gets an empty zip. After a zip-mode failure it compares Python's copy of the zip with the checked bytes.
// - details() is the text behind the error screen's Copy details button, for Discord reports.
// - retryOnce() restarts once on its own (saves are untouched).
const RETRY_KEY='ygo-boot-retry';

// Pyodide 0.27.7's time zone setup (pyodide.asm.js _tzset_js) names the zone in the device's language:
// toLocaleTimeString(undefined,{hour12:false,timeZoneName:'short'}).split(' ')[1]. Python keeps only its first 9 bytes,
// so a non-ASCII name longer than that is cut inside a character (Arabic "غرينتش+٣" is 15 bytes; also Persian, Hebrew,
// Thai, Greek, Burmese, Khmer, Nepali, Sinhala, Pashto, Sorani Kurdish, depending on the zone). Python's `time` module then
// cannot decode it: a stdlib zip start fails in init_fs_encoding ("no codec search functions registered"), a folder start
// fails importing `time` later (UnicodeDecodeError in logging, then jsproxy). Default-locale calls that ask for a zone
// name use English instead ("GMT+3"); the game never formats times with zone names itself, so nothing visible changes.
export function asciiTimeZoneNames(proto=globalThis.Date?.prototype){
 const original=proto?.toLocaleTimeString;
 if(typeof original!=='function'||original.asciiZones)return ()=>{};
 const wrapped=function(locales,options){return original.call(this,locales==null&&options?.timeZoneName?'en-US':locales,options)};
 wrapped.asciiZones=true;proto.toLocaleTimeString=wrapped;
 return ()=>{if(proto.toLocaleTimeString===wrapped)proto.toLocaleTimeString=original};
}

const u16=(b,i)=>b[i]|b[i+1]<<8,u32=(b,i)=>(b[i]|b[i+1]<<8|b[i+2]<<16|b[i+3]<<24)>>>0;

// A structural check only (no checksums): first local header, end-of-central-directory record, central directory
// bounds, and an `encodings/` entry. Cheap on 2.3 MB: one scan of the last 64 KB and of the central directory.
export function inspectZip(buffer){
 const b=new Uint8Array(buffer),n=b.length;
 if(n<22)return {ok:false,size:n,problem:n?'too small':'empty'};
 if(!(b[0]===0x50&&b[1]===0x4b&&b[2]===3&&b[3]===4)){
  const head=new TextDecoder().decode(b.subarray(0,64)).trim().toLowerCase();
  return {ok:false,size:n,problem:head.startsWith('<')?'HTML page instead of ZIP':'not a ZIP'};
 }
 let end=-1;for(let i=n-22;i>=Math.max(0,n-65557);i--)if(b[i]===0x50&&b[i+1]===0x4b&&b[i+2]===5&&b[i+3]===6){end=i;break}
 if(end<0)return {ok:false,size:n,problem:'truncated (no ZIP directory)'};
 const entries=u16(b,end+10),dirSize=u32(b,end+12),dirStart=u32(b,end+16);
 if(dirStart+dirSize!==end||u32(b,dirStart)!==0x02014b50)return {ok:false,size:n,entries,problem:'damaged ZIP directory'};
 let encodings=false;
 for(const entry of directory(b,dirStart,end,entries)){
  if(!entry)return {ok:false,size:n,entries,problem:'damaged ZIP directory'};
  if(entry.name.startsWith('encodings/'))encodings=true;
 }
 return encodings?{ok:true,size:n,entries}:{ok:false,size:n,entries,problem:'no encodings module'};
}

// Central directory records; null for a damaged one, which ends the walk.
function* directory(b,dirStart,end,entries){
 const text=new TextDecoder();
 for(let i=dirStart,k=0;k<entries&&i+46<=end;k++){
  if(u32(b,i)!==0x02014b50){yield null;return}
  const nameLength=u16(b,i+28);
  yield {name:text.decode(b.subarray(i+46,i+46+nameLength)),method:u16(b,i+10),crc:u32(b,i+16),packed:u32(b,i+20),size:u32(b,i+24),offset:u32(b,i+42)};
  i+=46+nameLength+u16(b,i+30)+u16(b,i+32);
 }
}

// Pyodide 0.27.7 runs Python 3.12 (test_boot_diagnostics.mjs checks pyodide-lock.json).
export const STDLIB_DIR='/lib/python3.12',STDLIB_ZIP='/lib/python312.zip';
// End-of-central-directory record only: Python opens it, finds nothing and reads /lib/python3.12 instead. Served as a
// blob: URL, which index.html's connect-src allows (data: is not).
const EMPTY_ZIP=new Uint8Array([0x50,0x4b,5,6,...new Array(18).fill(0)]);
const UNPACKED_KEY='ygo-stdlib-unpacked';

// Every file of a checked zip as [name, bytes]. Deflated entries are wrapped as gzip members, so DecompressionStream
// ('gzip', Chrome 80+) inflates them natively and checks their CRC-32 and size on the way.
export async function unpackStdlib(buffer,{Stream=globalThis.DecompressionStream}={}){
 if(typeof Stream!=='function')throw Error('DecompressionStream not available');
 const b=new Uint8Array(buffer),n=b.length;
 let end=-1;for(let i=n-22;i>=Math.max(0,n-65557);i--)if(u32(b,i)===0x06054b50){end=i;break}
 if(end<0)throw Error('no ZIP directory');
 const files=[];
 for(const entry of directory(b,u32(b,end+16),end,u16(b,end+10))){
  if(!entry)throw Error('damaged ZIP directory');
  if(entry.name.endsWith('/'))continue;
  const at=entry.offset;if(u32(b,at)!==0x04034b50)throw Error('bad local header: '+entry.name);
  const start=at+30+u16(b,at+26)+u16(b,at+28),packed=b.subarray(start,start+entry.packed);
  let data;
  if(entry.method===0)data=packed.slice();
  else if(entry.method===8){
   const gzip=new Uint8Array(packed.length+18),view=new DataView(gzip.buffer);
   gzip.set([0x1f,0x8b,8,0,0,0,0,0,0,255]);gzip.set(packed,10);
   view.setUint32(packed.length+10,entry.crc,true);view.setUint32(packed.length+14,entry.size,true);
   data=new Uint8Array(await new Response(new Blob([gzip]).stream().pipeThrough(new Stream('gzip'))).arrayBuffer());
  }else throw Error(`compression ${entry.method}: ${entry.name}`);
  if(data.length!==entry.size)throw Error('wrong size: '+entry.name);
  files.push([entry.name,data]);
 }
 if(!files.some(([name])=>name==='encodings/__init__.py'))throw Error('no encodings module');
 return files;
}

export function writeStdlib(FS,files){
 for(const [name,data] of files){
  const path=`${STDLIB_DIR}/${name}`;FS.mkdirTree(path.slice(0,path.lastIndexOf('/')));FS.writeFile(path,data,{canOwn:true});
 }
}

// Python's copy of the zip against the checked bytes, read back from Pyodide's in-memory files after a failed start.
export function compareCopy(FS,buffer,path=STDLIB_ZIP){
 let copy;try{copy=FS.readFile(path)}catch{return 'missing'}
 const original=new Uint8Array(buffer);
 if(copy.length!==original.length)return `${copy.length} bytes`;
 for(let i=0;i<original.length;i++)if(copy[i]!==original[i])return `differs at byte ${i}`;
 return 'same';
}

// Fetches the zip (bypassing the HTTP cache on the retry) and returns {url,report,release}. With a sound zip, url is a
// blob: URL of the same bytes for loadPyodide's stdLibURL; otherwise it is null and Pyodide loads the file as before.
export async function checkStdlib(indexURL,{retry=false,fetchImpl=fetch}={}){
 const report={retry};
 try{
  const response=await fetchImpl(new URL('python_stdlib.zip',indexURL).href,retry?{cache:'reload'}:{});
  report.status=response.status;
  if(!response.ok){report.problem=`HTTP ${response.status}`;return {url:null,report,release(){}}}
  const buffer=await response.arrayBuffer();Object.assign(report,inspectZip(buffer));
  if(!report.ok||typeof URL.createObjectURL!=='function')return {url:null,report,release(){}};
  const url=URL.createObjectURL(new Blob([buffer],{type:'application/zip'}));
  return {url,buffer,report,release(){try{URL.revokeObjectURL(url)}catch{}}};
 }catch(error){report.problem='fetch failed: '+(error?.message||error);return {url:null,report,release(){}}}
}

// loadPyodide options and the steps around it. Unpacked mode on the automatic retry, or when it has already worked on this
// device (remembered, so that device skips the failing start and its reload). An unpack failure keeps the zip as before.
export async function prepareStdlib(indexURL,{retry=false,fetchImpl=fetch,storage=globalThis.localStorage,Stream=globalThis.DecompressionStream}={}){
 const checked=await checkStdlib(indexURL,{retry,fetchImpl}),report=checked.report;
 let remembered=false;try{remembered=storage?.getItem(UNPACKED_KEY)==='1'}catch{}
 let files=null,fs=null;
 if((retry||remembered)&&checked.url){try{files=await unpackStdlib(checked.buffer,{Stream})}catch(error){report.unpackProblem=String(error?.message||error)}}
 report.mode=files?'unpacked':'zip';
 const options={fsInit(FS){fs=FS;if(files)writeStdlib(FS,files)}},empty=files?URL.createObjectURL(new Blob([EMPTY_ZIP],{type:'application/zip'})):null;
 if(files)Object.assign(options,{stdLibURL:empty,env:{PYTHONDONTWRITEBYTECODE:'1'}});
 else if(checked.url)options.stdLibURL=checked.url;
 return {options,report,
  failed(){if(fs&&!files&&checked.buffer)report.copy=compareCopy(fs,checked.buffer)},
  started(){if(files)try{storage?.setItem(UNPACKED_KEY,'1')}catch{}},
  release(){files=null;fs=null;checked.release();if(empty)try{URL.revokeObjectURL(empty)}catch{}}};
}

// Python's own last lines (Pyodide prints them to stderr) go in the details; console output is unchanged.
export function stderrTail(limit=12){
 const lines=[];
 return {lines,write(line){console.warn(line);lines.push(String(line));if(lines.length>limit)lines.shift()}};
}

// Only the lines that say why Python stopped; the sys.path dump before them is the same on every device.
const pythonCause=lines=>lines.filter(line=>/error|exception|lookup|fatal|traceback|memory/i.test(line)).slice(-4);

// desktop: ShadowDesktop.platform in the desktop apps, which also provide ShadowNative (a Linux report used to say
// "Android app", 2026-11-24). stage: the boot step that failed, so an error after Python started is not read as Python's.
export function details({version,error,zip,stderr=[],nav=globalThis.navigator,native=false,retried=false,desktop=null,stage=null}){
 const ua=String(nav?.userAgent||''),chrome=/(?:Chrome|Chromium)\/([\d.]+)/.exec(ua)?.[1],android=/Android ([\d.]+)/.exec(ua)?.[1];
 // Every UA says Mozilla, AppleWebKit and "like Gecko" for old compatibility; WebKitGTK (the Linux app) copies Safari's
 // tokens with a fixed Version/60.5, so it is named by the app's own token, not by those.
 const browser=chrome?`Chrome ${chrome}`:/YGORogueDuelistLinux\//.test(ua)||desktop==='linux'?'WebKitGTK (Linux app)':/Firefox\/([\d.]+)/.test(ua)?`Firefox ${/Firefox\/([\d.]+)/.exec(ua)[1]}`:/Version\/([\d.]+).*Safari\//.test(ua)?`Safari ${/Version\/([\d.]+)/.exec(ua)[1]}`:'unknown';
 const zipLine=!zip?'not checked':zip.ok?`${zip.size} bytes · ZIP ok · ${zip.entries} files`:`${zip.problem||'failed'}${zip.size!=null?` · ${zip.size} bytes`:''}`;
 return [
  `Game v${version} · ${desktop==='linux'?'Linux app':desktop?'Windows app':native?'Android app':'Web'}`,
  ...(stage?[`Failed at: ${{python:'starting Python',campaign:'restoring the campaign',sounds:'preparing sound effects'}[stage]||stage}`]:[]),
  `Browser: ${browser}${/; wv\)/.test(ua)?' (WebView)':''}${android?` · Android ${android}`:''}`,
  `Device memory: ${nav?.deviceMemory?nav.deviceMemory+' GB':'unknown'}`,
  `Language: ${nav?.language||'unknown'}`,
  `Stdlib zip: ${zipLine}${zip?.retry?' · re-downloaded':''}`,
  ...(zip?.mode?[`Stdlib start: ${zip.mode==='unpacked'?'unpacked folder':'zip'}${zip.copy?` · Python's copy ${zip.copy}`:''}${zip.unpackProblem?` · unpack failed: ${zip.unpackProblem}`:''}`]:[]),
  `Automatic retry: ${retried?'used':'not used'}`,
  `Error: ${error?.message||error||'unknown'}`,
  ...pythonCause(stderr).map(line=>'Python: '+line),
  `UA: ${ua}`
 ].join('\n');
}

// Only Python failing to start is retried, once per browser tab; a successful start clears the mark.
export const startupRetried=(storage=globalThis.sessionStorage)=>{try{return storage?.getItem(RETRY_KEY)==='1'}catch{return false}};
export function clearRetry(storage=globalThis.sessionStorage){try{storage?.removeItem(RETRY_KEY)}catch{}}
// No cache is cleared: the web app's service worker stores only files whose SHA-256 matches the build (pwa-sw.js
// verified()), and the APK reads its own assets, so a cached copy cannot be the broken one. Dropping the offline
// files would only break offline play until they downloaded again. The retry's zip check bypasses the HTTP cache.
export function retryOnce({storage=globalThis.sessionStorage,reload=()=>location.reload()}={}){
 try{if(!storage||storage.getItem(RETRY_KEY)==='1')return false;storage.setItem(RETRY_KEY,'1')}catch{return false}
 reload();return true;
}

export async function copyText(text,doc=globalThis.document){
 try{await navigator.clipboard.writeText(text);return true}catch{}
 // Older WebViews: select a hidden textarea and copy.
 try{const area=doc.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.style.cssText='position:fixed;opacity:0';doc.body.append(area);area.select();const done=doc.execCommand('copy');area.remove();return done}catch{return false}
}
