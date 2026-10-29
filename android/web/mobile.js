import {relicEyeIcon} from './relic-eye-icon.js';
import {replayVersion} from './replay-version.js';
import {loadEngineData} from './engine.js';
import {frameLevelName,deckCardMarkup,monsterTypes,modifiedCard,deckStats,attributeOrder,misprintNoticeLine} from './feedback-ui.js';

import {openDeckPreview} from './deck-preview.js';

import {releaseEmbeddedOrientation} from './embedded-orientation.js';

releaseEmbeddedOrientation();

import {sortRelicCollection} from './relic-collection.js';

import {applyCommandUpdate,phaseCheckpoint} from './state-update.js';

import {installMemfsRenameCleanup} from './memfs-cleanup.js';

import {deckMinimum,deckMinimumNotice,copyLimitText} from './deck-minimum.js';

import {chooseStartupPreload,preloadVisualPreference,setPreloadVisualPreference,assetsAreLocal} from './startup-choice.js';

import {installEscapeInspection} from './escape-inspection.js';

import {installHandHover} from './hand-hover.js';

import {setUISoundVolume,playUISound,stopUISounds,playRerollSound} from './ui-sounds.js';

import {installMouseDetails} from './mouse-details.js';

import {preloadStartupAssets,assetURL,originalAssetPath} from './startup-assets.js';

import {deckRewardMarkup,mountDeckRewards} from './engine-rewards.js?v=reward-persistent-1';

import {preloadAllBackgrounds} from './background-assets.js';

import {renderDuelDOM,clearDuelDOM} from './duel-dom.js';

import {installVectorBackgrounds} from './vector-backgrounds.js';

import {play3DToss} from './toss-3d.js';

import {deviceBackup,validateRecovery,restoreRecovery} from './device-backup.js';

import {characterEntrance,cancelCharacterEntrance} from './character-entrance.js';

import {decorateEffectTargets,pulseRelic,negateCard,deckReadyFeedback} from './selection-feedback.js';

import {configureCounterAudio,stopCounterAudio,purchaseCoins,stopPurchaseCoins} from './counter-audio.js';

import {remindReplayUpload} from './replay-upload-reminder.js';

import {polishDuel,polishShop,duelFinish} from './presentation-polish.js';
import * as juice from './juice.js';
import * as keeperTalk from './shopkeeper-talk.js';

import {showShadowVictory,clearShadowVictory} from './shadow-victory.js';
import {mountRunCard,copyRunCard,saveRunCard} from './run-card.js';
import {coinScorecardMarkup} from './coin-scorecard.js';
import {pendingRelicChoice,relicOfferMarkup,cardPick,cardPickMarkup,cardPickResults,namePick,namePickMarkup,namePickResults} from './choice-relics-ui.js';

import {DraftUI} from './draft-ui.js';

import {openEmotePicker,showDuelEmote,clearDuelEmotes,setEmoteVolumeReader,positionDuelEmotes} from './duel-emotes.js';

import {rewardMarkup,mountRewardSlots} from './reward-slots.js?v=reward-persistent-1';

import {duelLogMarkup} from './duel-log-ui.js';

import {equippedTarget} from './equip-target.js';

import {rememberedLevel,hasReliclessClear} from './difficulty-preference.js';

import {encounterCard,bossBanner,bossControls,bossRerollPrice,playEncounterReveal,playPortraitReveal} from './encounter-reveal.js';

import {playLegendarySummon} from './legendary-summon.js';

import {DeviceSync} from './device-sync.js';

import {checkAndroidUpdate,startupAndroidUpdate} from './android-update.js';

import {collectorResponseOverlay,automaticChainResponse,chainWindowAllowed,liveCardFacts,waitForTossStart,mandatoryChainResponse} from './duel-presentation.js';
import {smartContext} from './smart_policy.js';

import {playlists,bossTheme} from './music-config.js';

import {allCardsPackDescription,formatPackChance,sortPackCards} from './pack-inspection.js';

import {balancedVolume,resumeBalancedAudio,preloadSoundEffects} from './audio-balance.js';

import {searches as deckSearches} from './card-search.js';

import {rankFor} from './collector-rules.js';

import {CollectorUI} from './collector-ui.js';

import {COLLECTOR_MENU_CARD} from './collector-roster.js';

import {collectorIntroduction,collectorIntroductionMarkup} from './collector-introduction.js';

import {shopRerollPrice} from './experience-ui.js';

import {mountMenuMotion} from './menu-motion.js?v=online-wrap-duplicate-2';
import {mountMenuFeel} from './menu-feel.js';

import {playEffectFeedback,removalKind,playRemovalFeedback} from './effect-feedback.js';

import {motionPreferences,wallMs,attributeColor,activationColor,cardFlight,landingPulse,summonImpact,flipCard,attackStrike,shake,lifeImpact,showChainLink,revealChainLinks,resolveChainLink,clearChainLinks,negationSlash,shufflePile,phaseGlint,showBanner,fadeOutWithin} from './duel-motion.js';

import {createDuelSounds,duelSoundPath} from './duel-sfx.js';

import {uploadReplays,replayRows,saveRecording,captureBehaviour,uploadBehaviour,sendUnsentFlags} from './replays.js';

import {recordStat,startStats,fetchStats,observeTagStats,personalPlaySeconds,statsEnabled,setStatsEnabled} from './global-stats.js';

import {isShopUltra,announceShopUltra} from './shop-ultra.js';

import {typeIcon,genreIcons,searchButton,matchesSearch,openSearch} from './card-search.js';

import {cardFacts,displayCardText} from './card-inspection.js';

import {installShopGestures} from './shop-gestures.js';

import {victoryRewardsMarkup,lastPlayed,packSummary,cursedMarkup,curseIcons,curseIconFile,curseDescription,matchesFilters,EFFECT_FILTERS,materialStatus} from './experience-ui.js';

import {openPacks} from './pack-opening.js';

import {isCardWin,playCardWin} from './exodia-finale.js';

import {installDesktopStorage} from './desktop-storage.js';

import {CPUViewer} from './cpu-viewer.js';

import {relicImage,relicArtwork,activeTagCharacters} from './ui-art.js';

import {promptContext} from './prompt-context.js';

import {TagUI} from './tag-ui.js';

import {cardImages,preloadCards} from './card-assets.js';

import {loadPyodide} from './pyodide/pyodide.mjs';

import {MobileDuel,M,R,I,B,L,P} from './duel.js';

const app=document.querySelector('#app'),modal=document.querySelector('#modal');

installVectorBackgrounds(app,modal,()=>state?.settings||{});

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

setEmoteVolumeReader(()=>state?.settings?.sound/100||0);

let selectedLevels={},selectedVariants={};

const levelText=['No modifiers','All enemies start with 8000 LP','Amplified Boss Curses','Coin rewards reduced by 25%','Start with 4000 LP; between-duel healing cap 4000 LP','Start with a chosen curse; curses persist and each boss adds one','Opponents receive a thematic combat relic'];

function levelMenu(){const beaten=state.profile.character_levels?.[selected]??-1;const row=(level,text,locked=false)=>`<button data-do="choose-level" data-level="${level}" ${locked?'disabled':''}><span class="level-badge challenge-level-badge" aria-label="Level ${level}"><span>LVL</span><strong>${level}</strong></span><span class="challenge-level-copy"><b>${locked?'Beat lvl '+(level-1)+' to unlock':text}</b>${locked?'<small>??????????</small>':level>0?'<small>Includes all previous modifiers</small>':''}${level>=0&&level<=beaten?'<small>Completed</small>':''}</span></button>`;dialog('Challenge level',`<p>Modifiers accumulate. Clear a full run to unlock the next level for this character.</p><div class="level-list">${state.profile.relicless_unlocked?row(-1,'Disable all relics or curses'):''}${levelText.map((text,i)=>row(i,text,i>beaten+1)).join('')}</div>`)}

let py,content,state,screen='loading',selected=0,menuIndex=0,engine,snapshot,busy=false,aiTimer,preview=0,returnScreen='title',pickSet=new Set(),placeSet=[],lastPhase=null,lastLP=null;

let toastQueue=[],toastBusy=false,music=new Audio(),sfx=new Audio(),menuSfx=new Audio();music.loop=true;

setUISoundVolume(()=>Number(state?.settings?.sound||0)/100);

const cardsById=new Map(),previewRenders=new WeakMap();

const card=id=>cardsById.get(Number(id));

const image=id=>cardImages.get(Number(id))||`assets/cards/${id}.jpg`;

const character=()=>content.characters[state.run.character];

const uiIcons={settings:'settings',draft:'deck',start:'duel','buy-selected':'coins',shop:'shop',achievements:'achievements',tutorial:'tutorial'};

// Card stack in the deck editor's icon style, for icon-only "Edit deck" buttons.
const deckEditIcon='<svg class="navigation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="8" y="2.5" width="12" height="16" rx="1.8"/><path d="M5 6v13.5A2 2 0 0 0 7 21.5h9"/><path d="m11.5 9.5 2.5-2.5 2.5 2.5-2.5 2.5Z"/></svg>';

const navigationIcons={

 settings:'<path d="m9 3 .6-2h4.8l.6 2 1.6.9 2-.5 2.4 4.2-1.4 1.5v1.8l1.4 1.5-2.4 4.2-2-.5-1.6.9-.6 2H9l-.6-2-1.6-.9-2 .5-2.4-4.2 1.4-1.5V9.1L2.4 7.6l2.4-4.2 2 .5Z" transform="translate(0 2)"/><circle cx="12" cy="12" r="3.3"/>',

 shop:'<path d="M3 10v11h18V10M2 6l2-3h16l2 3v4c0 3-5 3-5 0 0 3-5 3-5 0 0 3-5 3-5 0 0 3-5 3-5 0V6ZM2 6h20M7 6v4m5-4v4m5-4v4M6 16h12M6 16v5m12-5v5"/>'

};

const btn=(label,action,extra='',cls='')=>navigationIcons[action]?`<button class="${cls} navigation-icon-button" data-do="${action}" aria-label="${esc(label)}" title="${esc(label)}" ${extra}><svg class="navigation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${navigationIcons[action]}</svg></button>`:`<button class="${cls}" data-do="${action}" ${extra}>${uiIcons[action]?`<img class="ui-icon" src="assets/ui/${uiIcons[action]}.png" alt="">`:""}${label}</button>`;

const duelDecision=(label,action,extra='',cancel=false)=>btn(`<span class="duel-decision-label">${esc(label)}</span><span class="duel-decision-icon" aria-hidden="true">${cancel?'✕':'✓'}</span>`,action,`aria-label="${esc(label)}" title="${esc(label)}" ${extra}`,cancel?'duel-cancel':'duel-confirm');

const duelConfirm=(label,action,extra='')=>duelDecision(label,action,extra);

const duelCancel=(label,action,extra='')=>duelDecision(label,action,extra,true);

const cardButton=(id,extra='',active=false,mis=false)=>`<button class="cardbtn ${active?'selected':''}" data-preview="${id}" ${extra}>${mis?'<b class="misprint">MISPRINT</b>':''}<img draggable="false" loading="lazy" src="${image(id)}" alt="${esc(card(id)?.name||'Card')}"><span>${esc(card(id)?.name||'Card')}</span></button>`;

const baseMenu=[['Online',14731897,'spell','Tag Duels · Draft Duels · Ultimate Collector','online'],['Continue',30834988,'trap','Return to your saved journey.','continue'],['New Game',71625222,'effect','Choose a duelist. Draft a new beginning.','characters'],['Settings',23171610,'spell','Adjust audio, visuals, gameplay, and data-sharing settings.','settings'],['Watch CPU duel',28566710,'trap','Observe and test two opponent AIs.','cpu'],['Collection',75500286,'spell','Every card, booster and relic.','collection'],['Achievements',32012841,'normal','Your feats and lifetime progress.','achievements'],['Tutorial',91595718,'spell','Learn the field, shops and controls.','tutorial']];
const onlineMenu=[['Tag Duels',81332143,'spell','Team up across Android and web.','tag'],['Draft Duels',3549275,'effect','Double boosters. Build your deck. Challenge a friend.','draft-pvp'],COLLECTOR_MENU_CARD,['Main Menu',71625222,'trap','Return to the main menu.','main-menu']];



function toast(text){

 const raw=String(text??''),validation=raw.match(/(?:ValueError|AssertionError): ([^\n]+)/g);

 const message=validation?.at(-1)?.replace(/^(?:ValueError|AssertionError): /,'')||(/Traceback \(most recent call last\)/.test(raw)?'That action could not be completed. Please try again.':raw);

 toastQueue.push(message);showToast();

}

function showToast(){if(toastBusy||!toastQueue.length)return;toastBusy=true;const el=document.querySelector('#toast');el.textContent=toastQueue.shift();el.classList.add('show');setTimeout(()=>{el.classList.remove('show');toastBusy=false;showToast()},4200)}

let lastPersistedData=null;

async function persist(cloudCheckpoint=false){const files={};for(const name of py.FS.readdir('/game/saves'))if(name.endsWith('.json')||name.endsWith('.bak'))files[name]=py.FS.readFile('/game/saves/'+name,{encoding:'utf8'});const data=JSON.stringify(files);if(data===lastPersistedData){if(cloudCheckpoint)deviceBackup.queue(data);return;}if(window.ShadowNative){if(!await ShadowNative.store(data))throw Error('Could not save game to device storage.')}else localStorage.setItem('shadow-run-mobile',data);lastPersistedData=data;if(cloudCheckpoint)deviceBackup.queue(data)}

let commandQueue=Promise.resolve();

function command(action,value){const payload=JSON.stringify({action,value});const job=commandQueue.then(()=>executeCommand(payload));commandQueue=job.catch(()=>{});return job}

async function executeCommand(payload){const statsRequest=JSON.parse(payload),statsDuel=state?.run?.duel?.id;py.globals.set('request_json',payload);const result=JSON.parse(await py.runPythonAsync('mobile_backend.dispatch(request_json)'));if(['reward-progress','pack-inspect','card-sources','cpu-catalog'].includes(statsRequest.action))return result.result;state=applyCommandUpdate(state,result,statsRequest.action);if(result.persist!==false&&statsRequest.action!=='device-sync-read')await persist(statsRequest.action==='finish');if(['new','secret-champion','secret-relicless'].includes(statsRequest.action))recordStat('runs',result.run?.started_at||result.run?.history_id);if(statsRequest.action==='begin')recordStat('duels',result.run?.duel?.id);if(statsRequest.action==='finish'){draftTab='All';draftSort='Newest';delete deckSearches.draft;}if(statsRequest.action==='finish'&&statsDuel){recordStat('duels',statsDuel);recordStat(statsRequest.value.winner===0?'wins':'losses',statsDuel);}return result.result}

async function notices(){const list=state.profile.achievement_notices||[];if(list.length){await command('notices');list.forEach(n=>toast('Achievement complete: '+n.name+' — '+n.reward))}}

let sfxStopTimer;

function setDuelSound(url){clearTimeout(sfxStopTimer);sfx.pause();sfx.src=assetURL(url);sfx.load();}

function menuSelectionSound(){if(!state.settings.sound||document.hidden)return;menuSfx.pause();menuSfx.src=assetURL('assets/sfx/menu-coin-ring.wav');balancedVolume(menuSfx,state.settings.sound/100);menuSfx.play().catch(()=>{});}

function effect(major=false,purchase=false){if(!state.settings.sound||document.hidden)return;setDuelSound('sound/'+(major?'activate.wav':purchase?'coinflip.wav':'flip.wav'));balancedVolume(sfx,state.settings.sound/100,major?1:purchase?.85:.65);sfx.play().catch(()=>{})}

// Single-element fallback where Web Audio is unavailable; each sound replaces the last.
function singleDuelSound(name,gain=.3,duration=0){if(!state.settings.sound||document.hidden)return;setDuelSound(duelSoundPath(name));balancedVolume(sfx,state.settings.sound/100,Math.max(.5,Math.min(1,gain/.3)));sfx.play().catch(()=>{});if(duration){sfxStopTimer=setTimeout(()=>sfx.pause(),duration)}}

// Duel sounds overlap and are trimmed to their animations (duel-sfx.js).
const duelSfx=createDuelSounds(()=>audioSuspended?0:(state?.settings?.sound||0)/100,singleDuelSound);

function duelSound(name,gain=.3,duration=0){duelSfx.play(name,gain,duration?{duration:duration/1000}:{})}

const summonMusic=new WeakMap();

function summonTrack(name){if(engine){summonMusic.set(engine,name);track(name)}}

const slotTick=new Audio('sound/draw.wav');

function slotTickSound(){if(!state.settings.sound||document.hidden)return;slotTick.pause();slotTick.currentTime=0;balancedVolume(slotTick,state.settings.sound/100,.5);slotTick.play().catch(()=>{})}

document.addEventListener('visibilitychange',()=>{if(document.hidden)slotTick.pause()});

// Finisher voice lines, the reroll reel loop and the tally coins (juice.js), at the game's balanced loudness.
const juiceVoices=Array.from({length:3},()=>new Audio());let juiceVoiceIndex=0;
juice.setJuiceSound((path,{loop=false,gain=1}={})=>{if(!state?.settings?.sound||document.hidden)return null;const voice=juiceVoices[juiceVoiceIndex++%juiceVoices.length];voice.pause();voice.loop=loop;voice.src=assetURL(path);voice.load();balancedVolume(voice,state.settings.sound/100,gain);voice.play().catch(()=>{});return voice});
document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const voice of juiceVoices)voice.pause()});

let musicContext='',previousTrack={};

function screenMusic(){if(screen==='duel'||screen==='cpu'){if(screen==='cpu')return 'duel';if(engine&&summonMusic.has(engine))return summonMusic.get(engine);if(state.run?.encore_active&&!snapshot?.tag||snapshot?.tag?.pvp)return 'champion';const run=snapshot?.tag?tagUI?.view?.run:state.run;if(((run?.round||0)+1)%3===0){const opponent=snapshot?.tag?activeTagCharacters(content,tagUI.view,snapshot.tag)[1]:content.characters[run?.opponent];return bossTheme(opponent?.name)}return 'duel'}if(screen==='ending')return state.run?.stage==='complete'?'victory':'defeat';if(screen==='characters')return 'characters';if(screen==='routes')return (state.run.round+1)%3===0?'boss':'draft';if(screen==='draft')return 'draft';if(screen==='shop')return state.run?.cursed_offer?'boss':'shop';if(screen==='settings')return musicContext||'title';if(screen==='tag'&&tagUI?.view?.phase==='draft'&&tagUI.tab!=='deck'&&(tagUI.view.run.round+1)%3===0)return 'boss';if(screen==='tag')return tagUI?.view?.phase==='shop'?'shop':tagUI?.view?.phase==='complete'?'victory':tagUI?.view?.phase==='gameover'?'defeat':tagUI?.view?.phase==='draft'?'draft':'characters';return 'title'}

let rewardMusic=false;

function track(name,advance=false){if(rewardMusic)name='packs';if(name!==musicContext||advance){musicContext=name;const all=playlists[name]||[name],alternatives=all.filter(x=>x!==previousTrack[name]),choices=alternatives.length?alternatives:all;const pick=choices[Math.floor(Math.random()*choices.length)];previousTrack[name]=pick;music.src=assetURL('assets/music/'+pick+'.m4a');music.load()}balancedVolume(music,state.settings.music/100);if(state.settings.music&&!audioSuspended)music.play().catch(()=>{});else music.pause()}

music.loop=false;music.addEventListener('ended',()=>track(musicContext,true));

// Recover interrupted playback without allocating new players or resetting an active song.

let musicRecoveryAt=0;

function recoverMusic(){

 if(!state||!state.settings.music||audioSuspended||document.hidden||!musicContext)return;

 resumeBalancedAudio();

 if(music.error){if(Date.now()-musicRecoveryAt<10000)return;musicRecoveryAt=Date.now();music.load();}

 if(music.paused)music.play().catch(()=>{});

}

window.addEventListener('pageshow',recoverMusic);window.addEventListener('focus',recoverMusic);

music.addEventListener('canplay',recoverMusic);setInterval(recoverMusic,10000);

const packVoices=new Set(),packVoicePool=Array.from({length:4},()=>new Audio());

function stopPackSounds(){for(const voice of packVoices){voice.pause();voice.removeAttribute('src');voice.load()}packVoices.clear()}

function packSound(name){

 if(name==='purchase'){purchaseCoins();return}

 if(!state.settings.sound||document.hidden)return;

 const url=['card-reveal','pack-rustle','rare-shimmer','negation'].includes(name)?'assets/sfx/'+name+'.wav':name==='flip'?'sound/flip.wav':'assets/sfx/'+name+'.mp3';

 const voice=packVoicePool.find(v=>!packVoices.has(v))||packVoicePool.find(v=>!originalAssetPath(v.src).includes('pack-rare'))||packVoicePool[0];

 voice.pause();voice.src=assetURL(url);voice.load();balancedVolume(voice,state.settings.sound/100,name==='rare-shimmer'?.7:.9);

 voice.playbackRate=name==='flip'?.95+Math.random()*.16:1;packVoices.add(voice);

 voice.onended=()=>packVoices.delete(voice);voice.onerror=()=>packVoices.delete(voice);

 voice.play().catch(()=>{if(voice.paused)packVoices.delete(voice)});

}

let audioSuspended=false,packPresentation=false;

configureCounterAudio(()=>audioSuspended?0:(state?.settings?.sound||0)/100);

window.suspendAudio=()=>{stopUISounds();stopPurchaseCoins();stopCounterAudio();audioSuspended=true;music.pause();sfx.pause();duelSfx.stopAll();menuSfx.pause();stopPackSounds();stopCoinSounds()};window.resumeAudio=()=>{audioSuspended=false;if(state)track(packPresentation?'packs':screenMusic())};

document.addEventListener('visibilitychange',()=>document.hidden?window.suspendAudio():window.resumeAudio());

window.addEventListener('pageshow',()=>window.resumeAudio());

for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>{if(state&&!audioSuspended&&music.paused)track(packPresentation?'packs':screenMusic())},{capture:true});

function shell(title,body,tools='',cls=''){app.innerHTML=`<div class="page ${cls}"><header><h2>${title}</h2><div class="tools">${tools}${screen==='draft'?btn(relicEyeIcon,'relic-ledger','aria-label="Relics" title="Relics"','navigation-icon-button'):''}${screen==='settings'?'':btn('Settings','settings')}${btn('<svg class="navigation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>','title','aria-label="Menu" title="Menu"','navigation-icon-button')}</div></header>${body}</div>`}

let inspectParent=null;

// An inspection modal suspends local duel progression until it is dismissed.

const inspectionWaiters=new Set(),inspectionAnimations=new Set(),inspectionDelays=new Set();

function inspectionPaused(){return screen==='duel'&&((!tagUI&&document.hidden&&state.settings.pauseWhenHidden!==false)||(modal.open&&(modal.dataset.duelOptionsPause==='1'||modal.classList.contains('card-inspect-modal')||!!modal.querySelector('.duel-log,.log-cards,.pile-inspection'))))}

document.addEventListener('visibilitychange',syncInspectionPause);

function finishBackgroundAnimations(){if(screen!=='duel'||tagUI||!document.hidden||state.settings.pauseWhenHidden!==false||inspectionPaused())return;for(const animation of document.getAnimations())if(!modal.contains(animation.effect?.target)&&animation.effect?.getTiming?.().iterations!==Infinity){try{animation.finish()}catch{}}}

let backgroundAnimationTimer=null;

function syncBackgroundAnimations(){clearInterval(backgroundAnimationTimer);backgroundAnimationTimer=null;finishBackgroundAnimations();if(screen==='duel'&&!tagUI&&document.hidden&&state.settings.pauseWhenHidden===false)backgroundAnimationTimer=setInterval(finishBackgroundAnimations,250)}

// syncInspectionPause handles visibility and settings together; avoid duplicate timers.

function waitForInspection(){return inspectionPaused()?new Promise(resolve=>inspectionWaiters.add(resolve)):Promise.resolve()}

function duelDelay(milliseconds){return new Promise(resolve=>{

 const delay={remaining:milliseconds,timer:null,started:0,start(){this.started=performance.now();this.timer=setTimeout(()=>{inspectionDelays.delete(this);resolve()},this.remaining)},stop(){if(this.timer!==null){clearTimeout(this.timer);this.timer=null;this.remaining=Math.max(0,this.remaining-(performance.now()-this.started))}}};

 inspectionDelays.add(delay);if(!inspectionPaused())delay.start();

})}

function syncInspectionPause(){

 syncBackgroundAnimations();

 if(inspectionPaused()){

  clearTimeout(aiTimer);

  for(const delay of inspectionDelays)delay.stop();

  for(const animation of document.getAnimations())if(animation.playState==='running'&&animation.effect?.target&&!modal.contains(animation.effect.target)){inspectionAnimations.add(animation);animation.pause()}

  return;

 }

 for(const delay of inspectionDelays)if(delay.timer===null)delay.start();

 for(const animation of inspectionAnimations)if(animation.playState==='paused')animation.play();

 inspectionAnimations.clear();

 for(const resolve of inspectionWaiters)resolve();

 inspectionWaiters.clear();

 if(screen==='duel'&&!busy)scheduleAI();

}

function closeRewardOverlay(){const overlay=modal.querySelector('.reward-overlay');if(!overlay)return;const focus=overlay.returnFocus;overlay.remove();focus?.focus?.({preventScroll:true})}

function showRewardOverlay(title,body){closeRewardOverlay();const overlay=document.createElement('section');overlay.className='reward-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',title);overlay.returnFocus=document.activeElement;overlay.innerHTML=`<header><h2>${esc(title)}</h2><button data-do="reward-overlay-close" aria-label="Close ${esc(title)}" title="Close">×</button></header>${body}`;modal.append(overlay);overlay.querySelector('button')?.focus({preventScroll:true});}

function closeDialog(){if(modal.querySelector('.reward-overlay')){closeRewardOverlay();return;}const preview=modal.querySelector('.deck-preview-overlay');if(preview){preview.closePreview();return;}if(modal.dataset.goldenRequired)return;if(modal.querySelector('.reward-tally')){showRewardSlots();return}if(modal.querySelector('.reward-screen')){action('reward-accept');return}if(inspectParent){playUISound('window-close');const previous=inspectParent;inspectParent=previous.parent||null;modal.replaceChildren(...previous.nodes);modal.classList.toggle('card-inspect-modal',!!modal.querySelector('.inspect'));modal.scrollTop=previous.scroll;previous.focus?.focus?.({preventScroll:true});sizeModalViewport();syncModalChain();syncInspectionPause();return}modal.close()}

modal.addEventListener('cancel',event=>{if(modal.querySelector('.reward-overlay')){event.preventDefault();closeRewardOverlay();return;}if(modal.dataset.goldenRequired||modal.querySelector('.reward-screen,.reward-tally')){event.preventDefault();return;}if(inspectParent){event.preventDefault();closeDialog()}});

modal.addEventListener('close',()=>{if(modal.open)return;delete modal.dataset.duelOptionsPause;playUISound('window-close');inspectParent=null;modal.classList.remove('card-inspect-modal');syncInspectionPause()});

let floatingChainControl=null;

function syncModalChain(){

 const original=document.getElementById('chain-toggle');

 if(screen!=='duel'||!original){floatingChainControl?.remove();floatingChainControl=null;return;}

 const r=original.getBoundingClientRect();

 // Recreating this filtered button on every snapshot makes Android flash its layer.

 // Retain the image and button, including while moving into/out of a modal.

 const copy=floatingChainControl??=original.cloneNode(true);

 copy.removeAttribute('id');

 const className=original.className+' floating-chain-control';

 if(copy.className!==className)copy.className=className;

 for(const name of ['aria-label','aria-pressed','title']){

  const value=original.getAttribute(name);

  if(copy.getAttribute(name)!==value){if(value===null)copy.removeAttribute(name);else copy.setAttribute(name,value)}

 }

 const label=original.querySelector('span')?.textContent,span=copy.querySelector('span');

 if(span&&span.textContent!==label)span.textContent=label;

 const styles={position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',margin:'0px',zIndex:'1000',visibility:'visible'};

 for(const [name,value] of Object.entries(styles))if(copy.style[name]!==value)copy.style[name]=value;

 const parent=modal.open?modal:document.body;

 if(copy.parentNode!==parent)parent.append(copy);

}

new MutationObserver(()=>syncModalChain()).observe(app,{childList:true});

window.addEventListener('resize',syncModalChain);

modal.addEventListener('close',syncModalChain);

new MutationObserver(syncModalChain).observe(modal,{attributes:true,attributeFilter:['open']});

function sizeModalViewport(){const v=window.visualViewport;if(!v||Math.abs(v.scale-1)<.01)document.documentElement.style.setProperty('--app-viewport-height',`${Math.round(v?.height||innerHeight)}px`);modal.style.setProperty('--modal-viewport-height',`${v?.height||innerHeight}px`);modal.style.setProperty('--modal-viewport-width',`${v?.width||innerWidth}px`);modal.style.setProperty('--modal-top',`${v?.offsetTop||0}px`);modal.style.setProperty('--modal-left',`${v?.offsetLeft||0}px`)}

window.visualViewport?.addEventListener('resize',sizeModalViewport);window.visualViewport?.addEventListener('scroll',sizeModalViewport);window.addEventListener('resize',sizeModalViewport);

let viewportFrame=0,viewportSettle=0;function settleViewport(){cancelAnimationFrame(viewportFrame);clearTimeout(viewportSettle);viewportFrame=requestAnimationFrame(()=>{sizeModalViewport();viewportSettle=setTimeout(sizeModalViewport,250)})}

window.screen.orientation?.addEventListener('change',settleViewport);window.addEventListener('orientationchange',settleViewport);window.addEventListener('pageshow',settleViewport);sizeModalViewport();

function dialog(title,body,showClose=true){if(desktopToken&&tagUI)desktopRPC('native-visible',false).catch(console.error);inspectParent=null;removeActions();modal.innerHTML=`<div class="modal-head">${title?`<h2>${esc(title)}</h2>`:''}${!showClose||tagUI?.isCollector&&title==='Surrender this duel?'?'':btn('Close','close')}</div>${body}`;modal.classList.toggle('card-inspect-modal',!!modal.querySelector('.inspect'));sizeModalViewport();if(!modal.open)modal.showModal();syncModalChain();syncInspectionPause()}

function cardBadges(c){const t=c.data.type,key=t&2?'spell':t&4?'trap':t&64?'fusion':t&128?'ritual':t&16?'normal':'effect';const icon=(name)=>`<img class="pixel-badge" alt="" src="assets/icons/pixel/${name}.png">`;return `${typeIcon(c)}${icon('type-'+key)}${esc(c.type)} · ${esc(c.race)} ${c.attribute?'· '+icon('attribute-'+c.attribute.toLowerCase())+esc(c.attribute):''}`}

// Relic Picker, Card Picker and Name Changer: required prompts, like the Golden Card Sleeve.
function showRelicChoice(r){
 if(r.relic_offer?.options?.length)dialog('Relic Picker',relicOfferMarkup(content,r.relic_offer,{relicImage,relicArtwork,btn}),false);
 else if(r.card_picks>0){cardPick.selected=null;dialog('Card Picker',cardPickMarkup(btn),false);refreshCardPick()}
 else{namePick.selected=null;dialog('Name Changer',namePickMarkup(btn),false);refreshNamePick()}
 modal.dataset.goldenRequired='true';modal.classList.add('relic-choice-modal');
}
const pickCardButton=(id,extra,active)=>cardButton(id,extra,active).replace(/data-preview="[^"]*"/,'');
function refreshCardPick(){const box=modal.querySelector('.card-pick-results');if(!box)return;box.innerHTML=cardPickResults(content,{cardButton:pickCardButton});const c=card(cardPick.selected),b=modal.querySelector('[data-do="card-pick-confirm"]');if(b){b.disabled=!c;b.textContent=c?`Add ${c.name}`:'Choose a card'}modal.querySelectorAll('[data-do="card-pick-type"]').forEach(x=>x.classList.toggle('active',x.dataset.type===cardPick.type))}
function refreshNamePick(){const box=modal.querySelector('.name-pick-results');if(!box)return;box.innerHTML=namePickResults(content);const a=(content.archetypes||[]).find(x=>x.setcode===namePick.selected),b=modal.querySelector('[data-do="name-pick-confirm"]');if(b){b.disabled=!a;b.textContent=a?`Choose ${a.name}`:'Choose an archetype'}}
function finishRelicChoice(){delete modal.dataset.goldenRequired;modal.classList.remove('relic-choice-modal');modal.close();render()}
let pickSearchTimer=0;

async function offerGoldenCards(){

 const r=state.run;if(!r||r.challenge_level===-1)return;

 if(r.artifacts.includes('dna_rewrite')&&!r.monster_type){if(modal.open)return;dialog('DNA Rewrite',`<p>Choose a monster Type for this run.</p><div class="type-choice-grid">${monsterTypes.map(t=>btn(`${typeIcon({race:t,data:{type:1}})}<span>${esc(t)}</span>`,'choose-monster-type',`data-type="${t}" aria-label="${t}"`)).join('')}</div>`,false);await new Promise(resolve=>modal.addEventListener('close',resolve,{once:true}));return offerGoldenCards();}

 if(pendingRelicChoice(r)){if(!modal.open)showRelicChoice(r);await new Promise(resolve=>modal.addEventListener('close',resolve,{once:true}));return offerGoldenCards();}

 const chosen=r.golden_cards||[r.golden_card].filter(Boolean),pending=r.artifacts.filter(x=>x==='golden_sleeve').length-chosen.length;

 if(pending<=0)return;

 if(modal.open){await new Promise(resolve=>modal.addEventListener('close',resolve,{once:true}));return offerGoldenCards();}

 dialog('Golden Card Sleeve',`<img class="golden-sleeve-reveal" style="height:140px" src="${relicImage(content.artifactInfo.golden_sleeve.art)}"><p>Choose a permanent golden card. ${pending} choice(s) remaining.</p><div class="cardgrid">${[...new Set(r.selected.map(i=>r.pool[i]))].filter(id=>!chosen.includes(id)).map(id=>cardButton(id,`data-do="golden-card" data-code="${id}"`).replace(/data-preview="[^"]*"/,'')).join('')}</div>`);

 modal.dataset.goldenRequired='true';modal.querySelector('[data-do=close]')?.remove();modal.classList.add('golden-choice-modal');

 const reveal=document.createElement('div');reveal.className='golden-sleeve-stage';reveal.innerHTML=`<img src="${relicImage(content.artifactInfo.golden_sleeve.art)}" alt="Golden Card Sleeve">`;modal.append(reveal);setTimeout(()=>reveal.remove(),1680);

 await new Promise(resolve=>modal.addEventListener('close',resolve,{once:true}));return offerGoldenCards();

}

function inspect(id,poolIndex=null){let c=card(id);if(!c)return;playUISound('inspect-open');if(screen==='duel'&&previewLocation){const [p,loc,seq]=previewLocation;const live=engine?.query(p,loc)?.[seq];if(live?.code===c.id&&(p===0||live.position&5))c=liveCardFacts(c,live,content.cards);}const mod=poolIndex===null?null:state.run?.card_mods?.[poolIndex];const previous=modal.open?{nodes:[...modal.childNodes],scroll:modal.scrollTop,focus:document.activeElement,parent:inspectParent}:null;if(poolIndex!==null)c=modifiedCard(c,state.run,poolIndex);dialog(c.name,`<div class="inspect"><img src="${image(id)}"><div>${cardFacts(c)}<p class="copy-count">${(state.run?.pool||[]).filter(x=>x===Number(id)).length} owned · ${(state.run?.selected||[]).filter(i=>state.run.pool[i]===Number(id)).length} in deck</p>${liveCardDetails(Number(id))}${mod?'<p class="badges">Faulty Printer: this copy has modified stats, Type, or Attribute.</p>':''}<h4>Effect / card text</h4><p class="inspect-effect">${esc(displayCardText(c.desc))}</p>${(screen==='draft'||tagUI?.view?.phase==='draft')&&state.run?.artifacts.filter(x=>x==='golden_sleeve').length>(state.run.golden_cards||[state.run.golden_card].filter(Boolean)).length&&!(state.run.golden_cards||[state.run.golden_card].filter(Boolean)).includes(Number(id))&&state.run.selected.some(i=>state.run.pool[i]===Number(id))?btn('Permanently designate golden card','golden-card',`data-code="${id}"`):''}</div></div>`);inspectParent=previous; if(screen==='collection'&&collectionKind==='cards')setupCollectionSources(id);}

let previewLocation=null;

function setupCollectionSources(id){

 const details=modal.querySelector('.inspect'),sources=document.createElement('section'),tabs=document.createElement('nav');

 sources.className='collection-card-sources';sources.hidden=true;sources.id='collection-sources-panel';details.id='collection-details-panel';

 tabs.className='inspection-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Card inspection');

 tabs.innerHTML='<button role="tab" aria-selected="true" aria-controls="collection-details-panel">Card Details</button><button role="tab" aria-selected="false" aria-controls="collection-sources-panel">Where to Find</button>';

 details.setAttribute('role','tabpanel');sources.setAttribute('role','tabpanel');details.before(tabs);details.after(sources);

 let loading=false;

 const buttons=[...tabs.children];

 const select=index=>{details.hidden=index!==0;sources.hidden=index!==1;buttons.forEach((button,i)=>{button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;});modal.scrollTop=0;

  if(index===1&&!loading){loading=true;void showCollectionSources(id,sources);}

 };

 buttons.forEach((button,i)=>{button.tabIndex=i===0?0:-1;button.addEventListener('click',()=>select(i));button.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?1:1-i;select(next);buttons[next].focus();}});});

}

async function showCollectionSources(id,target){

 target.textContent='Loading card sources…';

 try{const sources=await command('card-sources',Number(id));if(!target.isConnected)return;

 target.innerHTML=`<h4>Booster Packs</h4><div class="source-packs">${sources.packs.map(p=>`<img loading="lazy" src="assets/packs/${esc(p.id)}.jpg" alt="${esc(p.name)}" title="${esc(p.name)}">`).join('')||'<p>None in the current campaign.</p>'}</div><h4>Opponent Decks</h4><div class="source-opponents">${sources.opponents.map(d=>`<figure><img loading="lazy" src="assets/${esc(d.sprite)}" alt="${esc(d.name)}"><figcaption>${esc(d.name)}<small>${esc(d.label)}</small></figcaption></figure>`).join('')||'<p>None in the current campaign.</p>'}</div>`;

 }catch{if(target.isConnected)target.textContent='Card sources could not be loaded.';}

}

function setPreview(id,element=null){if(!id)return;preview=Number(id);previewLocation=element?.dataset.zone?element.dataset.zone.split(',').map(Number):element?.dataset.hand!==undefined?[0,L.HAND,Number(element.dataset.hand)]:element?.dataset.location?element.dataset.location.split(',').map(Number):pileLocation(element);const box=document.querySelector('.inspection');if(box){const location=previewLocation?.join(',')||'',previous=previewRenders.get(box);if(previous?.id===preview&&previous.location===location&&previous.snapshot===snapshot)return;const markup=previewMarkup();if(box.innerHTML!==markup)box.innerHTML=markup;previewRenders.set(box,{id:preview,location,snapshot})}}

// Graveyard and banished piles show their top card; inspect it live so relics like Surgery show.
function pileLocation(element){const [player,kind]=(element?.dataset.pile||'').split(','),loc={grave:L.GRAVE,banished:L.REMOVED}[kind];if(!snapshot||loc===undefined)return null;const items=snapshot.players[+player]?.[kind]||[];const seq=items.findLastIndex(Boolean);return seq<0?null:[+player,loc,seq]}

function previewMarkup(){let c=card(preview);

 if(c&&snapshot&&screen==='duel'&&previewLocation){const [p,loc,seq]=previewLocation;const zone={[L.HAND]:'hand',[L.MZONE]:'monsters',[L.GRAVE]:'grave',[L.REMOVED]:'banished'}[loc]||'spells';const live=snapshot.players[p]?.[zone]?.[seq];if(live?.code===c.id&&(p===0||live.position&5)){c=liveCardFacts(c,live,content.cards);if(p===0&&loc===L.HAND)c.summoned=summonedStats(live,seq)}}

if(!c)return '<p>Tap a card to inspect it. Tap it again or choose an action to play.</p>';return `<img src="${image(c.id)}"><h3>${esc(c.name)}</h3><div class="badges">${cardBadges(c)}</div>${c.data.type&1?`<div class="stats"><img class="genre-icon" src="assets/icons/level-star.png" alt="Level"> ${c.level}<br>ATK ${c.atk} / DEF ${c.defense}${c.summoned&&(c.summoned.atk!==c.atk||c.summoned.defense!==c.defense)?`<br><span class="summoned-stats">On the field: ATK ${c.summoned.atk} / DEF ${c.summoned.defense}</span>`:''}</div>`:''}${genreIcons(c)}<div class="card-text">${esc(displayCardText(c.desc))}</div>`}

// Relic and Field Spell bonuses apply only on the field, so a monster in hand also shows the stats it would be summoned with.
function summonedStats(live,seq){if(tagUI||typeof engine?.query!=='function')return null;try{const smart=smartContext(engine,0,L),c={...live,controller:0,location:L.HAND,sequence:seq};return {atk:smart.projectedAttack(c),defense:smart.projectedDefense(c)}}catch{return null}}

let titleMotion=null;

function render(){if(screen!=='shop'&&(shopkeeperSmall||shopkeeperShrinking)){cancelShopkeeperShrink();shopkeeperSmall=false;resetShopkeeperRightClicks()}syncBackgroundAnimations();if(screen!=='duel')clearDuelDOM(app);if(screen!=='ending')clearShadowVictory();titleMotion?.destroy();titleMotion=null;if(screen==='tag'){tagUI?.render();return}removeActions();if(screen!=='duel')clearTimeout(aiTimer);({title:renderTitle,characters:renderCharacters,draft:renderDraft,routes:renderRoutes,shop:renderShop,achievements:renderAchievements,relics:renderRelics,settings:renderSettings,tutorial:renderTutorial,collection:renderCollection,gallery:renderGallery,ending:renderEnding,duel:renderDuel})[screen]();track(screenMusic())}

function go(name){if(name==='routes'&&state.run?.reward_slots?.pending){if(rewardDeckReturn)go(state.run.stage==='shop'?'shop':'ending');return;}if(rewardDeckReturn&&!['draft','shop','ending'].includes(name))rewardDeckReturn=false;if(name!=='duel'){clearTimeout(heldChainTimer);heldChainTimer=0;heldChainPointer=null;heldAlwaysChain=false;heldChainPrompt=null;}cancelCharacterEntrance();if(name!=='ending')clearShadowVictory();clearDuelEmotes();flushDraftTap();if(name!=='shop')keeperTalk.hush();if(name!=='shop'||screen!=='shop'){cancelShopkeeperShrink();shopkeeperSmall=false;resetShopkeeperRightClicks()}const pendingRewards=['shop','ending'].includes(name)&&state.run?.reward_slots?.pending;if(pendingRewards)rewardMusic=true;screen=name;syncBackgroundAnimations();render();if(name==='shop')settleViewport();if(['draft','shop'].includes(name)&&(state.run?.artifacts.includes('dna_rewrite')&&!state.run.monster_type||pendingRelicChoice(state.run))&&!modal.open)void offerGoldenCards();if(pendingRewards){if(rewardDeckReturn){rewardDeckReturn=false;if(modal.querySelector('.reward-screen')){modal.showModal();rewardPresentation?.refresh()}else showRewardSlots()}else showVictoryReceipt()}}

let menu=baseMenu,menuPage='main',menuPageEntry=null;

// Start the title carousel on the saved-run action, regardless of menu order.

menuIndex=baseMenu.findIndex(item=>item[4]==='continue');

function renderTitle(){void remindReplayUpload(()=>screen==='title');titleMotion?.destroy();const activeMenu=menuPageEntry||menu[menuIndex]?.[4];menuPageEntry=null;menu=menuPage==='online'?[...onlineMenu]:baseMenu.filter(m=>!['tutorial','achievements'].includes(m[4])&&(m[4]!=='cpu'||state.profile.cpu_viewer_unlocked));if(menuPage==='main'&&state.profile.gallery_unlocked)menu.push(['Gallery',75500286,'spell','Under construction','gallery']);menuIndex=Math.max(0,menu.findIndex(m=>m[4]===activeMenu));app.innerHTML=`<div class="title"><a class="discord-link" href="https://discord.gg/QD36Q3VG7F" target="_blank" rel="noopener noreferrer" aria-label="Join YGO Rogue Duelist on Discord" title="Discord"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.3 4.4a19.8 19.8 0 0 0-4.9-1.5l-.6 1.2a18.3 18.3 0 0 0-5.6 0l-.6-1.2a20 20 0 0 0-4.9 1.5C.6 9 .1 13.5.4 18a20 20 0 0 0 6 3l1.2-2a12 12 0 0 1-1.9-.9l.5-.4c3.8 1.8 7.9 1.8 11.6 0l.5.4-1.9.9 1.2 2a20 20 0 0 0 6-3c.4-5.2-.7-9.6-3.3-13.6ZM8.3 15.4c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2 1 2 2.3-.9 2.3-2 2.3Zm7.4 0c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2 1 2 2.3-.9 2.3-2 2.3Z"/></svg></a>${Array.from({length:24},(_,i)=>`<i class="particle" style="left:${i*4.2}%;animation-delay:-${i*.47}s;animation-duration:${6+i%5}s"></i>`).join('')}<img class="game-logo" src="assets/rogue-duelist-logo.png" alt="Yu-Gi-Oh: Rogue Duelist"><div class="carousel">${menu.map((m,i)=>{let d=(i-menuIndex+menu.length)%menu.length;if(d>3)d-=menu.length;return `<button class="menu-card ${m[2]}" data-menu="${i}" data-distance="${Math.abs(d)}" style="--menu-offset:${d};left:${50+d*23}%;scale:${d?'.72':'1'};z-index:${10-Math.abs(d)};filter:${d?'brightness(.58)':'none'};animation-delay:-${i*.8}s" ${Math.abs(d)>2?'hidden':''}><h3 class="${m[0]==='Ultimate Collector'?'compact-menu-title':''}">${m[0]}</h3><div class="art"><img src="${m[4]==='gallery'?'assets/Meerkat.png':'assets/menu/'+m[1]+'.jpg'+(m[4]==='online'?'?v=unity-610':'')}"></div><p>${m[3]}</p></button>`}).join('')}</div><small class="title-version">v${esc(replayVersion)}</small><small style="padding-bottom:8px">Fan Experiment · EDOPro core · Progress saved on this device</small></div>`;titleMotion=mountMenuMotion(app.querySelector('.carousel'),menu.length,menuIndex,index=>{menuIndex=index})}

let copycatTaps=0,deviceSecretTaps=0,secretPlaying=false;

function renderGallery(){if(!state.profile.gallery_unlocked){go('title');return}shell('Gallery',`<div class="gallery-view"><img src="assets/Meerkat.png" alt="Meerkat"><h2>Under construction</h2></div>`)}

let shopVisitKey='',shopkeeperTaps=0,shopkeeperRightClicks=0,shopkeeperRightClickTimer=0,shopkeeperShrinking=false,shopkeeperSmall=false,shopkeeperShrinkAnimation=null;

function resetShopkeeperRightClicks(){clearTimeout(shopkeeperRightClickTimer);shopkeeperRightClickTimer=0;shopkeeperRightClicks=0;}
function cancelShopkeeperShrink(){if(shopkeeperShrinkAnimation){shopkeeperShrinkAnimation.cancel();shopkeeperShrinkAnimation=null}shopkeeperShrinking=false;}

function positionShopkeeper(){
 if(screen!=='shop')return;
 const root=app.querySelector('.shop-compact'),aside=root?.querySelector('.shop-layout>aside'),keeper=root?.querySelector('.secret-shopkeeper');
 if(!root||!aside||!keeper)return;
 const relicless=state?.run?.challenge_level===-1,landscape=matchMedia('(orientation: landscape)').matches;
 if(relicless){
  if(keeper.parentElement!==root)root.append(keeper);
  if(!landscape){keeper.style.display='none';keeperTalk.hush();return;}
  const viewportHeight=window.innerHeight,sourceRatio=561/592;
  let targetTop,center;
  const asideRect=aside.getBoundingClientRect(),relicButton=aside.querySelector('.shop-reference-buttons [data-do="relic-ledger"]'),relicRect=relicButton?.getBoundingClientRect();
  const legacyTopInset=(24/592)*(.94/sourceRatio)+(1-.94/sourceRatio)/2;
  const height=shopkeeperSmall?Math.min(230,viewportHeight):viewportHeight/(2*(1-legacyTopInset)),width=height*.94;
  targetTop=viewportHeight-height;
  center=relicRect?(relicRect.left+relicRect.right)/2:asideRect.left+asideRect.width/2;
  root.classList.remove('desktop-shopkeeper-anchored');
  Object.assign(keeper.style,{position:'fixed',display:'block',top:`${targetTop}px`,left:`${center-width/2}px`,right:'auto',bottom:'0px',width:`${width}px`,height:`${height}px`,margin:'0',padding:'0',border:'0',borderRadius:'0',background:'transparent',transform:'none',zIndex:'0',pointerEvents:'none'});
  keeperTalk.place();
  return;
 }
 root.classList.remove('desktop-shopkeeper-anchored');
 const counter=root.querySelector('.shop-counter');
 const shelf=aside.querySelector('.relics');
 if(counter&&keeper.parentElement!==counter)counter.prepend(keeper);
 keeper.removeAttribute('style');
 keeper.style.pointerEvents='none';
 if(counter&&shelf){const counterRect=counter.getBoundingClientRect(),shelfRect=shelf.getBoundingClientRect();keeper.style.setProperty('--shopkeeper-shelf-offset',`${Math.max(0,counterRect.bottom-shelfRect.top)}px`);keeper.style.setProperty('--shopkeeper-shelf-drop',`${Math.max(0,shelfRect.top-counterRect.bottom)}px`)}
 keeperTalk.placeHitArea(keeper);keeperTalk.place();
}
function shrinkShopkeeper(){
 if(screen!=='shop'||state?.run?.challenge_level!==-1||shopkeeperShrinking||shopkeeperSmall)return;
 const keeper=app.querySelector('.secret-shopkeeper'),img=keeper?.querySelector('img');
 if(!img)return;
 shopkeeperShrinking=true;playUISound('shopkeeper-laugh.mp3');
 const scale=Math.min(1,230/Math.max(230,keeper.getBoundingClientRect().height));
 const animation=shopkeeperShrinkAnimation=img.animate([{transform:'scale(1)'},{transform:`scale(${scale})`}],{duration:1800,easing:'ease-in',fill:'forwards'});
 animation.finished.then(()=>{if(shopkeeperShrinkAnimation!==animation)return;shopkeeperSmall=true;shopkeeperShrinking=false;shopkeeperShrinkAnimation=null;animation.cancel();img.style.transform='none';positionShopkeeper()}).catch(()=>{if(shopkeeperShrinkAnimation===animation)shopkeeperShrinkAnimation=null;shopkeeperShrinking=false});
}

window.addEventListener('resize',()=>requestAnimationFrame(positionShopkeeper),{passive:true});
window.visualViewport?.addEventListener('resize',()=>requestAnimationFrame(positionShopkeeper),{passive:true});
window.addEventListener('scroll',()=>requestAnimationFrame(positionShopkeeper),{passive:true,capture:true});
window.visualViewport?.addEventListener('scroll',()=>requestAnimationFrame(positionShopkeeper),{passive:true});

document.addEventListener('pointerdown',e=>{
 const keeper=e.target.closest('.secret-shopkeeper');
 if(screen!=='shop'||state?.run?.challenge_level!==-1||!keeper||e.pointerType!=='mouse'||e.button!==2){resetShopkeeperRightClicks();return;}
 e.preventDefault();
 shopkeeperRightClicks++;
 clearTimeout(shopkeeperRightClickTimer);
 if(shopkeeperRightClicks>=5){resetShopkeeperRightClicks();shrinkShopkeeper();return;}
 shopkeeperRightClickTimer=setTimeout(resetShopkeeperRightClicks,3000);
},true);
document.addEventListener('contextmenu',e=>{if(screen==='shop'&&state?.run?.challenge_level===-1&&e.target.closest('.secret-shopkeeper'))e.preventDefault()},true);

async function copycatSecret(){

 if(selected!==37||secretPlaying)return;

 if(++copycatTaps<10)return;

 copycatTaps=0;secretPlaying=true;busy=true;

 try{await meerkatSecretAnimation();await command('secret-champion');await startDuel(false,0)}finally{secretPlaying=false;busy=false}

}

async function meerkatSecretAnimation(){

 const overlay=document.createElement('div');overlay.className='meerkat-overlay';document.body.append(overlay);

 try{for(const left of [0,50,25]){const img=document.createElement('img');img.src='assets/Meerkat.png';img.style.left=left+'%';overlay.append(img);await img.animate([{transform:'translateY(105%)'},{transform:'translateY(0)',offset:.15},{transform:'translateY(0)',offset:.85},{transform:'translateY(105%)'}],{duration:2000,easing:'ease-in-out',fill:'forwards'}).finished;img.remove();}}finally{overlay.remove()}

}

async function shopkeeperSecret(){

 if(screen!=='shop'||secretPlaying||tagUI)return;

 // Every poke gets a complaint; the tenth still opens the secret.
 if(++shopkeeperTaps<10){keeperTalk.say('poke');return}

 shopkeeperTaps=0;keeperTalk.hush();secretPlaying=true;busy=true;

 try{await meerkatSecretAnimation();await command('secret-relicless');await startDuel(false,0)}catch(error){toast(error.message)}finally{secretPlaying=false;busy=false}

}



function renderCharacters(){

 selectedLevels[selected]=rememberedLevel(state.profile,selected);

 const base=content.characters[selected],variantUnlocked=(state.profile.character_levels?.[selected]??-1)>=2||(state.profile.run_history||[]).some(r=>r.character===selected&&r.challenge_level===-1&&r.result==='complete'&&r.round>=9);

 if(!variantUnlocked||!base.alternate)selectedVariants[selected]=0;

 const c=selectedVariants[selected]?{...base,...base.alternate,name:base.name}:base,locked=!state.profile.unlocked.includes(selected),row=state.achievements.find(a=>a.id==='character:'+selected);

 const packs=(c.copycat||c.engine_deck)?[]:c.random_packs?[]:c.starting_packs||[c.pack,c.pack,c.pack,c.pack];

 const relic=c.starting_relic,info=(relic==='none'?null:content.artifactInfo[relic]),relicName=relic==='random'?'Random relic':relic==='random_archetype'?'Random archetype relic':relic==='none'?'No relic':content.artifacts[relic]?.[0]||'',relicText=relic==='random'?'A different relic is rolled for each new run.':relic==='random_archetype'?'Start with a random relic that adds cards from an archetype to shop stock.':relic==='none'?'The Dueling Engine starts with no relic.':content.artifacts[relic]?.[2]||'';

 const packArt=packs.length?packs.map((pid,n)=>`<img src="assets/packs/${pid}.jpg" style="--n:${n}" alt="${esc(content.packs.find(p=>p.id===pid)?.name)}" title="${esc(packSummary(content,pid))}" data-do="inspect-pack" data-pack="${pid}" role="button" tabindex="0">`).join(''):`<img src="assets/card-back.jpg" style="--n:1" alt="${c.copycat?'Borrowed deck':c.engine_deck?'Victory deck choices':'Random boosters'}"><span>${c.copycat?'Borrowed deck':c.engine_deck?'Victory deck choices':'4 random packs'}</span>`;

 shell('',`<div class="char-layout"><div class="roster" style="--roster-rows:${Math.ceil(content.playable.length/6)}">${content.playable.map(i=>{const x=content.characters[i];return `<button class="portrait ${i===selected?'selected':''} ${(state.profile.character_levels?.[i]??-1)>=5?'golden-complete':''} ${state.profile.unlocked.includes(i)?'':'locked'}" data-character="${i}" data-completed-level="${Math.min(6,state.profile.character_levels?.[i]??-1)}" aria-label="${esc(x.name)}${(state.profile.character_levels?.[i]??-1)>=5?' — Level '+state.profile.character_levels[i]+' completed':''}"><img loading="lazy" src="assets/${x.sprite}" alt="">${hasReliclessClear(state.profile,i)?'<i class="relicless-clear-star" role="img" aria-label="Challenge Level -1 completed" title="Challenge Level -1 completed">&#9733;</i>':''}<span>${esc(x.name)}</span></button>`}).join('')}</div><div class="duelist-selection"><aside class="char-details"><div class="duelist-hero" ${c.copycat?'data-do="copycat-secret"':''} style="background-image:url('assets/${c.background||`character-backgrounds/${selected}.jpg`}')"><img src="assets/${c.sprite}" alt="${esc(c.name)}"><h2>${esc(c.name)}</h2><button class="level-badge" data-challenge-level="${selectedLevels[selected]??0}" data-do="levels" aria-label="Choose challenge level">LVL<strong>${selectedLevels[selected]||0}</strong></button></div>${base.alternate?`<div class="variant-selector"><button data-do="choose-variant" data-variant="0" class="${selectedVariants[selected]?'':'active'}">Standard</button><button data-do="choose-variant" data-variant="1" class="${selectedVariants[selected]?'active':''}" ${variantUnlocked?'':'disabled'}>${esc(base.alternate.name)}</button>${variantUnlocked?'':'<small>Beat Challenge LVL 2 or LVL -1</small>'}</div>`:''}${c.engine_deck?`<p class="engine-character-description">${esc(c.theme)}</p>`:''}${locked?`<p class="duelist-unlock">${esc(row?.description||'Locked')}</p>`:''}${c.engine_deck?'':`${c.copycat?'<h3 class="loadout-heading">BORROWED DECK</h3>':''}<div class="duelist-loadout"><div class="draft-pack-fan">${packArt}</div><div class="signature-cards">${c.cards.map(n=>{const id=content.cards.find(x=>x.name===n)?.id;return `<button data-inspect="${id}" aria-label="Inspect ${esc(n)}"><img src="${image(id)}" alt="${esc(n)}"></button>`}).join('')}</div></div><div class="starting-relic"><div class="starting-relic-art">${info?relicArtwork(relicImage(info.art)):relic==='none'?'':'<img class="random-relic" src="assets/card-back.jpg" alt="Random relic">'}</div><div><h3>${esc(relicName)}</h3><p>${esc(relicText)}</p></div></div>`}${c.copycat?'<p class="duelist-special">Opponent deck + one Copycat. Relics only.</p>':''}</aside>${btn(locked?'LOCKED':'START RUN','new',locked?'disabled':'','start-run')}</div></div>`,'','character-select-page')

}

function showRunSlots(newRun=false){dialog(newRun?'Choose a slot for your new run':'Resume a saved run',`<div class="save-slot-grid">${state.slots.map(s=>{const r=s.run,c=r?content.characters[r.character]:null;return `<button class="save-slot" data-do="${newRun?'new-slot':'load-slot'}" data-slot="${s.slot}" ${!newRun&&!r?'disabled':''}><span class="slot-number">Slot ${s.slot}${c?' · '+esc(c.name):''}</span><span class="slot-portrait">${c?`<img src="assets/${c.sprite}" alt="${esc(c.name)}">`:''}</span><span class="slot-detail">${r?`Loop ${(r.loop||0)+1} · Duel ${Math.min(9,(r.round||0)+1)}/9<br>${Number(r.lp||0).toLocaleString()} LP<br><small>Last played: ${esc(lastPlayed(r.last_played_at))}</small>`:'Empty'}</span><b class="slot-action">${newRun?(r?'Replace this run':'Start here'):(r?'Resume':'Empty')}</b></button>`}).join('')}</div>`)}

async function newRun(){showRunSlots(true)}

async function beginNew(slot,replace=false){shopSelection.clear();await command('new',{character:selected,level:selectedLevels[selected]||0,variant:selectedVariants[selected]||0,slot,replace});modal.close();if(character().copycat||character().engine_deck)go('routes');else await characterEntrance(app.querySelector('.duelist-hero>img'),()=>{go('draft');openDraftPack(0,false)})}

function presentPacks(packs,done=()=>{}){stopPackSounds();packPresentation=true;track('packs');return openPacks({packs,content,image,inspect,sound:packSound,stopSound:stopPackSounds,done:()=>{packPresentation=false;track(screenMusic());done()}})}

function openDraftPack(i,reveal){const r=state.run;modal.close();presentPacks(r.packs.slice(i).map((cards,n)=>({id:r.pack_ids[i+n],cards})))}

let draftTab='All',draftSort='Newest';

function draftOrder(pool,selected){let base=pool.map((_,i)=>i).filter(i=>matchesSearch(card(pool[i]),'draft'));if(draftTab==='Monster')base=base.filter(i=>card(pool[i]).data.type&1);else if(draftTab==='Spell')base=base.filter(i=>card(pool[i]).data.type&2);else if(draftTab==='Trap')base=base.filter(i=>card(pool[i]).data.type&4);else if(draftTab==='Deck')base=base.filter(i=>selected.includes(i));const first={},last={};for(const i of base){const n=card(pool[i]).name.toLowerCase();if(!(n in first))first[n]=i;last[n]=i}const cat=c=>c.data.type&1?0:c.data.type&2?1:c.data.type&4?2:3,sub=c=>c.data.type&1?(c.type||''):(c.race||''),nm=i=>card(pool[i]).name.toLowerCase();if(draftSort==='Default')return base.sort((a,b)=>frameLevelName(card(pool[a]),card(pool[b]))||a-b);if(draftSort==='Attribute')return attributeOrder(base,pool,card,state.run);if(draftSort==='Name')return base.sort((a,b)=>nm(a)<nm(b)?-1:nm(a)>nm(b)?1:pool[a]-pool[b]);if(draftSort==='Type')return base.sort((a,b)=>cat(card(pool[a]))-cat(card(pool[b]))||(sub(card(pool[a])).toLowerCase()<sub(card(pool[b])).toLowerCase()?-1:1)||(nm(a)<nm(b)?-1:1));if(draftSort==='ATK'){const attacks=new Map(base.map(i=>[i,card(pool[i]).data.type&1?deckStats(card(pool[i]),state.run,i,content.artifactInfo)[0]:0]));return base.sort((a,b)=>{const ca=card(pool[a]),cb=card(pool[b]);return Number(!(ca.data.type&1))-Number(!(cb.data.type&1))||attacks.get(b)-attacks.get(a)||nm(a).localeCompare(nm(b))||a-b});}if(draftSort==='DEF'){const defenses=new Map(base.map(i=>[i,card(pool[i]).data.type&1?deckStats(card(pool[i]),state.run,i,content.artifactInfo)[1]:(card(pool[i]).defense||0)]));return base.sort((a,b)=>{const ca=card(pool[a]),cb=card(pool[b]);return Number(!(ca.data.type&1))-Number(!(cb.data.type&1))||defenses.get(b)-defenses.get(a)||(nm(a)<nm(b)?-1:nm(a)>nm(b)?1:0)||a-b});}if(draftSort==='Level')return base.sort((a,b)=>((card(pool[b]).level||0)-(card(pool[a]).level||0))||(nm(a)<nm(b)?-1:1));if(draftSort==='Newest')return base.sort((a,b)=>last[nm(b)]-last[nm(a)]||a-b);return base.sort((a,b)=>first[nm(a)]-first[nm(b)]||a-b)}

function markGoldenCards(root,r){const ids=[...(r.golden_cards||[]),r.golden_card];for(const el of root.querySelectorAll('[data-pick]'))if(ids.includes(r.pool[Number(el.dataset.pick)])){el.classList.add('golden-card');el.insertAdjacentHTML('beforeend','<span class="golden-sleeve-mark" title="Golden Sleeve" aria-label="Golden Sleeve">★</span>')}}

function bountyBanner(r){
 if(!r?.artifacts?.includes('bounty_list')||!r.bounty_objective)return '';
 const b=r.bounty_objective,rawReward=Number(b.reward),reward=Number.isFinite(rawReward)?Math.max(50,Math.min(120,Math.trunc(rawReward))):50;
 return '<section class="bounty-banner" aria-label="Bounty objective"><strong>BOUNTY</strong><span>'+esc(b.title||'Objective')+'</span><p>'+esc(b.description||'Complete this Duel to earn coins.')+'</p><small>Reward: +'+reward+' coins</small></section>';
}

function renderDraft(){const r=state.run,copy=(character().copycat||character().engine_deck),main=r.selected.filter(i=>!(card(r.pool[i]).data.type&64)).length;let count={};r.selected.forEach(i=>count[r.pool[i]]=(count[r.pool[i]]||0)+1);shell('Build your deck',`<div class="scroll draft-scroll"><div class="draft-summary"><div><p class="draft-count">${main} / ${deckMinimum(r,content.characters[r.character])}+ minimum main · ${r.selected.length-main} Extra Deck · ${copyLimitText(r)} ${copy?(character().copycat?'Copycat’s borrowed deck is read-only.':'Dueling Engine’s fixed starter deck is read-only.') : ''}</p><p class="draft-inspect-help">Hold a card to inspect · Drag to scroll</p></div><button class="tag-choose-opponent draft-next deck-count-arrow" data-do="routes" ${!copy&&(main<(deckMinimum(r,content.characters[r.character]))||main>60)?'disabled':''} aria-label="${main}/${deckMinimum(r,content.characters[r.character])}+ main deck cards — Next duel"><span><span class="tag-next-label"><strong>${main}/${deckMinimum(r,content.characters[r.character])}+</strong></span></span></button></div><div class="draft-tabs">${searchButton('draft')}${['All','Monster','Spell','Trap','Deck'].map(t=>`<button data-draft-tab="${t}" class="${draftTab===t?'active':''}">${t}</button>`).join('')}<select data-draft-sort>${['Newest','Default','Name','Type','Attribute','ATK','DEF','Level','Oldest'].map(o=>`<option ${o===draftSort?'selected':''}>${o}</option>`).join('')}</select>${btn('Deselect all','deselect-all',copy?'disabled':'')}${btn('Auto-build','auto',copy?'disabled':'')}</div>${bountyBanner(r)}<div class="draft-card-scroll"><div class="cardgrid">${draftOrder(r.pool,r.selected).map(i=>deckCardMarkup(cardButton(r.pool[i],`data-pick="${i}"`,r.selected.includes(i),!!(r.card_mods&&r.card_mods[i]!==undefined)),card(r.pool[i]),r,i,content.artifactInfo)).join('')}</div></div></div>`,`${rewardDeckReturn?btn('Back to rewards','reward-return'):r.stage==='shop'?btn('Back to shop','shop'):''}`);markGoldenCards(app,r);deckReadyFeedback(app,main,deckMinimum(r,content.characters[r.character]))}

function updateDraft(){if(screen!=='draft')return;const r=state.run,main=r.selected.filter(i=>!(card(r.pool[i]).data.type&64)).length;const minimum=deckMinimum(r,content.characters[r.character]),arrow=document.querySelector('.deck-count-arrow');if(arrow){arrow.disabled=!(character().copycat||character().engine_deck)&&(main<minimum||main>60);arrow.querySelector('strong').textContent=`${main}/${minimum}+`;arrow.setAttribute('aria-label',`${main}/${minimum}+ main deck cards — Next duel`);markGoldenCards(app,r);deckReadyFeedback(app,main,minimum);}document.querySelector('.draft-count').textContent=`${main} / ${deckMinimum(r,content.characters[r.character])}+ minimum main · ${r.selected.length-main} Extra Deck · ${copyLimitText(r)} ${(character().copycat||character().engine_deck)?'Fixed deck is read-only.':''}`;document.querySelectorAll('[data-pick]').forEach(el=>{const active=r.selected.includes(+el.dataset.pick);el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active))})}

let draftTap=null,draftPointer=null;

function flushDraftTap(){if(!draftTap)return;const tap=draftTap;draftTap=null;clearTimeout(tap.timer);command('toggle',tap.index).then(updateDraft).catch(e=>toast(e.message))}

let lastTap=null;

function doubleTap(key,code){const now=performance.now();if(lastTap&&lastTap.key===key&&now-lastTap.time<350){lastTap=null;removeActions();inspect(code);return true}lastTap={key,time:now};return false}

function tapDraft(el){if(modal.open||screen!=='draft')return;command('toggle',+el.dataset.pick).then(()=>{updateDraft();playUISound('deck-select')}).catch(e=>toast(e.message))}

function cancelDraftHold(){if(draftPointer){clearTimeout(draftPointer.timer);draftPointer.cancel=true}}

document.addEventListener('pointerdown',e=>{const el=e.target.closest('[data-pick]');if(!el||e.button!==0)return;cancelDraftHold();const p=draftPointer={id:e.pointerId,x:e.clientX,y:e.clientY,el,cancel:false,held:false};p.timer=setTimeout(()=>{if(draftPointer!==p||p.cancel||!el.isConnected||modal.open)return;p.held=true;inspect(state.run.pool[+el.dataset.pick],+el.dataset.pick)},500)});

document.addEventListener('pointermove',e=>{if(draftPointer?.id===e.pointerId&&Math.hypot(e.clientX-draftPointer.x,e.clientY-draftPointer.y)>10)cancelDraftHold()},{passive:true});

document.addEventListener('scroll',cancelDraftHold,{capture:true,passive:true});

document.addEventListener('pointercancel',cancelDraftHold);

document.addEventListener('pointerup',e=>{if(draftPointer?.id!==e.pointerId)return;const p=draftPointer;clearTimeout(p.timer);draftPointer=null;if(!p.cancel&&!p.held&&p.el===e.target.closest('[data-pick]'))tapDraft(p.el)});

document.addEventListener('contextmenu',e=>{const el=e.target.closest('[data-pick]');if(!el)return;e.preventDefault();if(e.button!==2||e.pointerType==='touch'||modal.open||screen!=='draft')return;cancelDraftHold();draftPointer=null;inspect(state.run.pool[+el.dataset.pick],+el.dataset.pick)});

document.addEventListener('dragstart',e=>{if(e.target.closest('.cardbtn'))e.preventDefault()});

const seenBossReveals=new Set();

function renderRoutes(){const r=state.run,boss=(r.round+1)%3===0;const key=JSON.stringify([r.started_at,r.character,r.loop,r.round,r.boss_rerolls||0,r.routes]);shell(`Loop ${(r.loop||0)+1} · Duel ${r.round+1} / 9 — ${boss?'BOSS ENCOUNTER':'Select next opponent'}`,`${boss?bossBanner(r):''}<div class="routes">${r.routes.map(i=>encounterCard(content,r,i,{button:btn,curseIcons})).join('')}</div>${boss?bossControls(r):''}`,`${!boss?`<span class="route-coins"><img src="assets/ui/coins.png" alt="Coins"><b>${r.gold}</b></span>`:''}${btn('Edit deck','draft')}`,boss?'boss':'');if(boss&&!seenBossReveals.has(key)){seenBossReveals.add(key);if(seenBossReveals.size>64)seenBossReveals.delete(seenBossReveals.values().next().value);busy=true;playEncounterReveal({content,collectors:r.fallen_routes,opponents:r.routes,slot:true,sound:duelSound,tickSound:slotTickSound,stopTick:()=>slotTick.pause(),active:()=>screen==='routes'}).finally(()=>busy=false)}}

let shopSelection=new Set(),shopInventoryKey=null;

function renderCursedRelics(){const offer=state.run.cursed_offer;app.innerHTML=`<section class="cursed-reward"><nav class="cursed-reward-topbar" aria-label="Run tools"><button class="navigation-icon-button" data-do="draft" aria-label="Edit deck" title="Edit deck">${deckEditIcon}</button>${btn(relicEyeIcon,'relic-ledger','aria-label="Relics" title="Relics"','navigation-icon-button')}</nav><header><small>BOSS DEFEATED</small><h1>Choose a cursed relic</h1><p>Choose 1. Its benefit and drawback last for this run.</p></header><div class="cursed-options">${offer.options.map(key=>{const [name,,text]=content.artifacts[key];return `<article><h2>${esc(name)}</h2>${relicArtwork(relicImage(content.artifactInfo[key].art))}${cursedMarkup(key,text)}${btn('Choose relic','cursed-choose',`data-relic="${esc(key)}"`,'primary')}</article>`}).join('')}</div><footer>${btn('Reroll · Rerolls: '+offer.rerolls_left,'cursed-reroll',offer.rerolls_left?'':'disabled')}</footer></section>`}

// A small count of copies already in your card pool, so a fourth copy is not bought by mistake.
function ownedBadge(n,limit){const label=`You own ${n} ${n===1?'copy':'copies'}`;return `<span class="owned-badge${limit&&n>=limit?' full':''}" role="img" aria-label="${label}" title="${label}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><rect x="7" y="3" width="13" height="16" rx="2"/><path d="M4 7v12a2 2 0 0 0 2 2h9"/></svg>${limit?`${n}/${limit}`:n}</span>`}

function renderShop(){shopkeeperTaps=0;resetShopkeeperRightClicks();const r=state.run,fixed=!!(character().copycat||character().engine_deck);announceShopUltra(fixed?{...r,shop:r.shop.filter(x=>x.kind==='artifact')}:r,content.cards);if(r.cursed_offer)return renderCursedRelics();const key=JSON.stringify([r.started_at,r.round,r.shop.map(x=>[x.kind,x.id,x.price])]);if(key!==shopInventoryKey){shopSelection.clear();shopInventoryKey=key}for(const i of shopSelection)if(!r.shop[i]||r.shop[i].sold||fixed&&r.shop[i].kind!=='artifact')shopSelection.delete(i);const owned=new Map();for(const id of r.pool||[])owned.set(id,(owned.get(id)||0)+1);const copyLimit=r.artifacts.includes('broken_limiter')?0:3;const product=(x,i)=>{let name,img,description='';if(x.kind==='single'){name=card(x.id).name;img=image(x.id)}else if(x.kind==='deck'){name=x.name+' · Adds to collection';img='assets/decks/'+x.art+'.jpg'}else if(x.kind==='pack'){name=content.packs.find(p=>p.id===x.id).name;img='assets/packs/'+x.id+'.jpg'}else{const a=content.artifacts[x.id];name=a[0];description=a[2];img=relicImage(content.artifactInfo[x.id].art)}return `<div class="shop-product ${x.sold?'sold':''} ${!x.sold&&x.price>r.gold?'fx-cant-afford':''} ${shopSelection.has(i)?'chosen':''} ${isShopUltra(x,content.cards)?'shop-ultra':''}"><div class="product-art" data-shop-item="${i}">${x.kind==='artifact'?relicArtwork(img,`data-do="item-info" data-index="${i}"`):`<img ${x.kind==='single'?`data-inspect="${x.id}"`:x.kind==='artifact'||x.kind==='deck'||x.kind==='pack'?`data-do="item-info" data-index="${i}"`:''} src="${img}">`}<span class="price-badge">${x.sold?'SOLD':`<span>${x.price}</span><img class="price-coin" src="assets/ui/coins.png" alt="gold">`}</span>${x.kind==='single'&&owned.get(x.id)?ownedBadge(owned.get(x.id),copyLimit):''}<button class="purchase-check" role="checkbox" aria-checked="${shopSelection.has(i)}" aria-label="Select ${esc(name)}" data-do="select-purchase" data-index="${i}" ${x.sold||((character().copycat||character().engine_deck)&&x.kind!=='artifact')?'disabled':''}><span class="purchase-tick" aria-hidden="true"></span></button></div>${x.kind==='artifact'?`<small>${esc(name)}</small>`:''}</div>`};

 shell('',`<div class="shop-layout">${fixed?'':`<div class="shop-stock"><h3>${esc(r.shop_rerolls>0?'General stock':r.shop_reward?.label||'Featured stock')}</h3><div class="shelf singles-featured">${r.shop.map((x,i)=>({x,i})).filter(({x})=>x.kind==='single').slice(0,5).map(({x,i})=>product(x,i)).join('')}</div><h3 class="general-stock-heading">General stock</h3><div class="shelf singles-general" style="--single-columns:${Math.max(1,r.shop.filter(x=>x.kind==='single').length-5)}">${r.shop.map((x,i)=>({x,i})).filter(({x})=>x.kind==='single').slice(5).map(({x,i})=>product(x,i)).join('')}</div><h3>Booster packs</h3><div class="packs" style="--pack-columns:${r.shop.filter(x=>['pack','deck'].includes(x.kind)).length}">${r.shop.map((x,i)=>['pack','deck'].includes(x.kind)?product(x,i):'').join('')}</div></div>`}<aside><div class="shop-counter"><button class="keeper secret-shopkeeper" data-do="shopkeeper-secret" aria-label="Shopkeeper"><img src="assets/shopkeeper.png" alt="Shopkeeper">${r.challenge_level===-1?'':'<span class="keeper-hit" data-do="shopkeeper-secret" aria-hidden="true"></span>'}</button><div class="shop-balance" aria-label="${r.gold} gold"><img src="assets/ui/coins.png" alt=""><strong>${r.gold.toLocaleString()}</strong></div><button class="primary shop-buy" data-do="buy-selected" ${shopSelection.size&&[...shopSelection].reduce((n,i)=>n+(r.shop[i]?.price||0),0)<=r.gold?'':'disabled'}><b>BUY</b><span><img src="assets/ui/coins.png" alt="Gold"><strong>${[...shopSelection].reduce((n,i)=>n+(r.shop[i]?.sold?0:r.shop[i]?.price||0),0)}</strong></span></button><button class="shop-reroll-counter" title="Rerolls the entire shop" aria-label="Reroll entire shop for ${shopRerollPrice(r)} coins" data-do="shop-reroll" ${r.gold<shopRerollPrice(r)||fixed&&r.challenge_level===-1?'disabled':''}><b>REROLL</b><span><img src="assets/ui/coins.png" alt="Gold"><strong>${shopRerollPrice(r)}</strong></span></button>${fixed?'':'<button class="shop-edit-deck" data-do="draft">Edit deck</button>'}<button class="shop-next" data-do="routes" aria-label="Next Duel!"><span>Next<br>Duel!</span></button></div>${r.challenge_level===-1?'':`<h3>${r.challenge_level===-1?'LVL -1 · Relics disabled':'Relics'} ${(character().copycat||character().engine_deck)?'— relics only':''}</h3><div class="relics">${r.shop.map((x,i)=>x.kind==='artifact'?product(x,i):'').join('')}</div>`}<div class="shop-reference-buttons">${btn('Coin scorecard','scorecard')}${btn('Relics','relic-ledger')}<button class="shop-reroll-landscape" title="Rerolls the entire shop" aria-label="Reroll entire shop for ${shopRerollPrice(r)} coins" data-do="shop-reroll" ${r.gold<shopRerollPrice(r)||fixed&&r.challenge_level===-1?'disabled':''}><b>REROLL</b><span><img src="assets/ui/coins.png" alt="Gold"><strong>${shopRerollPrice(r)}</strong></span></button></div></aside></div>`,`<span class="shop-header-lp">${r.lp.toLocaleString()} LP</span>`,'shop shop-compact'+((character().copycat||character().engine_deck)?' relic-only-shop':'')+(r.challenge_level===-1?' relicless-shop':''));requestAnimationFrame(positionShopkeeper);polishShop(app,JSON.stringify([r.started_at,r.character]),r.gold);const visit=JSON.stringify([r.started_at,r.loop,r.round]);if(visit!==shopVisitKey&&!r.reward_slots?.pending){shopVisitKey=visit;keeperTalk.say('welcome')}}

function collectionNavigation(active){return `<div class="collection-nav">${['cards','packs','relics','history','personal','global','collectors','achievements'].map(k=>btn(k==='collectors'?'Ultimate Collectors':k==='personal'?'Device Stats':k==='global'?'Global Stats':k==='history'?'Run History':k[0].toUpperCase()+k.slice(1),'collection-kind',`data-kind="${k}"`,k===active?'primary':'')).join('')}</div>`}

function renderAchievements(){const groups=[['Characters',a=>a.id.startsWith('character:')],['Difficulties',a=>/level|difficulty/i.test(a.id)],['Gallery',a=>/gallery/i.test(a.id)],['Milestones',a=>!a.id.startsWith('character:')&&!/level|difficulty|gallery/i.test(a.id)]];shell('Achievements',`${collectionNavigation('achievements')}<div class="scroll">${groups.map(([title,test])=>{const rows=state.achievements.filter(a=>!a.id.startsWith('card:')&&!a.id.startsWith('pack:')&&test(a));return rows.length?`<h2>${title}</h2>${rows.map(a=>`<section class="panel achievement ${a.done?'complete':''}"><div class="row"><img loading="lazy" class="achievement-art" src="assets/${a.image}"><h3>${esc(a.name)}</h3><b>${a.done?'COMPLETED':'IN PROGRESS'}</b></div><p>${esc(a.description)}</p><progress max="${a.target}" value="${Math.min(a.value,a.target)}"></progress><small>${Math.min(a.value,a.target)} / ${a.target} · ${a.cumulative?'Across all runs':'Best run'} · ${esc(a.reward)}</small></section>`).join('')}`:''}).join('')}</div>`)}

function renderRelics(){shell('Relics',`<div class="scroll cardgrid">${Object.entries(content.artifacts).filter(([id])=>state.run?.artifacts.includes(id)).map(([id,a])=>`<section class="panel"><img style="height:100px" src="${relicImage(content.artifactInfo[id].art)}">${relicCountBadge(id)}<h3>${esc(a[0])}</h3><p>${esc(a[2])}</p><small>${a[1]} coins</small></section>`).join('')}</div>`)}

let collectionKind='cards',collectionQuery='',collectionPage=0,collectionType='All types',collectionAttribute='All attributes',collectionEffect='Any effect',collectionRegistration='All cards';

let collectorLeaders=[];

async function renderCollectorLeaderboard(){

 shell('Ultimate Collectors',`${collectionNavigation('collectors')}<p>Loading surviving duelists…</p>`,btn('Back','collection-collector-back'));

 try{const config=await fetch('./multiplayer-config.json').then(r=>r.json());const response=await fetch(config.signalingUrl.replace(/\/$/,'')+'/v2/collector/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!response.ok)throw Error('Leaderboard unavailable.');const result=await response.json();if(screen!=='collection'||collectionKind!=='collectors')return;collectorLeaders=result.leaderboard;shell('Ultimate Collectors',`${collectionNavigation('collectors')}<div class="scroll"><div class="collector-leader-grid">${collectorLeaders.map((d,i)=>{const c=content.characters[d.character],rank=rankFor(d.wins);return btn(`${c?`<img src="assets/${esc(c.sprite)}" alt="${esc(c.name)}">`:''}<span class="collector-rank">${esc(rank)}</span><span class="collector-slot-name">${i+1}. ${esc(d.name)}</span><small>${d.wins} wins</small>`,'collector-decklist',`data-index="${i}" data-rank="${rank.toLowerCase()}"`,'collector-slot')}).join('')||'<p>No surviving match winners yet.</p>'}</div></div>`,btn('Back','collection-collector-back'));}catch(error){if(screen==='collection')shell('Ultimate Collectors',`${collectionNavigation('collectors')}<p>${esc(error.message)}</p>`,btn('Back','collection-collector-back'));}

}

let collectionSort='Default';

document.addEventListener('change',e=>{if(e.target.matches('[data-collection-sort]')){collectionSort=e.target.value;collectionPage=0;renderCollection();}});

let registeredSource=null,registeredSet=new Set();

function registeredCard(id){if(registeredSource!==state.registeredCards){registeredSource=state.registeredCards;registeredSet=new Set(registeredSource||[])}return registeredSet.has(Number(id))}

function renderCollection(){if(collectionKind==='achievements'){renderAchievements();return;}if(collectionKind==='collectors'){void renderCollectorLeaderboard();return;}if(collectionKind==='personal')return renderPersonalStats();if(collectionKind==='global')return renderGlobalStats();if(collectionKind==='history'){renderRunHistory();return}let rows=collectionKind==='cards'?content.cards.map(c=>({id:c.id,name:c.name,img:image(c.id)})):collectionKind==='packs'?content.packs.map(p=>({id:p.id,name:p.name,img:'assets/packs/'+p.id+'.jpg'})):Object.entries(content.artifacts).filter(([id])=>!(content.retiredArtifacts||[]).includes(id)).map(([id,r])=>({id,name:r[0],img:relicImage(content.artifactInfo[id].art)}));rows=rows.filter(r=>(r.name+' '+(collectionKind==='cards'?card(r.id).desc:'')).toLowerCase().includes(collectionQuery.toLowerCase())&&(collectionKind!=='cards'||matchesFilters(card(r.id),collectionType,collectionAttribute,'Any effect')&&matchesSearch(card(r.id),'collection')));if(collectionKind==='cards'&&collectionRegistration!=='All cards')rows=rows.filter(r=>registeredCard(r.id)===(collectionRegistration==='Registered'));if(collectionKind==='cards')rows.sort((a,b)=>collectionSort==='Default'?frameLevelName(card(a.id),card(b.id)):collectionSort==='Name'?a.name.localeCompare(b.name):collectionSort==='ATK'?(card(b.id).atk||0)-(card(a.id).atk||0):collectionSort==='DEF'?(card(b.id).defense||0)-(card(a.id).defense||0):(card(b.id).level||0)-(card(a.id).level||0));if(collectionKind==='relics')rows=sortRelicCollection(rows,content.artifacts);const pages=Math.max(1,Math.ceil(rows.length/36));collectionPage=Math.min(collectionPage,pages-1);shell('Collection',`<div class="collection-nav">${['cards','packs','relics','history','personal','global','collectors','achievements'].map(k=>btn(k==='collectors'?'Ultimate Collectors':k==='personal'?'Device Stats':k==='global'?'Global Stats':k==='history'?'Run History':k[0].toUpperCase()+k.slice(1),'collection-kind',`data-kind="${k}"`,k===collectionKind?'primary':'')).join('')}<input id="collection-search" placeholder="Search collection" value="${esc(collectionQuery)}">${btn('Search','collection-search')}${collectionKind==='cards'?searchButton('collection')+collectionFilters()+`<label>Sort<select data-collection-sort>${['Default','Name','ATK','DEF','Level'].map(v=>`<option ${v===collectionSort?'selected':''}>${v}</option>`).join('')}</select></label><label>Registration<select data-collection-filter="registration">${['All cards','Registered','Missing'].map(x=>`<option ${x===collectionRegistration?'selected':''}>${x}</option>`).join('')}</select></label><small class="registration-progress">${content.cards.filter(c=>registeredCard(c.id)).length} / ${content.cards.length} registered</small>`:''}</div><div class="scroll cardgrid">${rows.slice(collectionPage*36,(collectionPage+1)*36).map((r,index)=>`${collectionKind==='relics'&&(index===0||rows[collectionPage*36+index-1].relicKind!==r.relicKind)?`<h2 class="relic-group-heading">${r.relicKind}</h2>`:''}${collectionKind==='relics'&&(index===0||rows[collectionPage*36+index-1].relicKind!==r.relicKind||rows[collectionPage*36+index-1].effectGroup!==r.effectGroup)?`<h3 class="relic-group-heading">${r.effectGroup}</h3>`:''}<button class="cardbtn ${collectionKind==='cards'&&registeredCard(r.id)?'card-registered':''}" ${collectionKind==='cards'?`data-inspect="${r.id}"`:`data-do="collection-item" data-id="${r.id}"`}>${collectionKind==='relics'?`<div class="collection-relic-art">${relicArtwork(r.img)}</div>`:`<img loading="lazy" src="${r.img}">`}<span>${esc(r.name)}</span></button>`).join('')}</div><footer>${btn('Previous','collection-prev',collectionPage?'':'disabled')} ${rows.length} entries · ${collectionPage+1} / ${pages} ${btn('Next','collection-next',collectionPage+1<pages?'':'disabled')}</footer>`)}

let tutorialPage=0,tutorialReturn="title";

function renderTutorial(){const pages=content.tutorial,p=pages[tutorialPage]||pages[0];const section=b=>`<p>${esc(b.text)}</p>${(b.images||[b.image]).map(src=>`<figure><button class="tutorial-shot" data-do="tutorial-image" data-src="${esc(src)}" data-label="${esc(b.title)}" aria-label="Enlarge screenshot: ${esc(b.title)}"><img loading="lazy" decoding="async" src="assets/${esc(src)}" alt="${esc(b.title)} — example game screen"></button><figcaption>Example screen · Tap to enlarge</figcaption></figure>`).join('')}`;shell('How to play',`<div class="tutorial-layout"><nav aria-label="Tutorial categories">${pages.map((p,i)=>btn(`${i+1}. ${esc(p.title)}`,'tutorial-page',`data-index="${i}" aria-current="${i===tutorialPage?'page':'false'}"`,i===tutorialPage?'primary':'')).join('')}</nav><article class="panel"><h2>${esc(p.title)}</h2>${p.video?`<a class="tutorial-video" href="${esc(p.video)}" target="_blank" rel="noopener noreferrer">▶ Watch the Yu-Gi-Oh! beginner video</a>`:(p.sections||[]).map(b=>p.collapsible?`<details class="tutorial-mode"><summary>${esc(b.title)}</summary>${section(b)}</details>`:`<section class="tutorial-section"><h3>${esc(b.title)}</h3>${section(b)}</section>`).join('')}</article></div>`,btn('Back','tutorial-back'),'tutorial-page')}



document.addEventListener('change',async e=>{if(!e.target.matches('[data-faster-animations]'))return;state.settings.fasterAnimations=e.target.checked;await command('settings',state.settings)});

document.addEventListener('change',async e=>{if(!e.target.matches('[data-performance-mode]'))return;state.settings.performanceMode=e.target.checked;document.querySelectorAll('[data-duel-background]').forEach(select=>select.disabled=e.target.checked||state.settings.simpleBackgrounds||compatibilityEnabled());document.dispatchEvent(new Event('duel-background-change'));await command('settings',state.settings)});

document.addEventListener('change',async e=>{if(!e.target.matches('[data-pause-hidden]'))return;state.settings.pauseWhenHidden=e.target.checked;syncInspectionPause();await command('settings',state.settings)});

function manualResponseWindowSetting(){const value=Math.max(0,Math.min(2000,Number(state.settings.manualResponseWindow??200)||0));return `<label for="manual-response-window">Manual Response Window <input id="manual-response-window" type="range" min="0" max="2000" step="50" value="${value}"><output>${value} ms</output></label><small class="muted">Time to respond to an optional chain during the opponent’s turn before it passes automatically.</small>`}

function duelBackgroundSetting(){return `<label>Pause When Tabbed Out <input type="checkbox" data-pause-hidden ${state.settings.pauseWhenHidden!==false?'checked':''}></label><small class="muted">Pause single-player duels when the game is hidden. Your browser may still limit background activity.</small><label>Performance Mode <input type="checkbox" data-performance-mode ${state.settings.performanceMode?'checked':''}></label><small class="muted">Static backgrounds and fewer decorative effects. Keeps gameplay animations.</small><label>Faster Animations <input type="checkbox" data-faster-animations ${state.settings.fasterAnimations?'checked':''}></label><small class="muted">Your own actions play out quicker. The opponent's turn keeps its pace.</small><label>Simple Backgrounds <input type="checkbox" data-simple-backgrounds ${state.settings.simpleBackgrounds?'checked':''}></label><small class="muted">Static gradients for lower battery use.</small><label>Compatibility Mode <input type="checkbox" data-compatibility-mode ${compatibilityEnabled()?'checked':''}></label><small class="muted">Uses static backgrounds, reduces decorative effects, and disables filters and blur that can flicker in some browsers. Keeps gameplay movement.</small><label>Duel Background <select data-duel-background ${compatibilityEnabled()||state.settings.simpleBackgrounds||state.settings.performanceMode?'disabled':''}><option value="spiral" ${state.settings.duelBackground!=='tunnel'?'selected':''}>Classic spiral</option><option value="tunnel" ${state.settings.duelBackground==='tunnel'?'selected':''}>Animated tunnel</option></select></label>`}

document.addEventListener('change',async e=>{if(!e.target.matches('[data-simple-backgrounds]'))return;state.settings.simpleBackgrounds=e.target.checked;document.querySelectorAll('[data-duel-background]').forEach(select=>select.disabled=e.target.checked||state.settings.performanceMode||compatibilityEnabled());document.dispatchEvent(new Event('duel-background-change'));await command('settings',state.settings)});

document.addEventListener('change',async e=>{if(!e.target.matches('[data-duel-background]'))return;state.settings.duelBackground=e.target.value==='tunnel'?'tunnel':'spiral';document.dispatchEvent(new Event('duel-background-change'));await command('settings',state.settings)});

// Compatibility mode is off by default, but auto-enables on Firefox where GPU compositing flickers.
const compatibilityBrowser=()=>/firefox/i.test(navigator.userAgent);
const compatibilityEnabled=()=>state.settings.compatibilityMode==null?compatibilityBrowser():!!state.settings.compatibilityMode;
function applyCompatibilityMode(){document.documentElement.classList.toggle('compatibility-mode',compatibilityEnabled());document.dispatchEvent(new Event('duel-background-change'))}

document.addEventListener('change',async e=>{if(!e.target.matches('[data-compatibility-mode]'))return;state.settings.compatibilityMode=e.target.checked;applyCompatibilityMode();document.querySelectorAll('[data-duel-background]').forEach(select=>select.disabled=compatibilityEnabled()||state.settings.simpleBackgrounds||state.settings.performanceMode);await command('settings',state.settings)});

document.addEventListener('change',e=>{if(e.target.matches('[data-usage-stats]'))setStatsEnabled(e.target.checked)});

function renderSettings(){shell('Settings',`<div class="scroll settings settings-organized">

 <section class="panel settings-section"><h2>Audio</h2><p class="muted">Set the volume for your duels.</p><label for="music">Music <input id="music" type="range" min="0" max="100" value="${state.settings.music}"><output>${state.settings.music}%</output></label><label for="sound">Sound Effects <input id="sound" type="range" min="0" max="100" value="${state.settings.sound}"><output>${state.settings.sound}%</output></label></section>

 <section class="panel settings-section"><h2>Appearance</h2>${duelBackgroundSetting()}${manualResponseWindowSetting()}</section>

 <section class="panel settings-section"><h2>App &amp; Devices</h2>${window.ShadowNative?'':`<label>Preload game assets <input type="checkbox" data-preload-visuals ${preloadVisualPreference()==='all'?'checked':''}></label><small>Preload music, artwork and backgrounds on next startup. Sound effects always preload; offline files are reused.</small>`}<p class="muted">Keep playing with your saved progress.</p><div class="settings-actions">${window.ShadowNative?.openUpdate?btn('Check for Updates','android-update'):''}${btn('Link Devices','device-sync-open')}${btn('How to Play','tutorial')}</div></section>
 <section class="panel settings-section replay-settings"><h2>Duel Replays</h2><p>The latest 100 duels are saved on this device. Upload them to help improve the CPU.</p><p class="muted">Includes decks, actions and results. No profile or account details.</p>${btn('Upload Replays','upload-replays')}<label class="replay-stats-setting"><input type="checkbox" data-usage-stats ${statsEnabled()?'checked':''}> Share Global Statistics</label><p id="replay-status" role="status" aria-live="polite"></p></section>

 <section class="panel settings-section"><h2>Saved Data</h2><label><input type="checkbox" id="cloud-saves-enabled" ${deviceBackup.isEnabled()?'checked':''}> Enable cloud saves</label><p>Off by default. Once you have earned an unlock, your progress is backed up after each duel while online. Local saves always stay enabled.</p><p class="muted">Updating the app keeps your save.</p><details><summary>Recover Save Data</summary><p>Enabled cloud saves back up your progress and Ultimate Collectors after duels. Turning this off stops future backups; existing backups are kept. An admin can help recover a lost save.</p><p>Backup code: <strong style="overflow-wrap:anywhere">${esc(deviceBackup.status().code||'Unavailable')}</strong></p><p>${deviceBackup.status().updatedAt?'Last backup: '+esc(new Date(deviceBackup.status().updatedAt).toLocaleString()):'Waiting for first online backup'}</p><label>Restore an admin recovery file <input id="device-recovery-file" type="file" accept=".json,application/json"></label></details><details class="settings-danger"><summary>Reset Progress</summary><p>Remove all saved progress on this device.</p>${btn('Delete All Progress','reset-progress','','danger')}</details></section>

 <details class="panel settings-advanced"><summary>Advanced</summary><label for="cheat-code">Testing Code</label><div class="settings-code"><input id="cheat-code" placeholder="Enter code">${btn('Apply','cheat')}</div></details>

 <p class="notice settings-about">Yu-Gi-Oh: Rogue Duelist · A private fan experiment.<br>Card and character artwork © Konami. Duel rules: Project Ignis / ocgcore-wasm.</p></div><footer class="settings-footer">${btn('Back','settings-back')}</footer>`,'','settings-page')}



let shadowVictoryKey=null;

function finalChallengeName(r){const opponent=r.encore_opponent??(r.encore_won?0:r.loop>=1?75:0);return opponent===75?(content.characters[opponent]?.name||'Obelisk the Tormenter'):'2004 World Champion'}

function renderEnding(){const r=state.run,won=r.stage==='complete';const victoryKey=String(r.started_at)+':'+r.character;if(won&&r.challenge_level===6&&!r.secret_challenge&&shadowVictoryKey!==victoryKey&&!r.reward_slots?.pending){shadowVictoryKey=victoryKey;showShadowVictory(()=>(state.settings?.sound??65)/100);}shell(won?'RUN COMPLETE':'GAME OVER',`<div class="scroll" data-run-outcome="${won?'victory':'defeat'}"><div class="panel">${won&&r.level_unlocked!=null?`<section class="level-unlock" aria-label="Challenge level unlocked"><div class="unlock-lights"></div><div class="unlock-motes">${Array.from({length:40},(_,i)=>`<i style="--x:${(i*37+11)%100}%;--y:${(i*53+5)%100}%;--delay:-${(i*0.35).toFixed(2)}s;--duration:${(2.2+(i%7)*0.3).toFixed(2)}s"></i>`).join('')}</div><h2>CHALLENGE LVL ${r.level_unlocked} UNLOCKED</h2><p>Clear a full run to unlock the next level for ${esc(character().name)}.</p></section>`:''}<figure class="run-card"><canvas class="run-card-canvas" width="1080" height="1350" role="img" aria-label="Run summary"></canvas></figure><div class="run-card-share"><button class="primary run-card-copy" data-do="copy-run-card" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>Copy image</button><button class="run-card-copy run-card-save" data-do="save-run-card" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>Download</button><p class="run-card-status" role="status" aria-live="polite"></p></div><h3>Unlocked during this run</h3><p>${state.achievements.filter(a=>r.content_unlocks_earned?.includes(a.id)||(a.id.startsWith('character:')&&r.unlocks_earned?.includes(+a.id.split(':')[1]))).map(a=>`<span class="unlock-art"><img src="assets/${a.image}"><span>${esc(a.name)}</span></span>`).join('')||'No new unlocks this run.'}</p>${won&&!r.secret_challenge?`<section class="panel"><h3>${r.encore_won?`${esc(finalChallengeName(r))} DEFEATED`:`Face ${esc(finalChallengeName(r))}`}</h3>${r.encore_won?'<p>Keep your cards, coins and relics. Each loop adds 100 enemy ATK/DEF and 2,000 enemy LP.</p>':''}${btn(r.encore_won?'Begin next loop':'Start Looping',r.encore_won?'next-loop':'champion','','primary')}</section>`:''}${r.secret_challenge&&won?'<p>Gallery unlocked!</p>':''}${btn('New game','characters','','primary')}</div></div>`);mountEndingCard(r)}
// The share card draws once its artwork loads; Copy stays disabled until then.
function mountEndingCard(r){const canvas=app.querySelector('.run-card-canvas');if(!canvas)return;mountRunCard(canvas,r,{content,character:character(),card,cardImage:image,relicImage,assetURL,finalChallengeName}).then(()=>{if(canvas.isConnected)app.querySelectorAll('.run-card-copy').forEach(b=>b.disabled=false)}).catch(e=>{console.error(e);const s=app.querySelector('.run-card-status');if(s)s.textContent='The run summary image could not be drawn.'})}



function duelSignatureMonsters(){const ids=new Set([state.run.character,state.run.opponent].filter(Number.isInteger).flatMap(id=>{const c=content.characters[id];if(!c)return[];const names=[...(c.cards||[]),...(c.alternate?.cards||[])];return names.map(name=>content.cards.find(row=>row.name===name)?.id).filter(id=>id&&((card(id)?.data?.type||0)&1))}));return ids}

async function startDuel(resume=false,opponent=null){busy=true;app.innerHTML='<section class="loading"><img class="loading-wizard" src="assets/time-wizard.png" alt="Time Wizard"><h1>ENTERING THE DUEL</h1><p>Loading the offline EDOPro core…</p></section>';try{

 if(!resume){await command('choose',opponent);await command('begin');await playEncounterReveal({content,collectors:state.run.fallen_routes,players:[state.run.character],opponents:[state.run.opponent],lp:[state.run.mobile_duel.lp,state.run.mobile_duel.enemyLP],sound:duelSound,tickSound:slotTickSound,stopTick:()=>slotTick.pause(),active:()=>screen==='routes'||screen==='ending'})}

 if(!engine)engine=await new MobileDuel([...content.cards,...content.tokenCards]).init();else engine.destroy();const d=state.run.mobile_duel;if(!d)throw Error('No resumable mobile duel.');

 coinMilestones.delete(engine);coinProgress.delete(engine);duelAnimations.delete(engine);if(!resume)summonMusic.delete(engine);snapshot=engine.start(d.deck,d.enemy,d.lp,d.enemyLP,d.draw,d.seed,d.extra,d.enemyExtra,d.passives,d.enemyDraw??5);

 if(resume)for(const r of d.responses)snapshot=engine.respond(decode(r));

 engine.signatureCards=duelSignatureMonsters();lastLP=[...snapshot.lp];lastPhase=snapshot.phase;equipSelection=null;screen='duel';duelEnding=false;preview=state.run.pool[0];if(!resume)toast(state.run.first_player===1?'Coin toss: tails - opponent starts.':'Coin toss: heads - you start.');if(resume)engine.visuals=[];render();if(resume)await updateCoinMilestones(true);if(snapshot.finished){await completeDuel(snapshot.finished.player);return}await playDuelCues();scheduleAI();

 }catch(e){toast('Duel could not start: '+e.message);screen='routes';render()}finally{busy=false}}

const encode=x=>JSON.parse(JSON.stringify(x,(k,v)=>typeof v==='bigint'?v+'n':v));

const decode=x=>JSON.parse(JSON.stringify(x),(k,v)=>typeof v==='string'&&/^\d+n$/.test(v)?BigInt(v.slice(0,-1)):v);

let equipSelection=null;

function decorateEquipTarget(){

 document.querySelectorAll('.equip-target-marker').forEach(el=>el.remove());

 const target=equippedTarget(snapshot,equipSelection);if(!target)return;

 const zone=document.querySelector(`[data-zone="${target.controller},${target.location},${target.sequence}"]`);if(!zone)return;

 const marker=document.createElement('span');marker.className='equip-target-marker';marker.setAttribute('role','img');marker.setAttribute('aria-label','Equipped to this card');marker.title='Equipped to this card';zone.append(marker);

}

// Capture inspection taps without consuming normal card actions or target selection.

function selectEquipMarker(event){

 if((event.type==='click'?event.detail!==0:event.button!==0)||screen!=='duel')return;

 const el=event.target.closest('.mat [data-zone],.hand button,.enemy-hand button,[data-inspect],[data-pile]');if(!el)return;

 const address=el.dataset.zone?.split(',').map(Number);

 equipSelection=address&&el.dataset.code?{controller:address[0],location:address[1],sequence:address[2],code:Number(el.dataset.code)}:null;

 decorateEquipTarget();

}

document.addEventListener('pointerdown',selectEquipMarker,true);

document.addEventListener('click',selectEquipMarker,true);

function removeActions(){document.querySelector('.action-pop')?.remove()}

// Capture the tap before any field/control handler can stop propagation.

// Do not consume it: phase buttons and other controls still work on that tap.

document.addEventListener('pointerdown',e=>{

 const pop=document.querySelector('.action-pop');

 if(pop&&!e.composedPath().includes(pop))removeActions();

},true);



function legalCardActions(player,loc,seq,code){const m=engine.pending;if(m?.player!==0||player!==0)return [];
 if(m.type===M.SELECT_CHAIN&&engine.player!==0)return reactionChoices(m,true).filter(x=>x.choice.code===code&&(x.source?.controller??x.source?.player)===player&&x.source?.location===loc&&x.source?.sequence===seq).map(x=>({...x.choice,index:x.index}));
 // Only command prompts tie choices to field cards; skip building every other prompt's choices
 // (a card-name prompt lists the whole card pool) once per zone on each render.
 if(m.type!==M.SELECT_IDLECMD&&m.type!==M.SELECT_BATTLECMD)return [];

 const lists=m.type===M.SELECT_IDLECMD?{[I.SELECT_SUMMON]:m.summons,[I.SELECT_SPECIAL_SUMMON]:m.special_summons,[I.SELECT_MONSTER_SET]:m.monster_sets,[I.SELECT_SPELL_SET]:m.spell_sets,[I.SELECT_ACTIVATE]:m.activates,[I.SELECT_POS_CHANGE]:m.pos_changes}:m.type===M.SELECT_BATTLECMD?{[B.SELECT_BATTLE]:m.attacks,[B.SELECT_CHAIN]:m.chains}:{};

 return engine.choices(m).filter(a=>{const c=lists[a.response.action]?.[a.response.index];if(!c||c.location!==loc||c.sequence!==seq)return false;return a.code===code||(m.type===M.SELECT_BATTLECMD&&a.response.action===B.SELECT_BATTLE)});

}

function tapActivateOpponentChain(player,loc,seq,code){const m=engine?.pending;if(player!==0||engine?.player===0||m?.player!==0||m.type!==M.SELECT_CHAIN||m.forced||offerChain(m)||busy)return false;const matches=legalCardActions(player,loc,seq,code);if(!matches.length)return false;clearTimeout(aiTimer);clearTimeout(manualChainTimer);manualChainTimer=0;manualChainPrompt=null;heldChainPrompt=m;setPreview(code,{dataset:{zone:[player,loc,seq].join(',')}});chooseReaction(matches.map(a=>a.index));return true}

function showCardActions(el,player,loc,seq,code){setPreview(code,el);removeActions();const choices=busy?[]:legalCardActions(player,loc,seq,code);const pop=document.createElement('div');pop.className='action-pop';

 for(const a of choices){const b=document.createElement('button');b.textContent=a.label.split(' · ')[0];b.onclick=e=>{e.stopPropagation();removeActions();stageChoice(a.response,a.label,code,{controller:player,location:loc,sequence:seq})};pop.append(b)}

 const b=document.createElement('button');b.textContent='Inspect';b.onclick=()=>inspect(code);pop.append(b);document.body.append(pop);const r=el.getBoundingClientRect(),h=pop.offsetHeight;pop.style.left=Math.max(3,Math.min(innerWidth-pop.offsetWidth-3,r.left+r.width/2-pop.offsetWidth/2))+'px';pop.style.top=Math.max(4,r.top-h-8)+'px';

}

function selectionEntries(m=engine?.pending){if(!m||m.player!==0)return [];if([M.SELECT_CARD,M.SELECT_TRIBUTE,M.SELECT_SUM].includes(m.type))return m.selects.map((c,i)=>({c,i}));if(m.type===M.SELECT_UNSELECT_CARD)return [...m.select_cards,...m.unselect_cards].map((c,i)=>({c,i}));return []}

function fieldEntry(c){return [L.MZONE,L.SZONE].includes(c.location)}

function defaultTributeSelection(m){if(m?.player!==0||m.type!==M.SELECT_TRIBUTE||tributeDefaultPrompt===m)return;tributeDefaultPrompt=m;pickSet.clear()}

function chooseTarget(n){const m=engine.pending,c=selectionEntries(m).find(x=>x.i===n)?.c;if(!c)return;

 if(attackTargetSelection(m))return respond({type:R.SELECT_CARD,indicies:[n]});

 if(targetKnown(c))setPreview(c.code,{dataset:{zone:[c.controller,c.location,c.sequence].join(',')}});

 if(m.type===M.SELECT_UNSELECT_CARD)return stageChoice({type:R.SELECT_UNSELECT_CARD,index:n},`${n<m.select_cards.length?'Select':'Remove'} ${targetKnown(c)?engine.name(c.code):'hidden card'}`,targetKnown(c)?c.code:0,c);

 if(pickSet.has(n))pickSet.delete(n);else{if(m.max===1)pickSet.clear();if(m.max>0&&pickSet.size+1>m.max)return toast('Maximum selected — deselect a card first.');pickSet.add(n)}

 if(pickSet.size===m.max&&materialStatus(m,pickSet,engine,M).valid)return confirmTargets();

 renderDuel();}



function selectionControls(m){const status=materialStatus(m,pickSet,engine,M);return `<div class="selection-status" role="status">${esc(status.text)}</div>`+(m.type===M.SELECT_UNSELECT_CARD?`${m.can_finish||m.can_cancel?(m.can_finish?duelConfirm('Confirm materials','unselect-done'):duelCancel('Cancel','unselect-done')):''}`:`${duelConfirm('Confirm selection','confirm-target',status.valid?'':'disabled')}${m.can_cancel?duelCancel('Cancel','cancel-target'):''}`)}

function levelChangeMarkup(c){

 const base=Number(card(c?.code)?.level),current=c?.level;

 if(!Number.isInteger(current)||!Number.isFinite(base)||base<1||current<1||current===base)return '';

 return `<span class="level-change" title="Level changed from ${base} to ${current}" aria-label="Level changed from ${base} to ${current}"><img src="assets/icons/level-star.png" alt="">${current}</span>`;

}

function zone(c,player,loc,seq,col,row,label=''){const m=engine.pending,isPlace=m?.player===0&&[M.SELECT_PLACE,M.SELECT_DISFIELD].includes(m.type);const option=isPlace?engine.choices(m).find(a=>a.response.places?.[0]?.player===player&&a.response.places[0].location===loc&&a.response.places[0].sequence===seq):null;

 const target=selectionEntries(m).find(x=>x.c.controller===player&&x.c.location===loc&&x.c.sequence===seq);

 const known=c&&(player===0||!!(c.position&5)||!!engine.knownFieldCard?.(0,{...c,controller:player,location:loc,sequence:seq})),hidden=c&&!(c.position&5),mon=loc===L.MZONE;const attack=c&&legalCardActions(player,loc,seq,c.code).some(a=>a.response.type===R.SELECT_BATTLECMD&&a.response.action===B.SELECT_BATTLE);

 return `<button class="zone ${player?'enemy':''} ${!c?'empty':''} ${loc===L.SZONE&&seq===5?'field-spell-zone':''} ${mon&&c&&(c.position&12)?'defense':''} ${option||target?'selectable':''} ${target&&pickSet.has(target.i)?'target-picked':''}" style="grid-column:${col};grid-row:${row}" data-zone="${player},${loc},${seq}" ${target?`data-field-target="${target.i}"`:''} ${known?`data-code="${c.code}" data-preview="${c.code}"`:''}>${c?`<img src="${hidden?'assets/card-back.jpg':image(c.code)}" alt="${known?esc(card(c.code)?.name):'Face-down card'}">`:loc===L.SZONE&&seq===5?'<span class="field-spell-icon" aria-hidden="true"></span>':esc(label||'')}${known&&mon&&!hidden?`<span class="power"><b data-stat="attack" data-value="${c.attack}" class="${c.attack>(card(c.code)?.atk??c.attack)?'stat-up':c.attack<(card(c.code)?.atk??c.attack)?'stat-down':''}">${c.attack}</b> / <b data-stat="defense" data-value="${c.defense}">${c.defense}</b></span>`:''}${known&&!hidden?cardCountersMarkup(c):''}${known&&mon?levelChangeMarkup(c):''}${attack?'<span class="sword" role="img" aria-label="Can attack" title="Can attack"></span>':''}</button>`;

}

function pile(player,kind,col,row){const p=snapshot.players[player],items=p[kind],count=Array.isArray(items)?items.length:items;const name={deck:'Deck',extra:'Extra',grave:'Graveyard',banished:'Banished'}[kind];const top=Array.isArray(items)?items.filter(Boolean).at(-1):null;const shown=kind==='deck'?p.deckTop:top&&(kind==='grave'||top.position&5)?top.code:null;const visible=!!shown;const img=count?(visible?image(shown):'assets/card-back.jpg'):null;return `<button class="zone pile${kind==='deck'&&count>10?' stacked':''}" style="grid-column:${col};grid-row:${row}" data-pile="${player},${kind}" ${visible?`data-preview="${shown}"`:''}>${img?`<img src="${img}">`:''}<span class="count">${count||0}</span><span class="zone-name">${name}</span></button>`}

const phases=[[1,'DP'],[2,'SP'],[4,'MP1'],[8,'BP'],[256,'MP2'],[512,'EP']];

function phaseName(phase){return phase>=8&&phase<256?'BATTLE PHASE':({1:'DRAW PHASE',2:'STANDBY PHASE',4:'MAIN PHASE 1',256:'MAIN PHASE 2',512:'END PHASE'})[phase]||'DUEL'}

let battleBlockedUntil=0,battleUnlockTimer;

function guardBattleAfterCancel(){battleBlockedUntil=performance.now()+500;clearTimeout(battleUnlockTimer);document.querySelectorAll('[data-phase="8"]').forEach(b=>b.disabled=true);battleUnlockTimer=setTimeout(()=>{if(screen==='duel')document.querySelectorAll('[data-phase="8"]').forEach(b=>b.disabled=!phaseAction(8))},510)}

document.addEventListener('click',e=>{if(screen==='duel'&&e.target.closest('.duel-cancel,.reaction-decline'))guardBattleAfterCancel()},true);

function phaseAction(phase){if(phase===8&&performance.now()<battleBlockedUntil)return null;const m=engine.pending;if(m?.player!==0)return null;return engine.choices().find(a=>!a.code&&((phase===8&&a.response.type===R.SELECT_IDLECMD&&a.response.action===I.TO_BP)||(phase===256&&a.response.type===R.SELECT_BATTLECMD&&a.response.action===B.TO_M2)||(phase===512&&((a.response.type===R.SELECT_IDLECMD&&a.response.action===I.TO_EP)||(a.response.type===R.SELECT_BATTLECMD&&a.response.action===B.TO_EP)))))}

function normalTributeSelection(m){return !!m&&m.player===0&&m.type===M.SELECT_TRIBUTE&&!!engine.materialSubject&&m.selects.length>0&&m.selects.every(c=>c.location===L.MZONE);}

function attackTargetSelection(m){return !!m&&m.player===0&&m.type===M.SELECT_CARD&&engine.selectionHint===549&&engine.attacker?.player===m.player&&m.selects?.length>0&&m.selects.every(c=>c.controller!==m.player&&c.location===L.MZONE);}

function fieldSelectBare(m){return !!m&&m.player===0&&selectionEntries(m).some(x=>fieldEntry(x.c));}

function fieldSelectionControls(m){if(m?.type===M.SELECT_UNSELECT_CARD)return `${m.can_finish?duelConfirm('Finish selection','unselect-done'):''}${m.can_cancel?duelCancel('Cancel','cancel-target'):''}`;const status=materialStatus(m,pickSet,engine,M);return `${duelConfirm('Confirm selection','confirm-target',status.valid?'':'disabled')}${m.can_cancel?duelCancel('Cancel','cancel-target'):''}`}

function renderDuel(){if(!snapshot)return;const inspectionScroll=document.querySelector('.duel>.inspection')?.scrollTop||0;const previousCounters=new Map([...document.querySelectorAll('.zone .card-counter')].map(el=>[el.closest('.zone').dataset.zone+':'+el.dataset.counterKind,Number(el.dataset.count)]));const s=snapshot,r=state.run,m=engine.pending;defaultTributeSelection(m);const displayTurn=Math.max(0,s.turn-(r.first_player===1?1:0));const handCount=s.players[0].hand.filter(Boolean).length;const handCardWidth=Math.min(100/7,100/(handCount-.3*(handCount-1)));const handOverlap=Math.max(0,(handCount*handCardWidth-100)/Math.max(1,handCount-1));const handStyle=handCount>7?' style="--hand-card-width:'+handCardWidth.toFixed(4)+'%;--hand-overlap:'+handOverlap.toFixed(4)+'%"':'';const [own,opponent]=s.tag?activeTagCharacters(content,tagUI.view,s.tag):[character(),content.characters[r.opponent]];const rows=[];

 rows.push(collectorResponseOverlay(s,tagUI?.isCollector));

 // Opponent sits across the table: their main deck is on our left, zones reverse.

 rows.push(pile(1,'deck',2,1),pile(1,'extra',8,1),pile(1,'grave',2,2),pile(1,'banished',1,2),zone(s.players[1].spells[5],1,L.SZONE,5,8,2,'Field'));

 for(let i=0;i<5;i++){rows.push(zone(s.players[1].spells[i],1,L.SZONE,i,7-i,1),zone(s.players[1].monsters[i],1,L.MZONE,i,7-i,2));rows.push(zone(s.players[0].monsters[i],0,L.MZONE,i,i+3,4),zone(s.players[0].spells[i],0,L.SZONE,i,i+3,5))}

 rows.push(zone(s.players[0].spells[5],0,L.SZONE,5,2,4,'Field'),pile(0,'extra',2,5),pile(0,'grave',8,4),pile(0,'banished',9,4),pile(0,'deck',8,5));

 rows.push(`<button id="chain-toggle" data-do="toggle-chain" class="chain-control ${(!heldAlwaysChain&&(rightClickNoChain||chainMode==='never'))?'chain-disabled':!heldAlwaysChain&&!rightClickNoChain&&chainMode==='sometimes'?'chain-sometimes':''}" aria-label="Chain prompts" aria-pressed="${heldAlwaysChain?'true':rightClickNoChain?'false':chainMode==='sometimes'?'mixed':chainMode==='always'}" title="${chainLabel()}" style="grid-column:9;grid-row:5"><img src="textures/chain.png" alt=""><span>${chainLabel()}</span></button>`);

 rows.push(`<div class="phases">${phases.map(([n,label])=>`<button data-phase="${n}" class="${(n===8?s.phase>=8&&s.phase<256:s.phase===n)?'active':''}" ${phaseAction(n)?'':'disabled'}>${label}</button>`).join('')}${fieldSelectBare(m)&&!attackTargetSelection(m)&&selectionEntries(m).every(x=>fieldEntry(x.c))?fieldSelectionControls(m):''}</div>`);

renderDuelDOM(app,`<div class="duel"><aside class="inspection">${previewMarkup()}</aside><div class="portrait-relics">${duelCurseMarkup()}${relicIndicatorMarkup()}</div><section class="duel-main"><div class="duel-particles" aria-hidden="true">${Array.from({length:14},(_,i)=>`<i style="--x:${(i*37+7)%100}%;--y:${(i*19+3)%100}%;--delay:-${i*1.7}s;--duration:${10+i%6}s"></i>`).join('')}</div><div class="lpbar"><div class="life"><strong>${s.lp[0]}</strong><span>${esc(own.name)}</span></div><div class="turn">TURN<b>${displayTurn}</b></div><div class="life enemy"><span>${r.encore_active?'World Champion':esc(opponent.name)}</span><strong>${s.lp[1]}</strong></div></div><div class="field-wrap"><div class="enemy-hand">${s.players[1].hand.map(c=>engine.handRevealed?.(0,c)?`<button data-inspect="${c.code}" aria-label="Inspect revealed card"><img src="${image(c.code)}" alt="${esc(engine.name(c.code))}"></button>`:'<img src="assets/card-back.jpg" alt="Hidden card">').join('')}</div><img class="field-character" src="assets/${opponent.sprite}">${r.fallen_routes?.[r.opponent]?'<span class="uc-opponent-tag uc-field-tag" title="Ultimate Collector opponent">UC</span>':''}<img class="field-character own" data-do="duel-emotes" role="button" tabindex="0" aria-label="Send an emote" src="assets/${own.sprite}"><div class="mat">${rows.join('')}</div></div>${promptMarkup(m)}<div class="hand"${handStyle}>${s.players[0].hand.map((c,i)=>c?`<button data-hand="${i}" data-code="${c.code}" data-preview="${c.code}"><img src="${image(c.code)}" alt="${esc(card(c.code)?.name)}">${levelChangeMarkup(c)}${engine.misprintedHands?.[0]?.has(i)?`<span class="hand-misprint" aria-label="Misprinted card">Misprint · ${c.attack} / ${c.defense}</span>`:''}</button>`:'').join('')}</div><div class="duel-tools duel-tools-left">${relicIndicatorMarkup()}</div><div class="duel-tools duel-tools-right">${tagUI?`<span class="duel-room-code" aria-label="Room code">${esc(tagUI.session?.code||'')}</span>`:''}${btn('Options','duel-options')}</div></section></div>`);

 polishDuel(app,engine,s,card);
 juice.syncDuel(app,{turnPlayer:s.player,deck:Array.isArray(s.players[0].deck)?s.players[0].deck.length:s.players[0].deck,handLimit:handSizeLimit(s)});

 tagUI?.drawTurnTimer?.();positionDuelEmotes();

 syncModalChain();

 decorateReactions();

 decorateEquipTarget();

 decorateEffectTargets(app,s.effectTargets);

 const inspection=document.querySelector('.duel>.inspection');if(inspection)inspection.scrollTop=inspectionScroll;

 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)for(const el of document.querySelectorAll('.zone .card-counter')){const old=previousCounters.get(el.closest('.zone').dataset.zone+':'+el.dataset.counterKind)||0;if(Number(el.dataset.count)>old)el.animate(compatibilityEnabled()?[{transform:'scale(1.5)'},{transform:'scale(1)'}]:[{transform:'scale(1.5)',filter:'brightness(2)'},{transform:'scale(1)',filter:'none'}],{duration:500});}

 const field=[...s.players[0].spells.slice(5,6),...s.players[1].spells.slice(5,6)].find(c=>c&&c.position&5);if(field){const duel=document.querySelector('.duel');if(!duel.classList.contains('has-field'))duel.classList.add('has-field');const art=`linear-gradient(#04171988,#031017aa),url('assets/fields/${field.code}.jpg')`;if(duel.dataset.fieldArt!==String(field.code)){duel.style.setProperty('--active-field-art',art);duel.dataset.fieldArt=String(field.code)}}else{const duel=document.querySelector('.duel');if(duel.classList.contains('has-field'))duel.classList.remove('has-field');if(duel.style.getPropertyValue('--active-field-art'))duel.style.removeProperty('--active-field-art');if(duel.dataset.fieldArt)delete duel.dataset.fieldArt}

}

// Your hand size limit, as the run's relics set it (approved_relic_effects.py, passives.py): Starving
// Library 3, Empty-Hand Pact 4, none on turn 1 when the opponent goes first. Tag duels keep the rule's 6.
function handSizeLimit(s){
 const r=state.run;if(snapshot?.tag||!r)return 6;
 if(r.first_player===1&&s.turn===1)return 99;
 const has=key=>r.challenge_level!==-1&&(r.artifacts?.includes(key)||r.mirror_copy===key);
 return has('cursed_starving_library')?3:has('cursed_empty_hand_pact')?4:6;
}

const lpPulseAnimations=new WeakMap();
function pulseDuelLP(player,owner){if(compatibilityEnabled()||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const life=document.querySelector(player===1?'.lpbar .life.enemy strong':'.lpbar .life:not(.enemy) strong');if(!life)return;lpPulseAnimations.get(life)?.cancel();const animation=life.animate([{transform:'scale(1) rotate(0deg)'},{transform:'scale(1.22) rotate(-4deg) translateX(-1px)',offset:.38},{transform:'scale(.96) rotate(3deg) translateX(1px)',offset:.72},{transform:'scale(1) rotate(0deg)'}],{duration:300,easing:'cubic-bezier(.2,.8,.25,1)'});lpPulseAnimations.set(life,animation);trackDuelAnimation(owner,animation.finished.catch(()=>{}).then(()=>{animation.cancel();if(lpPulseAnimations.get(life)===animation)lpPulseAnimations.delete(life)}));}
async function playFusionSummonAnimation(cue,field,owner){
  const materials=(cue.materials?.length?cue.materials:(cue.materialCards||[]).map(c=>c.code)).filter(code=>Number(code)>0&&(Number(owner.data?.[Number(code)]?.type)&1)).slice(0,5),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const box=field.getBoundingClientRect();
 if(!box.width||!box.height)return;const duelMain=field.closest('.duel-main');duelMain?.classList.add('fusion-animating');document.body.classList.add('fusion-animating');
 const hiddenMaterials=[];for(const c of cue.materialCards||[]){const node=c.location===L.MZONE?document.querySelector(`[data-zone="${c.controller},${c.location},${c.sequence}"]`):c.location===L.HAND?document.querySelector(`${c.controller===0?'.hand':'.enemy-hand'} [data-hand="${c.sequence}"]`):null;if(node){hiddenMaterials.push([node,node.style.visibility]);node.style.visibility='hidden'}}
 const target=cue.card&&document.querySelector('[data-zone=\"'+cue.card.controller+','+cue.card.location+','+cue.card.sequence+'\"]');
 const targetImage=target?.querySelector('img'),oldVisibility=targetImage?.style.visibility;
 if(targetImage)targetImage.style.visibility='hidden';target?.classList.add('fusion-summon-target');
 const overlay=document.createElement('div');
 Object.assign(overlay.style,{position:'fixed',left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px',zIndex:500,pointerEvents:'none',overflow:'visible',perspective:compatibilityEnabled()?'none':'900px'});
 document.body.append(overlay);
 const animations=[];
 try{
  // The wait below is wall-clock time; fit the slowed animations inside it so the result card shows.
   const radius=Math.min(box.width*.2,box.height*.3,165),width=Math.min(112,Math.max(54,box.width*.11)),duration=reduced?720:2000,span=wallMs(duration);
  const materialTransform=(angle,scale)=>'translate(-50%,-50%) rotate('+angle+'deg) translateX('+radius+'px) rotate('+(-angle)+'deg) scale('+scale+')';
  materials.forEach((code,index)=>{
   const angle=360*index/materials.length-90,cardEl=document.createElement('img');
    cardEl.alt='Fusion material';cardEl.src=code?image(code):'assets/card-back.jpg';
   Object.assign(cardEl.style,{position:'absolute',left:'50%',top:'50%',width:width+'px',aspectRatio:'421 / 614',objectFit:'cover',border:'2px solid #e2c77e',borderRadius:'5px',boxShadow:'0 8px 22px #000b',backfaceVisibility:'hidden',transformOrigin:'center'});
   overlay.append(cardEl);
    const anim=cardEl.animate(reduced?[
     {opacity:0,transform:materialTransform(angle,1),offset:0},
     {opacity:1,transform:materialTransform(angle,1),offset:.12},
     {opacity:1,transform:materialTransform(angle,1),offset:.48},
     {opacity:0,transform:'translate(-50%,-50%) scale(.8)',offset:.56},
     {opacity:0,transform:'translate(-50%,-50%) scale(.8)',offset:1}
    ]:[
    {opacity:0,transform:materialTransform(angle,.76),offset:0},
    {opacity:1,transform:materialTransform(angle,1),offset:.08},
    {opacity:1,transform:materialTransform(angle+360,1),offset:.68},
    {opacity:1,transform:'translate(-50%,-50%) scale(.82)',offset:.78},
    {opacity:0,transform:'translate(-50%,-50%) scale(.04)',offset:.95},
    {opacity:0,transform:'translate(-50%,-50%) scale(.04)',offset:1}
   ],{duration:span,easing:'cubic-bezier(.45,.05,.55,.95)',fill:'both'});
   animations.push(anim);
  });
  const flash=document.createElement('div');
  Object.assign(flash.style,{position:'absolute',inset:0,opacity:0,background:'radial-gradient(ellipse at center,#fff 0%,#e9fdffdd 9%,#b9f4ff77 24%,transparent 62%)'});
  overlay.append(flash);
   animations.push(flash.animate(reduced?[{opacity:0,offset:0},{opacity:0,offset:.48},{opacity:1,offset:.55},{opacity:.35,offset:.63},{opacity:0,offset:1}]:[{opacity:0,offset:0},{opacity:0,offset:.77},{opacity:1,offset:.80},{opacity:.42,offset:.84},{opacity:0,offset:1}],{duration:span,easing:'ease-out',fill:'both'}));
  const result=document.createElement('img');
  result.alt='Fusion Monster';result.src=image(cue.code);
  Object.assign(result.style,{position:'absolute',left:'50%',top:'50%',width:Math.min(width*1.28,145)+'px',aspectRatio:'421 / 614',objectFit:'cover',border:'2px solid #e2c77e',borderRadius:'6px',boxShadow:'0 0 38px #83edffcc,0 12px 28px #000c',opacity:0,backfaceVisibility:'hidden',transformOrigin:'center'});
  overlay.append(result);
   // Compatibility mode reveals the result flat: no 3D turn (Firefox flicker).
   const flip=deg=>compatibilityEnabled()?'':` rotateY(${deg}deg)`;
   animations.push(result.animate(reduced?[
    {opacity:0,transform:'translate(-50%,-50%) scale(.92)',offset:0},
    {opacity:0,transform:'translate(-50%,-50%) scale(.92)',offset:.9},
    {opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.98},
    {opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:1}
   ]:[
   {opacity:0,transform:'translate(-50%,-50%) scale(.78)'+flip(90),offset:0},
   {opacity:0,transform:'translate(-50%,-50%) scale(.78)'+flip(90),offset:.95},
   {opacity:1,transform:'translate(-50%,-50%) scale(1)'+flip(0),offset:.99},
   {opacity:1,transform:'translate(-50%,-50%) scale(1)'+flip(0),offset:1}
  ],{duration:span,easing:'cubic-bezier(.16,.84,.24,1)',fill:'both'}));
  let remaining=duration;
  while(remaining>0&&engine===owner&&screen==='duel'){
   const step=Math.min(100,remaining);await duelDelay(step);remaining-=step;
  }
 }finally{
  for(const animation of animations)try{animation.cancel()}catch{}
  overlay.remove();
  if(targetImage)targetImage.style.visibility=oldVisibility;for(const [node,visibility] of hiddenMaterials)node.style.visibility=visibility;target?.classList.remove('fusion-summon-target');duelMain?.classList.remove('fusion-animating');document.body.classList.remove('fusion-animating');
 }
}
// Wall-clock time each cue holds the duel; these values set duel pace. Effects that
// outlast them run in the background (android/test_duel_cue_pacing.cjs guards this).
// Every action plays at the opponent's pace; with Faster Animations your own actions use
// the quicker pace (quick), never slower than the opponent's.
function cueWindow(cue,quick){
 const cpu=cue.kind==='phase'?([1,2].includes(Number(cue.phase))?30:24):cue.kind==='turn'?120:cue.kind==='draw'?35:cue.kind==='move'?120:300;
 return (snapshot?.finished&&cue.kind==='attack'?120:0)+(cue.cpuBattleEntry?350:0)+1.2*(quick?Math.min(cpu,cue.kind==='attack'?180:70):cpu);
}

const cueZone=c=>c&&document.querySelector(`[data-zone="${c.controller},${c.location},${c.sequence}"]`);

// Where a cue's card is on screen: a field zone, a pile, or (for flights) a hand row.
function cueAnchor(c,{hand=true}={}){
 if(!c)return null;
 if([L.MZONE,L.SZONE].includes(c.location))return cueZone(c);
 if(c.location===L.HAND)return hand?document.querySelector(c.controller===0?'.hand':'.enemy-hand'):null;
 const pile={[L.DECK]:'deck',[L.GRAVE]:'grave',[L.REMOVED]:'banished',[L.EXTRA]:'extra'}[c.location];
 return pile?document.querySelector(`[data-pile="${c.controller},${pile}"]`):null;
}

// The floating chain button sits outside the board, so it shakes along with it.
function shakeBoard(options){return [document.querySelector('.duel'),document.querySelector('.floating-chain-control')].filter(Boolean).map(el=>shake(el,options))}

// Background effects still finish before the victory settlement reads the board.
function trackMotion(owner,...effects){
 const list=effects.flat().filter(Boolean);
 if(list.length)trackDuelAnimation(owner,Promise.all(list.map(x=>(x.finished||Promise.resolve(x)).catch(()=>{}))).then(()=>{}));
}

async function playDuelCues(playerAction=false,answered=false){
 const presentationOwner=engine,cues=engine.visuals.splice(0),fusionCue=cues.find(c=>c.kind==='fusion-summon'),legendaryShown=new Set(),quick=playerAction&&!!state.settings?.fasterAnimations;
 // A summon plays over the board, so the prompt the player just answered leaves first.
 if(fusionCue||answered&&cues.some(c=>c.kind==='summon'||c.kind==='signature-summon')){for(const prompt of document.querySelectorAll('.duel-main .selection-dialog,.duel-main .field-selection,.duel-main .return-prompt,.duel-main .reaction-prompt,.duel-main .field-reaction,.duel-main .reaction-picker,.duel-main .reaction-orb,.duel-main>.prompt'))prompt.remove();}
 const merged=new Set();
 for(const [index,cue] of cues.entries()){
  if(merged.has(cue))continue;
  if(fusionCue&&cue.kind==='summon'&&Number(cue.code)===Number(fusionCue.code))continue;
  if(fusionCue&&cue.kind==='move'){const targetMove=Number(cue.code)===Number(fusionCue.code)&&cue.from?.location===L.EXTRA&&cue.to?.location===L.MZONE;const materialMove=(fusionCue.materialCards||[]).some(c=>Number(c.code)===Number(cue.code)&&c.controller===cue.from?.controller&&c.location===cue.from?.location&&c.sequence===cue.from?.sequence);if(targetMove||materialMove)continue}
  await waitForInspection();if(engine!==presentationOwner||screen!=='duel'||document.querySelector('.exodia-finale'))break;
  const field=document.querySelector('.field-wrap');if(!field)break;
  if(document.hidden&&!tagUI&&state.settings.pauseWhenHidden===false&&!['reveal','coin','dice'].includes(cue.kind))continue;
  if(!await playDuelCue(cue,{field,playerAction,quick,owner:presentationOwner,legendaryShown,next:cues.slice(index+1),merged}))break;
 }
 if(engine!==presentationOwner||screen!=='duel'){retireChainPanel();return}
 // Chain markers stay on their cards only while the chain is open.
 if(!engine.activeChain?.length){clearChainLinks(document);juice.clearChain()}
 // The chain panel bridges the brief automatic hand-off between chain steps. A closed
 // chain, or a decision for the player, puts it away so it never covers a prompt.
 if(chainPanel){const m=engine.pending,decision=m?.player===0&&!automaticChainResponse(m,!offerChain(m),M,R);if(!engine.activeChain?.length||decision)retireChainPanel();else{clearTimeout(chainPanel.timer);chainPanel.timer=setTimeout(retireChainPanel,700)}}
 if(playerAction)await updateCoinMilestones();else void updateCoinMilestones();if(snapshot?.finished)await finishDuelAnimations(presentationOwner);
}

// One cue. Returns false when the duel view changed and presentation must stop.
async function playDuelCue(cue,{field,playerAction,quick=false,owner,legendaryShown,next=[],merged=new Set()}){
 const motion=motionPreferences(),reduced=motion.reduced;
 // Any other board action takes the centre stage back from the chain panel.
 if(chainPanel&&!['chain','effect-action','flip-reveal','flip-hide','relic'].includes(cue.kind)&&!cue.excavation)retireChainPanel();
 if(cue.kind==='fusion-summon'){duelSfx.cue(cue);await playFusionSummonAnimation(cue,field,owner);return true}
 if(cue.kind==='flip-reveal'){
  const c=cue.card,z=cueZone(c),live=c&&engine.query(c.controller,c.location)?.[c.sequence],code=Number(cue.code)||Number(live?.code)||Number(z?.dataset.code)||0,img=z?.querySelector('img');
  if(z&&img&&code){z.classList.remove('empty');z.dataset.code=String(code);z.dataset.preview=String(code);img.alt=card(code)?.name||'Revealed card';const src=image(code);if(img.getAttribute('src')!==src){duelSfx.cue(cue);trackMotion(owner,flipCard(img,src,{reduced}))}}
  return true;
 }
 // The flip-reveal swapped the zone's own image, so turning face-down again must swap it back.
 if(cue.kind==='flip-hide'){
  const img=cueZone(cue.card)?.querySelector('img'),back='assets/card-back.jpg';
  if(img&&(img.dataset.flipTo||img.getAttribute('src'))!==back){duelSfx.cue(cue);trackMotion(owner,flipCard(img,back,{reduced}))}
  return true;
 }
 if(cue.kind==='lethal-hit'){
  // One impact: the damage that follows lands now, with a single heavy shake and its number.
  const hit=next.find(c=>c.kind==='lp'&&c.player===cue.player);if(hit)merged.add(hit);
  const life=document.querySelector(cue.player===1?'.life.enemy .life-value, .life.enemy strong':'.life .life-value, .life strong');
  if(hit)playLifeCue(hit,{field,owner,motion,lethal:true});else duelSfx.cue(cue);
  if(life&&!reduced){
   if(!hit){if(!compatibilityEnabled())trackMotion(owner,shakeBoard({strength:6,duration:380}));trackMotion(owner,lifeImpact(life.closest('.life'),field,{player:cue.player,heavy:true,...motion}))}
   const animation=life.animate([{filter:'brightness(1)',textShadow:'0 0 0 transparent',transform:'scale(1)'},{filter:'brightness(1.8)',textShadow:'0 0 18px #ff583f',transform:'scale(1.13)'},{filter:'brightness(1)',textShadow:'0 0 0 transparent',transform:'scale(1)'}],{duration:520,easing:'ease-out'});await animation.finished.catch(()=>{});animation.cancel();
  }
  return true;
 }
 if(cue.kind==='signature-summon'){
  if(!legendaryShown.has(cue.code)&&!reduced){const z=cueZone(cue.card);if(z){duelSfx.cue(cue);trackMotion(owner,summonImpact(z,{method:'special',color:'#75e7ff',animateCard:false,...motion}));const animation=z.animate([{boxShadow:'0 0 0 transparent',filter:'brightness(1)'},{boxShadow:'0 0 24px 5px #75e7ff',filter:'brightness(1.35)'},{boxShadow:'0 0 0 transparent',filter:'brightness(1)'}],{duration:620,easing:'ease-out'});await animation.finished.catch(()=>{});animation.cancel()}}
  return true;
 }
 if(cue.kind==='summon'&&await playLegendarySummon(cue.code,{field,image,sound:duelSound,music:summonTrack,paused:inspectionPaused,active:()=>engine===owner&&screen==='duel'&&!(document.hidden&&!tagUI&&state.settings.pauseWhenHidden===false),reduced})){legendaryShown.add(cue.code);return true}
 if(cue.kind==='relic'){pulseRelic(app,cue.relic);return true}
 if(cue.kind==='chain')return playChainCue(cue,{field,owner,motion});
 if(cue.kind==='effect-action'||cue.excavation){
  duelSfx.cue(cue);
  if(cue.negated)for(const c of cue.cards||[])trackDuelAnimation(owner,negateCard(cueZone(c),reduced));
  if(cue.text==='Deck shuffled'&&cue.player!=null)trackMotion(owner,shufflePile(document.querySelector(`[data-pile="${cue.player},deck"]`),{reduced}));
  const feedback=playEffectFeedback(cue,{field,image,esc,reduced,fast:cue.player===1});if(cue.statChange)trackDuelAnimation(owner,feedback);else await feedback;
  return true;
 }
 if(cue.kind==='reveal'&&!cue.public&&engine.pending?.type===M.SELECT_CARD&&engine.pending.selects?.some(c=>c.controller!==0&&c.location===L.HAND))return true;
 if(cue.kind==='reveal'){duelSfx.cue(cue);dialog(cue.text,`<div class="cardgrid">${cue.cards.map(c=>cardButton(c.code,`data-inspect="${c.code}"`)).join('')}</div>`);await new Promise(resolve=>modal.addEventListener('close',resolve,{once:true}));return true}
 if(cue.kind==='dice'||cue.kind==='coin'){
  // Nothing competes with a toss: the prompt that called it, other prompts, banners and the
  // chain panel stay hidden until it lands (mobile.css: body.toss-animating).
  retireChainPanel();document.body.classList.add('toss-animating');
  try{if(cue.player===0&&!await waitForTossStart(field,cue.kind,()=>screen==='duel'&&engine===owner))return false;await play3DToss(field,cue.kind,cue.results,{wait:duelDelay,active:()=>screen==='duel'&&engine===owner,sound:duelSound})}
  finally{document.body.classList.remove('toss-animating')}
  return true;
 }
 if(cue.kind==='lp'){playLifeCue(cue,{field,owner,motion});return true}
 return playBoardCue(cue,{field,playerAction,quick,owner,motion});
}

// One chain panel stays up while chain cues follow one another, so an activation and its
// resolution read as one steady banner that updates in place instead of blinking twice.
let chainPanel=null;
function retireChainPanel(){
 const panel=chainPanel;chainPanel=null;if(!panel)return;clearTimeout(panel.timer);if(!panel.el.isConnected)return;
 const opacity=Number(getComputedStyle(panel.el).opacity);panel.el.getAnimations().forEach(a=>a.cancel());
 panel.el.animate([{opacity:Number.isFinite(opacity)?opacity:1},{opacity:0}],{duration:wallMs(160),fill:'forwards'}).finished.catch(()=>{}).finally(()=>panel.el.remove());
}

// Chain link: a numbered marker on the activating card until the link resolves.
async function playChainCue(cue,{field,owner,motion}){
 const reduced=motion.reduced,color=activationColor(engine.data?.[Number(cue.code)]?.type),anchor=cueAnchor(cue.card,{hand:false});
 duelSfx.cue(cue);
 // Link numbers only matter once something chains: link 1 stays unnumbered until link 2.
 if(cue.stage==='activate'){if(anchor)trackMotion(owner,showChainLink(anchor,cue.link,{color,quiet:cue.link===1,...motion}));if(cue.link>1)revealChainLinks(document,{reduced});juice.chainLink(anchor,cue.link)}
 else resolveChainLink(document,cue.link,{negated:cue.stage==='negated',reduced});
 const stage=cue.stage==='resolve'?'Resolving':cue.stage==='negated'?'Negated':'Activated';
 let panel=chainPanel?.el.isConnected&&chainPanel.field===field&&chainPanel.owner===owner?chainPanel:null;
 if(panel){
  clearTimeout(panel.timer);const img=panel.el.querySelector('img'),src=image(cue.code);if(img.getAttribute('src')!==src)img.src=src;
  panel.el.querySelector('b').textContent=`⛓ Chain ${cue.link}`;panel.el.querySelector('strong').textContent=cue.text;panel.el.querySelector('small').textContent=stage;panel.el.style.setProperty('--fx-color',color);
 }else{
  retireChainPanel();
  const el=document.createElement('div');el.className='duel-cue chain-cue';el.setAttribute('role','status');el.style.setProperty('--fx-color',color);el.innerHTML=`<img src="${image(cue.code)}" alt=""><div><b>⛓ Chain ${cue.link}</b><strong>${esc(cue.text)}</strong><small>${stage}</small></div>`;field.append(el);
  if(!reduced)el.animate([{opacity:0,transform:'scale(.94)'},{opacity:1,transform:'scale(1)'}],180);
  panel=chainPanel={el,field,owner,timer:0};
 }
 if(cue.stage==='negated'){const z=cueZone(cue.card),subject=z&&Number(z.dataset.code)===cue.code?z:panel.el;trackDuelAnimation(owner,negateCard(subject,reduced));trackMotion(owner,negationSlash(subject===panel.el?panel.el.querySelector('img'):subject,{reduced}))}
 // The opponent's chain pace is also the quicker one, so it applies to every chain step.
 await duelDelay(cue.stage==='resolve'?350:250);return true;
}

// LP change: floating amount sized by the amount, life-bar flash and a glow at that player's side. Never
// blocks. From 1000 damage the board shakes, harder for bigger blows; exact lethal (lethal: played by the
// lethal-hit cue) is a clean blade cut instead. A blow that takes the opponent's last LP starts a finisher
// (juice.js), which finishDuelAnimations waits for.
function playLifeCue(cue,{field,owner,motion,lethal=false}){
 const damage=cue.amount<0?-cue.amount:0,tier=damage?juice.damageTier(damage):0,perfect=lethal||cue.player===1&&damage>0&&damage===cue.before;
 const el=document.createElement('div');el.className='float-lp '+(cue.player?'enemy ':'')+(cue.amount>0?'heal':'');el.textContent=(cue.amount>0?'+':'')+cue.amount;juice.scaleNumber(el,Math.abs(cue.amount),cue.amount>0);
 pulseDuelLP(cue.player,owner);duelSfx.cue(cue);
 const life=document.querySelector(cue.player===1?'.lpbar .life.enemy':'.lpbar .life:not(.enemy)');
 if(life&&!motion.reduced)trackMotion(owner,lifeImpact(life,field,{player:cue.player,heal:cue.amount>0,heavy:lethal||!!cue.directDamage||cue.amount<=-2000,lite:motion.lite||!!cue.cost&&!lethal}));
 if(tier>=3&&!perfect&&!compatibilityEnabled()&&!motion.reduced&&!motion.lite){const impacts=shakeBoard({strength:[5,8,11][tier-3],duration:wallMs([300,380,480][tier-3])});trackDuelAnimation(owner,Promise.all(impacts.map(a=>a.finished.catch(()=>{}))).then(()=>impacts.forEach(a=>a.cancel())))}
 if(damage&&!cue.cost)juice.hit(cue.player,damage,cue.before);else if(cue.amount>0)juice.heal(cue.player,cue.amount);
 const r=field.getBoundingClientRect(),nearby=document.querySelectorAll('.float-lp'+(cue.player?'.enemy':':not(.enemy)')).length,lane=nearby%3,delay=lane*100+Math.random()*70;
 Object.assign(el.style,{position:'fixed',left:r.left+r.width*(.40+lane*.10+(Math.random()-.5)*.025)+'px',top:r.top+r.height*(cue.player?.23:.68)+(Math.random()-.5)*18+'px',zIndex:250,animationDelay:delay+'ms',animationFillMode:'both'});
 document.body.append(el);trackDuelAnimation(owner,duelDelay(1800+delay).then(()=>el.remove()));
}

// Board cues: turns, phases, summons, sets, attacks, draws and moves.
async function playBoardCue(cue,{field,playerAction,quick,owner,motion}){
 const reduced=motion.reduced,pace=cueWindow(cue,quick),removal=cue.kind==='move'?removalKind(cue.reason):null,cueAnimations=[];
 let label=['set','summon','attack','move','draw'].includes(cue.kind)?'':cue.text||'',beam,moving,caption,attackNodes=[];
 duelSfx.cue(cue,removal);
 if(cue.kind==='turn')label=snapshot.tag?`${snapshot.tag.names[cue.player][snapshot.tag.activeSeats[cue.player]]}’S TURN`:cue.player===0?'YOUR TURN':'OPPONENT’S TURN';
 if(cue.kind==='phase'){label=phaseName(cue.phase);trackMotion(owner,phaseGlint(document.querySelector(`.phases [data-phase="${cue.phase>=8&&cue.phase<256?8:cue.phase}"]`),{reduced}))}
 // Banners fade on their own clock. Rapid CPU phase steps only light the phase strip.
 if(label&&(cue.kind!=='phase'||playerAction||cue.cpuBattleEntry)){
  const el=document.createElement('div');el.className='duel-cue'+(cue.kind==='turn'?' turn-cue':'');el.textContent=label;
  if(cue.kind==='turn')el.insertAdjacentHTML('beforeend','<i class="cue-sweep" aria-hidden="true"></i>');
  trackMotion(owner,showBanner(field,el,{visibleMs:Math.max(pace,cue.kind==='turn'?950:cue.kind==='phase'?700:1100),priority:cue.kind==='turn'?2:1,reduced}));
 }
 if(cue.kind==='summon'||cue.kind==='set'){
  const z=cueZone(cue.card),method=cue.kind==='summon'?cue.method||'normal':/position/.test(cue.text||'')?'position':'set';
  if(z)trackMotion(owner,summonImpact(z,{method,color:cue.kind==='set'?'#cfe6ff':attributeColor(engine.data?.[Number(cue.code)]?.attribute),...motion}));
  // Level 5+ lands heavier (dust, then a shake from 7); the low byte holds the Level, Rank or Link rating.
  if(z&&cue.kind==='summon')juice.summonWeight(z,Number(engine.data?.[Number(cue.code)]?.level)&0xff);
 }
 if(cue.kind==='move'||cue.kind==='draw'){
  const source=cueAnchor(cue.from),target=cueAnchor(cue.to),duration=cue.kind==='draw'?35:quick?100:260;let hold=0;
  // The move caption stays where it was readable (CPU moves) and fades instead of popping;
  // shorter windows only ever flashed it.
  const shown=Math.max(pace,duration*(globalThis.presentationScale||1));
  if(shown>=200){const destinations={[L.HAND]:'hand',[L.DECK]:'Deck',[L.GRAVE]:'Graveyard',[L.REMOVED]:'banished cards',[L.EXTRA]:'Extra Deck',[L.MZONE]:'monster zone',[L.SZONE]:'Spell/Trap zone'};caption=document.createElement('div');caption.className='duel-cue';caption.textContent=cue.kind==='draw'?'Draw card':removal==='destroy'?'Destroyed':removal==='tribute'?'Tributed':`Card moved to ${destinations[cue.to?.location]||'another zone'}`;field.append(caption);fadeOutWithin(caption,shown,80)}
  if(removal&&source){const fx=playRemovalFeedback(removal,source,motion);trackMotion(owner,fx.animations);if(fx.hide){cueAnimations.push(fx.hide);hold=removal==='destroy'?.32:.22}}
  if(source&&target){
   // A card that lands face-down flies face-down; one landing in Defense Position flies sideways.
   const faceDown=[L.MZONE,L.SZONE].includes(cue.to?.location)&&!(cue.to.position&5),sideways=cue.to?.location===L.MZONE&&!!(cue.to.position&12);
   const flight=cardFlight(source,target,{src:cue.code&&!faceDown?image(cue.code):'assets/card-back.jpg',duration,hold,turn:sideways?90:0,endScale:sideways?.85:1,reduced,simple:motion.compat});
   moving=flight.el;cueAnimations.push(flight.animation);
   if([L.DECK,L.GRAVE,L.REMOVED,L.EXTRA].includes(cue.to?.location))flight.animation.finished.then(()=>trackMotion(owner,landingPulse(target,{reduced})),()=>{});
  }
 }
 if(cue.kind==='attack'){
  const source=cueZone(cue.card),target=(cue.target?.location===L.MZONE?cueZone(cue.target):null)||document.querySelector(cue.card.controller===0?'.enemy-hand':'.hand');
  if(source&&target){
   attackNodes=[[source,'attack-source'],[target,'attack-target']];for(const [node,cls] of attackNodes)node.classList.add(cls);
   const a=source.getBoundingClientRect(),b=target.getBoundingClientRect(),x=a.x+a.width/2,y=a.y+a.height/2,dx=b.x+b.width/2-x,dy=b.y+b.height/2-y,strike=Math.min(650,pace);
   // The streak now spans the attack window instead of being cut at its brightest.
   beam=document.createElement('div');beam.className='attack-beam';Object.assign(beam.style,{left:x+'px',top:y+'px',width:Math.hypot(dx,dy)+'px',transform:`rotate(${Math.atan2(dy,dx)}rad)`,animationDuration:strike+'ms'});document.body.append(beam);
   cueAnimations.push(source.animate(compatibilityEnabled()?[{boxShadow:'0 0 0 transparent'},{boxShadow:'0 0 26px #ffd06b'},{boxShadow:'0 0 0 transparent'}]:[{filter:'brightness(1)'},{filter:'brightness(2.5)'},{filter:'brightness(1)'}],strike),target.animate([{boxShadow:'0 0 0 transparent'},{boxShadow:'0 0 35px #ff593b'},{boxShadow:'0 0 0 transparent'}],Math.min(750,pace)));
   trackMotion(owner,attackStrike(source,target,{duration:strike,...motion}));
  }
 }
 // Let the compositor finish before removing flights or advancing to the next action.
 await Promise.all([duelDelay(pace),...cueAnimations.map(animation=>animation.finished.catch(()=>{}))]);for(const animation of cueAnimations)animation.cancel();
 const clear=()=>{for(const [node,cls] of attackNodes)node.classList.remove(cls);beam?.remove();moving?.remove();caption?.remove()};
 if(engine!==owner||screen!=='duel'){clear();return false}
 if(cue.kind==='move'&&[L.MZONE,L.SZONE].includes(cue.from?.location)){const source=cueZone(cue.from);source?.querySelector('img')?.remove();source?.classList.add('empty')}
 if(cue.kind==='move'&&[L.MZONE,L.SZONE].includes(cue.to?.location)){const z=cueZone(cue.to);if(z){const old=z.querySelector('img');old?.remove();const img=document.createElement('img');img.src=(cue.to.position&5)&&cue.code?image(cue.code):'assets/card-back.jpg';z.prepend(img);z.classList.remove('empty');z.classList.toggle('defense',cue.to.location===L.MZONE&&!!(cue.to.position&12))}}
 clear();return true;
}

function targetKnown(c){return c.code&&(engine.handRevealed?.(0,c)||engine.knownFieldCard?.(0,c)||c.controller===0||c.location===L.GRAVE||((c.location!==L.HAND&&c.location!==L.DECK&&c.location!==L.EXTRA)&&!!(c.position&5)))}

let stagedChoice=null;

function promptKey(){return tagUI?snapshot?.tag?.responseNumber:engine?.pending}

function stageChoice(response,label,code=0,source=null){

 if(code)setPreview(code,source?{dataset:{zone:[source.controller,source.location,source.sequence].join(',')}}:null);

 const m=engine.pending;

 const reviewChain=(m?.type===M.SELECT_CHAIN&&Number.isInteger(response.index)&&response.index>=0)||(m?.type===M.SELECT_EFFECTYN&&response.yes===true);

 const reviewEffect=m?.type===M.SELECT_OPTION&&(m.options?.length||engine.choices(m).length)>1;

 if(!reviewChain&&!reviewEffect)return respond(response);

 stagedChoice={response,label,key:promptKey()};reactionGroup=null;

 renderDuel();

}



// Chain/activation decisions live on the board instead of covering it.

let reactionGroup=null,reactionPrompt=null;

function reactionChoices(m=engine?.pending,allowHidden=false){

 if(!m||m.player!==0||![M.SELECT_CHAIN,M.SELECT_EFFECTYN].includes(m.type)||(m.type===M.SELECT_CHAIN&&!allowHidden&&!offerChain(m)))return [];

 return engine.choices(m).map((choice,index)=>({choice,index,source:m.type===M.SELECT_CHAIN?m.selects?.[choice.response.index]:m})).filter(x=>m.type===M.SELECT_CHAIN?Number.isInteger(x.choice.response.index)&&x.choice.response.index>=0:x.choice.response.yes===true);

}

function reactionSelected(x){return !!stagedChoice&&stagedChoice.key===promptKey()&&JSON.stringify(stagedChoice.response)===JSON.stringify(x.choice.response)}

function reactionAnchor(c){

 if(!c)return null;

 if(c.location===L.HAND&&(c.controller??c.player)===0){

  const hand=document.querySelector(`.hand [data-hand="${c.sequence}"]`);

  return hand&&(!c.code||Number(hand.dataset.code)===Number(c.code))?hand:null;

 }

 if([L.MZONE,L.SZONE].includes(c.location))return document.querySelector(`[data-zone="${c.controller??c.player},${c.location},${c.sequence}"]`);

 const pile=c.location===L.GRAVE?'grave':c.location===L.REMOVED?'banished':null;

 return pile?document.querySelector(`[data-pile="${c.controller??c.player},${pile}"]`):null;

}

function chooseReaction(indices){

 const entries=reactionChoices().filter(x=>indices.includes(x.index));if(!entries.length)return;

 if(entries.length===1){const x=entries[0];return stageChoice(x.choice.response,x.choice.label,x.choice.code||x.source?.code||0,x.source)}

 reactionGroup=entries.map(x=>x.index);renderDuel();

}

const reactionLabels=new WeakMap();

function decorateReactions(){

 document.querySelectorAll('.reaction-available:not(.reaction-orb),.reaction-picked:not(.reaction-orb)').forEach(el=>{el.classList.remove('reaction-available','reaction-picked');delete el.dataset.reactions;el.removeAttribute('aria-pressed');const label=reactionLabels.get(el);if(label!=null)el.setAttribute('aria-label',label);else el.removeAttribute('aria-label');reactionLabels.delete(el)});

 const controls=document.querySelector('.field-reaction'),strip=document.querySelector('.phases'),field=controls?.offsetParent;

 if(controls&&strip&&field){const a=strip.getBoundingClientRect(),b=field.getBoundingClientRect(),zone=document.querySelector('.mat [data-zone]')?.getBoundingClientRect();controls.style.left=(a.left+a.width/2-b.left)+'px';controls.style.top=(a.top+a.height/2-b.top)+'px';if(zone)controls.style.setProperty('--reaction-spacing',(zone.width+5)+'px');}

 const entries=reactionChoices();if(!entries.length)return;

 const groups=new Map();for(const x of entries){const el=reactionAnchor(x.source);if(el){if(!groups.has(el))groups.set(el,[]);groups.get(el).push(x)}}

 for(const [el,list] of groups){reactionLabels.set(el,el.getAttribute('aria-label'));el.classList.add('reaction-available');el.classList.toggle('reaction-picked',list.some(reactionSelected));el.dataset.reactions=list.map(x=>x.index).join(',');el.setAttribute('aria-label',list.length===1?list[0].choice.label:`Choose from ${list.length} available effects`);el.setAttribute('aria-pressed',String(list.some(reactionSelected)))}

 // Choices without a visible card or pile anchor use an orb.

 const other=entries.filter(x=>!reactionAnchor(x.source)),orb=document.querySelector('.reaction-orb');

 if(orb){orb.hidden=!other.length;orb.dataset.reactions=other.map(x=>x.index).join(',');orb.classList.toggle('reaction-picked',other.some(reactionSelected));orb.setAttribute('aria-pressed',String(other.some(reactionSelected)))}

}

function reactionDecline(m){return engine.choices(m).find(x=>m.type===M.SELECT_CHAIN?x.response.index===null:x.response.yes===false)?.response||mandatoryChainResponse(m)}

function reactionMarkup(m){

 if(reactionPrompt!==promptKey()){reactionPrompt=promptKey();reactionGroup=null}

 const entries=reactionChoices(m),chosen=entries.find(reactionSelected),chain=!!engine.chainDepth;

 const decline=reactionDecline(m);

 const choices=reactionGroup?entries.filter(x=>reactionGroup.includes(x.index)):[];

 const context=promptContext(engine,m);

 return `<div class="field-reaction" role="group" aria-label="${chain?'Chain':'Activate'} effect"><div class="reaction-context">${esc(context)}</div><div class="reaction-buttons">${btn('✓','choice-confirm',`aria-label="Confirm activation" title="Confirm" ${chosen?'':'disabled'}`,'reaction-confirm')}${btn('✕','reaction-decline',`aria-label="${chain?'Do not chain':'Do not activate'}" title="${chain?'Do not chain':'Do not activate'}" ${decline?'':'disabled'}`,'reaction-decline')}</div></div><button class="reaction-orb reaction-available" aria-label="Choose an effect from another location" title="Available effects from other locations" hidden>✦</button>${choices.length?`<div class="reaction-picker" role="group" aria-label="Choose effect">${choices.map(x=>btn(`<img src="${image(x.choice.code||x.source?.code)}" alt=""><span>${esc(x.choice.label)}</span>`,'reaction-pick',`data-reaction-index="${x.index}"`,reactionSelected(x)?'reaction-picked':'')).join('')}${btn('Close','reaction-close')}</div>`:''}`;

}



let promptHidden=false,sortOrder=[],sortPrompt=null,tributeDefaultPrompt=null;

let hiddenPrompt=null;

function promptMarkup(m){if(promptHidden&&hiddenPrompt!==m){promptHidden=false;hiddenPrompt=null}if(promptHidden)return `<div class="return-prompt">${btn('Return to selection','return-prompt')}</div>`;if(stagedChoice&&stagedChoice.key!==promptKey())stagedChoice=null;



 if(!m||m.player!==0||[M.SELECT_IDLECMD,M.SELECT_BATTLECMD].includes(m.type))return '';

 if(attackTargetSelection(m))return '';

 if([M.SELECT_PLACE,M.SELECT_DISFIELD].includes(m.type))return placeSet.length?`<div class="field-selection"><div class="selection-actions">${btn('Clear','clear-places')}${duelConfirm('Confirm placement','confirm-places',placeSet.length===(m.count||1)?'':'disabled')}</div></div>`:'';

 if(m.type===M.SELECT_CHAIN&&!offerChain(m))return '';

 if([M.SELECT_CHAIN,M.SELECT_EFFECTYN].includes(m.type))return reactionMarkup(m);

 const entries=selectionEntries(m),onField=entries.filter(x=>fieldEntry(x.c));



 if(normalTributeSelection(m))return '';

 if(onField.length){const offField=entries.filter(x=>!fieldEntry(x.c));if(!offField.length)return '';return `<div class="field-selection"><div class="field-selection-panel"><strong>${m.type===M.SELECT_TRIBUTE?'Choose tributes':m.type===M.SELECT_SUM||m.type===M.SELECT_UNSELECT_CARD?'Choose materials':'Choose a highlighted card'}${pickSet.size?' · '+pickSet.size+' selected':''}</strong>${offField.length?`<div class="off-field-options">${offField.map(({c,i})=>targetKnown(c)?cardButton(c.code,`data-target="${i}"`,pickSet.has(i)):`<button class="cardbtn" data-target="${i}"><img src="assets/card-back.jpg"><span>Hidden card</span></button>`).join('')}</div>`:''}</div><div class="selection-actions">${selectionControls(m)}</div></div>`}

 if([M.SELECT_YESNO,M.SELECT_EFFECTYN].includes(m.type)&&Number(m.description)===31)return `<section class="prompt"><h3>Attack directly?</h3><p>Attack your opponent's LP directly</p>${duelConfirm('Confirm direct attack','response','data-response="0"')}${duelCancel('No — choose monster','response','data-response="1"')}</section>`;

 const names={[M.SELECT_CARD]:'Choose card(s)',[M.SELECT_TRIBUTE]:'Choose tribute(s)',[M.SELECT_SUM]:'Choose materials',[M.SELECT_UNSELECT_CARD]:'Choose materials',[M.SELECT_CHAIN]:engine.chainDepth?'Chain a response?':'Activate a card?',[M.SELECT_EFFECTYN]:'Activate effect?',[M.SELECT_YESNO]:'Confirm effect',[M.SELECT_POSITION]:'Choose position',[M.SELECT_OPTION]:'Choose effect'};

 const confirmation=[M.SELECT_YESNO,M.SELECT_EFFECTYN].includes(m.type);

 let body='',controls='';

 if([M.SELECT_CARD,M.SELECT_TRIBUTE,M.SELECT_SUM].includes(m.type))body=`<p>${m.type===M.SELECT_SUM?`Choose materials from your hand or field. Required total: ${m.amount}${m.select_max?' or more':''}.`:`Choose ${m.min}–${m.max} cards.`}</p><div class="cardgrid">${m.selects.map((c,i)=>`<button class="cardbtn ${pickSet.has(i)?'selected':''}" data-target="${i}" ${targetKnown(c)?`data-preview="${c.code}"`:''}><img src="${targetKnown(c)?image(c.code):'assets/card-back.jpg'}"><span>${targetKnown(c)?esc(card(c.code)?.name||engine.name(c.code)):'Face-down card'}${[M.SELECT_SUM,M.SELECT_TRIBUTE].includes(m.type)?`<br>${c.location===L.MZONE?'Field':c.location===L.HAND?'Hand':'Other zone'}${m.type===M.SELECT_SUM?` · ${c.amount&65535}${c.amount>>>16?' / '+(c.amount>>>16):''}`:''}`:''}</span></button>`).join('')}</div>`;

 else if(m.type===M.SELECT_UNSELECT_CARD)body=`<div class="cardgrid">${selectionEntries(m).map(({c,i})=>`<button class="cardbtn" data-target="${i}"><img src="${targetKnown(c)?image(c.code):'assets/card-back.jpg'}"><span>${i<m.select_cards.length?'Select':'Remove'} · ${targetKnown(c)?esc(engine.name(c.code)):'Hidden card'}</span></button>`).join('')}</div>`;

 else if([M.SORT_CARD,M.SORT_CHAIN].includes(m.type)){if(sortPrompt!==m){sortPrompt=m;sortOrder=m.cards.map((_,i)=>i)}body=`<p>Top card first. Use the arrows to change the order.</p><div class="sort-cards">${sortOrder.map((i,pos)=>`<div><button data-inspect="${m.cards[i].code}"><img src="${image(m.cards[i].code)}" alt="${esc(engine.name(m.cards[i].code))}"></button><span>${pos+1}. ${esc(engine.name(m.cards[i].code))}</span>${btn('↑','sort-up',`data-index="${pos}" ${pos?'':'disabled'} aria-label="Move up"`)}${btn('↓','sort-down',`data-index="${pos}" ${pos<sortOrder.length-1?'':'disabled'} aria-label="Move down"`)}</div>`).join('')}</div>`;controls=duelConfirm('Confirm order','sort-confirm');}

 else if([M.ANNOUNCE_RACE,M.ANNOUNCE_ATTRIB,M.SELECT_COUNTER].includes(m.type)){body=`<p>Select a legal response.</p>${advancedMarkup(m)}`;controls=m.type===M.SELECT_COUNTER?duelConfirm('Confirm counters','counters'):duelConfirm('Confirm announcement','announce');}

 else body=`${m.type===M.ANNOUNCE_CARD?'<input id="announce-search" placeholder="Search card name">':''}<div class="choices">${engine.choices(m).map((a,i)=>confirmation&&typeof a.response.yes==='boolean'?duelDecision(a.label,'response',`data-response="${i}"`,!a.response.yes):btn((a.code&&!confirmation?`<img class="choice-art" src="${image(a.code)}" alt="">`:'')+esc(a.label),'response',`data-response="${i}" aria-pressed="${!!(stagedChoice&&a.response.index===stagedChoice.response.index)}"`,stagedChoice&&a.response.index===stagedChoice.response.index?'selected':'')).join('')}</div>`;

 if([M.SELECT_CARD,M.SELECT_TRIBUTE,M.SELECT_SUM,M.SELECT_UNSELECT_CARD].includes(m.type))controls=selectionControls(m);

 if(m.type===M.SELECT_CHAIN||m.type===M.SELECT_OPTION&&m.options.length>1)controls=duelConfirm('Confirm effect','choice-confirm',stagedChoice?'':'disabled');

 const material=[M.SELECT_SUM,M.SELECT_UNSELECT_CARD,M.SELECT_TRIBUTE].includes(m.type);const subject=m.code||m.card?.code||(material?engine.materialSubject:0);

 const panel=`<section class="prompt">${btn('View field','view-field','','view-field-button')}<h3>${names[m.type]||'Resolve effect'}</h3>${[M.SELECT_CHAIN,M.SELECT_EFFECTYN].includes(m.type)?`<p class="prompt-context">${esc(promptContext(engine,m))}</p>`:''}${subject&&!confirmation?`<img class="prompt-card" src="${image(subject)}">`:''}<p class="notice">${esc(engine.description(m.description))}</p>${body}</section>`;

 return controls?`<div class="selection-dialog">${panel}<div class="selection-actions">${controls}</div></div>`:panel;

}

function advancedMarkup(m){if(m.type===M.SELECT_COUNTER)return `${m.cards.map((c,i)=>`<label>${esc(engine.name(c.code))}: <input data-counter="${i}" type="number" min="0" max="${c.count}" value="0"></label>`).join('')}`;const names=m.type===M.ANNOUNCE_ATTRIB?['EARTH','WATER','FIRE','WIND','LIGHT','DARK','DIVINE']:['Warrior','Spellcaster','Fairy','Fiend','Zombie','Machine','Aqua','Pyro','Rock','Winged Beast','Plant','Insect','Thunder','Dragon','Beast','Beast-Warrior','Dinosaur','Fish','Sea Serpent','Reptile','Psychic','Divine-Beast','Creator-God','Wyrm','Cyberse','Illusion'];return `<div class="choices">${names.map((name,i)=>(BigInt(m.available)&(1n<<BigInt(i)))?`<label><input type="checkbox" data-announce="${i}">${name}</label>`:'').join('')}</div>`}

let behaviourDraft=null,behaviourSending=false,behaviourSession=null;

async function openBehaviourReport(){

 const session=tagUI?.session;

 const draft={session,capture:session?null:captureBehaviour(engine?.replayRecord,{mode:'solo',seat:0,turn:snapshot?.turn,phase:snapshot?.phase})};

 behaviourDraft=draft;behaviourSession=session;

 dialog('Flag behaviour',`<p>Describe what the CPU did and what you expected. The replay up to this moment is attached automatically.</p><label for="behaviour-description">What happened?</label><textarea id="behaviour-description" maxlength="2000" rows="5" placeholder="For example: the CPU tributed its stronger monster…"></textarea><p id="behaviour-status" role="status">${session?'Capturing replay…':''}</p>${btn('Send report','send-behaviour',session?'disabled':'')}${btn('Send unsent flags','send-unsent-flags')}`);

 if(session){try{const result=await session.request('flag-capture');draft.token=result.token;if(behaviourDraft===draft){const b=document.querySelector('[data-do="send-behaviour"]');if(b)b.disabled=false;const status=document.querySelector('#behaviour-status');if(status)status.textContent='Replay attached.';}}catch(e){const status=document.querySelector('#behaviour-status');if(status)status.textContent=e.message;}}

}

async function sendBehaviourReport(){

 if(behaviourSending||!behaviourDraft)return;

 const draft=behaviourDraft,field=document.querySelector('#behaviour-description'),status=document.querySelector('#behaviour-status'),button=document.querySelector('[data-do="send-behaviour"]');

 const description=field?.value.trim();if(!description){status.textContent='Please describe the behaviour first.';field.focus();return;}

 behaviourSending=true;button.disabled=true;status.textContent='Uploading report…';

 try{const result=draft.session?await draft.session.request('flag-submit',{token:draft.token,description}):await uploadBehaviour(draft.capture,description);if(behaviourDraft===draft){status.textContent=result.pending?`Flag saved ${draft.session?'on the host device':'offline'}. ${result.pending} unsent flag(s). Use Send unsent flags to retry. ${result.error||''}`:'Report sent. Thank you!';button.textContent=result.pending?'Saved':'Sent';field.disabled=true;behaviourDraft=null;}}

 catch(e){status.textContent=e.message;button.disabled=false;}

 finally{behaviourSending=false;}

}

function ensureFusionCue(owner,before,after){
 const oldPlayer=before?.players?.[0],newPlayer=after?.players?.[0];
 if(!oldPlayer||!newPlayer||Number(newPlayer.extra)>=Number(oldPlayer.extra))return;
 const oldMonsters=new Set(oldPlayer.monsters.filter(Boolean).map(c=>`${c.sequence}:${c.code}`));
 const summoned=newPlayer.monsters.find(c=>c&&!oldMonsters.has(`${c.sequence}:${c.code}`)&&(Number(owner.data?.[c.code]?.type)&0x40));
 if(!summoned)return;
 const existing=owner.visuals.find(c=>c.kind==='fusion-summon'&&Number(c.code)===Number(summoned.code));
 const isMonster=code=>!!(Number(owner.data?.[Number(code)]?.type)&1);
 let materialCards=(existing?.materialCards||[]).filter(c=>isMonster(c.code));
 if(materialCards.length<2){
  const moves=owner.visuals.filter(c=>c.kind==='move'&&(Number(c.reason)&0x8)&&Number(c.code)>0&&isMonster(c.code)&&[L.HAND,L.MZONE,L.GRAVE,L.REMOVED].includes(c.from?.location)&&[L.GRAVE,L.REMOVED,L.EXTRA,L.DECK].includes(c.to?.location));
  const moved=moves.map(c=>({code:Number(c.code),controller:c.from.controller,location:c.from.location,sequence:c.from.sequence}));
  const seen=new Set(materialCards.map(c=>`${c.controller}:${c.location}:${c.sequence}:${c.code}`));
  for(const c of moved){const key=`${c.controller}:${c.location}:${c.sequence}:${c.code}`;if(!seen.has(key)){materialCards.push(c);seen.add(key)}}
 }
 if(materialCards.length<2){
  const oldCounts=new Map();for(const c of oldPlayer.grave||[])if(c?.code&&isMonster(c.code))oldCounts.set(Number(c.code),(oldCounts.get(Number(c.code))||0)+1);
  for(const c of newPlayer.grave||[])if(c?.code&&isMonster(c.code)){const code=Number(c.code),count=oldCounts.get(code)||0;if(count)oldCounts.set(code,count-1);else materialCards.push({code,controller:0,location:L.GRAVE,sequence:c.sequence})}
  for(const c of newPlayer.banished||[])if(c?.code&&isMonster(c.code)&&!(oldPlayer.banished||[]).some(x=>x?.code===c.code))materialCards.push({code:Number(c.code),controller:0,location:L.REMOVED,sequence:c.sequence});
 }
 if(materialCards.length<2){
  const afterHeld=new Set([...newPlayer.hand,...newPlayer.monsters].filter(Boolean).map(c=>`${c.location}:${c.sequence}:${c.code}`));
  for(const c of oldPlayer.hand.filter(Boolean).concat(oldPlayer.monsters.filter(Boolean)))if(isMonster(c.code)&&!afterHeld.has(`${c.location}:${c.sequence}:${c.code}`))materialCards.push({code:Number(c.code),controller:0,location:c.location,sequence:c.sequence});
 }
 const unique=new Set();materialCards=materialCards.filter(c=>{const key=`${c.controller}:${c.location}:${c.sequence}:${c.code}`;if(!isMonster(c.code)||unique.has(key))return false;unique.add(key);return true}).slice(0,5);
 const materials=materialCards.map(c=>Number(c.code));
 if(existing){existing.materials=materials;existing.materialCards=materialCards}
 else owner.visuals.push({kind:'fusion-summon',code:Number(summoned.code),materials,materialCards,card:{controller:0,location:L.MZONE,sequence:summoned.sequence}});
}

async function respond(response){if(inspectionPaused())return;clearTimeout(manualChainTimer);manualChainTimer=0;manualChainPrompt=null;heldChainPrompt=null;stagedChoice=null;promptHidden=false;tributeDefaultPrompt=null;if(tagUI&&screen==='duel'){if(!tagUI.session?.connected)return toast('Paused — reconnect with the same code.');pickSet.clear();placeSet=[];try{await tagUI.session.request('duel-response',{number:snapshot.tag.responseNumber,response})}catch(error){toast(error.message)}return}if(busy||screen!=='duel')return;busy=true;chainOverride=false;removeActions();pickSet.clear();placeSet=[];const playerAction=engine.pending?.player===0&&snapshot.player===0;try{const beforeSnapshot=snapshot,before={turn:snapshot.turn,phase:snapshot.phase};snapshot=engine.respond(response);ensureFusionCue(engine,beforeSnapshot,snapshot);await command('response',{response:encode(response),checkpoint:phaseCheckpoint(before,snapshot)});if(snapshot.finished){if(!isCardWin(snapshot.finished))await playDuelCues(playerAction,true);await completeDuel(snapshot.finished.player);return}await playDuelCues(playerAction,true);await waitForInspection();if(duelEnding||screen!=='duel')return;renderDuel();scheduleAI()}catch(e){toast('Selection could not resolve: '+e.message);renderDuel()}finally{busy=false}}

let chainMode='sometimes',chainOverride=false,rightClickNoChain=false,rightClickPointer=null,rightClickHoldTimer=0,heldAlwaysChain=false,heldChainPointer=null,heldChainTimer=0,heldChainPrompt=null,manualChainTimer=0,manualChainPrompt=null;

function offerChain(m){const holdOverride=heldAlwaysChain||m===heldChainPrompt;return (holdOverride||!rightClickNoChain)&&chainWindowAllowed(m,holdOverride?'always':chainMode,engine?.activeChain,{turnPlayer:engine?.player,phase:engine?.phase,card:code=>card(code)})}

function chainLabel(){return heldAlwaysChain?'Always chain (held)':rightClickNoChain?'No chain':chainMode==='sometimes'?'Chain sometimes':chainMode==='never'?'No chain':'Chain'}

function refreshChainToggle(){const original=document.getElementById('chain-toggle');if(!original)return;const temporary=heldAlwaysChain;original.classList.toggle('chain-disabled',!temporary&&(rightClickNoChain||chainMode==='never'));original.classList.toggle('chain-sometimes',!temporary&&!rightClickNoChain&&chainMode==='sometimes');original.setAttribute('aria-pressed',temporary?'true':rightClickNoChain?'false':chainMode==='sometimes'?'mixed':String(chainMode==='always'));original.title=chainLabel();const label=original.querySelector('span');if(label)label.textContent=chainLabel();syncModalChain()}

function setRightClickNoChain(active){
 if(rightClickNoChain===active)return;
 rightClickNoChain=active;
 refreshChainToggle();
 if(screen==='duel'&&!busy){renderDuel();scheduleAI();}
}

function setHeldAlwaysChain(active){
 if(heldAlwaysChain===active)return;
 heldAlwaysChain=active;
 refreshChainToggle();
 if(screen==='duel'&&!busy)scheduleAI();
}

function releaseHeldAlwaysChain(e){
 if(e?.pointerId!=null&&heldChainPointer!=null&&e.pointerId!==heldChainPointer)return;
 clearTimeout(heldChainTimer);heldChainTimer=0;heldChainPointer=null;
 if(!heldAlwaysChain)return;
 const pending=engine?.pending;
 heldChainPrompt=pending?.player===0&&pending.type===M.SELECT_CHAIN?pending:null;
 heldAlwaysChain=false;refreshChainToggle();
 if(screen==='duel'&&!busy&&!heldChainPrompt){renderDuel();scheduleAI();}
}

function scheduleAI(){clearTimeout(aiTimer);if(duelEnding)return;if(inspectionPaused())return;const pending=engine?.pending;const manualWindow=pending?.type===M.SELECT_CHAIN&&pending.player===0&&engine.player!==0&&!pending.forced&&!offerChain(pending)&&pending.selects?.some(c=>(c.controller??c.player)===0&&[L.HAND,L.MZONE,L.SZONE,L.GRAVE,L.REMOVED].includes(c.location));if(manualWindow){if(manualChainPrompt!==pending){clearTimeout(manualChainTimer);manualChainPrompt=pending;manualChainTimer=setTimeout(()=>{if(engine?.pending===pending&&!heldChainPrompt){manualChainPrompt=null;manualChainTimer=0;respond({type:R.SELECT_CHAIN,index:null})}},Math.max(0,Math.min(2000,Number(state?.settings?.manualResponseWindow??200)||0)))}return;}clearTimeout(manualChainTimer);manualChainTimer=0;manualChainPrompt=null;const automatic=automaticChainResponse(engine?.pending,!offerChain(engine?.pending),M,R);if(screen==='duel'&&automatic&&(!tagUI||tagUI.session.connected)){const owner=engine,pending=engine.pending;aiTimer=setTimeout(()=>{if(engine===owner&&engine.pending===pending&&screen==='duel'){const current=automaticChainResponse(pending,!offerChain(pending),M,R);if(current)respond(current)}},50);return;}if(tagUI){if(screen==='duel'&&engine?.pending?.type===M.SELECT_CHAIN&&!offerChain(engine.pending)&&tagUI.session.connected)aiTimer=setTimeout(()=>{if(engine?.pending?.type===M.SELECT_CHAIN&&!offerChain(engine.pending))respond({type:R.SELECT_CHAIN,index:null})},50);return}if(screen!=='duel'||!engine?.pending)return;if(engine.pending.player===0&&engine.pending.type===M.SELECT_CHAIN&&!offerChain(engine.pending)){aiTimer=setTimeout(()=>{if(engine?.pending?.type===M.SELECT_CHAIN&&!offerChain(engine.pending))respond({type:R.SELECT_CHAIN,index:null})},50);return}if(engine.pending.player===1){const pending=engine.pending;aiTimer=setTimeout(()=>{try{const response=engine.auto();const pass=pending.type===M.SELECT_CHAIN&&response.index==null;if(pass)respond(response);else aiTimer=setTimeout(()=>{if(engine.pending===pending&&screen==='duel')respond(response)},engine.inDamageStep?50:120)}catch(e){toast('Opponent paused: '+e.message)}},0)}}

let duelEnding=false;

// Each ending (this win hold, the DEFEAT overlay, the card-win finale) runs 150 ms past its animation, so
// the last effects and sounds finish before the next screen.
async function completeDuel(winner){if(duelEnding)return;duelEnding=true;await waitForInspection();clearTimeout(aiTimer);if(winner===0)await updateCoinMilestones();await finishDuelAnimations(engine);if(isCardWin(snapshot.finished)){removeActions();if(modal.open)modal.close();engine.visuals=[];await playCardWin(snapshot.finished)}else if(winner===0){duelSound('specialsummon',.6);await duelDelay(1150)}renderDuel();await duelFinish(winner);await command('finish',{winner,lp:snapshot.lp[0],reason:snapshot.finished?.reason??0,events:engine.summary()});if(winner!==0)track('defeat');engine.destroy();snapshot=null;clearInterval(backgroundAnimationTimer);backgroundAnimationTimer=null;if(state.run.secret_challenge){go('title');return}go(state.run.stage==='shop'?'shop':'ending');if(winner===0&&!modal.querySelector('.reward-screen,.reward-tally'))showVictoryReceipt();await notices()}

let rewardPresentation=null;
let rewardDeckReturn=false;

function showVictoryReceipt(){

 rewardMusic=true;track('packs');

 rewardPresentation?.destroy();rewardPresentation=null;

 dialog('',`<section class="reward-tally">${deckMinimumNotice(state.run)}<strong class="reward-tally-total">+${Number(state.run.last_gold||0).toLocaleString()} <img class="earned-coin" src="assets/ui/coins.png" alt="coins"></strong><div class="reward-tally-lines">${victoryRewardsMarkup(state.run.last_rewards,content.battleBonusLabels)}</div><button class="primary" data-do="reward-slots">Continue</button></section>`,false);

 // The total counts up and the window celebrates by tier (juice.js), all inside the window.
 requestAnimationFrame(()=>juice.coinTally(modal.querySelector('.reward-tally'),Number(state.run.last_gold||0)));

}

function showRewardSlots(){if(character().copycat&&state.run.reward_slots?.kind!=='deck'){void action('reward-accept');return;}rewardMusic=true;track('packs');const r=state.run;rewardPresentation?.destroy();if(r.reward_slots?.kind==='deck'){dialog('Victory deck choice',deckRewardMarkup(r,{esc}),false);rewardPresentation=mountDeckRewards(modal.querySelector('.reward-screen'),{getRun:()=>state.run,esc,volume:()=>state.settings.sound/100,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,reroll:async i=>{if(tagUI)await tagUI.session.request('reward-reroll',i);else await command('reward-reroll',i)},view:d=>openDeckPreview(modal,d,{card,cardButton,esc,sound:playUISound,details:c=>`<div class="deck-inspect"><img src="${image(c.id)}"><div>${cardFacts(c)}<h4>Effect / card text</h4><p class="inspect-effect">${esc(displayCardText(c.desc))}</p></div></div>`})});return;}dialog('',rewardMarkup(r,{image,name:id=>card(id)?.name||'Card',esc}),false);rewardPresentation=mountRewardSlots(modal.querySelector('.reward-screen'),{getRun:()=>state.run,image,name:id=>card(id)?.name||'Card',volume:()=>state.settings.sound/100,card,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,reroll:async i=>{if(tagUI)await tagUI.session.request('reward-reroll',i);else await command('reward-reroll',i);playRerollSound()}});}

modal.addEventListener('close',()=>{if(!modal.open){if(rewardDeckReturn)return;rewardPresentation?.destroy();rewardPresentation=null;if(rewardMusic){rewardMusic=false;track(packPresentation?'packs':screenMusic())}}});



function confirmTargets(){const m=engine.pending,indices=[...pickSet];if(m.type===M.SELECT_UNSELECT_CARD)return respond({type:R.SELECT_UNSELECT_CARD,index:null});if(m.type===M.SELECT_SUM){if(!engine.sumValid(m,indices))return toast('Choose materials with a valid total.');return respond({type:R.SELECT_SUM,indicies:indices})}const n=indices.reduce((sum,i)=>sum+(m.type===M.SELECT_TRIBUTE?m.selects[i].release_param||1:1),0);if(n<m.min||indices.length>m.max)return toast('Choose the required number of cards.');respond({type:m.type===M.SELECT_TRIBUTE?R.SELECT_TRIBUTE:R.SELECT_CARD,indicies:indices})}

function showPile(player,kind){previewLocation=null;if(kind==='deck'||(kind==='extra'&&player===1))return toast('This pile is hidden.');let cards=kind==='extra'?engine.query(player,L.EXTRA):snapshot.players[player][kind];cards=cards.filter(Boolean);dialog((player?'Opponent’s ':'Your ')+({extra:'Extra Deck',grave:'Graveyard',banished:'Banished cards'}[kind]),`<div class="cardgrid pile-inspection">${cards.map(c=>(player===0||kind==='grave'||c.position&5)?`<div>${cardButton(c.code,`data-inspect="${c.code}" data-location="${player},${c.location??({extra:L.EXTRA,grave:L.GRAVE,banished:L.REMOVED}[kind])},${c.sequence}"`)}${!busy?legalCardActions(player,c.location??({extra:L.EXTRA,grave:L.GRAVE,banished:L.REMOVED}[kind]),c.sequence,c.code).map(a=>`<button data-do="pile-action" data-address="${player},${c.location??({extra:L.EXTRA,grave:L.GRAVE,banished:L.REMOVED}[kind])},${c.sequence},${c.code}" data-action="${a.response.action}" data-index="${a.response.index}">${esc(a.label.split(' · ')[0])}</button>`).join(''):''}</div>`:'<img src="assets/card-back.jpg" alt="Face-down banished card">').join('')}</div>${cards.length?'':'<p>This pile is empty.</p>'}`)}



// Inspection is read-only and must not wait for CPU actions or animations.

document.addEventListener('pointerdown',e=>{if(e.button!==0||screen!=='duel')return;const el=e.target.closest('[data-preview]');if(el&&!modal.contains(el))setPreview(el.dataset.preview,el)},true);

document.addEventListener('pointerover',e=>{if(e.pointerType&&e.pointerType!=='mouse')return;const x=e.target.closest('[data-preview]');if(x&&screen==='duel')setPreview(x.dataset.preview,x)});


document.addEventListener('pointerdown',e=>{if(e.button!==0||!e.target.closest('[data-do="toggle-chain"]'))return;e.preventDefault();action('toggle-chain');},true);

document.addEventListener('pointerdown',e=>{
 if(screen!=='duel'||e.pointerType!=='mouse'||e.button!==2)return;
 e.preventDefault();rightClickPointer=e.pointerId;
 clearTimeout(rightClickHoldTimer);
 rightClickHoldTimer=setTimeout(()=>{
  rightClickHoldTimer=0;
  if(rightClickPointer===e.pointerId&&screen==='duel'&&(e.buttons&2))setRightClickNoChain(true);
 },300);
},true);

document.addEventListener('pointerdown',e=>{
 if(screen!=='duel'||modal.open||chainMode!=='never'||rightClickNoChain||e.button!==0||!['mouse','touch'].includes(e.pointerType)||e.target.closest('[data-do="toggle-chain"]'))return;
 heldChainPointer=e.pointerId;clearTimeout(heldChainTimer);
 heldChainTimer=setTimeout(()=>{
  heldChainTimer=0;
  if(heldChainPointer===e.pointerId&&screen==='duel'&&(e.pointerType!=='mouse'||(e.buttons&1)))setHeldAlwaysChain(true);
 },300);
},true);

function releaseRightClickNoChain(e){
 if(e?.pointerId!=null&&rightClickPointer!=null&&e.pointerId!==rightClickPointer)return;
 if(e?.type==='pointerup'&&(e.buttons&2))return;
 clearTimeout(rightClickHoldTimer);rightClickHoldTimer=0;rightClickPointer=null;
 setRightClickNoChain(false);
}
window.addEventListener('pointerup',e=>{releaseHeldAlwaysChain(e);releaseRightClickNoChain(e)},true);
window.addEventListener('pointercancel',e=>{releaseHeldAlwaysChain(e);releaseRightClickNoChain(e)},true);
window.addEventListener('blur',()=>{releaseHeldAlwaysChain();releaseRightClickNoChain()},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseHeldAlwaysChain();releaseRightClickNoChain()}},true);
document.addEventListener('contextmenu',e=>{if(screen==='duel')e.preventDefault()},true);

document.addEventListener('click',async e=>{if(e.detail>0&&e.target.closest('[data-do="toggle-chain"]'))return;if(!e.target.closest('[data-do="shopkeeper-secret"]'))shopkeeperTaps=0;const el=e.target.closest('button,[data-do],[data-inspect],[data-open-pack]');if(!el)return;if(screen==='duel'&&el.dataset.preview&&!modal.contains(el))setPreview(el.dataset.preview,el);if(busy&&screen==='duel'&&!modal.contains(el)&&el.dataset.do!=='duel-options'&&el.dataset.do!=='toggle-chain'&&el.dataset.do!=='golden-card'&&el.dataset.do!=='log'&&el.dataset.do!=='duel-emotes'&&el.dataset.do!=='active-curses'&&el.dataset.do!=='curse-info'&&el.dataset.do!=='relic-detail'){

 // Busy blocks duel commands, never read-only card inspection.

 if(el.dataset.inspect){setPreview(+el.dataset.inspect,el);inspect(+el.dataset.inspect)}

 else if(el.dataset.pile){const [p,k]=el.dataset.pile.split(',');showPile(+p,k)}

 else if(el.dataset.code&&(el.dataset.zone||el.dataset.hand!==undefined)){

  const address=el.dataset.zone?el.dataset.zone.split(',').map(Number):[0,L.HAND,+el.dataset.hand];

  setPreview(+el.dataset.code,el);doubleTap(el.dataset.zone?'z'+el.dataset.zone:'h'+el.dataset.hand,+el.dataset.code);

 }

 return;

}

 try{

 if(el.dataset.menu!==undefined){const n=+el.dataset.menu;if(n!==menuIndex){titleMotion.select(n)}else {if(menu[n][4]==='settings')playUISound('inspect-open');else menuSelectionSound();await titleMotion.open(el,()=>action(menu[n][4],el,true));}return}

 if(el.dataset.character!==undefined){const next=+el.dataset.character;if(next!==selected)copycatTaps=0;selected=next;effect();renderCharacters();if(selected===37)await copycatSecret();return}

 if(el.dataset.inspect){if(screen==='duel')setPreview(+el.dataset.inspect,el);inspect(+el.dataset.inspect);return}

 if(el.dataset.openPack!==undefined){effect(true);openDraftPack(+el.dataset.openPack,true);return}

 if(el.dataset.pick!==undefined){if(e.detail===0&&!e.pointerType&&!modal.open){flushDraftTap();await command('toggle',+el.dataset.pick);updateDraft()}return}

 if(el.dataset.draftTab!==undefined){draftTab=el.dataset.draftTab;renderDraft();return}

 if(el.dataset.reactions!==undefined){chooseReaction(el.dataset.reactions.split(',').filter(Boolean).map(Number));return}

 if(el.dataset.hand!==undefined){if(doubleTap('h'+el.dataset.hand,+el.dataset.code))return;if(tapActivateOpponentChain(0,L.HAND,+el.dataset.hand,+el.dataset.code))return;showCardActions(el,0,L.HAND,+el.dataset.hand,+el.dataset.code);return}

 if(el.dataset.fieldTarget!==undefined){chooseTarget(+el.dataset.fieldTarget);return}

 if(el.dataset.zone){const [p,loc,seq]=el.dataset.zone.split(',').map(Number),m=engine.pending;if(m?.player===0&&[M.SELECT_PLACE,M.SELECT_DISFIELD].includes(m.type)){const found=engine.choices(m).find(a=>a.response.places?.[0]?.player===p&&a.response.places[0].location===loc&&a.response.places[0].sequence===seq);if(found){const place=found.response.places[0];const at=placeSet.findIndex(x=>x.player===p&&x.location===loc&&x.sequence===seq);if(at>=0)placeSet.splice(at,1);else if(placeSet.length<(m.count||1))placeSet.push(place);else placeSet=[place];if(placeSet.length===(m.count||1))return respond({...found.response,places:[...placeSet]});renderDuel()}return}if(el.dataset.code){if(doubleTap('z'+el.dataset.zone,+el.dataset.code))return;if(tapActivateOpponentChain(p,loc,seq,+el.dataset.code))return;showCardActions(el,p,loc,seq,+el.dataset.code);}return}

 if(el.dataset.pile){const [p,k]=el.dataset.pile.split(',');showPile(+p,k);return}

 if(el.dataset.phase){const a=phaseAction(+el.dataset.phase);if(a)respond(a.response);return}

 if(el.dataset.target!==undefined){chooseTarget(+el.dataset.target);return}

 if(el.dataset.do)await action(el.dataset.do,el);

 }catch(err){toast(err.message);console.error(err)}

});

function coinBonusMarkup(earned={}){

 const rules=content.battleCoinRules||[],pvp=!!snapshot?.tag?.pvp,won=snapshot?.finished?.player===0;

 const extra=Object.entries(earned).filter(([label])=>!rules.some(r=>r.label===label));

 const count=rules.filter(x=>Object.hasOwn(earned,x.label)).length,total=rules.reduce((n,x)=>n+(Object.hasOwn(earned,x.label)?x.coins:0),0)+extra.reduce((n,[,v])=>n+(+v||0),0);

 const row=(label,value,note)=>`<div class="coin-bonus-row ${value?'earned':''}" role="listitem"><span>${esc(label)}<small>${note}</small></span><b>${value>0?'+':''}${value}<img src="assets/ui/coins.png" alt="coins"></b></div>`;

 return `<div class="coin-bonus-summary"><b>${pvp?'No campaign coins in PvP':`${count} / ${rules.length} bonuses earned · ${total>=0?'+':''}${total} coins`}</b><p>${pvp?'These bonuses apply to campaign duels.':'Bonuses are paid if you win. Victory adds 30 coins; tiers stack, up to 400 total before relic modifiers. Early wins earn up to 205 extra coins. Turn penalties increase after turns 10, 20, 30 and onward. See the shop coin scorecard for amounts.'}</p></div><div class="coin-bonus-list" role="list" tabindex="0">${rules.map(x=>{const got=!pvp&&Object.hasOwn(earned,x.label);return row(x.label,got?x.coins:x.coins,x.label&&(got?'✓ Earned':x.victoryOnly&&!won?'Decided at victory':'Not yet earned'))}).join('')}${extra.map(([label,value])=>row(label,value,label.startsWith('Ancient Treasure')?'Earned by card effect':'Decided at victory')).join('')}</div>`;

}

function refreshCoinBonuses(earned){const panel=modal.querySelector('.coin-bonuses');if(modal.open&&panel){const list=panel.querySelector('.coin-bonus-list'),scroll=list?.scrollTop||0;panel.innerHTML=coinBonusMarkup(earned);panel.querySelector('.coin-bonus-list').scrollTop=scroll;}}

async function showCoinBonuses(){

 const owner=engine;if(!owner||!snapshot)return;let earned={};

 if(!snapshot.tag?.pvp){const run=state.run,events=owner.tagFacade?snapshot.tag.rewardEvents:owner.summary();if(py&&events)earned=await command('reward-progress',{run:{lp:snapshot.lp[0],round:run.round,character:run.character,guaranteed:run.guaranteed,artifacts:run.artifacts,encore_active:run.encore_active},events,victory:snapshot.finished?.player===0});}

 if(owner!==engine||screen!=='duel')return;

 dialog('Coin bonuses',`<section class="coin-bonuses">${coinBonusMarkup(earned)}</section>`);

}

async function action(a,el={dataset:{}},silent=false){
 // Before any await: browsers only allow an image clipboard write during the tap.
 if(a==='copy-run-card'||a==='save-run-card'){const status=app.querySelector('.run-card-status'),name=`YGO Rogue Duelist - ${character().name} - ${state.run.stage==='complete'?'Win':'Loss'}`;(a==='save-run-card'?saveRunCard:copyRunCard)(app.querySelector('.run-card-canvas'),name).then(m=>{if(status)status.textContent=m}).catch(e=>{if(status)status.textContent=e.message||'Could not copy the image.'});return}

 if(!silent&&['settings','duel-settings'].includes(a)){playUISound('inspect-open');silent=true;}else if(!silent&&['title','pause-title','pause'].includes(a)){menuSelectionSound();silent=true;}

 if(a==='log'){dialog('Duel log',duelLogMarkup(engine?.logs||[],content.cards));return}

 if(a==='log-action'){

  const ids=(el.dataset.cards||'').split(',').map(Number).filter(id=>card(id));previewLocation=null;

  if(ids.length===1){inspect(ids[0]);return}

  const previous=modal.open?{nodes:[...modal.childNodes],scroll:modal.scrollTop,focus:document.activeElement,parent:inspectParent}:null;

  dialog('Cards in this action',`<div class="log-cards"><p>${esc(el.querySelector('span')?.textContent||'')}</p><div class="cardgrid">${ids.map(id=>cardButton(id,`data-inspect="${id}"`)).join('')}</div></div>`);inspectParent=previous;return;

 }



 if(a==='reward-slots'){showRewardSlots();return;}

 if(a==='reward-accept'){if(modal.querySelector('[data-do="reward-accept"]')?.disabled)return;if(tagUI)await tagUI.session.request('reward-accept',rewardPresentation?.selected);else await command('reward-accept',rewardPresentation?.selected);rewardPresentation?.destroy();rewardPresentation=null;modal.close();render();return;}

 if(a==='reward-details'){const previous={nodes:[...modal.childNodes],scroll:modal.scrollTop,focus:document.activeElement,parent:inspectParent};dialog('Victory coin breakdown',victoryRewardsMarkup(state.run.last_rewards,content.battleBonusLabels));inspectParent=previous;return;}

 if(a==='reward-deck'){if(!modal.querySelector('.reward-screen')||!state.run?.reward_slots?.pending)return;rewardDeckReturn=true;modal.close();go('draft');return;}

 if(a==='reward-return'){if(!rewardDeckReturn)return;go(state.run.stage==='shop'?'shop':'ending');return;}

 if(a==='reward-overlay-close'){closeRewardOverlay();return;}

 if(a==='flag-behaviour')return openBehaviourReport();

 if(a==='send-unsent-flags'){const status=document.querySelector('#behaviour-status');try{const result=behaviourSession?await behaviourSession.request('flag-retry'):await sendUnsentFlags();status.textContent=result.pending?`${result.sent} sent; ${result.pending} still saved for retry. ${result.error||''}`:`${result.sent} flag(s) sent. No unsent flags remain.`}catch(e){status.textContent=e.message}return;}

 if(a==='send-behaviour')return sendBehaviourReport();

 if(a==='duel-emotes'){if(screen!=='duel')return;if(tagUI){if(tagUI.session?.connected)openEmotePicker(emoji=>tagUI?.session.request('emote',emoji).catch(e=>toast(e.message)));}else openEmotePicker(emoji=>showDuelEmote(emoji,true));return;}

 if(a==='duel-options'&&!tagUI)modal.dataset.duelOptionsPause='1';

 if(a==='duel-options'&&tagUI?.isCollector){dialog('Options',`<div class="duel-options-grid">${btn('Log','log')}${btn('Settings','duel-settings')}${btn('Exit','pause')}${btn('Surrender','surrender')}</div>`);return}if(a==='duel-options'){dialog('Options',`<div class="duel-options-grid">${btn('Relics','relic-ledger')}${btn('Curses','active-curses')}${btn('Log','log')}${btn('Coin bonuses','coin-bonuses')}${btn('Flag behaviour','flag-behaviour')}${btn('Settings','duel-settings')}${btn(tagUI?'Exit':'Save / Menu','pause')}${btn('Surrender','surrender')}</div>`);return}

 if(a==='duel-settings'){dialog('Settings',`<div class="settings">${duelBackgroundSetting()}<label>Music <input id="music" type="range" min="0" max="100" value="${state.settings.music}"><output>${state.settings.music}%</output></label><label>Sound effects <input id="sound" type="range" min="0" max="100" value="${state.settings.sound}"><output>${state.settings.sound}%</output></label></div>`);return}

if(a==='defeated-collector-deck'){showDefeatedCollector(+el.dataset.index);return;}if(a==='collection-collector-back'){collectionKind='cards';renderCollection();return;}if(a==='collector-decklist'){const d=collectorLeaders[+el.dataset.index];if(d)dialog(d.name,Object.entries(d.deck).map(([zone,ids])=>`<h3>${esc(zone==='extra'?'Fusion':zone)}</h3><div class="cardgrid collector-decklist-grid">${ids.map(id=>`<button data-inspect="${id}"><img src="${image(id)}" alt="${esc(card(id)?.name)}"></button>`).join('')}</div>`).join(''));return;}if(a==='coin-bonuses'){await showCoinBonuses();return}if(a==='curse-info'){dialog(content.curses[el.dataset.curse]?.[0]||'Curse',`<p>${esc(curseDescription(content,el.dataset.curse,state.run?.challenge_level))}</p>`);return}if(a==='cpu'){if(state.profile.cpu_viewer_unlocked)await openCPU();return}if(a==='tag'){await openTag();return}if(a==='draft-pvp'){await openCollector(true);return}if(a==='collector'){await openCollector();return}if(tagUI){if(a==='active-curses'){dialog('Curses & LVL modifiers',modifierRowsMarkup(tagUI.view.modifiers));return}if(a==='pause'||a==='pause-title'||a==='title'){await tagUI.action('exit',{dataset:{}});return}if(a==='surrender'){dialog(tagUI.isCollector?'Surrender this duel?':'Surrender the team’s run?',tagUI.isCollector?`<p>This concedes the current duel. Your opponent gains one win in the best-of-three match.</p><div class="collector-surrender-actions">${duelConfirm('Confirm surrender','confirm-surrender')}${duelDecision('Cancel surrender','close','',true)}</div>`:duelConfirm('Confirm surrender','confirm-surrender'));return}if(a==='confirm-surrender'){modal.close();await tagUI.session.request('surrender');return}}if(busy&&!['close','toggle-chain','choose-monster-type','golden-card','relic-pick','relic-pick-reroll','card-pick-type','card-pick-select','card-pick-confirm','name-pick-select','name-pick-confirm','relic-ledger','relic-detail','active-curses','curse-info','surrender','confirm-surrender','resume-duel'].includes(a))return;if(!silent&&!['buy','close','select-purchase','shop-reroll','sell-relic'].includes(a)){if((screen==='shop'&&a==='draft')||(screen==='draft'&&a==='shop'))playUISound('window-close');else effect(['start','new','confirm-new'].includes(a));}

 if(a==='active-curses'){const rows=await command('active-curses');dialog('This duel: curses & difficulty',modifierRowsMarkup(rows));return}

 if(a==='sell-relic'){const fromShopRelics=screen==='shop'&&!!el.closest('.relic-ledger');if(!fromShopRelics)return;const result=await command('sell-relic',el.dataset.relic);shopSelection.clear();renderShop();dialog('Run relics',relicLedgerMarkup());toast(`Sold ${content.artifacts[result.relic]?.[0]||'relic'} for ${result.coins} coins.`);return}

 if(a==='shop-reroll'){busy=true;try{const previous=juice.shopArt(app);await command('shop-reroll');shopSelection.clear();renderShop();if(!juice.reroll(app,previous))playRerollSound();keeperTalk.say('reroll')}finally{busy=false}return}if(a==='shopkeeper-secret')return shopkeeperSecret();if(a==='copycat-secret'){return copycatSecret()}if(a==='gallery'){go('gallery');return}

 if(a==='choose-variant'){selectedVariants[selected]=+el.dataset.variant;renderCharacters();return}if(a==='levels'){levelMenu();return}if(a==='choose-level'){await command('remember-level',{character:selected,level:+el.dataset.level});selectedLevels[selected]=rememberedLevel(state.profile,selected);modal.close();renderCharacters();return}

 if(a==='tutorial-image'){dialog(el.dataset.label,`<img class="tutorial-enlarged" src="assets/${esc(el.dataset.src)}" alt="${esc(el.dataset.label)}">`);return}if(a==='tutorial'){tutorialReturn=screen;go('tutorial');return}if(a==='tutorial-page'){tutorialPage=+el.dataset.index;renderTutorial();return}if(a==='tutorial-back'){go(tutorialReturn);if(screen==='duel')scheduleAI();return}if(a==='toggle-chain'){heldChainPrompt=null;chainMode=({always:'never',never:'sometimes',sometimes:'always'})[chainMode];refreshChainToggle();if(!busy){renderDuel();scheduleAI()}return}if(a==='close'){closeDialog();return}if(a==='menu-prev'||a==='menu-next'){titleMotion?.step(a==='menu-next'?1:-1);return}

 if(a==='continue')return showRunSlots();

 if(a==='cursed-choose'){await command('cursed-choose',el.dataset.relic);go('shop');return}

 if(a==='cursed-reroll'){await command('cursed-reroll');render();return}

 if(a==='load-slot'){await command('select-slot',Number(el.dataset.slot));modal.close();if(state.run.stage==='duel')return startDuel(true);go(['complete','gameover'].includes(state.run.stage)?'ending':state.run.stage);return}

 if(a==='champion'){await command('champion');return startDuel(false,0)}if(a==='next-loop'){await command('next-loop');go('shop');return}

 if(a==='collection-kind'){collectionKind=el.dataset.kind;collectionPage=0;renderCollection();return}if(a==='collection-search'){collectionQuery=document.querySelector('#collection-search').value;collectionPage=0;renderCollection();return}if(a==='collection-prev'||a==='collection-next'){collectionPage+=a==='collection-next'?1:-1;renderCollection();return}if(a==='collection-item'){const id=el.dataset.id;if(collectionKind==='packs'){inspectPack(id)}else{const r=content.artifacts[id];dialog(r[0],`<div class="collection-relic-art relic-detail-art">${relicArtwork(relicImage(content.artifactInfo[id].art))}${relicCountBadge(id)}</div><p>${esc(r[2])}</p>`)}return}

 if(a==='new')return newRun();

 if(a==='new-slot'){const slot=Number(el.dataset.slot);if(state.slots.find(s=>s.slot===slot)?.occupied){dialog('Replace saved run?',`<p>Replace the run in slot ${slot}? Your other slots will be kept.</p>${btn('Replace this run','confirm-new',`data-slot="${slot}"`,'primary')}`);return}return beginNew(slot)}

 if(a==='confirm-new')return beginNew(Number(el.dataset.slot),true);

 if(a==='reveal-pack'){openDraftPack(+el.dataset.index,true);return}if(a==='next-pack'){openDraftPack(+el.dataset.index,false);return}

 if(a==='deselect-all'){flushDraftTap();await command('deselect-all');updateDraft();return}

 if(a==='auto'){flushDraftTap();await command('auto');updateDraft();return}

 if(a==='reveal-opponent'){busy=true;try{const id=+el.dataset.opponent;await playPortraitReveal({before:el.closest('.opponent').querySelector('.encounter-hero'),update:async()=>{await command('reveal-opponent',id);renderRoutes()},after:()=>document.querySelector(`[data-encounter="${id}"] .encounter-hero`),active:()=>screen==='routes'})}finally{busy=false}return}

 if(a==='boss-reroll'){busy=true;try{await command('boss-reroll');renderRoutes()}catch(error){busy=false;throw error}return}

 if(a==='start'){return startDuel(false,+el.dataset.opponent)}

 if(a==='peek-deck'){const cards=await command('peek-deck',+el.dataset.opponent);dialog('Opponent deck',`<div class="cardgrid">${cards.map(id=>cardButton(id,`data-inspect="${id}"`)).join('')}</div>`);return}

 if(a==='inspect-pack'){inspectPack(el.dataset.pack);return}if(a==='relic-detail'){const id=el.dataset.relic;dialog(content.artifacts[id][0],relicLedgerMarkup(id));return}

 if(a==='item-info'){const x=state.run.shop[+el.dataset.index];if(x.kind==='single'){inspect(x.id);return}if(x.kind==='pack'){inspectPack(x.id);return}if(x.kind==='deck'){dialog(x.name,`<p>${x.price} coins. Adds these ${x.cards.length} cards to your collection. Your equipped deck stays the same.</p><div class="cardgrid">${x.cards.map(id=>cardButton(id,`data-inspect="${id}"`)).join('')}</div>`);return}const a=content.artifacts[x.id];dialog(a[0],`<img style="height:140px" src="${relicImage(content.artifactInfo[x.id].art)}"><p>${esc(a[2])}</p>`);return}

 if(a==='select-purchase'){const i=+el.dataset.index;const stock=state.run.shop[i];if(!stock||stock.sold||((character().copycat||character().engine_deck)&&stock.kind!=='artifact'))return;if(shopSelection.has(i))shopSelection.delete(i);else {const total=[...shopSelection].reduce((n,j)=>n+state.run.shop[j].price,0)+state.run.shop[i].price;if(total>state.run.gold){playUISound('count-coins');return toast('Not enough gold')}shopSelection.add(i)}playUISound('shop-select');renderShop();return}

 if(a==='buy-selected'||a==='confirm-deck-purchase'){if(!shopSelection.size)return;modal.close();busy=true;try{const bought=[...shopSelection],items=bought.map(i=>({...state.run.shop[i],ultra:isShopUltra(state.run.shop[i],content.cards)}));const results=await command('buy-many',bought);packSound('purchase');shopSelection.clear();renderShop();juice.buy(bought.map(i=>app.querySelector(`[data-shop-item="${i}"]`)?.closest('.shop-product')),app.querySelector('.shop-balance'),items.map(x=>x.price));await offerGoldenCards();const pulls=results.flatMap(x=>x.cards);const mis=(state.run.last_misprints||[]).map(misprintNoticeLine).join('');const packResults=results.filter(x=>x.kind==='pack');if(packResults.length)await new Promise(resolve=>presentPacks(packResults,resolve));if(pulls.length||mis)dialog('Your purchases',`${mis?`<div class="misprints"><b>Faulty Printer misprints:</b>${mis}</div>`:''}<div class="cardgrid">${pulls.map(id=>cardButton(id,`data-inspect="${id}"`)).join('')}</div>`);await notices();keeperTalk.say(keeperTalk.purchaseLine(items));offerGoldenCards()}finally{busy=false}return}

 if(a==='buy'){const index=+el.dataset.index,x=state.run.shop[index],ultra=isShopUltra(x,content.cards),pulled=await command('buy',index);purchaseCoins();renderShop();juice.buy([app.querySelector(`[data-shop-item="${index}"]`)?.closest('.shop-product')],app.querySelector('.shop-balance'),[x.price]);const mis1=(state.run.last_misprints||[]).map(misprintNoticeLine).join('');if(pulled?.length||mis1)dialog(x.kind==='pack'?'Your pack pulls':'Added to collection',`${mis1?`<div class="misprints"><b>Faulty Printer misprints:</b>${mis1}</div>`:''}<div class="cardgrid">${pulled.map(id=>cardButton(id,`data-inspect="${id}"`)).join('')}</div>`);await notices();keeperTalk.say(keeperTalk.purchaseLine([{...x,ultra}]));return}

 if(a==='import-profile-confirm'){const text=pendingDesktopProfile;if(!text)return;pendingDesktopProfile=null;const result=await command('import-profile',text);closeDialog();renderSettings();toast(`Progress imported: ${result.unlocksAdded} new unlocks, ${result.historyAdded} new history entries.`);return}

 if(a==='device-secret'){if(state.profile.cpu_viewer_unlocked||secretPlaying)return;if(++deviceSecretTaps===10){secretPlaying=true;try{await meerkatSecretAnimation();await command('unlock-cpu-viewer');toast('Watch CPU duel unlocked');}finally{secretPlaying=false;deviceSecretTaps=0;}}return;}if(a==='global-stats-retry'){renderGlobalStats();return}

 if(a==='reset-progress'){dialog('Delete all progress?',`<p>Your run, achievements and all unlocks will be erased.</p>${btn('Continue to final confirmation','reset-progress-confirm')}`);return}

 if(a==='reset-progress-confirm'){dialog('Are you absolutely certain?',`<p>This permanently deletes all progress. You will start again with Yugi and Kaiba.</p>${btn('Delete all progress permanently','reset-progress-final')}`);return}

 if(a==='reset-progress-final'){clearTimeout(aiTimer);if(engine){engine.destroy();engine=null;snapshot=null}await command('reset-progress');modal.close();go('title');return}

 if(a==='choose-monster-type'){if(tagUI)await tagUI.session.request(a,el.dataset.type);else await command(a,el.dataset.type);modal.close();render();return;}

 if(a==='relic-pick'){await command(a,el.dataset.relic);finishRelicChoice();return}
 if(a==='relic-pick-reroll'){await command(a);if(state.run.relic_offer)showRelicChoice(state.run);else finishRelicChoice();return}
 if(a==='card-pick-type'){cardPick.type=el.dataset.type;refreshCardPick();return}
 if(a==='card-pick-select'){cardPick.selected=+el.dataset.code;refreshCardPick();return}
 if(a==='card-pick-confirm'){if(!cardPick.selected)return;await command('card-pick',cardPick.selected);cardPick.q='';finishRelicChoice();return}
 if(a==='name-pick-select'){namePick.selected=+el.dataset.setcode;refreshNamePick();return}
 if(a==='name-pick-confirm'){if(namePick.selected==null)return;await command('name-change',namePick.selected);namePick.q='';finishRelicChoice();return}

 if(a==='golden-card'){if(tagUI)await tagUI.session.request('golden-card',+el.dataset.code);else await command('golden-card',+el.dataset.code);delete modal.dataset.goldenRequired;modal.classList.remove('golden-choice-modal');modal.close();return}

 if(a==='upload-replays'){const button=document.querySelector('[data-do="upload-replays"]'),status=document.querySelector('#replay-status');button.disabled=true;try{if(engine)await saveRecording(engine);await uploadReplays(text=>{status.textContent=text})}catch(e){status.textContent=e.message}finally{button.disabled=false}return}

 if(a==='device-sync-open'){await showDeviceSync();return;}

 if(a==='device-sync-create'||a==='device-sync-join'||a==='device-sync-now'||a==='device-sync-unlink'){

 if(el.disabled)return;const code=document.getElementById('device-link-code')?.value;el.disabled=true;

 try{const result=await deviceSync.run({'device-sync-create':'create','device-sync-join':'join','device-sync-now':'sync','device-sync-unlink':'unlink'}[a],code);await showDeviceSync(result.code?`<p>Enter this code on your other device:</p><p class="device-link-code">${esc(result.code)}</p><p>Expires in 10 minutes. Each code can be used once.</p>`:a==='device-sync-unlink'?'<p>Device disconnected. Your unlocks have been kept.</p>':'<p>Unlocks synced.</p>')}catch(error){dialog('Link devices',`<p>${esc(error.message)}</p>${btn('Try again','device-sync-open')}`)}finally{el.disabled=false}return;

 }

 if(a==='android-update'){

 if(!window.ShadowNative?.openUpdate||el.disabled)return;await persist();ShadowNative.openUpdate();return;

 }

 if(a==='android-download'){await persist();ShadowNative.openUpdate();return;}

 if(a==='settings'){returnScreen=screen;go('settings');return}if(a==='settings-back'){go(returnScreen);if(screen==='duel')scheduleAI();return}

 if(a==='cheat'){const code=document.querySelector('#cheat-code').value;await command('cheat',code);toast(code==='touchgrass'?'All characters cleared Challenge Levels -1 through 6.':'Testing unlock enabled.');return}

 if(a==='pause'){clearTimeout(aiTimer);await command('duel-checkpoint');dialog('Duel saved',`<p>Your complete duel is saved and can be resumed from Continue.</p>${btn('Return to duel','resume-duel')}${btn('Main menu','pause-title')}`);return}

 if(a==='resume-duel'){modal.close();scheduleAI();return}if(a==='pause-title'){modal.close();go('title');return}

 if(a==='surrender'){dialog('Surrender this run?',`<p>This ends the current run.</p>${duelCancel('Keep dueling','resume-duel')}${duelConfirm('Confirm surrender','confirm-surrender')}`);return}

 if(a==='confirm-surrender'){modal.close();await completeDuel(1);return}

 if(a==='view-field'){hiddenPrompt=engine.pending;promptHidden=true;renderDuel();return}if(a==='return-prompt'){promptHidden=false;renderDuel();return}

 if(a==='sort-up'||a==='sort-down'){const i=+el.dataset.index,j=i+(a==='sort-up'?-1:1);if(j>=0&&j<sortOrder.length)[sortOrder[i],sortOrder[j]]=[sortOrder[j],sortOrder[i]];renderDuel();return}

 if(a==='sort-confirm'){const order=sortOrder.map((_,i)=>sortOrder.indexOf(i));return respond({type:R.SORT_CARD,order})}

 if(a==='pile-action'){const [p,l,seq,code]=el.dataset.address.split(',').map(Number);const choice=legalCardActions(p,l,seq,code).find(x=>x.response.action===+el.dataset.action&&x.response.index===+el.dataset.index);if(!choice)return;closeDialog();return stageChoice(choice.response,choice.label,code,{controller:p,location:l,sequence:seq})}if(a==='response'){const choice=engine.choices()[+el.dataset.response];if(!choice)return;const m=engine.pending,source=m.type===M.SELECT_CHAIN?m.selects?.[choice.response.index]:null;return stageChoice(choice.response,choice.label,choice.code||m.code||engine.effect?.code||0,source)}

 if(a==='reaction-pick'){chooseReaction([+el.dataset.reactionIndex]);return}

 if(a==='reaction-close'){reactionGroup=null;renderDuel();return}

 if(a==='reaction-decline'){const m=engine.pending;if(!reactionChoices(m).length&&![M.SELECT_CHAIN,M.SELECT_EFFECTYN].includes(m?.type))return;const response=reactionDecline(m);if(response)return respond(response);return}

 if(a==='choice-back'){stagedChoice=null;reactionGroup=null;renderDuel();return}

 if(a==='choice-confirm'){const chosen=stagedChoice;if(!chosen||chosen.key!==promptKey()){stagedChoice=null;renderDuel();return}stagedChoice=null;return respond(chosen.response)}

 if(a==='clear-places'){placeSet=[];renderDuel();return}

 if(a==='confirm-places'){const m=engine.pending;if(placeSet.length!==(m.count||1))return;const base=engine.choices(m).find(x=>x.response.places)?.response;if(base)return respond({...base,places:[...placeSet]});return}

 if(a==='unselect-done')return respond({type:R.SELECT_UNSELECT_CARD,index:null});

 if(a==='confirm-target')return confirmTargets();if(a==='cancel-target'){const m=engine.pending,type=m?.type===M.SELECT_TRIBUTE?R.SELECT_TRIBUTE:m?.type===M.SELECT_SUM?R.SELECT_SUM:m?.type===M.SELECT_UNSELECT_CARD?R.SELECT_UNSELECT_CARD:R.SELECT_CARD;return respond(type===R.SELECT_UNSELECT_CARD?{type,index:null}:{type,indicies:null})}

 if(a==='announce'){const m=engine.pending,values=[...document.querySelectorAll('[data-announce]:checked')].map(x=>1n<<BigInt(x.dataset.announce));if(values.length!==m.count)return toast('Choose '+m.count+' options.');return respond(m.type===M.ANNOUNCE_RACE?{type:R.ANNOUNCE_RACE,races:values}:{type:R.ANNOUNCE_ATTRIB,attributes:values.map(Number)})}

 if(a==='counters'){const counters=[...document.querySelectorAll('[data-counter]')].map(x=>+x.value);if(counters.reduce((a,b)=>a+b,0)!==engine.pending.count)return toast('Select the required counter total.');return respond({type:R.SELECT_COUNTER,counters})}

 if(a==='scorecard'){dialog('Coin scorecard',coinScorecardMarkup(content.battleCoinRules,state.run?.last_rewards));return}

 if(a==='relic-ledger'){if(modal.open&&modal.querySelector('.reward-screen'))showRewardOverlay('Run relics',relicLedgerMarkup(null,false));else dialog('Run relics',relicLedgerMarkup());return}

 if(a==='online'){menuPage='online';menuPageEntry='tag';menuIndex=0;render();return;}if(a==='main-menu'){menuPage='main';menuPageEntry='continue';menuIndex=baseMenu.findIndex(m=>m[4]==='continue');render();return;}
 if(['title','characters','routes','draft','shop','achievements','relics','collection'].includes(a))go(a);

}

document.addEventListener('change',e=>{if(e.target&&e.target.dataset&&e.target.dataset.draftSort!==undefined){draftSort=e.target.value;renderDraft()}});

// Sliders preview every movement; the settings are saved once, when the slider is released.
document.addEventListener('change',e=>{if(['manual-response-window','music','sound'].includes(e.target.id))void command('settings',state.settings)});
document.addEventListener('input',async e=>{if(e.target.id==='card-pick-search'||e.target.id==='name-pick-search'){const cardSearch=e.target.id==='card-pick-search';(cardSearch?cardPick:namePick).q=e.target.value;clearTimeout(pickSearchTimer);pickSearchTimer=setTimeout(cardSearch?refreshCardPick:refreshNamePick,120);return}if(e.target.id==='manual-response-window'){const value=Math.max(0,Math.min(2000,Number(e.target.value)||0));state.settings.manualResponseWindow=value;e.target.nextElementSibling.textContent=`${value} ms`}if(['music','sound'].includes(e.target.id)){state.settings[e.target.id]=+e.target.value;e.target.nextElementSibling.textContent=e.target.value+'%';track(screenMusic())}if(e.target.id==='announce-search'){const q=e.target.value.toLowerCase();document.querySelectorAll('.prompt [data-response]').forEach(b=>b.hidden=!b.textContent.toLowerCase().includes(q))}});

installEscapeInspection(()=>modal.open&&!!modal.querySelector('.inspect,.pile-inspection'),closeDialog);

window.androidBack=()=>{const reminder=document.querySelector('.replay-upload-reminder[open]');if(reminder){reminder.close();return}if(screen==='loading'||document.querySelector('.exodia-finale'))return;if(modal.open){closeDialog();if(screen==='duel')scheduleAI()}else if(cpuViewer){cpuViewer.back()}else if(tagUI)tagUI.action('exit',{dataset:{}});else if(screen==='duel')action('pause');else if(screen==='settings')action('settings-back');else go('title')};

// Use the same visible cancel button as a left click; never invent a response for forced prompts.

document.addEventListener('contextmenu',e=>{

 if(e.button!==2||e.pointerType==='touch'||screen!=='duel')return;

 e.preventDefault();

 if(busy||document.querySelector('.encounter-cinematic,.legendary-summon,.exodia-finale'))return;

 const scope=modal.open?modal:app;

 const cancel=[...scope.querySelectorAll('button.reaction-decline,button.duel-cancel')].find(button=>!button.disabled&&button.checkVisibility());

 cancel?.click();

});

window.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target?.dataset?.do==='duel-emotes'){e.preventDefault();action('duel-emotes',e.target);return;}if(['Enter',' '].includes(e.key)&&e.target?.dataset?.do==='device-secret'){e.preventDefault();action('device-secret',e.target);return;}if(screen==='title'&&e.key===(matchMedia('(orientation:portrait)').matches?'ArrowDown':'ArrowRight'))action('menu-next');if(screen==='title'&&e.key===(matchMedia('(orientation:portrait)').matches?'ArrowUp':'ArrowLeft'))action('menu-prev');});



async function boot(){try{

 document.querySelector('#loading-status').textContent='Step 1 of 6 · Reading game data and saved progress…';

 await installDesktopStorage();

 const [files,meta]=await Promise.all([fetch('campaign-files.json',{cache:'no-store'}).then(r=>r.json()),fetch('content.json',{cache:'no-store'}).then(r=>r.json())]);content=meta;for(const c of [...content.cards,...(content.tokenCards||[])])if(!cardsById.has(c.id))cardsById.set(c.id,c);

 await Promise.all([preloadCards([...content.cards,...(content.tokenCards||[])],({loaded,total,failed,bytes})=>{

  document.querySelector('#loading-count').textContent=`${loaded.toLocaleString()} / ${total.toLocaleString()} cards · ${(bytes/1048576).toFixed(1)} MB artwork read`;

  const bar=document.querySelector('#loading-progress');bar.max=Math.max(1,total);bar.value=loaded;

  document.querySelector('#loading-status').textContent=failed?`${failed} images could not load; checking remaining cards…`:'Step 2 of 6 · Loading card artwork…';

 })]);

 const preloadVisuals=await chooseStartupPreload(document.querySelector('.loading'));

 document.querySelector('#loading-status').textContent='Step 3 of 6 · Starting campaign runtime…';py=await loadPyodide({indexURL:new URL('pyodide/',location.href).href});installMemfsRenameCleanup(py.FS);

 py.FS.mkdirTree('/game/data');py.FS.mkdirTree('/game/data/decks');py.FS.mkdirTree('/game/saves');py.FS.mkdirTree('/game/runtime');

 for(const [name,text] of Object.entries(files))py.FS.writeFile('/game/'+name,text);

 const stored=window.ShadowNative?await ShadowNative.load():localStorage.getItem('shadow-run-mobile')||'{}';

 let saved={};try{saved=JSON.parse(stored)}catch{throw Error('Saved progress could not be read. It has not been overwritten.')}

 for(const [name,text] of Object.entries(saved))if(/^[\w-]+\.(json|bak)$/.test(name))py.FS.writeFile('/game/saves/'+name,text);

 document.querySelector('#loading-status').textContent='Step 4 of 6 · Restoring campaign…';

 await py.runPythonAsync("import sys\nsys.path.insert(0,'/game')\nimport mobile_backend");await command('init');applyCompatibilityMode();if(preloadVisuals&&!state.settings.simpleBackgrounds&&!state.settings.performanceMode&&!compatibilityEnabled()){document.querySelector('#loading-status').textContent='Step 4 of 6 · Loading background videos…';await preloadAllBackgrounds(({loaded,total})=>{document.querySelector('#loading-count').textContent=`${loaded} / ${total} backgrounds loaded`;const bar=document.querySelector('#loading-progress');bar.max=total;bar.value=loaded;});}

 document.querySelector('#loading-status').textContent='Step 5 of 6 · Loading sounds and selected assets…';

 const effects=await preloadStartupAssets(({loaded,total,bytes})=>{document.querySelector('#loading-count').textContent=`${loaded} / ${total} assets · ${(bytes/1048576).toFixed(1)} MB`;const bar=document.querySelector('#loading-progress');bar.max=total;bar.value=loaded;},{images:preloadVisuals,music:preloadVisuals,local:await assetsAreLocal()});

 // Finisher voice lines play from their downloaded files (juice.js), so they skip the up-front decode.
 document.querySelector('#loading-status').textContent='Step 6 of 6 · Preparing sound effects…';await preloadSoundEffects(effects.filter(path=>!/\/kill-[a-z]+\.wav$/.test(path)));

 screen='title';render();await notices();document.dispatchEvent(new CustomEvent('game-startup-ready',{detail:{newDevice:Object.keys(saved).length===0}}));if(new URLSearchParams(location.search).has('desktop')){if(new URLSearchParams(location.search).get('mode')==='cpu')await openCPU();else await openTag();}

 void startupAndroidUpdate({native:window.ShadowNative,online:navigator.onLine,prompt:async version=>{

  while(modal.open)await new Promise(resolve=>modal.addEventListener('close',resolve,{once:true}));

  dialog('Update',`<p>Would you like to update to version ${esc(version)}?</p><div class="actions">${btn('Update','android-download')}${btn('Close','close')}</div>`,false);

 }});

 startDeviceSync();

 window.shadowTest={command,state:()=>state,collector:()=>tagUI?.isCollector?tagUI:null,engine:()=>engine,screen:()=>screen,go,startDuel,respond};

 }catch(e){app.innerHTML=`<section class="loading"><img class="loading-wizard" src="assets/time-wizard.png" alt="Time Wizard"><h1>Could not start</h1><p>${esc(e.message)}</p><button id="retry-startup">Retry loading</button></section>`;document.querySelector('#retry-startup').onclick=()=>location.reload();console.error(e)}}

boot();



let tagCloudPhase=null;

let tagUI=null,tagOffline=null,tagDuelQueue=Promise.resolve(),tagFinalePlayed=false;
// A screen entrance plays when this key changes; online screens count their phase, tab and view.
mountMenuFeel(app,root=>screen==='tag'?['tag',tagUI?.mode??tagUI?.view?.phase,tagUI?.tab,root.classList[0],root.querySelector(':scope>:is(section,div):not(.tag-status,.game-vector-background)')?.classList[0]].join(':'):screen==='title'?'title:'+menuPage:screen);

const desktopToken=new URLSearchParams(location.search).get('desktop');

modal.addEventListener('close',()=>{if(desktopToken&&tagUI)desktopRPC('native-visible',true).catch(console.error)});

async function desktopRPC(action,value){const response=await fetch('/desktop-rpc',{method:'POST',headers:{'Content-Type':'application/json','X-Shadow-Token':desktopToken},body:JSON.stringify({action,value})});const data=await response.json();if(!response.ok)throw Error(data.error);return data.result}

// Startup can finish before the native child attaches; retry that handshake only.

async function reportDesktopLayout(attempt=0){

 if(!desktopToken)return;

 try{const result=await desktopRPC('browser-layout',{height:innerHeight,dpr:devicePixelRatio});if(!result?.attached&&attempt<40)setTimeout(()=>reportDesktopLayout(attempt+1),250)}catch(error){console.error(error)}

}

if(desktopToken)setTimeout(()=>reportDesktopLayout(),0);

window.addEventListener('resize',()=>{if(desktopToken)reportDesktopLayout();if(desktopToken&&tagUI&&screen==='duel')desktopRPC('native-layout',(app.querySelector('header')?.getBoundingClientRect().bottom||0)/innerHeight).catch(console.error)});

async function openCollector(draftMode=false){

 if(tagUI)return;tagOffline=state;screen='tag';tagDuelQueue=Promise.resolve();

 const owner=new (draftMode?DraftUI:CollectorUI)({root:app,content,profile:state.profile,backend:command,image,inspect,dialog,openPacks:presentPacks,getSlots:()=>state.slots,onResult:won=>track(won?'victory':'defeat'),onCheckpoint:()=>persist(true),

 onView:view=>{if(tagUI!==owner)return;if(view.phase==='duel')state={...state,run:view.run};else{screen='tag';engine=null;snapshot=null;}},

 onDuel:(s,cues)=>{tagDuelQueue=tagDuelQueue.catch(()=>{}).then(()=>{if(tagUI===owner&&owner.alive)return showTagDuel(s,cues,owner)});return tagDuelQueue;},

 onExit:async()=>{if(tagUI!==owner)return;clearTimeout(aiTimer);tagUI=null;engine=null;snapshot=null;await command('init');tagOffline=null;screen='title';render();}

 });

 tagUI=owner;

 try{await owner.init()}catch(error){owner.destroy();if(tagUI!==owner)return;tagUI=null;state=tagOffline;screen='title';render();dialog('Ultimate Collector',`<p>${esc(error.message)}</p>`);}

}

async function openTag(){

 tagCloudPhase=null;

 if(tagUI)return;tagOffline=state;screen='tag';track('characters');

 if(desktopToken){document.title='YGO Rogue Tag '+desktopToken.slice(0,12);const initial=await desktopRPC('bootstrap');state={...state,profile:initial.profile}}

 tagUI=new TagUI({sound:duelSound,tickSound:slotTickSound,stopTick:()=>slotTick.pause(),root:app,content,profile:state.profile,backend:desktopToken?desktopRPC:command,image,inspect,dialog,showRewards:showVictoryReceipt,showScorecard:()=>action('scorecard'),openPacks:presentPacks,onGoldenCards:offerGoldenCards,

 onView:view=>{const duelEnded=tagCloudPhase==='duel'&&view.phase!=='duel';tagCloudPhase=view.phase;if(duelEnded)void command('tag-profile',view.profile).then(()=>persist(true)).catch(error=>console.warn('Post-duel backup:',error.message));observeTagStats(view);state={...state,run:view.run,profile:view.profile};rewardPresentation?.refresh();track(view.phase==='duel'?(summonMusic.get(engine)||(view.duel?.mode==='pvp'?'champion':((view.run.round||0)+1)%3===0?'boss':'duel')):view.phase==='shop'?'shop':view.phase==='complete'?'victory':view.phase==='gameover'?'defeat':view.phase==='draft'?'draft':'characters');if(view.phase!=='duel'){document.querySelectorAll('.float-lp,.float-coins,.victory-settlement,.moving-card,.attack-beam,.duel-cue,.coin-toss,.dice-toss').forEach(el=>el.remove());screen='tag';engine=null;snapshot=null;if(desktopToken)desktopRPC('native-stop').catch(console.error)}},

 onDuel:(s,cues)=>{tagDuelQueue=tagDuelQueue.then(async()=>{if(!s.finished)tagFinalePlayed=false;await showTagDuel(s,cues);if(isCardWin(s.finished)&&!tagFinalePlayed){tagFinalePlayed=true;clearTimeout(aiTimer);removeActions();if(modal.open)modal.close();await playCardWin(s.finished)}}).catch(error=>toast(error.message));return tagDuelQueue;},

 onStatus:()=>{if(screen==='duel')tagConnectionBanner()},

 onBack:async profile=>{clearTimeout(aiTimer);engine=null;snapshot=null;screen='tag';busy=false;state={...tagOffline,profile};if(modal.open)modal.close();if(desktopToken)await desktopRPC('native-stop');track('characters')},

 onExit:async()=>{const profile=tagUI.profile;tagUI=null;engine=null;snapshot=null;state=tagOffline;tagOffline=null;await (desktopToken?desktopRPC:command)('tag-profile',profile);state.profile=profile;screen='title';if(desktopToken){window.suspendAudio();await desktopRPC('native-stop');await desktopRPC('desktop-exit')}else render()}

 });

 if(new URLSearchParams(location.search).has('tagtest'))window.tagTest={get ui(){return tagUI},get snapshot(){return snapshot},get engine(){return engine}};

}

async function showTagDuel(s,cues,owner=tagUI){

 if(!owner||tagUI!==owner||owner.view?.phase!=='duel')return;if(!owner.isCollector&&(s.tag.responseNumber||0)===0){const key=JSON.stringify([owner.view.run.round,owner.view.opponents]);if(owner.introKey!==key){owner.introKey=key;await playEncounterReveal({content,players:owner.view.characters,opponents:owner.view.opponents.filter(i=>i!=null),lp:s.lp,sound:duelSound,tickSound:slotTickSound,stopTick:()=>slotTick.pause(),active:()=>tagUI===owner&&owner.alive})}}const resumedPresentation=!engine?.tagFacade&&(s.tag.responseNumber||0)>0&&!cues.length;snapshot=s;screen='duel';track(screenMusic());

 if(!engine?.tagFacade){engine=Object.create(MobileDuel.prototype);engine.tagFacade=true;engine.cards=new Map([...content.cards,...content.tokenCards].map(c=>[c.id,c]));const facade=engine,data=await loadEngineData();if(tagUI!==owner||engine!==facade||owner.view?.phase!=='duel')return;engine.data=data;for(const c of Object.values(engine.data))c.race=BigInt(c.race);engine.query=(p,loc)=>{const side=snapshot.players[p];return loc===L.EXTRA?(side.extraCards||[]):side[{[L.HAND]:'hand',[L.MZONE]:'monsters',[L.SZONE]:'spells',[L.GRAVE]:'grave',[L.REMOVED]:'banished'}[loc]]||[]};engine.core={duelQueryCount:(_,p,loc)=>loc===L.DECK?snapshot.players[p].deck:loc===L.EXTRA?snapshot.players[p].extra:engine.query(p,loc).length};engine.destroy=()=>{}}

 engine.presentationDuel=s.tag.presentationDuel;Object.assign(engine,s.tag.ui,{pending:s.pending,visuals:cues,turn:s.turn,phase:s.phase,player:s.player,lp:s.lp});renderDuel();

 if(resumedPresentation)await updateCoinMilestones(true);await playDuelCues(s.player===0);if(tagUI!==owner||owner.view?.phase!=='duel')return;renderDuel();if(s.finished&&!engine.polishFinished){engine.polishFinished=true;await duelFinish(s.finished.player,s.finished.reason)}tagConnectionBanner();scheduleAI();

}

function tagConnectionBanner(){

 document.querySelector('.tag-duel-banner')?.remove();document.querySelector('.tag-duel-paused')?.remove();

}



let cpuViewer=null;

async function openCPU(){

 screen='cpu';clearTimeout(aiTimer);track('duel');

 const hasBundledCPUDecks=Object.keys(content.cpuWatchDecks||{}).length>0&&Object.keys(content.cpuWatchOpponents||{}).length>0;const catalog=hasBundledCPUDecks?{cpuWatchDecks:content.cpuWatchDecks,cpuWatchOpponents:content.cpuWatchOpponents}:await command('cpu-catalog');if(screen!=='cpu')return;

 cpuViewer=new CPUViewer({root:app,content:{...content,...catalog},inspect,dialog,onExit:async()=>{cpuViewer=null;if(desktopToken){window.suspendAudio();await desktopRPC('desktop-exit')}else go('title')}});

}



function collectionFilters(){return [['type',collectionType,['All types','Monster','Spell','Trap']],['attribute',collectionAttribute,['All attributes','EARTH','WATER','FIRE','WIND','LIGHT','DARK','DIVINE']]].map(([key,value,choices])=>`<label>${key}<select data-collection-filter="${key}">${choices.map(x=>`<option ${x===value?'selected':''}>${x}</option>`).join('')}</select></label>`).join('')}

document.addEventListener('change',e=>{const key=e.target.dataset?.collectionFilter;if(!key)return;if(key==='type')collectionType=e.target.value;if(key==='attribute')collectionAttribute=e.target.value;if(key==='effect')collectionEffect=e.target.value;if(key==='registration')collectionRegistration=e.target.value;collectionPage=0;renderCollection()});

function boosterDescription(p){const base=allCardsPackDescription(p),summary=packSummary(content,p.id),archetypes=summary.match(/Archetypes:[^.]+/);return [base||summary,base&&archetypes?.[0]].filter(Boolean).join(' ')}

async function inspectPack(pid){

 const p=content.packs.find(x=>x.id===pid);if(!p)return;

 dialog(p.name,`<p>${esc(boosterDescription(p))}</p><section data-pack-inspection><p>Loading card odds…</p></section>`);

 const panel=modal.querySelector('[data-pack-inspection]');

 try{

  const entries=await command('pack-inspect',pid);if(!panel.isConnected)return;

  const unregistered=entries.filter(x=>!registeredCard(x.id)).length;

  panel.innerHTML=`<label>Sort by <select data-pack-sort><option value="rarity">Rarity (rarest pulls first)</option><option value="frame">Card frame</option><option value="unregistered">Unregistered first</option></select></label><small class="muted pack-registration-count">${unregistered} / ${entries.length} cards unregistered · Odds per 9-card pack, rounded</small><div class="cardgrid"></div><button data-pack-more>Show more</button>`;

  const select=panel.querySelector('select'),grid=panel.querySelector('.cardgrid'),more=panel.querySelector('[data-pack-more]');let shown=80,sorted=[];

  const draw=()=>{sorted=sortPackCards(entries,select.value,card,registeredCard);grid.innerHTML=sorted.slice(0,shown).map(x=>`<button class="cardbtn" data-preview="${x.id}" data-inspect="${x.id}" aria-label="${esc(card(x.id)?.name||'Card')} · ${x.locked?'Locked':formatPackChance(x.chance)}"><img draggable="false" loading="lazy" src="${image(x.id)}" alt="${esc(card(x.id)?.name||'Card')}"><span>${x.locked?'Locked':formatPackChance(x.chance)}</span></button>`).join('');more.hidden=shown>=sorted.length;};

  select.addEventListener('change',()=>{shown=80;draw()});more.addEventListener('click',()=>{shown+=80;draw()});draw();

 }catch(error){if(panel.isConnected)panel.textContent='Could not load pack details: '+error.message;}

}

function relicNegated(){return screen==='duel'&&state.run?.curses?.includes('relic_seal')}

function relicIndicatorMarkup(){return `<div class="active-relic-strip" aria-label="Run relics">${ownedRelics().map(id=>`<button data-do="relic-detail" data-relic="${id}" class="${relicNegated()?'negated':''}" aria-label="${esc(content.artifacts[id]?.[0])}: ${relicNegated()?'Negated this duel. ':''}${esc(content.artifacts[id]?.[2])}">${relicArtwork(relicImage(content.artifactInfo[id].art))}${relicCountBadge(id)}</button>`).join('')}</div>`}

function relicLedgerMarkup(only=null,allowSell=true){const ids=ownedRelics().filter(id=>!only||only===id),cursed=new Set(state.run?.cursed_artifacts||[]);return `<div class="relic-ledger"><p>Permanent run relics · ${relicNegated()?'Relic Seal negates all duel effects until this duel ends.':'Effects apply when their listed conditions are met.'}</p><div class="relic-ledger-grid">${ids.map(id=>`<section class="panel ${relicNegated()?'negated':''}">${relicArtwork(relicImage(content.artifactInfo[id].art))}${relicCountBadge(id)}<h3>${esc(content.artifacts[id][0])}</h3><b>${relicNegated()?'NEGATED THIS DUEL':'OWNED · CONDITIONAL EFFECTS'}</b><p>${esc(content.artifacts[id][2])}</p>${id==='magic_mirror'&&state.run.mirror_copy?`<small>Current copy: ${esc(content.artifacts[state.run.mirror_copy]?.[0]||'')}</small>`:''}${allowSell&&screen==='shop'&&!cursed.has(id)?`<button class="sell-owned-relic" data-do="sell-relic" data-relic="${esc(id)}" aria-label="Sell ${esc(content.artifacts[id][0])} for ${Math.floor((content.artifacts[id]?.[1]||0)/2)} coins">Sell · ${Math.floor((content.artifacts[id]?.[1]||0)/2)} coins</button>`:''}</section>`).join('')}</div></div>`}

function liveCardDetails(code){if(screen!=='duel'||!snapshot)return '';const rows=[];for(let p=0;p<2;p++)snapshot.players[p].monsters.forEach((c,i)=>{if(!c||c.code!==code||p===1&&!(c.position&5))return;const base=card(code);const delta=c.attack-base.atk;const defenseDelta=c.defense-base.defense;const attacking=engine.pending?.player===p&&engine.pending?.type===M.SELECT_BATTLECMD;const available=attacking&&engine.pending.attacks?.some(x=>x.sequence===i);rows.push(`<p class="live-stats">${p?'Opponent':'Your'} zone ${i+1}: ATK ${c.attack} (${delta>=0?'+':''}${delta}) · DEF ${c.defense} (${defenseDelta>=0?'+':''}${defenseDelta}) versus printed stats.${c.position&12?' Defense Position.':''}${attacking?(available?' Attack available.':' Cannot declare an attack right now.'):''}${engine.battleProtected?.[1-p]?' Opposing monsters and LP are protected by Waboku this turn.':''}${p===0&&relicNegated()?' Relic bonuses and penalties are negated.':''}</p>`)});return rows.join('')}

function runTimelineMarkup(r){return `<section class="run-timeline"><h3>Run timeline</h3>${(r.timeline||[]).map(x=>`<span class="${x.won?'won':'lost'}">${x.loop>1?'Loop '+x.loop+' · ':''}Duel ${x.duel}: ${esc(content.characters[x.opponent]?.name)} — ${x.won?'Win':'Loss'} · ${x.lp_after_healing.toLocaleString()} LP</span>`).join('')||'<p>Detailed timeline is available for duels played after this update.</p>'}</section>`}



installShopGestures(document,{

 tap:index=>{if(tagUI)return tagUI.action('select',{dataset:{index}}).catch(e=>toast(e.message));if(screen==='shop')return action('select-purchase',{dataset:{index}})},

 hold:index=>{if(tagUI)return tagUI.action('item',{dataset:{index}}).catch(e=>toast(e.message));if(screen==='shop')return action('item-info',{dataset:{index}})}

});



function renderRunHistory(){const rows=state.history||state.profile.run_history||[];shell('Collection',`<div class="collection-nav">${['cards','packs','relics','history','personal','global','collectors','achievements'].map(k=>btn(k==='collectors'?'Ultimate Collectors':k==='personal'?'Device Stats':k==='global'?'Global Stats':k==='history'?'Run History':k[0].toUpperCase()+k.slice(1),'collection-kind',`data-kind="${k}"`,k==='history'?'primary':'')).join('')}</div><div class="scroll run-history">${rows.map(r=>{const c=content.characters[r.character],date=r.finished_at||r.started_at;return `<article class="panel run-history-row ${r.result==='complete'?'run-won':'run-lost'}"><img loading="lazy" src="assets/${c?.sprite}" alt=""><div><h2>${esc(c?.name||'Unknown character')} · ${r.result==='complete'?'Completed':'Lost'}</h2><p>${r.mode==='tag'?'Tag with '+esc(content.characters[r.partner]?.name||'teammate'):'Solo'} · LVL ${r.challenge_level||0} · Loop ${(r.loop||0)+1} · ${r.round||0}/9 victories</p><p>${date?new Date(date*1000).toLocaleString():'Date not recorded'} · ${r.lp||0} LP · ${r.gold||0} coins</p>${r.loss?.text?`<p>${esc(r.loss.text)}</p>`:''}<details><summary>Run details</summary><p>Relics: ${(r.artifacts||[]).map(id=>esc(content.artifacts[id]?.[0]||id)).join(', ')||'None'}</p>${r.encore_won?'<p>Optional champion defeated.</p>':''}${runTimelineMarkup(r)}</details></div></article>`}).join('')||'<div class="panel"><h2>No recorded runs yet</h2><p>Completed and lost runs will appear here. Older runs that were already deleted cannot be reconstructed.</p></div>'}</div>`)}



document.addEventListener('click',e=>{const b=e.target.closest('[data-effect-search]');if(!b||!['draft','collection'].includes(b.dataset.effectSearch))return;openSearch(b.dataset.effectSearch, b.dataset.effectSearch==='draft'?state.run.pool.map(card):content.cards,()=>{collectionPage=0;screen==='draft'?renderDraft():renderCollection()})});



let pendingDesktopProfile=null;

document.addEventListener('change',async e=>{

 if(e.target.id!=='desktop-profile-file')return;

 const file=e.target.files?.[0];e.target.value='';if(!file)return;

 try{

  if(file.size>8000000)throw Error('Choose a profile file smaller than 8 MB.');

  pendingDesktopProfile=await file.text();

  dialog('Import desktop progress?',`<p>Merge unlocks, achievement progress and run history from ${esc(file.name)}? Existing progress is kept; repeated imports do not add duplicate totals or history.</p><p>Your active runs, decks and settings will stay unchanged.</p>${btn('Merge progress','import-profile-confirm')}${btn('Cancel','close')}`);

 }catch(error){pendingDesktopProfile=null;toast(error.message)}

});



// cursed_artifacts classifies entries already present in artifacts; it is not a second inventory.

function relicCountBadge(id){const count=(state.run?.artifacts||[]).filter(x=>x===id).length;return count>1?`<span class="relic-count" aria-label="${count} copies">×${count}</span>`:'';}

function ownedRelics(){return [...new Set(state.run?.artifacts||[])].filter(id=>content.artifacts[id]&&content.artifactInfo[id]);}

function cardCountersMarkup(c){

 const turns=Number.isFinite(c.turnCount)?`<span class="card-counter turn-counter" data-counter-kind="turn" data-count="${c.turnCount}" title="${c.turnCount} turns elapsed" aria-label="${c.turnCount} turns elapsed">◷ ${c.turnCount}</span>`:'';

 const raw=c.counters||[],entries=Array.isArray(raw)?raw:Object.entries(raw).map(([type,count])=>({type:Number(type),count}));

 const spell=entries.reduce((sum,x)=>sum+((x.type??x.counter_type??x[0])===1?Number(x.count??x.counter_count??x[1]??0):0),0);

 return turns+(spell?`<span class="card-counter spell-counter" data-counter-kind="spell" data-count="${spell}" title="${spell} Spell Counters" aria-label="${spell} Spell Counters">✦ ${spell}</span>`:'');

}



document.addEventListener('shop-ultra',()=>{if(state?.settings.sound){packSound('rare-shimmer')}});



startStats(()=>!cpuViewer&&!['loading','title','settings','collection','achievements','tutorial','gallery'].includes(screen));

async function renderGlobalStats(){

 shell('Collection',`<div class="collection-nav">${['cards','packs','relics','history','personal','global','collectors','achievements'].map(k=>btn(k==='collectors'?'Ultimate Collectors':k==='personal'?'Device Stats':k==='global'?'Global Stats':k==='history'?'Run History':k[0].toUpperCase()+k.slice(1),'collection-kind',`data-kind="${k}"`,k==='global'?'primary':'')).join('')}</div><div class="scroll" id="global-stats-panel"><p>Loading worldwide totals…</p></div>`);

 const panel=document.querySelector('#global-stats-panel');

 try{const s=await fetchStats();if(!panel.isConnected)return;panel.innerHTML=`<p>Worldwide activity since ${esc(new Date(s.since).toLocaleDateString())}. Offline activity syncs when connected.</p><div class="global-stats-grid">${[['Total Players',s.firstTimePlayers ?? s.devices],['Runs started',s.runs],['Duels started',s.duels],['Duels won',s.wins],['Duels lost',s.losses],['Active play hours',(s.seconds/3600).toFixed(1)]].map(([label,value])=>`<section class="panel" ${label==='Total Players'?'data-do="device-secret" role="button" tabindex="0" aria-label="Total Players"':''}><h2>${esc(Number(value).toLocaleString())}</h2><p>${label}</p></section>`).join('')}</div><p>Estimated players opening the game without save data, plus the previous device total. Reinstalling, clearing browser data, or using another browser can count the same player again. Idle/background time is excluded. No names or save files are uploaded.</p>`}catch(error){if(panel.isConnected)panel.innerHTML=`<p>${esc(error.message)}</p>${btn('Retry','global-stats-retry')}`}

}



const coinMilestones=new WeakMap(),duelAnimations=new WeakMap(),coinProgress=new WeakMap();

const coinVoicePool=Array.from({length:3},()=>new Audio());let coinVoiceIndex=0;

function stopCoinSounds(){for(const voice of coinVoicePool){voice.pause();voice.removeAttribute('src');voice.load()}}

let lastCoinSound=-1;

// Pickups that land during a finisher are 6 dB quieter, under its voice line.
function playCoinPickup(){

 const volume=(state.settings.sound||0)/100;if(!volume||document.hidden)return;

 const choices=[0,1,2].filter(i=>i!==lastCoinSound),pick=choices[Math.floor(Math.random()*choices.length)];lastCoinSound=pick;

 const sound=coinVoicePool[coinVoiceIndex++%coinVoicePool.length];sound.pause();sound.src=assetURL('sound/coin-pickup'+(pick?'-'+(pick+1):'')+'.wav');sound.load();balancedVolume(sound,volume,juice.finisherPlaying()?.38:.75);sound.play().catch(()=>{});

}

function duelAnimationState(owner){let state=duelAnimations.get(owner);if(!state){state={pending:new Set(),nextCoinAt:0,lane:0,bossVictoryShown:false};duelAnimations.set(owner,state)}return state}

function trackDuelAnimation(owner,promise){const state=duelAnimationState(owner);state.pending.add(promise);promise.finally(()=>state.pending.delete(promise));return promise}

async function finishDuelAnimations(owner){

 // The PERFECT or overkill finisher has the screen to itself before the victory banners.
 await juice.finisherDone();
 const animations=duelAnimationState(owner);let banner;
 if(!animations.bossVictoryShown&&snapshot?.finished?.player===0&&!isCardWin(snapshot.finished)&&(state.run?.encore_active||((state.run?.round||0)+1)%3===0)){animations.bossVictoryShown=true;if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const field=document.querySelector('.field-wrap');if(field){const box=field.getBoundingClientRect(),flash=document.createElement('div');flash.setAttribute('aria-hidden','true');Object.assign(flash.style,{position:'fixed',left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px',zIndex:300,pointerEvents:'none',background:'radial-gradient(ellipse at center, #ffe28c88 0%, #ffd45b33 52%, transparent 78%)'});document.body.append(flash);const animation=flash.animate([{opacity:0},{opacity:.9,offset:.35},{opacity:0}],{duration:760,easing:'ease-out'});await animation.finished.catch(()=>{});flash.remove()}}}
 if(animations.pending.size&&snapshot?.finished?.player===0&&!isCardWin(snapshot.finished)&&!document.querySelector('.victory-settlement')){

  const field=document.querySelector('.field-wrap');

  if(field){const box=field.getBoundingClientRect();banner=document.createElement('div');banner.className='victory-settlement';banner.setAttribute('role','status');banner.innerHTML='<div class="victory-rays"></div><div class="victory-title"><span>DUEL WON</span><strong>VICTORY</strong><small>Collecting battle rewards</small></div>';Object.assign(banner.style,{left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px'});document.body.append(banner);}

 }

 try{while(animations.pending.size)await Promise.all([...animations.pending]);}finally{banner?.remove();}

}

async function updateCoinMilestones(silent=false){

 if(!engine||!snapshot||snapshot.tag?.pvp||!py)return;

 const owner=engine,run=state.run,events=owner.tagFacade?snapshot.tag.rewardEvents:owner.summary();if(!events)return;

 try{

  // A pure calculation: skip the Python round trip when none of its inputs changed since the last move.
  const request={run:{lp:snapshot.lp[0],round:run.round,character:run.character,guaranteed:run.guaranteed,artifacts:run.artifacts,encore_active:run.encore_active},events,victory:snapshot.finished?.player===0};
  const key=JSON.stringify(request),cached=coinProgress.get(owner),earned=cached?.key===key?cached.earned:await command('reward-progress',request);
  coinProgress.set(owner,{key,earned});

  if(owner!==engine||screen!=='duel')return;

  refreshCoinBonuses(earned);

  const seen=coinMilestones.get(owner)||new Set();coinMilestones.set(owner,seen);const animation=duelAnimationState(owner);

  for(const [label,coins] of Object.entries(earned)){if(seen.has(label))continue;seen.add(label);if(silent)continue;

   const now=Date.now(),wait=Math.max(0,animation.nextCoinAt-now),lane=animation.lane++%3;animation.nextCoinAt=now+wait+336;trackDuelAnimation(owner,new Promise(resolve=>setTimeout(()=>{if(engine!==owner||screen!=='duel'){resolve();return}const field=document.querySelector('.field-wrap');if(!field){resolve();return}const box=field.getBoundingClientRect(),el=document.createElement('div');el.className='float-coins';el.title=label;el.setAttribute('aria-label',label+': +'+coins+' coins');el.innerHTML=`<b>+${coins}</b><img src="assets/ui/coins.png" alt="coins">`;Object.assign(el.style,{left:box.left+box.width*(.38+lane*.12)+'px',top:box.top+box.height*.76+'px'});document.body.append(el);setTimeout(()=>{el.remove();resolve()},2040);playCoinPickup();},wait)));

  }

 }catch(error){console.warn('Coin milestone preview unavailable',error.message)}

}



function renderPersonalStats(){

 const p=state.profile,rows=state.history||p.run_history||[],won=rows.filter(r=>r.result==='complete').length;

 const metrics=[['Active hours played',Math.round(personalPlaySeconds()/360)/10],['Runs started',Math.max(p.runs||0,rows.length,p.wins||0)],['Runs won',p.wins||0],['Duels won',p.victories||0],['Recorded runs lost',rows.length-won],['Characters unlocked',p.unlocked?.length||0],['Most coins held',p.max_gold||0],['Most relics held',p.max_artifacts||0],['Singles bought',p.singles_bought||0],['Starter decks bought',p.decks_bought||0]];

 shell('Collection',`<div class="collection-nav">${['cards','packs','relics','history','personal','global','collectors','achievements'].map(k=>btn(k==='collectors'?'Ultimate Collectors':k==='personal'?'Device Stats':k==='global'?'Global Stats':k==='history'?'Run History':k[0].toUpperCase()+k.slice(1),'collection-kind',`data-kind="${k}"`,k==='personal'?'primary':'')).join('')}</div><div class="scroll personal-stats"><p>Your saved progress on this device, including imported progress. Losses cover retained run history. Active hours are tracked on this device; older untracked playtime is not included.</p><div class="personal-stat-grid">${metrics.map(([name,n])=>`<article class="panel"><strong>${Number(n).toLocaleString()}</strong><span>${name}</span></article>`).join('')}</div><section id="defeated-collectors"><h2>Defeated Ultimate Collector duelists</h2><p>Loading records…</p></section></div>`);

 void loadDefeatedCollectors();

}



let defeatedCollectors=[];

async function loadDefeatedCollectors(){

 const target=document.getElementById('defeated-collectors');if(!target)return;

 try{const data=await command('collector-list');if(!target.isConnected)return;defeatedCollectors=data.duelists.filter(d=>d.status==='eliminated').sort((a,b)=>(b.defeatedAt||0)-(a.defeatedAt||0));

 target.innerHTML='<h2>Defeated Ultimate Collector duelists</h2><p>Memorial records only — these duelists cannot be played again.</p>'+ (defeatedCollectors.map((d,i)=>`<article class="collector-memorial"><img src="assets/${esc(content.characters[d.character]?.sprite)}" alt="${esc(content.characters[d.character]?.name)}"><div><h3>${esc(d.name)}</h3><p>${esc(content.characters[d.character]?.name)} · ${rankFor(d.wins)} · ${Number(d.wins||0)} match wins</p>${d.defeatedAt?`<p>${esc(new Date(d.defeatedAt).toLocaleDateString())} · ${esc(d.defeatReason||'Defeated')}</p>`:''}${d.defeatedDeck?btn('View decks at defeat','defeated-collector-deck',`data-index="${i}"`):'<p>No deck snapshot was saved for this older duelist.</p>'}</div></article>`).join('')||'<p>No defeated Ultimate Collector duelists recorded.</p>');

 }catch(error){if(target.isConnected)target.innerHTML='<h2>Defeated Ultimate Collector duelists</h2><p>'+esc(error.message)+'</p>';}

}

function showDefeatedCollector(index){const d=defeatedCollectors[index];if(!d?.defeatedDeck)return;dialog(d.name+' — decks at defeat','<p>Read-only snapshot from this duelist’s final match.</p>'+[['main','Main Deck'],['side','Side Deck'],['extra','Fusion Deck']].map(([key,label])=>{const ids=d.defeatedDeck[key]||[];return `<h3>${label} · ${ids.length} cards</h3>${ids.length?`<div class="cardgrid">${ids.map(id=>`<button class="cardbtn" data-inspect="${id}"><img loading="lazy" src="${image(id)}" alt="${esc(card(id)?.name)}"><span>${esc(card(id)?.name)}</span></button>`).join('')}</div>`:'<p>Empty</p>'}`;}).join(''));}



const deviceSync=new DeviceSync(command);

async function showDeviceSync(message=''){

 const {linked}=await deviceSync.run('status');

 dialog('Link devices',`<p>Sync unlocked characters, completed achievements, challenge levels and secret unlocks. Runs, cards, Ultimate Collector duelists and device statistics stay on this device.</p>${message}<p>${linked?'This device is linked. Unlocks sync automatically while online in menus.':'Generate a code here, then enter it on your other device.'}</p>${btn('Generate code','device-sync-create')}${linked?btn('Sync now','device-sync-now')+btn('Disconnect this device','device-sync-unlink'):`<label>Code from your other device <input id="device-link-code" maxlength="12" autocapitalize="characters" autocomplete="off" spellcheck="false"></label>${btn('Link','device-sync-join')}`}`);

}

let deviceSyncTimer;

function startDeviceSync(){

 clearInterval(deviceSyncTimer);

 const sync=async()=>{if(deviceSync.linked===false||document.hidden||navigator.onLine===false||tagUI||!['title','settings','collection','achievements','characters'].includes(screen))return;try{const before=JSON.stringify(state.profile),result=await deviceSync.run('sync');if(result.linked&&before!==JSON.stringify(state.profile)&&!modal.open&&!tagUI&&['title','collection','achievements','characters'].includes(screen))render();}catch{/* Retry on the next menu sync; offline play keeps working. */}};

 void sync();deviceSyncTimer=setInterval(sync,60000);

}



// Recovery is explicit; normal background backups never replace local progress.

document.addEventListener('change',async event=>{

 if(event.target.id!=='device-recovery-file')return;

 try{const file=event.target.files[0];if(!file)return;if(file.size>16*1024*1024)throw Error('Recovery file is too large.');const recovery=JSON.parse(await file.text());validateRecovery(recovery);

 if(!confirm('Restore this device backup? This replaces current runs, progress and Ultimate Collectors.'))return;

 deviceBackup.destroy();

 await restoreRecovery(recovery,{loadSave:async()=>window.ShadowNative?await ShadowNative.load():localStorage.getItem('shadow-run-mobile')||'{}',storeSave:async data=>{if(window.ShadowNative){if(!await ShadowNative.store(data))throw Error('Could not save recovered progress.')}else localStorage.setItem('shadow-run-mobile',data)}});

 location.reload();

 }catch(error){deviceBackup.resume();dialog('Save recovery',`<p>${esc(error.message)}</p>`)}finally{event.target.value=''}

});



window.addEventListener('resize',()=>tagUI?.drawTurnTimer?.());



// Hover previews share the same facts as Inspect, including per-copy stat changes.

installHandHover(app);

installMouseDetails(app,el=>{

 if(modal.open||!content)return null;

 let id=Number(el.dataset.preview||el.dataset.id),run=tagUI?.view?.run||state.run;

 const packDetails=pid=>{const p=content.packs.find(p=>p.id===pid);return p?`<h3>${esc(p.name)}</h3><p>${esc(boosterDescription(p))}</p>`:null;};

 if(el.closest('.duel')&&(el.dataset.relic||el.dataset.enemyRelic)){const key=el.dataset.relic||el.dataset.enemyRelic,a=content.artifacts[key];if(!a)return null;const enemy=!!el.dataset.enemyRelic;return `<h3>${enemy?'Opponent relic: ':''}${esc(a[0])}</h3>${!enemy&&relicNegated()?'<p>Negated this duel.</p>':''}<p>${esc(enemy?a[2].replace(/you control/g,'your opponent controls').replace(/Your/g,'Opponent’s'):a[2])}</p>`;}

 if(el.dataset.curse){const key=el.dataset.curse;return content.curses[key]?`<h3>${esc(content.curses[key][0])}</h3><p>${esc(curseDescription(content,key,run?.challenge_level||0))}</p>`:null;}

 const packId=el.dataset.pack||el.getAttribute('src')?.match(/^assets\/packs\/(.+)\.jpg$/)?.[1];

 if(packId)return packDetails(packId);

 if(el.matches('.product-art')){

  const item=run?.shop?.[Number(el.dataset.shopItem)];if(!item)return null;

  if(item.kind==='artifact'){const a=content.artifacts[item.id];return a?`<h3>${esc(a[0])}</h3><p>${esc(a[2])}</p>`:null;}

  if(item.kind==='pack')return packDetails(item.id);

  if(item.kind!=='single')return null;id=Number(item.id);

 }

 let c=card(id);if(!c)return null;

 const index=el.dataset.pick??(el.dataset.tag==='card'?el.dataset.index:null),mod=index==null?null:run?.card_mods?.[index];

 if(index!=null)c=modifiedCard(c,run,index);

 return `${cardFacts(c)}<p class="mouse-details-effect">${esc(displayCardText(c.desc))}</p>`;

});



document.addEventListener('change',e=>{if(e.target.matches('[data-preload-visuals]'))setPreloadVisualPreference(e.target.checked)});



deviceBackup.setUploadGuard(()=>screen!=='duel'&&tagUI?.view?.phase!=='duel');

document.addEventListener('change',e=>{if(e.target.id==='cloud-saves-enabled')deviceBackup.setEnabled(e.target.checked)});



// Capture before draft/duel context-menu handlers so closing never selects underneath.

document.addEventListener('contextmenu',e=>{if(e.pointerType==='touch'||!modal.open||!modal.querySelector('.inspect,.pile-inspection'))return;e.preventDefault();e.stopImmediatePropagation();closeDialog();},true);

function modifierRowsMarkup(rows=[]){if(!rows.length)return '<p>No active curses or LVL modifiers.</p>';return `<div class="active-modifier-list">${rows.map(row=>{let art='';if(row.kind==='curse'&&row.key)art=`<span class="curse-icon curse-${esc(row.key)}" aria-hidden="true"><img src="${curseIconFile(row.key)}" alt=""></span>`;else if(row.kind==='opponent-relic'&&row.id){const info=content.artifactInfo[row.id];art=info?.art?relicArtwork(relicImage(info.art)):'<img class="modifier-generic-icon" src="assets/ui/relics.png" alt="">';}else if(row.kind==='level'){const level=Number(row.name.match(/-?\d+/)?.[0]??0);art=`<span class="level-badge challenge-level-badge modifier-level-image" data-challenge-level="${level}" aria-hidden="true"><span>LVL</span><img src="assets/icons/level-star.png" alt=""><strong>${level}</strong></span>`;}return `<section class="panel active-modifier-row"><div class="active-modifier-art">${art}</div><div class="active-modifier-copy"><h3>${esc(row.name)}</h3><p>${esc(row.description)}</p></div></section>`;}).join('')}</div>`;}
function duelCurseMarkup(){const r=state.run||{},enemy=r.opponent_relic;return (r.curses?.length||enemy)?`<div class="active-curse-strip" aria-label="Active curses and opponent relics">${curseIcons(content,r.curses||[])}${enemy?`<button data-do="active-curses" data-enemy-relic="${enemy}" aria-label="Opponent relic: ${esc(content.artifacts[enemy]?.[0])}">${relicArtwork(relicImage(content.artifactInfo[enemy].art))}</button>`:''}</div>`:'';}

