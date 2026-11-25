// Relics on the second Draft/Free Duels seat (relic audit, user 2026-11-25). passives.multiplayer_script rewrites a relic
// written for player 0 so it works for player 1. Six relics still acted for the wrong player:
//  - Unstable DNA / Genetic Override asked the OTHER player for the Type and Attribute (AnnounceRace/Attribute(0,...)).
//  - Parasite Infestation shuffled Paracide into its owner's own Deck (SendtoDeck(tc,1,...)); its draw damage hit the owner.
//  - Fusion Time read the opponent's monsters as materials (GetMatchingGroup(...,tp) flipped twice).
//  - Spirit Sanctuary checked the opponent's Graveyard (IsExistingMatchingCard(gy,p) flipped twice).
//  - Union Buster equipped for the wrong player (Equip(0,...)); Ritual Scar / Grand Ritual Altar hints went to the wrong side.
// Each relic here is owned by seat 1 and must work for seat 1, exactly as it does for seat 0.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,L} from './web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json');
const all=[...meta.cards,...(meta.tokenCards||[])],id=n=>{const c=all.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const py=code=>execFileSync(python,['-B','-c',"import sys;sys.path.insert(0,'.');"+code],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}});
const seat=(relics,side)=>py(`import draft_relics as d,passives;print(passives.multiplayer_script(dict(d._base(0),artifacts=${JSON.stringify(relics)}),${side}))`);
let checks=0;const ok=(v,why)=>{assert(v,why);checks++};
const e=await new MobileDuel(all).init([data,scripts]);
const add=(n,p,loc,pos,seq=0)=>`Debug.AddCard(${id(n)},${p},${p},LOCATION_${loc},${seq},POS_${pos})\n`;
const field=body=>{let s='Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,8000,0,0)\nDebug.SetPlayerInfo(1,8000,0,0)\n'+body;for(const p of [0,1])for(let i=0;i<10;i++)s+=add('Battle Ox',p,'DECK','FACEDOWN');return s+'Debug.ReloadFieldEnd()\n'};
const begin=(body,relics,side)=>{e.start([],[],8000,8000,0,7,[],[],field(body)+'\n'+seat(relics,side),0);e.core.startDuel(e.h);e.advance()};
// The non-owner passes every prompt; stop at the owner's first Main Phase prompt (or any prompt for the owner).
const toOwner=(owner,stop=m=>m.player===owner&&m.type===M.SELECT_IDLECMD)=>{for(let i=0;i<120&&e.pending;i++){const m=e.pending;if(stop(m))return m;
 e.respond(m.player!==owner&&m.type===M.SELECT_IDLECMD?{type:1,action:7,index:null}:m.player!==owner&&m.type===M.SELECT_BATTLECMD?{type:0,action:3,index:null}:e.auto(m))}return e.pending};

for(const side of [0,1]){
 const other=1-side,who=`seat ${side}`;
 // Unstable DNA: its owner names the Type at the start of the Draw Phase.
 begin('',['unstable_dna'],side);
 const ask=toOwner(side,m=>m.type===M.ANNOUNCE_RACE||m.type===M.ANNOUNCE_ATTRIB);
 ok(ask&&(ask.type===M.ANNOUNCE_RACE||ask.type===M.ANNOUNCE_ATTRIB)&&ask.player===side,`${who}: Unstable DNA asks its owner (asked player ${ask?.player})`);
 // Parasite Infestation: the face-up Paracide goes into the opponent's Deck.
 begin('',['parasite_infestation'],side);
 const inDeck=p=>e.query(p,L.DECK).some(c=>c&&c.code===id('Parasite Paracide'));
 ok(inDeck(other)&&!inDeck(side),`${who}: Parasite Paracide is in the opponent's Deck`);
 // Fusion Time: Flame Swordsman from the owner's own field materials.
 begin(add('Flame Manipulator',side,'MZONE','FACEUP_ATTACK',0)+add('Masaki the Legendary Swordsman',side,'MZONE','FACEUP_ATTACK',1)+add('Flame Swordsman',side,'EXTRA','FACEDOWN'),['fusion_time'],side);
 const idle=toOwner(side);
 ok(idle?.special_summons?.some(c=>c.code===id('Flame Swordsman')),`${who}: Fusion Time offers Flame Swordsman from its own materials`);
 // Spirit Sanctuary: Tribute Summon a Spirit by banishing monsters from the owner's own GY.
 begin(add('Yamata Dragon',side,'HAND','FACEDOWN')+add('Battle Ox',side,'GRAVE','FACEUP')+add('Battle Ox',side,'GRAVE','FACEUP'),['spirit_sanctuary'],side);
 const spirit=toOwner(side);
 ok([...(spirit?.summons||[]),...(spirit?.monster_sets||[])].some(c=>c.code===id('Yamata Dragon')),`${who}: Spirit Sanctuary lets Yamata Dragon be summoned with its own GY`);
}
// The seat-1 script still has every relic's player arguments the right way round: no literal left in a player-only slot.
const s1=seat(['unstable_dna','genetic_override','parasite_infestation','union_buster','fusion_time','spirit_sanctuary','cursed_ritual_scar','grand_ritual_altar'],1);
ok(!/Duel\.Announce(?:Race|Attribute)\(0,/.test(s1)&&!/Duel\.Equip\(0,/.test(s1)&&/Duel\.SendtoDeck\(tc,0,/.test(s1),'seat 1: literal player arguments flipped');
ok(/Duel\.Damage\(1-\(tp\)/.test(s1)&&/IsExistingMatchingCard\(gy,1-\(p\)/.test(s1)&&/Hint\(HINT_MESSAGE,1-\(c:GetControler\(\)\)/.test(s1),'seat 1: worked-out players are pre-flipped so the run-time flip keeps them');
e.destroy();
console.log(`PASS Draft second-seat relics (${checks} checks): Unstable DNA, Parasite Infestation, Fusion Time, Spirit Sanctuary on both seats`);
