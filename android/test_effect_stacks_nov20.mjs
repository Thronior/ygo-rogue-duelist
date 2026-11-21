// Stacked curses (Nori, Discord 2026-11-19): repeated curses show once with a ×N badge in every curse icon list.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),read=p=>fs.readFileSync(root+p,'utf8');
const {curseStacks,curseIcons,curseCountBadge,curseInfoMarkup}=await import('./web/experience-ui.js');
const content=JSON.parse(read('android/web/content.json').replace(/^﻿/,''));
let checks=0;const same=(a,b,m)=>{assert.deepEqual(a,b,m);checks++},ok=(v,m)=>{assert(v,m);checks++};
const buttons=html=>[...html.matchAll(/<button [^>]*data-curse="([^"]+)"[^>]*>(.*?)<\/button>/g)].map(m=>({key:m[1],count:+(m[0].match(/data-count="(\d+)"/)?.[1]||1),badge:m[2].match(/×(\d+)/)?.[1]}));

// Grouping keeps first-seen order and counts every copy.
same(curseStacks(['trap_jammer','frailty','trap_jammer','tax','trap_jammer','frailty']),[{key:'trap_jammer',count:3},{key:'frailty',count:2},{key:'tax',count:1}],'stacks in order');
same(curseStacks(undefined),[],'no curses');

// Solo and Tag icon rows: one button per curse, ×N only on repeats, data-count for the dialog.
for(const tag of [false,true]){
 const html=curseIcons(content,['trap_jammer','tax','trap_jammer','trap_jammer'],tag);
 same(buttons(html),[{key:'trap_jammer',count:3,badge:'3'},{key:'tax',count:1,badge:undefined}],'grouped icons, tag='+tag);
 ok(html.includes(tag?'data-tag="curse-info"':'data-do="curse-info"'),'keeps the tap action, tag='+tag);
 ok(html.includes('title="Trap Jammer"')&&html.includes('aria-label="Trap Jammer"'),'hover title stays the plain name so it still translates');
}
same(curseCountBadge(1),'','single copy has no badge');

// The dialog shows the stack count above the curse text; single curses are unchanged.
{
 const one=curseInfoMarkup(content,'trap_jammer',0,1),three=curseInfoMarkup(content,'trap_jammer',0,3);
 same(one,`<p>${content.curses.trap_jammer[1]}</p>`,'single dialog unchanged');
 ok(three.includes('×3')&&three.endsWith(one),'stacked dialog adds ×3');
}

// Every caller goes through the grouped markup: solo routes/duel strip, Tag routes, both dialogs, replay viewer.
{
 const mobile=read('android/web/mobile.js'),tagUI=read('android/web/tag-ui.js'),reveal=read('android/web/encounter-reveal.js'),replay=read('android/web/duel-replay-viewer.js');
 ok(/a==='curse-info'\)\{dialog\([^;]*curseInfoMarkup\([^;]*el\.dataset\.count/.test(mobile),'solo dialog reads the count');
 ok(/action==='curse-info'\)\{this\.dialog\([^;]*curseInfoMarkup\([^;]*el\.dataset\.count/.test(tagUI),'Tag dialog reads the count');
 ok(mobile.includes('curseIcons(content,r.curses||[])')&&reveal.includes('curseIcons(content,r.route_curses[i])')&&tagUI.includes('curseIcons(this.content,r.route_curses?.[i]||[],true)'),'icon rows use curseIcons');
 ok(replay.includes('curseStacks(info.activeCurses)')&&replay.includes('curseCountBadge(count)'),'replay viewer counts curses');
}

// Styles: badge sits inside the icon corner and never blocks the tap.
{
 const css=read('android/web/mobile.css');
 ok(/\.curse-icon,\.replay-modifiers \.replay-curse\{position:relative\}/.test(css),'icons anchor the badge');
 ok(/\.curse-icon>\.curse-count,\.replay-curse>\.curse-count\{[^}]*pointer-events:none/.test(css),'badge ignores taps');
}
console.log(`effect stacks ok: ${checks} checks`);
