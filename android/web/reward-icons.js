// The icon beside a shop boost: its Type or Attribute, or the effect it is about.
import {TYPES} from './card-genres.js';
const pixel=name=>`assets/icons/pixel/${name}.png`,genre=name=>`assets/icons/yugipedia/genres-${name}.png`,type=name=>`assets/icons/yugipedia/${TYPES[name]}`;
const ICONS={
 amazoness:type('Warrior'),archfiend:type('Fiend'),darkmagician:type('Spellcaster'),darkscorpion:type('Warrior'),exodia:type('Spellcaster'),gravekeeper:type('Spellcaster'),guardian:type('Warrior'),harpie:type('WingedBeast'),
 dragon:type('Dragon'),warrior:type('Warrior'),zombie:type('Zombie'),machine:type('Machine'),insect:type('Insect'),aqua:type('Aqua'),goblin:type('Fiend'),magician:type('Spellcaster'),
 banish:genre('remove-card-from-play'),bounce:genre('return-card'),burn:genre('reduce-life-points'),control:genre('get-control'),destruction:genre('destroy-monster'),direct:genre('direct-attack'),discard:genre('hand-destruction'),draw:genre('increase-draw'),flip:genre('flip-effect'),fusion:genre('fusion-material'),gambling:genre('gamble'),graveyard:genre('recover-cards-from-graveyard'),heal:genre('recover-life-points'),negation:genre('cancel-out-effect'),pierce:genre('pierce'),spirit:genre('spirit'),stall:genre('cannot-be-destroyed'),summon:genre('special-summon'),toon:genre('toon'),union:genre('union'),
 lowlevel:genre('lv-monsters'),midlevel:genre('lv-monsters'),highlevel:genre('lv-monsters'),toplevel:genre('lv-monsters'),
 // Category rework (user, 2026-11-26).
 spell:pixel('type-spell'),trap:pixel('type-trap'),staple_trap:pixel('action-vortex'),staple_spell:pixel('symbol-spell'),staple_monster:pixel('action-monster'),
 lv:genre('lv-monsters'),tribute:pixel('action-tribute'),spell_counter:genre('spell-counter'),token:genre('token'),search:genre('search-deck'),
 blueeyes:type('Dragon'),ninja:type('Warrior'),chaos:genre('remove-card-from-play'),ojama:type('Beast'),
 continuous:pixel('type-continuous-spell'),effect:pixel('type-effect'),equip:pixel('type-equip-spell'),field:pixel('type-field-spell'),hole:pixel('action-vortex'),monster_removal:genre('destroy-monster'),spelltrap_removal:genre('destroy-spell-trap'),jar:pixel('action-card-stack'),normal:pixel('type-normal'),normal_spell:pixel('type-normal-spell'),normal_trap:pixel('type-normal-trap'),quick_counter:pixel('type-quick-play-spell'),ritual:pixel('type-ritual')
};
const ATTRIBUTES=new Set(['DARK','DIVINE','EARTH','FIRE','LIGHT','WATER','WIND']);
export function rewardIcon(key){
 if(ATTRIBUTES.has(key))return pixel('attribute-'+key.toLowerCase());
 const race=String(key||'').replace(/[^a-z]/gi,'');
 return ICONS[key]||(TYPES[race]?type(race):'textures/attack.png');
}
