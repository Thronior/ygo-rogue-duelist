import fs from 'node:fs';import assert from 'node:assert/strict';
import {MobileDuel,M,R,I,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:p,turn:3,phase:4,activeChain:[],battleProtected:[false,false]});let zones={};e.query=(s,l)=>zones[s+':'+l]||[];
 const c=(n,l=L.MZONE,side=p,pos=1)=>({code:id(n),controller:side,location:l,sequence:0,position:pos,attack:data[id(n)].attack,defense:data[id(n)].defense});const put=(s,l,...cards)=>zones[s+':'+l]=cards;
 let prompt={to_bp:true,activates:[]};const policy=()=>smartContext(e,p,L,prompt);
 const serket=c('Mystical Beast of Serket');put(p,L.MZONE,serket);assert.equal(policy().flipUseful('Mystical Beast of Serket',serket),false);assert(policy().summonScore(serket)<0);
 put(p,L.SZONE,c('Temple of the Kings',L.SZONE,p,10));assert.equal(policy().flipUseful('Mystical Beast of Serket',serket),false);
 put(p,L.SZONE,c('Temple of the Kings',L.SZONE));assert(policy().flipUseful('Mystical Beast of Serket',serket)!==false);assert(policy().summonScore(serket)>=0);
 zones={};const ox=c('Battle Ox');put(p,L.MZONE,ox);put(1-p,L.MZONE,c("Hiro's Shadow Scout",L.MZONE,1-p));assert(policy().activation(c('Block Attack',L.HAND))<0);
 put(1-p,L.MZONE,c('Summoned Skull',L.MZONE,1-p));assert(policy().activation(c('Block Attack',L.HAND))>=0);
 const jar=c('Cyber Jar',L.MZONE,1-p,8);put(1-p,L.MZONE,jar);e.knownFieldCard=()=>null;assert.equal(policy().battleBeforeSummon(),false,'Never read unknown facedown identity');e.knownFieldCard=()=>jar.code;assert.equal(policy().battleBeforeSummon(),true);prompt.to_bp=false;assert.equal(policy().battleBeforeSummon(),false);prompt.to_bp=true;
 zones={};const fissure=c('Fissure',L.HAND),hole=c('Dark Hole',L.HAND);put(p,L.HAND,fissure,hole);put(1-p,L.MZONE,c('Giant Germ',L.MZONE,1-p),{...c('Dark Necrofear',L.MZONE,1-p),sequence:1});prompt.activates=[fissure,hole];assert(policy().activation(fissure)<0);assert(policy().activation(hole)>=0);
}
console.log('PASS both seats: Serket prerequisites, useful Block Attack, known versus unknown Cyber Jar, legal battle timing and wipe sequencing');
