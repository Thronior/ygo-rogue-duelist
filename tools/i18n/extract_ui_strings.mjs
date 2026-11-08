// Collects the English text the web client can show, for translation: string literals and the text parts of template
// literals (split at HTML tags; ${...} becomes {0}, {1}...), plus title/aria-label/placeholder attribute values.
// Usage: node tools/i18n/extract_ui_strings.mjs <out.json>
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),web=path.join(root,'android/web');
// Pure logic, data or engine modules: no player-facing prose.
const SKIP=new Set(['smart_policy.js','deck_policy.js','cpu-combos.js','cpu-card-plans.js','custom-card-policy.js','dna-surgery-policy.js','champion-cards.js','system-strings.js','replay-rules.js','memfs-cleanup.js','engine.js','edopro-adapter.js','trap-return-compat.js','replay-version.js','music-config.js','audio-gains.js','audio-balance.js','field-knowledge.js','battle-planner.js','cpu-deck-model.js','cpu-ranking.js']);
const KEYWORDS=new Set(['return','typeof','case','in','of','new','delete','void','throw','else','do','instanceof','yield','await']);

// Minimal JS scanner: strings, templates (with nested expressions), comments and regex literals.
function scan(src){
 const out=[];let i=0;
 const regexAllowed=prev=>!prev||/[(,=:[!&|?{};+\-*%<>~^]$/.test(prev)||KEYWORDS.has(prev);
 function readString(q){let s='';i++;while(i<src.length&&src[i]!==q){if(src[i]==='\\'){s+=src.slice(i,i+2);i+=2;continue}s+=src[i++]}i++;return s}
 function readRegex(){i++;let cls=false;while(i<src.length){const c=src[i];if(c==='\\'){i+=2;continue}if(c==='[')cls=true;else if(c===']')cls=false;else if(c==='/'&&!cls)break;else if(c==='\n')break;i++}i++;while(/[a-z]/i.test(src[i]||''))i++}
 function readTemplate(){ // at backtick
  i++;const quasis=[''],exprs=[];
  while(i<src.length&&src[i]!=='`'){
   if(src[i]==='\\'){quasis[quasis.length-1]+=src.slice(i,i+2);i+=2;continue}
   if(src[i]==='$'&&src[i+1]==='{'){i+=2;const start=i;readExpr('}');exprs.push(src.slice(start,i));i++;quasis.push('');continue}
   quasis[quasis.length-1]+=src[i++];
  }
  i++;out.push({type:'tpl',quasis,exprs});
 }
 function readExpr(end){ // scan until the matching end char at depth 0
  let depth=0,prev='';
  while(i<src.length){
   const c=src[i];
   if(c===end&&depth===0)return;
   if(c==='{'||c==='('||c==='['){depth++;prev=c;i++;continue}
   if(c==='}'||c===')'||c===']'){depth--;prev=c;i++;continue}
   if(step(prev)){prev='x';continue}
   if(/\s/.test(c)){i++;continue}
   if(/[A-Za-z_$0-9]/.test(c)){let w='';while(/[A-Za-z_$0-9]/.test(src[i]||''))w+=src[i++];prev=w;continue}
   prev=c;i++;
  }
 }
 // Handles one literal/comment at i; returns true when it consumed something.
 function step(prev){
  const c=src[i],n=src[i+1];
  if(c==='/'&&n==='/'){while(i<src.length&&src[i]!=='\n')i++;return true}
  if(c==='/'&&n==='*'){const e=src.indexOf('*/',i+2);i=e<0?src.length:e+2;return true}
  if(c==='"'||c==="'"){const start=i;const s=readString(c);out.push({type:'str',value:s,at:start});return true}
  if(c==='`'){readTemplate();return true}
  if(c==='/'&&regexAllowed(prev)){readRegex();return true}
  return false;
 }
 let prev='';
 while(i<src.length){
  const c=src[i];
  if(step(prev)){prev='x';continue}
  if(/\s/.test(c)){i++;continue}
  if(/[A-Za-z_$0-9]/.test(c)){let w='';while(/[A-Za-z_$0-9]/.test(src[i]||''))w+=src[i++];prev=w;continue}
  prev=c;i++;
 }
 return out;
}

const unescapeJs=s=>s.replace(/\\(u\{[0-9a-f]+\}|u[0-9a-f]{4}|x[0-9a-f]{2}|.)/gi,(m,e)=>{if(/^u\{/i.test(e))return String.fromCodePoint(parseInt(e.slice(2,-1),16));if(/^u/i.test(e))return String.fromCharCode(parseInt(e.slice(1),16));if(/^x/i.test(e))return String.fromCharCode(parseInt(e.slice(1),16));return {n:'\n',t:'\t',r:'',b:'',f:'',v:'','0':'\0'}[e]??e});
const entities=s=>s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(m,d)=>String.fromCharCode(+d));
// Expressions that render markup split the text around them, like a tag would.
const markupExpr=e=>/`[^`]*</.test(e)||/<[a-z]/i.test(e)||/\b(btn|button|icon|Icon|Markup|markup|img|image|render|dialog|card(Button|Facts)|badge|Badge|tile|row|svg|html|list|.*Html)\s*\(/.test(e)||/\.(map|join)\(/.test(e);

// Prose test: letters, and not an identifier, key, CSS class list, selector, path or URL.
function prose(t){
 const s=t.replace(/\{\d+\}/g,'').trim();
 if(!/[A-Za-z]/.test(s)||s.length<2)return false;
 if(/^(https?:|data:|\.{0,2}\/|assets\/)/.test(s)||/\.(png|jpe?g|webp|svg|mp3|ogg|json|js|css|lua|ydk|cdb|wasm|zip)\b/.test(s))return false;
 if(/[{};]/.test(s)&&/:/.test(s))return false; // CSS
 if(/^[a-z0-9_$\-.:#\[\]=>*~+(),"' ]+$/.test(s)&&!/ [a-z]+ /.test(` ${s} `.replace(/-/g,'#'))&&!/\s/.test(s))return false; // key/class
 if(/^[a-z][a-z0-9]*([-_][a-z0-9]+)+( [a-z][a-z0-9]*([-_][a-z0-9]+)*)*$/.test(s))return false; // class lists
 if(/^[a-z]+[A-Z][A-Za-z0-9]*$/.test(s))return false; // camelCase
 if(/^[A-Z0-9_]+$/.test(s)&&s.includes('_'))return false; // CONSTANT
 if(/^[#.]?[a-z][\w-]*([ >.:#\[][\w\-=":#.\[\] ()>*]*)$/.test(s)&&/[.#\[>]/.test(s))return false; // selectors
 if(/^(click|input|change|keydown|keyup|pointerdown|pointerup|pointermove|contextmenu|resize|scroll|load|error|message|open|close)$/.test(s))return false;
 return true;
}
const found=new Map();
function add(text,file,kind){
 const t=text.replace(/\s+/g,' ').trim();
 if(!prose(t))return;
 const row=found.get(t)||{text:t,kind,files:new Set()};row.files.add(file);found.set(t,row);
}
// Splits markup (with \u0000N\u0000 markers for expressions) into text runs and translatable attributes.
function harvest(markup,exprs,file){
 const attrs=/\b(title|aria-label|placeholder|data-tip|alt)\s*=\s*"([^"]*)"/g;
 for(const tag of markup.match(/<[^>]*>/g)||[]){for(const m of tag.matchAll(attrs))if(m[1]!=='alt')segment(m[2],exprs,file)}
 for(const part of markup.split(/<[^>]*>/))segment(part,exprs,file);
}
function segment(part,exprs,file){
 // Markup-producing expressions split the run; others become numbered placeholders.
 const pieces=part.split(/\u0000(\d+)\u0000/);let run='',slots=0;
 const flush=()=>{if(run){add(entities(run),file,slots?'pattern':'exact')}run='';slots=0};
 for(let k=0;k<pieces.length;k++){
  if(k%2===0){run+=pieces[k];continue}
  const e=exprs[+pieces[k]];
  if(markupExpr(e)){flush();continue}
  run+=`{${slots++}}`;
 }
 flush();
}
const files=fs.readdirSync(web).filter(f=>f.endsWith('.js')&&!SKIP.has(f));
for(const f of files){
 const src=fs.readFileSync(path.join(web,f),'utf8');
 for(const tok of scan(src)){
  if(tok.type==='str'){const v=unescapeJs(tok.value);if(/<[a-z\/]/i.test(v))harvest(v,[],f);else if(!v.includes('\n')||v.length<300)add(entities(v),f,'exact');continue}
  const markup=tok.quasis.map(unescapeJs).reduce((s,q,k)=>s+(k?`\u0000${k-1}\u0000`:'')+q,'');
  harvest(markup,tok.exprs,f);
 }
}
// index.html text too.
const html=fs.readFileSync(path.join(web,'index.html'),'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g,'');
harvest(html,[],'index.html');
const rows=[...found.values()].map(r=>({text:r.text,kind:r.kind,files:[...r.files].sort()})).sort((a,b)=>a.text.localeCompare(b.text));
fs.writeFileSync(process.argv[2],JSON.stringify(rows,null,1));
console.log(`${rows.length} strings (${rows.filter(r=>r.kind==='pattern').length} patterns) from ${files.length} files`);
