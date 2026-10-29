// Muniqui's reviewed relics (2026-10-28), played in real duels with the scripts the game generates.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const json=path=>JSON.parse(fs.readFileSync(root+path,'utf8').replace(/^﻿/,''));
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const VORSE=14898066,POLY=24094653,HINOTAMA=46130346,TRAP_HOLE=4206964;
const runs={
 plain:{artifacts:[]},battle:{artifacts:['battle_proficiency']},shield:{artifacts:['cursed_defense_proficiency']},
 burn:{artifacts:['burn_proficiency']},doll:{artifacts:['straw_doll']},
 frail:{artifacts:['cursed_cracked_sword'],curses:['frailty']},almighty:{artifacts:['almighty','cursed_cracked_sword'],curses:['frailty']},
 anime:{artifacts:['anime_rule']},reader:{artifacts:['mind_reader']},
 named:{artifacts:['name_changer','ojama_gang'],name_changes:[0xf]},unnamed:{artifacts:['ojama_gang']},
};
const scripts=JSON.parse(execFileSync(python,['-B','-c',`
import sys,json;sys.path.insert(0,'.')
import passives
runs=json.loads(sys.stdin.read())
print(json.dumps({k:passives.script({'curses':[],**v}) for k,v in runs.items()}))`],{cwd:root,input:JSON.stringify(runs)}).toString());
const duel=await new MobileDuel(json('data/cards.json')).init([json('android/web/engine-data.json'),json('android/web/scripts.json')]);
const deck=id=>Array(40).fill(id);
// Plays both sides with the CPU policy; hook(m) may return a response or 'stop'.
function play(key,mine,theirs,hook,limit=600){
 let state=duel.start(deck(mine),deck(theirs),8000,8000,5,3,[],[],scripts[key]);
 for(let i=0;i<limit&&!state.finished;i++){const m=duel.pending;if(!m)break;const r=hook(m);if(r==='stop')return;state=duel.respond(r||duel.auto())}
}
const errors=()=>duel.errors?.length?duel.errors:[];

// Battle damage: your first direct attack against an opponent who never summons.
function firstHit(key){let hit=null;play(key,VORSE,POLY,()=>{if(hit===null&&duel.lp[1]<8000)hit=8000-duel.lp[1];return hit!==null?'stop':null});return hit}
assert.equal(firstHit('plain'),1900);
assert.equal(firstHit('battle'),2850,'Battle Proficiency: +50% battle damage to the opponent');
assert.equal(firstHit('shield'),950,'Defense Proficiency: your battle damage is halved too');
// Battle damage you take, from an opponent who attacks a player who never summons.
function takenHits(key){const hits=[];let last=8000;play(key,POLY,VORSE,()=>{if(duel.lp[0]!==last){hits.push([duel.turn,last-duel.lp[0]]);last=duel.lp[0]}return duel.turn>6?'stop':null});return hits}
const plainTaken=takenHits('plain');
assert.ok(plainTaken.length>=2,'the opponent attacks more than once');
assert.equal(takenHits('shield')[0][1],plainTaken[0][1]/2,'Defense Proficiency halves battle damage you take');
// Straw Doll: the first battle damage of each opponent turn is cancelled.
const doll=takenHits('doll'),hitsOn=(hits,turn)=>hits.filter(([t])=>t===turn).length;
for(const turn of [2,4])assert.equal(hitsOn(doll,turn),hitsOn(plainTaken,turn)-1,`Straw Doll cancels exactly the first hit on turn ${turn}`);
assert.ok(doll.reduce((n,[,d])=>n+d,0)<plainTaken.reduce((n,[,d])=>n+d,0),'Straw Doll prevents damage');

// Burn Proficiency: Hinotama's 500 damage becomes 750.
function burn(key){let dealt=null;play(key,HINOTAMA,POLY,m=>{if(duel.lp[1]<8000&&dealt===null)dealt=8000-duel.lp[1];if(dealt!==null)return 'stop';if(m.player===0&&m.type===M.SELECT_IDLECMD&&m.activates?.length)return {type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:0};return null});return dealt}
assert.equal(burn('plain'),500);
assert.equal(burn('burn'),750,'Burn Proficiency: +50% effect damage');

// Almighty: relic and curse losses do not apply; gains still do.
function summoned(key,onPrompt=()=>null){let stats=null;play(key,VORSE,POLY,m=>{const own=duel.query(0,L.MZONE).find(c=>c?.code===VORSE&&(c.position&5));if(own){stats=[own.attack,own.defense];return 'stop'}return onPrompt(m)});return stats}
assert.deepEqual(summoned('frail'),[2000,200],'Cracked Sword and Cracked Blade apply without Almighty');
assert.deepEqual(summoned('almighty'),[2200,1200],'Almighty keeps the gains and blocks the losses');

// Anime Rule #1: a Normal Summon offers face-up Defense Position.
function summonPosition(key){let offered=null;play(key,VORSE,POLY,m=>{if(m.player===0&&m.type===M.SELECT_IDLECMD&&m.summons?.length)return {type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:0};if(m.player===0&&m.type===M.SELECT_POSITION){offered=m.positions;return 'stop'}if(duel.query(0,L.MZONE).some(Boolean))return 'stop';return null});return offered}
assert.equal(summonPosition('plain'),null,'without the relic a Normal Summon is in Attack Position');
assert.ok(summonPosition('anime')&4,'Anime Rule #1 offers face-up Defense Position');

// Mind Reader: at your Standby Phase, choose one of the opponent's Set cards; it is shown to you and stays Set.
let looked=null;play('reader',VORSE,TRAP_HOLE,m=>{if(m.player===0&&m.type===M.SELECT_CARD&&duel.phase===2&&m.selects?.length&&m.selects.every(c=>c.controller===1)){looked=m.selects[0];return {type:R.SELECT_CARD,indicies:[0]}}if(looked&&duel.phase!==2){const live=duel.query(1,looked.location).find(c=>c&&c.sequence===looked.sequence);looked={known:duel.knownFieldCard(0,{...looked,controller:1}),faceDown:!(live?.position&5)};return 'stop'}return duel.turn>5?'stop':null});
assert.ok(looked&&looked.known===TRAP_HOLE&&looked.faceDown,`Mind Reader shows the Set Trap Hole and leaves it Set (${JSON.stringify(looked)})`);
let promptedWithout=false;play('plain',VORSE,TRAP_HOLE,m=>{if(m.player===0&&m.type===M.SELECT_CARD&&duel.phase===2)promptedWithout=true;return duel.turn>5?'stop':null});
assert.equal(promptedWithout,false,'no Standby Phase prompt without the relic');

// Name Changer: Vorse Raider counts as an Ojama for Ojama Gang (+1,000 ATK per face-up Ojama, itself included).
assert.deepEqual(summoned('unnamed'),[1900,1200]);
assert.deepEqual(summoned('named'),[2900,1200],'Name Changer adds the chosen archetype');
assert.deepEqual(errors(),[]);
duel.destroy();
console.log('PASS reviewed relics: Battle/Burn/Defense Proficiency, Straw Doll, Almighty, Anime Rule #1, Mind Reader and Name Changer in real duels');
