// Type/Attribute pickers: only Types and Attributes some card in the game has, the engine's mask on top,
// Attribute Orb icons for Attributes and the existing Type icons for Types.
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const web=fileURLToPath(new URL('./web/',import.meta.url)),root=fileURLToPath(new URL('../',import.meta.url));
const {iconChoices,iconChoiceGrid,cardlistBits,attributeOrbSrc,typeIconSrc,ATTRIBUTE_NAMES}=await import('./web/type-attribute-icons.js');
const {monsterTypes}=await import('./web/feedback-ui.js');
const cards=JSON.parse(readFileSync(web+'content.json','utf8')).cards;
const names=list=>list.map(x=>x.name);
const mask=(...bits)=>bits.reduce((m,b)=>m|1n<<BigInt(b),0n).toString();
const bitOf=name=>monsterTypes.indexOf(name);

// The bit list matches the card data: every monster's Type bit names its Type.
for(const c of cards)if(c.data.type&1){
 const race=Math.log2(Number(c.data.race));
 assert.equal(monsterTypes[race].replace(/[^a-z]/gi,''),c.race.replace(/[^a-z]/gi,''),c.name);
 assert.equal(ATTRIBUTE_NAMES[Math.log2(c.data.attribute)],c.attribute,c.name);
}

// Run picker (DNA Rewrite): exactly the Types monsters in the card list have.
const inGame=new Set(cards.filter(c=>c.data.type&1).map(c=>c.race.replace(/[^a-z]/gi,'')));
const types=iconChoices('race',cards);
assert.deepEqual(names(types).map(n=>n.replace(/[^a-z]/gi,'')),monsterTypes.map(n=>n.replace(/[^a-z]/gi,'')).filter(n=>inGame.has(n)),'Types in the game, in bit order');
for(const hidden of ['Psychic','Creator God','Wyrm','Cyberse','Illusion'])assert.ok(!names(types).includes(hidden),hidden+' has no card, so it is hidden');
assert.ok(names(types).includes('Divine-Beast'),'the Egyptian Gods keep Divine-Beast');
assert.deepEqual(names(iconChoices('attribute',cards)),['EARTH','WATER','FIRE','WIND','LIGHT','DARK','DIVINE'],'every Attribute has a card, DIVINE through the Gods');
assert.equal(cardlistBits(cards),cardlistBits(cards),'worked out once per card list');

// Engine prompts keep to the engine's mask.
const all=mask(...monsterTypes.map((_,i)=>i));
assert.ok(!names(iconChoices('race',cards,mask(...monsterTypes.map((_,i)=>i).filter(i=>i!==bitOf('Dragon'))))).includes('Dragon'),'a Type the engine forbids is not offered');
assert.deepEqual(names(iconChoices('race',cards,all)),names(types),'an open mask still hides unused Types');
assert.deepEqual(names(iconChoices('race',cards,mask(bitOf('Warrior'),bitOf('Psychic')))),['Warrior'],'unused Types drop even when allowed');
assert.deepEqual(names(iconChoices('race',cards,mask(bitOf('Psychic'),bitOf('Wyrm')))),['Psychic','Wyrm'],'never left with nothing to declare');
assert.deepEqual(names(iconChoices('race',cards,mask(bitOf('Warrior'),bitOf('Psychic')),2)),['Warrior','Psychic'],'never fewer than the prompt needs');
assert.deepEqual(names(iconChoices('attribute',cards,(1|32).toString())),['EARTH','DARK'],'Attribute mask');
assert.deepEqual(names(iconChoices('attribute',cards,127)),names(iconChoices('attribute',cards)),'numeric masks work too');

// A card list without the Gods hides DIVINE and Divine-Beast.
const noGods=cards.filter(c=>c.attribute!=='DIVINE');
assert.ok(!names(iconChoices('attribute',noGods)).includes('DIVINE'));
assert.ok(!names(iconChoices('race',noGods)).includes('Divine-Beast'));

// Icons: the Attribute Orbs (DIVINE's gold one is drawn to match) and the Type icons the card panel uses.
const orbs={WIND:'Gale',WATER:'Tide',EARTH:'Earth',FIRE:'Ember',DARK:'Dark',LIGHT:'Light'};
for(const x of iconChoices('attribute',cards)){
 assert.equal(x.icon,attributeOrbSrc(x.name));
 assert.equal(x.icon,`assets/icons/attribute-orbs/${x.name.toLowerCase()}.png`);
 assert.ok(existsSync(root+x.icon),x.icon+' exists');
 if(orbs[x.name])assert.ok(existsSync(`${root}assets/relics/${orbs[x.name]} Orb.png`),'drawn from the '+orbs[x.name]+' Orb');
}
assert.match(readFileSync(root+'tools/make_attribute_orb_icons.py','utf8'),/'wind': 'Gale', 'water': 'Tide', 'earth': 'Earth', 'fire': 'Ember', 'dark': 'Dark', 'light': 'Light'/,'each icon comes from its own Orb');
for(const name of monsterTypes){const icon=typeIconSrc(name);assert.ok(icon,name+' has an icon');assert.ok(existsSync(root+icon),icon+' exists')}

// Markup: one button per choice, icon over its name, the caller's data attributes.
const grid=iconChoiceGrid(iconChoices('attribute',cards),'attribute',x=>`data-do="announce-pick" data-announce="${x.bit}" aria-pressed="false"`);
assert.equal(grid.match(/<button /g).length,7);
assert.match(grid,/class="type-choice-grid attribute-choice"/);
assert.match(grid,/<button type="button" class="icon-choice" title="FIRE" data-do="announce-pick" data-announce="2" aria-pressed="false"><img class="attribute-orb" src="assets\/icons\/attribute-orbs\/fire.png" alt="" decoding="async"><span>FIRE<\/span><\/button>/);
const raceGrid=iconChoiceGrid(types,'race',x=>`data-do="choose-monster-type" data-type="${x.name}"`);
assert.equal(raceGrid.match(/<button /g).length,types.length);
assert.match(raceGrid,/<img class="genre-icon" src="assets\/icons\/yugipedia\/types-wingedbeast.png" alt="" decoding="async"><span>Winged Beast<\/span>/);
console.log(`PASS Type/Attribute pickers: ${types.length} Types and ${iconChoices('attribute',cards).length} Attributes with icons`);
