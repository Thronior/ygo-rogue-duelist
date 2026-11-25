// CPU fixes of 2026-11-25 (Discord items 9, 10 and 12). Engine duels: the player passes turn 1, the CPU plays turn 2.
// 9:  trade attacks (Hyper Hammerhead, D.D. Warrior, Ryu Kokki...) into stronger monsters are judged as a whole, so the
//     CPU no longer kills itself with reflected damage, but still makes the trade when it wins or costs little.
// 10: Big Bang Shot is destroyed after it is equipped (its monster is banished), not in answer to it.
// 12: Wave-Motion Cannon fires as soon as it is lethal.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json');
const allCards=[...meta.cards,...(meta.tokenCards||[])],id=n=>{const c=allCards.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const ok=(value,why)=>{assert(value,why);checks++};
const duel=await new MobileDuel(allCards).init([data,scripts]);
const add=(n,p,loc,pos,seq=0)=>`Debug.AddCard(${id(n)},${p},${p},LOCATION_${loc},${seq},POS_${pos})\n`;
const field=(body,lp)=>{let s=`Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,${lp[0]},0,0)\nDebug.SetPlayerInfo(1,${lp[1]},0,0)\n`+body;for(const p of [0,1])for(let i=0;i<10;i++)s+=add('Kuriboh',p,'DECK','FACEDOWN');return s+'Debug.ReloadFieldEnd()\n'};
// player: what the player does when asked (null: pass everything). turns: play until this turn starts.
function play(body,{lp=[8000,8000],turns=3,player=null}={}){
 duel.start([],[],lp[0],lp[1],0,7,[],[],field(body,lp),0);duel.core.startDuel(duel.h);duel.advance();
 const did=[];const seen=duel.onMessage.bind(duel);
 duel.onMessage=m=>{if(m.type===M.CHAINING)did.push(['chain',duel.name(m.code),m.controller??m.player]);if([M.SUMMONING,M.SPSUMMONING].includes(m.type))did.push(['summon',duel.name(m.code)]);if(m.type===M.ATTACK)did.push(['attack',duel.name(duel.query(m.card.controller,L.MZONE).find(c=>c&&c.sequence===m.card.sequence)?.code)]);if(m.type===M.MOVE&&m.from?.location===L.MZONE)did.push(['left',duel.name(m.card),m.to?.location]);return seen(m)};
 try{for(let n=0;n<400&&duel.pending&&!duel.finished&&duel.turn<turns;n++){const m=duel.pending;
  if(m.player===0){const r=player?.(m);duel.respond(r??(m.type===M.SELECT_IDLECMD?{type:1,action:7,index:null}:m.type===M.SELECT_CHAIN?{type:8,index:null}:m.type===M.SELECT_BATTLECMD?{type:0,action:3,index:null}:duel.auto()));continue}
  duel.respond(duel.auto(m))}}finally{duel.onMessage=seen}
 return {did,lp:[...duel.lp],finished:duel.finished,attacked:n=>did.some(x=>x[0]==='attack'&&x[1]===n),left:n=>did.some(x=>x[0]==='left'&&x[1]===n)};
}

// 9. Trade attacks into stronger monsters.
{
 const cpu=(n,pos='FACEUP_ATTACK')=>add(n,1,'MZONE',pos,2);
 // Rex's report: Hyper Hammerhead into a 2000 DEF monster at low LP. 500 reflected was under a third of 2000 LP, so it attacked.
 const wall=add('Giant Soldier of Stone',0,'MZONE','FACEUP_DEFENSE',2);
 const low=play(cpu('Hyper Hammerhead')+wall,{lp:[8000,2000]});
 ok(!low.attacked('Hyper Hammerhead'),'at 2000 LP Hyper Hammerhead does not pay 500 LP to bounce a Level 3 wall');
 const high=play(cpu('Hyper Hammerhead')+wall,{lp:[8000,8000]});
 ok(high.attacked('Hyper Hammerhead')&&high.left('Giant Soldier of Stone')&&high.lp[1]===7500,'at 8000 LP the same bounce is worth 500 LP');
 // Lethal: the bounce clears the only blocker and Vorse Raider attacks directly, even though 1100 is most of our 1500 LP.
 const gardna=add('Big Shield Gardna',0,'MZONE','FACEUP_DEFENSE',2);
 const win=play(cpu('Hyper Hammerhead')+add('Vorse Raider',1,'MZONE','FACEUP_ATTACK',3)+gardna,{lp:[1800,1500]});
 ok(win.attacked('Hyper Hammerhead')&&win.lp[0]<=0,'Hyper Hammerhead bounces Big Shield Gardna for lethal at 1500 LP (lp '+win.lp+')');
 const noWin=play(cpu('Hyper Hammerhead')+add('Vorse Raider',1,'MZONE','FACEUP_ATTACK',3)+gardna,{lp:[4000,1500]});
 ok(!noWin.attacked('Hyper Hammerhead'),'without lethal, 1100 of 1500 LP is not paid for the bounce');
 // Their visible board would kill us next turn only because of the reflected damage: no trade. At 5500 LP the 1100 for
 // bouncing Big Shield Gardna (it comes straight back) pays beside two Vorse Raiders (2400 through us next turn); with
 // Summoned Skull too they deal 4900, under 5500 but over the 4400 the bounce would leave.
 const raiders=add('Vorse Raider',0,'MZONE','FACEUP_ATTACK',1)+add('Vorse Raider',0,'MZONE','FACEUP_ATTACK',3)+gardna;
 const safe=play(cpu('Hyper Hammerhead')+raiders,{lp:[8000,5500]});
 ok(safe.attacked('Hyper Hammerhead')&&safe.left('Big Shield Gardna'),'at 5500 LP against 2400 of visible damage, Big Shield Gardna is bounced');
 const unsafe=play(cpu('Hyper Hammerhead')+raiders+add('Summoned Skull',0,'MZONE','FACEUP_ATTACK',4),{lp:[8000,5500]});
 ok(!unsafe.attacked('Hyper Hammerhead'),'with Summoned Skull too, the 1100 would put the CPU in lethal range: no attack');
 // D.D. Warrior banishes Summoned Skull at 8000 LP (1300 back and the Warrior is gone with it); never at 1800 LP.
 const skull=add('Summoned Skull',0,'MZONE','FACEUP_ATTACK',2);
 const dd=play(cpu('D.D. Warrior')+skull,{lp:[8000,8000]});
 ok(dd.attacked('D.D. Warrior')&&dd.did.some(x=>x[0]==='left'&&x[1]==='Summoned Skull'&&x[2]===L.REMOVED),'D.D. Warrior banishes Summoned Skull at 8000 LP');
 const ddLow=play(cpu('D.D. Warrior')+skull,{lp:[8000,1800]});
 ok(!ddLow.attacked('D.D. Warrior'),'D.D. Warrior does not take 1300 of 1800 LP for it');
 // Cards outside the old two-name list: Ryu Kokki destroys the Warrior wall it cannot beat (200 back at 8000 LP).
 const ryu=play(cpu('Ryu Kokki')+gardna,{lp:[8000,8000]});
 ok(ryu.attacked('Ryu Kokki')&&ryu.left('Big Shield Gardna'),'Ryu Kokki attacks Big Shield Gardna (Warrior) and destroys it');
 // Ninja Grandmaster Sasuke destroys a face-up Defense Position monster before damage: nothing hits back, even at 300 LP.
 const sasuke=play(cpu('Ninja Grandmaster Sasuke')+gardna,{lp:[8000,300]});
 ok(sasuke.attacked('Ninja Grandmaster Sasuke')&&sasuke.left('Big Shield Gardna')&&sasuke.lp[1]===300,'Ninja Grandmaster Sasuke destroys Big Shield Gardna at 300 LP');
}

// 10. Big Bang Shot banishes its monster when it leaves the field: the CPU's Mystical Space Typhoon waits until it is
// equipped (it was chained to the activation, which only stopped the 400 ATK).
{
 let cast=false;const bbs=m=>{if(m.type!==M.SELECT_IDLECMD||cast)return null;const i=(m.activates||[]).findIndex(c=>duel.name(c.code)==='Big Bang Shot');if(i<0)return null;cast=true;return {type:1,action:I.SELECT_ACTIVATE,index:i}};
 const body=add('Luster Dragon',0,'MZONE','FACEUP_ATTACK',2)+add('Big Bang Shot',0,'HAND','FACEDOWN')+add('Mystical Space Typhoon',1,'SZONE','FACEDOWN',1);
 const r=play(body,{player:bbs}),chains=r.did.filter(x=>x[0]==='chain').map(x=>x[1]);
 ok(chains[0]==='Big Bang Shot'&&chains.includes('Mystical Space Typhoon'),'Big Bang Shot is cast and Mystical Space Typhoon is used ('+chains.join(' > ')+')');
 ok(r.did.some(x=>x[0]==='left'&&x[1]==='Luster Dragon'&&x[2]===L.REMOVED),'it waited for the equip: Luster Dragon is banished with Big Bang Shot');
 // Big Bang Shot aimed at the CPU's own monster (to banish it later) is still answered at once.
 cast=false;const mine=play(add('Vorse Raider',1,'MZONE','FACEUP_ATTACK',2)+add('Big Bang Shot',0,'HAND','FACEDOWN')+add('Mystical Space Typhoon',1,'SZONE','FACEDOWN',1),{player:m=>{if(m.type===M.SELECT_CARD&&m.selects?.some(c=>c.controller===1&&c.location===L.MZONE))return {type:R.SELECT_CARD,indicies:[m.selects.findIndex(c=>c.controller===1)]};return bbs(m)}});
 ok(mine.did[0]?.[1]==='Big Bang Shot'&&!mine.left('Vorse Raider')&&mine.did.some(x=>x[0]==='chain'&&x[1]==='Mystical Space Typhoon'),'on the CPU\'s Vorse Raider it is destroyed in answer, and Vorse Raider stays');
}

// 12. Wave-Motion Cannon is sent the first Main Phase its charge (1000 per Standby Phase of ours) is lethal, never before.
{
 const fire=body=>{const r=play(body,{lp:[2500,8000],turns:12});return {r,shots:r.did.filter(x=>x[0]==='chain'&&x[1]==='Wave-Motion Cannon'&&x[2]===1)}};
 const one=fire(add('Wave-Motion Cannon',1,'HAND','FACEDOWN')+add('Big Shield Gardna',0,'MZONE','FACEUP_DEFENSE',2));
 // Two chain entries: the activation on turn 2, the shot after the third Standby Phase (turn 8).
 ok(one.shots.length===2&&one.r.lp[0]<=0&&duel.turn===8,'one Wave-Motion Cannon fires at 3000 against 2500 LP on turn 8 (turn '+duel.turn+', lp '+one.r.lp+')');
 const two=fire(add('Wave-Motion Cannon',1,'HAND','FACEDOWN')+add('Wave-Motion Cannon',1,'HAND','FACEDOWN')+add('Luster Dragon',0,'MZONE','FACEUP_ATTACK',2));
 ok(two.r.lp[0]<=0&&duel.turn===8,'with two copies the first lethal one fires on turn 8 too (turn '+duel.turn+')');
 // A non-lethal multi-card line was played before every activation, so a charged Cannon waited behind it (replay
 // e680709eeb72@108: 2000 charged against 1000 LP, Lava Golem was Special Summoned instead). The charge is set in Lua.
 const charged=`local w=Debug.AddCard(${id('Wave-Motion Cannon')},1,1,LOCATION_SZONE,2,POS_FACEUP) w:SetTurnCounter(2)
`;
 const golem=play(charged+add('Lava Golem',1,'HAND','FACEDOWN')+add('Vorse Raider',0,'MZONE','FACEUP_ATTACK',1)+add('Vorse Raider',0,'MZONE','FACEUP_ATTACK',3),{lp:[1000,8000]});
 ok(golem.lp[0]<=0&&golem.did.some(x=>x[0]==='chain'&&x[1]==='Wave-Motion Cannon')&&!golem.did.some(x=>x[0]==='summon'&&x[1]==='Lava Golem'),'the charged Cannon fires before the Lava Golem line ('+JSON.stringify(golem.did.slice(0,3))+')');
}

duel.destroy();
console.log(`PASS CPU Nov 25b (${checks} checks): trade attacks, Big Bang Shot, Wave-Motion Cannon`);
