// Every opponent duels in front of one backdrop, spread evenly across the eight. Keyed by name, so alternate
// forms of an opponent share theirs. android/test_opponent_backgrounds.mjs keeps this complete and even.
const SCENES={
 duel:['Yami Bakura','Ryou Bakura','Bonz','PaniK','Weevil Underwood',"Weevil's helper",'The Masked Beast','Sussyboy','Boner','Joeyboy','Man i forgor'],
 'duel-summoning':['Yami Yugi','Dark Magician','Dartz','Rafael','Valon','Alister','Arkana','Lumis and Umbra','Paradox Brothers','Darkbishop Archfiend','Yami Alexander'],
 'duel-glyphs':['Ishizu Ishtar','Odion','Marik Ishtar','Shadi','Aknadin','Shimon Muran / Simon','Mahad','Anubis','Obelisk the Tormenter','Kisara','Arthur Hawkins'],
 'duel-embers':['Zorc Necrophades','Yami Marik','Thestalos','Bandit Keith','Joey Wheeler','Rex Raptor','Strings','Breaker','Stepdad','Sid'],
 'duel-stars':['Seto Kaiba','Mokuba Kaiba','Noah Kaiba','Roland','Dueling Engine','Leon von Schroeder','Siegfried von Schroeder','Level 5 Survivor','Seeker','Copycat'],
 'duel-aurora':['Mai Valentine','Harpie Lady Sisters','Cecelia Pegasus','Serenity Wheeler','Tea Gardner','Rebecca Hawkins','Maximillion Pegasus','Amazoness Paladin','Princess Adena','Maya HeHee'],
 'duel-ripples':['Mako Tsunami','Espa Roba','Tristan Taylor','Solomon Muto','Lady Ninja Yae','Cosy','Kemo','Leichter','Nezbitt','Crump'],
 'duel-rays':['Yugi Muto','Duke Devlin','Gansley','Johnson','Big Y','Millerino','Yang','Two Boys 1 Deck','Test 1','Ojama King'],
};
const byName=new Map(Object.entries(SCENES).flatMap(([scene,names])=>names.map(name=>[name,scene])));
export const duelScenes=Object.keys(SCENES);
export const opponentScene=name=>byName.get(name)||'duel';
