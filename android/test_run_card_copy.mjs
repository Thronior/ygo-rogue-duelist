// Copy on the run sheet (Discord, 2026-11-19): the Windows app's ShadowNative bridge only has load/store, and Copy fell
// through to a download. It now copies through the browser clipboard like a desktop browser; the Android app keeps its
// native copy.
import assert from 'node:assert/strict';
let checks=0;const ok=(v,why)=>{assert(v,why);checks++};
const written=[],saved=[];
globalThis.FileReader=class{readAsDataURL(b){b.arrayBuffer().then(a=>{this.result='data:image/png;base64,'+Buffer.from(a).toString('base64');this.onload()})}};
globalThis.ClipboardItem=class{constructor(items){this.items=items}};
Object.defineProperty(globalThis.navigator,'clipboard',{value:{write:async items=>{written.push(items)}},configurable:true});
const canvas={dataset:{ready:'1'},toBlob:cb=>cb(new Blob(['png'],{type:'image/png'}))};
const {copyRunCard}=await import('./web/run-card.js');

globalThis.ShadowNative={load:async()=>'{}',store:async()=>true};
const windows=await copyRunCard(canvas,'run');
ok(written.length===1&&written[0][0].items['image/png'],'the Windows app writes the PNG to the clipboard');
ok(/^Copied!/.test(windows),'and says it was copied, not downloaded');

globalThis.ShadowNative={copyImage:(name,data)=>{saved.push(name);return true},saveDeckImage:()=>true};
const android=await copyRunCard(canvas,'run');
ok(saved.length===1&&written.length===1,'the Android app still copies natively, without the browser clipboard');
ok(/^Copied!/.test(android),'Android says copied');

delete globalThis.ShadowNative;
await copyRunCard(canvas,'run');
ok(written.length===2,'a desktop browser uses the clipboard as before');
console.log(`PASS run sheet Copy: Windows app copies instead of downloading (${checks} checks)`);
