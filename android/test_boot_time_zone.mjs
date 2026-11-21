// "Could not start: exit(1)" on phones in Arabic (Discord, 2026-11-17 to 11-20). Boots the real Pyodide in Node with the
// device's time zone names in another language:
// 1. without the fix both player reports come back exactly: the zip start's "no codec search functions registered" and
//    the folder start's "UnicodeDecodeError ... byte 0xd8 in position 8" in logging, then jsproxy;
// 2. with asciiTimeZoneNames() both starts work, also in Hebrew, Thai and Greek.
// Run: runtime/ai/node.exe android/test_boot_time_zone.mjs
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadPyodide} from './web/pyodide/pyodide.mjs';
import {asciiTimeZoneNames,unpackStdlib,writeStdlib,details} from './web/boot-diagnostics.js';

process.on('unhandledRejection',()=>{});// Pyodide starts its stdlib fetch before it awaits it
const index=fileURLToPath(new URL('./web/pyodide/',import.meta.url)),real=readFileSync(join(index,'python_stdlib.zip'));
const files=await unpackStdlib(real.buffer.slice(real.byteOffset,real.byteOffset+real.byteLength));
const temp=mkdtempSync(join(tmpdir(),'ygo-tz-')),emptyZip=join(temp,'empty.zip');
writeFileSync(emptyZip,Uint8Array.from([0x50,0x4b,5,6,...Array(18).fill(0)]));
let checks=0;const ok=(value,message)=>{assert.ok(value,message);checks++};

// The phone: Node's own default locale stands in for the device's language and zone.
const node=Date.prototype.toLocaleTimeString;
const phone=(locale,timeZone)=>{Date.prototype.toLocaleTimeString=function(l,o){return node.call(this,l??locale,{timeZone,...o})}};
const zoneName=()=>new Date(2026,0,1).toLocaleTimeString(undefined,{hour12:false,timeZoneName:'short'}).split(' ')[1];
async function start(mode){
 const lines=[],quiet=console.error;console.error=()=>{};
 try{
  const py=await loadPyodide({indexURL:index,stderr:line=>lines.push(line),
   ...(mode==='folder'?{stdLibURL:emptyZip,fsInit:FS=>writeStdlib(FS,files),env:{PYTHONDONTWRITEBYTECODE:'1'}}:{})});
  return {ok:true,tzname:py.runPython('import time,asyncio,logging;"|".join(time.tzname)')};
 }catch(error){return {ok:false,text:[...lines,String(error?.message||error)].join('\n')}}
 finally{console.error=quiet}
}

// 1. Arabic, Riyadh: Pyodide reads "غرينتش+٣" (15 bytes) and both reports come back.
phone('ar-SA','Asia/Riyadh');
ok(zoneName()==='غرينتش+٣'&&new TextEncoder().encode(zoneName()).length===15,zoneName());
const zip=await start('zip');
ok(!zip.ok&&zip.text.includes("LookupError: no codec search functions registered: can't find encoding"),zip.text);
const folder=await start('folder');
ok(!folder.ok&&folder.text.includes("UnicodeDecodeError: 'utf-8' codec can't decode byte 0xd8 in position 8: unexpected end of data")
 &&folder.text.includes('import sys, os, time, io, re, traceback, warnings, weakref, collections.abc')&&folder.text.includes('Failed to initialize module jsproxy'),folder.text);

// 2. The fix: zone names in English for that call only; both starts work.
const restore=asciiTimeZoneNames();
ok(zoneName()==='GMT+3','Pyodide now reads GMT+3');
ok(asciiTimeZoneNames()!==restore&&Date.prototype.toLocaleTimeString.asciiZones,'installing twice keeps one wrapper');
ok(/^[٠-٩:]+$/.test(new Date(2026,0,1,12).toLocaleTimeString(undefined,{hour12:false}))&&new Date(2026,0,1).toLocaleTimeString('ar-SA',{timeZoneName:'short'}).includes('غرينتش'),'other calls keep the device language');
const fixedZip=await start('zip'),fixedFolder=await start('folder');
ok(fixedZip.ok&&fixedZip.tzname==='GMT+3|GMT+3',JSON.stringify(fixedZip));
ok(fixedFolder.ok&&fixedFolder.tzname==='GMT+3|GMT+3',JSON.stringify(fixedFolder));
for(const [locale,zone] of [['he-IL','Asia/Jerusalem'],['th-TH','Asia/Bangkok'],['el-GR','Europe/Athens']]){
 phone(locale,zone);asciiTimeZoneNames();// a new phone, then the fix on top of it
 const run=await start('zip');ok(run.ok&&/^[\x20-\x7e|]+$/.test(run.tzname),`${locale}: ${JSON.stringify(run)}`);
}
Date.prototype.toLocaleTimeString=node;

// The details say the phone's language; mobile.js installs the fix before Python starts.
ok(details({version:'1',error:'x',nav:{userAgent:'',language:'ar-SA'}}).includes('\nLanguage: ar-SA\n'),'details language line');
const mobile=readFileSync(fileURLToPath(new URL('./web/mobile.js',import.meta.url)),'utf8');
const fix=mobile.indexOf(' asciiTimeZoneNames();'),load=mobile.indexOf('py=await loadPyodide(');
ok(fix>0&&load>fix&&mobile.slice(fix,load).split('\n').length<6,'mobile.js installs it just before loadPyodide');

rmSync(temp,{recursive:true,force:true});
console.log(`PASS boot time zone: ${checks} checks`);
