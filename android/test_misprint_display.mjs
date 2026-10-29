// Faulty Printer misprints: the purchase notice lists Type and Attribute changes, and the deck editor
// shows the card's current attribute(s) top-left and Type top-right on the misprint banner.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {misprintNoticeLine,misprintBadges,deckCardMarkup,attributeIconSrc,typeIconSrc} from './web/feedback-ui.js';

const root=new URL('../',import.meta.url);
const base={pool:3,id:1,name:'Battle Ox',atk:1700,defense:1000,datk:300,ddef:-200,race:'Beast-Warrior',attribute:'EARTH'};

// Notice: changed Type and Attribute are listed with their icons; unchanged ones are left out.
const changed=misprintNoticeLine({...base,new_race:'Winged Beast',new_attribute:'DARK'});
assert.match(changed,/ATK 1700&#8594;2000, DEF 1000&#8594;800/);
assert.match(changed,/Type Beast-Warrior&#8594;<img[^>]*types-wingedbeast\.png[^>]*>Winged Beast/);
assert.match(changed,/Attribute EARTH&#8594;<img[^>]*attribute-dark\.png[^>]*>DARK/);
const same=misprintNoticeLine({...base,new_race:'Beast-Warrior',new_attribute:'EARTH'});
assert.ok(!same.includes('Type')&&!same.includes('Attribute'),'unchanged Type and Attribute are not listed');
const old=misprintNoticeLine(base);
assert.ok(!old.includes('Type')&&!old.includes('Attribute'),'misprints saved before this change still show ATK/DEF');
assert.match(misprintNoticeLine({...base,name:'<b>Ox</b>'}),/&lt;b&gt;Ox&lt;\/b&gt;/,'card names are escaped');

// Every icon the badges or notice can use exists.
const types=['Warrior','Spellcaster','Fairy','Fiend','Zombie','Machine','Aqua','Pyro','Rock','Winged Beast','Plant','Insect','Thunder','Dragon','Beast','Beast-Warrior','Dinosaur','Fish','Sea Serpent','Reptile','Psychic','Divine-Beast','Creator God','Wyrm','Cyberse','Illusion'];
for(const race of types)assert.ok(fs.existsSync(new URL(typeIconSrc(race),root)),`${race} icon (${typeIconSrc(race)})`);
for(const attribute of ['EARTH','WATER','FIRE','WIND','LIGHT','DARK','DIVINE'])assert.ok(fs.existsSync(new URL(attributeIconSrc(attribute),root)),`${attribute} icon`);

// Deck editor badges: only on misprinted monsters, using the card's current attribute(s) and Type.
const ox={id:1,name:'Battle Ox',race:'Beast-Warrior',attribute:'EARTH',atk:1700,defense:1000,level:4,data:{type:17}};
const run={pool:[1,1],card_mods:{1:[300,-200,512,32]},artifacts:[]};
assert.equal(misprintBadges(ox,run,0),'','no badges on a normal copy');
const badges=misprintBadges(ox,run,1);
assert.match(badges,/misprint-attribute[^]*attribute-dark\.png/,'misprinted attribute top-left');
assert.match(badges,/misprint-type[^]*types-wingedbeast\.png/,'misprinted Type top-right');
assert.equal(misprintBadges({...ox,data:{type:2}},run,1),'','spells get no badges');
// Surgery relics replace and add attributes, DNA Rewrite replaces the Type: the badges follow.
const surgery=misprintBadges(ox,{...run,artifacts:['attribute_light','attribute_fire','dna_rewrite'],monster_type:'Dragon'},1);
assert.equal((surgery.match(/<img/g)||[]).length,3,'two attribute icons and one Type icon');
assert.ok(surgery.includes('attribute-light.png')&&surgery.includes('attribute-fire.png')&&surgery.includes('types-dragon.png'));
// Badges are part of the deck editor card markup.
const html=deckCardMarkup('<button class="cardbtn"><b class="misprint">MISPRINT</b><img></button>',ox,{...run,new_cards_from:2},1,{});
assert.ok(html.includes('misprint-attribute')&&html.includes('misprint-type')&&html.endsWith('</button>'));

console.log('PASS misprint notice shows Type/Attribute changes; deck editor badges show current attribute and Type');
