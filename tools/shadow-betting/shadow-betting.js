// Standalone Shadow Betting page (built by tools/build_shadow_betting.py): straight into the minigame, with no main
// menu and no campaign runtime. Its own origin, so its save is separate from the main game's.
import {DuelBets} from './idle-bets.js';
import {balancedVolume} from './audio-balance.js';

// A tab left open keeps running the old version after an update (Discord 2026-11-26: players needed Ctrl+Shift+R).
// The build writes build.json and puts the same id here; every 5 minutes the page compares them and, when a new
// version is out, offers a reload. The phone app ships its own files, so its id never changes.
const BUILD='__SB_BUILD__';
function checkUpdate(){fetch('build.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(b=>{if(!b||!b.id||b.id===BUILD||document.querySelector('.sb-update'))return;
 const el=document.createElement('button');el.className='sb-update';el.textContent='A new version is out · tap to reload';el.onclick=()=>location.reload();document.body.append(el)}).catch(()=>{})}
if(!window.ShadowBettingApp)setInterval(checkUpdate,5*60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkUpdate()});

// Settings links (user, 2026-11-27): the game's Discord, the Android app on the web, update checks in the app.
const DISCORD='https://discord.gg/QD36Q3VG7F';// the main game's invite
const RELEASE='https://github.com/Thronior/ygo-rogue-duelist/releases/download/shadow-betting/';
const APP=window.ShadowBettingApp||null;// the phone app's bridge (tools/shadow-betting/android)
const newer=(a,b)=>{const p=v=>String(v||'').replace(/^v/,'').split('.').map(Number);const x=p(a),y=p(b);if(x.length!==3||y.length!==3||[...x,...y].some(n=>!Number.isFinite(n)))return false;for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i];return false};
// The app's version (build.json) against the "shadow-betting" release on GitHub; the API answers cross-origin requests.
async function latestRelease(){const r=await fetch('https://api.github.com/repos/Thronior/ygo-rogue-duelist/releases/tags/shadow-betting',{cache:'no-store'});if(!r.ok)throw Error('Could not check for updates.');const rel=await r.json();const m=/v(\d+\.\d+\.\d+)/.exec(rel.name||'');if(!m||!rel.assets?.some(a=>a.name==='Shadow-Betting.apk'))throw Error('No update is available.');return m[1]}
async function installed(){const r=await fetch('build.json',{cache:'no-store'});return r.ok?(await r.json()).version:null}
function updateBar(version){if(document.querySelector('.sb-update'))return;const el=document.createElement('button');el.className='sb-update';el.textContent=`Shadow Betting ${version} is out · tap to update`;el.onclick=()=>{el.remove();APP.openUpdate()};(document.querySelector('dialog[open]')||document.body).append(el)}
// A short note at the bottom (WebView shows no alert() dialogs).
function note(text){const el=document.createElement('div');el.className='sb-update sb-note';el.textContent=text;(document.querySelector('dialog[open]')||document.body).append(el);setTimeout(()=>el.remove(),3500)}
async function checkAppUpdate(manual=false){try{const [latest,mine]=await Promise.all([latestRelease(),installed()]);if(mine&&newer(latest,mine))updateBar(latest);else if(manual)note(`You have the latest version${mine?` (${mine})`:''}.`)}catch(error){if(manual)note(error.message)}}
const links=[{label:'Join the Discord',href:DISCORD},APP?{label:'Check for updates',action:()=>checkAppUpdate(true)}:{label:'Download the Android app',href:RELEASE+'Shadow-Betting.apk'}];

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
 // A start screen first (Discord 2026-11-26: opening the link went straight into a 10 s bet timer).
 const root=document.getElementById('app'),saved=!!localStorage.getItem('ygo-duel-bets-v1');
 root.innerHTML=`<div class="sb-start"><img src="assets/menu/83241722.jpg" alt=""><h1>Shadow Betting</h1><p>Bet on CPU duels. Grow your winnings.</p><button>${saved?'Continue':'Start'}</button></div>`;
 await new Promise(resolve=>root.querySelector('.sb-start button').addEventListener('click',resolve,{once:true}));
 started=true;play();root.textContent='';
 new DuelBets({root,content,catalog:{cpuWatchDecks:content.cpuWatchDecks,cpuWatchOpponents:content.cpuWatchOpponents},volume:()=>vol.sound/100,audio,links});
 if(APP)checkAppUpdate();// the phone app looks for a new version at start, as the game's app does
}catch(error){const m=document.querySelector('.sb-loading small');if(m)m.textContent=(error?.message||'Could not start')+'. Reload the page to try again.'}
