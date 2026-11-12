// Card sleeves (2026-11-12). Two kinds share one setting (state.settings.sleeve):
// - a duelist sleeve, a character index: winning a run on Challenge Level 6 with that character unlocks it;
// - a card-art sleeve, its id in data/card-sleeves.json (content.cardSleeves): sleeve_progress.py adds it to
//   profile.sleeves_earned when its own condition is met.
// A sleeve shows only on the player's own face-down cards and Deck piles; in Tag a teammate's cards show the
// teammate's sleeve. Opponents, the CPU and replays keep the normal back.
// Art: tools/generate_character_sleeves.cjs (assets/sleeves/<slug>.jpg) and tools/generate_card_sleeves.cjs
// (assets/sleeves/cards/<id>.jpg).
export const CARD_BACK='assets/card-back.jpg';
export const SLEEVE_UNLOCK_LEVEL=6;
// Same rule as the duelist generator.
const slug=name=>String(name||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const isCardSleeve=key=>typeof key==='string'&&/^[a-z0-9-]{1,64}$/.test(key);
const cardSleeve=(content,key)=>isCardSleeve(key)?content?.cardSleeves?.find(s=>s.id===key)||null:null;
// A saved value: a character index (number or digits) or a card sleeve id; anything else is the normal back.
function sleeveKey(value){if(value==null||value===''||value===-1||value==='-1')return null;if(typeof value==='number'||/^\d+$/.test(String(value)))return Number(value)>=0?Number(value):null;return isCardSleeve(value)?value:null}
export function sleeveUnlocked(profile,key){key=sleeveKey(key);if(key==null)return false;if(typeof key==='string')return (profile?.sleeves_earned||[]).includes(key);return Number(profile?.character_levels?.[key]??-1)>=SLEEVE_UNLOCK_LEVEL}
export function sleeveImage(content,key){key=sleeveKey(key);if(typeof key==='string')return cardSleeve(content,key)?`assets/sleeves/cards/${key}.jpg`:CARD_BACK;const c=content?.characters?.[key];return c&&content.playable?.includes(key)?`assets/sleeves/${slug(c.name)}.jpg`:CARD_BACK}
export function sleeveName(content,key){key=sleeveKey(key);return typeof key==='string'?cardSleeve(content,key)?.art||'':content?.characters?.[key]?.name||''}
// How to unlock it, as shown when a locked sleeve is pressed.
export function sleeveCondition(content,key){key=sleeveKey(key);return typeof key==='string'?cardSleeve(content,key)?.text||'':`Win a run on Challenge Level 6 with ${sleeveName(content,key)} to unlock this sleeve.`}
// Every sleeve in picker order: duelists, then the card sleeves in their file order.
export function allSleeves(content){return [...(content?.playable||[]),...(content?.cardSleeves||[]).map(s=>s.id)]}
export function sleeveTier(content,key){return cardSleeve(content,sleeveKey(key))?.tier||''}
// The chosen sleeve if it exists and is (still) unlocked on this profile, else null: the normal card back.
export function chosenSleeve(settings,profile,content=null){const key=sleeveKey(settings?.sleeve);if(key==null||!sleeveUnlocked(profile,key))return null;if(typeof key==='string'&&content&&!cardSleeve(content,key))return null;return key}
export function chosenSleeveImage(content,settings,profile){const key=chosenSleeve(settings,profile,content);return key==null?CARD_BACK:sleeveImage(content,key)}
// A partner's sleeve as sent in their Tag hello, checked against the profile they sent with it.
export function partnerSleeve(content,message){const key=sleeveKey(message?.sleeve);if(key==null||!sleeveUnlocked(message?.profile,key))return null;if(typeof key==='string'?!cardSleeve(content,key):!content?.playable?.includes(key))return null;return key}
