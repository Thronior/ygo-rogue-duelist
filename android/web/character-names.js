// Original Japanese names for duelists (Settings → Display, user 2026-11-23): shown instead of the localized (dub) names
// for player and opponent characters, never for cards. i18n.js applies them where text meets the screen, so game logic
// keeps the English names. Japanese is already original (data/i18n/ui/ja.json) and Chinese nearly so; Latin-alphabet
// languages get the romanized name (given name first), Korean its Hangul reading. Characters that share their name with
// a card (Dark Magician, Harpie Lady Sisters...) are left out so a card name never changes.
const ROMAJI={
 'Joey Wheeler':'Katsuya Jonouchi','Mai Valentine':'Mai Kujaku','Maximillion Pegasus':'Pegasus J. Crawford',
 'Rex Raptor':'Dinosaur Ryuzaki','Bonz':'Ghost Kotsuzuka','Weevil Underwood':'Insector Haga','Yami Marik':'Yami Malik',
 'Tristan Taylor':'Hiroto Honda','Yugi Muto':'Yugi Mutou','Ishizu Ishtar':'Isis Ishtar','Odion':'Rishid',
 'Espa Roba':'Esper Roba','Arkana':'Pandora','Mako Tsunami':'Ryota Kajiki','Duke Devlin':'Ryuji Otogi','Noah Kaiba':'Noa Kaiba',
 'Tea Gardner':'Anzu Mazaki','Solomon Muto':'Sugoroku Mutou','Rebecca Hawkins':'Rebecca Hopkins','Serenity Wheeler':'Shizuka Kawai',
 'Marik Ishtar':'Malik Ishtar','Ryou Bakura':'Ryo Bakura','Roland':'Isono','Arthur Hawkins':'Arthur Hopkins',
 'Leon von Schroeder':'Leonhart von Schroeder','Kemo':'Saruwatari','Leichter':'Kogoro Daimon','Sid':'Kiyoshi Takaido',
 'Crump':'Shuzo Otaki','Nezbitt':'Soichiro Ota','Alister':'Amelda','Gansley':'Konosuke Oshita','Johnson':'Chikuzen Ooka',
 'Shimon Muran / Simon':'Shimon Muran','Cecelia Pegasus':'Cyndia','Johnny Steps':'Johnny Step',
};
// Names that are words rather than names, per Latin-alphabet language.
const WORDS={
 'Paradox Brothers':{en:'Meikyu Brothers',de:'Meikyu-Brüder',es:'Hermanos Meikyu',fr:'Frères Meikyu',it:'Fratelli Meikyu',pt:'Irmãos Meikyu'},
 'Lumis and Umbra':{en:'Masks of Light and Darkness',de:'Masken von Licht und Dunkelheit',es:'Máscaras de Luz y Oscuridad',fr:'Masques de Lumière et de Ténèbres',it:'Maschere di Luce e Oscurità',pt:'Máscaras da Luz e da Escuridão'},
 "Weevil's helper":{en:"Haga's Henchman",de:'Hagas Handlanger',es:'Secuaz de Haga',fr:'Sbire de Haga',it:'Scagnozzo di Haga',pt:'Capanga de Haga'},
 'PaniK':{en:'Player Killer of Darkness',de:'Spielerkiller der Dunkelheit',es:'Asesino de Jugadores de la Oscuridad',fr:'Tueur de joueurs des Ténèbres',it:'Assassino di giocatori dell’Oscurità',pt:'Assassino de Jogadores das Trevas'},
 'Princess Adena':{en:'Princess Mary',de:'Prinzessin Mary',es:'Princesa Mary',fr:'Princesse Mary',it:'Principessa Mary',pt:'Princesa Mary'},
 'Strings':{en:'Pantomimer',de:'Pantomime',es:'Pantomimo',fr:'Pantomime',it:'Mimo',pt:'Mímico'},
 'Seeker':{en:'Rare Hunter',de:'Rare Hunter',es:'Rare Hunter',fr:'Rare Hunter',it:'Rare Hunter',pt:'Rare Hunter'},
};
const KOREAN={
 'Yami Yugi':'어둠의 유우기','Yugi Muto':'무토 유우기','Joey Wheeler':'죠노우치 카츠야','Mai Valentine':'쿠쟈쿠 마이',
 'Bandit Keith':'밴디트 키스','Yami Bakura':'어둠의 바쿠라','Ryou Bakura':'바쿠라 료','Rex Raptor':'다이너소어 류자키',
 'Bonz':'고스트 코츠즈카','Weevil Underwood':'인섹터 하가','Tristan Taylor':'혼다 히로토','Mako Tsunami':'카지키 료타',
 'Duke Devlin':'오토기 류지','Noah Kaiba':'카이바 노아','Tea Gardner':'마자키 안즈','Solomon Muto':'무토 스고로쿠',
 'Mokuba Kaiba':'카이바 모쿠바','Serenity Wheeler':'카와이 시즈카','Roland':'이소노','Kemo':'사루와타리','Leichter':'다이몬 코고로',
 "Weevil's helper":'하가의 부하','Sid':'타카이도 키요시','Crump':'오타키 슈조','Nezbitt':'오타 소이치로','Gansley':'오시타 코노스케',
 'Johnson':'오오카 치쿠젠',
};
const CHINESE={'Mokuba Kaiba':'海马木马'};
const LATIN=new Set(['en','de','es','fr','it','pt']);
// English character name → the original Japanese name in this language (empty when the language already shows it).
export function japaneseNames(lang){
 if(lang==='ko')return new Map(Object.entries(KOREAN));
 if(lang==='zh')return new Map(Object.entries(CHINESE));
 if(!LATIN.has(lang))return new Map();
 return new Map([...Object.entries(ROMAJI),...Object.entries(WORDS).map(([en,by])=>[en,by[lang]||by.en])]);
}
