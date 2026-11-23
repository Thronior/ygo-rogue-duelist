// The Linux app's ygo:// responses carry no Content-Type, so WebAssembly.instantiateStreaming refused Pyodide's wasm
// ("Unexpected response MIME type", Discord 2026-11-23). mobile.js wasmFromBytes() reads the bytes first off http(s).
import fs from 'node:fs';import assert from 'node:assert/strict';
const src=fs.readFileSync(new URL('./web/mobile.js',import.meta.url),'utf8');
const fn=src.slice(src.indexOf('function wasmFromBytes(){'));
const wasmFromBytes=new Function(fn.slice(0,fn.indexOf('\n'))+';return wasmFromBytes')();
const bytes=new Uint8Array([0,97,115,109,1,0,0,0]);// an empty module
const untyped=()=>Promise.resolve(new Response(bytes,{headers:{'content-type':'application/octet-stream'}}));
await assert.rejects(WebAssembly.instantiateStreaming(untyped(),{}),/MIME|Content-Type|content type/i,'streaming refuses an untyped response');
assert.match(src,/if\(!\/\^https\?:\$\/\.test\(location\.protocol\)\)wasmFromBytes\(\);/,'only off http(s)');
wasmFromBytes();
const out=await WebAssembly.instantiateStreaming(untyped(),{});assert.ok(out.instance instanceof WebAssembly.Instance);
assert.ok(await WebAssembly.compileStreaming(untyped()) instanceof WebAssembly.Module);
console.log('PASS wasm without a Content-Type loads from its bytes off http(s) (Linux app)');
