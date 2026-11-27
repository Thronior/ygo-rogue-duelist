export const playlists={"title": ["ygo-tf3-03"], "characters": ["ygo-tf3-05"], "draft": ["ygo-tf3-04"], "shop": ["ygo-tf3-11"], "victory": ["ygo-tf3-19"], "defeat": ["ygo-tf3-38"], "duel": ["ygo-tf3-08", "ygo-wc11-06"], "boss": ["ygo-tf3-17"], "champion": ["ygo-tf3-22"], "packs": ["ygo-wc11-30"]};
export const bossThemes={"Yami Yugi": "ygo-tf3-39", "Seto Kaiba": "ygo-wc11-07", "Joey Wheeler": "ygo-tf3-36", "Mai Valentine": "ygo-wc11-13", "Bandit Keith": "ygo-wc11-11", "Lumis and Umbra": "ygo-tf3-33", "Yami Bakura": "ygo-tf3-40", "Maximillion Pegasus": "ygo-tf3-23", "Rex Raptor": "ygo-tf3-15", "Bonz": "ygo-tf3-37", "Weevil Underwood": "ygo-tf3-43", "Yami Marik": "ygo-tf3-18", "Tristan Taylor": "ygo-tf3-31", "Yugi Muto": "ygo-wc11-06", "Ishizu Ishtar": "ygo-wc11-14", "Odion": "ygo-tf3-21", "Espa Roba": "ygo-wc11-15", "Arkana": "ygo-tf3-22", "Mako Tsunami": "ygo-wc11-08", "Duke Devlin": "ygo-wc11-16", "Noah Kaiba": "ygo-tf3-25", "Paradox Brothers": "ygo-wc11-12", "Tea Gardner": "ygo-wc11-17", "Solomon Muto": "ygo-wc11-09", "Mokuba Kaiba": "ygo-tf3-29", "Rebecca Hawkins": "ygo-tf3-27", "Serenity Wheeler": "ygo-tf3-46", "Marik Ishtar": "ygo-tf3-17", "Anubis": "ygo-wc11-44", "Shadi": "ygo-wc11-45", "PaniK": "ygo-tf3-42", "Dartz": "ygo-tf3-30", "Rafael": "ygo-wc11-10", "Ryou Bakura": "ygo-tf3-45", "Copycat": "ygo-tf3-35", "Dueling Engine": "ygo-tf3-08"};
export const bossTheme=name=>bossThemes[name]||playlists.boss[0];

// Every opponent has its own duel track (user, 2026-11-26: more variety while dueling), not only in boss duels. The 36
// characters use their boss theme; the other opponents reuse the track of the character or place they belong with.
export const opponentThemes={
 "Roland":"ygo-wc11-07","Kisara":"ygo-wc11-07","Siegfried von Schroeder":"ygo-tf3-45","Leon von Schroeder":"ygo-tf3-29",
 "Gozaburo Kaiba":"ygo-tf3-25","Leichter":"ygo-tf3-25","Crump":"ygo-tf3-25","Nezbitt":"ygo-tf3-25","Johnson":"ygo-tf3-25","Gansley":"ygo-tf3-25",
 "Arthur Hawkins":"ygo-tf3-27","Kemo":"ygo-tf3-23","Seeker":"ygo-wc11-11","Cecelia Pegasus":"ygo-tf3-46","Weevil's helper":"ygo-tf3-43",
 "Sid":"ygo-tf3-37","Strings":"ygo-tf3-17","Harpie Lady Sisters":"ygo-wc11-13","Amazoness Paladin":"ygo-wc11-13","The Masked Beast":"ygo-tf3-33",
 "Valon":"ygo-wc11-10","Alister":"ygo-tf3-30","Dark Magician":"ygo-tf3-39","Mahad":"ygo-tf3-39","Aknadin":"ygo-wc11-44","Yami Alexander":"ygo-wc11-44",
 "Shimon Muran / Simon":"ygo-wc11-45","Bobasa":"ygo-wc11-45","Zorc Necrophades":"ygo-tf3-40","Darkbishop Archfiend":"ygo-tf3-40",
 "Yami Bakura First LP switch Dama":"ygo-tf3-40","Obelisk the Tormentor":"ygo-tf3-22","Thestalos":"ygo-tf3-15","Burnage":"ygo-tf3-15",
 "Lady Ninja Yae":"ygo-tf3-43","Ojama King":"ygo-tf3-35","Guardian Angel Joan":"ygo-wc11-14","Princess Adena":"ygo-wc11-14",
 "Joeyboy":"ygo-tf3-36","Johnny Steps":"ygo-tf3-42","exodia":"ygo-tf3-18","MarlonX Exodia":"ygo-tf3-18","MarlonX Exo":"ygo-tf3-18"
};
// Anyone else (decks players sent in) gets a steady pick from the duel tracks, the same every time.
const DUEL_POOL=["ygo-tf3-08","ygo-wc11-06","ygo-tf3-31","ygo-tf3-42","ygo-tf3-29","ygo-wc11-16","ygo-wc11-08","ygo-wc11-09","ygo-tf3-21","ygo-wc11-15"];
export function duelTheme(name){
 if(!name)return 'duel';
 const own=bossThemes[name]||opponentThemes[name];if(own)return own;
 let h=0;for(const ch of String(name))h=(h*31+ch.codePointAt(0))>>>0;
 return DUEL_POOL[h%DUEL_POOL.length];
}

playlists["summon-cute"]=["ygo-tf3-35"];
playlists["summon-epic"]=["ygo-tf3-22"];
