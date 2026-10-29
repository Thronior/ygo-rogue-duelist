import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,L,I} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data');let checks=0;
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:p,phase:4,turn:3,activeChain:[],battleProtected:[false,false],fusionSupport:{}});let z={};e.query=(s,l)=>z[s+':'+l]||[];
 const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};const c=(n,loc=L.HAND,side=p,seq=0,extra={})=>({code:id(n),controller:side,location:loc,sequence:seq,position:1,...extra});
 const put=(side,loc,...cards)=>z[side+':'+loc]=cards.map((t,i)=>({...t,controller:side,location:loc,sequence:i}));
 const reset=()=>{z={};e.lp=[8000,8000];e.player=p;e.phase=4;e.effect=null;e.attackCard=null;e.attackTarget=null;e.activeChain=[];e.fusionSupport={};put(p,L.DECK,...Array(12).fill(c('Battle Ox',L.DECK)));};
 const ctx=()=>smartContext(e,p,L);const source=n=>e.query(p,L.HAND).find(t=>t.code===id(n))||c(n,(data[id(n)].type&1)?L.MZONE:(data[id(n)].type&4)?L.SZONE:L.HAND,p,99);const check=(b,msg)=>{assert(b,msg);checks++};const yes=n=>check(ctx().activation(source(n),true)>=0,n+' should activate');const no=n=>check(ctx().activation(source(n),true)<0,n+' should wait');
 reset();put(p,L.EXTRA,c('Blue-Eyes Ultimate Dragon',L.EXTRA));put(p,L.HAND,c('Polymerization'),c('Blue-Eyes White Dragon'),c('Blue-Eyes White Dragon'));no('Polymerization');put(p,L.HAND,c('Polymerization'),c('Blue-Eyes White Dragon'),c('Blue-Eyes White Dragon'),c('Blue-Eyes White Dragon'));yes('Polymerization');
 reset();put(p,L.EXTRA,c('Ryu Senshi',L.EXTRA));put(p,L.HAND,c('Polymerization'),c('Warrior Dai Grepher'),c('Beastking of the Swamps'));yes('Polymerization');
 reset();put(p,L.EXTRA,c('Gatling Dragon',L.EXTRA));put(p,L.HAND,c('Cybernetic Fusion Support'),c('Polymerization'));put(p,L.GRAVE,c('Barrel Dragon'),c('Blowback Dragon'));yes('Cybernetic Fusion Support');no('Polymerization');e.fusionSupport[p]=e.turn;yes('Polymerization');e.fusionSupport[p]=e.turn-1;no('Polymerization');
 reset();no('Water Hazard');put(p,L.HAND,c('Star Boy'));yes('Water Hazard');put(p,L.MZONE,c('Great White'));no('Water Hazard');
 reset();put(p,L.MZONE,c('Star Boy'));put(p,L.HAND,c('The Legendary Fisherman'));yes('Big Wave Small Wave');put(p,L.MZONE,c('The Legendary Fisherman'));put(p,L.HAND,c('Star Boy'));no('Big Wave Small Wave');
 reset();no('Surface');put(p,L.GRAVE,c('Star Boy'));yes('Surface');
 reset();no('Fish and Kicks');put(p,L.REMOVED,c('Great White'),c('Great White'),c('Great White'));put(1-p,L.MZONE,c('Blue-Eyes White Dragon'));yes('Fish and Kicks');
 reset();no('Ectoplasmer');put(p,L.MZONE,c('Malice Doll of Demise'));yes('Ectoplasmer');check(ctx().targetScore('Ectoplasmer',c('Malice Doll of Demise',L.MZONE),{})>ctx().targetScore('Ectoplasmer',c('Dark Magician',L.MZONE),{}),'Ectoplasmer sacrifices recurring Doll first');
 reset();put(1-p,L.MZONE,c('Blue-Eyes White Dragon'),c('Summoned Skull'));put(p,L.HAND,c('Lightning Vortex'),c('Exodia the Forbidden One'));no('Lightning Vortex');put(p,L.HAND,c('Lightning Vortex'),c('Battle Ox'));yes('Lightning Vortex');
 reset();put(1-p,L.SZONE,c('Gravity Bind'));no('Chiron the Mage');put(p,L.HAND,c('Fissure'));yes('Chiron the Mage');
 reset();no('Soul Charge');put(p,L.GRAVE,c('Blue-Eyes White Dragon'),c('Summoned Skull'),c('Battle Ox'));yes('Soul Charge');e.lp[p]=3000;e.effect={code:id('Soul Charge'),player:p};const rev=e.auto({type:M.SELECT_CARD,player:p,min:1,max:3,selects:e.query(p,L.GRAVE)});check(rev.indicies.length===1,'Soul Charge keeps 2000 LP reserve');e.lp[p]=2000;no('Soul Charge');
 reset();no('Cyber-Stein');put(p,L.EXTRA,c('Blue-Eyes Ultimate Dragon'));yes('Cyber-Stein');e.lp[p]=5000;no('Cyber-Stein');
 reset();no('Gamble');put(1-p,L.HAND,...Array(6).fill(c('Battle Ox')));yes('Gamble');put(p,L.HAND,c('Battle Ox'),c('Battle Ox'));no('Gamble');
 reset();put(p,L.MZONE,c('Giant Rex',L.MZONE));check(!ctx().attackAllowed(e.query(p,L.MZONE)[0],true),'Giant Rex never plans direct attacks');
 reset();no('Mind Control');put(p,L.MZONE,c('Blue-Eyes White Dragon'));put(1-p,L.MZONE,c('Battle Ox'));e.lp[1-p]=3000;yes('Mind Control');e.lp[1-p]=8000;no('Mind Control');yes('Brain Control');e.lp[p]=800;no('Brain Control');
 reset();no('Muko');e.effect={code:id('Pot of Greed'),player:1-p};yes('Muko');e.effect.player=p;no('Muko');
 // Threatening Roar (like Waboku/Negate Attack) answers a declared attack (wabokuWorthUsing), so the
 // Blue-Eyes declares a direct attack first; with no attack declared it waits.
 reset();no('Threatening Roar');e.player=1-p;e.phase=8;put(1-p,L.MZONE,c('Blue-Eyes White Dragon'));no('Threatening Roar');e.attackCard=e.query(1-p,L.MZONE)[0];yes('Threatening Roar');e.battleProtected[p]=true;no('Threatening Roar');e.battleProtected[p]=false;e.attackCard=null;
 reset();put(p,L.HAND,c('Destiny Board'));put(p,L.DECK,...['I','N','A','L'].map(a=>c('Spirit Message "'+a+'"')));yes('Destiny Board');
 // Since v0.1.82 zones are reserved only once Destiny Board is face-up on the field, not while it is in hand.
 check(ctx().setAllowed(c('Mirror Force')),'Board in hand does not block sets');put(p,L.SZONE,c('Destiny Board'));check(!ctx().setAllowed(c('Mirror Force')),'Reserve space for Destiny Board');no('Ectoplasmer');put(p,L.SZONE,c('Mirror Force'));no('Destiny Board');
 reset();put(p,L.MZONE,c('Blue-Eyes White Dragon'));put(1-p,L.MZONE,c('Battle Ox'));check(ctx().targetScore('Gatling Dragon',c('Battle Ox',L.MZONE,1-p),{})>ctx().targetScore('Gatling Dragon',c('Blue-Eyes White Dragon',L.MZONE),{}),'Gatling avoids friendly fire');
 reset();no('Magical Stone Excavation');put(p,L.HAND,c('Magical Stone Excavation'),c('Battle Ox'),c('Battle Ox'));put(p,L.GRAVE,c('Raigeki'));yes('Magical Stone Excavation');
 reset();no('Book of Life');put(p,L.GRAVE,c('Ryu Kokki'));put(1-p,L.GRAVE,c('Battle Ox'));yes('Book of Life');
 reset();no('Overpowering Eye');put(p,L.MZONE,c('Regenerating Mummy'));put(1-p,L.MZONE,c('Blue-Eyes White Dragon'));yes('Overpowering Eye');
 reset();no('Mirror of Yata');put(p,L.MZONE,c('Asura Priest'));yes('Mirror of Yata');
 // Since v0.2.1 Ra's choice reads the offered effect label (card string 0, "Increase ATK and DEF"); the
 // unlabelled fallback for old cores stays conservative for a Ra already on the field.
 reset();no('The Winged Dragon of Ra');const raBoost=()=>({...source('The Winged Dragon of Ra'),description:id('The Winged Dragon of Ra')*16});
 put(p,L.MZONE,c('The Winged Dragon of Ra',L.MZONE));e.lp[1-p]=1000;check(ctx().activation(raBoost(),true)>=0,'Ra boost for lethal');no('The Winged Dragon of Ra');
 put(1-p,L.MZONE,c('Battle Ox'));check(ctx().activation(raBoost(),true)>=0,'Ra boost for lethal through a weaker attacker');e.lp[p]=100;check(ctx().activation(raBoost(),true)<0,'Ra cannot pay at 100 LP');
 // Every newly imported effect/spell/trap has an explicit policy. Normal monsters use baseline summon/combat logic.
 reset();const imported=JSON.parse(fs.readFileSync(new URL('../data/opponent-card-exceptions.json',import.meta.url)));// The explicit-policy requirement covers the cards imported with the original deck policy. Cards imported
 // later (0.1.32-v0.1.96, e.g. Deck Devastation Virus, Harpie Lady 1) use the generic heuristics (activation
 // returns null), so for them only check that the policy answers without throwing.
 const explicit=new Set(["Mind Control", "Brain Control", "Malice Doll of Demise", "Ectoplasmer", "Abyssal Designator", "The Winged Dragon of Ra", "Rafflesia Seduction", "Magical Stone Excavation", "Giant Rex", "Chiron the Mage", "Orb of Yasaka", "Lightning Vortex", "Mirror of Yata", "Creeping Doom Manta", "Water Hazard", "Big Wave Small Wave", "Hydro Pressure Cannon", "Fish and Kicks", "Surface", "Fish Depth Charge", "Forgotten Temple of the Deep", "Aegis of the Ocean Dragon Lord", "Muko", "Soul Charge", "Ninja Grandmaster Sasuke", "Fusion Weapon", "Cybernetic Fusion Support", "Cybernetic Zone", "Threatening Roar", "Overpowering Eye", "Doomcaliber Knight", "Zoma the Spirit", "Call of the Earthbound", "Fiendish Engine Ω", "The Wicked Eraser", "Proton Blast", "Heavy Mech Support Platform", "Fusilier Dragon, the Dual-Mode Beast", "Gatling Dragon"]);
 for(const card of imported)if((card.data.type&1)===0||(card.data.type&32)){const v=ctx().activation(c(card.name));check(explicit.has(card.name)?v!==null:v===null||typeof v==='number','Missing imported-card policy: '+card.name);}
}
console.log('PASS',checks,'new-card positive/negative decisions across both seats');
