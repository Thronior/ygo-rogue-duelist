import fs from 'node:fs';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';
import {smartContext} from './web/smart_policy.js';
const root=fileURLToPath(new URL('./web/',import.meta.url));const content=JSON.parse(fs.readFileSync(root+'content.json')),data=JSON.parse(fs.readFileSync(root+'engine-data.json')),cards=new Map(content.cards.map(c=>[c.id,c])),id=n=>content.cards.find(c=>c.name===n).id,L={DECK:1,HAND:2,MZONE:4,SZONE:8,GRAVE:16,REMOVED:32,EXTRA:64};let checks=0;
for(const p of [0,1]){
 const card=(n,side,extra={})=>({code:id(n),controller:side,location:4,sequence:0,position:1,attack:data[id(n)].attack,defense:data[id(n)].defense,...extra});
 const d=card('Uraby',p,{attack:2000,defense:100}),a=card('Airknight Parshath',1-p,{attack:2500});let own=[d],enemy=[a],backs=[[],[]];
 const e={cards,data,lp:[8000,8000],player:p,turn:4,phase:256,name:code=>cards.get(code)?.name||'',query:(s,l)=>l===4?(s===p?own:enemy):l===8?backs[s]:[],aiModifiers:{}};
 let ctx=()=>smartContext(e,p,L,{to_bp:false});
 assert.equal(ctx().incomingDamage(d,true),500);assert.equal(ctx().incomingDamage(d,false),2400);assert.equal(ctx().preferSet(d),false);checks+=3;
 enemy.push(card('Uraby',1-p,{sequence:1,attack:1800}));assert.equal(ctx().incomingDamage(d,true),2300);assert.equal(ctx().incomingDamage(d,false),4200);checks+=2;
 enemy=[card('Uraby',1-p,{attack:2500})];assert.equal(ctx().pierce(enemy[0]),false);e.aiModifiers.statRelics={[1-p]:[{effect:'pierce'}]};assert.equal(ctx().saferPosition(d),true);e.aiModifiers={};checks+=2;
 backs[1-p]=[card('Fairy Meteor Crush',1-p,{location:8,equip_card:enemy[0]})];assert.equal(ctx().pierce(enemy[0]),true);backs[1-p][0].equip_card={...enemy[0],sequence:1};assert.equal(ctx().pierce(enemy[0]),false);backs[1-p]=[];checks+=2;
 enemy=[card('Enraged Battle Ox',1-p),card('Battle Ox',1-p,{sequence:1})];assert.equal(ctx().pierce(enemy[1]),true);enemy[0].is_disabled=true;assert.equal(ctx().pierce(enemy[1]),false);checks+=2;
 enemy=[card('Uraby',1-p,{position:8})];assert.equal(ctx().saferPosition(d),null);checks++;
 enemy=[];own=[card('Blue-Eyes White Dragon',p)];const jinzo=card('Jinzo',p,{location:2});assert.equal(ctx().tributeWorth(jinzo),false);checks++;
 own=[card('Summoned Skull',p)];assert.equal(ctx().tributeWorth(jinzo),false);checks++;
 backs[1-p]=[card('Spellbinding Circle',1-p,{location:8})];e.attackLocks=new Map([[`${p}:0`,backs[1-p][0]]]);assert.notEqual(ctx().tributeWorth(jinzo),false);checks++;
 backs[1-p]=[card('Gravity Bind',1-p,{location:8})];e.attackLocks=new Map();const replacement=card('Summoned Skull',p,{location:2});assert.equal(ctx().tributeWorth(replacement),false);checks++;
}
console.log('PASS',checks,'piercing forecast and tribute checks');
