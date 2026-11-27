// Every opponent has its own duel track (user, 2026-11-26), from the tracks already in the game: the 36 characters keep
// their boss theme, the other story opponents reuse a fitting one, and decks players sent in get a steady pick.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {bossThemes,opponentThemes,duelTheme,playlists} from './web/music-config.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const content=JSON.parse(fs.readFileSync(root+'android/web/content.json','utf8').replace(/^﻿/,''));
const names=[...new Set(content.characters.map(c=>c.name).filter(Boolean))];
for(const name of names){
 const track=duelTheme(name);
 assert(fs.existsSync(`${root}assets/music/${track}.m4a`),`${name}: ${track}.m4a exists`);
 assert.equal(duelTheme(name),track,'the same track every time');
}
for(const [name,track] of Object.entries(bossThemes))assert.equal(duelTheme(name),track,`${name} keeps its theme`);
for(const name of Object.keys(opponentThemes))assert(names.includes(name),`${name} is an opponent`);
const tracks=new Set(names.map(duelTheme));
assert(tracks.size>=30,`many different tracks (${tracks.size})`);
assert.equal(duelTheme(undefined),'duel');assert(playlists.duel.length);
console.log(`PASS duel music nov26: ${names.length} opponents, ${tracks.size} different tracks, all files present`);
