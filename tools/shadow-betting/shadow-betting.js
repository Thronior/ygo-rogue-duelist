// Standalone Shadow Betting page (built by tools/build_shadow_betting.py): straight into the minigame, with no main
// menu and no campaign runtime. Its own origin, so its save is separate from the main game's.
import {DuelBets} from './idle-bets.js';
import {balancedVolume} from './audio-balance.js';

const KEY='shadow-betting-audio';
const vol={music:40,sound:70};
try{Object.assign(vol,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{}

// Music: a random soundtrack track, then another random one (never the same twice in a row) when it ends.
// Browsers only allow sound after the first tap or key press.
const music=new Audio();let tracks=[],last=null,started=false;
function next(){if(!tracks.length)return;const pool=tracks.length>1?tracks.filter(t=>t!==last):tracks;last=pool[Math.floor(Math.random()*pool.length)];
 music.src='assets/music/'+last+'.m4a';play()}
function play(){balancedVolume(music,vol.music/100);if(!started||!vol.music||document.hidden){music.pause();return}if(!music.src)return next();music.play().catch(()=>{})}
music.addEventListener('ended',next);
for(const type of ['pointerdown','keydown'])addEventListener(type,()=>{if(!started){started=true;play()}},{capture:true});
document.addEventListener('visibilitychange',play);
const audio={get:k=>vol[k],set(k,v){vol[k]=v;try{localStorage.setItem(KEY,JSON.stringify(vol))}catch{}if(k==='music')play()}};

try{
 const content=await fetch('content.json').then(r=>{if(!r.ok)throw Error('Could not load the game data');return r.json()});
 tracks=(content.soundtrack||[]).map(t=>t.id).filter(Boolean);
 const root=document.getElementById('app');root.textContent='';
 new DuelBets({root,content,catalog:{cpuWatchDecks:content.cpuWatchDecks,cpuWatchOpponents:content.cpuWatchOpponents},volume:()=>vol.sound/100,audio});
}catch(error){document.querySelector('.sb-loading small').textContent=(error?.message||'Could not start')+'. Reload the page to try again.'}
