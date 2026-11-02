// Every opponent has one duel background, and the eight stay evenly used.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {duelScenes,opponentScene} from './web/opponent-backgrounds.js';
import {backgroundSpec} from './web/background-assets.js';
const source=fs.readFileSync('android/web/opponent-backgrounds.js','utf8');
const names=[...new Set(JSON.parse(fs.readFileSync('android/web/content.json','utf8')).characters.map(c=>c.name))];
const counts=Object.fromEntries(duelScenes.map(scene=>[scene,0]));
for(const name of names){
 assert(source.includes(JSON.stringify(name).slice(1,-1))||source.includes(`'${name}'`),`${name} has no background`);
 counts[opponentScene(name)]++;
}
assert.equal(duelScenes.length,8);
assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),names.length);
assert(Math.max(...Object.values(counts))-Math.min(...Object.values(counts))<=1,'uneven spread '+JSON.stringify(counts));
assert.equal(opponentScene('Nobody new yet'),'duel','an opponent added later falls back to the spiral');
for(const scene of duelScenes){const spec=backgroundSpec(scene);assert(fs.existsSync('android/web/'+spec.path),spec.path);assert(fs.existsSync('android/web/'+spec.poster),spec.poster)}
assert.equal(backgroundSpec('tunnel'),null);
console.log('PASS',names.length,'opponents across 8 backgrounds',JSON.stringify(counts));
