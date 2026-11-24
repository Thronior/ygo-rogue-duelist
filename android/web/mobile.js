// First: every request to the online servers carries the signed build ID (servers.js).
import './servers.js';
import {applyDisplayOptions,DECK_COLUMNS_MIN,DECK_COLUMNS_MAX,DUEL_THEMES,autoUiScale,uiScaleValue} from './display-options.js';
import {pageRect,pageWidth,pageHeight,unzoom} from './ui-zoom.js';
import {typeChoicePending,closeStaleTypeChoice} from './type-choice.js';
import {CARD_BACK,allSleeves,sleevePayload,chosenSleeve,chosenSleeveImage,sleeveCondition,sleeveImage,sleeveName,sleeveTier,sleeveUnlocked} from './sleeves.js';
import {activeEffectsMarkup,changesStats} from './active-effects.js';
import {loadingTip} from './loading-tips.js';
import {relicEyeIcon} from './relic-eye-icon.js';
import {replayVersion} from './replay-version.js';
import {loadEngineData} from './engine.js';
import {frameLevelName,deckCardMarkup,modifiedCard,deckStats,attributeOrder,misprintNoticeLine,bossStatCurses,bossCurseNote} from './feedback-ui.js';
import {iconChoices,iconChoiceGrid} from './type-attribute-icons.js';

import {openDeckPreview} from './deck-preview.js';

import {releaseEmbeddedOrientation} from './embedded-orientation.js';

releaseEmbeddedOrientation();

import {sortRelicCollection} from './relic-collection.js';

import {applyCommandUpdate,phaseCheckpoint} from './state-update.js';

import {installMemfsRenameCleanup} from './memfs-cleanup.js';

import {deckMinimum,deckMinimumNotice,copyLimitText,copyLimit,fixedDeck} from './deck-minimum.js';

import {chooseStartupPreload,preloadVisualPreference,setPreloadVisualPreference,assetsAreLocal} from './startup-choice.js';

import {installEscapeInspection} from './escape-inspection.js';
import {installDuelKeys,nextPhaseButton} from './duel-keys.js';
import * as hotkeys from './hotkeys.js';
import {hotkeysPane,hotkeyAction} from './hotkeys-ui.js';
import {installGamepad} from './gamepad.js';

import {installHandHover} from './hand-hover.js';

import {setUISoundVolume,playUISound,stopUISounds,playRerollSound} from './ui-sounds.js';

import {installMouseDetails} from './mouse-details.js';

import {preloadStartupAssets,assetURL,originalAssetPath} from './startup-assets.js';

import {deckRewardMarkup,mountDeckRewards} from './engine-rewards.js?v=reward-persistent-1';

import {preloadAllBackgrounds,preloadBackground,backgroundSpec} from './background-assets.js';

import {renderDuelDOM,clearDuelDOM} from './duel-dom.js';

import {installVectorBackgrounds} from './vector-backgrounds.js';
import {installAmbientClock} from './ambient-clock.js';

import {play3DToss} from './toss-3d.js';
import {playWheelSpin,coinCallLabel,isCoinCall} from './time-wizard-wheel.js';

import {deviceBackup,validateRecovery,restoreRecovery,recoveryFromFile} from './device-backup.js';
import {cloudSettingsMarkup,cloudCodeMarkup,cloudRestoreMarkup,cloudFoundMarkup,cloudFirstBootMarkup,copyCloudCode,saveCloudCode} from './cloud-save-ui.js';

import {characterEntrance,cancelCharacterEntrance} from './character-entrance.js';

import {decorateEffectTargets,pulseRelic,relicAskArt,negateCard,deckReadyFeedback,cardPlace} from './selection-feedback.js';
import {compactLifeBursts} from './lp-cue-burst.js';

import {configureCounterAudio,stopCounterAudio,purchaseCoins,stopPurchaseCoins} from './counter-audio.js';

import {remindReplayUpload} from './replay-upload-reminder.js';

import {polishDuel,polishShop,duelFinish} from './presentation-polish.js';
import {coinLabel} from './coin-label.js';
import * as juice from './juice.js';
import * as keeperTalk from './shopkeeper-talk.js';
import {opponentScene} from './opponent-backgrounds.js';
import {ownedBadge} from './shop-badges.js';

import {showShadowVictory,clearShadowVictory} from './shadow-victory.js';
import {mountRunCard,copyRunCard,saveRunCard,runCardName} from './run-card.js';
import {fitButtonLabels} from './label-fit.js';
import {bountyBanner} from './bounty-banner.js';
import {activationBlock,SET_TURN_TEXT} from './activation-reasons.js';
import {explainOnlineError,explainNetworkError} from './online-status.js';
import {mountRunProgress} from './run-progress.js';
import {coinScorecardMarkup} from './coin-scorecard.js';
import {pendingRelicChoice,relicOfferMarkup,weightPickMarkup,cardPick,cardPickMarkup,cardPickResults,namePick,namePickMarkup,namePickResults} from './choice-relics-ui.js';

import {DraftUI} from './draft-ui.js';

import {openEmotePicker,showDuelEmote,clearDuelEmotes,setEmoteVolumeReader,positionDuelEmotes} from './duel-emotes.js';

import {rewardMarkup,mountRewardSlots} from './reward-slots.js?v=reward-persistent-1';

import {duelLogMarkup} from './duel-log-ui.js';

import {equippedTarget} from './equip-target.js';

import {rememberedLevel,hasReliclessClear,alternateUnlocked} from './difficulty-preference.js';

import {encounterCard,swordsIcon,bossBanner,bossControls,bossRerollPrice,playEncounterReveal,playPortraitReveal,revealCost,revealCostLabel} from './encounter-reveal.js';

import {playLegendarySummon} from './legendary-summon.js';

import {DeviceSync} from './device-sync.js';
import {quotaPausedUntil} from './quota-pause.js';
// Cloud save that cannot upload says so on the main menu (Discord, 2026-11-16: a player on a browser that clears its data
// lost hours of progress while the servers were at their daily limit).
// Windows app (user, 2026-11-19): launchers from before the self-updater (no ShadowDesktop.launcherBuild) can't install
// launcher fixes such as the save-folder fallback. They block outside links, so the notice copies the installer link.
const WINDOWS_SETUP_URL='https://github.com/Thronior/ygo-rogue-duelist/releases/latest/download/YGO-Rogue-Windows-Setup.exe';
let launcherNoticeClosed=false;
function launcherNotice(){
 const desktop=window.ShadowDesktop;if(!desktop||'launcherBuild' in desktop||launcherNoticeClosed)return '';
 return `<div class="launcher-notice" role="status"><b>New Windows app available</b><span>Download the installer again and run it. Your saves are kept, and from then on the app updates itself.</span><input class="launcher-link" readonly value="${WINDOWS_SETUP_URL}" aria-label="Download link"><span class="launcher-actions">${btn('Copy download link','launcher-copy')}${btn('Later','launcher-later')}</span><small class="launcher-status"></small></div>`;
}
function cloudSaveNotice(){
 try{if(!deviceBackup.isEnabled())return '';const paused=quotaPausedUntil('backup'),error=deviceBackup.status().error;
  if(!paused&&!error)return '';
  return `<small class="cloud-save-notice" role="status">${esc(paused?"Cloud save is paused: the online servers are at today's limit. Your progress is saved on this device only for now.":'Cloud save could not upload. Your progress is saved on this device; it will retry.')}</small>`}catch{return ''}
}

import {checkAndroidUpdate,startupAndroidUpdate} from './android-update.js';
// The update window follows the game's language; Chinese also downloads through GitHub mirrors first (Discord, 2026-11-21).
const updateLanguage=()=>savedLanguage()||browserLanguage();
function openAndroidUpdate(){const native=window.ShadowNative;if(native.openUpdateIn)native.openUpdateIn(updateLanguage());else native.openUpdate();}

import {showNetStatus,hideNetStatus} from './net-status.js';
import {collectorResponseOverlay,automaticChainResponse,chainWindowAllowed,liveCardFacts,waitForTossStart,mandatoryChainResponse,forcedCancelResponse,revealInPick,relicTriggerIndex} from './duel-presentation.js';
import {smartContext} from './smart_policy.js';

import {playlists,bossTheme} from './music-config.js';

import {allCardsPackDescription,formatPackChance,sortPackCards} from './pack-inspection.js';

import {balancedVolume,resumeBalancedAudio,preloadSoundEffects,setMasterVolume,setAudioSilent} from './audio-balance.js';

import {searches as deckSearches} from './card-search.js';
import {searchMarks} from './card-search.js';
// ★ in the solo deck editor's search window keeps cards marked Yes in this run (user, 2026-11-20).
searchMarks('draft',()=>state.run);
import {cardTextHtml,linkSearch,packSummaryHtml,translateWith} from './card-links.js';
import {packSummaryParts,packTermMatcher,packFilterOptions,packFilterCount,parsePackFilter} from './pack-summary.js';
import {pagedGrid} from './deck-paging.js';
import {MARKS,cardMark,nextMark,cardMarkVersion,markTile,paintMarks,onMarkTap,yesMarksFirst} from './card-marks.js';
import {characterSettings,setSavedMark,setKeepRunMarks,clearSavedMarks,characterPane,editorCards,editorGrid,editorMarkup,packSources,packCards,packsFor,setPackFavourite,allFavouritePacks,favouriteCharacters,migrateFavouritePacks} from './character-settings.js';
import {openPatchNotes,maybeShowNewPatchNotes} from './patch-notes.js';import {initSurvey} from './survey.js';
import {savedDeckSort,savedDeckStatus,rememberDeckSort,DEFAULT_DECK_SORT,DEFAULT_DECK_STATUS} from './deck-sort-preference.js';

import {rankFor,isRandomId} from './collector-rules.js';

import {CollectorUI} from './collector-ui.js';

import {COLLECTOR_MENU_CARD} from './collector-roster.js';

import {collectorIntroduction,collectorIntroductionMarkup} from './collector-introduction.js';

import {shopRerollPrice} from './experience-ui.js';

import {mountMenuMotion} from './menu-motion.js?v=online-wrap-duplicate-2';
import {mountMenuFeel} from './menu-feel.js';

import {playEffectFeedback,removalKind,playRemovalFeedback} from './effect-feedback.js';

import {motionPreferences,wallMs,attributeColor,activationColor,cardFlight,landingPulse,summonImpact,flipCard,attackStrike,shake,lifeImpact,showChainLink,revealChainLinks,resolveChainLink,clearChainLinks,negationSlash,shufflePile,phaseGlint,showBanner,fadeOutWithin} from './duel-motion.js';

import {createDuelSounds,duelSoundPath} from './duel-sfx.js';

import {VISUAL_EFFECTS,effectOn,applyEffectOptions} from './effect-options.js';
import {uploadReplays,replayRows,saveRecording,captureBehaviour,uploadBehaviour,sendUnsentFlags,runReplayIndex,loadReplay} from './replays.js';
import {ReplayViewer} from './duel-replay-viewer.js';

import {recordStat,recordRunResult,recordCpuResult,fetchCpuStats,startStats,fetchStats,observeTagStats,personalPlaySeconds,statsEnabled,setStatsEnabled} from './global-stats.js';

import {isShopUltra,announceShopUltra} from './shop-ultra.js';
import {playRelicFusion} from './relic-fusion-fx.js';

import {typeIcon,genreIcons,searchButton,matchesSearch,openSearch,clearSearch,DECK_STATUS_OPTIONS,deselectIcon,deckSearchButtons,autoColumnsAcross,splitDeckMarkup,saveDeckScroll,restoreDeckScroll,deckSplitColumns,splitStyle,isExtraDeckCard,splitCounts} from './card-search.js';

import {cardFacts,displayCardText} from './card-inspection.js';

import {installShopGestures} from './shop-gestures.js';

import {victoryRewardsMarkup,lastPlayed,packSummary,cursedMarkup,curseIcons,curseIconFile,curseDescription,curseInfoMarkup,matchesFilters,EFFECT_FILTERS,materialStatus} from './experience-ui.js';

import {openPacks} from './pack-opening.js';

import {isCardWin,playCardWin} from './exodia-finale.js';

import {installDesktopStorage} from './desktop-storage.js';

import {CPUViewer} from './cpu-viewer.js';

import {relicImage,relicArtwork,activeTagCharacters} from './ui-art.js';
import {relicCard,relicLedger,permanentCurseEntries,fusionHint,setFusionState} from './relic-inspect.js';
import {deckKindsMarkup,extraDeckMarkup} from './deck-counts.js';
import {markAllMarkup,handleMarkAllClick,closeMarkAllMenus} from './mark-all.js';
import {levelText,levelBadge,relicFreeText} from './challenge-level.js';

import {promptContext} from './prompt-context.js';

import {TagUI} from './tag-ui.js';

import {cardImages,preloadCards} from './card-assets.js';
import {setupLocalizedCards,resetLocalizedCards,localizedImage,warmLocalizedCards} from './localized-cards.js';
import {RANDOM_PACK,RANDOM_PACK_TEXT,setupRandomCards,syncRandomCards,prepareEngine,drawRandomCards,needsDrawing,drawInBackground,hatLoading,addDraftRandomCards} from './random-cards.js';

import {loadPyodide} from './pyodide/pyodide.mjs';
import {asciiTimeZoneNames,prepareStdlib,stderrTail,details as bootDetails,startupRetried,clearRetry,retryOnce,copyText} from './boot-diagnostics.js';
// Startup stage and Python diagnostics for the "Could not start" screen (boot-diagnostics.js).
let bootDiag=null;

import {MobileDuel,M,R,I,B,L,P} from './duel.js';
import {japaneseNames} from './character-names.js';
import {LANGUAGES,savedLanguage,browserLanguage,setLanguage,setJapaneseNames,attachContent,currentLanguage,flagSvg,cardMatchesQuery,t as tr} from './i18n.js';
import {loadFavouritePacks,isFavouritePack,toggleFavouritePack,favouritesFirst,packStar,packFavouriteToggle,favouritesInStock} from './pack-favourites.js';
import {relicLockButton,relicLockClass,relicBanishButton} from './relic-lock.js';
const BANISH_PRICE=10;let banishArmed=null;
import {relatedIndex,relatedCards,relatedCount,mountRelated} from './related-cards.js';
import {Lesson,startLessonDuel,LESSON_PLAYER,LESSON_OPPONENT,LESSON_POOL,LESSON_LP,FINISH} from './tutorial-duel.js';
import {LessonCoach} from './tutorial-coach.js';
import {stacksOn,setStacks,groupStacks,stackButton,tapIntent,applyTaps,steadyTap} from './deck-stacks.js';
import {installAttackDrag} from './attack-drag.js';
import {shopTourAfterRender,startShopTour,closeShopTour} from './shop-tour.js';
import {installHandDrag,resetHandDrag} from './hand-drag.js';
import {installCardNav,cardNavAttach,closeCardArt,noteCardNavSource} from './card-nav.js';
import {lpText} from './lp-cap.js';

const app=document.querySelector('#app'),modal=document.querySelector('#modal');

let duelScene=null,duelSceneOwner=null,duelSceneNumber=0;
installVectorBackgrounds(app,modal,()=>({...state?.settings,duelScene:duelSceneOwner&&snapshot&&duelSceneOwner===engine?duelScene:null}));
// Endless ambient loops share one 50 ms tick (ambient-clock.js), so the screen is redrawn 20 times a second for them.
installAmbientClock();

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

setEmoteVolumeReader(()=>state?.settings?.voice/100||0);

let selectedLevels={},selectedVariants={};


function levelMenu(){const beaten=state.profile.character_levels?.[selected]??-1;const row=(level,text,locked=false)=>`<button data-do="choose-level" data-level="${level}" ${locked?'disabled':''}>${levelBadge(level)}<span class="challenge-level-copy"><b>${locked?'Beat lvl '+(level-1)+' to unlock':text}</b>${locked?'<small>??????????</small>':level>1?'<small>Includes all previous modifiers</small>':''}${level>=0&&level<=beaten?'<small>Completed</small>':''}</span></button>`;dialog('Challenge level',`<p>Modifiers accumulate. Clear a full run to unlock the next level for this character.</p><div class="level-list">${state.profile.relicless_unlocked?row(-1,relicFreeText):''}${levelText.map((text,i)=>row(i,text,i>beaten+1)).join('')}</div>`)}

let py,content,state,screen='loading',selected=0,menuIndex=0,engine,snapshot,busy=false,aiTimer,preview=0,returnScreen='title',previousScreen='title',pickSet=new Set(),placeSet=[],lastPhase=null,lastLP=null;

let toastQueue=[],toastBusy=false,music=new Audio(),sfx=new Audio(),menuSfx=new Audio();music.loop=true;

setUISoundVolume(()=>Number(state?.settings?.menu||0)/100,()=>Number(state?.settings?.voice||0)/100);

const cardsById=new Map(),previewRenders=new WeakMap();

const card=id=>cardsById.get(Number(id));

// In another language a card shows its translated picture once localized-cards.js has drawn it (2026-11-20).
const image=id=>localizedImage(Number(id))||cardImages.get(Number(id))||`assets/cards/${id}.jpg`;
setupLocalizedCards({card});
// Pixel Art look (2026-11-19): face-up duel cards in hand and on the field are drawn as their art inside a frame in the
// card's colour (mobile.css, data-frame); randomized cards add 'random' for a rainbow edge. Other looks ignore it.
const cardFrame=id=>{const c=card(id),t=Number(c?.data?.type)||0;return (t&0x4000?'token':t&2?'spell':t&4?'trap':t&0x40?'fusion':t&0x80?'ritual':t&0x20?'effect':'normal')+(c?.randomized?' random':'')};
// Pack info, including the Random Pack (random-cards.js), which is not a real booster in content.packs.
const packInfo=id=>content.packs.find(p=>p.id===id)||(id===RANDOM_PACK.id?RANDOM_PACK:undefined);

// Copycat's Randomizer loadout builds its own deck, so it reads as that loadout, not as the deck-copying Copycat.
const character=()=>{const c=content.characters[state.run.character];return state.run.variant&&c?.alternate?.randomized?{...c,...c.alternate,name:c.name}:c};

// The old card cut-out icons for deck, duel, settings, shop and relics are retired (2026-11-05): line icons or plain text instead.
const uiIcons={'buy-selected':'coins',achievements:'achievements',tutorial:'tutorial'};

// Card stack in the deck editor's icon style, for icon-only "Edit deck" buttons.
const deckEditIcon='<svg class="navigation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="8" y="2.5" width="12" height="16" rx="1.8"/><path d="M5 6v13.5A2 2 0 0 0 7 21.5h9"/><path d="m11.5 9.5 2.5-2.5 2.5 2.5-2.5 2.5Z"/></svg>';

const navigationIcons={

 draft:'<rect x="8" y="2.5" width="12" height="16" rx="1.8"/><path d="M5 6v13.5A2 2 0 0 0 7 21.5h9"/><path d="m11.5 9.5 2.5-2.5 2.5 2.5-2.5 2.5Z"/>',

 settings:'<path d="m9 3 .6-2h4.8l.6 2 1.6.9 2-.5 2.4 4.2-1.4 1.5v1.8l1.4 1.5-2.4 4.2-2-.5-1.6.9-.6 2H9l-.6-2-1.6-.9-2 .5-2.4-4.2 1.4-1.5V9.1L2.4 7.6l2.4-4.2 2 .5Z" transform="translate(0 2)"/><circle cx="12" cy="12" r="3.3"/>',

 shop:'<path d="M3 10v11h18V10M2 6l2-3h16l2 3v4c0 3-5 3-5 0 0 3-5 3-5 0 0 3-5 3-5 0 0 3-5 3-5 0V6ZM2 6h20M7 6v4m5-4v4m5-4v4M6 16h12M6 16v5m12-5v5"/>'

};
// The character select's settings button is the same gear (user, 2026-11-18).
navigationIcons['character-settings']=navigationIcons.settings;
// Character select: a die picks a random unlocked duelist without starting a run (user, 2026-11-24).
navigationIcons['random-character']='<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><g fill="currentColor" stroke="none"><circle cx="8.2" cy="8.2" r="1.5"/><circle cx="15.8" cy="8.2" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="8.2" cy="15.8" r="1.5"/><circle cx="15.8" cy="15.8" r="1.5"/></g>';

const btn=(label,action,extra='',cls='')=>navigationIcons[action]?`<button class="${cls} navigation-icon-button" data-do="${action}" aria-label="${esc(label)}" title="${esc(label)}" ${extra}><svg class="navigation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${navigationIcons[action]}</svg></button>`:`<button class="${cls}" data-do="${action}" ${extra}>${uiIcons[action]?`<img class="ui-icon" src="assets/ui/${uiIcons[action]}.png" alt="">`:""}${label}</button>`;

const duelDecision=(label,action,extra='',cancel=false)=>btn(`<span class="duel-decision-label">${esc(label)}</span><span class="duel-decision-icon" aria-hidden="true">${cancel?'✕':'✓'}</span>`,action,`aria-label="${esc(label)}" title="${esc(label)}" ${extra}`,cancel?'duel-cancel':'duel-confirm');

const duelConfirm=(label,action,extra='')=>duelDecision(label,action,extra);

const duelCancel=(label,action,extra='')=>duelDecision(label,action,extra,true);

const cardButton=(id,extra='',active=false,mis=false)=>`<button class="cardbtn ${active?'selected':''}" data-preview="${id}" ${extra}>${mis?'<b class="misprint">MISPRINT</b>':''}<img draggable="false" loading="lazy" src="${image(id)}" alt="${esc(card(id)?.name||'Card')}"><span>${esc(card(id)?.name||'Card')}</span></button>`;

const baseMenu=[['Online',14731897,'spell','Tag Duels · Draft Duels · Ultimate Collector','online'],['Continue',30834988,'trap','Return to your saved journey.','continue'],['New Run',71625222,'effect','Choose a duelist. Draft a new beginning.','characters'],['Cosmetics',38033121,'effect','Duel Looks and card sleeves.','cosmetics'],['Settings',23171610,'spell','Adjust audio, visuals, gameplay, and data-sharing settings.','settings'],['Watch CPU duel',28566710,'trap','Observe and test two opponent AIs.','cpu'],['Collection',75500286,'spell','Every card, booster and relic.','collection'],['Stats',67048711,'spell','Your device, worldwide and character records.','stats'],['Achievements',32012841,'normal','Your feats and lifetime progress.','achievements'],['Tutorial',91595718,'spell','Learn the field, shops and controls.','tutorial']];
const onlineMenu=[['Tag Duels',81332143,'spell','Team up across Android and web.','tag'],['Draft Duels',3549275,'effect','Draft relics and boosters between duels. Challenge a friend.','draft-pvp'],COLLECTOR_MENU_CARD,['Main Menu',71625222,'trap','Return to the main menu.','main-menu']];



// A broken card or relic script otherwise just does nothing. Say so once per duel, so it gets flagged.
const scriptErrorsShown=new WeakMap();
MobileDuel.onScriptError=(text,duel)=>{if(!/\.lua"?\]?:\d+:|attempt to /.test(String(text))||scriptErrorsShown.get(duel)===duel.presentationDuel)return;scriptErrorsShown.set(duel,duel.presentationDuel);toast('A card effect ran into an error and may not have worked. Please report it with Options → Flag behaviour.')};
function toast(text,{replace=false}={}){

 const raw=String(text??''),validation=raw.match(/(?:ValueError|AssertionError): ([^\n]+)/g);

 const message=validation?.at(-1)?.replace(/^(?:ValueError|AssertionError): /,'')||(/Traceback \(most recent call last\)/.test(raw)?'That action could not be completed. Please try again.':raw);

 // The same message is never stacked (user, 2026-11-11: tapping an item you can't afford several times kept the popup up
 // for 4 seconds per tap). It shows again only once the one on screen is gone.
 if(message===toastShowing||toastQueue.includes(message))return;
 // replace: the new message takes over the one on screen at once (Kzulu, 2026-11-12: tapping another locked sleeve
 // waited for the previous sleeve's condition to time out).
 if(replace&&toastBusy){clearTimeout(toastTimer);toastBusy=false;toastShowing=null;toastQueue.unshift(message);showToast();return}
 toastQueue.push(message);showToast();

}

// Short messages stay 3 seconds; longer ones keep 4.2 so they can be read.
let toastShowing=null,toastTimer=0;
function showToast(){if(toastBusy||!toastQueue.length)return;toastBusy=true;const el=document.querySelector('#toast');toastShowing=toastQueue.shift();el.textContent=toastShowing;el.classList.add('show');toastTimer=setTimeout(()=>{el.classList.remove('show');toastBusy=false;toastShowing=null;showToast()},toastShowing.startsWith('Could not save')?8000:toastShowing.length>60?4200:3000)}

let lastPersistedData=null;

// A refused write (device storage full, or the browser's storage quota) says so; showToast keeps it up 8 seconds.
async function persist(cloudCheckpoint=false){const SAVE_FAILED='Could not save the game on this device, so your latest changes will be lost when you close it. Free up some storage space, then try again.';const files={};for(const name of py.FS.readdir('/game/saves'))if(name.endsWith('.json')||name.endsWith('.bak'))files[name]=py.FS.readFile('/game/saves/'+name,{encoding:'utf8'});const data=JSON.stringify(files);if(data===lastPersistedData){if(cloudCheckpoint)deviceBackup.queue(data);return;}if(window.ShadowNative){if(!await ShadowNative.store(data))throw Error(SAVE_FAILED)}else try{localStorage.setItem('shadow-run-mobile',data)}catch{throw Error(SAVE_FAILED)}lastPersistedData=data;if(cloudCheckpoint)deviceBackup.queue(data)}

let commandQueue=Promise.resolve();

// The run's randomized cards (random-cards.js), fetched outside the command queue because a command is running.
async function fetchRandomCards(){py.globals.set('request_json',JSON.stringify({action:'random-cards'}));return JSON.parse(await py.runPythonAsync('mobile_backend.dispatch(request_json)')).result}

function command(action,value){const payload=JSON.stringify({action,value});const job=commandQueue.then(()=>executeCommand(payload));commandQueue=job.catch(()=>{});return job}

async function executeCommand(payload){const statsRequest=JSON.parse(payload),statsDuel=state?.run?.duel?.id,cpuDuel=!lesson&&state?.run?.duel,cpuCharacter=state?.run?.character;py.globals.set('request_json',payload);const result=JSON.parse(await py.runPythonAsync('mobile_backend.dispatch(request_json)'));if(['reward-progress','pack-inspect','card-sources','cpu-catalog','draft-duel-setup','draft-random-cards'].includes(statsRequest.action))return result.result;const sleevesBefore=state?.profile?new Set(state.profile.sleeves_earned||[]):null;state=applyCommandUpdate(state,result,statsRequest.action);if(await syncRandomCards(state?.randomCards,fetchRandomCards))drawInBackground(state?.run?.pool||[]);warmLocalizedCards(state?.run?.pool);announceSleeves(sleevesBefore,statsRequest.action);if(lesson){lesson.saved={...state,run:lesson.saved.run};state={...state,run:lesson.run}}loadActiveFavourites();noteDeviceSyncChange(statsRequest.action);if(result.persist!==false&&statsRequest.action!=='device-sync-read')await persist(statsRequest.action==='finish');if(statsRequest.action==='finish'&&state?.run?.stage==='complete')void deviceBackup.saveNow();if(['new','secret-champion','secret-relicless'].includes(statsRequest.action))recordStat('runs',result.run?.started_at||result.run?.history_id);if(statsRequest.action==='begin')recordStat('duels',result.run?.duel?.id);if(statsRequest.action==='finish')resetDraftFilters(false);if(statsRequest.action==='finish'&&statsDuel){recordStat('duels',statsDuel);recordStat(statsRequest.value.winner===0?'wins':'losses',statsDuel);recordCpuResult(cpuDuel,cpuCharacter,statsRequest.value.winner===0);recordRunResult(result.run);}return result.result}

async function notices(){const list=state.profile.achievement_notices||[];if(list.length){await command('notices');list.forEach(n=>toast('Achievement complete: '+n.name+' — '+n.reward))}}

let sfxStopTimer;

function setDuelSound(url){clearTimeout(sfxStopTimer);sfx.pause();sfx.src=assetURL(url);sfx.load();}

function menuSelectionSound(){if(!state.settings.menu||document.hidden)return;menuSfx.pause();menuSfx.src=assetURL('assets/sfx/menu-coin-ring.wav');balancedVolume(menuSfx,state.settings.menu/100);menuSfx.play().catch(()=>{});}

function effect(major=false,purchase=false){if(!state?.settings?.sound||document.hidden)return;setDuelSound('sound/'+(major?'activate.wav':purchase?'coinflip.wav':'flip.wav'));balancedVolume(sfx,state.settings.sound/100,major?1:purchase?.85:.65);sfx.play().catch(()=>{})}

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
juice.setJuiceSound((path,{loop=false,gain=1,voice:spoken=false}={})=>{const level=spoken?state?.settings?.voice:state?.settings?.sound;if(!level||document.hidden)return null;const voice=juiceVoices[juiceVoiceIndex++%juiceVoices.length];voice.pause();voice.loop=loop;voice.src=assetURL(path);voice.load();balancedVolume(voice,level/100,gain);voice.play().catch(()=>{});return voice});
document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const voice of juiceVoices)voice.pause()});

let musicContext='',previousTrack={};

function screenMusic(){if(screen==='duel'||screen==='cpu'){if(screen==='cpu')return 'duel';if(engine&&summonMusic.has(engine))return summonMusic.get(engine);if(state.run?.encore_active&&!snapshot?.tag||snapshot?.tag?.pvp)return 'champion';const run=snapshot?.tag?tagUI?.view?.run:state.run;if(((run?.round||0)+1)%3===0){const opponent=snapshot?.tag?activeTagCharacters(content,tagUI.view,snapshot.tag)[1]:content.characters[run?.opponent];return bossTheme(opponent?.name)}return 'duel'}if(screen==='ending')return state.run?.stage==='complete'?'victory':'defeat';if(screen==='characters')return 'characters';if(screen==='routes')return (state.run.round+1)%3===0?'boss':'draft';if(screen==='draft')return 'draft';if(screen==='shop')return state.run?.cursed_offer?'boss':'shop';if(screen==='settings')return musicContext||'title';if(screen==='tag'&&tagUI?.view?.phase==='draft'&&tagUI.tab!=='deck'&&(tagUI.view.run.round+1)%3===0)return 'boss';if(screen==='tag')return tagUI?.view?.phase==='shop'?'shop':tagUI?.view?.phase==='complete'?'victory':tagUI?.view?.phase==='gameover'?'defeat':tagUI?.view?.phase==='draft'?'draft':'characters';return 'title'}

let rewardMusic=false;

function track(name,advance=false){const set=state?.settings;setMasterVolume(set?.master??100);if(set)setAudioSilent(!(set.master??100)||!['music','sound','voice','menu'].some(k=>Number(set[k])>0));if(rewardMusic)name='packs';if(name!==musicContext||advance){musicContext=name;const all=playlists[name]||[name],alternatives=all.filter(x=>x!==previousTrack[name]),choices=alternatives.length?alternatives:all;const pick=choices[Math.floor(Math.random()*choices.length)];previousTrack[name]=pick;music.src=assetURL('assets/music/'+pick+'.m4a');music.load()}balancedVolume(music,state.settings.music/100);if(state.settings.music&&!audioSuspended)music.play().catch(()=>{});else music.pause()}

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

function shell(title,body,tools='',cls=''){app.innerHTML=`<div class="page ${cls}"><header><h2>${title}</h2><div class="tools">${tools}${screen==='draft'||screen==='routes'?btn(relicEyeIcon,'relic-ledger','aria-label="Relics" title="Relics"','navigation-icon-button'):''}${screen==='settings'?'':btn('Settings','settings')}${btn('<svg class="navigation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>','title','aria-label="Menu" title="Menu"','navigation-icon-button')}</div></header>${body}</div>`}

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

// A WebView that stops drawing can leave an animation's .finished pending forever, which froze
// duels (flag bb515e22). Each wait gets a deadline that pauses with the inspection pause.
function capWait(promise,milliseconds){let done=false;const settled=Promise.resolve(promise).catch(()=>{}).then(()=>{done=true});return Promise.race([settled,duelDelay(milliseconds).then(()=>{done=true})])}
function animationSettled(animation,margin=1500){
 if(!animation?.finished)return Promise.resolve();
 let end=4000;try{const t=animation.effect?.getComputedTiming?.().endTime;if(Number.isFinite(t))end=t}catch{}
 const rate=Math.abs(animation.playbackRate||1)||1;let done=false;
 const settled=animation.finished.catch(()=>{}).then(()=>{done=true});
 return Promise.race([settled,duelDelay(Math.min(15000,end/rate+margin)).then(()=>{if(done)return;done=true;try{animation.finish()}catch{}})]);
}

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

function closeDialog(){if(closeCardArt())return;if(modal.querySelector('.reward-overlay')){closeRewardOverlay();return;}const preview=modal.querySelector('.deck-preview-overlay');if(preview){preview.closePreview();return;}if(modal.dataset.goldenRequired)return;if(modal.querySelector('.reward-tally')){showRewardSlots();return}if(modal.querySelector('.reward-screen')){action('reward-accept');return}if(inspectParent){playUISound('window-close');const previous=inspectParent;inspectParent=previous.parent||null;modal.replaceChildren(...previous.nodes);modal.classList.toggle('card-inspect-modal',!!modal.querySelector('.inspect'));modal.scrollTop=previous.scroll;previous.focus?.focus?.({preventScroll:true});sizeModalViewport();syncModalChain();syncInspectionPause();if(!inspectParent&&packsUnderModal)raisePacksAgain();return}modal.close()}

modal.addEventListener('cancel',event=>{if(modal.querySelector('.reward-overlay')){event.preventDefault();closeRewardOverlay();return;}if(modal.dataset.goldenRequired||modal.querySelector('.reward-screen,.reward-tally')){event.preventDefault();return;}if(inspectParent){event.preventDefault();closeDialog()}});
// Tapping outside a window closes it when it has a Close button (Discord, Nov 15: reaching the corner was awkward).
// The click lands on the dialog itself, outside its box; reward and choice windows without Close are left alone.
modal.addEventListener('click',event=>{if(event.target!==modal)return;const box=modal.getBoundingClientRect();if(event.clientX>=box.left&&event.clientX<=box.right&&event.clientY>=box.top&&event.clientY<=box.bottom)return;const close=modal.querySelector(':scope>.modal-head [data-do="close"]');if(close&&!close.disabled)close.click()});

// A pack opening can show over a window that is still open: in Tag over the reward screen, DNA Rewrite's Type window or
// any window the teammate's purchase finds open, in solo over a purchases list. A modal dialog opened later covers #modal,
// and showModal cannot raise a dialog that is already open, so a card inspected from the pack opened under it (Discord,
// Onre64, 2026-11-22: Absolute Random's pack in Tag). Reopening raises a dialog; the close event that fires is swallowed,
// so nothing takes it for the window closing.
let raisingModal=0,packsUnderModal=null;
modal.addEventListener('close',e=>{if(raisingModal){raisingModal--;e.stopImmediatePropagation();return}packsUnderModal=null},{capture:true});
function raiseModal(){if(!modal.open)return;const scroll=modal.scrollTop;raisingModal++;modal.close();modal.showModal();modal.scrollTop=scroll}
function inspectFromPacks(id){const theatre=document.querySelector('dialog.pack-theatre[open]'),covered=!!theatre&&modal.open;inspect(id);if(covered&&modal.open&&inspectParent){raiseModal();packsUnderModal=theatre}}
// Back from that card to the window it covered: the pack opening goes on top again.
function raisePacksAgain(){const theatre=packsUnderModal;packsUnderModal=null;if(theatre?.open){theatre.close();theatre.showModal()}}
modal.addEventListener('close',()=>{if(modal.open)return;delete modal.dataset.duelOptionsPause;playUISound('window-close');inspectParent=null;modal.classList.remove('run-card-modal');setTimeout(()=>{if(!modal.open)modal.classList.remove('card-inspect-modal')},260);viewedRun=null;juice.stopRewardText();syncInspectionPause()});

let floatingChainControl=null;

function syncModalChain(){

 const original=document.getElementById('chain-toggle');

 if(screen!=='duel'||!original){floatingChainControl?.remove();floatingChainControl=null;return;}

 const r=pageRect(original);

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

 // When the button would cover a duel prompt's choices (phone portrait), it moves just below the prompt, kept off Options.
 let top=r.top;const prompt=[...app.querySelectorAll('.duel .prompt')].find(p=>p.checkVisibility());
 const hits=(a,t,h)=>a.left<r.right&&a.right>r.left&&a.top<t+h&&a.bottom>t;
 if(prompt&&[...prompt.querySelectorAll('button,input,[data-target],[data-response]')].some(el=>hits(pageRect(el),r.top,r.height))){
  const optionsEl=app.querySelector('[data-do="duel-options"]'),p=pageRect(prompt),options=optionsEl&&pageRect(optionsEl);top=p.bottom+4;
  if(options&&hits(options,top,r.height))top=Math.max(p.bottom,options.top-4-r.height);
  top=Math.min(top,pageHeight()-r.height);
 }

 const styles={position:'fixed',left:r.left+'px',top:top+'px',width:r.width+'px',height:r.height+'px',margin:'0px',zIndex:'1000',visibility:'visible'};

 for(const [name,value] of Object.entries(styles))if(copy.style[name]!==value)copy.style[name]=value;

 const parent=modal.open?modal:document.body;

 if(copy.parentNode!==parent)parent.append(copy);

}

new MutationObserver(()=>syncModalChain()).observe(app,{childList:true});

window.addEventListener('resize',syncModalChain);

modal.addEventListener('close',syncModalChain);

new MutationObserver(syncModalChain).observe(modal,{attributes:true,attributeFilter:['open']});

// UI Scale zooms the page (display-options.js), and a zoomed CSS pixel is bigger than the window's, so the measured sizes are
// divided by the scale. Unscaled, a 150% UI Scale made the page and the card window 1.5x the window's height: the window's
// bottom, its Previous/Next row and the end of its scrolling text were off screen (deck editor card window, Discord 2026-11-20).
function sizeModalViewport(){const v=window.visualViewport,z=parseFloat(document.documentElement.style.getPropertyValue('--ui-scale'))||1,px=n=>`${n/z}px`;if(!v||Math.abs(v.scale-1)<.01)document.documentElement.style.setProperty('--app-viewport-height',`${Math.round((v?.height||innerHeight)/z)}px`);modal.style.setProperty('--modal-viewport-height',px(v?.height||innerHeight));modal.style.setProperty('--modal-viewport-width',px(v?.width||innerWidth));modal.style.setProperty('--modal-top',px(v?.offsetTop||0));modal.style.setProperty('--modal-left',px(v?.offsetLeft||0))}

window.addEventListener('ygo-ui-scale',sizeModalViewport);window.visualViewport?.addEventListener('resize',sizeModalViewport);window.visualViewport?.addEventListener('scroll',sizeModalViewport);window.addEventListener('resize',sizeModalViewport);

let viewportFrame=0,viewportSettle=0;function settleViewport(){cancelAnimationFrame(viewportFrame);clearTimeout(viewportSettle);viewportFrame=requestAnimationFrame(()=>{sizeModalViewport();viewportSettle=setTimeout(sizeModalViewport,250)})}

window.screen.orientation?.addEventListener('change',settleViewport);window.addEventListener('orientationchange',settleViewport);window.addEventListener('pageshow',settleViewport);sizeModalViewport();

function dialog(title,body,showClose=true){juice.stopRewardText();if(desktopToken&&tagUI)desktopRPC('native-visible',false).catch(console.error);inspectParent=null;removeActions();modal.innerHTML=`<div class="modal-head">${title?`<h2>${esc(title)}</h2>`:''}${!showClose||tagUI?.isCollector&&title==='Surrender this duel?'?'':btn('Close','close')}</div>${body}`;modal.classList.toggle('card-inspect-modal',!!modal.querySelector('.inspect'));modal.classList.toggle('char-marks-modal',!!modal.querySelector('.char-marks-editor'));cardNavAttach();sizeModalViewport();if(modal.open)modalBlocking();if(!modal.open)modal.showModal();syncModalChain();syncInspectionPause()}

function cardBadges(c){const t=c.data.type,key=t&2?'spell':t&4?'trap':t&64?'fusion':t&128?'ritual':t&16?'normal':'effect';const icon=(name)=>`<img class="pixel-badge" alt="" src="assets/icons/pixel/${name}.png">`;return `${typeIcon(c)}${icon('type-'+key)}${esc(c.type)} · ${esc(c.race)} ${c.attribute?'· '+icon('attribute-'+c.attribute.toLowerCase())+esc(c.attribute):''}`}

// Relic Picker, Card Picker, Name Changer and weighted relics: required prompts, like the Golden Card Sleeve.
// The purchase is already paid for: a failed sound or effect must not cost the player their picks, packs or cards.
function paidSafely(...steps){for(const step of steps)try{step()}catch(error){console.warn('Shop presentation failed',error)}}
function showRelicChoice(r){
 if(r.relic_offer?.options?.length)dialog('Relic Picker',relicOfferMarkup(content,r.relic_offer,{relicImage,relicArtwork,btn}),false);
 else if(r.card_picks>0){cardPick.selected=null;dialog('Card Picker',cardPickMarkup(btn),false);refreshCardPick()}
 else if(r.weight_picks?.length)dialog(content.artifacts[r.weight_picks[0]][0],weightPickMarkup(r.weight_picks[0],btn),false);
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

 if(typeChoicePending(r)){if(modal.open)return;dialog('DNA Rewrite',`<p>Choose a monster Type for this run.</p>${iconChoiceGrid(iconChoices('race',content.cards),'race',x=>`data-do="choose-monster-type" data-type="${x.name}" aria-label="${x.name}"`)}`,false);await new Promise(resolve=>modal.addEventListener('close',resolve,{once:true}));return offerGoldenCards();}

 if(pendingRelicChoice(r)){if(!modal.open)showRelicChoice(r);await new Promise(resolve=>modal.addEventListener('close',resolve,{once:true}));return offerGoldenCards();}

 const chosen=r.golden_cards||[r.golden_card].filter(Boolean),pending=r.artifacts.filter(x=>x==='golden_sleeve').length-chosen.length;

 if(pending<=0)return;

 if(modal.open){await new Promise(resolve=>modal.addEventListener('close',resolve,{once:true}));return offerGoldenCards();}

 dialog('Golden Card Sleeve',`<img class="golden-sleeve-reveal" style="height:140px" src="${relicImage(content.artifactInfo.golden_sleeve.art)}"><p>Choose a permanent golden card. ${pending} choice(s) remaining.</p><div class="cardgrid">${[...new Set(r.selected.map(i=>r.pool[i]))].filter(id=>!chosen.includes(id)).map(id=>cardButton(id,`data-do="golden-card" data-code="${id}"`).replace(/data-preview="[^"]*"/,'')).join('')}</div>`);

 modal.dataset.goldenRequired='true';modal.querySelector('[data-do=close]')?.remove();modal.classList.add('golden-choice-modal');

 const reveal=document.createElement('div');reveal.className='golden-sleeve-stage';reveal.innerHTML=`<img src="${relicImage(content.artifactInfo.golden_sleeve.art)}" alt="Golden Card Sleeve">`;modal.append(reveal);setTimeout(()=>reveal.remove(),1680);

 await new Promise(resolve=>modal.addEventListener('close',resolve,{once:true}));return offerGoldenCards();

}

function inspect(id,poolIndex=null){let c=card(id);if(!c)return;playUISound('inspect-open');if(screen==='duel'&&previewLocation){const [p,loc,seq]=previewLocation;const live=engine?.query(p,loc)?.[seq];if(live?.code===c.id&&(p===0||live.position&5))c=liveCardFacts(c,live,content.cards);}const mod=poolIndex===null?null:state.run?.card_mods?.[poolIndex];const previous=modal.open?{nodes:[...modal.childNodes],scroll:modal.scrollTop,focus:document.activeElement,parent:inspectParent}:null;if(poolIndex!==null)c=modifiedCard(c,state.run,poolIndex);const deckStep=inspectDeck();dialog(c.name,`<div class="inspect${deckStep?' has-deck-step':''}"><img src="${image(id)}">${deckStep?`<span class="inspect-step inspect-deck-actions" data-inspect-deck="${id}" data-pool-index="${poolIndex??""}"></span>`:''}<div>${cardFacts(c)}<p class="copy-count"${deckStep?' hidden':''}>${(inspectDeckRun()?.pool||[]).filter(x=>x===Number(id)).length} owned · ${(inspectDeckRun()?.selected||[]).filter(i=>inspectDeckRun().pool[i]===Number(id)).length} in deck</p>${liveCardDetails(Number(id))}${mod?'<p class="badges">Faulty Printer: this copy has modified stats, Type, or Attribute.</p>':''}<h4>Effect / card text</h4><p class="inspect-effect" data-no-i18n>${cardTextHtml(displayCardText(c.desc),content,!!cardLinkSearchKey())}</p>${(screen==='draft'||tagUI?.view?.phase==='draft')&&state.run?.artifacts.filter(x=>x==='golden_sleeve').length>(state.run.golden_cards||[state.run.golden_card].filter(Boolean)).length&&!(state.run.golden_cards||[state.run.golden_card].filter(Boolean)).includes(Number(id))&&state.run.selected.some(i=>state.run.pool[i]===Number(id))?btn('Permanently designate golden card','golden-card',`data-code="${id}"`):''}</div></div>`);inspectParent=previous;fillInspectDeck();setupInspectTabs(id,screen==='collection'&&collectionKind==='cards'||screen==='draft'||screen==='tag'&&tagUI?.tab==='deck');}

let previewLocation=null;

// Card Details · Related Cards · Where to Find (collection and deck editors). Outside those screens the tabs show only
// when the card has related cards, so the duel and shop windows stay as they were for most cards.
// Inspection window extras (user's ideas, 2026-11-16): Add/Remove buttons while a deck editor is behind the window, and
// card-text links (card-links.js) while a deck editor or the Collection is. Solo uses the backend toggle, Tag its own.
function inspectDeck(){
 if(screen==='draft'&&state.run&&!fixedDeck(state.run,character()))return {run:state.run,toggle:async i=>{try{await command('toggle',i);playUISound('deck-select')}finally{updateDraft()}}};
 const v=tagUI?.view;
 if(screen==='tag'&&tagUI.tab==='deck'&&v?.run&&['draft','shop'].includes(v.phase)&&!fixedDeck(v.run,content.characters[v.run.character]))return {run:v.run,toggle:i=>tagUI.action('card',{dataset:{index:String(i),id:String(v.run.pool[i])}})};
 return null;
}
const inspectDeckRun=()=>screen==='tag'&&tagUI?.view?.run?tagUI.view.run:state.run;
function fillInspectDeck(){
 const box=modal.querySelector('.inspect-deck-actions');if(!box)return;const ctx=inspectDeck();if(!ctx){box.remove();return}
 const id=Number(box.dataset.inspectDeck),r=ctx.run,inDeck=new Set(r.selected),copies=r.pool.map((x,i)=>x===id?i:-1).filter(i=>i>=0);
 const ins=copies.filter(i=>inDeck.has(i)).length,limit=copyLimit(r),canAdd=copies.length>ins&&!(limit!=null&&ins>=limit);
 // Under the card art (user, 2026-11-17): − in deck/owned +, like the Related Cards tab.
 // The card's mark (card-marks.js) below it (user, 2026-11-17); a tap cycles it like the tile's button.
 const [cls,sym,label]=MARKS[cardMark(r,id)],mark=`<button type="button" class="inspect-mark ${cls}" data-inspect-mark="${id}" aria-label="${label}" title="${label}"><i>${sym}</i></button>`;
 box.innerHTML=`<span class="inspect-step-row"><button type="button" data-inspect-deck-do="remove" aria-label="Remove from deck" title="Remove from deck" ${ins?'':'disabled'}>−</button><b aria-label="${ins} in deck, ${copies.length} owned">${ins}/${copies.length}</b><button type="button" data-inspect-deck-do="add" aria-label="Add to deck" title="Add to deck" ${canAdd?'':'disabled'}>+</button></span>${mark}`;
 const count=modal.querySelector('.copy-count');if(count)count.textContent=`${copies.length} owned · ${ins} in deck`;
}
const cardLinkSearchKey=()=>screen==='draft'&&state.run?'draft':screen==='collection'&&collectionKind==='cards'?'collection':screen==='tag'&&tagUI?.tab==='deck'&&tagUI.view?.run?'tag-deck':null;
document.addEventListener('click',async e=>{
 const mk=e.target.closest('[data-inspect-mark]');
 if(mk){
  const el={dataset:{cardMark:mk.dataset.inspectMark}};mk.disabled=true;
  try{if(screen==='draft')await cycleMark(el);else if(screen==='tag')await tagUI?.cycleMark(el)}finally{fillInspectDeck()}
  return;
 }
 const b=e.target.closest('[data-inspect-deck-do]');
 if(b){
  const box=b.closest('.inspect-deck-actions'),ctx=inspectDeck();if(!box||!ctx||b.disabled)return;
  const id=Number(box.dataset.inspectDeck),r=ctx.run,inDeck=new Set(r.selected),mods=r.card_mods||{},copies=r.pool.map((x,i)=>x===id?i:-1).filter(i=>i>=0);
  const shown=box.dataset.poolIndex===''?null:Number(box.dataset.poolIndex),add=b.dataset.inspectDeckDo==='add';
  // The inspected copy first (it may be misprinted), then a plain copy, then any copy.
  const pool=copies.filter(i=>inDeck.has(i)!==add),plain=pool.filter(i=>mods[i]===undefined);
  const i=pool.includes(shown)?shown:add?(plain[0]??pool[0]):(plain.at(-1)??pool.at(-1));if(i==null)return;
  b.disabled=true;try{await ctx.toggle(i)}catch{}finally{fillInspectDeck()}
  return;
 }
 const a=e.target.closest('[data-card-link]');if(!a)return;e.preventDefault();
 const key=cardLinkSearchKey();if(!key)return;
 deckSearches[key]=linkSearch(a.dataset);inspectParent=null;closeDialog();
 if(key==='draft'){draftTab='All';renderDraft()}else if(key==='collection'){collectionPage=0;renderCollection()}else{tagUI.deckFilter='All';tagUI.render()}
});

function setupInspectTabs(id,withSources){

 const details=modal.querySelector('.inspect');if(!details)return;
 const related=relatedCards(relatedIndex(collectionCards(),content.archetypes),id),relatedTotal=relatedCount(related);
 if(!withSources&&!relatedTotal)return;

 const tabs=document.createElement('nav'),panels=[details];details.id='collection-details-panel';
 const panel=(cls,panelId)=>{const p=document.createElement('section');p.className=cls;p.hidden=true;p.id=panelId;p.setAttribute('role','tabpanel');panels.at(-1).after(p);panels.push(p);return p};
 const relatedPanel=panel('collection-card-sources related-cards-panel','related-cards-panel'),sources=withSources?panel('collection-card-sources','collection-sources-panel'):null;

 tabs.className='inspection-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Card inspection');

 tabs.innerHTML=`<button role="tab" aria-selected="true" aria-controls="collection-details-panel">Card Details</button><button role="tab" aria-selected="false" aria-controls="related-cards-panel">Related Cards<span class="related-tab-count" ${relatedTotal?'':'hidden'}>${relatedTotal}</span></button>${sources?'<button role="tab" aria-selected="false" aria-controls="collection-sources-panel">Where to Find</button>':''}`;

 details.setAttribute('role','tabpanel');details.before(tabs);

 let loading=false;

 const buttons=[...tabs.children];

 const select=index=>{panels.forEach((p,i)=>p.hidden=i!==index);buttons.forEach((button,i)=>{button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;});modal.scrollTop=0;

  if(panels[index]===sources&&!loading){loading=true;void showCollectionSources(id,sources);}
  if(panels[index]===relatedPanel)mountRelated(relatedPanel,id,{cards:collectionCards(),archetypes:content.archetypes,card,image,inspect,deck:relatedDeck,error:e=>toast(e.message)});

 };

 const last=buttons.length-1;
 buttons.forEach((button,i)=>{button.tabIndex=i===0?0:-1;button.addEventListener('click',()=>select(i));button.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?last:(i+(event.key==='ArrowRight'?1:last))%buttons.length;select(next);buttons[next].focus();}});});

}

// The deck the Related Cards tab edits: solo and Tag deck editors can add and remove copies; elsewhere it only counts.
function relatedDeck(){
 if(screen==='draft'&&state.run)return {run:state.run,editable:!fixedDeck(state.run,character()),toggle:async i=>{try{await command('toggle',i);playUISound('deck-select')}finally{updateDraft()}}};
 if(screen==='tag'){const v=tagUI?.view;if(!v?.run)return null;return {run:v.run,editable:tagUI.tab==='deck'&&['draft','shop'].includes(v.phase)&&!fixedDeck(v.run,content.characters[v.run.character]),toggle:i=>tagUI.action('card',{dataset:{index:String(i)}})}}
 return state.run&&screen!=='collection'?{run:state.run,editable:false}:null;
}

async function showCollectionSources(id,target){

 target.textContent='Loading card sources…';

 try{const sources=await command('card-sources',Number(id));if(!target.isConnected)return;

 loadActiveFavourites();target.innerHTML=`<h4>Booster Packs</h4><div class="source-packs">${sources.packs.map(p=>`<span class="source-pack"><img loading="lazy" src="assets/packs/${esc(p.id)}.jpg" alt="${esc(p.name)}" title="${esc(p.name)}">${packStar(p.id,p.name)}</span>`).join('')||'<p>None in the current campaign.</p>'}</div><h4>Opponent Decks</h4><div class="source-opponents">${sources.opponents.map(d=>`<figure><img loading="lazy" src="assets/${esc(d.sprite)}" alt="${esc(d.name)}"><figcaption>${esc(d.name)}<small>${esc(d.label)}</small></figcaption></figure>`).join('')||'<p>None in the current campaign.</p>'}</div>`;

 }catch{if(target.isConnected)target.textContent='Card sources could not be loaded.';}

}

function setPreview(id,element=null){if(!id)return;preview=Number(id);previewLocation=element?.dataset.zone?element.dataset.zone.split(',').map(Number):element?.dataset.hand!==undefined?[0,L.HAND,Number(element.dataset.hand)]:element?.dataset.location?element.dataset.location.split(',').map(Number):element?.dataset.target!==undefined?promptCardLocation(Number(element.dataset.target)):pileLocation(element);const box=document.querySelector('.inspection');if(box){const location=previewLocation?.join(',')||'',previous=previewRenders.get(box);if(previous?.id===preview&&previous.location===location&&previous.snapshot===snapshot)return;const markup=previewMarkup();if(box.innerHTML!==markup)box.innerHTML=markup;previewRenders.set(box,{id:preview,location,snapshot})}}

// Graveyard and banished piles show their top card; inspect it live so relics like Surgery show.
// A card in a "choose a card" prompt is found through the prompt, so its preview shows live and boosted stats like the
// hand does (Discord, Nov 15: searching the Deck showed printed stats).
function promptCardLocation(i){const c=selectionEntries()[i]?.c;return c&&c.location!==undefined?[c.controller??0,c.location,c.sequence]:null}
function pileLocation(element){const [player,kind]=(element?.dataset.pile||'').split(','),loc={grave:L.GRAVE,banished:L.REMOVED}[kind];if(!snapshot||loc===undefined)return null;const items=snapshot.players[+player]?.[kind]||[];const seq=items.findLastIndex(Boolean);return seq<0?null:[+player,loc,seq]}

function previewMarkup(){let c=card(preview);

 if(c&&snapshot&&screen==='duel'&&previewLocation){const [p,loc,seq]=previewLocation;const zone={[L.HAND]:'hand',[L.MZONE]:'monsters',[L.GRAVE]:'grave',[L.REMOVED]:'banished'}[loc]||'spells';const live=loc===L.EXTRA||loc===L.DECK?(()=>{const x=engine?.query?.(p,loc)||[];return x.find(e=>e?.sequence===seq)||x[seq]})():snapshot.players[p]?.[zone]?.[seq];if(live?.code===c.id&&(p===0||live.position&5)){c=liveCardFacts(c,live,content.cards);if(p===0&&[L.HAND,L.GRAVE,L.EXTRA,L.DECK].includes(loc))c.summoned=summonedStats(live,seq);
  // Your own Set monster: relic and Field Spell bonuses only reach it face-up, so show what it will have once flipped
  // (Discord, 2026-11-16: the bonus chips showed under printed stats).
  if(p===0&&loc===L.MZONE&&!(live.position&5)){c.summoned=summonedStats(live,seq);if(c.summoned)c.summoned.faceUp=true}
  c.activeEffects=activeEffects(live,p,loc)}}

if(!c)return '<p>Tap a card to inspect it. Tap it again or choose an action to play.</p>';return `<img src="${image(c.id)}"><h3>${esc(c.name)}</h3><div class="badges">${cardBadges(c)}</div>${c.data.type&1?`<div class="stats"><img class="genre-icon" src="assets/icons/level-star.png" alt="Level"> ${c.level}<br>ATK ${c.atk<0?'?':c.atk} / DEF ${c.defense<0?'?':c.defense}${c.summoned&&(c.summoned.atk!==c.atk||c.summoned.defense!==c.defense)?`<br><span class="summoned-stats">${c.summoned.faceUp?`Face-up: ATK ${c.summoned.atk} / DEF ${c.summoned.defense}`:`On the field: ATK ${c.summoned.atk} / DEF ${c.summoned.defense}`}</span>`:''}${c.activeEffects||''}</div>`:''}${genreIcons(c)}<div class="card-text">${esc(displayCardText(c.desc))}</div>`}

// Relic and Field Spell bonuses apply only on the field, so a monster in hand also shows the stats it would be summoned with.
function activeEffects(live,p,loc){
 if(typeof engine?.query!=='function'||!(live?.code)||!(card(live.code)?.data?.type&1)||![L.MZONE,L.HAND].includes(loc)||loc===L.HAND&&p!==0)return '';
 try{
  const smart=smartContext(engine,p,L),c={...live,controller:p,location:loc},negated=p===0&&relicNegated(),{relics,curses}=negated?{relics:[],curses:[]}:smart.statSources(c,p),base=card(live.code);
  const rows=[...relics.filter(x=>content.artifactInfo[x.key]).map(x=>({kind:'relic',src:relicImage(content.artifactInfo[x.key].art),name:content.artifacts[x.key]?.[0]||'',atk:x.atk,def:x.def})),...curses.filter(x=>x.atk||x.def).map(x=>({kind:'curse',src:curseIconFile(x.key),name:content.curses?.[x.key]?.[0]||'',atk:x.atk,def:x.def}))];
  if(loc===L.MZONE){
   const here=(x,side)=>x?.position&5&&x.equipCard?.controller===p&&x.equipCard?.sequence===live.sequence&&x.equipCard?.location===L.MZONE;
   const backs=[0,1].flatMap(s=>engine.query(s,L.SZONE).filter(Boolean)),equips=backs.filter(here);
   for(const x of equips)rows.push({kind:'card',src:image(x.code),name:card(x.code)?.name||''});
   const explained=(key)=>rows.reduce((sum,x)=>sum+(x[key]||0),0),unexplained=!equips.length&&base.atk>=0&&base.defense>=0&&(live.attack-base.atk!==explained('atk')||live.defense-base.defense!==explained('def'));
   if(unexplained){const others=[...backs.filter(x=>x.position&5),...[0,1].flatMap(s=>engine.query(s,L.MZONE).filter(x=>x&&x.position&5&&!(s===p&&x.sequence===live.sequence)))];const seen=new Set();for(const x of others){const f=card(x.code);if(f&&!seen.has(x.code)&&changesStats(f.desc,base)){seen.add(x.code);rows.push({kind:'card',src:image(x.code),name:f.name})}}}
  }
  return activeEffectsMarkup(rows,esc);
 }catch{return ''}
}

// Tag's stand-in engine gets the team's relic and curse numbers from TagDuel.statModifiers; PvP gets none, so no forecast.
function summonedStats(live,seq){if((tagUI&&!engine?.aiModifiers)||typeof engine?.query!=='function')return null;try{const smart=smartContext(engine,0,L),c={...live,controller:0,location:L.HAND,sequence:seq};return {atk:smart.projectedAttack(c,{equips:false}),defense:smart.projectedDefense(c,{equips:false})}}catch{return null}}

let titleMotion=null;

function render(){if(screen!=='shop')closeShopTour();if(screen!=='shop'&&(shopkeeperSmall||shopkeeperShrinking)){cancelShopkeeperShrink();shopkeeperSmall=false;resetShopkeeperRightClicks()}syncBackgroundAnimations();if(screen!=='duel'){clearDuelDOM(app);resetHandDrag()}if(screen!=='ending')clearShadowVictory();titleMotion?.destroy();titleMotion=null;if(screen==='tag'){tagUI?.render();return}removeActions();if(screen!=='duel')clearTimeout(aiTimer);({title:renderTitle,characters:renderCharacters,draft:renderDraft,routes:renderRoutes,shop:renderShop,achievements:renderAchievements,relics:renderRelics,settings:renderSettings,cosmetics:renderCosmetics,tutorial:renderTutorial,collection:renderCollection,stats:renderStats,gallery:renderGallery,ending:renderEnding,duel:renderDuel})[screen]();track(screenMusic())}

function go(name){if(name==='routes'&&state.run?.reward_slots?.pending){if(rewardDeckReturn)go(state.run.stage==='shop'?'shop':'ending');return;}if(rewardDeckReturn&&!['draft','shop','ending'].includes(name))rewardDeckReturn=false;if(name!=='duel'){clearTimeout(heldChainTimer);heldChainTimer=0;heldChainPointer=null;heldAlwaysChain=false;heldChainPrompt=null;}cancelCharacterEntrance();if(name!=='ending')clearShadowVictory();clearDuelEmotes();flushDraftTap();if(name!=='shop')keeperTalk.hush();if(name!=='shop'||screen!=='shop'){cancelShopkeeperShrink();shopkeeperSmall=false;resetShopkeeperRightClicks()}const pendingRewards=['shop','ending'].includes(name)&&state.run?.reward_slots?.pending;if(pendingRewards)rewardMusic=true;if(name!==screen)previousScreen=screen;screen=name;syncBackgroundAnimations();render();if(name==='shop')settleViewport();if(['draft','shop'].includes(name)&&(state.run?.artifacts.includes('dna_rewrite')&&!state.run.monster_type||pendingRelicChoice(state.run))&&!modal.open)void offerGoldenCards();if(pendingRewards){if(rewardDeckReturn){rewardDeckReturn=false;if(modal.querySelector('.reward-screen')){modal.showModal();rewardPresentation?.refresh()}else showRewardSlots()}else showVictoryReceipt()}}

let menu=baseMenu,menuPage='main',menuPageEntry=null;

// Start the title carousel on the saved-run action, regardless of menu order.

menuIndex=baseMenu.findIndex(item=>item[4]==='continue');

// Close button (CITYDRIVER, user 2026-11-16): top right of the main menu beside the language flag, in every build. The
// Windows app and Android close; a browser tab closes only if the browser allows it, otherwise the player is told how.
function closeGame(){
 if(window.ShadowDesktop?.quit){window.ShadowDesktop.quit();return}
 if(typeof window.ShadowNative?.quit==='function'){window.ShadowNative.quit();return}
 try{window.close()}catch{}
 setTimeout(()=>{if(!window.closed)toast('Your progress is saved. Close this tab or window to quit.')},300);
}
function renderTitle(){void remindReplayUpload(()=>screen==='title');titleMotion?.destroy();const activeMenu=menuPageEntry||menu[menuIndex]?.[4];menuPageEntry=null;const hasSave=(state.slots||[]).some(s=>s.run);menu=menuPage==='online'?[...onlineMenu]:baseMenu.filter(m=>!['tutorial','achievements'].includes(m[4])&&(m[4]!=='cpu'||state.profile.cpu_viewer_unlocked)&&(m[4]!=='continue'||hasSave));if(menuPage==='main'&&state.profile.gallery_unlocked)menu.push(['Gallery',75500286,'spell','Under construction','gallery']);menuIndex=menu.findIndex(m=>m[4]===activeMenu);if(menuIndex<0)menuIndex=Math.max(0,menu.findIndex(m=>m[4]==='characters'));app.innerHTML=`<div class="title"><a class="discord-link" href="https://discord.gg/QD36Q3VG7F" target="_blank" rel="noopener noreferrer" aria-label="Join YGO Rogue Duelist on Discord" title="Discord"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.3 4.4a19.8 19.8 0 0 0-4.9-1.5l-.6 1.2a18.3 18.3 0 0 0-5.6 0l-.6-1.2a20 20 0 0 0-4.9 1.5C.6 9 .1 13.5.4 18a20 20 0 0 0 6 3l1.2-2a12 12 0 0 1-1.9-.9l.5-.4c3.8 1.8 7.9 1.8 11.6 0l.5.4-1.9.9 1.2 2a20 20 0 0 0 6-3c.4-5.2-.7-9.6-3.3-13.6ZM8.3 15.4c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2 1 2 2.3-.9 2.3-2 2.3Zm7.4 0c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2 1 2 2.3-.9 2.3-2 2.3Z"/></svg></a>${Array.from({length:24},(_,i)=>`<i class="particle" style="left:${i*4.2}%;animation-delay:-${i*.47}s;animation-duration:${6+i%5}s"></i>`).join('')}<button class="patch-notes-button" data-do="patch-notes" aria-label="Patch notes" title="Patch notes"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.6 2H4.4Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg></button><button class="language-button" data-do="language" aria-label="Language" title="Language">${flagSvg(currentLanguage())}</button><button class="close-game-button" data-do="close-game" aria-label="Close the game" title="Close the game">×</button><img class="game-logo" src="assets/rogue-duelist-logo.png" alt="Yu-Gi-Oh: Rogue Duelist"><div class="carousel">${menu.map((m,i)=>{let d=(i-menuIndex+menu.length)%menu.length;if(d>3)d-=menu.length;return `<button class="menu-card ${m[2]}" data-menu="${i}" data-distance="${Math.abs(d)}" style="--menu-offset:${d};left:${50+d*23}%;scale:${d?'.72':'1'};z-index:${10-Math.abs(d)};filter:${d?'brightness(.58)':'none'};animation-delay:-${i*.8}s" ${Math.abs(d)>2?'hidden':''}><h3 class="${m[0]==='Ultimate Collector'?'compact-menu-title':''}">${m[0]}</h3><div class="art"><img src="${m[4]==='gallery'?'assets/Meerkat.png':'assets/menu/'+m[1]+'.jpg'+(m[4]==='online'?'?v=unity-610':'')}"></div><p>${m[3]}</p></button>`}).join('')}</div><div class="title-meta"><small class="title-version">v${esc(replayVersion)}</small>${titleCompletion()}</div>${cloudSaveNotice()}${launcherNotice()}<small style="padding-bottom:8px">Fan Experiment · EDOPro core · Progress saved on this device</small></div>`;titleMotion=mountMenuMotion(app.querySelector('.carousel'),menu.length,menuIndex,index=>{menuIndex=index});fitMenuTitles();initSurvey(dialog,content);void maybeShowNewPatchNotes(dialog,()=>screen==='title'&&!modal.open)}
// Menu card names stay on one line in every language: a name too long for its box gets a smaller font instead
// (user, 2026-11-09). Runs after the translation pass and again once the card font has loaded or the window resizes.
function fitMenuTitles(){
 requestAnimationFrame(()=>{
  // Cards far from the centre are [hidden] (display:none) and measure 0, so they were never fitted and stayed
  // clipped once the carousel brought them in (Kzulu, 2026-11-10: "WATCH CPU DU"). Un-hide them for the
  // measurement and hide them again in the same task, so nothing is painted. Reads and writes are batched:
  // one layout per pass instead of one per title.
  const heads=[...app.querySelectorAll('.title .menu-card h3')];if(!heads.length)return;
  const hiddenCards=heads.map(h=>h.closest('.menu-card')).filter(c=>c.hidden);
  for(const c of hiddenCards)c.hidden=false;
  for(const h of heads)h.style.fontSize='';
  let todo=heads;
  for(let pass=0;pass<3&&todo.length;pass++){
   const next=todo.map(h=>{
    if(h.scrollWidth<=h.clientWidth+1||!h.clientWidth)return null;
    const cs=getComputedStyle(h),pad=parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight),size=parseFloat(cs.fontSize);
    return [h,Math.max(6,Math.floor(size*(h.clientWidth-pad)/(h.scrollWidth-pad)*10)/10)];
   }).filter(Boolean);
   for(const [h,size] of next)h.style.fontSize=size+'px';
   todo=next.filter(([,size])=>size>6).map(([h])=>h);
  }
  for(const c of hiddenCards)c.hidden=true;
 });
}
document.fonts?.ready.then(()=>{if(screen==='title')fitMenuTitles()});
// The card font loads on first use, after the first fit measured the fallback font.
document.fonts?.addEventListener?.('loadingdone',()=>{if(screen==='title')fitMenuTitles()});
addEventListener('resize',()=>{if(screen==='title')fitMenuTitles()},{passive:true});

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
  // Portrait hides him, except in Copycat's first loadout and Dueling Engine's empty shop, where he stands
  // on the counter behind the Coin scorecard and Relics buttons (user, 2026-11-21).
  if(!landscape&&root.classList.contains('relic-only-shop')){
   const counterTop=root.querySelector('.shop-counter')?.getBoundingClientRect().top||window.innerHeight,topBar=root.querySelector('.run-strip,.page>header')?.getBoundingClientRect().bottom||0;
   // Measured in screen pixels; UI Scale zooms the page, so the style values are divided by that zoom.
   const zoom=parseFloat(getComputedStyle(document.documentElement).zoom)||1;
   const height=Math.max(0,Math.min(counterTop*.54,counterTop-topBar-12,window.innerWidth/.94)),width=height*.94;
   Object.assign(keeper.style,{position:'fixed',display:'block',top:`${(counterTop-height)/zoom}px`,left:`${(window.innerWidth*.48-width/2)/zoom}px`,right:'auto',bottom:'auto',width:`${width/zoom}px`,height:`${height/zoom}px`,margin:'0',padding:'0',border:'0',borderRadius:'0',background:'transparent',transform:'none',zIndex:'0',pointerEvents:'none'});
   keeperTalk.place();return;
  }
  if(!landscape){keeper.style.display='none';keeperTalk.hush();return;}
  const viewportHeight=pageHeight(),sourceRatio=561/592;
  let targetTop,center;
  const asideRect=pageRect(aside),relicButton=aside.querySelector('.shop-reference-buttons [data-do="relic-ledger"]'),relicRect=relicButton&&pageRect(relicButton);
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
 if(counter&&shelf){const counterRect=pageRect(counter),shelfRect=pageRect(shelf);keeper.style.setProperty('--shopkeeper-shelf-offset',`${Math.max(0,counterRect.bottom-shelfRect.top)}px`);keeper.style.setProperty('--shopkeeper-shelf-drop',`${Math.max(0,shelfRect.top-counterRect.bottom)}px`)}
 keeperTalk.placeHitArea(keeper);keeperTalk.place();
}
function shrinkShopkeeper(){
 if(screen!=='shop'||state?.run?.challenge_level!==-1||shopkeeperShrinking||shopkeeperSmall)return;
 const keeper=app.querySelector('.secret-shopkeeper'),img=keeper?.querySelector('img');
 if(!img)return;
 shopkeeperShrinking=true;playUISound('shopkeeper-laugh.mp3',{spoken:true});
 const scale=Math.min(1,230/Math.max(230,pageRect(keeper).height));
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

 try{await meerkatSecretAnimation();await command('sleeve-mark','solomon');await command('secret-relicless');await startDuel(false,0)}catch(error){toast(error.message)}finally{secretPlaying=false;busy=false}

}



function renderCharacters(){

 selectedLevels[selected]=rememberedLevel(state.profile,selected);

 const base=content.characters[selected],variantUnlocked=alternateUnlocked(state.profile,selected);

 if(!variantUnlocked||!base.alternate)selectedVariants[selected]=0;

 const c=selectedVariants[selected]?{...base,...base.alternate,name:base.name}:base,locked=!state.profile.unlocked.includes(selected),row=state.achievements.find(a=>a.id==='character:'+selected);

 const packs=(c.copycat||c.engine_deck)?[]:c.random_packs?[]:c.starting_packs||[c.pack,c.pack,c.pack,c.pack];

 const relic=c.starting_relic,info=(relic==='none'?null:content.artifactInfo[relic]),relicName=relic==='random'?'Random relic':relic==='random_archetype'||relic==='random_pack_archetype'?'Random archetype relic':relic==='none'?'No relic':content.artifacts[relic]?.[0]||'',relicText=relic==='random'?'A different relic is rolled for each new run.':relic==='random_archetype'?'Start with a random relic that adds cards from an archetype to shop stock.':relic==='random_pack_archetype'?'Start with 4 copies of one random character pack and a relic for an archetype in that pack.':relic==='none'?'The Dueling Engine starts with no relic.':content.artifacts[relic]?.[2]||'';

 const packArt=packs.length?packs.map((pid,n)=>`<img src="assets/packs/${pid}.jpg" style="--n:${n}" alt="${esc(packInfo(pid)?.name)}" title="${esc(packSummary(content,pid))}" data-do="inspect-pack" data-pack="${pid}" role="button" tabindex="0">`).join(''):`<img src="assets/card-back.jpg" style="--n:1" alt="${c.copycat?'Borrowed deck':c.engine_deck?'Victory deck choices':'Random boosters'}"><span>${c.copycat?'Borrowed deck':c.engine_deck?'Victory deck choices':'4 random packs'}</span>`;

 const markup=`<div class="char-layout"><div class="roster" style="--roster-rows:${Math.ceil(content.playable.length/6)}">${content.playable.map(i=>{const x=content.characters[i];return `<button class="portrait ${i===selected?'selected':''} ${(state.profile.character_levels?.[i]??-1)>=5?'golden-complete':''} ${state.profile.unlocked.includes(i)?'':'locked'}" data-character="${i}" data-completed-level="${Math.min(6,state.profile.character_levels?.[i]??-1)}" aria-label="${esc(x.name)}${(state.profile.character_levels?.[i]??-1)>=5?' — Level '+state.profile.character_levels[i]+' completed':''}"><img loading="lazy" src="assets/${x.sprite}" alt="">${hasReliclessClear(state.profile,i)?'<i class="relicless-clear-star" role="img" aria-label="Challenge Level -1 completed" title="Challenge Level -1 completed">&#9733;</i>':''}<span>${esc(x.name)}</span></button>`}).join('')}</div><div class="duelist-selection"><aside class="char-details"><div class="duelist-hero" ${c.copycat?'data-do="copycat-secret"':''} style="background-image:url('assets/${c.background||`character-backgrounds/${selected}.jpg`}')"><img src="assets/${c.sprite}" alt="${esc(c.name)}"><h2>${esc(c.name)}</h2>${btn('Character settings','character-settings','','char-settings-gear')}<button class="level-badge" data-challenge-level="${selectedLevels[selected]??0}" data-do="levels" aria-label="Choose challenge level">LVL<strong>${selectedLevels[selected]||0}</strong></button></div>${base.alternate?`<div class="variant-selector"><button data-do="choose-variant" data-variant="0" class="${selectedVariants[selected]?'':'active'}">Standard</button><button data-do="choose-variant" data-variant="1" class="${selectedVariants[selected]?'active':''}" ${variantUnlocked?'':'disabled'}>${esc(base.alternate.name)}</button>${variantUnlocked?'':'<small>Beat Challenge LVL 2 or LVL -1</small>'}</div>`:''}${c.engine_deck?`<p class="engine-character-description engine-tagline">${selectedVariants[selected]?'All decks are mine!':'Your decks are mine!'}</p>`:''}${c.engine_deck?'':`${c.copycat?'<h3 class="loadout-heading">BORROWED DECK</h3>':''}<div class="duelist-loadout"><div class="draft-pack-fan">${packArt}</div><div class="signature-cards">${c.cards.map(n=>{const id=content.cards.find(x=>x.name===n)?.id;return `<button data-inspect="${id}" aria-label="Inspect ${esc(n)}"><img src="${image(id)}" alt="${esc(n)}"></button>`}).join('')}</div></div><div class="starting-relic"><div class="starting-relic-art">${info?relicArtwork(relicImage(info.art)):relic==='none'?'':'<img class="random-relic" src="assets/card-back.jpg" alt="Random relic">'}</div><div><h3>${esc(relicName)}</h3><p>${esc(relicText)}</p></div></div>`}${c.copycat?'<p class="duelist-special">Opponent deck + one Copycat. Relics only.</p>':''}</aside>${locked&&row?.description?btn(esc(row.description),'new','disabled','start-run start-run-unlock'):btn(locked?'LOCKED':'START RUN','new',locked?'disabled':'','start-run')}</div></div>`;
 // Picking another duelist swaps only the details panel; rebuilding the roster reloaded every portrait and flickered the screen (2026-11-05).
 const layout=screen==='characters'&&app.querySelector('.character-select-page .char-layout'),panel=layout?.querySelector(':scope>.duelist-selection');
 if(panel&&layout.querySelector('.roster')){const t=document.createElement('template');t.innerHTML=markup;const next=t.content.querySelector('.duelist-selection');if(next){panel.replaceWith(next);layout.querySelectorAll('.roster .portrait').forEach(b=>b.classList.toggle('selected',+b.dataset.character===selected));return}}
 shell('Choose a duelist',markup,btn('Random character','random-character','','random-character-button'),'character-select-page')

}

function showRunSlots(newRun=false,title=newRun?'Choose a save slot':'Resume a saved run'){dialog(title,`<div class="save-slot-grid">${state.slots.map(s=>{const r=s.run,c=r?content.characters[r.character]:null;return `<button class="save-slot" data-do="${newRun?'new-slot':'load-slot'}" data-slot="${s.slot}" ${!newRun&&!r?'disabled':''}><span class="slot-number">Slot ${s.slot}${c?' · '+esc(c.name):''}</span><span class="slot-portrait">${c?`<img src="assets/${c.sprite}" alt="${esc(c.name)}">`:''}</span><span class="slot-detail">${r?`Loop ${(r.loop||0)+1} · Duel ${Math.min(9,(r.round||0)+1)}/9<br>${Number(r.lp||0).toLocaleString()} LP<br><small>Last played: ${esc(lastPlayed(r.last_played_at))}</small>`:'Empty'}</span><b class="slot-action">${newRun?(r?'Replace this run':'Start here'):(r?'Resume':'Empty')}</b></button>`}).join('')}</div>`)}

// Difficulty before the save slot (user's pick 2026-11-24, option D): Normal is the main choice on the right; Easy
// (easy_mode.py) is a small, quiet button on the left.
let newRunEasy=false;
async function newRun(){const level=selectedLevels[selected]||0;dialog('Choose a difficulty',`<div class="difficulty-choice"><button class="difficulty-easy" data-do="difficulty" data-easy="1"><b>Easy</b><small>No boss curses, more healing and coins.</small><small class="difficulty-warn">Easy runs earn no achievements or unlocks.</small></button><button class="difficulty-normal primary" data-do="difficulty" data-easy="0"><b>Normal</b>${levelBadge(level,{colored:true})}<small>Achievements and unlocks count.</small></button></div>`)}

// One new run per pick: a second slot tapped before the first run is created would start a second run (2026-11-03).
let startingRun=false;
async function beginNew(slot,replace=false){if(startingRun)return;startingRun=true;modal.querySelectorAll('.save-slot,[data-do="confirm-new"]').forEach(b=>b.disabled=true);try{shopSelection.clear();const start=()=>command('new',{character:selected,level:selectedLevels[selected]||0,variant:selectedVariants[selected]||0,slot,replace,easy:newRunEasy});if(content.characters[selected]?.alternate?.randomized&&(selectedVariants[selected]||0)===1){await hatLoading(async()=>{await start();await drawRandomCards(state.run.pool)},{title:'RANDOMIZING CARDS',minimum:1200});skipHatOnce=true}else await start()}catch(error){modal.querySelectorAll('.save-slot,[data-do="confirm-new"]').forEach(b=>b.disabled=false);throw error}finally{startingRun=false}modal.close();if(fixedDeck(state.run,character()))go('routes');else await characterEntrance(app.querySelector('.duelist-hero>img'),()=>{go('draft');if(state.run.packs.length)openDraftPack(0,false);else showStartingDeck()})}
// Hidden restart for keyboards (user, 2026-11-15): hold R for 3 seconds to start the run again with the same duelist,
// variant and level. Only until the first duel ends (first loop, no duel won or lost); the backend checks it too.
function canRestartRun(){const r=state?.run;return !!r&&!tagUI&&!lesson&&!r.loop&&!(r.round>0)&&!['gameover','complete'].includes(r.stage)&&!r.secret_challenge&&['draft','routes','duel'].includes(screen)}
let restartHold=null;const stopRestartHold=()=>{clearTimeout(restartHold);restartHold=null};
document.addEventListener('keydown',e=>{if(!hotkeys.matches('run.restart',e)||e.repeat||!hotkeys.plain(e)||hotkeys.capturing()||restartHold||hotkeys.typing(e.target)||!canRestartRun())return;restartHold=setTimeout(()=>{restartHold=null;if(canRestartRun())void restartRun().catch(error=>toast(error.message))},3000)});
document.addEventListener('keyup',e=>{if(hotkeys.matches('run.restart',e))stopRestartHold()});
addEventListener('blur',stopRestartHold);
async function restartRun(){
 if(startingRun)return;startingRun=true;
 try{
  clearTimeout(aiTimer);if(engine){engine.destroy();engine=null;snapshot=null}busy=false;if(modal.open)modal.close();shopSelection.clear();
  const r=state.run;selected=r.character;const start=()=>command('restart-run');
  if(content.characters[r.character]?.alternate?.randomized&&(r.variant||0)===1){await hatLoading(async()=>{await start();await drawRandomCards(state.run.pool)},{title:'RANDOMIZING CARDS',minimum:1200});skipHatOnce=true}else await start();
 }finally{startingRun=false}
 toast('Run restarted.');
 if(fixedDeck(state.run,character()))go('routes');else{go('draft');if(state.run.packs.length)openDraftPack(0,false);else showStartingDeck()}
}
function showStartingDeck(){const deck=content.preconstructedDecks.find(d=>d.id===state.run.engine_deck);if(deck)dialog('Starting deck',`<div class="starting-deck"><img src="assets/decks/${deck.art}.jpg" alt=""><h3>${esc(deck.name)}</h3><p>${deck.cards.length} cards. Tap the cards to change your deck.</p></div>`)}

// Random Packs (user, 2026-11-15): a short hat animation hides the drawing of their cards (at least 1 s, and until every
// picture is ready). skipHat: the "Randomizing cards" screen has just drawn them.
let skipHatOnce=false;
function presentPacks(packs,done=()=>{},owned=null){const ids=packs.flatMap(p=>p.cards||[]),random=packs.some(p=>p.id===RANDOM_PACK.id);if(random&&skipHatOnce){skipHatOnce=false;return drawRandomCards(ids).then(()=>showPacks(packs,done,owned))}if(random||needsDrawing(ids))return hatLoading(drawRandomCards(ids)).then(()=>showPacks(packs,done,owned));return showPacks(packs,done,owned)}
function showPacks(packs,done,owned){stopPackSounds();packPresentation=true;track('packs');const packContent=packs.some(p=>p.id===RANDOM_PACK.id)?{...content,packs:[...content.packs,RANDOM_PACK]}:content;return openPacks({packs,content:packContent,image,inspect:inspectFromPacks,owned,skip:!!state.settings?.skipPackAnimations,sound:packSound,stopSound:stopPackSounds,done:()=>{packPresentation=false;track(screenMusic());done()}})}
// Absolute Random's free packs after a victory: opened once, as soon as the shop shows after the reward cards (also
// after a restart, if the app closed before they were opened).
let freePacksShowing=false;
async function showFreePacks(){const packs=state.run?.free_packs;if(!packs?.length||tagUI||freePacksShowing||state.run.reward_slots?.pending)return;freePacksShowing=true;try{await command('free-packs-seen');await presentPacks(packs)}finally{freePacksShowing=false}}

function openDraftPack(i,reveal){const r=state.run;modal.close();presentPacks(r.packs.slice(i).map((cards,n)=>({id:r.pack_ids[i+n],cards})))}

const DRAFT_SORTS=["Newest","Default","Name","Type","Attribute","ATK","DEF","Level","Oldest"];
// Sort and Deck status stay as the player left them, across duels and runs (deck-sort-preference.js).
let draftTab='All',draftSort=savedDeckSort(DRAFT_SORTS),draftDeck=savedDeckStatus();
const draftFiltered=()=>draftTab!=='All'||draftSort!=='Newest'||draftDeck!=='First';
// After a duel only the type tab and the search reset; the reset button (all) also restores the default Sort and Deck status.
function resetDraftFilters(all=true){draftTab='All';delete deckSearches.draft;if(all){draftSort=DEFAULT_DECK_SORT;draftDeck=DEFAULT_DECK_STATUS;rememberDeckSort({sort:draftSort,status:draftDeck})}}
// Deck first keeps the chosen sort inside each group.
function draftOrder(pool,selected){const order=draftSorted(pool,selected);if(draftDeck==='Marked')return yesMarksFirst(order,state.run,i=>pool[i]);if(draftDeck!=='First')return order;const inDeck=new Set(selected);return [...order.filter(i=>inDeck.has(i)),...order.filter(i=>!inDeck.has(i))]}
// The sorted order is cached until a filter, the sort, the pool, relics or misprints change, so a tap on a 9,000-card
// collection doesn't sort it all again (Nori, 2026-11-16).
let draftSortCache=null;
function draftSorted(pool,selected,anyStatus=false){const r=state.run,key=JSON.stringify([draftTab,draftSort,draftDeck,deckSearches.draft||null,pool.length,anyStatus,anyStatus||!['In','Out'].includes(draftDeck)?'':selected.join(','),r?.artifacts?.length||0,Object.keys(r?.card_mods||{}).length,cardMarkVersion(r),bossStatCurses(r).join()]);if(draftSortCache?.key!==key){const order=draftSortedFresh(pool,selected,anyStatus),no=i=>cardMark(r,pool[i])===-1;draftSortCache={key,order:[...order.filter(i=>!no(i)),...order.filter(no)]}}return [...draftSortCache.order]}
function draftSortedFresh(pool,selected,anyStatus){let base=pool.map((_,i)=>i).filter(i=>matchesSearch(card(pool[i]),'draft'));if(!anyStatus&&(draftDeck==='In'||draftDeck==='Out')){const inDeck=new Set(selected);base=base.filter(i=>inDeck.has(i)===(draftDeck==='In'))}if(draftTab==='Monster')base=base.filter(i=>card(pool[i]).data.type&1);else if(draftTab==='Spell')base=base.filter(i=>card(pool[i]).data.type&2);else if(draftTab==='Trap')base=base.filter(i=>card(pool[i]).data.type&4);else if(draftTab==='Extra')base=base.filter(i=>card(pool[i]).data.type&64);const first={},last={};for(const i of base){const n=card(pool[i]).name.toLowerCase();if(!(n in first))first[n]=i;last[n]=i}const cat=c=>c.data.type&1?0:c.data.type&2?1:c.data.type&4?2:3,sub=c=>String(c.race||''),nm=i=>card(pool[i]).name.toLowerCase();if(draftSort==='Default')return base.sort((a,b)=>frameLevelName(card(pool[a]),card(pool[b]))||a-b);if(draftSort==='Attribute')return attributeOrder(base,pool,card,state.run);if(draftSort==='Name')return base.sort((a,b)=>nm(a)<nm(b)?-1:nm(a)>nm(b)?1:pool[a]-pool[b]);if(draftSort==='Type')return base.sort((a,b)=>cat(card(pool[a]))-cat(card(pool[b]))||sub(card(pool[a])).localeCompare(sub(card(pool[b])))||nm(a).localeCompare(nm(b))||a-b);if(draftSort==='ATK'){const attacks=new Map(base.map(i=>[i,card(pool[i]).data.type&1?deckStats(card(pool[i]),state.run,i,content.artifactInfo)[0]:0]));return base.sort((a,b)=>{const ca=card(pool[a]),cb=card(pool[b]);return Number(!(ca.data.type&1))-Number(!(cb.data.type&1))||attacks.get(b)-attacks.get(a)||(ca.data.type&6)-(cb.data.type&6)||nm(a).localeCompare(nm(b))||a-b});}if(draftSort==='DEF'){const defenses=new Map(base.map(i=>[i,card(pool[i]).data.type&1?deckStats(card(pool[i]),state.run,i,content.artifactInfo)[1]:(card(pool[i]).defense||0)]));return base.sort((a,b)=>{const ca=card(pool[a]),cb=card(pool[b]);return Number(!(ca.data.type&1))-Number(!(cb.data.type&1))||defenses.get(b)-defenses.get(a)||(ca.data.type&6)-(cb.data.type&6)||(nm(a)<nm(b)?-1:nm(a)>nm(b)?1:0)||a-b});}// Same Level: highest ATK first (Septarium, 2026-11-16), so Level 1-4 monsters line up by strength.
if(draftSort==='Level'){const attacks=new Map(base.map(i=>[i,card(pool[i]).data.type&1?deckStats(card(pool[i]),state.run,i,content.artifactInfo)[0]:-1]));return base.sort((a,b)=>((card(pool[b]).level||0)-(card(pool[a]).level||0))||attacks.get(b)-attacks.get(a)||nm(a).localeCompare(nm(b))||a-b)}if(draftSort==='Newest')return base.sort((a,b)=>last[nm(b)]-last[nm(a)]||a-b);return base.sort((a,b)=>first[nm(a)]-first[nm(b)]||a-b)}

function markGoldenCards(root,r){const ids=[...(r.golden_cards||[]),r.golden_card];for(const el of root.querySelectorAll('[data-pick]:not(.golden-card)'))if(ids.includes(r.pool[Number(el.dataset.pick)])){el.classList.add('golden-card');el.insertAdjacentHTML('beforeend','<span class="golden-sleeve-mark" title="Golden Sleeve" aria-label="Golden Sleeve">★</span>')}}


// Completion on the title screen (user, 2026-11-23, option C): the share of achievements done, beside the version label;
// centred under the footer line in portrait. Rounded down, so 100% means every achievement.
function titleCompletion(){const all=(state.achievements||[]).filter(a=>!a.testing);if(!all.length)return '';const done=all.filter(a=>a.done).length,pct=Math.floor(100*done/all.length);return `<small class="title-completion"><span class="title-completion-bar" aria-hidden="true"><i style="width:${pct}%"></i><em>${pct}%</em></span><b>${done}/${all.length} achievements</b></small>`}
let deckFillPicks=null;
function renderDraft(){const r=state.run,copy=fixedDeck(r,character()),main=r.selected.filter(i=>!(card(r.pool[i]).data.type&64)).length;let count={};r.selected.forEach(i=>count[r.pool[i]]=(count[r.pool[i]]||0)+1);shell('Build your deck',`<div class="scroll draft-scroll"><div class="draft-summary"><div><p class="draft-count">${main} / ${deckMinimum(r,content.characters[r.character])}+ minimum main ${deckKindsMarkup(r.selected.map(i=>Number(card(r.pool[i]).data.type)).filter(t=>!(t&64)))} · ${extraDeckMarkup(r.selected.length-main)} · ${copyLimitText(r)} ${copy?(character().copycat?'Copycat’s borrowed deck is read-only.':'Dueling Engine’s fixed starter deck is read-only.') : ''}</p><p class="draft-inspect-help">Hold a card to inspect · Drag to scroll</p>${bossCurseNote(r,curseIconFile)}</div><button class="tag-choose-opponent draft-next deck-count-arrow${!copy&&main<deckMinimum(r,content.characters[r.character])?' needs-fill':''}" data-do="${!copy&&main<deckMinimum(r,content.characters[r.character])?'deck-fill':'routes'}" ${!copy&&main>60?'disabled':''} aria-label="${main}/${deckMinimum(r,content.characters[r.character])}+ main deck cards — Next duel"><span><span class="tag-next-label"><strong>${main}/${deckMinimum(r,content.characters[r.character])}+</strong></span></span></button></div><div class="draft-tabs deck-filter-row">${deckSearchButtons('draft',draftFiltered())}${['All','Monster','Spell','Trap','Extra'].map(t=>`<button data-draft-tab="${t}" class="${draftTab===t?'active':''}">${t==='Extra'?'Extra Deck':t}</button>`).join('')}<select data-draft-deck aria-label="Deck status">${DECK_STATUS_OPTIONS.map(([v,label])=>`<option value="${v}" ${v===draftDeck?'selected':''}>${label}</option>`).join('')}</select><select data-draft-sort aria-label="Sort">${DRAFT_SORTS.map(o=>`<option value="${o}" ${o===draftSort?'selected':''}>${o}</option>`).join('')}</select>${markAllMarkup()}<button class="deck-deselect" data-do="deselect-all" aria-label="Deselect all" title="Deselect all" ${copy?'disabled':''}>${deselectIcon}</button><span class="deck-filter-break" aria-hidden="true"></span></div>${bountyBanner(r)}${draftSplit?`<div class="draft-card-scroll deck-split" ${splitStyle(draftSplit)}>${splitDeckPanes(r)}</div>`:`<div class="draft-card-scroll"><div class="cardgrid">${draftGridCards(r)||(draftTab==='Extra'?'<p class="muted">No Extra Deck cards yet. Fusion Monsters you get will appear here.</p>':'')}</div></div>`}</div>`,`${rewardDeckReturn?btn('Back to rewards','reward-return'):r.stage==='shop'?btn('Back to shop','shop'):''}`);markGoldenCards(app,r);deckReadyFeedback(app,main,deckMinimum(r,content.characters[r.character]));checkDraftSplit()}
// Big collections draw in pages (deck-paging.js); the page count holds while the order does.
const draftPage=r=>({id:'solo-deck',key:JSON.stringify([draftTab,draftSort,draftDeck,deckSearches.draft||null,r.pool.length,stacksOn(),!!draftSplit]),after:()=>markGoldenCards(app,r)});
// The selection the grid was last laid out with. A tap redraws the stacks in place, like the plain grid and Tag (Nori,
// Discord 2026-11-20: with Deck first an emptied stack jumped away and the next quick tap added the card that slid under
// the finger). A full redraw (renderDraft: a tab, filter or sort change) lays the grid out again.
let draftLayout=null;
function draftGridCards(r,keepLayout=false){if(!keepLayout||!draftLayout)draftLayout=[...r.selected];const order=draftOrder(r.pool,draftLayout),page=draftPage(r);if(!stacksOn())return pagedGrid(page.id,page.key,order,i=>draftCard(r,i),page.after);const s=groupStacks(order,r,r.selected,copyLimit(r)),locked=!!fixedDeck(r,character());return pagedGrid(page.id,page.key,s.order,i=>stackButton(draftCard(r,i),s.stack(i),{attr:'data-pick',locked}),page.after)}
const draftCard=(r,i)=>markTile(deckCardMarkup(cardButton(r.pool[i],`data-pick="${i}"`,r.selected.includes(i),!!(r.card_mods&&r.card_mods[i]!==undefined)),card(r.pool[i]),r,i,content.artifactInfo),r,r.pool[i]);
// Card marks (card-marks.js): the solo tap cycles the mark through the backend; Tag sends it to the host (tag-ui.js).
let markBusy=false;
async function cycleMark(el){if(markBusy||screen!=='draft'||!state.run)return;const id=Number(el.dataset.cardMark),next=nextMark(cardMark(state.run,id));markBusy=true;try{await command('mark',[id,next]);playUISound('deck-select');paintMarks(app,state.run,id);keepRunMark(state.run.character,id,next)}catch(e){toast(e.message)}finally{markBusy=false}}
onMarkTap(el=>{if(screen==='draft')void cycleMark(el);else if(screen==='tag')void tagUI?.cycleMark(el)});
// "★ All" (mark-all.js, user 2026-11-22): every card the editor shows, all pages. Deck editor: the run's marks, kept for the
// character too when its "Save marks from runs" switch is on. Character settings: the saved marks.
const shownDraftIds=()=>{const r=state.run;return r?[...new Set(draftOrder(r.pool,r.selected).map(i=>r.pool[i]))]:[]};
async function markShownDraft(mark){const r=state.run,ids=shownDraftIds();if(!ids.length||markBusy)return;markBusy=true;try{await command('mark',[ids,mark]);playUISound('deck-select');if(Number.isInteger(r.character)&&characterSettings(state.settings,r.character).keepRunMarks){for(const id of ids)setSavedMark(state.settings,r.character,id,mark);void saveCharacterSettings()}render()}catch(e){toast(e.message)}finally{markBusy=false}}
function markShownSaved(mark){if(!charEditor)return;const list=editorCards(marksSourceCards(charEditor.source),state.settings,charEditor.index,charEditor);for(const c of list)setSavedMark(state.settings,charEditor.index,c.id,mark);playUISound('deck-select');fillMarksEditor();void saveCharacterSettings()}
document.addEventListener('click',e=>{
 if(e.target.closest?.('.char-marks-editor .mark-all')&&charEditor){handleMarkAllClick(e,{count:()=>editorCards(marksSourceCards(charEditor.source),state.settings,charEditor.index,charEditor).length,apply:markShownSaved});return}
 if(screen==='draft'&&e.target.closest?.('.mark-all')){handleMarkAllClick(e,{count:()=>shownDraftIds().length,apply:markShownDraft});return}
 closeMarkAllMenus(e);
});
// Wide screens (2026-11-06): when Auto would fit 18+ cards per row, the editor splits into a Deck pane (8 per row) and a
// Collection pane with everything else. A tap moves the card across; each pane keeps its own scroll.
let draftSplit=0;
function splitDeckPanes(r){
 const inDeck=new Set(r.selected),order=draftSorted(r.pool,r.selected,true);
 const deckSide=order.filter(i=>inDeck.has(i)),rest=order.filter(i=>!inDeck.has(i));
 const isExtra=i=>isExtraDeckCard(card(r.pool[i]));
 if(!stacksOn())return splitDeckMarkup(deckSide,rest,i=>draftCard(r,i),draftTab==='Extra',draftPage(r),null,isExtra);
 const a=groupStacks(deckSide,r,r.selected,copyLimit(r)),b=groupStacks(rest,r,r.selected,copyLimit(r));
 return splitDeckMarkup(a.order,b.order,i=>stackButton(draftCard(r,i),a.stack(i)||b.stack(i),{attr:'data-pick',pane:inDeck.has(i)?'deck':'collection'}),draftTab==='Extra',draftPage(r),splitCounts(deckSide,rest,isExtra),isExtra);
}
function checkDraftSplit(){
 if(screen!=='draft'){draftSplit=0;return}
 const host=app.querySelector('.draft-scroll'),area=app.querySelector('.draft-card-scroll');
 if(!state.settings.deckColumns)autoDeckColumns=autoColumnsAcross(host,area);
 const total=deckSplitColumns(host,area,autoDeckColumns);
 if(total!==draftSplit){draftSplit=total;renderDraft()}
}
let draftSplitTimer=0;window.addEventListener('resize',()=>{clearTimeout(draftSplitTimer);draftSplitTimer=setTimeout(()=>{if(screen==='draft')checkDraftSplit()},200)},{passive:true});
function updateSplitPanes(r){
 const area=app.querySelector('.deck-split');if(!area)return;
 const scrolls=saveDeckScroll(area);area.innerHTML=splitDeckPanes(r);restoreDeckScroll(area,scrolls);markGoldenCards(app,r);
}

// Stacks (deck-stacks.js) change shape on every tap, so the grid is rebuilt; every scroll position is put back.
function updateStackedGrid(r){const grid=app.querySelector('.draft-card-scroll .cardgrid'),scrollers=[...app.querySelectorAll('.draft-card-scroll,.draft-scroll')],tops=scrollers.map(s=>s.scrollTop);if(!grid)return;grid.innerHTML=draftGridCards(r,true);scrollers.forEach((s,n)=>s.scrollTop=tops[n]);markGoldenCards(app,r)}
function updateDraft(){if(screen!=='draft')return;const r=state.run,main=r.selected.filter(i=>!(card(r.pool[i]).data.type&64)).length;const minimum=deckMinimum(r,content.characters[r.character]),arrow=document.querySelector('.deck-count-arrow');if(arrow){const fixed=fixedDeck(r,character()),short=!fixed&&main<minimum;arrow.disabled=!fixed&&main>60;arrow.classList.toggle('needs-fill',short);arrow.dataset.do=short?'deck-fill':'routes';arrow.querySelector('strong').textContent=`${main}/${minimum}+`;arrow.setAttribute('aria-label',`${main}/${minimum}+ main deck cards — Next duel`);markGoldenCards(app,r);deckReadyFeedback(app,main,minimum);}document.querySelector('.draft-count').innerHTML=`${main} / ${deckMinimum(r,content.characters[r.character])}+ minimum main ${deckKindsMarkup(r.selected.map(i=>Number(card(r.pool[i]).data.type)).filter(t=>!(t&64)))} · ${extraDeckMarkup(r.selected.length-main)} · ${copyLimitText(r)} ${fixedDeck(r,character())?'Fixed deck is read-only.':''}`;if(draftSplit)return updateSplitPanes(r);if(stacksOn())return updateStackedGrid(r);document.querySelectorAll('[data-pick]').forEach(el=>{const active=r.selected.includes(+el.dataset.pick);el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active))})}

let draftTap=null,draftPointer=null;

function flushDraftTap(){if(!draftTap)return;const tap=draftTap;draftTap=null;clearTimeout(tap.timer);command('toggle',tap.index).catch(e=>toast(e.message)).finally(updateDraft)}

let lastTap=null;

function doubleTap(key,code){const now=performance.now();if(lastTap&&lastTap.key===key&&now-lastTap.time<350){lastTap=null;removeActions();inspect(code);return true}lastTap={key,time:now};return false}

// The window blocks the page only when it is a real modal dialog. One marked open without being modal (seen on Android,
// Discord 2026-11-08) made every deck tap and inspect quietly do nothing until a restart; it is closed instead.
function modalBlocking(){if(!modal.open)return false;let shown=true;try{shown=modal.matches(':modal')}catch{}if(!shown)modal.close();return shown}
document.addEventListener('pointerdown',()=>{if(modal.open)modalBlocking()},true);
// Deck taps (Nori, Discord 2026-11-20): each tap keeps what it meant when it was drawn (deck-stacks.js tapIntent) and is
// resolved against the deck when it runs, so a quick second − never puts a copy back. Taps made while one is saving go
// to the backend together as one toggle list, and the grid is redrawn once, when no tap is waiting; a lone tap is as fast as before.
let deckTaps=[],deckTapsRun=null;
function queueDeckTap(el){deckTaps.push(steadyTap(state.run,tapIntent(el)));return deckTapsRun??=runDeckTaps().finally(()=>{deckTapsRun=null})}
async function runDeckTaps(){
 let changed=false;
 while(deckTaps.length){
  const taps=deckTaps.splice(0),r=state.run;if(screen!=='draft'||!r)break;
  const limit=copyLimit(r),{toggles,blocked}=applyTaps(r,r.selected,taps,taps.length>1?limit:null);
  if(blocked)toast(limit===1?'Singleton Pact allows only 1 copy of each card.':'Maximum three copies of a card.');
  // A failed toggle can still have changed the deck (the save to the device failed after the backend step), so the grid
  // is redrawn from the deck as it is now; it used to stay as drawn and every later tap looked dead (Dartz report, Nov 24).
  if(toggles.length)try{await command('toggle',toggles.length>1?toggles:toggles[0]);changed=true}catch(e){deckTaps.length=0;toast(e.message);updateDraft()}
  if(changed&&!deckTaps.length){changed=false;updateDraft();playUISound('deck-select')}
 }
 deckTaps.length=0;
}
function tapDraft(el){if(modalBlocking()||screen!=='draft')return;void queueDeckTap(el)}

function cancelDraftHold(){if(draftPointer){clearTimeout(draftPointer.timer);draftPointer.cancel=true}}

document.addEventListener('pointerdown',e=>{const el=e.target.closest('[data-pick]');if(!el||e.button!==0)return;cancelDraftHold();const p=draftPointer={id:e.pointerId,x:e.clientX,y:e.clientY,el,cancel:false,held:false};p.timer=setTimeout(()=>{if(draftPointer!==p||p.cancel||!el.isConnected||modalBlocking())return;p.held=true;inspect(state.run.pool[+el.dataset.pick],+el.dataset.pick)},500)});

document.addEventListener('pointermove',e=>{if(draftPointer?.id===e.pointerId&&Math.hypot(e.clientX-draftPointer.x,e.clientY-draftPointer.y)>10)cancelDraftHold()},{passive:true});

// Only scrolling the pressed card's own list (or the page) cancels the tap or hold; any other scroller on the page
// used to cancel every tap, so cards could neither be added nor inspected (user, Discord 2026-11-08).
document.addEventListener('scroll',e=>{if(draftPointer&&(e.target===document||e.target.contains?.(draftPointer.el)))cancelDraftHold()},{capture:true,passive:true});

document.addEventListener('pointercancel',cancelDraftHold);

document.addEventListener('pointerup',e=>{if(draftPointer?.id!==e.pointerId)return;const p=draftPointer;clearTimeout(p.timer);draftPointer=null;if(!p.cancel&&!p.held&&p.el===e.target.closest('[data-pick]'))tapDraft(p.el)});

document.addEventListener('contextmenu',e=>{const el=e.target.closest('[data-pick]');if(!el)return;e.preventDefault();if(e.button!==2||e.pointerType==='touch'||modalBlocking()||screen!=='draft')return;cancelDraftHold();draftPointer=null;inspect(state.run.pool[+el.dataset.pick],+el.dataset.pick)});

document.addEventListener('dragstart',e=>{if(e.target.closest('.cardbtn'))e.preventDefault()});

const seenBossReveals=new Set();

// The next duel's backdrop and the opponent's card art load while the player is still choosing or watching the reel
// (2026-11-03). Each backdrop is one small file kept in background-assets' cache; nothing loads with simple backgrounds.
function warmOpponents(ids){if(state.settings.simpleBackgrounds||state.settings.performanceMode||compatibilityEnabled())return;for(const id of new Set(ids))if(content.characters[id])preloadBackground(backgroundSpec(opponentScene(content.characters[id].name))).catch(()=>{})}
const warmedArt=new Set();
function warmDeckArt(ids){for(const id of new Set(ids)){if(warmedArt.has(id)||warmedArt.size>400)continue;warmedArt.add(id);const img=new Image();img.decoding='async';img.src=image(id)}}

function renderRoutes(){const r=state.run,boss=(r.round+1)%3===0;warmOpponents(r.routes||[]);const key=JSON.stringify([r.started_at,r.character,r.loop,r.round,r.boss_rerolls||0,r.routes]);shell(`Loop ${(r.loop||0)+1} · Duel ${r.round+1} / 9${boss?'<span class="header-extra"> — BOSS ENCOUNTER</span>':''}`,`${boss?bossBanner(r):''}<div class="routes">${r.routes.map(i=>encounterCard(content,r,i,{button:btn,curseIcons})).join('')}</div>${boss?bossControls(r):''}`,`<span class="route-stats"><span class="route-lp"><b>${Number(r.lp||0).toLocaleString()}</b> LP</span>${!boss?`<span class="route-coins"><img src="assets/ui/coins.png" alt="Coins"><b>${coinLabel(r.gold)}</b></span>`:''}</span>${r.stage==='shop'?btn('Back to shop','shop','','route-shop-back'):''}${fixedDeck(r,character())?'':`<button class="navigation-icon-button" data-do="draft" aria-label="Edit deck" title="Edit deck">${deckEditIcon}</button>`}`,`route-page${boss?' boss':''}`);mountRunStrip();if(boss&&!seenBossReveals.has(key)){seenBossReveals.add(key);if(seenBossReveals.size>64)seenBossReveals.delete(seenBossReveals.values().next().value);busy=true;playEncounterReveal({run:r,voice:juice.bossNameVoice,content,collectors:r.fallen_routes,opponents:r.routes,slot:true,...(spinOff()?{reduced:true}:{}),sound:duelSound,tickSound:slotTickSound,stopTick:()=>slotTick.pause(),active:()=>screen==='routes'}).finally(()=>busy=false)}}

let shopSelection=new Set(),shopInventoryKey=null;

// Current LP and coins on the shadow relic screen: Zombie's Bargain, Blood Toll and friends depend on them (Discord, 2026-11-16).
const cursedStanding=r=>`${Number(r?.lp||0).toLocaleString()} LP · ${Number(r?.gold||0).toLocaleString()} coins`;
// The VICTORIES strip shows which battle this is (Discord, Septarium, 2026-11-21), as on the opponent and shop screens.
function renderCursedRelics(){const offer=state.run.cursed_offer;app.innerHTML=`<section class="cursed-reward"><nav class="cursed-reward-topbar" aria-label="Run tools">${fixedDeck(state.run,character())?'':`<button class="navigation-icon-button" data-do="draft" aria-label="Edit deck" title="Edit deck">${deckEditIcon}</button>`}${btn(relicEyeIcon,'relic-ledger','aria-label="Relics" title="Relics"','navigation-icon-button')}</nav><header><small>BOSS DEFEATED</small>${offer.picked?'<h1>'+(offer.picked.length>1?'Choose a third shadow relic':'Choose a second shadow relic')+'</h1><p>Champion Trophy: choose 1 more, or skip it.</p>':state.run.easy?'<h1>Choose a shadow relic</h1><p>Choose 1, or skip it. Its benefit and drawback last for this run.</p>':'<h1>Choose a shadow relic</h1><p>Choose 1. Its benefit and drawback last for this run.</p>'}<p class="cursed-standing">${cursedStanding(state.run)}</p></header><div class="cursed-options">${offer.options.map(key=>{const [name,,text]=content.artifacts[key];return `<article><h2>${esc(name)}</h2>${relicArtwork(relicImage(content.artifactInfo[key].art))}${cursedMarkup(key,text,content.artifactInfo[key]?.parts)}${fusionHint(content,key)}${btn('Choose relic','cursed-choose',`data-relic="${esc(key)}"`,'primary')}</article>`}).join('')}</div><footer>${btn('Reroll · Rerolls: '+offer.rerolls_left,'cursed-reroll',offer.rerolls_left?'':'disabled')}${offer.picked?btn(offer.picked.length>1?'Skip third relic':'Skip second relic','cursed-skip'):state.run.easy?btn('Skip shadow relic','cursed-skip'):''}</footer></section>`;mountRunProgress(app.querySelector('.cursed-reward'),state.run,{content,dialog})}

// A small count of copies already in your card pool, so a fourth copy is not bought by mistake.

// Relic fusions (relic_fusions.py): each plays once, right after whatever completed its set.
// Remembered on this device too, so reopening the shop after a reload does not replay a reveal.
const seenFusions=new Set((()=>{try{return JSON.parse(localStorage.getItem('ygo-fusions-seen')||'[]')}catch{return []}})());
async function showRelicFusions(){const r=state.run,fresh=(r?.fusion_events||[]).filter((f,i)=>{const key=[r.started_at,r.loop,r.round,i,f.relic].join(':');if(seenFusions.has(key)||!content.artifacts[f.relic])return false;seenFusions.add(key);return true});if(fresh.length)try{localStorage.setItem('ygo-fusions-seen',JSON.stringify([...seenFusions].slice(-40)))}catch{}for(const f of fresh){const relic=id=>({name:content.artifacts[id][0],img:relicImage(content.artifactInfo[id].art),text:content.artifacts[id][2]});await playRelicFusion({pieces:f.pieces.filter(p=>content.artifacts[p]).map(relic),result:relic(f.relic),sound:playUISound})}if(fresh.length&&screen==='shop')renderShop()}

// A fusion that completes during another action (a reward relic, Jar of Greed, Tag) used to wait for a later shop
// redraw; now it plays as soon as that action finishes (2026-11-05). One short timer, only while a reveal is pending.
let fusionRevealTimer=0;
function queueFusionReveal(){if(fusionRevealTimer)return;const attempt=()=>{fusionRevealTimer=0;if(screen!=='shop'||!state.run?.fusion_events?.length)return;if(busy||modal.open){fusionRevealTimer=setTimeout(attempt,120);return}busy=true;showRelicFusions().finally(()=>busy=false)};fusionRevealTimer=setTimeout(attempt,0)}
// Cursed Restock: one purchase per stock. The server sets restock_bought after it (approved_relics.restock_locked).
const restockOne=r=>(r?.artifacts||[]).includes('cursed_cursed_restock')||r?.mirror_copy==='cursed_cursed_restock';
const restockLocked=(r,x)=>!!r?.restock_bought&&restockOne(r)&&!x.sold&&!x.greed;
let shopDrawing=false;
function drawShopStock(){const ids=(state.run?.shop||[]).filter(x=>x.kind==='single').flatMap(x=>x.bundle||[x.id]);if(shopDrawing||!needsDrawing(ids))return;shopDrawing=true;hatLoading(drawRandomCards(ids)).then(()=>{shopDrawing=false;if(screen==='shop')render()})}
function renderShop(){drawShopStock();if(state.run?.free_packs?.length&&!modal.open)setTimeout(()=>{if(screen==='shop'&&!modal.open)void showFreePacks()});fitButtonLabels(app);shopkeeperTaps=0;loadActiveFavourites();resetShopkeeperRightClicks();const r=state.run,fixed=!!(character().copycat||character().engine_deck);announceShopUltra(fixed?{...r,shop:r.shop.filter(x=>x.kind==='artifact')}:r,content.cards);if(r.cursed_offer){closeShopTour();return renderCursedRelics()}if(r.fusion_events?.length)queueFusionReveal();setTimeout(()=>{if(screen==='shop'&&!state.run?.cursed_offer)shopTourAfterRender(modal.open||!!state.run?.free_packs?.length)});const key=JSON.stringify([r.started_at,r.round,r.shop.map(x=>[x.kind,x.id,x.price])]);if(key!==shopInventoryKey){shopSelection.clear();shopInventoryKey=key;banishArmed=null}for(const i of shopSelection)if(!r.shop[i]||r.shop[i].sold||fixed&&r.shop[i].kind!=='artifact')shopSelection.delete(i);const owned=new Map();for(const id of r.pool||[])owned.set(id,(owned.get(id)||0)+1);const copyLimit=r.artifacts.includes('broken_limiter')?0:3;const product=(x,i)=>{let name,img,description='';if(x.kind==='single'){name=card(x.id).name;img=image(x.id)}else if(x.kind==='deck'){name=x.name+' · Adds to collection';img='assets/decks/'+x.art+'.jpg'}else if(x.kind==='pack'){name=packInfo(x.id).name;img='assets/packs/'+x.id+'.jpg'}else{const a=content.artifacts[x.id];name=a[0];description=a[2];img=relicImage(content.artifactInfo[x.id].art)}return `<div class="shop-product ${x.sold||restockLocked(r,x)?'sold':''} ${!x.sold&&!restockLocked(r,x)&&!canPay(r,x.price)?'fx-cant-afford':''} ${shopSelection.has(i)?'chosen':''} ${isShopUltra(x,content.cards)?'shop-ultra':''}${x.kind==='pack'&&isFavouritePack(x.id)?' favourite-pack':''}${x.kind==='deck'?' shop-deck':''}${relicLockClass(r,x)}${banishArmed===i&&x.kind==='artifact'&&!x.sold?' banish-armed':''}">${x.kind==='pack'?packStar(x.id,name,'shop-pack-fav'):''}<div class="product-art" data-shop-item="${i}">${relicLockButton(r,x,i)}${relicBanishButton(x,i,banishArmed===i,priceMarkup(r,BANISH_PRICE),canPay(r,BANISH_PRICE))}${x.kind==='artifact'?relicArtwork(img,`data-do="item-info" data-index="${i}"`):`<img ${x.kind==='single'?`data-inspect="${x.id}"`:x.kind==='artifact'||x.kind==='deck'||x.kind==='pack'?`data-do="item-info" data-index="${i}"`:''} src="${img}">`}<span class="price-badge">${x.sold?'SOLD':restockLocked(r,x)?'LOCKED':priceMarkup(r,x.price)}</span>${x.kind==='single'&&owned.get(x.id)?ownedBadge(owned.get(x.id),copyLimit):''}<button class="purchase-check" role="checkbox" aria-checked="${shopSelection.has(i)}" aria-label="Select ${esc(name)}" data-do="select-purchase" data-index="${i}" ${x.sold||restockLocked(r,x)||((character().copycat||character().engine_deck)&&x.kind!=='artifact')?'disabled':''}><span class="purchase-tick" aria-hidden="true"></span></button></div>${x.kind==='artifact'?`<small>${esc(name)}</small>`:''}</div>`};

 shell('',`<div class="shop-layout">${fixed?'':`<div class="shop-stock"><h3>${esc(r.shop_rerolls>0?'General stock':r.shop_reward?.label||'Featured stock')}</h3><div class="shelf singles-featured">${r.shop.map((x,i)=>({x,i})).filter(({x})=>x.kind==='single').slice(0,5).map(({x,i})=>product(x,i)).join('')}</div><h3 class="general-stock-heading">General stock</h3><div class="shelf singles-general" style="--single-columns:${Math.max(1,r.shop.filter(x=>x.kind==='single').length-5)}">${r.shop.map((x,i)=>({x,i})).filter(({x})=>x.kind==='single').slice(5).map(({x,i})=>product(x,i)).join('')}</div><h3 class="booster-heading">Booster packs${favouritesInStock(r.shop.filter(x=>x.kind==='pack'&&!x.sold&&isFavouritePack(x.id)).length)}</h3><div class="packs" style="--pack-columns:${r.shop.filter(x=>['pack','deck'].includes(x.kind)).length}">${favouritesFirst(r.shop.map((x,i)=>({x,i})).filter(({x})=>['pack','deck'].includes(x.kind)),({x})=>x.kind==='pack'?x.id:'').map(({x,i})=>product(x,i)).join('')}</div></div>`}<aside><div class="shop-counter"><button class="keeper secret-shopkeeper" data-do="shopkeeper-secret" aria-label="Shopkeeper"><img src="assets/shopkeeper.png" alt="Shopkeeper">${r.challenge_level===-1?'':'<span class="keeper-hit" data-do="shopkeeper-secret" aria-hidden="true"></span>'}</button><div class="shop-balance" aria-label="${coinLabel(r.gold)} gold"><img src="assets/ui/coins.png" alt=""><strong>${coinLabel(r.gold)}</strong></div><button class="primary shop-buy" data-do="buy-selected" ${shopSelection.size&&canPay(r,[...shopSelection].reduce((n,i)=>n+(r.shop[i]?.price||0),0))?'':'disabled'}><b>BUY</b><span>${currencyIcon(r)}<strong>${payCost(r,[...shopSelection].reduce((n,i)=>n+(r.shop[i]?.sold?0:r.shop[i]?.price||0),0))}</strong></span></button><button class="shop-reroll-counter" title="Rerolls the entire shop" aria-label="Reroll entire shop for ${payCost(r,shopRerollPrice(r))} ${lpPay(r)?'LP':'coins'}" data-do="shop-reroll" ${!canPay(r,shopRerollPrice(r))||fixed&&r.challenge_level===-1?'disabled':''}><b>REROLL</b><span>${currencyIcon(r)}<strong>${payCost(r,shopRerollPrice(r))}</strong></span></button>${fixedDeck(r,character())?'':'<button class="shop-edit-deck" data-do="draft">Edit deck</button>'}<button class="shop-next" data-do="routes" aria-label="Next Duel!" title="Next Duel!">${swordsIcon('shop-next-swords')}</button></div>${fixedDeck(r,character())?bountyBanner(r):''/* no deck editor to show it in (user, 2026-11-08) */}${r.challenge_level===-1?'':`<h3>${r.challenge_level===-1?'LVL -1 · Relics disabled':'Relics'} ${(character().copycat||character().engine_deck)?'— relics only':''}</h3><div class="relics">${r.shop.map((x,i)=>x.kind==='artifact'?product(x,i):'').join('')}</div>`}<div class="shop-reference-buttons">${btn('?','shop-tour','aria-label="Shop tour" title="Shop tour"','shop-tour-button')}${btn('Coin scorecard','scorecard')}${btn('Relics','relic-ledger')}<button class="shop-reroll-landscape" title="Rerolls the entire shop" aria-label="Reroll entire shop for ${payCost(r,shopRerollPrice(r))} ${lpPay(r)?'LP':'coins'}" data-do="shop-reroll" ${!canPay(r,shopRerollPrice(r))||fixed&&r.challenge_level===-1?'disabled':''}><b>REROLL</b><span>${currencyIcon(r)}<strong>${payCost(r,shopRerollPrice(r))}</strong></span></button></div></aside></div>`,`<span class="shop-header-lp">${r.lp.toLocaleString()} LP</span>`,'shop shop-compact'+((character().copycat||character().engine_deck)?' relic-only-shop':'')+(fixed&&!fixedDeck(r,character())?' deck-editing-shop':'')+(r.challenge_level===-1?' relicless-shop':''));mountRunStrip();requestAnimationFrame(positionShopkeeper);polishShop(app,JSON.stringify([r.started_at,r.character]),r.gold);const visit=JSON.stringify([r.started_at,r.loop,r.round]);if(visit!==shopVisitKey&&!r.reward_slots?.pending){shopVisitKey=visit;keeperTalk.say(fixed&&r.challenge_level===-1?'empty':'welcome')}}

// Blood Toll (shadow relic): purchases cost 10 LP per coin instead of coins (payment.py), keeping 1 LP.
const lpPay=r=>!!r?.artifacts?.includes('cursed_blood_toll')&&r.history_mode!=='tag',payCost=(r,c)=>lpPay(r)?c*10:c,canPay=(r,c)=>c<=0||(lpPay(r)?r.lp-c*10>=1:r.gold>=c);
// Blood Toll prices show the curses' LP-down icon where coins would be (2026-11-03).
const LP_ICON='<img class="price-lp" src="assets/icons/yugipedia/genres-reduce-life-points.png" alt="LP">';
const currencyIcon=r=>lpPay(r)?LP_ICON:'<img src="assets/ui/coins.png" alt="Gold">',priceMarkup=(r,c)=>lpPay(r)?`<span>${c*10}</span>${LP_ICON}`:`<span>${c}</span><img class="price-coin" src="assets/ui/coins.png" alt="gold">`;

let collectionFavouritePacks=false,collectionPackCards='';
const COLLECTION_TABS=[['cards','Cards'],['packs','Packs'],['relics','Relics'],['history','Run History'],['collectors','Ultimate Collectors'],['achievements','Achievements']];
// Stats have their own main-menu entry (2026-11-04), separate from the Collection.
const STATS_TABS=[['personal','Device Stats'],['global','Global Stats'],['characters','Character Stats'],['cpu','CPU Stats']];let statsKind='personal';
function statsNavigation(active){return `<div class="collection-nav">${STATS_TABS.map(([k,label])=>btn(label,'stats-kind',`data-kind="${k}"`,k===active?'primary':'')).join('')}</div>`}
function renderStats(){return statsKind==='global'?renderGlobalStats():statsKind==='characters'?renderCharacterStats():statsKind==='cpu'?renderCpuStats():renderPersonalStats()}

function collectionNavigation(active){return `<div class="collection-nav">${COLLECTION_TABS.map(([k,label])=>btn(label,'collection-kind',`data-kind="${k}"`,k===active?'primary':'')).join('')}</div>`}

// Achievements sort (user, 2026-11-14): kept per device; sorts within each group.
const ACHIEVEMENT_SORTS=['Default','Closest to completion','Completed first','In progress first','Name'];
let achievementSort=(()=>{try{const v=localStorage.getItem('ygo-achievement-sort');return ACHIEVEMENT_SORTS.includes(v)?v:'Default'}catch{return 'Default'}})();
function sortAchievements(rows){const share=a=>a.done?1:Math.min(a.value,a.target)/Math.max(1,a.target);const by={'Closest to completion':(a,b)=>(a.done-b.done)||share(b)-share(a),'Completed first':(a,b)=>b.done-a.done,'In progress first':(a,b)=>a.done-b.done,'Name':(a,b)=>String(a.name).localeCompare(String(b.name))}[achievementSort];return by?rows.map((a,i)=>[a,i]).sort((x,y)=>by(x[0],y[0])||x[1]-y[1]).map(x=>x[0]):rows}
document.addEventListener('change',e=>{if(!e.target.matches('[data-achievement-sort]'))return;achievementSort=e.target.value;try{localStorage.setItem('ygo-achievement-sort',achievementSort)}catch{}renderAchievements()});
// The controller's button guide can cover card text in a duel (Discord, 2026-11-15); this device remembers the choice.
const PAD_LEGEND_KEY='ygo-pad-legend';
function padLegendOn(){try{return localStorage.getItem(PAD_LEGEND_KEY)!=='0'}catch{return true}}
document.addEventListener('change',e=>{if(!e.target.matches('input[data-pad-legend]'))return;try{localStorage.setItem(PAD_LEGEND_KEY,e.target.checked?'1':'0')}catch{}});
document.addEventListener('change',e=>{if(!e.target.matches('input[data-deck-stacks]'))return;setStacks(e.target.checked);if(screen==='draft')renderDraft();else if(screen==='tag')tagUI?.render()});
function renderAchievements(){const groups=[['Characters',a=>a.id.startsWith('character:')],['Difficulties',a=>!a.id.startsWith('sleeve:')&&/level|difficulty/i.test(a.id)],['Gallery',a=>/gallery/i.test(a.id)],['Milestones',a=>!a.id.startsWith('character:')&&!a.id.startsWith('sleeve:')&&!/level|difficulty|gallery/i.test(a.id)],['Card Sleeves',a=>a.id.startsWith('sleeve:')]];shell('Collection',`${collectionNavigation('achievements')}<div class="achievement-tools"><label>Sort<select data-achievement-sort>${ACHIEVEMENT_SORTS.map(v=>`<option value="${v}" ${v===achievementSort?'selected':''}>${v}</option>`).join('')}</select></label></div><div class="scroll">${groups.map(([title,test])=>{const rows=sortAchievements(state.achievements.filter(a=>!a.id.startsWith('card:')&&!a.id.startsWith('pack:')&&test(a)));return rows.length?`<h2>${title}</h2>${rows.map(a=>`<section class="panel achievement ${a.done?'complete':''}"><div class="row"><img loading="lazy" class="achievement-art" src="assets/${a.image}"><h3>${esc(a.name)}</h3><b>${a.done?'COMPLETED':'IN PROGRESS'}</b></div><p>${esc(a.description)}</p><progress max="${a.target}" value="${Math.min(a.value,a.target)}"></progress><small>${Math.min(a.value,a.target)} / ${a.target} · ${a.cumulative?'Across all runs':'Best run'} · ${esc(a.reward)}</small></section>`).join('')}`:''}).join('')}</div>`)}

function renderRelics(){shell('Relics',`<div class="scroll cardgrid">${Object.entries(content.artifacts).filter(([id])=>state.run?.artifacts.includes(id)).map(([id,a])=>`<section class="panel"><img style="height:100px" src="${relicImage(content.artifactInfo[id].art)}">${relicCountBadge(id)}<h3>${esc(a[0])}</h3><p>${esc(a[2])}</p><small>${a[1]} coins</small></section>`).join('')}</div>`)}

let collectionKind='cards',collectionQuery='',collectionPage=0,collectionType='All types',collectionAttribute='All attributes',collectionEffect='Any effect',collectionRegistration='All cards';

let collectorLeaders=[];

async function renderCollectorLeaderboard(){

 shell('Collection',`${collectionNavigation('collectors')}<p>Loading surviving duelists…</p>`);

 try{const config=await fetch('./multiplayer-config.json').then(r=>r.json());const response=await fetch(config.signalingUrl.replace(/\/$/,'')+'/v2/collector/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!response.ok)throw Error('Leaderboard unavailable.');const result=await response.json();if(screen!=='collection'||collectionKind!=='collectors')return;collectorLeaders=result.leaderboard;shell('Collection',`${collectionNavigation('collectors')}<div class="scroll"><div class="collector-leader-grid">${collectorLeaders.map((d,i)=>{const c=content.characters[d.character],rank=rankFor(d.wins);return btn(`${c?`<img src="assets/${esc(c.sprite)}" alt="${esc(c.name)}">`:''}<span class="collector-rank">${esc(rank)}</span><span class="collector-slot-name">${i+1}. ${esc(d.name)}</span><small>${d.wins} wins</small>`,'collector-decklist',`data-index="${i}" data-rank="${rank.toLowerCase()}"`,'collector-slot')}).join('')||'<p>No surviving match winners yet.</p>'}</div></div>`);}catch(error){const reason=await explainOnlineError(error);if(screen==='collection')shell('Collection',`${collectionNavigation('collectors')}<p>${esc(reason)}</p>`);}

}

let collectionSort='Default';

document.addEventListener('change',e=>{if(e.target.matches('[data-collection-sort]')){collectionSort=e.target.value;collectionPage=0;renderCollection();}});

let registeredSource=null,registeredSet=new Set();

function registeredCard(id){if(registeredSource!==state.registeredCards){registeredSource=state.registeredCards;registeredSet=new Set(registeredSource||[])}return registeredSet.has(Number(id))}

// Starter decks first, then Structure Decks, each oldest first.
const collectionDecks=()=>[...(content.preconstructedDecks||[])].sort((a,b)=>a.name.includes('Structure')-b.name.includes('Structure')||a.date.localeCompare(b.date));
// Collection › Cards lists real cards only: a run's randomized cards are not part of the game's collection (Discord, 2026-11-17).
// Cached per content.cards array and length, so Related Cards keeps its index (related-cards.js caches by list).
let collectionCache=null;
const collectionCards=()=>{const all=content.cards;if(collectionCache?.all!==all||collectionCache.n!==all.length)collectionCache={all,n:all.length,list:all.filter(c=>!isRandomId(c.id))};return collectionCache.list};
function renderCollection(){if(collectionKind==='achievements'){renderAchievements();return;}if(collectionKind==='collectors'){void renderCollectorLeaderboard();return;}if(['personal','global','characters'].includes(collectionKind))collectionKind='cards';if(collectionKind==='history'){renderRunHistory();return}let rows=collectionKind==='cards'?collectionCards().map(c=>({id:c.id,name:c.name,img:image(c.id)})):collectionKind==='packs'?[...content.packs.map(p=>({id:p.id,name:p.name,img:'assets/packs/'+p.id+'.jpg'})),...collectionDecks().map(d=>({id:'deck:'+d.id,name:d.name,img:'assets/decks/'+d.art+'.jpg'}))]:Object.entries(content.artifacts).filter(([id])=>!(content.retiredArtifacts||[]).includes(id)&&(!(content.fusedRelics||[]).includes(id)||(state.profile?.fused_relics||[]).includes(id))).map(([id,r])=>({id,name:r[0],img:relicImage(content.artifactInfo[id].art)}));if(collectionKind==='packs'){loadActiveFavourites();if(collectionFavouritePacks)rows=rows.filter(r=>isFavouritePack(r.id));if(collectionPackCards){for(const r of rows)r.matches=String(r.id).startsWith('deck:')?0:packFilterCount(content,r.id,collectionPackCards);rows=rows.filter(r=>r.matches).sort((a,b)=>b.matches-a.matches)}rows=favouritesFirst(rows,r=>r.id)}rows=rows.filter(r=>(collectionKind==='cards'?cardMatchesQuery(card(r.id),collectionQuery):r.name.toLowerCase().includes(collectionQuery.toLowerCase()))&&(collectionKind!=='cards'||matchesFilters(card(r.id),collectionType,collectionAttribute,'Any effect')&&matchesSearch(card(r.id),'collection')));if(collectionKind==='cards'&&collectionRegistration!=='All cards')rows=rows.filter(r=>registeredCard(r.id)===(collectionRegistration==='Registered'));if(collectionKind==='cards')rows.sort((a,b)=>(collectionSort==='Default'?0:collectionSort==='Name'?a.name.localeCompare(b.name):collectionSort==='ATK'?(card(b.id).atk||0)-(card(a.id).atk||0):collectionSort==='DEF'?(card(b.id).defense||0)-(card(a.id).defense||0):(card(b.id).level||0)-(card(a.id).level||0)||(card(b.id).atk||0)-(card(a.id).atk||0))||frameLevelName(card(a.id),card(b.id)));// Ties keep the Default order, so Spells and Traps no longer mix (Discord, 2026-11-16).
if(collectionKind==='relics')rows=sortRelicCollection(rows,content.artifacts,content.fusedRelics);const pages=Math.max(1,Math.ceil(rows.length/36));collectionPage=Math.min(collectionPage,pages-1);shell('Collection',`<div class="collection-nav">${COLLECTION_TABS.map(([k,label])=>btn(label,'collection-kind',`data-kind="${k}"`,k===collectionKind?'primary':'')).join('')}<input id="collection-search" placeholder="Search collection" value="${esc(collectionQuery)}">${btn('Search','collection-search')}${collectionKind==='packs'?btn('<span aria-hidden="true">★</span> <span>Favourites</span>','collection-favourite-packs',`aria-pressed="${collectionFavouritePacks}"`,collectionFavouritePacks?'primary':'')+packCardsFilter():''}${collectionKind==='cards'?searchButton('collection')+collectionFilters()+`<label>Sort<select data-collection-sort>${['Default','Name','ATK','DEF','Level'].map(v=>`<option value="${v}" ${v===collectionSort?'selected':''}>${v}</option>`).join('')}</select></label><label>Registration<select data-collection-filter="registration">${['All cards','Registered','Missing'].map(x=>`<option value="${x}" ${x===collectionRegistration?'selected':''}>${x}</option>`).join('')}</select></label><small class="registration-progress">${collectionCards().filter(c=>registeredCard(c.id)).length} / ${collectionCards().length} registered</small>`:''}</div><div class="scroll cardgrid">${collectionKind==='packs'&&collectionFavouritePacks&&!rows.length?'<p class="collection-empty">No favourite packs yet. Tap ☆ on a pack here or in the shop.</p>':''}${rows.slice(collectionPage*36,(collectionPage+1)*36).map((r,index)=>`${collectionKind==='relics'&&(index===0||rows[collectionPage*36+index-1].relicKind!==r.relicKind)?`<h2 class="relic-group-heading">${r.relicKind}</h2>`:''}${collectionKind==='relics'&&(index===0||rows[collectionPage*36+index-1].relicKind!==r.relicKind||rows[collectionPage*36+index-1].effectGroup!==r.effectGroup)?`<h3 class="relic-group-heading">${r.effectGroup}</h3>`:''}${collectionKind==='packs'&&!String(r.id).startsWith('deck:')?`<div class="collection-pack${isFavouritePack(r.id)?' favourite-pack':''}">`:''}<button class="cardbtn ${collectionKind==='cards'&&registeredCard(r.id)?'card-registered':''}" ${collectionKind==='cards'?`data-inspect="${r.id}"`:`data-do="collection-item" data-id="${r.id}"`}>${collectionKind==='relics'?`<div class="collection-relic-art">${relicArtwork(r.img)}</div>`:`<img loading="lazy" src="${r.img}">`}<span>${esc(r.name)}</span>${r.matches?`<small class="pack-match-count" title="Matching cards in this pack">${r.matches}</small>`:''}</button>${collectionKind==='packs'&&!String(r.id).startsWith('deck:')?packStar(r.id,r.name,'collection-pack-fav')+'</div>':''}`).join('')}</div><footer>${btn('Previous','collection-prev',collectionPage?'':'disabled')} ${rows.length} entries · ${collectionPage+1} / ${pages} ${btn('Next','collection-next',collectionPage+1<pages?'':'disabled')}</footer>`)}

let tutorialPage=0,tutorialReturn="title";

function renderTutorial(){const pages=content.tutorial,p=pages[tutorialPage]||pages[0];const section=b=>`<p>${esc(b.text)}</p>${(b.images||[b.image]).map(src=>`<figure><button class="tutorial-shot" data-do="tutorial-image" data-src="${esc(src)}" data-label="${esc(b.title)}" aria-label="Enlarge screenshot: ${esc(b.title)}"><img loading="lazy" decoding="async" src="assets/${esc(src)}" alt="${esc(b.title)} — example game screen"></button><figcaption>Example screen · Tap to enlarge</figcaption></figure>`).join('')}`;shell('How to play',`<div class="tutorial-layout"><nav aria-label="Tutorial categories">${pages.map((p,i)=>btn(`${i+1}. ${esc(p.title)}`,'tutorial-page',`data-index="${i}" aria-current="${i===tutorialPage?'page':'false'}"`,i===tutorialPage?'primary':'')).join('')}</nav><article class="panel"><h2>${esc(p.title)}</h2>${p.video?`<a class="tutorial-video" href="${esc(p.video)}" target="_blank" rel="noopener noreferrer">▶ Watch the Yu-Gi-Oh! beginner video</a>`:(p.sections||[]).map(b=>p.collapsible?`<details class="tutorial-mode"><summary>${esc(b.title)}</summary>${section(b)}</details>`:`<section class="tutorial-section"><h3>${esc(b.title)}</h3>${section(b)}</section>`).join('')}</article></div><footer class="settings-footer">${btn('Back','tutorial-back')}</footer>`,'','tutorial-page')}



// Original Japanese Names (user, 2026-11-23): display only, through i18n.js; cards keep their names.
document.addEventListener('change',async e=>{if(!e.target.matches('[data-japanese-names]'))return;state.settings.japaneseNames=e.target.checked;setJapaneseNames(state.settings.japaneseNames,japaneseNames);await command('settings',state.settings)});
document.addEventListener('change',async e=>{if(!e.target.matches('[data-reduce-motion]'))return;state.settings.reduceMotion=e.target.checked;applyDisplayOptions(state.settings);await command('settings',state.settings)});
// Greyed-out Activate with its reason (activation-reasons.js) can be switched off (user, 2026-11-14).
document.addEventListener('change',async e=>{if(!e.target.matches('[data-explain-actions]'))return;state.settings.explainActions=e.target.checked;await command('settings',state.settings)});
document.addEventListener('change',async e=>{if(!e.target.matches('[data-faster-animations]'))return;state.settings.fasterAnimations=e.target.checked;await command('settings',state.settings)});

document.addEventListener('change',async e=>{if(!e.target.matches('[data-performance-mode]'))return;state.settings.performanceMode=e.target.checked;document.dispatchEvent(new Event('duel-background-change'));await command('settings',state.settings)});

document.addEventListener('change',async e=>{if(!e.target.matches('[data-visual-effect]'))return;const off=new Set(state.settings.effectsOff||[]);off[e.target.checked?'delete':'add'](e.target.dataset.visualEffect);state.settings.effectsOff=[...off];applyEffectOptions(state.settings.effectsOff);await command('settings',state.settings)});
document.addEventListener('change',async e=>{if(!e.target.matches('[data-skip-packs]'))return;state.settings.skipPackAnimations=e.target.checked;await command('settings',state.settings)});
// Spin/Slots Effects (user, 2026-11-23): off, the boss and reward slot reels show their result without spinning.
const spinOff=()=>state.settings?.spinEffects===false;
document.addEventListener('change',async e=>{if(!e.target.matches('[data-spin-effects]'))return;state.settings.spinEffects=e.target.checked;await command('settings',state.settings)});
document.addEventListener('change',async e=>{if(!e.target.matches('[data-pause-hidden]'))return;state.settings.pauseWhenHidden=e.target.checked;syncInspectionPause();await command('settings',state.settings)});
document.addEventListener('change',async e=>{if(!e.target.matches('[data-deck-columns-auto]'))return;const auto=e.target.checked,slider=document.getElementById('deck-columns');state.settings.deckColumns=auto?0:10;if(slider){slider.disabled=auto;slider.value=auto?DECK_COLUMNS_MAX:10;slider.nextElementSibling.textContent=deckColumnsLabel(state.settings.deckColumns)}applyDisplayOptions(state.settings);await command('settings',state.settings)});
document.addEventListener('change',async e=>{if(!e.target.matches('[data-deck-split-toggle]'))return;state.settings.deckSplit=e.target.checked;applyDisplayOptions(state.settings);await command('settings',state.settings)});
document.addEventListener('change',async e=>{if(!e.target.matches('[data-auto-pick-single]'))return;state.settings.autoPickSingle=e.target.checked;await command('settings',state.settings)});
document.addEventListener('change',async e=>{if(!e.target.matches('[data-auto-placement]'))return;state.settings.autoPlacement=e.target.checked;state.settings.autoPlacementSet=true;await command('settings',state.settings)});
// Auto-Placement (2026-11-06): summoning, setting or activating a card picks its zone the way the CPU does. Only plain
// placements on your own side; zones on the opponent's side and zones to disable are still chosen by hand.
// True when Auto-Placement will answer this zone prompt itself, so its zones are not highlighted (user, 2026-11-07).
function autoPlaces(m){
 if(!(state?.settings?.autoPlacement||lesson)||m?.player!==0||m.type!==M.SELECT_PLACE||screen!=='duel'||(tagUI&&!tagUI.session.duelReady))return false;
 const places=engine.choices(m).map(c=>c.response.places?.[0]);
 return places.length>0&&places.every(p=>p&&p.player===0&&[L.MZONE,L.SZONE].includes(p.location));
}
function autoPlacement(m){return autoPlaces(m)?engine.auto(m):null}
// Auto-Pick Single Choices (user, 2026-11-23; on by default, silent): a card prompt whose every listed card must be
// chosen and that cannot be cancelled answers itself. Prompts with Cancel (an attack target, a Tribute Summon) still ask.
function autoSingle(m){
 if(state?.settings?.autoPickSingle===false||lesson||m?.player!==0||screen!=='duel'||(tagUI&&!tagUI.session.duelReady))return null;
 if(![M.SELECT_CARD,M.SELECT_TRIBUTE].includes(m.type)||m.can_cancel||!m.selects?.length)return null;
 const all=m.selects.map((_,i)=>i),weight=m.type===M.SELECT_TRIBUTE?m.selects.reduce((n,c)=>n+(c.release_param||1),0):all.length;
 if(m.min<1||all.length>m.max||weight<m.min||all.length!==(m.type===M.SELECT_TRIBUTE?1:m.min))return null;
 return {type:m.type===M.SELECT_TRIBUTE?R.SELECT_TRIBUTE:R.SELECT_CARD,indicies:all};
}



// Settings rows (2026-10-29 redesign): a name and one-line description on the left, the control on the right.
// Every id and data attribute is unchanged, so the existing change/input handlers keep working.
const settingToggle=(title,desc,attr,on)=>`<label class="set-row"><span class="set-text"><b>${title}</b>${desc?`<small>${desc}</small>`:''}</span><input type="checkbox" class="switch" ${attr} ${on?'checked':''}></label>`;
const settingSlider=(title,desc,id,value,min,max,step,unit)=>`<div class="set-row set-slider"><span class="set-text"><label for="${id}"><b>${title}</b></label>${desc?`<small>${desc}</small>`:''}</span><span class="set-control"><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output>${value}${unit}</output></span></div>`;
function soundSettings(){return settingSlider('Master Volume','','master',state.settings.master??100,0,100,1,'%')+settingSlider('Music','','music',state.settings.music,0,100,1,'%')+settingSlider('Sound Effects','','sound',state.settings.sound,0,100,1,'%')+settingSlider('Voice Lines','Summons, finishers and taunts.','voice',state.settings.voice,0,100,1,'%')+settingSlider('Menu Sounds','','menu',state.settings.menu,0,100,1,'%')}
const effectSettings=()=>VISUAL_EFFECTS.filter(([key])=>key!=='vibration'||window.ShadowNative?.vibrate).map(([key,title,desc])=>settingToggle(title,desc,`data-visual-effect="${key}"`,effectOn(key))).join('');
const duelThemeSetting=()=>`<div class="set-row set-looks"><span class="set-text"><b>Duel Look</b></span><div class="duel-looks" role="radiogroup" aria-label="Duel Look">${DUEL_THEMES.map(([id,name])=>`<label class="duel-look"><input type="radio" name="duel-theme" value="${id}" ${id===(state.settings.duelTheme||'')?'checked':''}><img src="assets/ui/duel-looks/${id||'default'}.webp" alt="" loading="lazy"><span>${name}</span></label>`).join('')}</div></div>`;
// Card sleeves (2026-11-12, sleeves.js): duelist sleeves (Challenge Level 6 wins) and card-art sleeves (their own
// conditions). Standard first, then every unlocked sleeve, then the locked ones greyed out; pressing a locked one
// says how to unlock it (user, 2026-11-12). The bronze, silver and gold sleeves shine here only, never in a duel.
// The credit line names Deds, the Discord player who drew the sleeve art (user, 2026-11-20).
const sleeveSetting=()=>{const chosen=chosenSleeve(state.settings,state.profile,content),keys=allSleeves(content),open=keys.filter(k=>sleeveUnlocked(state.profile,k));
 const option=(key,src,name,ok,checked,tier='')=>`<label class="sleeve-option${ok?'':' locked'}" title="${esc(name)}"${tier?` data-tier="${tier}"`:''}${ok?'':` data-sleeve-locked="${esc(String(key))}"`}><input type="radio" name="card-sleeve" value="${esc(String(key))}" ${checked?'checked':''} ${ok?'':'aria-disabled="true"'}><img src="${src}" alt="" loading="lazy"><span>${esc(name)}</span></label>`;
 const row=key=>option(key,sleeveImage(content,key),sleeveName(content,key),sleeveUnlocked(state.profile,key),chosen===key,sleeveTier(content,key));
 // File order by default, so alternate arts of one card stay together; "Unlocked first" splits unlocked and locked
 // sleeves instead (user, 2026-11-21).
 const first=!!state.settings?.sleeveUnlockedFirst,list=first?[...open,...keys.filter(k=>!open.includes(k))]:keys;
 return `<div class="set-row set-sleeves"><span class="set-text"><b>Card Sleeve</b><small class="sleeve-count">${open.length} / ${keys.length}</small><label class="sleeve-sort"><input type="checkbox" name="sleeve-sort" ${first?'checked':''}><span>Unlocked first</span></label></span><p class="sleeve-credit">Sleeve designs by Deds</p><div class="sleeve-picker" role="radiogroup" aria-label="Card Sleeve">${option(-1,CARD_BACK,'Standard',true,chosen==null)}${list.map(row).join('')}</div></div>`};
document.addEventListener('change',async e=>{if(e.target.name!=='sleeve-sort')return;state.settings.sleeveUnlockedFirst=e.target.checked;const box=e.target.closest('.set-sleeves');if(box)box.outerHTML=sleeveSetting();await command('settings',state.settings)});
document.addEventListener('click',e=>{const locked=e.target.closest?.('[data-sleeve-locked]');if(locked){e.preventDefault();const raw=locked.dataset.sleeveLocked;toast(sleeveCondition(content,/^\d+$/.test(raw)?Number(raw):raw),{replace:true})}});
document.addEventListener('sleeve-mark',e=>{if(['draft'].includes(e.detail))void command('sleeve-mark',e.detail)});
document.addEventListener('change',async e=>{if(e.target.name!=='card-sleeve')return;const raw=e.target.value,key=/^-?\d+$/.test(raw)?Number(raw):raw;if(key!==-1&&!sleeveUnlocked(state.profile,key))return;state.settings.sleeve=key;await command('settings',state.settings)});
// A sleeve unlocked by anything the player did (not a sync or an import) gets its own popup.
function announceSleeves(before,action){if(!before||['init','import-profile','select-slot'].includes(action)||String(action).startsWith('device-sync')||String(action).startsWith('cloud'))return;for(const id of state?.profile?.sleeves_earned||[])if(!before.has(id))toast(`Card sleeve unlocked: ${sleeveName(content,id)}`)}
// Auto shows the column count last seen in the deck editor, so players can pick a nearby size.
let autoDeckColumns=0;
const deckColumnsLabel=value=>value>=DECK_COLUMNS_MIN?`${value} per row`:autoDeckColumns?`${autoDeckColumns} per row`:'';
// Auto is its own switch (2026-11-06): while on, the slider sits full and greyed out; turning it off starts at 10 per row.
const deckColumnsSlider=()=>{const value=Number(state.settings.deckColumns)||0,auto=value<DECK_COLUMNS_MIN;return settingSlider('Deck Card Size','Cards per row in the deck editor.','deck-columns',auto?DECK_COLUMNS_MAX:value,DECK_COLUMNS_MIN,DECK_COLUMNS_MAX,1,'').replace('type="range"',`type="range"${auto?' disabled':''}`).replace(/<output>.*?<\/output>/,`<output>${deckColumnsLabel(value)}</output><label class="deck-columns-auto"><span>Auto</span><input type="checkbox" class="switch" data-deck-columns-auto ${auto?'checked':''}></label>`)};
// UI Scale (2026-11-15, Discord: small on 4K screens): the slider's left end (70) is Auto, saved as 0.
const uiScaleLabel=v=>v?`${v}%`:`Auto (${autoUiScale()}%)`;
const uiScaleSlider=()=>{const v=uiScaleValue(state.settings.uiScale);return settingSlider('UI Scale','','ui-scale',v||autoUiScale(),45,200,5,'').replace(/<output>.*?<\/output>/,`<output>${uiScaleLabel(v)}</output>`)};
// Screen Orientation (TheGamer3000, itch.io; user 2026-11-22): the Android app only (MainActivity.setOrientation). Auto
// follows the phone as before; the webapp never shows it.
const ORIENTATIONS=[['auto','Auto'],['portrait','Portrait'],['landscape','Landscape']];
function applyOrientation(){try{window.ShadowNative?.setOrientation?.(state.settings?.orientation||'auto')}catch{}}
const orientationSetting=()=>window.ShadowNative?.setOrientation?`<div class="set-row"><span class="set-text"><b>Screen Orientation</b></span><select data-orientation aria-label="Screen Orientation">${ORIENTATIONS.map(([v,label])=>`<option value="${v}" ${(state.settings.orientation||'auto')===v?'selected':''}>${label}</option>`).join('')}</select></div>`:'';
document.addEventListener('change',async e=>{if(!e.target.matches('[data-orientation]'))return;state.settings.orientation=e.target.value;applyOrientation();await command('settings',state.settings)});
const displaySettings=()=>orientationSetting()+settingSlider('Text Size','','text-size',state.settings.textSize,50,150,10,'%')+uiScaleSlider()+deckColumnsSlider()+settingToggle('Split Deck Editor','Deck and collection side by side.','data-deck-split-toggle',state.settings.deckSplit)+settingToggle('Reduce Motion','','data-reduce-motion',state.settings.reduceMotion)+settingToggle('Original Japanese Names','Duelists use their original Japanese names. Card names stay the same.','data-japanese-names',!!state.settings.japaneseNames);
// CPU Action Delay (user 2026-11-24, Discord game speed request): 0–1000 ms added before every CPU action (not its passes).
const cpuDelay=()=>Math.max(0,Math.min(1000,Number(state?.settings?.cpuDelay)||0));globalThis.shadowCpuDelay=cpuDelay;
function cpuDelaySetting(){return settingSlider('CPU Action Delay','Extra wait before each CPU action.','cpu-delay',cpuDelay(),0,1000,50,' ms')}
function manualResponseWindowSetting(){const value=Math.max(0,Math.min(2000,Number(state.settings.manualResponseWindow??200)||0));return settingSlider('Response Window','Time to chain on the opponent’s turn.','manual-response-window',value,0,2000,50,' ms')}
function gameplaySettings(){return settingToggle('Stack Duplicate Cards','Copies of a card show as one card in the deck editor.','data-deck-stacks',stacksOn())+settingToggle('Pause When Tabbed Out','','data-pause-hidden',state.settings.pauseWhenHidden!==false)+settingToggle('Faster Animations','Only your own actions.','data-faster-animations',state.settings.fasterAnimations)+settingToggle('Skip Pack Animations','Opened packs go straight to the summary of your pulls.','data-skip-packs',!!state.settings.skipPackAnimations)+settingToggle('Spin/Slots Effects','Boss and reward slot reels spin before they stop.','data-spin-effects',state.settings.spinEffects!==false)+settingToggle('Explain Unavailable Actions','Greyed-out Activate buttons tell you why.','data-explain-actions',state.settings.explainActions!==false)+settingToggle('Controller Button Guide','','data-pad-legend',padLegendOn())+settingToggle('Auto-Placement','Picks the zone for your cards.','data-auto-placement',state.settings.autoPlacement)+settingToggle('Auto-Pick Single Choices','When a prompt has only one possible card, it is picked for you.','data-auto-pick-single',state.settings.autoPickSingle!==false)+manualResponseWindowSetting()+cpuDelaySetting()+'<div class="set-row keyboard-shortcuts"><span class="set-text"><b>Keyboard Shortcuts</b><small>Space: next phase · Enter: confirm · C: chain prompts · L: duel log</small></span></div>'}
// Frame cap (2026-11-09): frame-cap.js, at most 120 frames a second; lower caps use less power.
const fpsCapValue=()=>Math.max(30,Math.min(120,Math.round((Number(state.settings.fpsCap)||120)/10)*10));
function duelBackgroundSetting(){return settingSlider('FPS Cap','Lower uses less power.','fps-cap',fpsCapValue(),30,120,10,' FPS')+settingToggle('Performance Mode','Fewer decorative effects.','data-performance-mode',state.settings.performanceMode)+settingToggle('Simple Backgrounds','Uses less battery.','data-simple-backgrounds',state.settings.simpleBackgrounds)+settingToggle('Compatibility Mode','Fixes flickering in some browsers.','data-compatibility-mode',compatibilityEnabled())}
// In-duel settings (2026-11-04): the same rows as the Settings page, grouped into tabs, with the Duel Look switchable mid-duel.
const DUEL_SETTINGS_TABS=[['look','Look'],['sound','Sound'],['gameplay','Gameplay'],['effects','Effects'],['character','Character']];let duelSettingsTab='look';
function duelSettingsMarkup(){
 const panes={look:duelThemeSetting()+settingSlider('Text Size','','text-size',state.settings.textSize,50,150,10,'%')+uiScaleSlider()+settingToggle('Reduce Motion','','data-reduce-motion',state.settings.reduceMotion),
  sound:soundSettings(),gameplay:gameplaySettings(),effects:effectSettings()+'<h3>Performance</h3>'+duelBackgroundSetting(),character:duelCharacterPane()};
 if(!panes[duelSettingsTab])duelSettingsTab='look';
 return `<div class="settings settings-v2 settings-dialog duel-settings"><nav class="duel-set-tabs" role="tablist" aria-label="Duel settings sections">${DUEL_SETTINGS_TABS.map(([k,label])=>`<button type="button" role="tab" data-do="duel-settings-tab" data-tab="${k}" aria-selected="${k===duelSettingsTab}" class="${k===duelSettingsTab?'active':''}">${esc(label)}</button>`).join('')}</nav>${DUEL_SETTINGS_TABS.map(([k])=>`<div class="duel-set-pane" role="tabpanel" data-pane="${k}" ${k===duelSettingsTab?'':'hidden'}>${panes[k]}</div>`).join('')}</div>`;
}
// Character settings (character-settings.js): saved card marks per character, from the character select gear or the
// duel's Character tab. The duel's character is the run's (in Tag, this player's own run).
// Final Countdown's turns left, under the turn number (CITYDRIVER, Discord 2026-11-18). The activation turn counts as
// turn 1 and the duel ends at the end of turn 20, so the last turn shows 1.
function finalCountdownChips(){
 const list=engine?.finalCountdowns||[],turn=engine?.turn||0;
 return list.map(x=>{const left=Math.max(0,20-(turn-x.turn)),mine=x.player===0;
  return `<span class="final-countdown ${mine?'own':'enemy'} ${left<=3?'urgent':''}" title="Final Countdown (${mine?'yours':'opponent'}): ${left} turns left" aria-label="Final Countdown (${mine?'yours':'opponent'}): ${left} turns left"><i aria-hidden="true">⌛</i>${left}</span>`}).join('');
}
const duelCharacter=()=>{const r=snapshot?.tag?tagUI?.view?.run:state.run;return Number.isInteger(r?.character)?r.character:null};
function duelCharacterPane(){const i=duelCharacter();return i===null?'<p class="muted">No character in this duel.</p>':characterPane(state.settings,i,content.characters[i]?.name||'',packName)}
async function saveCharacterSettings(){try{await command('settings',state.settings)}catch(error){toast(error.message)}}
// A mark set during a run, saved for the character too when its "Save marks from runs" switch is on.
function keepRunMark(index,id,mark){if(!Number.isInteger(index)||!characterSettings(state.settings,index).keepRunMarks)return;setSavedMark(state.settings,index,id,mark);void saveCharacterSettings()}
// A Tag run starts with this player's saved Character settings marks: sent once per room, on the first round only, so a
// mark removed later is not added back.
const tagMarksSent=new Set();
function sendSavedTagMarks(view){
 const r=view?.run,code=tagUI?.session?.code;if(!r||!code||r.round!==0||view.phase==='lobby'||!tagUI?.session?.connected)return;
 const key=code+':'+view.seat,marks=characterSettings(state.settings,r.character).marks;if(tagMarksSent.has(key)||!Object.keys(marks).length)return;
 tagMarksSent.add(key);void tagUI.session.request('marks',marks).catch(error=>{tagMarksSent.delete(key);console.warn('Saved marks:',error.message)});
}
let charEditor=null;
function openCharacterSettings(index,from='select'){charEditor=null;dialog(`${content.characters[index]?.name||'Character'} · Settings`,characterPane(state.settings,index,content.characters[index]?.name||'',packName));modal.dataset.characterFrom=from}
function refreshCharacterPanes(index){for(const box of modal.querySelectorAll(`.character-settings[data-char-index="${index}"]`))box.outerHTML=characterPane(state.settings,index,content.characters[index]?.name||'',packName)}
let marksCardIndex=null;const marksCardsById=()=>{if(marksCardIndex?.all!==content.cards)marksCardIndex={all:content.cards,map:new Map(collectionCards().map(c=>[c.id,c]))};return marksCardIndex.map};
// Cards from the whole collection or one pack (user, 2026-11-18).
const marksSourceCards=source=>{if(!source||source==='all')return collectionCards();const pack=content.packs.find(p=>p.id===source);return pack?packCards(pack,marksCardsById()):collectionCards()};
function fillMarksEditor(){const body=modal.querySelector('.char-marks-body');if(!body||!charEditor)return;const list=editorCards(marksSourceCards(charEditor.source),state.settings,charEditor.index,charEditor),grid=editorGrid(list,state.settings,charEditor.index,charEditor.page,image);charEditor.page=grid.page;body.innerHTML=grid.html}
function openMarksEditor(index){const from=modal.dataset.characterFrom||(screen==='duel'?'duel':'select');charEditor={index,query:'',filter:'all',source:'all',page:0,from};dialog(`${content.characters[index]?.name||'Character'} · Card marks`,editorMarkup(index,charEditor,packSources(content.characters[index],content.packs)));fillMarksEditor()}
document.addEventListener('input',e=>{const q=e.target.closest?.('[data-char-marks-search]');if(!q||!charEditor)return;charEditor.query=q.value;charEditor.page=0;fillMarksEditor()});
document.addEventListener('change',e=>{
 const s=e.target.closest?.('[data-char-marks-source]');if(s&&charEditor){charEditor.source=s.value;charEditor.page=0;fillMarksEditor();modal.querySelector('.char-marks-body')?.scrollIntoView({block:'start'});return}
 const f=e.target.closest?.('[data-char-marks-filter]');if(f&&charEditor){charEditor.filter=f.value;charEditor.page=0;fillMarksEditor();return}
 const k=e.target.closest?.('[data-char-keep-marks]');if(k){setKeepRunMarks(state.settings,+k.dataset.charKeepMarks,k.checked);void saveCharacterSettings()}
});
document.addEventListener('click',e=>{
 const tile=e.target.closest?.('[data-char-mark]');if(!tile||!charEditor)return;e.preventDefault();
 const id=+tile.dataset.charMark,next=nextMark(Number(characterSettings(state.settings,charEditor.index).marks[String(id)]||0));
 setSavedMark(state.settings,charEditor.index,id,next);playUISound('deck-select');fillMarksEditor();void saveCharacterSettings();
});
// Hotkeys shows where a keyboard is likely: a mouse or trackpad is there (desktop browser, Windows/Linux apps).
const SETTINGS_TABS=[['sound','Sound'],['effects','Effects'],['gameplay','Gameplay'],['display','Display'],['hotkeys','Hotkeys'],['devices','Devices & App'],['replays','Replays & Stats'],['about','About and Tutorial']];let settingsTab='sound';

document.addEventListener('change',async e=>{if(!e.target.matches('[data-simple-backgrounds]'))return;state.settings.simpleBackgrounds=e.target.checked;document.dispatchEvent(new Event('duel-background-change'));await command('settings',state.settings)});



// Compatibility mode is off by default, but auto-enables on Firefox where GPU compositing flickers.
const compatibilityBrowser=()=>/firefox/i.test(navigator.userAgent);
const compatibilityEnabled=()=>state.settings.compatibilityMode==null?compatibilityBrowser():!!state.settings.compatibilityMode;
function applyCompatibilityMode(){document.documentElement.classList.toggle('compatibility-mode',compatibilityEnabled());document.dispatchEvent(new Event('duel-background-change'))}

document.addEventListener('change',async e=>{if(!e.target.matches('[data-compatibility-mode]'))return;state.settings.compatibilityMode=e.target.checked;applyCompatibilityMode();await command('settings',state.settings)});

document.addEventListener('change',e=>{if(e.target.matches('[data-usage-stats]'))setStatsEnabled(e.target.checked)});

document.addEventListener('change',async e=>{if(e.target.name==='duel-theme'){state.settings.duelTheme=e.target.value;applyDisplayOptions(state.settings)}if(e.target.id==='deck-columns'||e.target.name==='duel-theme')await command('settings',state.settings)});

// Cosmetics (user, 2026-11-12): the Duel Look and the card sleeve live on their own menu card, not in Settings.
// The Duel Look can still be switched inside a duel (duel settings, Look tab).
function renderCosmetics(){shell('Cosmetics',`<div class="scroll cosmetics settings-v2"><section class="set-group">${duelThemeSetting()}</section><section class="set-group">${sleeveSetting()}</section></div>`,'','cosmetics-page')}
function renderSettings(){
 const panes={
  sound:`<h2>Sound</h2>${soundSettings()}`,
  effects:`<h2>Effects</h2><p class="muted">Turn off anything you would rather not see. Duels play out the same either way.</p>${effectSettings()}`,
  gameplay:`<h2>Gameplay</h2>${gameplaySettings()}`,
  // Language: the title screen's flag button and picker (user, 2026-11-08).
  display:`<h2>Display</h2><div class="set-row settings-language"><span class="set-text"><b>Language</b></span><button class="settings-language-button" data-do="language" aria-label="Language" title="Language">${flagSvg(currentLanguage())}<span>${esc(LANGUAGES.find(([code])=>code===currentLanguage())?.[1]||'English')}</span></button></div>${displaySettings()}${duelBackgroundSetting()}${window.ShadowNative?'':settingToggle('Preload Game Assets','Loads music and artwork at startup.','data-preload-visuals',preloadVisualPreference()==='all')}`,
  // Saved Data lives in the Devices & App tab (2026-11-06).
  saves:`<h3 class="saved-data-head">Saved Data</h3><p class="muted">Your progress is always saved on this device, and updating the app keeps it.</p><div class="set-group">${cloudSettingsMarkup({enabled:deviceBackup.isEnabled(),...deviceBackup.status()},btn,esc)}</div><details class="set-group"><summary>Other recovery options</summary><label class="set-file">Import a save file <input id="device-recovery-file" type="file" accept=".json,application/json"></label><p class="muted">A save backup exported from the browser version, or a recovery file from the admin.</p></details><details class="set-group settings-danger"><summary>Reset Progress</summary><p>Remove all saved progress on this device.</p>${btn('Delete All Progress','reset-progress','','danger')}${deviceBackup.status().code?`<p>Remove your cloud save from the server. Progress on this device stays.</p>${btn('Delete My Cloud Save','cloud-delete','','danger')}`:''}</details>`,
  devices:`<h2>Devices &amp; App</h2><p class="muted">Link Devices shares unlocks, achievements, card sleeves and challenge levels between your devices.</p><div class="settings-actions">${window.ShadowNative?.openUpdate?btn('Check for Updates','android-update'):''}${btn('Link Devices','device-sync-open')}</div>`,
  replays:`<h2>Replays &amp; Stats</h2><div class="set-row"><span class="set-text"><b>Duel Replays</b><small>Your last 100 duels. Uploading them helps improve the CPU; no account details are sent.</small></span>${btn('Upload Replays','upload-replays')}</div><p id="replay-status" role="status" aria-live="polite"></p>${settingToggle('Share Global Statistics','Anonymous totals only.','data-usage-stats',statsEnabled())}`,
  about:`<h2>About and Tutorial</h2><div class="settings-actions">${btn('Tutorial Duel','lesson-start')}${btn('How to Play','tutorial')}</div><p class="notice settings-about">Yu-Gi-Oh: Rogue Duelist · A private fan experiment.<br>Card and character artwork © Konami. Duel rules: Project Ignis / ocgcore-wasm.</p><details class="set-group settings-advanced"><summary>Advanced</summary><label for="cheat-code">Testing Code</label><div class="settings-code"><input id="cheat-code" placeholder="Enter code">${btn('Apply','cheat')}</div></details>`
 };
 panes.devices+=panes.saves;
 const keyboard=matchMedia('(any-pointer:fine)').matches;if(keyboard)panes.hotkeys=hotkeysPane();
 hotkeys.stopCapture();
 if(!panes[settingsTab]||settingsTab==='saves')settingsTab='sound';
 const tabs=app.querySelector('.settings-tabs'),tabScroll=[tabs?.scrollLeft||0,tabs?.scrollTop||0];
 shell('Settings',`<div class="settings-v2"><nav class="settings-tabs" role="tablist" aria-label="Settings sections">${SETTINGS_TABS.filter(([k])=>panes[k]).map(([k,label])=>`<button role="tab" data-do="settings-tab" data-tab="${k}" aria-selected="${k===settingsTab}" class="${k===settingsTab?'active':''}">${esc(label)}</button>`).join('')}</nav><div class="scroll settings settings-pane" role="tabpanel">${panes[settingsTab]}</div></div><footer class="settings-footer">${btn('Back','settings-back')}</footer>`,'','settings-page');
 const rail=app.querySelector('.settings-tabs');if(rail)[rail.scrollLeft,rail.scrollTop]=tabScroll;
}



let shadowVictoryKey=null,viewedRun=null;

// The shopkeeper's secret duel (user, 2026-11-18): the opponent shows Solomon's portrait and the name "Angry Grandpa".
function angryGrandpa(r){if(r?.secret_challenge!=='relicless')return null;const c=content.characters.find(x=>x.name==='Solomon Muto');return c?{...c,name:'Angry Grandpa'}:null}
function finalChallengeName(r){const opponent=r.encore_opponent??(r.encore_won?0:r.loop>=1?75:0);return opponent===75?(content.characters[opponent]?.name||'Obelisk the Tormentor'):'2004 World Champion'}

const runCardFigure=()=>`<figure class="run-card"><canvas class="run-card-canvas" width="1080" height="1350" role="img" aria-label="Run summary"></canvas></figure>`,runCardShare=()=>`<div class="run-card-share"><button class="primary run-card-copy" data-do="copy-run-card" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>Copy image</button><button class="run-card-copy run-card-save" data-do="save-run-card" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>Download</button><p class="run-card-status" role="status" aria-live="polite"></p></div>`,runCardMarkup=()=>runCardFigure()+runCardShare();

function renderEnding(){const r=state.run,won=r.stage==='complete';const victoryKey=String(r.started_at)+':'+r.character;if(won&&r.challenge_level===6&&!r.secret_challenge&&shadowVictoryKey!==victoryKey&&!r.reward_slots?.pending){shadowVictoryKey=victoryKey;showShadowVictory(()=>(state.settings?.sound??65)/100);}const next=won&&!r.secret_challenge&&!r.easy&&r.challenge_level>=0&&r.challenge_level<6?r.challenge_level+1:null;shell(won?'Run complete':'Game over',`<div class="scroll run-end" data-run-outcome="${won?'victory':'defeat'}"><div class="run-end-layout"><div class="run-end-left">${variantUnlockMarkup(r)}${won&&r.sleeve_unlocked?sleeveUnlockMarkup(r):''}${won&&r.level_unlocked!=null?`<section class="level-unlock" aria-label="Challenge level unlocked"><div class="unlock-lights"></div><div class="unlock-motes">${Array.from({length:40},(_,i)=>`<i style="--x:${(i*37+11)%100}%;--y:${(i*53+5)%100}%;--delay:-${(i*0.35).toFixed(2)}s;--duration:${(2.2+(i%7)*0.3).toFixed(2)}s"></i>`).join('')}</div><h2>CHALLENGE LVL ${r.level_unlocked} UNLOCKED</h2><p>Clear a full run to unlock the next level for ${esc(character().name)}.</p></section>`:''}<section class="run-end-unlocks"><h3>Unlocked during this run</h3><div class="run-end-unlock-list">${state.achievements.filter(a=>r.content_unlocks_earned?.includes(a.id)||(a.id.startsWith('character:')&&r.unlocks_earned?.includes(+a.id.split(':')[1]))).map(a=>`<span class="unlock-art"><img src="assets/${a.image}"><span>${esc(a.name)}</span></span>`).join('')||(r.easy?'<p class="muted">Easy runs earn no achievements or unlocks.</p>':'<p class="muted">No new unlocks this run.</p>')}</div></section></div>${runCardFigure()}<div class="run-end-right">${runCardShare()}<div class="run-end-next">${next!=null?`<button class="run-end-next-level" data-do="next-level-run" data-level="${next}"><span class="next-level-name">${esc(character().name)}</span><span class="next-level-shine">Challenge level ${next}</span></button>`:''}${r.secret_challenge&&won?'<p class="run-end-gallery">Gallery unlocked!</p>':''}${btn('New Run','characters','',next!=null?'':'primary')}${won&&!r.secret_challenge&&r.final_loop?'<section class="run-end-loop run-end-final"><p>You conquered the final loop.</p></section>':''}${won&&!r.secret_challenge&&!r.final_loop?`<section class="run-end-loop"><p>${r.encore_won?`${esc(finalChallengeName(r))} defeated. Keep your cards, coins and relics. Each loop adds 100 enemy ATK/DEF and 2,000 enemy LP.`:`Keep this deck? Face ${esc(finalChallengeName(r))} and start looping.`}</p>${btn(r.encore_won?'Begin next loop':'Start Looping',r.encore_won?'next-loop':'champion','','run-end-loop-button')}</section>`:''}</div></div></div></div>`);mountEndingCard(r)}
// The first Level 6 win with a duelist unlocks their card sleeve (sleeves.js), chosen in Settings › Display.
function sleeveUnlockMarkup(r){return `<section class="sleeve-unlock" aria-label="Card sleeve unlocked"><img src="${sleeveImage(content,r.character)}" alt=""><div><p class="sleeve-unlock-eyebrow">Card sleeve unlocked</p><h2>${esc(content.characters[r.character]?.name||'')}</h2><p>Choose it in Settings › Display.</p></div></section>`}
// The run that unlocks a character's second variant shows it off: its art, name, signature cards and starting relic.
function variantUnlockMarkup(r){const base=content.characters[r.character],alt=base?.alternate;if(!r.variant_unlocked||!alt)return '';const cards=alt.cards.slice(0,3).map(name=>content.cards.find(row=>row.name===name)?.id).filter(Boolean),relic=content.artifactInfo[alt.starting_relic];return `<section class="variant-unlock" aria-label="New variant unlocked" style="--variant-art:url('assets/${alt.background||`character-backgrounds/${r.character}.jpg`}')"><p class="variant-unlock-eyebrow">New variant unlocked</p><h2>${esc(alt.name)}</h2><div class="variant-unlock-cards">${cards.map(id=>`<img src="${image(id)}" alt="">`).join('')}</div>${relic?`<p class="variant-unlock-relic">${relicArtwork(relicImage(relic.art))}<span>Starts with ${esc(content.artifacts[alt.starting_relic][0])}</span></p>`:''}</section>`}
// The share card draws once its artwork loads; Copy stays disabled until then.
// A past run, from its history row. Older rows have no deck, so a win's card leaves it out.
function showRunCard(row){
 const c=content.characters[row.character];if(!c)return;
 const deck=(row.deck||[]).filter(id=>card(id)),run={...row,stage:row.result==='complete'?'complete':'gameover',pool:deck,selected:deck.map((_,i)=>i)};
 viewedRun=run;dialog('',`<div class="run-card-dialog">${runCardMarkup()}</div>`);modal.classList.add('run-card-modal');
 const canvas=modal.querySelector('.run-card-canvas');
 mountRunCard(canvas,run,{content,character:c,card,cardImage:image,relicImage,assetURL,finalChallengeName}).then(()=>{if(canvas.isConnected)modal.querySelectorAll('.run-card-copy').forEach(b=>b.disabled=false)}).catch(e=>{console.error(e);const s=modal.querySelector('.run-card-status');if(s)s.textContent='The run summary image could not be drawn.'});
}

function mountEndingCard(r){viewedRun=null;const canvas=app.querySelector('.run-card-canvas');if(!canvas)return;mountRunCard(canvas,r,{content,character:character(),card,cardImage:image,relicImage,assetURL,finalChallengeName}).then(()=>{if(canvas.isConnected)app.querySelectorAll('.run-card-copy').forEach(b=>b.disabled=false)}).catch(e=>{console.error(e);const s=app.querySelector('.run-card-status');if(s)s.textContent='The run summary image could not be drawn.'})}



function duelSignatureMonsters(){const ids=new Set([state.run.character,state.run.opponent].filter(Number.isInteger).flatMap(id=>{const c=content.characters[id];if(!c)return[];const names=[...(c.cards||[]),...(c.alternate?.cards||[])];return names.map(name=>content.cards.find(row=>row.name===name)?.id).filter(id=>id&&((card(id)?.data?.type||0)&1))}));return ids}

// ---- Tutorial duel (2026-11-11): tutorial-duel.js is the script, tutorial-coach.js the bubble. ----
// While it runs, `lesson` holds the script, the coach and the real saved state. state.run is a stand-in that never
// reaches the backend: no response, result, stat, replay or cloud save is written, and leaving restores everything.
let lesson=null;
const LESSON_ASKED='ygo-tutorial-asked';
function lessonAsked(){try{localStorage.setItem(LESSON_ASKED,'1')}catch{}}
// Asked once, and only of someone who has never started a run on this device.
function lessonShouldAsk(){try{if(localStorage.getItem(LESSON_ASKED))return false}catch{return false}return !tagUI&&!(state.profile?.runs>0)&&!(state.slots||[]).some(s=>s.run)}
async function startLesson(returnTo='title'){
 if(lesson||tagUI||busy)return;busy=true;lessonAsked();
 app.innerHTML=`<section class="loading"><img class="loading-wizard" src="assets/time-wizard.png" alt="Time Wizard"><h1>ENTERING THE DUEL</h1><p>Loading the offline EDOPro core…</p></section>`;
 const saved=state;
 try{
  if(!engine||engine.tagFacade)engine=await new MobileDuel([...content.cards,...content.tokenCards]).init();else engine.destroy();
  const run={character:LESSON_PLAYER,opponent:LESSON_OPPONENT,first_player:0,pool:[...LESSON_POOL],selected:[],artifacts:[],curses:[],round:0,loop:0,lp:LESSON_LP,stage:'duel',lesson:true};
  lesson={script:new Lesson(),saved,run,returnTo:['duel','loading'].includes(returnTo)?'title':returnTo,coach:null};
  lesson.coach=new LessonCoach({setPreview,exit:()=>action('duel-options')});
  state={...saved,run};
  coinMilestones.delete(engine);coinProgress.delete(engine);duelAnimations.delete(engine);summonMusic.delete(engine);
  snapshot=startLessonDuel(engine);const cues=engine.visuals.splice(0);
  engine.signatureCards=new Set();lastLP=[...snapshot.lp];lastPhase=snapshot.phase;equipSelection=null;screen='duel';duelEnding=false;preview=LESSON_POOL[0];previewLocation=null;
  document.body.classList.add('lesson-predraw');render();
  await lesson?.coach.intro();if(!lesson)return;
  engine.visuals=cues;await playDuelCues();if(!lesson||screen!=='duel')return;
  renderDuel();await lesson.coach.tour();if(!lesson)return;
  scheduleAI();
 }catch(e){console.error(e);await leaveLesson();toast('Tutorial could not start: '+e.message)}finally{busy=false}
}
// The scripted opponent, the prompts the tutorial answers itself, and the guided step for everything else.
function scheduleLesson(){
 const m=engine?.pending;if(screen!=='duel'||!m||snapshot?.finished)return;
 const owner=engine,later=(response,delay)=>{aiTimer=setTimeout(()=>{if(lesson&&engine===owner&&engine.pending===m&&screen==='duel')respond(response)},delay)};
 if(m.player===1){lesson.coach.setStep(null);try{const response=lesson.script.cpu(engine),note=lesson.script.cpuNote(engine,response);if(note){lesson.coach.card(note).then(()=>later(response,150))}else later(response,m.type===M.SELECT_CHAIN?50:700)}catch(e){toast('Opponent paused: '+e.message)}return}
 const step=lesson.script.next(engine);
 if(step?.auto){later(step.response,50);return}
 lesson.coach.setStep(step);
}
async function lessonPhase(cue){
// The cues of a turn play after the duel has moved on, so the turn's owner comes from its own turn cue.
 const info=lesson.script.phase(cue.phase,lesson.turnPlayer??0);
 await lesson.coach.phase(info);
 document.body.classList.remove('lesson-predraw');
}
async function finishLesson(winner){
 duelEnding=true;clearTimeout(aiTimer);lesson.coach.setStep(null);
 renderDuel();await finishDuelAnimations(engine);if(!lesson)return;
 if(winner===0){lesson.won=true;duelSound('specialsummon',.6);await duelDelay(300)}else await duelFinish(winner);
 if(!lesson)return;track(winner===0?'victory':'defeat');
 const [title,text]=FINISH[winner===0?'win':'loss'];
 dialog(title,`<div class="lesson-done"><p>${esc(text)}</p>${btn('Start a run','lesson-run','','primary')}${btn('Back to the menu','lesson-leave')}</div>`,false);
}
// Puts the real state back. Nothing from the tutorial was saved, so there is nothing to undo.
async function leaveLesson(next=null){
 const l=lesson;if(!l)return;lesson=null;clearTimeout(aiTimer);l.coach?.destroy();document.body.classList.remove('lesson-predraw');
 document.querySelectorAll('.float-lp,.moving-card,.attack-beam,.duel-cue,.coin-toss,.dice-toss,.action-pop').forEach(el=>el.remove());
 state=l.saved;if(l.won)void command('sleeve-mark','tutorial');try{engine?.destroy()}catch{}snapshot=null;duelEnding=false;busy=false;preview=0;previewLocation=null;
 clearInterval(backgroundAnimationTimer);backgroundAnimationTimer=null;
 go(next||(l.returnTo==='characters'?'title':l.returnTo)||'title');
}

async function startDuel(resume=false,opponent=null){busy=true;app.innerHTML=`<section class="loading"><img class="loading-wizard" src="assets/time-wizard.png" alt="Time Wizard"><h1>ENTERING THE DUEL</h1><p>Loading the offline EDOPro core…</p><p class="loading-tip">${esc(loadingTip())}</p></section>`;try{

 if(!resume){await command('choose',opponent);await command('begin');warmOpponents([state.run.opponent]);warmDeckArt([...(state.run.mobile_duel?.enemy||[]),...(state.run.mobile_duel?.enemyExtra||[])].slice(0,80));await playEncounterReveal({content,run:state.run,collectors:state.run.fallen_routes,players:[state.run.character],opponents:[state.run.opponent],lp:[state.run.mobile_duel.lp,state.run.mobile_duel.enemyLP],sound:duelSound,tickSound:slotTickSound,stopTick:()=>slotTick.pause(),active:()=>screen==='routes'||screen==='ending'})}

 if(!engine)engine=await new MobileDuel([...content.cards,...content.tokenCards]).init();else engine.destroy();prepareEngine(engine);const d=state.run.mobile_duel;if(!d)throw Error('No resumable mobile duel.');

 coinMilestones.delete(engine);coinProgress.delete(engine);duelAnimations.delete(engine);if(!resume)summonMusic.delete(engine);snapshot=engine.start(d.deck,d.enemy,d.lp,d.enemyLP,d.draw,d.seed,d.extra,d.enemyExtra,d.passives,d.enemyDraw??5);if(engine.replayRecord)engine.replayRecord.meta={started_at:state.run.started_at,character:state.run.character,loop:(state.run.loop||0)+1,duel:(state.run.round||0)+1,opponent:state.run.duel?.opponent??state.run.opponent};

 if(resume)for(const r of d.responses)snapshot=engine.respond(decode(r));

 engine.signatureCards=duelSignatureMonsters();lastLP=[...snapshot.lp];lastPhase=snapshot.phase;equipSelection=null;screen='duel';duelEnding=false;preview=state.run.pool[0];if(!resume)toast(state.run.first_player===1?'Coin toss: tails - opponent starts.':'Coin toss: heads - you start.');if(resume)engine.visuals=[];render();if(resume)await updateCoinMilestones(true);if(snapshot.finished){await completeDuel(snapshot.finished.player);return}await playDuelCues();scheduleAI();

 }catch(e){
  // Discord 2026-11-12 (boblogin80, iPhone): "Duel could not start: undefined" kept coming back. The thrown value was not
  // an Error, so show what it was, and once the duel exists on the backend, try again on a fresh engine before giving up.
  const message=e?.message||String(e??'unknown error');
  if(!startDuelRetrying&&state.run?.mobile_duel){startDuelRetrying=true;try{engine?.destroy?.()}catch{}engine=null;busy=false;try{return await startDuel(true)}finally{startDuelRetrying=false}}
  console.error('Duel could not start',e);toast('Duel could not start: '+message);screen='routes';render()}finally{busy=false}}
let startDuelRetrying=false;

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

// "Why can't I?" (2026-11-14): a Spell/Trap in hand or Set with no Activate gets a greyed Activate that explains why
// (activation-reasons.js; it replaces the Trapbound Idol cost note from flag f237e2b0). Read-only, computed on open.
function activationReason(player,loc,seq,code){
 if(player!==0||!engine||!snapshot||engine.finished)return '';
 const c=card(code),f=loc===L.SZONE?snapshot.players[0]?.spells?.[seq]:null,me=snapshot.players[0]||{};
 const setTurnException=!!(f?.status&0x10)&&[...(me.spells||[]),...(me.monsters||[])].some(x=>x&&x.position&5&&SET_TURN_TEXT.test(card(x.code)?.desc||''));
 return activationBlock({setTurnException,type:c?.data?.type??engine.cards?.get?.(code)?.data?.type,desc:c?.desc,loc,seq,faceDown:!!f&&!(f.position&5),status:f?.status,pending:engine.pending,turnPlayer:engine.player,phase:engine.phase,lp:snapshot.lp?.[0]??engine.lp?.[0],spells:snapshot.players[0]?.spells,modifiers:engine.aiModifiers,relicName:k=>content.artifacts?.[k]?.[0],curseName:k=>content.curses?.[k]?.[0],M,L});
}
function greyedActivate(pop,reason,el){const b=document.createElement('button');b.textContent='Activate';b.className='greyed';b.setAttribute('aria-disabled','true');
 // Never responds to the engine: the tap only shows the reason under the button.
 b.onclick=e=>{e.stopPropagation();let n=pop.querySelector('.action-note');if(!n){n=document.createElement('p');n.className='action-note';n.setAttribute('aria-live','polite');b.after(n)}n.textContent=reason;if(el.isConnected)pop.style.top=Math.max(4,pageRect(el).top-pop.offsetHeight-8)+'px'};
 return b}
function showCardActions(el,player,loc,seq,code){setPreview(code,el);removeActions();const choices=busy?[]:legalCardActions(player,loc,seq,code);
 // Spells and Traps list Activate first, like Summon for monsters (Kuroda, Discord 2026-11-09).
 if(!(Number(card(code)?.data?.type??engine?.cards?.get?.(code)?.data?.type)&1))choices.sort((a,b)=>(b.response.action===I.SELECT_ACTIVATE)-(a.response.action===I.SELECT_ACTIVATE));const pop=document.createElement('div');pop.className='action-pop';

 for(const a of choices){const b=document.createElement('button');b.textContent=a.label.split(' · ')[0];b.dataset.act=a.response.type+':'+a.response.action;b.onclick=e=>{e.stopPropagation();removeActions();stageChoice(a.response,a.label,code,{controller:player,location:loc,sequence:seq})};pop.append(b)}

 const reason=busy||state.settings.explainActions===false?'':activationReason(player,loc,seq,code);if(reason)pop.prepend(greyedActivate(pop,reason,el));
 const b=document.createElement('button');b.textContent='Inspect';b.onclick=()=>inspect(code);pop.append(b);document.body.append(pop);const r=pageRect(el),h=pop.offsetHeight;pop.style.left=Math.max(3,Math.min(pageWidth()-pop.offsetWidth-3,r.left+r.width/2-pop.offsetWidth/2))+'px';pop.style.top=Math.max(4,r.top-h-8)+'px';lesson?.coach.sync();

}

function selectionEntries(m=engine?.pending){if(!m||m.player!==0)return [];if([M.SELECT_CARD,M.SELECT_TRIBUTE,M.SELECT_SUM].includes(m.type))return m.selects.map((c,i)=>({c,i}));if(m.type===M.SELECT_UNSELECT_CARD)return [...m.select_cards,...m.unselect_cards].map((c,i)=>({c,i}));return []}

function fieldEntry(c){return [L.MZONE,L.SZONE].includes(c.location)}

// Your own hand is picked in place too (user, 2026-11-15): a Ritual tribute window hid the field monsters you could pick.
function handEntry(c){return c.location===L.HAND&&c.controller===0}
function boardEntry(c){return fieldEntry(c)||handEntry(c)}

function placeBadge(c){const place=cardPlace(c,L);return place?`<small class="card-place ${place.own?'':'enemy'}">${place.text}</small>`:''}

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

// Card sleeves (sleeves.js, 2026-11-12): your face-down cards and piles show your sleeve. In a Tag duel a teammate's
// cards show theirs: the partner who put the card on the field, else (piles, flights) the partner whose turn it is.
// The opponent's cards, CPU or human, always show the normal back.
function backFor(player,location,sequence){
 // Online opponents show theirs (user, 2026-11-12): Draft Duels and Ultimate Collector from the room, a Tag PvP rival
 // from their hello. The CPU always keeps the normal back.
 if(player!==0){const tag=snapshot?.tag,other=tag?.pvp&&tagUI?(tagUI.isCollector?tagUI.opponentSleeve?.():tagUI.session?.partnerSleeve):null;return other==null?CARD_BACK:sleeveImage(content,other)}
 const own=chosenSleeveImage(content,state.settings,state.profile),tag=snapshot?.tag;
 if(!tag||tag.pvp||!tagUI)return own;
 const seat=(location!=null?tag.fieldSeats?.[location+':'+sequence]:undefined)??tag.activeSeats?.[0]??tag.localSeat;
 if(seat===tag.localSeat)return own;
 const partner=tagUI.session?.partnerSleeve;return partner==null?CARD_BACK:sleeveImage(content,partner);
}
// A face-down card keeps its owner's sleeve when the other player takes control of it, as it would in real life
// (user, 2026-11-12). The Tag seat lookup only applies on the owner's own side.
function fieldBack(c,player,loc,seq){const owner=c?.owner===0||c?.owner===1?c.owner:player;return owner===player?backFor(player,loc,seq):backFor(owner)}
function zone(c,player,loc,seq,col,row,label=''){const m=engine.pending,isPlace=m?.player===0&&[M.SELECT_PLACE,M.SELECT_DISFIELD].includes(m.type)&&!autoPlaces(m);const option=isPlace?engine.choices(m).find(a=>a.response.places?.[0]?.player===player&&a.response.places[0].location===loc&&a.response.places[0].sequence===seq):null;

 const target=selectionEntries(m).find(x=>x.c.controller===player&&x.c.location===loc&&x.c.sequence===seq);

 const known=c&&(player===0||!!(c.position&5)||!!engine.knownFieldCard?.(0,{...c,controller:player,location:loc,sequence:seq})),hidden=c&&!(c.position&5),mon=loc===L.MZONE;const attack=c&&legalCardActions(player,loc,seq,c.code).some(a=>a.response.type===R.SELECT_BATTLECMD&&a.response.action===B.SELECT_BATTLE);

 const locked=!c&&!option&&((snapshot?.players?.[player]?.locked||0)>>(loc===L.MZONE?seq:8+seq))&1;
 return `<button class="zone ${player?'enemy':''} ${!c?'empty':''}${locked?' locked-zone':''} ${loc===L.SZONE&&seq===5?'field-spell-zone':''} ${mon&&c&&(c.position&12)?'defense':''} ${option||target?'selectable':''}${attack?' can-attack':''} ${target&&pickSet.has(target.i)?'target-picked':''}" style="grid-column:${col};grid-row:${row}" data-zone="${player},${loc},${seq}"${locked?' title="Locked zone"':''} ${target?`data-field-target="${target.i}"`:''} ${known?`data-code="${c.code}" data-preview="${c.code}"`:''}${known&&!hidden?` data-frame="${cardFrame(c.code)}"`:''}>${c?`<img src="${hidden?fieldBack(c,player,loc,seq):image(c.code)}" alt="${known?esc(card(c.code)?.name):'Face-down card'}">`:loc===L.SZONE&&seq===5?'<span class="field-spell-icon" aria-hidden="true"></span>':esc(label||'')}${known&&mon&&!hidden?`<span class="power"><b data-stat="attack" data-value="${c.attack}" class="${c.attack>(card(c.code)?.atk??c.attack)?'stat-up':c.attack<(card(c.code)?.atk??c.attack)?'stat-down':''}">${c.attack}</b> / <b data-stat="defense" data-value="${c.defense}">${c.defense}</b></span>`:''}${known&&!hidden?cardCountersMarkup(c):''}${known&&mon?levelChangeMarkup(c):''}${attack?'<span class="sword" role="img" aria-label="Can attack" title="Can attack"></span>':''}</button>`;

}

// Contact Fusions such as XY-Dragon Cannon are Special Summoned straight from the Extra Deck, with no Spell to prompt them.
// The Extra Deck, or the Deck when a card Special Summons itself from there (Metalzoa, Red-Eyes Black Metal Dragon).
function pileSummons(player,kind){const m=engine.pending,loc={extra:L.EXTRA,deck:L.DECK}[kind];return player===0&&loc!==undefined&&m?.player===0&&m.type===M.SELECT_IDLECMD?(m.special_summons||[]).filter(c=>c.location===loc):[]}
// The Graveyard glows too when a card in it can act now, such as Last Will's later Special Summon (flag 9cd89f0b).
function graveActionReady(player){const m=engine.pending;return player===0&&m?.player===0&&m.type===M.SELECT_IDLECMD&&[...(m.activates||[]),...(m.special_summons||[])].some(c=>c.location===L.GRAVE)}
function extraSummonReady(player,kind){return pileSummons(player,kind).length>0||kind==='grave'&&graveActionReady(player)}
function pile(player,kind,col,row){const p=snapshot.players[player],items=p[kind],count=Array.isArray(items)?items.length:items;const name={deck:'Deck',extra:'Extra',grave:'Graveyard',banished:'Banished'}[kind];const top=Array.isArray(items)?items.filter(Boolean).at(-1):null;const shown=kind==='deck'?p.deckTop:top&&(kind==='grave'||top.position&5)?top.code:null;const visible=!!shown;const img=count?(visible?image(shown):backFor(player)):null;return `<button class="zone pile${kind==='deck'&&count>10?' stacked':''}${extraSummonReady(player,kind)?' summon-ready':''}" style="grid-column:${col};grid-row:${row}" data-pile="${player},${kind}" ${visible?`data-preview="${shown}"`:''}>${img?`<img src="${img}">`:''}<span class="count">${count||0}</span><span class="zone-name">${name}</span></button>`}

const phases=[[1,'DP'],[2,'SP'],[4,'MP1'],[8,'BP'],[256,'MP2'],[512,'EP']];

function phaseName(phase){return phase>=8&&phase<256?'BATTLE PHASE':({1:'DRAW PHASE',2:'STANDBY PHASE',4:'MAIN PHASE 1',256:'MAIN PHASE 2',512:'END PHASE'})[phase]||'DUEL'}

let battleBlockedUntil=0,battleUnlockTimer,chainBuzzed=null;
// Drag a monster with the sword onto a target to attack (attack-drag.js, user 2026-11-21). The drop replays the same
// taps: Attack, then the "Attack directly?" answer, then the target, so the tap flow is unchanged.
const attackDrag=installAttackDrag({M,L,root:()=>app,
 active:loose=>screen==='duel'&&!!engine&&!!snapshot&&(loose||!busy&&!modal.open&&!cpuViewer&&!lesson&&!inspectionPaused()&&engine.pending?.player===0&&engine.pending.type===M.SELECT_BATTLECMD),
 pending:()=>engine?.pending,hint:()=>engine?.selectionHint,attacker:()=>engine?.attacker,busy:()=>busy,
 attackFor:seq=>{const c=snapshot?.players?.[0]?.monsters?.[seq];if(!c)return null;const choice=legalCardActions(0,L.MZONE,seq,c.code).find(a=>a.response.type===R.SELECT_BATTLECMD&&a.response.action===B.SELECT_BATTLE);return choice?{choice,canDirect:!!engine.pending.attacks?.[choice.response.index]?.can_direct}:null},
 declare:(choice,seq)=>{removeActions();const c=snapshot.players[0].monsters[seq];stageChoice(choice.response,choice.label,c?.code||0,{controller:0,location:L.MZONE,sequence:seq})},
 answerYesNo:yes=>{const i=engine.choices().findIndex(a=>a.response.yes===yes);if(i>=0)action('response',{dataset:{response:String(i)}})},
 chooseTarget:i=>chooseTarget(i),onStart:()=>removeActions()});
// Drag a hand card onto your field to play it (hand-drag.js, user 2026-11-22). It replays the taps: one legal action plays,
// several open the action buttons where it was dropped, and the dropped zone answers the zone prompt that follows.
const handDrag=installHandDrag({M,L,I,root:()=>app,
 // Any hand card can be dragged to fidget (user, 2026-11-23) whenever a duel is on screen with no window over it.
 idle:()=>screen==='duel'&&!!snapshot&&!modal.open,
 // Hand order (dragging a card along the hand) lasts one duel.
 owner:()=>engine,
 cardInfo:code=>{const d=card(code)?.data||engine?.cards?.get?.(code)?.data||{};return {type:Number(d.type)||0,level:Number(d.level)&0xff}},
 active:()=>screen==='duel'&&!!engine&&!!snapshot&&!busy&&!modal.open&&!cpuViewer&&!lesson&&!inspectionPaused()&&engine.pending?.player===0&&engine.pending.type===M.SELECT_IDLECMD,
 pending:()=>engine?.pending,choices:m=>engine.choices(m),
 actionsFor:(seq,code)=>legalCardActions(0,L.HAND,seq,code),
 play:(choice,seq,code)=>{removeActions();stageChoice(choice.response,choice.label,code,{controller:0,location:L.HAND,sequence:seq})},
 showActions:(el,seq,code,x,y)=>{showCardActions(el,0,L.HAND,seq,code);const pop=document.querySelector('.action-pop');if(pop){x=unzoom(x);y=unzoom(y);pop.style.left=Math.max(3,Math.min(pageWidth()-pop.offsetWidth-3,x-pop.offsetWidth/2))+'px';pop.style.top=Math.max(4,Math.min(pageHeight()-pop.offsetHeight-4,y-pop.offsetHeight-12))+'px'}return pop},
 onStart:()=>removeActions()});

function guardBattleAfterCancel(){battleBlockedUntil=performance.now()+500;clearTimeout(battleUnlockTimer);document.querySelectorAll('[data-phase="8"]').forEach(b=>b.disabled=true);battleUnlockTimer=setTimeout(()=>{if(screen==='duel')document.querySelectorAll('[data-phase="8"]').forEach(b=>b.disabled=!phaseAction(8))},510)}

document.addEventListener('click',e=>{if(screen==='duel'&&e.target.closest('.duel-cancel,.reaction-decline'))guardBattleAfterCancel()},true);

function phaseAction(phase){if(phase===8&&performance.now()<battleBlockedUntil)return null;const m=engine.pending;if(m?.player!==0)return null;return engine.choices().find(a=>!a.code&&((phase===8&&a.response.type===R.SELECT_IDLECMD&&a.response.action===I.TO_BP)||(phase===256&&a.response.type===R.SELECT_BATTLECMD&&a.response.action===B.TO_M2)||(phase===512&&((a.response.type===R.SELECT_IDLECMD&&a.response.action===I.TO_EP)||(a.response.type===R.SELECT_BATTLECMD&&a.response.action===B.TO_EP)))))}

function normalTributeSelection(m){return !!m&&m.player===0&&m.type===M.SELECT_TRIBUTE&&!!engine.materialSubject&&m.selects.length>0&&m.selects.every(c=>c.location===L.MZONE);}

function attackTargetSelection(m){return !!m&&m.player===0&&m.type===M.SELECT_CARD&&engine.selectionHint===549&&engine.attacker?.player===m.player&&m.selects?.length>0&&m.selects.every(c=>c.controller!==m.player&&c.location===L.MZONE);}

function fieldSelectBare(m){return !!m&&m.player===0&&selectionEntries(m).some(x=>fieldEntry(x.c));}

function fieldSelectionControls(m){if(m?.type===M.SELECT_UNSELECT_CARD)return `${m.can_finish?duelConfirm('Finish selection','unselect-done'):''}${m.can_cancel?duelCancel('Cancel','cancel-target'):''}`;const status=materialStatus(m,pickSet,engine,M);return `${duelConfirm('Confirm selection','confirm-target',status.valid?'':'disabled')}${m.can_cancel?duelCancel('Cancel','cancel-target'):''}`}

function renderDuel(){if(!snapshot)return;attackDrag.afterRender();handDrag.afterRender();const enemyBack=backFor(1),inspectionScroll=document.querySelector('.duel>.inspection')?.scrollTop||0;const previousCounters=new Map([...document.querySelectorAll('.zone .card-counter')].map(el=>[el.closest('.zone').dataset.zone+':'+el.dataset.counterKind,Number(el.dataset.count)]));const s=snapshot,r=state.run,m=engine.pending;defaultTributeSelection(m);const displayTurn=Math.max(0,s.turn-(r.first_player===1?1:0));const handCount=s.players[0].hand.filter(Boolean).length;const handCardWidth=Math.min(100/7,100/(handCount-.3*(handCount-1)));const handOverlap=Math.max(0,(handCount*handCardWidth-100)/Math.max(1,handCount-1));const handStyle=handCount>7?' style="--hand-card-width:'+handCardWidth.toFixed(4)+'%;--hand-overlap:'+handOverlap.toFixed(4)+'%"':'';const [own,opponent]=s.tag?activeTagCharacters(content,tagUI.view,s.tag):[character(),angryGrandpa(r)||content.characters[r.opponent]];const rows=[];
 // The backdrop belongs to the first opponent shown, and stays for the whole duel even as Tag seats alternate.
 if(duelSceneOwner!==engine||duelSceneNumber!==engine.presentationDuel){duelSceneOwner=engine;duelSceneNumber=engine.presentationDuel;duelScene=opponentScene(opponent?.name);document.dispatchEvent(new Event('duel-background-change'))}


 rows.push(collectorResponseOverlay(s,!!tagUI?.isCollector));

 // Opponent sits across the table: their main deck is on our left, zones reverse.

 rows.push(pile(1,'deck',2,1),pile(1,'extra',8,1),pile(1,'grave',2,2),pile(1,'banished',1,2),zone(s.players[1].spells[5],1,L.SZONE,5,8,2,'Field'));

 for(let i=0;i<5;i++){rows.push(zone(s.players[1].spells[i],1,L.SZONE,i,7-i,1),zone(s.players[1].monsters[i],1,L.MZONE,i,7-i,2));rows.push(zone(s.players[0].monsters[i],0,L.MZONE,i,i+3,4),zone(s.players[0].spells[i],0,L.SZONE,i,i+3,5))}

 rows.push(zone(s.players[0].spells[5],0,L.SZONE,5,2,4,'Field'),pile(0,'extra',2,5),pile(0,'grave',8,4),pile(0,'banished',9,4),pile(0,'deck',8,5));

 rows.push(`<button id="chain-toggle" data-do="toggle-chain" class="chain-control ${(!heldAlwaysChain&&(rightClickNoChain||chainMode==='never'))?'chain-disabled':!heldAlwaysChain&&!rightClickNoChain&&chainMode==='sometimes'?'chain-sometimes':''}" aria-label="Chain prompts" aria-pressed="${heldAlwaysChain?'true':rightClickNoChain?'false':chainMode==='sometimes'?'mixed':chainMode==='always'}" title="${chainLabel()}" style="grid-column:9;grid-row:5"><img src="textures/chain.png" alt=""><span>${chainLabel()}</span></button>`);

 rows.push(`<div class="phases">${phases.map(([n,label])=>`<button data-phase="${n}" class="${(n===8?s.phase>=8&&s.phase<256:s.phase===n)?'active':''}" ${phaseAction(n)?'':'disabled'}>${label}</button>`).join('')}${selectionEntries(m).length&&!attackTargetSelection(m)&&selectionEntries(m).every(x=>boardEntry(x.c))?fieldSelectionControls(m):''}</div>`);

renderDuelDOM(app,`<div class="duel"><aside class="inspection">${previewMarkup()}</aside><div class="portrait-relics">${duelCurseMarkup()}${relicIndicatorMarkup()}</div><section class="duel-main"><div class="duel-particles" aria-hidden="true">${Array.from({length:14},(_,i)=>`<i style="--x:${(i*37+7)%100}%;--y:${(i*19+3)%100}%;--delay:-${(i*1.7).toFixed(2)}s;--duration:${10+i%6}s;--mote-steps:${2*(10+i%6)}"></i>`).join('')}</div><div class="lpbar"><div class="life"><strong>${lpText(s.lp[0])}</strong><span>${esc(own.name)}</span></div><div class="turn">TURN<b>${displayTurn}</b>${finalCountdownChips()}</div><div class="life enemy"><span>${r.encore_active&&!angryGrandpa(r)?'World Champion':esc(opponent.name)}</span><strong>${lpText(s.lp[1])}</strong></div></div><div class="field-wrap"><div class="enemy-hand">${s.players[1].hand.map(c=>engine.handRevealed?.(0,c)?`<button data-inspect="${c.code}" aria-label="Inspect revealed card"><img src="${image(c.code)}" alt="${esc(engine.name(c.code))}"></button>`:`<img src="${enemyBack}" alt="Hidden card">`).join('')}</div><img class="field-character" src="assets/${opponent.sprite}">${r.fallen_routes?.[r.opponent]?'<span class="uc-opponent-tag uc-field-tag" title="Ultimate Collector opponent">UC</span>':''}<img class="field-character own" data-do="duel-emotes" role="button" tabindex="0" aria-label="Send an emote" src="assets/${own.sprite}"><div class="mat">${rows.join('')}</div></div>${promptMarkup(m)}<div class="hand"${handStyle}>${s.players[0].hand.map((c,i)=>{if(!c)return '';const target=selectionEntries(m).find(x=>handEntry(x.c)&&x.c.sequence===i);return `<button data-hand="${i}" ${target?`data-field-target="${target.i}" class="selectable${pickSet.has(target.i)?' target-picked':''}"`:''} data-code="${c.code}" data-preview="${c.code}" data-frame="${cardFrame(c.code)}"><img src="${image(c.code)}" alt="${esc(card(c.code)?.name)}">${levelChangeMarkup(c)}${engine.misprintedHands?.[0]?.has(i)?`<span class="hand-misprint" aria-label="Misprinted card">Misprint · ${c.attack} / ${c.defense}</span>`:''}</button>`}).join('')}</div><div class="duel-tools duel-tools-left">${relicIndicatorMarkup()}</div><div class="duel-tools duel-tools-right">${tagUI?`<span class="duel-room-code" aria-label="Room code">${esc(tagUI.session?.code||'')}</span>`:''}${btn('Options','duel-options')}</div></section></div>`);

 if(m?.type===M.SELECT_CHAIN&&m.player===0&&m!==chainBuzzed&&offerChain(m)){chainBuzzed=m;juice.buzz(25)}

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

 lesson?.coach.sync();

}

// Your hand size limit, as the Duel sets it (relic_hand_limit and hand_limiter in approved_relic_effects.py): Starving
// Library 3, each Deep Pockets +3, Divine Archive +2, Mass Grave and Empty-Hand Pact -2, Crowded Crypt -4, then each
// Hand Limiter curse -2 (-3 from LVL 2); none on turn 1 when the opponent goes first. Tag duels keep the rule's 6.
// Relic Seal turns the relics off for the Duel, so their limits too (flag 466202c7, 2026-11-08).
function handSizeLimit(s){
 const r=state.run;if(snapshot?.tag||!r)return 6;
 if(r.first_player===1&&s.turn===1)return 99;
 const sealed=r.challenge_level===-1||!!r.curses?.includes('relic_seal');
 const copies=key=>sealed?0:(r.artifacts||[]).filter(x=>x===key).length+(r.mirror_copy===key?1:0);
 const relics=Math.max(0,(copies('cursed_starving_library')?3:6)+3*copies('deep_pockets')+2*copies('endless_archive')-2*copies('mass_grave')-2*copies('cursed_empty_hand_pact')-4*copies('cursed_crowded_crypt'));
 const limiters=(r.curses||[]).filter(x=>x==='hand_limiter').length;
 return limiters?Math.max(0,relics-(r.challenge_level>=2?3:2)*limiters):relics;
}

const lpPulseAnimations=new WeakMap();
function pulseDuelLP(player,owner){if(compatibilityEnabled()||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const life=document.querySelector(player===1?'.lpbar .life.enemy strong':'.lpbar .life:not(.enemy) strong');if(!life)return;lpPulseAnimations.get(life)?.cancel();const animation=life.animate([{transform:'scale(1) rotate(0deg)'},{transform:'scale(1.22) rotate(-4deg) translateX(-1px)',offset:.38},{transform:'scale(.96) rotate(3deg) translateX(1px)',offset:.72},{transform:'scale(1) rotate(0deg)'}],{duration:300,easing:'cubic-bezier(.2,.8,.25,1)'});lpPulseAnimations.set(life,animation);trackDuelAnimation(owner,animationSettled(animation).then(()=>{animation.cancel();if(lpPulseAnimations.get(life)===animation)lpPulseAnimations.delete(life)}));}
async function playFusionSummonAnimation(cue,field,owner){
  const materials=(cue.materials?.length?cue.materials:(cue.materialCards||[]).map(c=>c.code)).filter(code=>Number(code)>0&&(Number(owner.data?.[Number(code)]?.type)&1)).slice(0,5),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const box=pageRect(field);
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
function shakeBoard(options){return [document.querySelector('.duel'),document.querySelector('.floating-chain-control')].filter(Boolean).map(el=>shake(el,options)).filter(Boolean)}

// Background effects still finish before the victory settlement reads the board.
function trackMotion(owner,...effects){
 const list=effects.flat().filter(Boolean);
 if(list.length)trackDuelAnimation(owner,Promise.all(list.map(x=>x?.finished?animationSettled(x):Promise.resolve(x).catch(()=>{}))).then(()=>{}));
}

async function playDuelCues(playerAction=false,answered=false){
 // Summon Cut-ins off (Settings → Effects, itch.io request; user 2026-11-22): no Fusion Summon or signature cut-in, and the
 // legendary summon below is skipped, so those monsters land with the normal summon effect.
 const presentationOwner=engine,cues=compactLifeBursts(engine.visuals.splice(0)).filter(c=>effectOn('cutins')||(c.kind!=='fusion-summon'&&c.kind!=='signature-summon')),fusionCue=cues.find(c=>c.kind==='fusion-summon'),legendaryShown=new Set(),quick=playerAction&&!!state.settings?.fasterAnimations;
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
// The full-screen summon of a legendary monster (legendary-summon.js), when Summon Cut-ins are on. True when it played.
function legendaryCutIn(code,field,owner,reduced){
 if(!effectOn('cutins'))return Promise.resolve(false);
 return playLegendarySummon(code,{field,image,sound:duelSound,voice:juice.summonVoice,music:summonTrack,paused:inspectionPaused,active:()=>engine===owner&&screen==='duel'&&!(document.hidden&&!tagUI&&state.settings.pauseWhenHidden===false),reduced});
}
async function playDuelCue(cue,{field,playerAction,quick=false,owner,legendaryShown,next=[],merged=new Set()}){
 const motion=motionPreferences(),reduced=motion.reduced;
 // Any other board action takes the centre stage back from the chain panel.
 if(chainPanel&&!['chain','effect-action','flip-reveal','flip-hide','relic','relic-ask'].includes(cue.kind)&&!cue.excavation)retireChainPanel();
 // A Fusion Summon's own summon cue is skipped for this cut-in, so a legendary Fusion Monster (Blue-Eyes Ultimate
 // Dragon, every Fusion with 3000+ ATK: user, 2026-11-23) gets its legendary summon right after it.
 if(cue.kind==='fusion-summon'){duelSfx.cue(cue);await playFusionSummonAnimation(cue,field,owner);if(!legendaryShown.has(cue.code)&&await legendaryCutIn(cue.code,field,owner,reduced))legendaryShown.add(cue.code);return true}
 if(cue.kind==='flip-reveal'){
  const c=cue.card,z=cueZone(c),live=c&&engine.query(c.controller,c.location)?.[c.sequence],code=Number(cue.code)||Number(live?.code)||Number(z?.dataset.code)||0,img=z?.querySelector('img');
  if(z&&img&&code){z.classList.remove('empty');z.dataset.code=String(code);z.dataset.preview=String(code);img.alt=card(code)?.name||'Revealed card';const src=image(code);if(img.getAttribute('src')!==src){duelSfx.cue(cue);trackMotion(owner,flipCard(img,src,{reduced}))}}
  return true;
 }
 // The flip-reveal swapped the zone's own image, so turning face-down again must swap it back.
 if(cue.kind==='flip-hide'){
  const img=cueZone(cue.card)?.querySelector('img'),back=backFor(cue.card?.controller,cue.card?.location,cue.card?.sequence);
  if(img&&(img.dataset.flipTo||img.getAttribute('src'))!==back){duelSfx.cue(cue);trackMotion(owner,flipCard(img,back,{reduced}))}
  return true;
 }
 if(cue.kind==='lethal-hit'){
  // One impact: the damage that follows lands now, with a single heavy shake and its number.
  const hit=next.find(c=>c.kind==='lp'&&c.player===cue.player&&c.amount<0)||next.find(c=>c.kind==='lp'&&c.player===cue.player);if(hit)merged.add(hit);
  const life=document.querySelector(cue.player===1?'.life.enemy .life-value, .life.enemy strong':'.life .life-value, .life strong');
  if(hit)playLifeCue(hit,{field,owner,motion,lethal:true});else duelSfx.cue(cue);
  if(life&&!reduced){
   if(!hit){if(!compatibilityEnabled())trackMotion(owner,shakeBoard({strength:6,duration:380}));trackMotion(owner,lifeImpact(life.closest('.life'),field,{player:cue.player,heavy:true,...motion}))}
   const animation=life.animate([{filter:'brightness(1)',textShadow:'0 0 0 transparent',transform:'scale(1)'},{filter:'brightness(1.8)',textShadow:'0 0 18px #ff583f',transform:'scale(1.13)'},{filter:'brightness(1)',textShadow:'0 0 0 transparent',transform:'scale(1)'}],{duration:520,easing:'ease-out'});await animationSettled(animation);animation.cancel();
  }
  return true;
 }
 if(cue.kind==='signature-summon'){
  if(!legendaryShown.has(cue.code)&&!reduced){const z=cueZone(cue.card);if(z){duelSfx.cue(cue);trackMotion(owner,summonImpact(z,{method:'special',color:'#75e7ff',animateCard:false,...motion}));const animation=z.animate([{boxShadow:'0 0 0 transparent',filter:'brightness(1)'},{boxShadow:'0 0 24px 5px #75e7ff',filter:'brightness(1.35)'},{boxShadow:'0 0 0 transparent',filter:'brightness(1)'}],{duration:620,easing:'ease-out'});await animationSettled(animation);animation.cancel()}}
  return true;
 }
 if(cue.kind==='summon'&&await legendaryCutIn(cue.code,field,owner,reduced)){legendaryShown.add(cue.code);return true}
 if(cue.kind==='relic'){if(onceRelic(cue.relic)&&!relicUsed(cue.relic)){markRelicUsed(cue.relic);const info=content.artifactInfo?.[cue.relic];if(info&&!relicUsedSet().has('ask:'+cue.relic))await relicAskArt(field,{src:relicImage(info.art),name:content.artifacts?.[cue.relic]?.[0]||'',reduced})}pulseRelic(app,cue.relic);return true}
 if(cue.kind==='relic-ask'){relicUsedSet().add('ask:'+cue.relic);const info=content.artifactInfo?.[cue.relic];if(info)await relicAskArt(field,{src:relicImage(info.art),name:content.artifacts?.[cue.relic]?.[0]||'',reduced});return true}
 if(cue.kind==='chain')return playChainCue(cue,{field,owner,motion});
 if(cue.kind==='effect-action'||cue.excavation){
  duelSfx.cue(cue);
  if(cue.negated)for(const c of cue.cards||[])trackDuelAnimation(owner,negateCard(cueZone(c),reduced));
  if(cue.text==='Deck shuffled'&&cue.player!=null)trackMotion(owner,shufflePile(document.querySelector(`[data-pile="${cue.player},deck"]`),{reduced}));
  const feedback=playEffectFeedback(cue,{field,image,esc,reduced,fast:cue.player===1});if(cue.statChange)trackDuelAnimation(owner,feedback);else await feedback;
  return true;
 }
 // The hand pick already shows the revealed cards; when it lists only some (Amazoness Chain Master picks monsters), show the whole hand first (Discord 2026-11-10).
 if(cue.kind==='reveal'&&!cue.public&&engine.pending?.type===M.SELECT_CARD&&engine.pending.selects?.some(c=>c.controller!==0&&c.location===L.HAND)&&revealInPick(cue.cards,engine.pending.selects))return true;
 if(cue.kind==='reveal'){duelSfx.cue(cue);dialog(cue.text,`<div class="cardgrid">${cue.cards.map(c=>cardButton(c.code,`data-inspect="${c.code}"`)).join('')}</div>`);await new Promise(resolve=>modal.addEventListener('close',resolve,{once:true}));return true}
 if(cue.kind==='dice'||cue.kind==='coin'){
  // Nothing competes with a toss: the prompt that called it, other prompts, banners and the
  // chain panel stay hidden until it lands (mobile.css: body.toss-animating).
  retireChainPanel();document.body.classList.add('toss-animating');
  // A relic's own toss (Jester's Coin) plays at once; only solo card tosses wait for your tap,
  // because in Tag a tap nobody knows they owe leaves one player's screen stuck.
  try{if(cue.player===0&&!cue.relic&&!tagUI&&!await waitForTossStart(field,cue.wheel?'wheel':cue.kind,()=>screen==='duel'&&engine===owner))return false;const options={wait:duelDelay,active:()=>screen==='duel'&&engine===owner,sound:duelSound};await(cue.wheel?playWheelSpin(field,cue.results,options):play3DToss(field,cue.kind,cue.results,options))}
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
 if(tier>=3&&!perfect&&!compatibilityEnabled()&&!motion.reduced&&!motion.lite){const impacts=shakeBoard({strength:[5,8,11][tier-3],duration:wallMs([300,380,480][tier-3])});trackDuelAnimation(owner,Promise.all(impacts.map(a=>animationSettled(a))).then(()=>impacts.forEach(a=>a.cancel())))}
 if(damage&&!cue.cost)juice.hit(cue.player,damage,cue.before);else if(cue.amount>0)juice.heal(cue.player,cue.amount);
 const r=pageRect(field),nearby=document.querySelectorAll('.float-lp'+(cue.player?'.enemy':':not(.enemy)')).length,lane=nearby%3,delay=lane*100+Math.random()*70;
 Object.assign(el.style,{position:'fixed',left:r.left+r.width*(.40+lane*.10+(Math.random()-.5)*.025)+'px',top:r.top+r.height*(cue.player?.23:.68)+(Math.random()-.5)*18+'px',zIndex:250,animationDelay:delay+'ms',animationFillMode:'both'});
 document.body.append(el);trackDuelAnimation(owner,duelDelay(1800+delay).then(()=>el.remove()));
}

// Board cues: turns, phases, summons, sets, attacks, draws and moves.
async function playBoardCue(cue,{field,playerAction,quick,owner,motion}){
 const reduced=motion.reduced,pace=cueWindow(cue,quick),removal=cue.kind==='move'?removalKind(cue.reason):null,cueAnimations=[];
 let label=['set','summon','attack','move','draw'].includes(cue.kind)?'':cue.text||'',beam,moving,caption,attackNodes=[];
 duelSfx.cue(cue,removal);
 if(lesson&&cue.kind==='turn')lesson.turnPlayer=cue.player;
 if(cue.kind==='turn')label=snapshot.tag?`${snapshot.tag.names[cue.player][snapshot.tag.activeSeats[cue.player]]}’S TURN`:cue.player===0?'YOUR TURN':'OPPONENT’S TURN';
 if(cue.kind==='phase'){label=phaseName(cue.phase);trackMotion(owner,phaseGlint(document.querySelector(`.phases [data-phase="${cue.phase>=8&&cue.phase<256?8:cue.phase}"]`),{reduced}));if(lesson)await lessonPhase(cue)}
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
  // A card dropped on the field by hand-drag.js lands where it was dropped: no flight from the hand (user, 2026-11-23).
  const landed=cue.kind==='move'?handDrag.landing(cue):null,source=landed?.el||cueAnchor(cue.from),target=cueAnchor(cue.to),duration=cue.kind==='draw'?35:quick?100:260;let hold=0;
  if(landed?.same){showMovedCard(cue);landed.done()}
  // The move caption stays where it was readable (CPU moves) and fades instead of popping;
  // shorter windows only ever flashed it.
  const shown=Math.max(pace,duration*(globalThis.presentationScale||1));
  if(shown>=200){const destinations={[L.HAND]:'hand',[L.DECK]:'Deck',[L.GRAVE]:'Graveyard',[L.REMOVED]:'banished cards',[L.EXTRA]:'Extra Deck',[L.MZONE]:'monster zone',[L.SZONE]:'Spell/Trap zone'};caption=document.createElement('div');caption.className='duel-cue';caption.textContent=cue.kind==='draw'?'Draw card':removal==='destroy'?'Destroyed':removal==='tribute'?'Tributed':`Card moved to ${destinations[cue.to?.location]||'another zone'}`;field.append(caption);fadeOutWithin(caption,shown,80)}
  if(removal&&source){const fx=playRemovalFeedback(removal,source,motion);trackMotion(owner,fx.animations);if(fx.hide){cueAnimations.push(fx.hide);hold=removal==='destroy'?.32:.22}}
  if(source&&target&&!landed?.same){
   // A card that lands face-down flies face-down; one landing in Defense Position flies sideways.
   const faceDown=[L.MZONE,L.SZONE].includes(cue.to?.location)&&!(cue.to.position&5),sideways=cue.to?.location===L.MZONE&&!!(cue.to.position&12);
   const flight=cardFlight(source,target,{src:cue.code&&!faceDown?image(cue.code):backFor(cue.to?.controller??cue.from?.controller,cue.to?.location,cue.to?.sequence),duration,hold,turn:sideways?90:0,endScale:sideways?.85:1,reduced,simple:motion.compat});
   moving=flight.el;cueAnimations.push(flight.animation);landed?.done();
   if([L.DECK,L.GRAVE,L.REMOVED,L.EXTRA].includes(cue.to?.location))flight.animation.finished.then(()=>trackMotion(owner,landingPulse(target,{reduced})),()=>{});
  }
 }
 if(cue.kind==='attack'){
  const source=cueZone(cue.card),target=(cue.target?.location===L.MZONE?cueZone(cue.target):null)||document.querySelector(cue.card.controller===0?'.enemy-hand':'.hand');
  if(source&&target){
   attackNodes=[[source,'attack-source'],[target,'attack-target']];for(const [node,cls] of attackNodes)node.classList.add(cls);
   const a=pageRect(source),b=pageRect(target),x=a.x+a.width/2,y=a.y+a.height/2,dx=b.x+b.width/2-x,dy=b.y+b.height/2-y,strike=Math.min(650,pace);
   // The streak now spans the attack window instead of being cut at its brightest.
   beam=document.createElement('div');beam.className='attack-beam';Object.assign(beam.style,{left:x+'px',top:y+'px',width:Math.hypot(dx,dy)+'px',transform:`rotate(${Math.atan2(dy,dx)}rad)`,animationDuration:strike+'ms'});document.body.append(beam);
   cueAnimations.push(source.animate(compatibilityEnabled()?[{boxShadow:'0 0 0 transparent'},{boxShadow:'0 0 26px #ffd06b'},{boxShadow:'0 0 0 transparent'}]:[{filter:'brightness(1)'},{filter:'brightness(2.5)'},{filter:'brightness(1)'}],strike),target.animate([{boxShadow:'0 0 0 transparent'},{boxShadow:'0 0 35px #ff593b'},{boxShadow:'0 0 0 transparent'}],Math.min(750,pace)));
   trackMotion(owner,attackStrike(source,target,{duration:strike,...motion}));
  }
 }
 // Let the compositor finish before removing flights or advancing to the next action.
 await Promise.all([duelDelay(pace),...cueAnimations.map(animation=>animationSettled(animation))]);for(const animation of cueAnimations)animation.cancel();
 const clear=()=>{for(const [node,cls] of attackNodes)node.classList.remove(cls);beam?.remove();moving?.remove();caption?.remove()};
 if(engine!==owner||screen!=='duel'){clear();return false}
 if(cue.kind==='move'&&[L.MZONE,L.SZONE].includes(cue.from?.location)){const source=cueZone(cue.from);source?.querySelector('img')?.remove();source?.classList.add('empty')}
 if(cue.kind==='move'&&[L.MZONE,L.SZONE].includes(cue.to?.location))showMovedCard(cue);
 clear();return true;
}
// Draws a moved card on its new field zone until the next render redraws the board.
function showMovedCard(cue){const z=cueZone(cue.to);if(z){const old=z.querySelector('img');old?.remove();const img=document.createElement('img');img.src=(cue.to.position&5)&&cue.code?image(cue.code):backFor(cue.to.controller,cue.to.location,cue.to.sequence);z.prepend(img);z.classList.remove('empty');z.classList.toggle('defense',cue.to.location===L.MZONE&&!!(cue.to.position&12))}}

// Deck cards you are asked to pick from have been shown to you (the opponent's Painful Choice: you choose which of the
// 5 cards they add); drawn as card backs, the pick was blind (flag 70cb6e66).
function targetKnown(c){return c.code&&(engine.handRevealed?.(0,c)||engine.knownFieldCard?.(0,c)||c.controller===0||c.location===L.GRAVE||c.location===L.DECK||((c.location!==L.HAND&&c.location!==L.DECK&&c.location!==L.EXTRA)&&!!(c.position&5)))}

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

 document.querySelectorAll('.reaction-available:not(.reaction-orb),.reaction-picked:not(.reaction-orb)').forEach(el=>{el.classList.remove('reaction-available','reaction-picked');delete el.dataset.reactions;delete el.dataset.reactionForced;el.removeAttribute('aria-pressed');const label=reactionLabels.get(el);if(label!=null)el.setAttribute('aria-label',label);else el.removeAttribute('aria-label');reactionLabels.delete(el)});

 const controls=document.querySelector('.field-reaction'),strip=document.querySelector('.phases'),field=controls?.offsetParent;

 if(controls&&strip&&field){const a=pageRect(strip),b=pageRect(field),zoneEl=document.querySelector('.mat [data-zone]'),zone=zoneEl&&pageRect(zoneEl);controls.style.left=(a.left+a.width/2-b.left)+'px';controls.style.top=(a.top+a.height/2-b.top)+'px';if(zone)controls.style.setProperty('--reaction-spacing',(zone.width+5)+'px');}

 const entries=reactionChoices();if(!entries.length)return;const mandatory=mandatoryChainResponse(engine.pending);

 const groups=new Map();for(const x of entries){const el=reactionAnchor(x.source);if(el){if(!groups.has(el))groups.set(el,[]);groups.get(el).push(x)}}

 for(const [el,list] of groups){reactionLabels.set(el,el.getAttribute('aria-label'));el.classList.add('reaction-available');el.classList.toggle('reaction-picked',list.some(reactionSelected));if(mandatory&&list.some(x=>x.choice.response?.index===mandatory.index))el.dataset.reactionForced='';el.dataset.reactions=list.map(x=>x.index).join(',');el.setAttribute('aria-label',list.length===1?list[0].choice.label:`Choose from ${list.length} available effects`);el.setAttribute('aria-pressed',String(list.some(reactionSelected)))}

 // Choices without a visible card or pile anchor use an orb.

 const other=entries.filter(x=>!reactionAnchor(x.source)),orb=document.querySelector('.reaction-orb');

 if(orb){orb.hidden=!other.length;orb.dataset.reactions=other.map(x=>x.index).join(',');orb.classList.toggle('reaction-picked',other.some(reactionSelected));orb.setAttribute('aria-pressed',String(other.some(reactionSelected)))}

}

// A forced window has no pass, so ✕ activates the effect that must activate (user, 2026-11-19); right-click and gamepad B press it too.
function reactionDecline(m){return engine.choices(m).find(x=>m.type===M.SELECT_CHAIN?x.response.index===null:x.response.yes===false)?.response||forcedCancelResponse(m)}

function reactionMarkup(m){

 if(reactionPrompt!==promptKey()){reactionPrompt=promptKey();reactionGroup=null}

 const entries=reactionChoices(m),chosen=entries.find(reactionSelected),chain=!!engine.chainDepth;

 const decline=reactionDecline(m);

 const choices=reactionGroup?entries.filter(x=>reactionGroup.includes(x.index)):[];

 const context=promptContext(engine,m);

 return `<div class="field-reaction" role="group" aria-label="${chain?'Chain':'Activate'} effect"><div class="reaction-context">${esc(context)}</div><div class="reaction-buttons">${btn('✓','choice-confirm',`aria-label="Confirm activation" title="Confirm" ${chosen?'':'disabled'}`,'reaction-confirm')}${btn('✕','reaction-decline',`aria-label="${chain?'Do not chain':'Do not activate'}" title="${chain?'Do not chain':'Do not activate'}" ${decline?'':'disabled'}`,'reaction-decline')}</div></div><button class="reaction-orb reaction-available" aria-label="Choose an effect from another location" title="Available effects from other locations" hidden>✦</button>${choices.length?`<div class="reaction-picker" role="group" aria-label="Choose effect">${choices.map(x=>btn(`<img src="${image(x.choice.code||x.source?.code)}" alt=""><span>${esc(x.choice.label)}</span>`,'reaction-pick',`data-reaction-index="${x.index}"`,reactionSelected(x)?'reaction-picked':'')).join('')}${btn('Close','reaction-close')}</div>`:''}`;

}



let promptHidden=false,sortOrder=[],sortPrompt=null,tributeDefaultPrompt=null,announcePrompt=null,announcePicks=new Set();

let hiddenPrompt=null;

// A card's own "select which…" hint (Riryoku: "Select the monster to halve its ATK") arrives as a separate hint
// message, not as the prompt's description; show it on card selections that have no description of their own.
function promptNotice(m){const own=engine.description(m.description);if(own)return own;const hint=Number(engine.selectionHint);return [M.SELECT_CARD,M.SELECT_UNSELECT_CARD,M.SELECT_TRIBUTE,M.SELECT_SUM].includes(m.type)&&Number.isFinite(hint)&&hint>0?engine.description(hint)||'':''}
// A zone choice with nothing picked yet only lit the free zones, so players thought the game froze (flag 3857f3c1,
// 2026-11-14). The core's message names no card, so the line names the kind of zone instead.
function placePromptMarkup(m){
 const kinds=new Set(engine.choices(m).map(a=>a.response.places?.[0]?.location)),count=m.count||1;
 const text=count>1?`Choose ${count} zones.`:m.type===M.SELECT_PLACE&&kinds.size===1&&kinds.has(L.MZONE)?'Choose a Monster Zone.':m.type===M.SELECT_PLACE&&kinds.size===1&&kinds.has(L.SZONE)?'Choose a Spell & Trap Zone.':'Choose a zone.';
 return `<div class="field-selection field-hint"><div class="field-selection-panel" role="status">${relicTag(m)}<strong>${esc(text)}</strong></div></div>`;
}
// The relic a prompt belongs to (duel.js trackPromptRelic): its icon and name sit on the prompt itself, so it never
// depends on the relic art cue that Reduce Motion, Performance or Compatibility can cut short (Discord, Deds, 2026-11-21).
function relicTag(m){
 const key=m?.relic,name=key&&content.artifacts?.[key]?.[0];if(!name)return '';
 const art=content.artifactInfo?.[key]?.art;
 return `<span class="prompt-relic" data-relic-prompt="${esc(key)}">${art?`<img src="${relicImage(art)}" alt="" decoding="async">`:''}<small>${key.startsWith('cursed_')?'Shadow relic effect':'Relic effect'}</small><b>${esc(name)}</b></span>`;
}
function promptMarkup(m){if(promptHidden&&hiddenPrompt!==m){promptHidden=false;hiddenPrompt=null}if(promptHidden)return `<div class="return-prompt">${btn('Return to selection','return-prompt')}</div>`;if(stagedChoice&&stagedChoice.key!==promptKey())stagedChoice=null;



 if(!m||m.player!==0||[M.SELECT_IDLECMD,M.SELECT_BATTLECMD].includes(m.type))return '';

 if(attackTargetSelection(m))return '';

 if([M.SELECT_PLACE,M.SELECT_DISFIELD].includes(m.type))return placeSet.length?`<div class="field-selection"><div class="selection-actions">${btn('Clear','clear-places')}${duelConfirm('Confirm placement','confirm-places',placeSet.length===(m.count||1)?'':'disabled')}</div></div>`:placePromptMarkup(m);

 if(m.type===M.SELECT_CHAIN&&!offerChain(m))return '';

 if([M.SELECT_CHAIN,M.SELECT_EFFECTYN].includes(m.type))return reactionMarkup(m);

 const entries=selectionEntries(m),onField=entries.filter(x=>fieldEntry(x.c));



 if(normalTributeSelection(m))return '';

 // On-field picks show the card's own hint when it has one, e.g. Riryoku's "Select the monster to halve its ATK".
 // Field and own-hand cards are picked where they are (user, 2026-11-15). A window opens only when some choices are
 // elsewhere (GY, Deck, banished, the opponent's hand), and then it lists every choice with a badge saying where it is.
 const onBoard=entries.filter(x=>boardEntry(x.c));
 if(onBoard.length){const offBoard=entries.filter(x=>!boardEntry(x.c)),hint=promptNotice(m),fromHand=onBoard.some(x=>handEntry(x.c)),label=hint||(m.type===M.SELECT_TRIBUTE?'Choose tributes':m.type===M.SELECT_SUM||m.type===M.SELECT_UNSELECT_CARD?'Choose materials':'Choose a highlighted card');
  if(!offBoard.length){const tag=relicTag(m);if(!fromHand)return hint||tag?`<div class="field-selection field-hint"><div class="field-selection-panel">${tag}${hint?`<strong>${esc(hint)}</strong>`:''}</div></div>`:'';const status=m.type===M.SELECT_UNSELECT_CARD?'':materialStatus(m,pickSet,engine,M).text;return `<div class="field-selection field-hint"><div class="field-selection-panel" role="status">${tag}<strong>${esc(label)}${pickSet.size?' · '+pickSet.size+' selected':''}</strong>${status?`<small class="selection-status">${esc(status)}</small>`:''}</div></div>`}
  return `<div class="field-selection"><div class="field-selection-panel">${relicTag(m)}<strong>${esc(label)}${pickSet.size?' · '+pickSet.size+' selected':''}</strong><div class="off-field-options">${entries.map(({c,i})=>targetKnown(c)?cardButton(c.code,`data-target="${i}"`,pickSet.has(i)).replace(/<img[^>]*>/,tag=>tag+placeBadge(c)):`<button class="cardbtn ${pickSet.has(i)?'selected':''}" data-target="${i}"><img src="assets/card-back.jpg">${placeBadge(c)}<span>Hidden card</span></button>`).join('')}</div></div><div class="selection-actions">${selectionControls(m)}</div></div>`}

 if([M.SELECT_YESNO,M.SELECT_EFFECTYN].includes(m.type)&&Number(m.description)===31)return `<section class="prompt"><h3>Attack directly?</h3><p>Attack your opponent's LP directly</p>${duelConfirm('Confirm direct attack','response','data-response="0"')}${duelCancel('No — choose monster','response','data-response="1"')}</section>`;

 const names={[M.SELECT_CARD]:'Choose card(s)',[M.SELECT_TRIBUTE]:'Choose tribute(s)',[M.SELECT_SUM]:'Choose materials',[M.SELECT_UNSELECT_CARD]:'Choose materials',[M.SELECT_CHAIN]:engine.chainDepth?'Chain a response?':'Activate a card?',[M.SELECT_EFFECTYN]:'Activate effect?',[M.SELECT_YESNO]:Number(m.description)===0x7f34a1?'Reroll?':'Confirm effect',[M.SELECT_POSITION]:'Choose position',[M.SELECT_OPTION]:'Choose effect'};

 const confirmation=[M.SELECT_YESNO,M.SELECT_EFFECTYN].includes(m.type);
 // Time Wizard's call shows the wheel's tower (heads) and skull (tails) on its two buttons.
 const wizardCall=m.type===M.SELECT_OPTION&&engine.name(engine.effect?.code)==='Time Wizard'&&isCoinCall(m.options.map(v=>engine.description(v)));

 let body='',controls='';

 if([M.SELECT_CARD,M.SELECT_TRIBUTE,M.SELECT_SUM].includes(m.type))body=`<p>${m.type===M.SELECT_SUM?`Choose materials from your hand or field. Required total: ${m.amount}${m.select_max?' or more':''}.`:`Choose ${m.min}–${m.max} cards.`}</p><div class="cardgrid">${m.selects.map((c,i)=>`<button class="cardbtn ${pickSet.has(i)?'selected':''}" data-target="${i}" ${targetKnown(c)?`data-preview="${c.code}"`:''}><img src="${targetKnown(c)?image(c.code):'assets/card-back.jpg'}">${placeBadge(c)}<span>${targetKnown(c)?esc(card(c.code)?.name||engine.name(c.code)):'Face-down card'}${m.type===M.SELECT_SUM?`<br>Value ${c.amount&65535}${c.amount>>>16?' / '+(c.amount>>>16):''}`:''}</span></button>`).join('')}</div>`;

 else if(m.type===M.SELECT_UNSELECT_CARD)body=`<div class="cardgrid">${selectionEntries(m).map(({c,i})=>`<button class="cardbtn" data-target="${i}"><img src="${targetKnown(c)?image(c.code):'assets/card-back.jpg'}">${placeBadge(c)}<span>${i<m.select_cards.length?'Select':'Remove'} · ${targetKnown(c)?esc(engine.name(c.code)):'Hidden card'}</span></button>`).join('')}</div>`;

 else if([M.SORT_CARD,M.SORT_CHAIN].includes(m.type)){if(sortPrompt!==m){sortPrompt=m;sortOrder=m.cards.map((_,i)=>i)}body=`<p>Top card first. Use the arrows to change the order, then press ✓.</p><div class="sort-cards">${sortOrder.map((i,pos)=>`<div><button data-inspect="${m.cards[i].code}"><img src="${image(m.cards[i].code)}" alt="${esc(engine.name(m.cards[i].code))}"></button><span>${pos+1}. ${esc(engine.name(m.cards[i].code))}</span>${btn('↑','sort-up',`data-index="${pos}" ${pos?'':'disabled'} aria-label="Move up"`)}${btn('↓','sort-down',`data-index="${pos}" ${pos<sortOrder.length-1?'':'disabled'} aria-label="Move down"`)}</div>`).join('')}</div>`;controls=duelConfirm('Confirm order','sort-confirm');}

 else if([M.ANNOUNCE_RACE,M.ANNOUNCE_ATTRIB,M.SELECT_COUNTER].includes(m.type)){body=`<p>${m.type===M.SELECT_COUNTER?'Select a legal response.':`Choose ${m.count} ${m.type===M.ANNOUNCE_RACE?'Type':'Attribute'}${m.count>1?'s':''}.`}</p>${advancedMarkup(m)}`;controls=m.type===M.SELECT_COUNTER?duelConfirm('Confirm counters','counters'):duelConfirm('Confirm announcement','announce');}

 else body=`${m.type===M.ANNOUNCE_CARD?'<input id="announce-search" placeholder="Search card name">':''}<div class="choices${wizardCall?' tw-calls':''}">${engine.choices(m).map((a,i)=>confirmation&&typeof a.response.yes==='boolean'?duelDecision(a.label,'response',`data-response="${i}"`,!a.response.yes):btn(wizardCall?coinCallLabel(engine.description(m.options[i])):(a.code&&!confirmation?`<img class="choice-art" src="${image(a.code)}" alt="" loading="lazy" decoding="async">`:'')+esc(a.label),'response',`data-response="${i}" aria-pressed="${!!(stagedChoice&&a.response.index===stagedChoice.response.index)}"`,stagedChoice&&a.response.index===stagedChoice.response.index?'selected':'')).join('')}</div>`;

 if([M.SELECT_CARD,M.SELECT_TRIBUTE,M.SELECT_SUM,M.SELECT_UNSELECT_CARD].includes(m.type))controls=selectionControls(m);

 if(m.type===M.SELECT_CHAIN||m.type===M.SELECT_OPTION&&m.options.length>1)controls=duelConfirm('Confirm effect','choice-confirm',stagedChoice?'':'disabled');

 const material=[M.SELECT_SUM,M.SELECT_UNSELECT_CARD,M.SELECT_TRIBUTE].includes(m.type);const subject=m.code||m.card?.code||(material?engine.materialSubject:0);

 const panel=`<section class="prompt">${btn('View field','view-field','','view-field-button')}${relicTag(m)}<h3>${wizardCall?'Call heads or tails':names[m.type]||'Resolve effect'}</h3>${[M.SELECT_CHAIN,M.SELECT_EFFECTYN].includes(m.type)?`<p class="prompt-context">${esc(promptContext(engine,m))}</p>`:''}${subject&&!confirmation?`<img class="prompt-card" src="${image(subject)}">`:''}<p class="notice">${esc(promptNotice(m))}</p>${body}</section>`;

 return controls?`<div class="selection-dialog">${panel}<div class="selection-actions">${controls}</div></div>`:panel;

}

// Unstable DNA opens on last Duel's Type and Attribute (itch.io, user 2026-11-22): one tap confirms. Per device, best effort.
const DNA_PICKS='ygo-unstable-dna',DNA_RELICS=['unstable_dna','genetic_override'];
function lastDnaPick(kind){try{return JSON.parse(localStorage.getItem(DNA_PICKS)||'{}')[kind]}catch{return null}}
function rememberDnaPick(kind,bit){try{const all=JSON.parse(localStorage.getItem(DNA_PICKS)||'{}');all[kind]=bit;localStorage.setItem(DNA_PICKS,JSON.stringify(all))}catch{}}
function advancedMarkup(m){if(m.type===M.SELECT_COUNTER)return `${m.cards.map((c,i)=>`<label>${esc(engine.name(c.code))}: <input data-counter="${i}" type="number" min="0" max="${c.count}" value="0"></label>`).join('')}`;const kind=m.type===M.ANNOUNCE_RACE?'race':'attribute';if(announcePrompt!==m){announcePrompt=m;announcePicks=new Set();const last=DNA_RELICS.includes(m.relic)&&m.count===1?lastDnaPick(kind):null;if(Number.isInteger(last)&&(BigInt(m.available)>>BigInt(last))&1n)announcePicks.add(last)}return iconChoiceGrid(iconChoices(kind,content.cards,m.available,m.count),kind,x=>`data-do="announce-pick" data-announce="${x.bit}" aria-pressed="${announcePicks.has(x.bit)}"`)}

let behaviourDraft=null,behaviourSending=false,behaviourSession=null;

async function openBehaviourReport(capture=null){

 const session=capture?null:tagUI?.session;

 const draft={session,capture:capture||(session?null:captureBehaviour(engine?.replayRecord,{mode:'solo',seat:0,turn:snapshot?.turn,phase:snapshot?.phase}))};

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

// Online answers apply at once, but an animation may still be running: the prompt must not wait on screen for it.
function clearAnsweredPrompt(){removeActions();for(const prompt of document.querySelectorAll('.duel-main .selection-dialog,.duel-main .field-selection,.duel-main .return-prompt,.duel-main .reaction-prompt,.duel-main .field-reaction,.duel-main .reaction-picker,.duel-main .reaction-orb,.duel-main>.prompt'))prompt.remove()}

async function respond(response){if(inspectionPaused())return;clearTimeout(manualChainTimer);manualChainTimer=0;manualChainPrompt=null;heldChainPrompt=null;stagedChoice=null;promptHidden=false;tributeDefaultPrompt=null;if(tagUI&&screen==='duel'){if(!tagUI.session?.duelReady)return toast('Reconnecting…');pickSet.clear();placeSet=[];clearAnsweredPrompt();try{const result=await tagUI.session.request('duel-response',{number:snapshot.tag.responseNumber,response});if(result?.stale&&screen==='duel')renderDuel()}catch(error){toast(error.message);if(screen==='duel')renderDuel()}return}if(busy||screen!=='duel')return;if(lesson&&!lesson.script.check(engine,response)){lesson.coach.nudge();renderDuel();return}busy=true;chainOverride=false;removeActions();pickSet.clear();placeSet=[];clearAnsweredPrompt();const playerAction=engine.pending?.player===0&&snapshot.player===0;try{const beforeSnapshot=snapshot,before={turn:snapshot.turn,phase:snapshot.phase};snapshot=engine.respond(response);const taught=lesson?.script.done();ensureFusionCue(engine,beforeSnapshot,snapshot);if(lesson){lesson.coach.setStep(null);if(taught?.after)lesson.coach.say(taught.after);await playDuelCues(playerAction,true);if(!lesson||screen!=='duel')return;if(snapshot.finished){await finishLesson(snapshot.finished.player);return}renderDuel();scheduleAI();return}await command('response',{response:encode(response),checkpoint:phaseCheckpoint(before,snapshot)});if(snapshot.finished){if(!isCardWin(snapshot.finished))await playDuelCues(playerAction,true);await completeDuel(snapshot.finished.player);return}await playDuelCues(playerAction,true);await waitForInspection();if(duelEnding||screen!=='duel')return;renderDuel();scheduleAI()}catch(e){toast('Selection could not resolve: '+e.message);renderDuel()}finally{busy=false}}

let chainMode='sometimes',chainOverride=false,rightClickNoChain=false,rightClickPointer=null,rightClickHoldTimer=0,heldAlwaysChain=false,heldChainPointer=null,heldChainTimer=0,heldChainPrompt=null,manualChainTimer=0,manualChainPrompt=null;

// A forced window can't be passed, so holding right-click (no chain) still shows it rather than answering it with a pass.
function offerChain(m){const holdOverride=heldAlwaysChain||m===heldChainPrompt;return !!m?.forced||(holdOverride||!rightClickNoChain)&&chainWindowAllowed(m,holdOverride?'always':chainMode,engine?.activeChain,{turnPlayer:engine?.player,phase:engine?.phase,attackers:m&&engine?.query?.(1-m.player,L.MZONE)?.filter(c=>c&&c.position&1).length,card:code=>card(code),script:code=>engine?.scripts?.[`c${code}.lua`]})}

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

function scheduleAI(){clearTimeout(aiTimer);if(duelEnding)return;if(lesson)return scheduleLesson();if(inspectionPaused())return;const pending=engine?.pending;const manualWindow=pending?.type===M.SELECT_CHAIN&&pending.player===0&&engine.player!==0&&!pending.forced&&relicTriggerIndex(pending)<0&&!offerChain(pending)&&pending.selects?.some(c=>(c.controller??c.player)===0&&[L.HAND,L.MZONE,L.SZONE,L.GRAVE,L.REMOVED].includes(c.location));if(manualWindow){if(manualChainPrompt!==pending){clearTimeout(manualChainTimer);manualChainPrompt=pending;manualChainTimer=setTimeout(()=>{if(engine?.pending===pending&&!heldChainPrompt){manualChainPrompt=null;manualChainTimer=0;respond({type:R.SELECT_CHAIN,index:null})}},Math.max(0,Math.min(2000,Number(state?.settings?.manualResponseWindow??200)||0)))}return;}clearTimeout(manualChainTimer);manualChainTimer=0;manualChainPrompt=null;const automatic=automaticChainResponse(engine?.pending,!offerChain(engine?.pending),M,R);if(screen==='duel'&&automatic&&(!tagUI||tagUI.session.duelReady)){const owner=engine,pending=engine.pending;aiTimer=setTimeout(()=>{if(engine===owner&&engine.pending===pending&&screen==='duel'){const current=automaticChainResponse(pending,!offerChain(pending),M,R);if(current)respond(current)}},50);return;}const placed=screen==='duel'&&(handDrag.placeFor(engine?.pending)||autoPlacement(engine?.pending)||autoSingle(engine?.pending));if(placed&&(!tagUI||tagUI.session.duelReady)){const owner=engine,pending=engine.pending;aiTimer=setTimeout(()=>{if(engine===owner&&engine.pending===pending&&screen==='duel')respond(placed)},50);return;}if(tagUI){if(screen==='duel'&&engine?.pending?.type===M.SELECT_CHAIN&&!offerChain(engine.pending)&&tagUI.session.duelReady)aiTimer=setTimeout(()=>{if(engine?.pending?.type===M.SELECT_CHAIN&&!offerChain(engine.pending))respond({type:R.SELECT_CHAIN,index:null})},50);return}if(screen!=='duel'||!engine?.pending)return;if(engine.pending.player===0&&engine.pending.type===M.SELECT_CHAIN&&!offerChain(engine.pending)){aiTimer=setTimeout(()=>{if(engine?.pending?.type===M.SELECT_CHAIN&&!offerChain(engine.pending))respond({type:R.SELECT_CHAIN,index:null})},50);return}if(engine.pending.player===1){const pending=engine.pending;markCpuDue(pending);aiTimer=setTimeout(()=>{try{const response=engine.auto();const pass=pending.type===M.SELECT_CHAIN&&response.index==null;if(pass)respond(response);else aiTimer=setTimeout(()=>{if(engine.pending===pending&&screen==='duel')respond(response)},(engine.inDamageStep?50:120)+cpuDelay())}catch(e){toast('Opponent paused: '+e.message)}},0)}}

// Stall watch (2026-11-03): in a solo duel, once the CPU has been handed a prompt (scheduleAI), it answers within a
// fraction of a second. If it still hasn't after 10 seconds of unpaused play, offer a behaviour flag with the replay,
// once per duel. Time only counts while the CPU is due: never while the player has the prompt, the duel is paused, a
// dialog or inspection is open, the app is hidden, or animations are still playing before the CPU's turn.
const STALL_AFTER=10000,stallOffered=new WeakMap();let cpuDue=null,stallTick=Date.now();
function markCpuDue(pending){if(cpuDue?.engine!==engine||cpuDue.pending!==pending)cpuDue={engine,pending,since:Date.now()}}
// A backgrounded app or throttled tab stops this timer without firing it while hidden, so the first tick after coming
// back saw minutes "without a move" (flag 297a54b0, 2026-11-18). A gap between ticks restarts the count.
document.addEventListener('visibilitychange',()=>{if(cpuDue)cpuDue.since=Date.now()});
setInterval(()=>{
 const due=cpuDue,now=Date.now(),gap=now-stallTick;stallTick=now;
 if(!due||screen!=='duel'||lesson||tagUI||cpuViewer||engine!==due.engine||engine.finished||duelEnding||engine.pending!==due.pending||engine.pending?.player!==1){cpuDue=null;return}
 if(document.hidden||modal.open||inspectionPaused()||gap>2500){due.since=now;return}
 if(now-due.since<STALL_AFTER||stallOffered.get(engine)===engine.presentationDuel)return;
 stallOffered.set(engine,engine.presentationDuel);stallNote=`Detected automatically: the CPU made no move for 10 seconds (turn ${snapshot?.turn??'?'}, prompt ${engine.pending?.type??'none'}).`;
 dialog('The duel seems stuck',`<p>The CPU hasn't moved for 10 seconds. You can flag it with the replay attached, so it can be fixed, or keep waiting.</p>${btn('Flag behaviour','stall-flag','','primary')}${btn('Keep waiting','close')}`);
},1000);
let stallNote='';

let duelEnding=false;

// Each ending (this win hold, the DEFEAT overlay, the card-win finale) runs 150 ms past its animation, so
// the last effects and sounds finish before the next screen.
async function completeDuel(winner){if(duelEnding)return;duelEnding=true;await waitForInspection();clearTimeout(aiTimer);if(winner===0)await updateCoinMilestones();await finishDuelAnimations(engine);if(isCardWin(snapshot.finished)){removeActions();if(modal.open)modal.close();engine.visuals=[];await playCardWin(snapshot.finished)}else if(winner===0){duelSound('specialsummon',.6);await duelDelay(1150)}renderDuel();await duelFinish(winner);const shopSecret=state.run.secret_challenge==='relicless';await command('finish',{winner,lp:snapshot.lp[0],reason:snapshot.finished?.reason??0,events:engine.summary()});if(winner!==0)track('defeat');engine.destroy();snapshot=null;clearInterval(backgroundAnimationTimer);backgroundAnimationTimer=null;if(state.run.secret_challenge){go('title');return}// Beating the shopkeeper's secret hands back the run from before it, relics included (user, 2026-11-23).
if(shopSecret){go('shop');toast('Angry Grandpa is beaten! Your run continues with your relics.');await notices();return}go(state.run.stage==='shop'?'shop':'ending');if(winner===0&&!modal.querySelector('.reward-screen,.reward-tally'))showVictoryReceipt();await notices()}

let rewardPresentation=null;
let rewardDeckReturn=false;

function showVictoryReceipt(){

 rewardMusic=true;track('packs');

 rewardPresentation?.destroy();rewardPresentation=null;

 dialog('',`<section class="reward-tally">${deckMinimumNotice(state.run)}<strong class="reward-tally-total">+${Number(state.run.last_gold||0).toLocaleString()} <img class="earned-coin" src="assets/ui/coins.png" alt="coins"></strong>${(state.run.personal_bests||[]).map(x=>`<p class="reward-best">${esc(x)}</p>`).join('')}<div class="reward-tally-lines">${victoryRewardsMarkup(state.run.last_rewards,content.battleBonusLabels,secretCoinLabels(),state.run.last_reward_notes)}</div><button class="primary" data-do="reward-slots">Continue</button></section>`,false);

 // The total counts up and the window celebrates by tier (juice.js), all inside the window.
 requestAnimationFrame(()=>juice.coinTally(modal.querySelector('.reward-tally'),Number(state.run.last_gold||0)));
 juice.rewardText(modal,state.run.last_rewards,weight=>playCoinPickup(.22+.16*weight));

}

// Both reward screens (deck choice and card slots) reroll through the same request.
const rerollReward=async i=>{if(tagUI)await tagUI.session.request('reward-reroll',i);else await command('reward-reroll',i)};
function showRewardSlots(){if(character().copycat&&state.run.reward_slots?.kind!=='deck'){void action('reward-accept');return;}rewardMusic=true;track('packs');const r=state.run;rewardPresentation?.destroy();if(r.reward_slots?.kind==='deck'){dialog('Victory deck choice',deckRewardMarkup(r,{esc}),false);rewardPresentation=mountDeckRewards(modal.querySelector('.reward-screen'),{getRun:()=>state.run,esc,volume:()=>state.settings.sound/100,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,reroll:rerollReward,view:d=>openDeckPreview(modal,d,{card,cardButton,esc,sound:playUISound,details:c=>`<div class="deck-inspect"><img src="${image(c.id)}"><div>${cardFacts(c)}<h4>Effect / card text</h4><p class="inspect-effect">${esc(displayCardText(c.desc))}</p></div></div>`})});return;}dialog('',rewardMarkup(r,{image,name:id=>card(id)?.name||'Card',esc}),false);rewardPresentation=mountRewardSlots(modal.querySelector('.reward-screen'),{getRun:()=>state.run,image,name:id=>card(id)?.name||'Card',volume:()=>state.settings.sound/100,card,reduced:spinOff()||matchMedia('(prefers-reduced-motion: reduce)').matches,reroll:async i=>{await rerollReward(i);playRerollSound()}});}

modal.addEventListener('close',()=>{if(!modal.open){if(rewardDeckReturn)return;rewardPresentation?.destroy();rewardPresentation=null;if(rewardMusic){rewardMusic=false;track(packPresentation?'packs':screenMusic())}}});



function confirmTargets(){const m=engine.pending,indices=[...pickSet];if(m.type===M.SELECT_UNSELECT_CARD)return respond({type:R.SELECT_UNSELECT_CARD,index:null});if(m.type===M.SELECT_SUM){if(!engine.sumValid(m,indices))return toast('Choose materials with a valid total.');return respond({type:R.SELECT_SUM,indicies:indices})}const n=indices.reduce((sum,i)=>sum+(m.type===M.SELECT_TRIBUTE?m.selects[i].release_param||1:1),0);if(n<m.min||indices.length>m.max)return toast('Choose the required number of cards.');respond({type:m.type===M.SELECT_TRIBUTE?R.SELECT_TRIBUTE:R.SELECT_CARD,indicies:indices})}

// Your own Deck opens the same small menu as a card: Inspect lists the cards left in it, in the deck editor's default
// order and never in Deck order (user request 2026-11-11). The opponent's Deck stays hidden.
function deckCodes(){const rows=engine?.tagFacade?snapshot?.players?.[0]?.deckCards:engine?.query(0,L.DECK);if(!rows)return null;return rows.map(c=>card(typeof c==='number'?c:c?.code)).filter(Boolean).sort(frameLevelName).map(c=>c.id)}
function showDeckList(){previewLocation=null;const codes=deckCodes();if(!codes)return toast('This pile is hidden.');dialog('Your deck',`<div class="cardgrid pile-inspection">${codes.map(code=>`<div>${cardButton(code,`data-inspect="${code}"`)}</div>`).join('')}</div>${codes.length?'':'<p>This pile is empty.</p>'}`)}
function showDeckActions(el){removeActions();const pop=document.createElement('div');pop.className='action-pop';
 const add=(label,run)=>{const b=document.createElement('button');b.textContent=label;b.onclick=e=>{e.stopPropagation();removeActions();run()};pop.append(b)};
 if(!busy&&pileSummons(0,'deck').length)add('Special Summon',()=>showPile(0,'deck'));
 add('Inspect',showDeckList);document.body.append(pop);const r=pageRect(el),h=pop.offsetHeight;pop.style.left=Math.max(3,Math.min(pageWidth()-pop.offsetWidth-3,r.left+r.width/2-pop.offsetWidth/2))+'px';pop.style.top=Math.max(4,r.top-h-8)+'px';
}
// The Graveyard takes two presses like the Deck (Discord 2026-11-23, CITYDRIVER: aiming for the Deck's Inspect button
// kept opening the Graveyard just below it): the first opens the same small menu.
function showGraveActions(el,player){removeActions();const pop=document.createElement('div');pop.className='action-pop';
 const b=document.createElement('button');b.textContent='Inspect';b.onclick=e=>{e.stopPropagation();removeActions();showPile(player,'grave')};pop.append(b);
 document.body.append(pop);const r=pageRect(el),h=pop.offsetHeight;pop.style.left=Math.max(3,Math.min(pageWidth()-pop.offsetWidth-3,r.left+r.width/2-pop.offsetWidth/2))+'px';pop.style.top=Math.max(4,r.top-h-8)+'px';
}
function showPile(player,kind){previewLocation=null;
 // The Deck stays hidden; it only lists the cards that can Special Summon themselves from it right now.
 if(kind==='deck'){const summons=busy?[]:pileSummons(player,'deck');if(!summons.length)return toast('This pile is hidden.');return dialog('Special Summon from your Deck',`<div class="cardgrid pile-inspection">${summons.map(c=>`<div>${cardButton(c.code,`data-inspect="${c.code}"`)}${legalCardActions(0,L.DECK,c.sequence,c.code).map(a=>`<button data-do="pile-action" data-address="0,${L.DECK},${c.sequence},${c.code}" data-action="${a.response.action}" data-index="${a.response.index}">${esc(a.label.split(' · ')[0])}</button>`).join('')}</div>`).join('')}</div>`)}
 if(kind==='extra'&&player===1)return toast('This pile is hidden.');let cards=kind==='extra'?engine.query(player,L.EXTRA):snapshot.players[player][kind];cards=cards.filter(Boolean);dialog((player?'Opponent’s ':'Your ')+({extra:'Extra Deck',grave:'Graveyard',banished:'Banished cards'}[kind]),`<div class="cardgrid pile-inspection">${cards.map(c=>(player===0||kind==='grave'||c.position&5)?`<div>${cardButton(c.code,`data-inspect="${c.code}" data-location="${player},${c.location??({extra:L.EXTRA,grave:L.GRAVE,banished:L.REMOVED}[kind])},${c.sequence}"`)}${!busy?legalCardActions(player,c.location??({extra:L.EXTRA,grave:L.GRAVE,banished:L.REMOVED}[kind]),c.sequence,c.code).map(a=>`<button data-do="pile-action" data-address="${player},${c.location??({extra:L.EXTRA,grave:L.GRAVE,banished:L.REMOVED}[kind])},${c.sequence},${c.code}" data-action="${a.response.action}" data-index="${a.response.index}">${esc(a.label.split(' · ')[0])}</button>`).join(''):''}</div>`:'<img src="assets/card-back.jpg" alt="Face-down banished card">').join('')}</div>${cards.length?'':'<p>This pile is empty.</p>'}`)}



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

 else if(el.dataset.pile){const [p,k]=el.dataset.pile.split(',');if(k==='deck'&&+p===0)showDeckActions(el);else if(k==='grave')showGraveActions(el,+p);else showPile(+p,k)}

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

 if(el.dataset.pick!==undefined){if(e.detail===0&&!e.pointerType&&!modal.open){flushDraftTap();await queueDeckTap(el)}return}

 if(el.dataset.draftTab!==undefined){draftTab=el.dataset.draftTab;renderDraft();return}

 if(el.dataset.reactions!==undefined){chooseReaction(el.dataset.reactions.split(',').filter(Boolean).map(Number));return}

 if(el.dataset.fieldTarget!==undefined&&el.dataset.hand!==undefined){chooseTarget(+el.dataset.fieldTarget);return}

 if(el.dataset.hand!==undefined){if(doubleTap('h'+el.dataset.hand,+el.dataset.code))return;if(tapActivateOpponentChain(0,L.HAND,+el.dataset.hand,+el.dataset.code))return;showCardActions(el,0,L.HAND,+el.dataset.hand,+el.dataset.code);return}

 if(el.dataset.fieldTarget!==undefined){chooseTarget(+el.dataset.fieldTarget);return}

 if(el.dataset.zone){const [p,loc,seq]=el.dataset.zone.split(',').map(Number),m=engine.pending;if(m?.player===0&&[M.SELECT_PLACE,M.SELECT_DISFIELD].includes(m.type)){const found=engine.choices(m).find(a=>a.response.places?.[0]?.player===p&&a.response.places[0].location===loc&&a.response.places[0].sequence===seq);if(found){const place=found.response.places[0];const at=placeSet.findIndex(x=>x.player===p&&x.location===loc&&x.sequence===seq);if(at>=0)placeSet.splice(at,1);else if(placeSet.length<(m.count||1))placeSet.push(place);else placeSet=[place];if(placeSet.length===(m.count||1))return respond({...found.response,places:[...placeSet]});renderDuel()}return}if(el.dataset.code){if(doubleTap('z'+el.dataset.zone,+el.dataset.code))return;if(tapActivateOpponentChain(p,loc,seq,+el.dataset.code))return;showCardActions(el,p,loc,seq,+el.dataset.code);}return}

 if(el.dataset.pile){const [p,k]=el.dataset.pile.split(',');if(k==='deck'&&+p===0)showDeckActions(el);else if(k==='grave')showGraveActions(el,+p);else showPile(+p,k);return}

 if(el.dataset.phase){const a=phaseAction(+el.dataset.phase);if(a)respond(a.response);return}

 if(el.dataset.target!==undefined){chooseTarget(+el.dataset.target);return}

 if(el.dataset.do)await action(el.dataset.do,el);

 }catch(err){toast(err.message);console.error(err)}

});

// Hidden coin feats (duel_rewards.SECRET): never listed until earned, then marked as found.
const secretCoinLabels=()=>(content.secretCoinRules||[]).map(r=>r.label);
function coinBonusMarkup(earned={}){

 const rules=content.battleCoinRules||[],pvp=!!snapshot?.tag?.pvp,won=snapshot?.finished?.player===0;

 const extra=Object.entries(earned).filter(([label])=>!rules.some(r=>r.label===label));

 const count=rules.filter(x=>Object.hasOwn(earned,x.label)).length,total=rules.reduce((n,x)=>n+(Object.hasOwn(earned,x.label)?x.coins:0),0)+extra.reduce((n,[,v])=>n+(+v||0),0);

 const row=(label,value,note)=>`<div class="coin-bonus-row ${value?'earned':''}" role="listitem"><span>${esc(label)}<small>${note}</small></span><b>${value>0?'+':''}${value}<img src="assets/ui/coins.png" alt="coins"></b></div>`;

 return `<div class="coin-bonus-summary"><b>${pvp?'No campaign coins in PvP':`${count} / ${rules.length} bonuses earned · ${total>=0?'+':''}${total} coins`}</b><p>${pvp?'These bonuses apply to campaign duels.':'Bonuses are paid if you win. Victory adds 30 coins; tiers stack, up to 400 total before relic modifiers. Early wins earn up to 205 extra coins. Turn penalties increase after turns 10, 20, 30 and onward. See the shop coin scorecard for amounts.'}</p></div><div class="coin-bonus-list" role="list" tabindex="0">${rules.map(x=>{const got=!pvp&&Object.hasOwn(earned,x.label);return row(x.label,got?x.coins:x.coins,x.label&&(got?'✓ Earned':x.victoryOnly&&!won?'Decided at victory':'Not yet earned'))}).join('')}${extra.map(([label,value])=>row(label,value,label.startsWith('Ancient Treasure')?'Earned by card effect':secretCoinLabels().includes(label)?'Hidden feat!':'Decided at victory')).join('')}</div>`;

}

function refreshCoinBonuses(earned){const panel=modal.querySelector('.coin-bonuses');if(modal.open&&panel){const list=panel.querySelector('.coin-bonus-list'),scroll=list?.scrollTop||0;panel.innerHTML=coinBonusMarkup(earned);panel.querySelector('.coin-bonus-list').scrollTop=scroll;}}

async function showCoinBonuses(){

 const owner=engine;if(!owner||!snapshot)return;let earned={};

 if(!snapshot.tag?.pvp){const run=state.run,events=owner.tagFacade?snapshot.tag.rewardEvents:owner.summary();if(py&&events)earned=await command('reward-progress',{run:{lp:snapshot.lp[0],round:run.round,character:run.character,guaranteed:run.guaranteed,artifacts:run.artifacts,encore_active:run.encore_active},events,victory:snapshot.finished?.player===0});}

 if(owner!==engine||screen!=='duel')return;

 dialog('Coin bonuses',`<section class="coin-bonuses">${coinBonusMarkup(earned)}</section>`);

}

// Pack favourites per character (magna98, user 2026-11-21): the shop (solo and Tag), pack details and card sources during a
// run star packs for the run's character; Collection shows every character's stars, and its star opens a character list.
const packName=id=>packInfo(id)?.name||id;
function favouriteCharacter(){const v=tagUI?.view?.run;if(tagUI)return Number.isInteger(v?.character)?v.character:null;return screen!=='collection'&&Number.isInteger(state?.run?.character)?state.run.character:null}
let favouritesMigrated=false;
function loadActiveFavourites(){
 if(!favouritesMigrated&&state?.settings&&content?.playable?.length){favouritesMigrated=true;if(migrateFavouritePacks(state.settings,content.playable))setTimeout(()=>{void command('settings',state.settings).catch(()=>{})})}
 const i=favouriteCharacter();loadFavouritePacks(i==null?allFavouritePacks(state?.settings):packsFor(state?.settings,i));
}
// Redraws one pack's stars in place (Collection and an open pack window keep their scroll position).
function refreshPackStars(id){
 for(const b of document.querySelectorAll(`[data-do="pack-favourite"][data-pack="${CSS.escape(id)}"]`)){
  if(b.classList.contains('pack-fav-toggle'))b.outerHTML=packFavouriteToggle(id);
  else{const cls=[...b.classList].filter(c=>!['pack-fav','fav-pop'].includes(c)).join(' ');b.closest('.collection-pack')?.classList.toggle('favourite-pack',isFavouritePack(id));b.outerHTML=packStar(id,packInfo(id)?.name,cls)}
 }
}
// Stars a pack everywhere it shows: shop shelves (solo and Tag), Collection › Packs and an open pack details window.
async function togglePackFavourite(id,anchor=null){
 if(!id||!content.packs.some(p=>p.id===id))return;
 const index=favouriteCharacter();if(index==null){openFavouritePicker(id,anchor);return}
 const on=!packsFor(state.settings,index).includes(id),name=packInfo(id).name;setPackFavourite(state.settings,index,id,on);loadActiveFavourites();
 playUISound(on?'shop-select':'window-close');toast(on?`★ ${name} added to favourites`:`${name} removed from favourites`);
 for(const b of modal.querySelectorAll('.pack-fav-toggle[data-do="pack-favourite"]'))b.outerHTML=packFavouriteToggle(b.dataset.pack);for(const b of modal.querySelectorAll('.source-pack .pack-fav[data-do="pack-favourite"]'))b.outerHTML=packStar(b.dataset.pack,packInfo(b.dataset.pack)?.name);
 if(tagUI)tagUI.render?.();else if(screen==='shop')renderShop();
 for(const b of document.querySelectorAll(`[data-do="pack-favourite"][data-pack="${CSS.escape(id)}"]`)){b.classList.remove('fav-pop');void b.offsetWidth;b.classList.add('fav-pop')}
 try{await command('settings',state.settings)}catch(error){toast(error.message)}
}
// The Collection's character list (user, 2026-11-21): tick the characters to star the pack for, or Select all. Inside a
// window it opens under the window's star row; on Collection tiles it drops down from the star.
let favPicker=null,favPickerSave=0;
function favouritePickerMarkup(id){
 const chars=content.playable||[],on=new Set(favouriteCharacters(state.settings,id,chars)),all=chars.length&&chars.every(i=>on.has(i));
 return `<div class="fav-picker" data-fav-pack="${esc(id)}" role="group" aria-label="Favourite for"><div class="fav-picker-head"><b>Favourite for</b><label class="fav-picker-all"><input type="checkbox" data-fav-all ${all?'checked':''}><span>Select all</span></label></div><div class="fav-picker-list">${chars.map(i=>{const c=content.characters[i];return `<label class="fav-picker-row"><input type="checkbox" data-fav-char="${i}" ${on.has(i)?'checked':''}><img loading="lazy" src="assets/${esc(c.sprite)}" alt=""><span>${esc(c.name)}</span></label>`}).join('')}</div><div class="fav-picker-foot"><button type="button" data-fav-done>Done</button></div></div>`;
}
function closeFavouritePicker(){if(!favPicker)return;const id=favPicker.dataset.favPack;favPicker.remove();favPicker=null;document.removeEventListener('pointerdown',favPickerOutside,true);if(screen==='collection'&&collectionKind==='packs'&&collectionFavouritePacks&&!modal.open)renderCollection();else refreshPackStars(id)}
function favPickerOutside(e){if(favPicker&&!favPicker.contains(e.target)&&!e.target.closest?.('[data-do="pack-favourite"]'))closeFavouritePicker()}
function openFavouritePicker(id,anchor){
 const same=favPicker?.dataset.favPack===id;closeFavouritePicker();if(same)return;
 const holder=document.createElement('div');holder.innerHTML=favouritePickerMarkup(id);favPicker=holder.firstElementChild;
 const inline=anchor?.closest('dialog')?(anchor.closest('.pack-fav-row')||anchor.closest('.source-packs')):null;
 if(inline){favPicker.classList.add('inline');inline.after(favPicker)}
 else{favPicker.classList.add('dropdown');document.body.append(favPicker);const vw=pageWidth(),vh=pageHeight(),r=anchor?.getBoundingClientRect?pageRect(anchor):{left:vw/2,right:vw/2,top:vh/3,bottom:vh/3},w=Math.min(260,vw-16),below=vh-r.bottom>=Math.min(320,vh*.5);
  favPicker.style.left=Math.max(8,Math.min(vw-w-8,r.right-w))+'px';favPicker.style.width=w+'px';
  if(below)favPicker.style.top=r.bottom+4+'px';else favPicker.style.bottom=vh-r.top+4+'px';favPicker.style.maxHeight=Math.min(360,Math.max(180,(below?vh-r.bottom:r.top)-16))+'px'}
 setTimeout(()=>document.addEventListener('pointerdown',favPickerOutside,true));
}
document.addEventListener('change',e=>{
 const box=e.target.closest?.('.fav-picker');if(!box)return;const id=box.dataset.favPack,chars=content.playable||[];
 if(e.target.matches('[data-fav-all]')){for(const i of chars)setPackFavourite(state.settings,i,id,e.target.checked);for(const c of box.querySelectorAll('[data-fav-char]'))c.checked=e.target.checked}
 else if(e.target.matches('[data-fav-char]')){setPackFavourite(state.settings,+e.target.dataset.favChar,id,e.target.checked);box.querySelector('[data-fav-all]').checked=chars.every(i=>packsFor(state.settings,i).includes(id))}
 else return;
 loadActiveFavourites();refreshPackStars(id);playUISound(e.target.checked?'shop-select':'window-close');
 clearTimeout(favPickerSave);favPickerSave=setTimeout(()=>{command('settings',state.settings).catch(error=>toast(error.message))},400);
});
document.addEventListener('click',e=>{if(e.target.closest?.('[data-fav-done]'))closeFavouritePicker()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&favPicker){e.preventDefault();e.stopPropagation();closeFavouritePicker()}},true);
async function action(a,el={dataset:{}},silent=false){
 // The header X on Settings is its Back button (user, 2026-11-24): opened from a run (or a Tag room) it returns there
 // instead of leaving to the main menu; opened from the main menu, Back goes to the main menu anyway.
 if(a==='title'&&screen==='settings')a='settings-back';
 if(a==='pack-favourite'){void togglePackFavourite(el.dataset.pack,el instanceof Element?el:null);return}
 if(a==='relic-banish-arm'){const i=+el.dataset.index;banishArmed=banishArmed===i?null:i;playUISound(banishArmed===null?'window-close':'shop-select');renderShop();return}
 if(a==='relic-banish'){if(busy)return;busy=true;const i=+el.dataset.index;banishArmed=null;try{await command('relic-banish',i);playUISound('window-close');renderShop();app.querySelector(`.product-art[data-shop-item="${i}"]`)?.closest('.shop-product')?.classList.add('relic-restocked')}finally{busy=false}return}
 if(a==='relic-lock'){if(busy)return;busy=true;try{await command('relic-lock',+el.dataset.index);renderShop();app.querySelector(`.relic-lock[data-index="${el.dataset.index}"]`)?.classList.add('fav-pop')}finally{busy=false}return}
 if(a==='collection-favourite-packs'){collectionFavouritePacks=!collectionFavouritePacks;collectionPage=0;renderCollection();return}
 // Before any await: browsers only allow an image clipboard write during the tap.
 if(a==='run-card-view'){const rows=state.history||state.profile.run_history||[];showRunCard(rows[+el.dataset.index]);return}if(a==='copy-run-card'||a==='save-run-card'){const root=viewedRun?modal:app,shown=viewedRun||state.run,status=root.querySelector('.run-card-status'),name=runCardName(shown,content);(a==='save-run-card'?saveRunCard:copyRunCard)(root.querySelector('.run-card-canvas'),name).then(m=>{if(status)status.textContent=m}).catch(e=>{if(status)status.textContent=e.message||'Could not copy the image.'});return}

 if(!silent&&['settings','duel-settings'].includes(a)){playUISound('inspect-open');silent=true;}else if(!silent&&['title','pause-title','pause'].includes(a)){menuSelectionSound();silent=true;}

 if(a==='log'){dialog('Duel log',duelLogMarkup(engine?.logs||[],content.cards,image));return}

 if(a==='log-action'){

  const ids=(el.dataset.cards||'').split(',').map(Number).filter(id=>card(id));previewLocation=null;

  if(ids.length===1){inspect(ids[0]);return}

  const previous=modal.open?{nodes:[...modal.childNodes],scroll:modal.scrollTop,focus:document.activeElement,parent:inspectParent}:null;

  dialog('Cards in this action',`<div class="log-cards"><p>${esc(el.querySelector('span')?.textContent||'')}</p><div class="cardgrid">${ids.map(id=>cardButton(id,`data-inspect="${id}"`)).join('')}</div></div>`);inspectParent=previous;return;

 }



 if(a==='reward-slots'){showRewardSlots();return;}

 if(a==='reward-accept'){if(modal.querySelector('[data-do="reward-accept"]')?.disabled)return;if(tagUI)await tagUI.session.request('reward-accept',rewardPresentation?.selected);else await command('reward-accept',rewardPresentation?.selected);rewardPresentation?.destroy();rewardPresentation=null;modal.close();render();await showFreePacks();return;}

 if(a==='reward-details'){const previous={nodes:[...modal.childNodes],scroll:modal.scrollTop,focus:document.activeElement,parent:inspectParent};dialog('Victory coin breakdown',victoryRewardsMarkup(state.run.last_rewards,content.battleBonusLabels,secretCoinLabels(),state.run.last_reward_notes));inspectParent=previous;return;}

 if(a==='reward-deck'){if(!modal.querySelector('.reward-screen')||!state.run?.reward_slots?.pending)return;rewardDeckReturn=true;modal.close();go('draft');return;}

 if(a==='reward-return'){if(!rewardDeckReturn)return;go(state.run.stage==='shop'?'shop':'ending');return;}

 if(a==='reward-overlay-close'){closeRewardOverlay();return;}

 if(a==='flag-behaviour')return openBehaviourReport();if(a==='stall-flag'){await openBehaviourReport();const box=document.querySelector('#behaviour-description');if(box&&!box.value)box.value=stallNote;return}

 if(a==='send-unsent-flags'){const status=document.querySelector('#behaviour-status');try{const result=behaviourSession?await behaviourSession.request('flag-retry'):await sendUnsentFlags();status.textContent=result.pending?`${result.sent} sent; ${result.pending} still saved for retry. ${result.error||''}`:`${result.sent} flag(s) sent. No unsent flags remain.`}catch(e){status.textContent=e.message}return;}

 if(a==='send-behaviour')return sendBehaviourReport();

 if(a==='duel-emotes'){if(screen!=='duel')return;if(tagUI){if(tagUI.session?.connected)openEmotePicker(emoji=>tagUI?.session.request('emote',emoji).catch(e=>toast(e.message)));}else openEmotePicker(emoji=>showDuelEmote(emoji,true));return;}

 if(a==='lesson-start'||a==='lesson-no'){if(a==='lesson-no')lessonAsked();closeDialog();await startLesson(a==='lesson-no'?'characters':screen);return}
 if(a==='lesson-yes'){lessonAsked();closeDialog();go('characters');return}
 if(a==='lesson-leave'){closeDialog();await leaveLesson();return}
 if(a==='lesson-run'){closeDialog();await leaveLesson('characters');return}
 if(lesson&&a==='duel-options'){dialog('Tutorial',`<div class="duel-options-grid">${btn('Log','log')}${btn('Settings','duel-settings')}${btn('Leave the tutorial','lesson-leave')}</div>`);return}
 if(a==='characters'&&lessonShouldAsk()){dialog('Do you know how to play Yu-Gi-Oh?',`<p>If you are new to the card game, a short tutorial Duel teaches the phases, the kinds of cards and the basic plays.</p>${btn('Yes, start my run','lesson-yes','','primary')}${btn('No, teach me','lesson-no')}`);return}
 if(a==='duel-options'&&!tagUI)modal.dataset.duelOptionsPause='1';

 if(a==='duel-options'&&tagUI?.isCollector){dialog('Options',`<div class="duel-options-grid">${btn('Log','log')}${btn('Settings','duel-settings')}${btn('Exit','pause')}${btn('Surrender','surrender')}${tagUI.pauseButton?.()||''}</div>`);return}if(a==='duel-options'){dialog('Options',`<div class="duel-options-grid">${btn('Relics','relic-ledger')}${btn('Curses','active-curses')}${btn('Log','log')}${btn('Coin bonuses','coin-bonuses')}${btn('Flag behaviour','flag-behaviour')}${btn('Settings','duel-settings')}${btn(tagUI?'Exit':'Save / Menu','pause')}${btn('Surrender','surrender')}</div>`);return}

 if(a==='duel-settings'){dialog('Settings',duelSettingsMarkup());return}
 if(a==='random-character'){const pool=content.playable.filter(i=>state.profile.unlocked.includes(i)),others=pool.filter(i=>i!==selected),list=others.length?others:pool;if(!list.length)return;selected=list[Math.floor(Math.random()*list.length)];copycatTaps=0;effect();renderCharacters();app.querySelector(`.character-select-page .roster .portrait[data-character="${selected}"]`)?.scrollIntoView({block:'nearest'});return}
 if(a==='character-settings'){openCharacterSettings(selected);return}
 if(a==='char-marks-edit'){openMarksEditor(+el.dataset.charIndex);return}
 if(a==='char-marks-clear'){const i=+el.dataset.charIndex;clearSavedMarks(state.settings,i);refreshCharacterPanes(i);void saveCharacterSettings();return}
 if(a==='char-marks-page'){if(charEditor){charEditor.page+=+el.dataset.step;fillMarksEditor();modal.querySelector('.char-marks-body')?.scrollIntoView({block:'start'})}return}
 if(a==='char-marks-back'){const i=+el.dataset.charIndex,from=charEditor?.from;charEditor=null;if(from==='duel'){duelSettingsTab='character';dialog('Settings',duelSettingsMarkup())}else openCharacterSettings(i);return}
 if(a==='duel-settings-tab'){duelSettingsTab=el.dataset.tab;const box=el.closest('.duel-settings');box.querySelectorAll('[data-do="duel-settings-tab"]').forEach(b=>{const on=b===el;b.classList.toggle('active',on);b.setAttribute('aria-selected',on)});box.querySelectorAll('.duel-set-pane').forEach(p=>p.hidden=p.dataset.pane!==duelSettingsTab);return}

if(a==='defeated-collector-deck'){showDefeatedCollector(+el.dataset.index);return;}if(a==='collection-collector-back'){collectionKind='cards';renderCollection();return;}if(a==='collector-decklist'){const d=collectorLeaders[+el.dataset.index];if(d)dialog(d.name,Object.entries(d.deck).map(([zone,ids])=>`<h3>${esc(zone==='extra'?'Fusion':zone)}</h3><div class="cardgrid collector-decklist-grid">${ids.map(id=>`<button data-inspect="${id}"><img src="${image(id)}" alt="${esc(card(id)?.name)}"></button>`).join('')}</div>`).join(''));return;}if(a==='coin-bonuses'){await showCoinBonuses();return}if(a==='curse-info'){dialog(content.curses[el.dataset.curse]?.[0]||'Curse',curseInfoMarkup(content,el.dataset.curse,state.run?.challenge_level,+el.dataset.count||1));return}if(a==='cpu'){if(state.profile.cpu_viewer_unlocked)await openCPU();return}if(a==='tag'){await openTag();return}if(a==='draft-pvp'){await openCollector(true);return}if(a==='collector'){await openCollector();return}if(tagUI){if(a==='active-curses'){dialog(tagUI.isCollector?'Opponent relics':'Curses & LVL modifiers',modifierRowsMarkup(tagUI.view.modifiers));return}if(a==='pause'||a==='pause-title'||a==='title'){await tagUI.action('exit',{dataset:{}});return}if(a==='surrender'){dialog(tagUI.isCollector?'Surrender this duel?':'Surrender the team’s run?',tagUI.isCollector?`<p>This concedes the current duel. Your opponent gains one win in the best-of-three match.</p><div class="collector-surrender-actions">${duelConfirm('Confirm surrender','confirm-surrender')}${duelDecision('Cancel surrender','close','',true)}</div>`:duelConfirm('Confirm surrender','confirm-surrender'));return}if(a==='confirm-surrender'){modal.close();await tagUI.session.request('surrender');return}}if(busy&&!['close','toggle-chain','choose-monster-type','golden-card','relic-pick','relic-pick-reroll','weight-pick','card-pick-type','card-pick-select','card-pick-confirm','name-pick-select','name-pick-confirm','relic-ledger','relic-detail','active-curses','curse-info','surrender','confirm-surrender','resume-duel'].includes(a))return;if(!silent&&!['buy','close','select-purchase','shop-reroll','sell-relic'].includes(a)){if((screen==='shop'&&a==='draft')||(screen==='draft'&&a==='shop'))playUISound('window-close');else effect(['start','new','confirm-new'].includes(a));}

 if(a==='shop-tour'){startShopTour();return}if(a==='active-curses'){const rows=await command('active-curses');dialog('This duel: curses & difficulty',modifierRowsMarkup(rows));return}

 if(a==='sell-relic'){const fromShopRelics=screen==='shop'&&!!el.closest('.relic-ledger,.relic-card');if(!fromShopRelics)return;const result=await command('sell-relic',el.dataset.relic);shopSelection.clear();renderShop();dialog('Run relics',relicLedgerMarkup());toast(`Sold ${content.artifacts[result.relic]?.[0]||'relic'} for ${result.coins} coins.`);return}

 if(a==='shop-reroll'){busy=true;try{const previous=juice.shopArt(app);await command('shop-reroll');shopSelection.clear();renderShop();if(!juice.reroll(app,previous))playRerollSound();keeperTalk.say('reroll')}finally{busy=false}return}if(a==='shopkeeper-secret')return shopkeeperSecret();if(a==='copycat-secret'){return copycatSecret()}if(a==='gallery'){go('gallery');return}

 if(a==='choose-variant'){selectedVariants[selected]=+el.dataset.variant;renderCharacters();return}if(a==='levels'){levelMenu();return}if(a==='choose-level'){await command('remember-level',{character:selected,level:+el.dataset.level});selectedLevels[selected]=rememberedLevel(state.profile,selected);modal.close();renderCharacters();return}

 if(a==='tutorial-image'){dialog(el.dataset.label,`<img class="tutorial-enlarged" src="assets/${esc(el.dataset.src)}" alt="${esc(el.dataset.label)}">`);return}if(a==='tutorial'){tutorialReturn=screen;go('tutorial');return}if(a==='tutorial-page'){tutorialPage=+el.dataset.index;renderTutorial();return}if(a==='tutorial-back'){go(tutorialReturn);if(screen==='duel')scheduleAI();return}if(a==='toggle-chain'){heldChainPrompt=null;chainMode=({always:'never',never:'sometimes',sometimes:'always'})[chainMode];refreshChainToggle();if(!busy){renderDuel();scheduleAI()}return}if(a==='close'){closeDialog();return}if(a==='menu-prev'||a==='menu-next'){titleMotion?.step(a==='menu-next'?1:-1);return}

 if(a==='continue')return showRunSlots();

 // A shadow relic can complete a fusion set; play its reveal here, since the shop's own check skips while this action is busy (2026-11-05).
 if(a==='cursed-choose'){await command('cursed-choose',el.dataset.relic);go('shop');await showRelicFusions();return}

 if(a==='cursed-reroll'){await command('cursed-reroll');render();return}

 if(a==='cursed-skip'){await command('cursed-skip');go('shop');return}

 if(a==='load-slot'){await command('select-slot',Number(el.dataset.slot));modal.close();if(state.run.stage==='duel')return startDuel(true);go(['complete','gameover'].includes(state.run.stage)?'ending':state.run.stage);return}

 if(a==='launcher-later'){launcherNoticeClosed=true;app.querySelector('.launcher-notice')?.remove();return}
 if(a==='launcher-copy'){const box=app.querySelector('.launcher-notice'),status=box?.querySelector('.launcher-status'),link=box?.querySelector('.launcher-link');let copied=false;try{await navigator.clipboard.writeText(WINDOWS_SETUP_URL);copied=true}catch{}if(!copied&&link){link.focus();link.select()}if(status)status.textContent=copied?tr("Link copied. Paste it into your browser's address bar."):tr('Press Ctrl+C to copy the selected link.');return}
 if(a==='close-game'){closeGame();return}if(a==='patch-notes'){void openPatchNotes(dialog);return}if(a==='champion'){await command('champion');return startDuel(false,0)}if(a==='next-loop'){if(el.disabled)return;el.disabled=true;try{await command('next-loop')}finally{el.disabled=false;if(state.run?.stage==='shop')go('shop')}return}

 if(a==='watch-replay'){if(el.dataset.replay)await watchReplay(el.dataset.replay);return}if(a==='history-view'){historyView=el.dataset.view==='records'?'records':'runs';renderRunHistory();return}if(a==='collection-kind'){collectionKind=el.dataset.kind;collectionPage=0;renderCollection();return}if(a==='stats-kind'){statsKind=el.dataset.kind;cpuStatsOpponent=characterStatsCpu=null;renderStats();return}if(a==='collection-search'){collectionQuery=document.querySelector('#collection-search').value;collectionPage=0;renderCollection();return}if(a==='collection-prev'||a==='collection-next'){collectionPage+=a==='collection-next'?1:-1;renderCollection();return}if(a==='collection-item'){const id=el.dataset.id;if(id.startsWith('deck:')){const d=content.preconstructedDecks.find(x=>x.id===id.slice(5));dialog(d.name,`<p>${d.cards.length} cards · Released ${esc(d.date)}</p><div class="cardgrid">${d.cards.map(cid=>cardButton(cid,`data-inspect="${cid}"`)).join('')}</div>`)}else if(collectionKind==='packs'){inspectPack(id,collectionPackCards)}else dialog('',relicInfoMarkup(id));return}if(a==='stats-relic'){const id=el.dataset.relic;if(content.artifacts[id])dialog('',relicInfoMarkup(id));return}

 if(a==='new')return newRun();
 if(a==='difficulty'){newRunEasy=el.dataset.easy==='1';return showRunSlots(true)}
 if(a==='next-level-run'){selected=state.run.character;selectedLevels[selected]=+el.dataset.level;selectedVariants[selected]=state.run.variant||0;showRunSlots(true,`Start a new run on Level ${el.dataset.level}?`);return}

 if(a==='new-slot'){const slot=Number(el.dataset.slot);if(state.slots.find(s=>s.slot===slot)?.occupied){dialog('Replace saved run?',`<p>Replace the run in slot ${slot}? Your other slots will be kept.</p>${btn('Replace this run','confirm-new',`data-slot="${slot}"`,'primary')}`);return}return beginNew(slot)}

 if(a==='confirm-new')return beginNew(Number(el.dataset.slot),true);

 if(a==='reveal-pack'){openDraftPack(+el.dataset.index,true);return}if(a==='next-pack'){openDraftPack(+el.dataset.index,false);return}

 // Language picker (title screen flag): native names are never translated; the screen redraws in the new language.
 if(a==='language'){dialog('Language',`<div class="language-list">${LANGUAGES.map(([code,name])=>`<button data-do="set-language" data-lang="${code}" class="${code===currentLanguage()?'active':''}" data-no-i18n>${flagSvg(code)}<span>${name}</span></button>`).join('')}</div>`);return}
 if(a==='set-language'){modal.close();await setLanguage(el.dataset.lang).catch(error=>toast(error.message));resetLocalizedCards();render();return}
 if(a==='deselect-all'&&screen==='draft'){dialog('Deselect all?',`<p>Take every card out of your deck?</p>${btn('Deselect all','deselect-all-confirm','','primary')}`);return}
 if(a==='deselect-all'||a==='deselect-all-confirm'){if(a==='deselect-all-confirm')modal.close();flushDraftTap();await command('deselect-all');updateDraft();return}

 if(a==='auto'){flushDraftTap();await command('auto');updateDraft();return}
 // Auto-fill (user, 2026-11-23): below the minimum the grey count arrow previews the strongest legal cards that bring the
 // Main Deck up to it (campaign.fill_picks); "Add these" adds them, keeping every card already chosen.
 if(a==='deck-fill'&&screen==='draft'){flushDraftTap();const r=state.run,picks=await command('fill-preview');if(!Array.isArray(picks)||!picks.length){toast('No other card in your collection fits this deck.');return}
  deckFillPicks=picks;const n=picks.length;
  dialog(n===1?'Your deck needs 1 more card':`Your deck needs ${n} more cards`,`<p>These are the strongest cards in your collection that fit. You can still swap any of them afterwards.</p><div class="deck-fill-cards">${picks.map(i=>`<button type="button" data-inspect="${r.pool[i]}" aria-label="${esc(card(r.pool[i]).name)}"><img src="${image(r.pool[i])}" alt="" decoding="async"></button>`).join('')}</div><div class="deck-fill-actions">${btn('Keep building','close')}${btn(n===1?'Add this card':`Add these ${n}`,'deck-fill-confirm','','primary')}</div>`,false);return}
 if(a==='deck-fill-confirm'){const picks=deckFillPicks;deckFillPicks=null;closeDialog();if(picks?.length){try{await command('toggle',picks)}finally{updateDraft()}}return}

 // Tapping an unknown portrait asks first; only the dialog's Reveal button spends the cost.
 if(a==='reveal-opponent'){const id=+el.dataset.opponent;if(!el.dataset.confirmed){dialog('Confirm Reveal',`<div class="settings-actions">${btn(`Reveal · <span class="reveal-cost-inline">${revealCostLabel(revealCost(state.run))}</span>`,'reveal-opponent',`data-opponent="${id}" data-confirmed="1"`,'primary')}${btn('Cancel','close')}</div>`);return}closeDialog();busy=true;try{await playPortraitReveal({before:document.querySelector(`[data-encounter="${id}"] .encounter-hero`),update:async()=>{await command('reveal-opponent',id);renderRoutes()},after:()=>document.querySelector(`[data-encounter="${id}"] .encounter-hero`),active:()=>screen==='routes'})}finally{busy=false}return}

 if(a==='boss-reroll'){busy=true;try{await command('boss-reroll');renderRoutes()}catch(error){busy=false;throw error}return}

 if(a==='start'){return startDuel(false,+el.dataset.opponent)}

 if(a==='peek-deck'){const cards=await command('peek-deck',+el.dataset.opponent);dialog('Opponent deck',`<div class="cardgrid opponent-deck-grid">${cards.map(id=>cardButton(id,`data-inspect="${id}"`)).join('')}</div>`);return}

 if(a==='inspect-pack'){inspectPack(el.dataset.pack);return}if(a==='relic-detail'){dialog('Run relics',relicLedgerMarkup(null,screen==='shop',undefined,el.dataset.relic));modal.querySelector('.relic-icon-grid [aria-selected="true"]')?.scrollIntoView({block:'nearest'});return}

 if(a==='item-info'){const x=state.run.shop[+el.dataset.index];if(x.kind==='single'){inspect(x.id);return}if(x.kind==='pack'){inspectPack(x.id);return}if(x.kind==='deck'){dialog(x.name,`<p>${x.price} coins. Adds these ${x.cards.length} cards to your collection. Your equipped deck stays the same.</p><div class="cardgrid">${x.cards.map(id=>cardButton(id,`data-inspect="${id}"`)).join('')}</div>`);return}dialog('',relicCard(content,x.id,{price:x.sold?'':priceMarkup(state.run,x.price)}));return}

 if(a==='select-purchase'){const i=+el.dataset.index;const stock=state.run.shop[i];if(stock&&!shopSelection.has(i)&&(restockLocked(state.run,stock)||restockOne(state.run)&&[...shopSelection].some(j=>!state.run.shop[j]?.greed)&&!stock.greed)){playUISound('count-coins');return toast('Cursed Restock: you can only buy one item per reroll.')}if(!stock||stock.sold||((character().copycat||character().engine_deck)&&stock.kind!=='artifact'))return;if(shopSelection.has(i))shopSelection.delete(i);else {const total=[...shopSelection].reduce((n,j)=>n+state.run.shop[j].price,0)+state.run.shop[i].price;if(!canPay(state.run,total)){playUISound('count-coins');return toast(lpPay(state.run)?'Not enough LP (Blood Toll keeps you at 1 or more)':'Not enough gold')}shopSelection.add(i)}playUISound('shop-select');renderShop();return}

 if(a==='buy-selected'||a==='confirm-deck-purchase'){if(!shopSelection.size)return;modal.close();busy=true;try{const bought=[...shopSelection],items=bought.map(i=>({...state.run.shop[i],ultra:isShopUltra(state.run.shop[i],content.cards)}));const ownedBefore=new Set(state.run.pool||[]),results=await command('buy-many',bought);shopSelection.clear();paidSafely(()=>packSound('purchase'),renderShop,()=>juice.buy(bought.map(i=>app.querySelector(`[data-shop-item="${i}"]`)?.closest('.shop-product')),app.querySelector('.shop-balance'),items.map(x=>x.price)));await showRelicFusions();await offerGoldenCards();const pulls=results.flatMap(x=>x.cards);const mis=(state.run.last_misprints||[]).map(misprintNoticeLine).join('');const packResults=results.filter(x=>x.kind==='pack');if(packResults.length)await new Promise(resolve=>{try{presentPacks(packResults,resolve,ownedBefore)}catch(error){console.warn(error);resolve()}});if(pulls.length||mis)dialog('Your purchases',`${mis?`<div class="misprints"><b>Faulty Printer misprints:</b>${mis}</div>`:''}<div class="cardgrid">${pulls.map(id=>cardButton(id,`data-inspect="${id}"`)).join('')}</div>`);await notices();paidSafely(()=>keeperTalk.say(keeperTalk.purchaseLine(items)));offerGoldenCards()}finally{busy=false}return}

 if(a==='buy'){const index=+el.dataset.index,x=state.run.shop[index],ultra=isShopUltra(x,content.cards),pulled=await command('buy',index);purchaseCoins();renderShop();juice.buy([app.querySelector(`[data-shop-item="${index}"]`)?.closest('.shop-product')],app.querySelector('.shop-balance'),[x.price]);const mis1=(state.run.last_misprints||[]).map(misprintNoticeLine).join('');if(pulled?.length||mis1)dialog(x.kind==='pack'?'Your pack pulls':'Added to collection',`${mis1?`<div class="misprints"><b>Faulty Printer misprints:</b>${mis1}</div>`:''}<div class="cardgrid">${pulled.map(id=>cardButton(id,`data-inspect="${id}"`)).join('')}</div>`);await notices();keeperTalk.say(keeperTalk.purchaseLine([{...x,ultra}]));return}

 if(a==='import-profile-confirm'){const text=pendingDesktopProfile;if(!text)return;pendingDesktopProfile=null;const result=await command('import-profile',text);closeDialog();renderSettings();toast(`Progress imported: ${result.unlocksAdded} new unlocks, ${result.historyAdded} new history entries.`);return}

 if(a==='device-secret'){if(state.profile.cpu_viewer_unlocked||secretPlaying)return;if(++deviceSecretTaps===10){secretPlaying=true;try{await meerkatSecretAnimation();await command('unlock-cpu-viewer');toast('Watch CPU duel unlocked');}finally{secretPlaying=false;deviceSecretTaps=0;}}return;}if(a==='global-stats-retry'){renderGlobalStats();return}if(a==='device-stats-tab'){deviceStatsTab=el.dataset.tab;renderPersonalStats();return}if(a==='settings-tab'){settingsTab=el.dataset.tab;renderSettings();return}if(a.startsWith('hotkey-')&&hotkeyAction(a,el,{settings:state.settings,save:()=>void command('settings',state.settings).catch(e=>toast(e.message)),render:()=>{if(screen!=='settings')return;const top=app.querySelector('.settings-pane')?.scrollTop||0;renderSettings();const pane=app.querySelector('.settings-pane');if(pane)pane.scrollTop=top},toast}))return;if(a==='character-stats-retry'){renderCharacterStats();return}if(a==='cpu-stats-retry'){cpuStatsCache.clear();renderStats();return}if(a==='character-stats-cpu'){characterStatsCpu=Number(el.dataset.duelist);renderCharacterStats();return}if(a==='character-stats-back'){characterStatsCpu=null;renderCharacterStats();return}if(a==='character-cpu-tier'){cpuStatsTier=el.dataset.tier;renderCharacterStats();return}if(a==='cpu-stats-opponent'){cpuStatsOpponent=Number(el.dataset.opponent);renderCpuStats();return}if(a==='cpu-stats-tier'){cpuStatsTier=el.dataset.tier;renderCpuStats();return}if(a==='cpu-stats-back'){if(cpuStatsTier==='4'&&content.characters[cpuStatsOpponent]?.ultimate_collector)cpuStatsTier='uc';cpuStatsOpponent=null;renderCpuStats();return}

 if(a==='reset-progress'){dialog('Delete all progress?',`<p>Your run, achievements and all unlocks will be erased.</p>${btn('Continue to final confirmation','reset-progress-confirm')}`);return}

 if(a==='reset-progress-confirm'){dialog('Are you absolutely certain?',`<p>This permanently deletes all progress. You will start again with Yugi and Kaiba.</p>${btn('Delete all progress permanently','reset-progress-final')}`);return}

 if(a==='reset-progress-final'){clearTimeout(aiTimer);if(engine){engine.destroy();engine=null;snapshot=null}await command('reset-progress');modal.close();go('title');return}

 // In Tag the teammate may have chosen the team's Type first: nothing is left to send, the window just closes.
 if(a==='choose-monster-type'){if(tagUI){if(typeChoicePending(state.run))await tagUI.session.request(a,el.dataset.type)}else await command(a,el.dataset.type);modal.close();render();return;}

 if(a==='relic-pick'){await command(a,el.dataset.relic);finishRelicChoice();return}
 if(a==='weight-pick'){await command(a,+el.dataset.face);finishRelicChoice();return}
 if(a==='relic-pick-reroll'){await command(a);if(state.run.relic_offer)showRelicChoice(state.run);else finishRelicChoice();return}
 if(a==='card-pick-type'){cardPick.type=el.dataset.type;refreshCardPick();return}
 if(a==='card-pick-select'){cardPick.selected=+el.dataset.code;refreshCardPick();return}
 if(a==='card-pick-confirm'){if(!cardPick.selected)return;await command('card-pick',cardPick.selected);cardPick.q='';finishRelicChoice();return}
 if(a==='name-pick-select'){namePick.selected=+el.dataset.setcode;refreshNamePick();return}
 if(a==='name-pick-confirm'){if(namePick.selected==null)return;await command('name-change',namePick.selected);namePick.q='';finishRelicChoice();return}

 if(a==='golden-card'){if(tagUI)await tagUI.session.request('golden-card',+el.dataset.code);else await command('golden-card',+el.dataset.code);delete modal.dataset.goldenRequired;modal.classList.remove('golden-choice-modal');modal.close();return}

 if(a==='upload-replays'){const button=document.querySelector('[data-do="upload-replays"]'),status=document.querySelector('#replay-status');button.disabled=true;try{if(engine)await saveRecording(engine);await uploadReplays(text=>{status.textContent=text})}catch(e){status.textContent=e.message}finally{button.disabled=false}return}

 if(a==='device-sync-open'){await showDeviceSync();return;}

 if(a==='cloud-code-show'){showCloudCode('Your cloud save code:');return}

 if(a==='cloud-copy-code'||a==='cloud-save-code-file'){const code=deviceBackup.status().code,status=modal.querySelector('.cloud-code-status');if(!code)return;try{const text=a==='cloud-copy-code'?await copyCloudCode(code):await saveCloudCode(code);if(status)status.textContent=text}catch(error){if(status)status.textContent=error.message}return}

 if(a==='cloud-restore-open'){localStorage.setItem(CLOUD_ASKED,'true');dialog('Restore from code',cloudRestoreMarkup(btn));modal.querySelector('#cloud-restore-code')?.focus();return}

 if(a==='cloud-restore-find'){if(el.disabled)return;const status=modal.querySelector('.cloud-restore-status');el.disabled=true;status.classList.add('muted');status.textContent='Looking for your save…';try{cloudRestore=await deviceBackup.fetchSave(modal.querySelector('#cloud-restore-code')?.value);dialog('Restore from code',cloudFoundMarkup(cloudRestore,btn,esc))}catch(error){const reason=await explainNetworkError(error);if(status.isConnected){status.classList.remove('muted');status.textContent=reason}}finally{el.disabled=false}return}

 if(a==='cloud-restore-confirm'){const found=cloudRestore;if(!found||el.disabled)return;el.disabled=true;deviceBackup.destroy();try{await restoreRecovery(found.recovery,{loadSave:loadDeviceSave,storeSave:storeDeviceSave});deviceBackup.adopt(found.code);location.reload()}catch(error){deviceBackup.resume();dialog('Restore from code',`<p>${esc(error.message)}</p>`)}return}

 if(a==='cloud-first-on'){localStorage.setItem(CLOUD_ASKED,'true');deviceBackup.setEnabled(true);showCloudCode('Cloud save is on. Your code:');return}

 if(a==='cloud-first-later'){localStorage.setItem(CLOUD_ASKED,'true');closeDialog();return}

 if(a==='cloud-delete'){if(el.disabled||!confirm('Delete your cloud save? It is removed from the server and your code stops working. Progress on this device stays.'))return;el.disabled=true;try{await deviceBackup.deleteCloud();renderSettings();toast('Cloud save deleted.')}catch(error){dialog('Cloud save',`<p>${esc(error.message)}</p>`)}finally{el.disabled=false}return}

 if(a==='device-sync-create'||a==='device-sync-join'||a==='device-sync-now'||a==='device-sync-unlink'){

 if(el.disabled)return;const code=document.getElementById('device-link-code')?.value;el.disabled=true;

 try{const result=await deviceSync.run({'device-sync-create':'create','device-sync-join':'join','device-sync-now':'sync','device-sync-unlink':'unlink'}[a],code);await showDeviceSync(result.code?`<p>Enter this code on your other device:</p><p class="device-link-code">${esc(result.code)}</p><p>Expires in 24 hours. Each code can be used once.</p>`:a==='device-sync-unlink'?'<p>Device disconnected. Your unlocks have been kept.</p>':'<p>Unlocks synced.</p>')}catch(error){dialog('Link devices',`<p>${esc(error.message)}</p>${btn('Try again','device-sync-open')}`)}finally{el.disabled=false}return;

 }

 if(a==='android-update'){

 if(!window.ShadowNative?.openUpdate||el.disabled)return;await persist();openAndroidUpdate();return;

 }

 if(a==='android-download'){if(state)await persist();openAndroidUpdate();return;}

 if(a==='settings'){returnScreen=screen;go('settings');return}if(a==='settings-back'){go(returnScreen);if(screen==='duel')scheduleAI();return}

 if(a==='cheat'){const code=document.querySelector('#cheat-code').value;const result=await command('cheat',code);toast(result?.relic?`${result.relic} added to this run.`:result?.cleared?`${result.cleared} has beaten Challenge Level ${result.level}.`:code==='touchgrass'?'All characters cleared Challenge Levels -1 through 6.':code==='alteregos'?'All second variants unlocked.':code==='polymerization'?'All fused relics and their Fusion Materials are shown in Collection.':code==='sleevesforall'?'Every card sleeve can be chosen in Cosmetics. Achievements are unchanged.':'Testing unlock enabled.');return}

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

 if(a==='announce-pick'){const bit=+el.dataset.announce,one=engine.pending?.count===1;if(announcePicks.has(bit))announcePicks.delete(bit);else{if(one)announcePicks.clear();announcePicks.add(bit)}document.querySelectorAll('.prompt [data-announce]').forEach(b=>b.setAttribute('aria-pressed',announcePicks.has(+b.dataset.announce)));return}

 if(a==='announce'){const m=engine.pending,values=[...announcePicks].map(bit=>1n<<BigInt(bit));if(values.length!==m.count)return toast('Choose '+m.count+' options.');if(DNA_RELICS.includes(m.relic)&&announcePicks.size===1)rememberDnaPick(m.type===M.ANNOUNCE_RACE?'race':'attribute',[...announcePicks][0]);return respond(m.type===M.ANNOUNCE_RACE?{type:R.ANNOUNCE_RACE,races:values}:{type:R.ANNOUNCE_ATTRIB,attributes:values.map(Number)})}

 if(a==='counters'){const counters=[...document.querySelectorAll('[data-counter]')].map(x=>+x.value);if(counters.reduce((a,b)=>a+b,0)!==engine.pending.count)return toast('Select the required counter total.');return respond({type:R.SELECT_COUNTER,counters})}

 if(a==='scorecard'){const found=new Set(state.profile?.secret_coin_feats||[]);dialog('Coin scorecard',coinScorecardMarkup(content.battleCoinRules,state.run?.last_rewards,(content.secretCoinRules||[]).filter(r=>found.has(r.id))));return}

 if(a==='relic-ledger'){if(modal.open&&modal.querySelector('.reward-screen'))showRewardOverlay('Run relics',relicLedgerMarkup(null,false,true));else dialog('Run relics',relicLedgerMarkup());return}

 if(a==='online'){menuPage='online';menuPageEntry='tag';menuIndex=0;render();return;}if(a==='main-menu'){menuPage='main';menuPageEntry='continue';menuIndex=baseMenu.findIndex(m=>m[4]==='continue');render();return;}
 if(['title','characters','routes','draft','shop','achievements','relics','collection','stats','cosmetics'].includes(a))go(a);

}

// Solo deck editor only. Tag's sort and deck-status menus carry the same attributes (for their CSS); answering them
// drew the solo editor over the Tag room, where taps did nothing (Mugen101, Discord 2026-11-08).
document.addEventListener('change',e=>{if(screen!=='draft')return;if(e.target&&e.target.dataset&&e.target.dataset.draftSort!==undefined){draftSort=e.target.value;rememberDeckSort({sort:draftSort});renderDraft()}if(e.target?.dataset?.draftDeck!==undefined){draftDeck=e.target.value;rememberDeckSort({status:draftDeck});renderDraft()}});

// Sliders preview every movement; the settings are saved once, when the slider is released.
// UI Scale zooms on release: zooming mid-drag moves the slider under the pointer.
document.addEventListener('change',e=>{if(e.target.id==='ui-scale')applyDisplayOptions(state.settings);if(e.target.id==='voice')playUISound('kill-perfect.wav',{spoken:true});if(e.target.id==='menu')menuSelectionSound();if(e.target.id==='master')playUISound('shop-select');if(['manual-response-window','cpu-delay','text-size','ui-scale','fps-cap','master','music','sound','voice','menu'].includes(e.target.id))void command('settings',state.settings)});
document.addEventListener('input',async e=>{if(e.target.id==='card-pick-search'||e.target.id==='name-pick-search'){const cardSearch=e.target.id==='card-pick-search';(cardSearch?cardPick:namePick).q=e.target.value;clearTimeout(pickSearchTimer);pickSearchTimer=setTimeout(cardSearch?refreshCardPick:refreshNamePick,120);return}if(e.target.id==='cpu-delay'){const value=Math.max(0,Math.min(1000,Number(e.target.value)||0));state.settings.cpuDelay=value;e.target.nextElementSibling.textContent=`${value} ms`}if(e.target.id==='manual-response-window'){const value=Math.max(0,Math.min(2000,Number(e.target.value)||0));state.settings.manualResponseWindow=value;e.target.nextElementSibling.textContent=`${value} ms`}if(e.target.id==='text-size'){state.settings.textSize=+e.target.value;e.target.nextElementSibling.textContent=e.target.value+'%';applyDisplayOptions(state.settings)}if(e.target.id==='ui-scale'){const v=uiScaleValue(e.target.value);state.settings.uiScale=v;e.target.nextElementSibling.textContent=uiScaleLabel(v)}if(e.target.id==='fps-cap'){state.settings.fpsCap=+e.target.value;e.target.nextElementSibling.textContent=e.target.value+' FPS';applyDisplayOptions(state.settings)}if(e.target.id==='deck-columns'){const value=+e.target.value;state.settings.deckColumns=value;e.target.nextElementSibling.textContent=deckColumnsLabel(value);applyDisplayOptions(state.settings)}if(['master','music','sound','voice','menu'].includes(e.target.id)){state.settings[e.target.id]=+e.target.value;e.target.nextElementSibling.textContent=e.target.value+'%';track(screenMusic())}if(e.target.id==='announce-search'){const q=e.target.value.toLowerCase();document.querySelectorAll('.prompt [data-response]').forEach(b=>b.hidden=!b.textContent.toLowerCase().includes(q))}});

// Escape (and a right-click on empty space) also closes menus on PC (Prunk44, 2026-11-12): it presses the open window's
// visible Close button, or on a menu screen its Back/close button. Never during a run's screens or a duel, where the
// header close leaves to the main menu; right-click on cards keeps inspecting them.
const MENU_SCREENS=['settings','cosmetics','collection','achievements','stats','tutorial','gallery'];
function escapeTarget(){
 if(modal.open){if(modal.querySelector('.inspect,.pile-inspection'))return closeDialog;const close=[...modal.querySelectorAll('[data-do="close"],[data-do="reward-overlay-close"]')].find(b=>b.offsetParent&&!b.disabled);return close?()=>close.click():null}
 // Any other window (card search, a pack's cards, the upload reminder) closes like the controller's B closes it.
 const other=[...document.querySelectorAll('dialog[open]')].filter(d=>d!==modal).pop();
 if(other)return ()=>{if(other.dispatchEvent(new Event('cancel',{cancelable:true})))other.close()};
 if(!MENU_SCREENS.includes(screen)||tagUI||lesson)return null;
 const back=[...app.querySelectorAll('[data-do="settings-back"],[data-do="tutorial-back"],[data-do="collection-collector-back"],header [data-do="title"]')].find(b=>b.offsetParent&&!b.disabled);
 return back?()=>back.click():null;
}
installEscapeInspection(()=>!!escapeTarget(),()=>escapeTarget()?.());
// Previous / Next in the card window and the full-size art (card-nav.js, user 2026-11-14). A step replaces the window
// in place, so Close still returns to whatever the first card was opened over (a pile or pack list).
installCardNav({modal,image,hasCard:id=>!!card(id),poolCard:i=>state.run?.pool?.[i],
 openCard:(id,pool,el)=>{if(screen==='duel')setPreview(id,el);inspect(id,pool)},
 shop:()=>(tagUI?tagUI.view?.run:state.run)?.shop,
 openShop:index=>{const el={dataset:{index:String(index)}};if(tagUI)tagUI.action('item',el).catch(e=>toast(e.message));else action('item-info',el)},
 keepParent:fn=>{const parent=inspectParent;try{fn()}finally{inspectParent=parent}}});
// Right-click only. A long press on Android also fires contextmenu, after the hold has already opened the card window,
// and it closed that window again at once (player report, 2026-11-13): touch never closes anything here.
let lastTouchAt=-1e9;document.addEventListener('touchstart',()=>{lastTouchAt=performance.now()},{capture:true,passive:true});
// Right-click closes only an open window, and only once it has been open 300 ms (user, 2026-11-13): the right-click that
// opens a window (a pack in the shop, a relic, a card) must not also close it. Escape still handles menu screens.
let modalOpenedAt=-1e9;new MutationObserver(()=>{if(modal.open)modalOpenedAt=performance.now()}).observe(modal,{attributes:true,attributeFilter:['open']});
const rightClickCloses=()=>modal.open&&performance.now()-modalOpenedAt>=300;
document.addEventListener('contextmenu',e=>{
 if(e.pointerType==='touch'||e.pointerType==='pen'||performance.now()-lastTouchAt<2500||!rightClickCloses())return;
 if(e.target.closest?.('[data-inspect],[data-preview],[data-hand],[data-zone],.cardbtn,button,a,input,select,textarea,.sleeve-picker'))return;
 const go=escapeTarget();if(go){e.preventDefault();go()}
});

// Space never skips Battle while the cancel guard has it disabled.
installDuelKeys({root:app,inDuel:()=>screen==='duel'&&!cpuViewer,canAct:()=>!busy&&performance.now()>=battleBlockedUntil&&!document.querySelector('.encounter-cinematic,.legendary-summon,.exodia-finale'),logOpen:()=>modal.open&&!!modal.querySelector('.duel-log'),openLog:()=>action('log'),closeLog:()=>{closeDialog();scheduleAI()},
 options:()=>{const el=[...app.querySelectorAll('[data-do="duel-options"],[data-do="pause"]')].find(padUsable);if(el&&!modal.open)el.click()}});

// Every other hotkey (hotkeys.js keymap, user 2026-11-24). Each one presses a button the screen already shows, so
// what a click checks still applies; a handler returns false when its button isn't there and the key stays free.
hotkeys.setSource(()=>state?.settings?.hotkeys);
function hotkeyScope(){
 if(!content||screen==='loading'||document.querySelector('.encounter-cinematic,.legendary-summon,.exodia-finale,.pack-theatre,.lesson-coach.shop-tour'))return null;
 if(modal.open)return modal.querySelector('.inspect')?'card':'dialog';
 if(document.querySelector('dialog[open]'))return 'dialog';
 if(screen==='tag')return app.querySelector('[data-do="buy-selected"]')?'shop':'menu';
 return ['duel','shop','draft','routes','title'].includes(screen)?screen:'menu';
}
const pressVisible=(selector,scope=app)=>{const el=[...scope.querySelectorAll(selector)].find(padUsable);if(!el||busy)return false;el.click();return true};
// The card under the mouse: the same card a controller's X would inspect.
function inspectHovered(){const el=[...document.querySelectorAll(':hover')].pop()?.closest?.('[data-inspect],[data-preview],[data-code],[data-id]');return !!el&&inspectElement(el)}
// Tabs: Settings, Duel settings, Collection, Stats and the deck editor's card-kind tabs.
function stepTab(dir){
 const area=modal.open?modal:app;
 for(const selector of ['[role="tablist"] [role="tab"]','.draft-tabs [data-draft-tab]','.collection-nav button']){
  const tabs=[...area.querySelectorAll(selector)].filter(padUsable);if(tabs.length<2)continue;
  const at=tabs.findIndex(t=>t.getAttribute('aria-selected')==='true'||t.classList.contains('active')||t.classList.contains('primary'));
  const next=tabs[((at<0?0:at+dir)%tabs.length+tabs.length)%tabs.length];next.click();next.focus?.({preventScroll:true});return true;
 }
 return false;
}
const hotkeyHandlers={
 inspect:()=>inspectHovered(),
 settings:()=>{if(busy)return false;if(screen==='duel'){if(cpuViewer)return false;action('duel-settings');return true}if(pressVisible('[data-do="settings"]'))return true;if(screen!=='title')return false;action('settings');return true},
 'shop.buy':()=>pressVisible('[data-do="buy-selected"]'),
 'shop.reroll':()=>pressVisible('[data-do="shop-reroll"]'),
 'shop.next':()=>pressVisible(screen==='draft'?'.draft-next':'.shop-next[data-do="routes"]'),
 'shop.deck':()=>pressVisible(screen==='draft'?'[data-do="reward-return"],[data-do="shop"]':'[data-do="draft"]'),
 'deck.search':()=>{if(pressVisible('[data-effect-search]'))return true;const box=[...app.querySelectorAll('#collection-search,#collector-search,input[type="search"]')].find(padUsable);if(!box)return false;box.focus();box.select?.();return true},
 'tab.prev':()=>stepTab(-1),
 'tab.next':()=>stepTab(1),
 'title.prev':()=>{action('menu-prev');return true},
 'title.next':()=>{action('menu-next');return true},
};
// The numbered choices outside a duel: the opponents on the duel select screen, left to right.
function routeChoice(i){if(screen!=='routes')return false;const starts=[...app.querySelectorAll('.routes [data-do="start"]')].filter(padUsable);if(!starts[i]||busy)return false;starts[i].click();return true}
for(const n of [1,2,3,4,5])hotkeyHandlers['choice-'+n]=()=>routeChoice(n-1);
hotkeys.installHotkeys({scope:hotkeyScope,handlers:hotkeyHandlers,repeats:new Set(['tab.prev','tab.next','title.prev','title.next'])});

// B / Circle (user, 2026-11-15): Android also turns a controller's B into its Back button, so one press can arrive twice;
// whichever comes first handles it. Back closes a card's Summon / Set / Inspect menu before anything else.
window.androidBack=()=>{if(performance.now()-(window.padBackAt||0)<500)return;window.androidBackAt=performance.now();if(document.querySelector('.action-pop')){removeActions();return}const reminder=document.querySelector('.replay-upload-reminder[open]');if(reminder){reminder.close();return}if(screen==='loading'||document.querySelector('.exodia-finale'))return;if(modal.open){closeDialog();if(screen==='duel')scheduleAI()}else if(cpuViewer){cpuViewer.back()}else if(tagUI)tagUI.action('exit',{dataset:{}});else if(screen==='duel')action('pause');else if(screen==='settings')action('settings-back');else go('title')};

// Use the same visible cancel button as a left click; never invent a response for forced prompts.

document.addEventListener('contextmenu',e=>{

 if(e.button!==2||e.pointerType==='touch'||screen!=='duel')return;

 e.preventDefault();

 if(busy||document.querySelector('.encounter-cinematic,.legendary-summon,.exodia-finale'))return;

 const scope=modal.open?modal:app;

 const cancel=[...scope.querySelectorAll('button.reaction-decline,button.duel-cancel')].find(button=>!button.disabled&&button.checkVisibility());

 cancel?.click();

});

// Enter in a search box presses its Search button (user, 2026-11-18): Collection and the Ultimate Collector screen.
const SEARCH_BUTTONS={'collection-search':'[data-do="collection-search"]','collector-search':'[data-collector="search"]'};
document.addEventListener('keydown',e=>{const target=e.key==='Enter'&&!e.isComposing&&SEARCH_BUTTONS[e.target?.id];if(!target)return;const button=document.querySelector(target);if(!button)return;e.preventDefault();button.click()});
window.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target?.dataset?.do==='duel-emotes'){e.preventDefault();action('duel-emotes',e.target);return;}if(['Enter',' '].includes(e.key)&&e.target?.dataset?.do==='device-secret'){e.preventDefault();action('device-secret',e.target);return;}});



async function boot(){try{
 // Interface language: the player's saved choice, else the browser's language (2026-11-08).
 await setLanguage(savedLanguage()||browserLanguage(),{remember:false}).catch(error=>console.warn('Language',error));
 resetLocalizedCards();

 // Ask about an update first: it would replace everything loaded below. A slow check must not hold up the game.
 let updatePromptOpen=false;
 const updateCheck=startupAndroidUpdate({native:window.ShadowNative,online:navigator.onLine,language:updateLanguage(),prompt:async version=>{
  while(modal.open)await new Promise(resolve=>modal.addEventListener('close',resolve,{once:true}));
  updatePromptOpen=true;dialog('Update',`<p>Would you like to update to version ${esc(version)}?</p><div class="actions">${btn('Update','android-download')}${btn('Close','close')}</div>`,false);
  await new Promise(resolve=>modal.addEventListener('close',resolve,{once:true}));updatePromptOpen=false;
 }});
 await Promise.race([updateCheck,new Promise(resolve=>setTimeout(resolve,2500))]);if(updatePromptOpen)await updateCheck;

 document.querySelector('#loading-status').textContent='Step 1 of 6 · Reading game data and saved progress…';{const tip=document.createElement('p');tip.className='loading-tip';tip.textContent=loadingTip();document.querySelector('#loading-status').after(tip)}

 await installDesktopStorage();

 const [files,meta]=await Promise.all([fetch('campaign-files.json',{cache:'no-store'}).then(r=>r.json()),fetch('content.json',{cache:'no-store'}).then(r=>r.json())]);content=meta;attachContent(content,displayCardText);juice.setDefeatVoices(content.loseVoices);for(const c of [...content.cards,...(content.tokenCards||[])])if(!cardsById.has(c.id))cardsById.set(c.id,c);setupRandomCards({content,cardsById,cardImages});

 await Promise.all([preloadCards([...content.cards,...(content.tokenCards||[])],({loaded,total,failed,bytes})=>{

  document.querySelector('#loading-count').textContent=`${loaded.toLocaleString()} / ${total.toLocaleString()} cards${bytes?` · ${(bytes/1048576).toFixed(1)} MB artwork read`:''}`;

  const bar=document.querySelector('#loading-progress');bar.max=Math.max(1,total);bar.value=loaded;

  document.querySelector('#loading-status').textContent=failed?`${failed} images could not load; checking remaining cards…`:'Step 2 of 6 · Loading card artwork…';

 })]);

 const preloadVisuals=await chooseStartupPreload(document.querySelector('.loading'));

 document.querySelector('#loading-status').textContent='Step 3 of 6 · Starting campaign runtime…';
 // Python reads its standard library from python_stdlib.zip. It is checked first and the checked bytes are what Pyodide
 // loads. The exit(1) reports (Discord, 2026-11-17 to 11-20) came from phones in Arabic and other languages whose time
 // zone names Python could not read: asciiTimeZoneNames() gives Pyodide English names (boot-diagnostics.js).
 // The Linux app serves the game over its own ygo:// scheme, and WebKitGTK gives those responses no Content-Type header,
 // so WebAssembly.instantiateStreaming refuses the wasm ("Unexpected response MIME type", Discord 2026-11-23: stuck on
 // Starting campaign runtime). Off http(s), read the bytes first; the web and Android builds are unchanged.
 if(!/^https?:$/.test(location.protocol))wasmFromBytes();
 asciiTimeZoneNames();
 const pyIndex=new URL('pyodide/',location.href).href,stdlib=await prepareStdlib(pyIndex,{retry:startupRetried()}),pyErrors=stderrTail();
 bootDiag={stage:'python',zip:stdlib.report,stderr:pyErrors.lines};
 try{py=await loadPyodide({indexURL:pyIndex,...stdlib.options,stderr:pyErrors.write});stdlib.started()}catch(error){stdlib.failed();throw error}finally{stdlib.release()}
 bootDiag.stage='campaign';installMemfsRenameCleanup(py.FS);

 py.FS.mkdirTree('/game/data');py.FS.mkdirTree('/game/data/decks');py.FS.mkdirTree('/game/saves');py.FS.mkdirTree('/game/runtime');

 for(const [name,text] of Object.entries(files))py.FS.writeFile('/game/'+name,text);

 const stored=window.ShadowNative?await ShadowNative.load():localStorage.getItem('shadow-run-mobile')||'{}';

 let saved={};try{saved=JSON.parse(stored)}catch{throw Error('Saved progress could not be read. It has not been overwritten.')}

 for(const [name,text] of Object.entries(saved))if(/^[\w-]+\.(json|bak)$/.test(name))py.FS.writeFile('/game/saves/'+name,text);

 document.querySelector('#loading-status').textContent='Step 4 of 6 · Restoring campaign…';

 await py.runPythonAsync("import sys\nsys.path.insert(0,'/game')\nimport mobile_backend");await command('init');applyCompatibilityMode();applyEffectOptions(state.settings.effectsOff);applyOrientation();applyDisplayOptions(state.settings);setJapaneseNames(state.settings.japaneseNames,japaneseNames);if(preloadVisuals&&!state.settings.simpleBackgrounds&&!state.settings.performanceMode&&!compatibilityEnabled()){document.querySelector('#loading-status').textContent='Step 4 of 6 · Loading background videos…';await preloadAllBackgrounds(({loaded,total})=>{document.querySelector('#loading-count').textContent=`${loaded} / ${total} backgrounds loaded`;const bar=document.querySelector('#loading-progress');bar.max=total;bar.value=loaded;});}

 document.querySelector('#loading-status').textContent='Step 5 of 6 · Loading sounds and selected assets…';

 const effects=await preloadStartupAssets(({loaded,total,bytes})=>{document.querySelector('#loading-count').textContent=`${loaded} / ${total} assets · ${(bytes/1048576).toFixed(1)} MB`;const bar=document.querySelector('#loading-progress');bar.max=total;bar.value=loaded;},{images:preloadVisuals,music:preloadVisuals,local:await assetsAreLocal()});

 // Finisher voice lines play from their downloaded files (juice.js), so they skip the up-front decode.
 if(bootDiag)bootDiag.stage='sounds';document.querySelector('#loading-status').textContent='Step 6 of 6 · Preparing sound effects…';const soundCheck=await preloadSoundEffects(effects.filter(path=>!/\/(?:kill-[a-z]+|you-lose)\.wav$|\/sfx\/lose\//.test(path)));
 if(soundCheck.undecodable||soundCheck.failed)console.warn('Sound effects unavailable:',soundCheck);

 screen='title';render();await notices();document.dispatchEvent(new CustomEvent('game-startup-ready',{detail:{newDevice:Object.keys(saved).length===0}}));if(!new URLSearchParams(location.search).has('desktop'))cloudStartup(Object.keys(saved).length===0);firefoxNotice();soundNotice(soundCheck);if(new URLSearchParams(location.search).has('desktop')){if(new URLSearchParams(location.search).get('mode')==='cpu')await openCPU();else await openTag();}
 startDeviceSync();clearRetry();

 window.shadowTest={command,state:()=>state,collector:()=>tagUI?.isCollector?tagUI:null,engine:()=>engine,screen:()=>screen,go,startDuel,respond};

 }catch(e){console.error(e);
 // Python failing to start is retried once on its own; the delay lets pwa.js apply a waiting update first.
 const retried=startupRetried(),retrying=bootDiag?.stage==='python'&&retryOnce({reload:()=>setTimeout(()=>location.reload(),600)});
 const report=bootDetails({version:replayVersion,error:e,zip:bootDiag?.zip,stderr:bootDiag?.stderr,native:!!window.ShadowNative,retried,desktop:window.ShadowDesktop?.platform||(window.ShadowDesktop?'windows':null),stage:bootDiag?.stage});
 app.innerHTML=retrying?`<section class="loading"><img class="loading-wizard" src="assets/time-wizard.png" alt="Time Wizard"><h1>Could not start</h1><p>Retrying once…</p></section>`
  :`<section class="loading"><img class="loading-wizard" src="assets/time-wizard.png" alt="Time Wizard"><h1>Could not start</h1>${bootDiag?.stage==='python'
   // Python still failed after the retry: what to do, in the player's language; the technical error stays in Details.
   ?`<p>The game engine could not start on this device. Your saves are safe.</p><p>${window.ShadowDesktop?.platform==='linux'?'Close the app and open it again. If it keeps happening, update your system (WebKitGTK), then press Copy details and send them to us on Discord.':window.ShadowDesktop?'Close the app and open it again. If it keeps happening, update Windows and Microsoft Edge WebView2, then press Copy details and send them to us on Discord.':window.ShadowNative?'Close the app fully and open it again. If it keeps happening, update Android System WebView and Chrome from the Play Store, then press Copy details and send them to us on Discord.':'Close this tab and open the game again. If it keeps happening, update your browser or try another one, then press Copy details and send them to us on Discord.'}</p>`
   :`<p>${esc(e.message)}</p>`}<button id="retry-startup">Retry loading</button><details class="boot-details"><summary>Details</summary><pre>${esc(report)}</pre></details><button id="copy-boot-details">Copy details</button></section>`;
 document.querySelector('#retry-startup')?.addEventListener('click',()=>location.reload());
 const copyButton=document.querySelector('#copy-boot-details');copyButton?.addEventListener('click',async()=>{copyButton.textContent=await copyText(report)?'Copied':'Copy failed'});
 // A broken start may already be fixed by a newer version: the web app applies a waiting update at once (pwa.js).
 document.documentElement.dataset.bootFailed='true';window.dispatchEvent(new Event('ygo-boot-failed'))}}

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

 const owner=new (draftMode?DraftUI:CollectorUI)({sleeve:()=>sleevePayload(state.settings,state.profile,content),root:app,content,profile:state.profile,backend:command,image,inspect,inspectPack,dialog,openPacks:presentPacks,getSlots:()=>state.slots,onResult:won=>track(won?'victory':'defeat'),onCheckpoint:()=>persist(true),
 // Draft Random Pack cards (2026-11-16): added to the card tables, the duel engine and the background drawing.
 randomCards:{add:addDraftRandomCards,prepare:prepareEngine,draw:drawInBackground},

 onView:view=>{if(tagUI!==owner)return;loadActiveFavourites();if(view.phase==='duel')state={...state,run:view.run};else{screen='tag';engine=null;snapshot=null;}},

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

 tagUI=new TagUI({spinOff,onRunMark:keepRunMark,randomCards:{add:addDraftRandomCards,prepare:prepareEngine,draw:drawInBackground},sleeve:()=>chosenSleeve(state.settings,state.profile,content),sound:duelSound,tickSound:slotTickSound,stopTick:()=>slotTick.pause(),root:app,content,profile:state.profile,backend:desktopToken?desktopRPC:command,image,inspect,inspectPack,dialog,showRewards:showVictoryReceipt,showScorecard:()=>action('scorecard'),openPacks:presentPacks,onGoldenCards:offerGoldenCards,

 onView:view=>{sendSavedTagMarks(view);const duelEnded=tagCloudPhase==='duel'&&view.phase!=='duel';tagCloudPhase=view.phase;if(duelEnded)void command('tag-profile',view.profile).then(()=>persist(true)).catch(error=>console.warn('Post-duel backup:',error.message));observeTagStats(view);state={...state,run:view.run,profile:view.profile};closeStaleTypeChoice(modal,view.run);rewardPresentation?.refresh();track(view.phase==='duel'?(summonMusic.get(engine)||(view.duel?.mode==='pvp'?'champion':((view.run.round||0)+1)%3===0?'boss':'duel')):view.phase==='shop'?'shop':view.phase==='complete'?'victory':view.phase==='gameover'?'defeat':view.phase==='draft'?'draft':'characters');if(view.phase!=='duel'){document.querySelectorAll('.float-lp,.float-coins,.victory-settlement,.moving-card,.attack-beam,.duel-cue,.coin-toss,.dice-toss').forEach(el=>el.remove());screen='tag';engine=null;snapshot=null;if(desktopToken)desktopRPC('native-stop').catch(console.error)}},

 onDuel:(s,cues)=>{tagDuelQueue=tagDuelQueue.then(async()=>{if(!s.finished)tagFinalePlayed=false;await showTagDuel(s,cues);if(isCardWin(s.finished)&&!tagFinalePlayed){tagFinalePlayed=true;clearTimeout(aiTimer);removeActions();if(modal.open)modal.close();await playCardWin(s.finished)}}).catch(error=>toast(error.message));return tagDuelQueue;},

 onStatus:(state,detail)=>{if(screen!=='duel')return;tagConnectionBanner();if(state==='error'&&detail)toast(detail)},

 onBack:async profile=>{clearTimeout(aiTimer);engine=null;snapshot=null;screen='tag';busy=false;state={...tagOffline,profile};if(modal.open)modal.close();if(desktopToken)await desktopRPC('native-stop');track('characters')},

 onExit:async()=>{const profile=tagUI.profile;tagUI=null;engine=null;snapshot=null;state=tagOffline;tagOffline=null;await (desktopToken?desktopRPC:command)('tag-profile',profile);state.profile=profile;screen='title';if(desktopToken){window.suspendAudio();await desktopRPC('native-stop');await desktopRPC('desktop-exit')}else render()}

 });

 void tagUI.autoRejoin();
 if(new URLSearchParams(location.search).has('tagtest'))window.tagTest={get ui(){return tagUI},get snapshot(){return snapshot},get engine(){return engine}};

}

async function showTagDuel(s,cues,owner=tagUI){

 if(!owner||tagUI!==owner||owner.view?.phase!=='duel')return;if(!owner.isCollector&&(s.tag.responseNumber||0)===0){const key=JSON.stringify([owner.view.run.round,owner.view.opponents]);if(owner.introKey!==key){owner.introKey=key;await playEncounterReveal({content,run:owner.view.run,players:owner.view.characters,opponents:owner.view.opponents.filter(i=>i!=null),lp:s.lp,sound:duelSound,tickSound:slotTickSound,stopTick:()=>slotTick.pause(),active:()=>tagUI===owner&&owner.alive})}}const resumedPresentation=!engine?.tagFacade&&(s.tag.responseNumber||0)>0&&!cues.length;snapshot=s;screen='duel';duelEnding=false;track(screenMusic());

 if(!engine?.tagFacade){engine=Object.create(MobileDuel.prototype);engine.tagFacade=true;engine.cards=new Map([...content.cards,...content.tokenCards].map(c=>[c.id,c]));const facade=engine,data=await loadEngineData();if(tagUI!==owner||engine!==facade||owner.view?.phase!=='duel')return;engine.data=data;for(const c of Object.values(engine.data))c.race=BigInt(c.race);engine.query=(p,loc)=>{const side=snapshot.players[p];return loc===L.EXTRA?(side.extraCards||[]):side[{[L.HAND]:'hand',[L.MZONE]:'monsters',[L.SZONE]:'spells',[L.GRAVE]:'grave',[L.REMOVED]:'banished'}[loc]]||[]};engine.core={duelQueryCount:(_,p,loc)=>loc===L.DECK?snapshot.players[p].deck:loc===L.EXTRA?snapshot.players[p].extra:engine.query(p,loc).length};engine.destroy=()=>{}}

 engine.presentationDuel=s.tag.presentationDuel;Object.assign(engine,s.tag.ui,{pending:s.pending,visuals:cues,turn:s.turn,phase:s.phase,player:s.player,lp:s.lp});if(!document.querySelector('.duel')||!cues.some(c=>c.kind==='coin'||c.kind==='dice'))renderDuel();

 if(resumedPresentation)await updateCoinMilestones(true);await playDuelCues(s.player===0);if(tagUI!==owner||owner.view?.phase!=='duel')return;renderDuel();if(s.finished&&!engine.polishFinished){engine.polishFinished=true;await duelFinish(s.finished.player,s.finished.reason)}tagConnectionBanner();scheduleAI();

}

function tagConnectionBanner(){if(screen==='duel'&&tagUI?.netStatus)showNetStatus(()=>screen==='duel'&&tagUI?.netStatus?tagUI.netStatus():null);else hideNetStatus()}



let cpuViewer=null;

async function openCPU(){

 screen='cpu';clearTimeout(aiTimer);track('duel');

 const hasBundledCPUDecks=Object.keys(content.cpuWatchDecks||{}).length>0&&Object.keys(content.cpuWatchOpponents||{}).length>0;const catalog=hasBundledCPUDecks?{cpuWatchDecks:content.cpuWatchDecks,cpuWatchOpponents:content.cpuWatchOpponents}:await command('cpu-catalog');if(screen!=='cpu')return;

 cpuViewer=new CPUViewer({root:app,content:{...content,...catalog},inspect,dialog,onExit:async()=>{cpuViewer=null;if(desktopToken){window.suspendAudio();await desktopRPC('desktop-exit')}else go('title')}});

}



// Collection › Packs: packs holding cards of a Support theme or a Type (pack-summary.js packFilterCount), most first.
const PACK_FILTER_LABELS={'card draw':'Draw cards','removal and control':'Removal and control'};
function packCardsFilter(){const {themes,types}=packFilterOptions(content),opt=(v,label)=>`<option value="${esc(v)}" ${v===collectionPackCards?'selected':''}>${esc(label)}</option>`;return `<label>Cards<select data-collection-filter="pack-cards">${opt('','Any card')}<optgroup label="${esc(tr('Support'))}">${themes.map(x=>opt('theme:'+x,PACK_FILTER_LABELS[x]||x)).join('')}</optgroup><optgroup label="${esc(tr('Monster Type'))}">${types.map(x=>opt('race:'+x,x)).join('')}</optgroup></select></label>`}
function collectionFilters(){return [['type',collectionType,['All types','Monster','Spell','Trap']],['attribute',collectionAttribute,['All attributes','EARTH','WATER','FIRE','WIND','LIGHT','DARK','DIVINE']]].map(([key,value,choices])=>`<label>${key}<select data-collection-filter="${key}">${choices.map(x=>`<option value="${x}" ${x===value?'selected':''}>${x}</option>`).join('')}</select></label>`).join('')}

document.addEventListener('change',e=>{const key=e.target.dataset?.collectionFilter;if(!key)return;if(key==='type')collectionType=e.target.value;if(key==='attribute')collectionAttribute=e.target.value;if(key==='effect')collectionEffect=e.target.value;if(key==='registration')collectionRegistration=e.target.value;if(key==='pack-cards')collectionPackCards=e.target.value;collectionPage=0;renderCollection()});

function boosterDescription(p){const base=allCardsPackDescription(p),summary=packSummary(content,p.id),archetypes=summary.match(/Archetypes:[^.]+/);return [base||summary,base&&archetypes?.[0]].filter(Boolean).join(' ')}
// Each part in its own span so the Millennium Puzzle sentence translates as one text run.
function boosterDescriptionHtml(p){const base=allCardsPackDescription(p);if(!base)return esc(boosterDescription(p));const archetypes=packSummary(content,p.id).match(/Archetypes:([^.]+)/);return `<span>${esc(base)}</span>${archetypes?` <span>Archetypes:</span> <span>${esc(archetypes[1].trim())}</span>`:''}`}

// `filter`: the Collection › Packs "Cards" filter ("theme:Equip Spells"), so the window opens on those cards.
async function inspectPack(pid,filter=''){

 const p=packInfo(pid);if(!p)return;
 if(p.randomized){dialog(p.name,`<p>${esc(RANDOM_PACK_TEXT)}</p>`);return}

 loadActiveFavourites();dialog(p.name,`<div class="pack-fav-row">${packFavouriteToggle(pid)}</div><p class="pack-summary" data-no-i18n>${packSummaryHtml(packSummaryParts(content,pid),allCardsPackDescription(p))}</p><section data-pack-inspection><p>Loading card odds…</p></section>`);

 const panel=modal.querySelector('[data-pack-inspection]');
 // Summary links (CITYDRIVER, 2026-11-19): a Type, Attribute, archetype or Support theme shows only this pack's cards of
 // it; the same link again or ✕ shows them all. The matcher is built on the click, so opening the window costs nothing.
 const summary=modal.querySelector('.pack-summary');let termFilter=null,applyTerm=()=>{};
 const markTerms=()=>{for(const x of summary.querySelectorAll('[data-pack-term]')){const on=!!termFilter&&x.dataset.packTerm===termFilter.kind&&x.dataset.value===termFilter.value;x.classList.toggle('active',on);x.setAttribute('aria-pressed',String(on))}};
 // The window keeps its height while filtered (mobile.css), so the links don't jump under the finger as the list shrinks.
 const setTerm=a=>{if(a&&!termFilter)modal.style.setProperty('--pack-term-height',Math.round(pageRect(modal).height)+'px');termFilter=!a||termFilter&&termFilter.kind===a.dataset.packTerm&&termFilter.value===a.dataset.value?null:{kind:a.dataset.packTerm,value:a.dataset.value,label:a.textContent,match:packTermMatcher(content,a.dataset.packTerm,a.dataset.value)};markTerms();applyTerm()};
 summary.addEventListener('click',e=>{const a=e.target.closest('[data-pack-term]');if(!a)return;e.preventDefault();setTerm(a)});
 const start=parsePackFilter(filter);if(start){termFilter={...start,label:tr(PACK_FILTER_LABELS[start.value]||start.value),match:packTermMatcher(content,start.kind,start.value)};markTerms()}

 try{

  const entries=await command('pack-inspect',pid);if(!panel.isConnected)return;

  const unregistered=entries.filter(x=>!registeredCard(x.id)).length;

  panel.innerHTML=`<label>Sort by <select data-pack-sort><option value="rarity">Rarity (rarest pulls first)</option><option value="frame">Card frame</option><option value="unregistered">Unregistered first</option></select></label><small class="muted pack-registration-count">${unregistered} / ${entries.length} cards unregistered · Odds per 9-card pack, rounded</small><div class="pack-term-filter" role="status" hidden></div><div class="cardgrid"></div><button data-pack-more>Show more</button>`;

  const select=panel.querySelector('select'),grid=panel.querySelector('.cardgrid'),more=panel.querySelector('[data-pack-more]'),chip=panel.querySelector('.pack-term-filter');let shown=80,sorted=[];

  const draw=()=>{const list=termFilter?entries.filter(x=>termFilter.match(card(x.id))):entries;chip.hidden=!termFilter;if(termFilter)chip.innerHTML=`<span data-no-i18n>${translateWith('Showing only {0}',`<b>${esc(termFilter.label)}</b>`)}</span> <small>${list.length} / ${entries.length}</small><button type="button" class="pack-term-clear" data-pack-term-clear aria-label="Clear filter" title="Clear filter">✕</button>`;sorted=sortPackCards(list,select.value,card,registeredCard);grid.innerHTML=sorted.length?sorted.slice(0,shown).map(x=>`<button class="cardbtn" data-preview="${x.id}" data-inspect="${x.id}" aria-label="${esc(card(x.id)?.name||'Card')} · ${x.locked?'Locked':formatPackChance(x.chance)}"><img draggable="false" loading="lazy" src="${image(x.id)}" alt="${esc(card(x.id)?.name||'Card')}"><span>${x.locked?'Locked':formatPackChance(x.chance)}</span></button>`).join(''):'<p class="muted pack-term-empty">No cards in this pack match.</p>';more.hidden=shown>=sorted.length;};

  select.addEventListener('change',()=>{shown=80;draw()});more.addEventListener('click',()=>{shown+=80;draw()});chip.addEventListener('click',e=>{if(!e.target.closest('[data-pack-term-clear]'))return;const back=summary.querySelector('[data-pack-term].active');setTerm(null);back?.focus()});applyTerm=()=>{shown=80;draw()};draw();

 }catch(error){if(panel.isConnected)panel.textContent='Could not load pack details: '+error.message;}

}

function relicNegated(){return screen==='duel'&&state.run?.curses?.includes('relic_seal')}

// Once-per-Duel relics (user 2026-11-24, after Hoshigan on Discord: Boss Monster gave no sign): the first time one acts
// in a Duel its art shows big over the board (like a relic's own prompt) and its relic bar icon greys out until the Duel
// ends. Per engine.presentationDuel, since solo play reuses one MobileDuel.
const usedRelics={duel:null,keys:new Set()};
const onceRelic=id=>/\bonce per duel\b/i.test(content.artifacts?.[id]?.[2]||'');
function relicUsedSet(){const key=engine?`${engine.presentationDuel}`:null;if(usedRelics.duel!==key||usedRelics.engine!==engine){usedRelics.duel=key;usedRelics.engine=engine;usedRelics.keys=new Set()}return usedRelics.keys}
const relicUsed=id=>screen==='duel'&&relicUsedSet().has(id);
function markRelicUsed(id){relicUsedSet().add(id);for(const el of document.querySelectorAll(`.active-relic-strip [data-relic="${CSS.escape(id)}"]`)){el.classList.add('used');el.setAttribute('aria-label',`${content.artifacts[id]?.[0]||id}: Used this duel. ${content.artifacts[id]?.[2]||''}`)}}
function relicIndicatorMarkup(){return `<div class="active-relic-strip" aria-label="Run relics">${ownedRelics().map(id=>`<button data-do="relic-detail" data-relic="${id}" class="${relicNegated()?'negated':''}${relicUsed(id)?' used':''}" aria-label="${esc(content.artifacts[id]?.[0])}: ${relicNegated()?'Negated this duel. ':''}${relicUsed(id)?'Used this duel. ':''}${esc(content.artifacts[id]?.[2])}">${relicArtwork(relicImage(content.artifactInfo[id].art))}${relicCountBadge(id)}</button>`).join('')}</div>`}

function clockStatus(){const turns=state.run?.clock_turns||0,amount=600-100*Math.floor(turns/10);return `<p class="muted">Now: ${amount>0?`${amount} damage`:amount<0?`heals ${-amount} LP`:'no effect'} · changes in ${10-turns%10} turns</p>`}
// A fused relic's pieces, shown only once the player has fused it (user, 2026-11-05); until then "???".
function fusionMaterialMarkup(id){
 const f=content.fusionMaterials?.[id];if(!f)return '';
 if(!(state.profile?.fused_relics||[]).includes(id))return '<div class="fusion-material"><b>Fusion Material</b><p>???</p></div>';
 const art=p=>content.artifactInfo[p]?.art;
 // Unstable DNA (2026-11-21): pieces it always needs are listed first, then "Any 1 of:" the rest.
 const item=p=>`<li>${art(p)?`<img src="${relicImage(art(p))}" alt="" loading="lazy" decoding="async">`:''}<span>${esc(content.artifacts[p]?.[0]||p)}</span></li>`,need=f.required||[],rest=f.pieces.filter(p=>!need.includes(p)),any=f.needed-need.length;
 return `<div class="fusion-material"><b>Fusion Material</b>${need.length?`<ul>${need.map(item).join('')}</ul>`:''}${any<rest.length?`<small>Any ${any} of:</small>`:''}<ul>${rest.map(item).join('')}</ul></div>`;
}
const relicInfoMarkup=id=>relicCard(content,id,{count:relicCopies(id),extra:fusionMaterialMarkup(id)});
// Fusion hints on piece relics (relic-inspect.js fusionHint): discovered fusions, and this run's (or Tag run's) relics.
setFusionState(()=>({found:state.profile?.fused_relics||[],owned:(tagUI?.view?.run||state.run)?.artifacts||null}));
// Relic windows share relic-inspect.js (2026-11-11): one relic is a single card, the run's relics are an icon grid
// beside the picked relic's card.
const relicCopies=id=>(state.run?.artifacts||[]).filter(x=>x===id).length;
// Relics that grow with the run's Ritual Summons show where they stand now (Discord, Nov 15: Ritual Scar's current ATK).
function ritualCountStatus(id){const n=state.run?.ritual_scar_count||0,atk=id==='cursed_ritual_scar'?100*n-300:id==='grand_ritual_altar'?200*n:null;return atk===null?'':`<small>Currently ${atk>0?'+':''}${atk} ATK</small>`}
function ownedRelicCard(id,allowSell=true){const cursed=(state.run?.cursed_artifacts||[]).includes(id),coins=Math.floor((content.artifacts[id]?.[1]||0)/2);return relicCard(content,id,{count:relicCopies(id),negated:relicNegated(),status:relicNegated()?'NEGATED THIS DUEL':'',extra:fusionMaterialMarkup(id)+(id==='cursed_ominous_clock'?clockStatus():'')+(id==='magic_mirror'&&state.run.mirror_copy?`<small>Current copy: ${esc(content.artifacts[state.run.mirror_copy]?.[0]||'')}</small>`:'')+ritualCountStatus(id),action:allowSell&&screen==='shop'&&!cursed?`<button class="sell-owned-relic" data-do="sell-relic" data-relic="${esc(id)}" aria-label="Sell ${esc(content.artifacts[id][0])} for ${coins} coins">Sell · ${coins} coins</button>`:''})}
// curses: list the Level 6 permanent curses too; never in a duel, where the Curses window shows them.
function relicLedgerMarkup(only=null,allowSell=true,curses=screen!=='duel',pick=null){if(only)return ownedRelicCard(only,allowSell);const r=state.run||{};return relicLedger(content,ownedRelics(),{curses:curses&&r.challenge_level>=6?permanentCurseEntries(content,r.persistent_curses,key=>curseDescription(content,key,r.challenge_level)):[],intro:`Permanent run relics · ${relicNegated()?'Relic Seal negates all duel effects until this duel ends.':'Effects apply when their listed conditions are met.'}`,cards:id=>ownedRelicCard(id,allowSell),counts:relicCopies,negated:relicNegated(),level:state.run?r.challenge_level??0:null,pick})}

// Each sentence is its own text run, so the interface languages translate them (prompt audit, 2026-11-18).
function liveCardDetails(code){if(screen!=='duel'||!snapshot)return '';const rows=[];for(let p=0;p<2;p++)snapshot.players[p].monsters.forEach((c,i)=>{if(!c||c.code!==code||p===1&&!(c.position&5))return;const base=card(code);const delta=c.attack-Math.max(0,base.atk);const defenseDelta=c.defense-Math.max(0,base.defense);const attacking=engine.pending?.player===p&&engine.pending?.type===M.SELECT_BATTLECMD;const available=attacking&&engine.pending.attacks?.some(x=>x.sequence===i);rows.push(`<p class="live-stats">${p?'Opponent':'Your'} zone ${i+1}: ATK ${c.attack} (${delta>=0?'+':''}${delta}) · DEF ${c.defense} (${defenseDelta>=0?'+':''}${defenseDelta}) versus printed stats.${c.position&12?' <span>Defense Position.</span>':''}${attacking?(available?' <span>Attack available.</span>':' <span>Cannot declare an attack right now.</span>'):''}${engine.battleProtected?.[1-p]?' <span>Opposing monsters and LP are protected by Waboku this turn.</span>':''}${p===0&&relicNegated()?' <span>Relic bonuses and penalties are negated.</span>':''}</p>`)});return rows.join('')}

// One portrait per opponent; a stored replay of that duel (the newest 100 are kept) makes it playable.
const replayKey=(started,character,loop,duel)=>[started,character,loop,duel].join(':');
function runReplayStrip(r){if(r.mode==='tag'||!r.timeline?.length)return '';return `<div class="run-replays" data-run-started="${esc(r.started_at)}" data-run-character="${r.character}">${r.timeline.map(x=>{const c=content.characters[x.opponent];return `<button class="run-replay ${x.won?'won':'lost'}" data-do="watch-replay" data-key="${esc(replayKey(r.started_at,r.character,x.loop,x.duel))}" disabled aria-label="${esc(c?.name||'Opponent')}, duel ${x.duel}: no replay"><img loading="lazy" src="assets/${esc(c?.sprite)}" alt=""><span>${x.loop>1?'L'+x.loop+' · ':''}${x.duel}</span></button>`}).join('')}<small class="run-replay-note">Replays of your last 100 duels can be watched. Older ones are deleted automatically.</small></div>`}
async function markRunReplays(){let rows;try{rows=await runReplayIndex()}catch{return}const keys=new Map(rows.map(x=>[replayKey(x.meta.started_at,x.meta.character,x.meta.loop,x.meta.duel),x.id]));for(const b of document.querySelectorAll('.run-replay[data-key]')){const id=keys.get(b.dataset.key);if(!id)continue;b.disabled=false;b.dataset.replay=id;b.classList.add('available');b.setAttribute('aria-label',b.getAttribute('aria-label').replace(': no replay',': watch replay'))}}
async function watchReplay(id){const record=await loadReplay(id).catch(()=>null),meta=(await runReplayIndex()).find(x=>x.id===id)?.meta;if(!record||!meta){toast('This replay is no longer available.');return}
 screen='cpu';clearTimeout(aiTimer);track('duel');cpuViewer=new ReplayViewer({root:app,content,inspect,dialog,record,characters:[meta.character,meta.opponent],onFlag:(duel,context)=>openBehaviourReport(captureBehaviour(duel,context)),onExit:async()=>{cpuViewer=null;collectionKind='history';go('collection')}});}
// Run progress (run-progress.js) on the opponent and shop screens between duels.
function mountRunStrip(){mountRunProgress(app.querySelector('.page'),state.run,{content,dialog},{shop:screen==='shop'})}
function runTimelineMarkup(r){return `<section class="run-timeline"><h3>Run timeline</h3>${(r.timeline||[]).map(x=>`<span class="${x.won?'won':'lost'}">${x.loop>1?'Loop '+x.loop+' · ':''}Duel ${x.duel}: ${esc(content.characters[x.opponent]?.name)} — ${x.won?'Win':'Loss'} · ${x.lp_after_healing.toLocaleString()} LP</span>`).join('')||'<p>Detailed timeline is available for duels played after this update.</p>'}</section>`}



installShopGestures(document,{

 tap:index=>{if(tagUI)return tagUI.action('select',{dataset:{index}}).catch(e=>toast(e.message));if(screen==='shop')return action('select-purchase',{dataset:{index}})},

 hold:index=>{if(tagUI)return tagUI.action('item',{dataset:{index}}).catch(e=>toast(e.message));if(screen==='shop')return action('item-info',{dataset:{index}})}

});



// Run History > Records (user, 2026-11-11, after a player asked how long a duelist took him): for each duelist with a
// recorded run, the highest level cleared and the runs and wins on this device, then wins/runs at each level played.
let historyView='runs';
function characterRecordsMarkup(rows){
 const by=new Map();
 for(const r of rows){const c=content.characters[r.character];if(!c)continue;const e=by.get(r.character)||{id:r.character,name:c.name,sprite:c.sprite,runs:0,wins:0,levels:new Map()};e.runs++;const won=r.result==='complete';if(won)e.wins++;const lv=r.easy?-2:r.challenge_level||0,l=e.levels.get(lv)||[0,0];l[1]++;if(won)l[0]++;e.levels.set(lv,l);by.set(r.character,e)}
 const cleared=id=>Math.min(6,Number(state.profile.character_levels?.[id]??-1));
 const list=[...by.values()].sort((a,b)=>cleared(b.id)-cleared(a.id)||b.wins-a.wins||b.runs-a.runs||a.name.localeCompare(b.name));
 if(!list.length)return '';
 return `<table class="character-records"><thead><tr><th scope="col">Duelist</th><th scope="col">Highest level cleared</th><th scope="col">Runs</th><th scope="col">Wins</th><th scope="col">Win rate</th></tr></thead><tbody>${list.map(e=>`<tr><th scope="row"><img loading="lazy" decoding="async" src="assets/${e.sprite}" alt=""><span><b>${esc(e.name)}</b><small>${[...e.levels].sort((a,b)=>a[0]-b[0]).map(([lv,[w,n]])=>`<i><span>${lv===-2?'Easy':'Level '+lv}</span> ${w}/${n}</i>`).join('')}</small></span></th><td>${cleared(e.id)>=0?`Level ${cleared(e.id)}`:'—'}</td><td>${e.runs}</td><td>${e.wins}</td><td>${Math.round(100*e.wins/e.runs)}%</td></tr>`).join('')}</tbody></table>`;
}
function renderRunHistory(){const rows=state.history||state.profile.run_history||[];shell('Collection',`<div class="collection-nav">${COLLECTION_TABS.map(([k,label])=>btn(label,'collection-kind',`data-kind="${k}"`,k==='history'?'primary':'')).join('')}</div><div class="history-views">${[['runs','Runs'],['records','Records']].map(([k,label])=>btn(label,'history-view',`data-view="${k}" aria-pressed="${historyView===k}"`,historyView===k?'primary':'')).join('')}</div><div class="scroll run-history">${(historyView==='records'?characterRecordsMarkup(rows):rows.map((r,index)=>{const c=content.characters[r.character],date=r.finished_at||r.started_at;return `<article class="panel run-history-row ${r.result==='complete'?'run-won':'run-lost'}"><button class="run-history-card" data-do="run-card-view" data-index="${index}" aria-label="View run card"><img loading="lazy" src="assets/${c?.sprite}" alt=""><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/></svg></button><div><h2>${esc(c?.name||'Unknown character')} · ${r.result==='complete'?'Completed':'Lost'}</h2><p>${r.mode==='tag'?'Tag with '+esc(content.characters[r.partner]?.name||'teammate'):'Solo'} · ${r.easy?'Easy':'LVL '+(r.challenge_level||0)} · Loop ${(r.loop||0)+1} · ${r.round||0}/9 victories</p><p>${date?new Date(date*1000).toLocaleString():'Date not recorded'} · ${r.lp||0} LP · ${coinLabel(r.gold)} coins</p>${r.loss?.text?`<p>${esc(r.loss.text)}</p>`:''}<details><summary>Run details &amp; replays</summary>${runReplayStrip(r)}<p>Relics: ${(r.artifacts||[]).filter(id=>content.artifacts[id]).map(id=>esc(content.artifacts[id][0])).join(', ')||'None'}</p>${r.encore_won?'<p>Optional champion defeated.</p>':''}${runTimelineMarkup(r)}</details></div></article>`}).join(''))||'<div class="panel"><h2>No recorded runs yet</h2><p>Completed and lost runs will appear here. Older runs that were already deleted cannot be reconstructed.</p></div>'}</div>`);void markRunReplays()}



document.addEventListener('click',e=>{const x=e.target.closest('[data-effect-search-clear]');if(x&&['draft','collection'].includes(x.dataset.effectSearchClear)){clearSearch(x.dataset.effectSearchClear);if(x.dataset.effectSearchClear==='draft')resetDraftFilters();collectionPage=0;screen==='draft'?renderDraft():renderCollection();return}const b=e.target.closest('[data-effect-search]');if(!b||!['draft','collection'].includes(b.dataset.effectSearch))return;openSearch(b.dataset.effectSearch, b.dataset.effectSearch==='draft'?state.run.pool.map(card):content.cards,()=>{collectionPage=0;screen==='draft'?renderDraft():renderCollection()})});



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



startStats(()=>!cpuViewer&&!lesson&&!['loading','title','settings','cosmetics','collection','achievements','tutorial','gallery'].includes(screen));

const statsSince=date=>date?`<p>Since ${esc(new Date(date).toLocaleDateString())}</p>`:'';

// Character Stats: every player's finished runs, one row per character, wins / losses per challenge level.
// Pressing a character opens its record against each CPU, by tier (user, 2026-11-24).
let characterStatsCpu=null;
async function renderCharacterStats(){
 if(Number.isInteger(characterStatsCpu)&&content.characters[characterStatsCpu])return renderCharacterCpu(characterStatsCpu);characterStatsCpu=null;
 shell('Stats',`${statsNavigation('characters')}<div class="scroll character-stats" id="character-stats-panel"><p>Loading worldwide results…</p></div>`);
 const panel=document.querySelector('#character-stats-panel'),levels=[-1,0,1,2,3,4,5,6];
 try{const s=await fetchStats();if(!panel.isConnected)return;const results=s.results||{},count=(i,l,k)=>Number(results[`${i}:${l}:${k}`])||0;
  // Cells are shaded red to green by win rate; a single run only tints faintly, so small samples don't shout.
  const shade=(w,l)=>{const n=w+l,rate=w/n;return `background:hsla(${Math.round(rate*120)},55%,42%,${(Math.min(1,n/10)*.35+.06).toFixed(2)})`};
  const pct=(w,l)=>w+l?Math.round(100*w/(w+l))+'%':'–';
  // Most played characters first.
  const played=i=>levels.reduce((n,l)=>n+count(i,l,'w')+count(i,l,'l'),0);
  const rows=[...(content.playable||[])].sort((a,b)=>played(b)-played(a)).map(i=>{let tw=0,tl=0;const cells=levels.map(l=>{const w=count(i,l,'w'),lost=count(i,l,'l');tw+=w;tl+=lost;return w||lost?`<td data-v="${w/(w+lost)}" data-n="${w+lost}" style="${shade(w,lost)}" title="${pct(w,lost)} win rate"><span class="cs-w" title="Wins">${w}</span><span class="cs-sep">/</span><span class="cs-l" title="Losses">${lost}</span></td>`:'<td class="cs-none">–</td>'}).join('');
   return `<tr data-name="${esc(content.characters[i]?.name||'')}"><th scope="row"><button type="button" class="relic-stats-name" data-do="character-stats-cpu" data-duelist="${i}">${esc(content.characters[i]?.name||'?')}</button></th>${cells}<td class="cs-rate" ${tw+tl?`data-v="${tw/(tw+tl)}" data-n="${tw+tl}" style="${shade(tw,tl)}"`:''}>${pct(tw,tl)}<small>${tw+tl?`${tw+tl} ${tw+tl===1?'run':'runs'}`:''}</small></td></tr>`}).join('');
  panel.innerHTML=`${statsSince(s.resultsSince)}${statsSearch('characters','Search characters')}<div class="character-stats-wrap"><table class="character-stats-table"><thead><tr><th scope="col">Character</th>${levels.map(l=>`<th scope="col">Lvl ${l}</th>`).join('')}<th scope="col">Win rate</th></tr></thead><tbody>${rows}</tbody></table></div><p class="stats-no-match" hidden>No matching characters.</p>`;sortableStats(panel,'characters');
 }catch(error){const reason=await explainOnlineError(error);if(panel.isConnected)panel.innerHTML=`<p>${esc(reason)}</p>${btn('Retry','character-stats-retry')}`}
}

// CPU Stats (user, 2026-11-24): every player's finished solo duels against each CPU, grouped by the tier of the deck
// it played; pressing an opponent shows its record against each player character. Counts arrive as the player's
// [wins, losses] (global-stats.js recordCpuResult) and are shown from the CPU's side. Read only when this tab is open,
// and kept for a minute so going back and forth costs no extra requests.
// One tab per tier (user, 2026-11-24: "otherwise it will be one massive list"); the chosen tab is shared by the overview
// and an opponent's page, so pressing a Tier 2 opponent opens its Tier 2 record.
let cpuStatsOpponent=null,cpuStatsTier='1';const cpuStatsCache=new Map();
const cpuTierTabs=(groups,selected,action='cpu-stats-tier')=>`<div class="device-record-tabs cpu-tier-tabs" role="tablist">${groups.map(([k,label])=>btn(label,action,`data-tier="${k}" role="tab" aria-selected="${k===selected}"`,k===selected?'primary':'')).join('')}</div>`;
async function cachedCpuStats(opponent,character=null){const key=character!==null?'c'+character:opponent??'all',hit=cpuStatsCache.get(key);if(hit&&Date.now()-hit.at<60000)return hit.data;const data=await fetchCpuStats(opponent,character);cpuStatsCache.set(key,{at:Date.now(),data});return data}
const cpuTierLabel=t=>Number(t)===0?'Opening duel':'Tier '+t;
function cpuStatsTable(first,list,player=false){
 // list: [{id,name,sprite,w,l}] from the player's side. The CPU tab shows CPU wins (= player losses) first; a player
 // character's page (player=true) shows that duelist's own wins.
 const shade=(cw,n)=>`background:hsla(${Math.round(cw/n*120)},55%,42%,${(Math.min(1,n/10)*.35+.06).toFixed(2)})`,heads=player?['Wins','Losses','Win rate']:['CPU wins','CPU losses','CPU win rate'];
 return `<div class="character-stats-wrap"><table class="character-stats-table relic-stats-table cpu-stats-table"><thead><tr><th scope="col">${first}</th><th scope="col">Duels</th>${heads.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${list.map(t=>{const n=t.w+t.l,cw=player?t.w:t.l,rate=cw/n,name=esc(t.name),portrait=t.sprite?`<img loading="lazy" decoding="async" src="assets/${esc(t.sprite)}" alt="">`:'';
  return `<tr data-name="${name}"><th scope="row">${t.open?`<button type="button" class="relic-stats-name" data-do="cpu-stats-opponent" data-opponent="${t.id}">${portrait}${name}</button>`:`<span class="cpu-stats-name">${portrait}${name}</span>`}</th><td data-v="${n}" data-n="${n}">${n}</td><td class="cs-w" data-v="${cw}" data-n="${n}">${cw}</td><td class="cs-l" data-v="${n-cw}" data-n="${n}">${n-cw}</td><td class="cs-rate" data-v="${rate}" data-n="${n}" style="${shade(cw,n)}">${Math.round(100*rate)}%</td></tr>`}).join('')}</tbody></table></div>`;
}
// Tier groups for tabs: Opening duel, Tier 1-4, and Tier 4's Ultimate Collector decks apart.
function cpuGroups(tiers,open){const groups=[];for(const t of ['0','1','2','3','4']){const rows=cpuRows(tiers[t]).map(r=>({...r,open}));if(t==='4'){const uc=rows.filter(r=>content.characters[r.id].ultimate_collector);groups.push(['4','Tier 4',rows.filter(r=>!uc.includes(r))],['uc','Ultimate Collectors',uc])}else groups.push([t,cpuTierLabel(t),rows])}return groups.filter(([,,rows])=>rows.length)}
async function renderCharacterCpu(character){
 const c=content.characters[character];
 shell('Stats',`${statsNavigation('characters')}<div class="scroll character-stats cpu-stats" id="character-cpu-panel"><p>Loading CPU results…</p></div>`);
 const panel=document.querySelector('#character-cpu-panel'),head=`<div class="cpu-stats-head">${btn('Back','character-stats-back')}<img src="assets/${esc(c.sprite)}" alt=""><h2>${esc(c.name)}</h2></div>`;
 try{const s=await cachedCpuStats(null,character);if(!panel.isConnected)return;
  const shown=cpuGroups(s.tiers||{},false),pick=shown.find(([k])=>k===cpuStatsTier)||shown.find(([k])=>k==='1')||shown[0];if(pick)cpuStatsTier=pick[0];
  panel.innerHTML=`${head}${statsSince(s.since)}${pick?`${cpuTierTabs(shown,pick[0],'character-cpu-tier')}${statsSearch('character-cpu','Search opponents')}<div class="stats-group">${cpuStatsTable('Opponent',pick[2],true)}</div><p class="stats-no-match" hidden>No matching opponents.</p>`:'<p>No CPU duels for this duelist yet.</p>'}`;
  if(pick)sortableStats(panel,'character-cpu');
 }catch(error){const reason=await explainOnlineError(error);if(panel.isConnected)panel.innerHTML=`${head}<p>${esc(reason)}</p>${btn('Retry','cpu-stats-retry')}`}
}
const cpuRows=group=>Object.entries(group||{}).map(([id,[w,l]])=>({id:Number(id),w:Number(w)||0,l:Number(l)||0})).filter(t=>t.w+t.l>0&&content.characters[t.id]).map(t=>({...t,name:content.characters[t.id].name,sprite:content.characters[t.id].sprite})).sort((a,b)=>b.w+b.l-(a.w+a.l)||b.l-a.l);
async function renderCpuStats(){
 const opponent=Number.isInteger(cpuStatsOpponent)&&content.characters[cpuStatsOpponent]?cpuStatsOpponent:null;cpuStatsOpponent=opponent;
 shell('Stats',`${statsNavigation('cpu')}<div class="scroll character-stats cpu-stats" id="cpu-stats-panel"><p>Loading CPU results…</p></div>`);
 const panel=document.querySelector('#cpu-stats-panel');
 try{const s=await cachedCpuStats(opponent);if(!panel.isConnected)return;const tiers=s.tiers||{},order=['0','1','2','3','4'];
  if(opponent===null){
   // Tabs only for tiers with results; the chosen one falls back to Tier 1, then the first with results.
   const shown=cpuGroups(tiers,true),pick=shown.find(([k])=>k===cpuStatsTier)||shown.find(([k])=>k==='1')||shown[0];if(pick)cpuStatsTier=pick[0];
   panel.innerHTML=`${statsSince(s.since)}${pick?`${cpuTierTabs(shown,pick[0])}${statsSearch('cpu','Search opponents')}<div class="stats-group">${cpuStatsTable('Opponent',pick[2])}</div><p class="stats-no-match" hidden>No matching opponents.</p>`:'<p>No CPU duels recorded yet.</p>'}`;
   if(pick)sortableStats(panel,'cpu');return;
  }
  // An Ultimate Collector's duels are its Tier 4 ones.
  const c=content.characters[opponent],want=cpuStatsTier==='uc'?'4':cpuStatsTier,shown=order.map(t=>[t,t==='4'&&c.ultimate_collector?'Ultimate Collectors':cpuTierLabel(t),cpuRows(tiers[t])]).filter(([,,rows])=>rows.length),pick=shown.find(([k])=>k===want)||shown[0];
  panel.innerHTML=`<div class="cpu-stats-head">${btn('Back','cpu-stats-back')}<img src="assets/${esc(c.sprite)}" alt=""><h2>${esc(c.name)}</h2></div>${statsSince(s.since)}${pick?`${cpuTierTabs(shown,pick[0])}${statsSearch('cpu-opponent','Search characters')}<div class="stats-group">${cpuStatsTable('Character',pick[2])}</div><p class="stats-no-match" hidden>No matching characters.</p>`:'<p>No duels against this CPU yet.</p>'}`;
  if(pick)sortableStats(panel,'cpu-opponent');
 }catch(error){const reason=await explainOnlineError(error);if(panel.isConnected)panel.innerHTML=`${opponent===null?'':btn('Back','cpu-stats-back')}<p>${esc(reason)}</p>${btn('Retry','cpu-stats-retry')}`}
}

async function renderGlobalStats(){

 shell('Stats',`${statsNavigation('global')}<div class="scroll" id="global-stats-panel"><p>Loading worldwide totals…</p></div>`);

 const panel=document.querySelector('#global-stats-panel');

 try{const s=await fetchStats();if(!panel.isConnected)return;panel.innerHTML=`${statsSince(s.since)}<div class="global-stats-grid">${[['Total Players',s.firstTimePlayers ?? s.devices],['Runs started',s.runs],['Duels started',s.duels],['Duels won',s.wins],['Duels lost',s.losses],['Active play hours',(s.seconds/3600).toFixed(1)]].map(([label,value])=>`<section class="panel" ${label==='Total Players'?'data-do="device-secret" role="button" tabindex="0" aria-label="Total Players"':''}><h2>${esc(Number(value).toLocaleString())}</h2><p>${label}</p></section>`).join('')}</div>${relicStatsMarkup(s.results||{})}`;const relics=panel.querySelector('.relic-stats');if(relics)sortableStats(relics,'relics')}catch(error){const reason=await explainOnlineError(error);if(panel.isConnected)panel.innerHTML=`<p>${esc(reason)}</p>${btn('Retry','global-stats-retry')}`}

}



// Finished solo runs per relic held at the end ("r:relic:w|l"), most played first. Retired relics are left out.
function relicStatsMarkup(results){
 const tally=new Map();for(const [k,n] of Object.entries(results)){const m=/^r:([a-z0-9_]+):([wl])$/.exec(k);if(!m||!content.artifacts[m[1]]||(content.retiredArtifacts||[]).includes(m[1]))continue;const t=tally.get(m[1])||{id:m[1],w:0,l:0};t[m[2]]+=Number(n)||0;tally.set(m[1],t)}
 const rows=[...tally.values()].sort((a,b)=>b.w+b.l-(a.w+a.l)||b.w-a.w);if(!rows.length)return '';
 const table=(title,list)=>list.length?`<div class="stats-group"><h2>${title}</h2><div class="character-stats-wrap"><table class="character-stats-table relic-stats-table"><thead><tr><th scope="col">Relic</th><th scope="col">Runs</th><th scope="col">Won</th><th scope="col">Win rate</th></tr></thead><tbody>${list.map(t=>{const n=t.w+t.l,rate=t.w/n;return `<tr data-name="${esc(content.artifacts[t.id][0])}"><th scope="row"><button type="button" class="relic-stats-name" data-do="stats-relic" data-relic="${esc(t.id)}" aria-label="Inspect ${esc(content.artifacts[t.id][0])}"><img loading="lazy" decoding="async" src="${relicImage(content.artifactInfo[t.id]?.art)}" alt="">${esc(content.artifacts[t.id][0])}</button></th><td data-v="${n}" data-n="${t.w}">${n}</td><td data-v="${t.w}" data-n="${n}">${t.w}</td><td class="cs-rate" data-v="${rate}" data-n="${n}" style="background:hsla(${Math.round(rate*120)},55%,42%,${(Math.min(1,n/10)*.35+.06).toFixed(2)})">${Math.round(100*rate)}%</td></tr>`}).join('')}</tbody></table></div></div>`:'';
 return `<section class="relic-stats"><p>Finished solo runs by the relics they ended with.</p>${statsSearch('relics','Search relics')}${table('Relics',rows.filter(t=>!t.id.startsWith('cursed_')))}${table('Shadow relics',rows.filter(t=>t.id.startsWith('cursed_')))}<p class="stats-no-match" hidden>No matching relics.</p></section>`;
}

// Stats tables: tap a column heading to sort by it (again to reverse); the search box filters rows by name.
// Rows with no runs in the sorted column stay last; ties keep the most played order. The choice lasts until the game closes.
const statsView={};
const statsSearch=(key,label)=>`<input type="search" class="stats-search" placeholder="${label}" aria-label="${label}" value="${esc(statsView[key]?.q||'')}" autocomplete="off" spellcheck="false">`;
function sortableStats(root,key){
 const view=statsView[key]||={q:'',col:-1,dir:1},tables=[...root.querySelectorAll('table')],fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 for(const table of tables){[...table.tBodies[0].rows].forEach((row,i)=>row.dataset.i=i);[...table.tHead.rows[0].cells].forEach((th,i)=>th.innerHTML=`<button type="button" class="stats-sort" data-col="${i}">${th.innerHTML}</button>`)}
 const sort=()=>{for(const table of tables){const body=table.tBodies[0],rows=[...body.rows],col=view.col,value=row=>{const c=row.cells[col];return c?.dataset.v===undefined?null:Number(c.dataset.v)};
   if(col===0)rows.sort((a,b)=>view.dir*a.cells[0].textContent.trim().localeCompare(b.cells[0].textContent.trim()));
   else if(col>0)rows.sort((a,b)=>{const x=value(a),y=value(b);if(x===null||y===null)return (x===null)-(y===null)||a.dataset.i-b.dataset.i;return view.dir*(x-y)||Number(b.cells[col].dataset.n)-Number(a.cells[col].dataset.n)||a.dataset.i-b.dataset.i});
   else rows.sort((a,b)=>a.dataset.i-b.dataset.i);
   body.append(...rows);[...table.tHead.rows[0].cells].forEach((th,i)=>i===col?th.setAttribute('aria-sort',view.dir>0?'ascending':'descending'):th.removeAttribute('aria-sort'))}};
 const filter=()=>{const q=fold(view.q).trim();let shown=0;for(const table of tables){let visible=0;for(const row of table.tBodies[0].rows){row.hidden=!!q&&!fold(row.dataset.name+' '+row.cells[0].textContent).includes(q);visible+=!row.hidden}shown+=visible;(table.closest('.stats-group')||table.closest('.character-stats-wrap')).hidden=!visible}
  const none=root.querySelector('.stats-no-match');if(none)none.hidden=!!shown||!q};
 root.addEventListener('click',event=>{const b=event.target.closest('.stats-sort');if(!b||!root.contains(b))return;const col=Number(b.dataset.col);view.dir=view.col===col?-view.dir:col?-1:1;view.col=col;sort()});
 root.querySelector('.stats-search')?.addEventListener('input',event=>{view.q=event.target.value;filter()});
 if(view.col>=0)sort();filter();
}

const coinMilestones=new WeakMap(),duelAnimations=new WeakMap(),coinProgress=new WeakMap();

const coinVoicePool=Array.from({length:3},()=>new Audio());let coinVoiceIndex=0;

function stopCoinSounds(){for(const voice of coinVoicePool){voice.pause();voice.removeAttribute('src');voice.load()}}

let lastCoinSound=-1;

// Pickups that land during a finisher are 6 dB quieter, under its voice line.
function playCoinPickup(gain=1){

 const volume=(state.settings.sound||0)/100;if(!volume||document.hidden)return;

 const choices=[0,1,2].filter(i=>i!==lastCoinSound),pick=choices[Math.floor(Math.random()*choices.length)];lastCoinSound=pick;

 const sound=coinVoicePool[coinVoiceIndex++%coinVoicePool.length];sound.pause();sound.src=assetURL('sound/coin-pickup'+(pick?'-'+(pick+1):'')+'.wav');sound.load();balancedVolume(sound,volume,(juice.finisherPlaying()?.38:.75)*gain);sound.play().catch(()=>{});

}

function duelAnimationState(owner){let state=duelAnimations.get(owner);if(!state){state={pending:new Set(),nextCoinAt:0,lane:0,bossVictoryShown:false};duelAnimations.set(owner,state)}return state}

function trackDuelAnimation(owner,promise){const state=duelAnimationState(owner);promise=capWait(promise,12000);state.pending.add(promise);promise.finally(()=>state.pending.delete(promise));return promise}

const VICTORY_HOLD=800;
async function finishDuelAnimations(owner){

 // The PERFECT or overkill finisher has the screen to itself before the victory banners.
 await capWait(juice.finisherDone(),8000);
 const animations=duelAnimationState(owner);let banner;
 if(!animations.bossVictoryShown&&snapshot?.finished?.player===0&&!isCardWin(snapshot.finished)&&(state.run?.encore_active||((state.run?.round||0)+1)%3===0)){animations.bossVictoryShown=true;if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const field=document.querySelector('.field-wrap');if(field){const box=pageRect(field),flash=document.createElement('div');flash.setAttribute('aria-hidden','true');Object.assign(flash.style,{position:'fixed',left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px',zIndex:300,pointerEvents:'none',background:'radial-gradient(ellipse at center, #ffe28c88 0%, #ffd45b33 52%, transparent 78%)'});document.body.append(flash);const animation=flash.animate([{opacity:0},{opacity:.9,offset:.35},{opacity:0}],{duration:760,easing:'ease-out'});await animationSettled(animation);flash.remove()}}}
 let shown=0;
 // This runs after the last cues and again when the duel closes; the tutorial's banner plays once.
 if((animations.pending.size||lesson&&!animations.lessonBanner)&&snapshot?.finished?.player===0&&!isCardWin(snapshot.finished)&&!document.querySelector('.victory-settlement')){

  const field=document.querySelector('.field-wrap');

  if(field){const box=pageRect(field);banner=document.createElement('div');banner.className='victory-settlement';banner.setAttribute('role','status');banner.innerHTML='<div class="victory-rays"></div><div class="victory-title"><span>DUEL WON</span><strong>VICTORY</strong>'+(lesson?'':'<small>Collecting battle rewards</small>')+'</div>';Object.assign(banner.style,{left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px'});document.body.append(banner);shown=performance.now();if(lesson)animations.lessonBanner=true;}

 }

 try{while(animations.pending.size)await Promise.all([...animations.pending]);if(banner){const left=VICTORY_HOLD-(performance.now()-shown);if(left>0)await new Promise(resolve=>setTimeout(resolve,left))}}finally{banner?.remove();}

}

async function updateCoinMilestones(silent=false){

 if(!engine||!snapshot||snapshot.tag?.pvp||!py||lesson)return;

 const owner=engine,run=state.run,events=owner.tagFacade?snapshot.tag.rewardEvents:owner.summary();if(!events)return;

 try{

  // A pure calculation: skip the Python round trip when none of its inputs changed since the last move.
  const request={run:{lp:snapshot.lp[0],round:run.round,character:run.character,guaranteed:run.guaranteed,artifacts:run.artifacts,encore_active:run.encore_active},events,victory:snapshot.finished?.player===0};
  const key=JSON.stringify(request),cached=coinProgress.get(owner),earned=cached?.key===key?cached.earned:await command('reward-progress',request);
  coinProgress.set(owner,{key,earned});

  if(owner!==engine||screen!=='duel')return;

  refreshCoinBonuses(earned);

  const seen=coinMilestones.get(owner)||new Set();coinMilestones.set(owner,seen);const animation=duelAnimationState(owner);

  // The "+N coins" pop-ups during the duel follow Coin Reward Pop-ups and Coin & Shop Effects, like the payout window's
  // texts (juice.rewardText); turned off they still played (player report, 2026-11-24).
  const popups=effectOn('coins')&&effectOn('coinText');
  for(const [label,coins] of Object.entries(earned)){if(seen.has(label))continue;seen.add(label);if(silent||!popups)continue;

   const now=Date.now(),wait=Math.max(0,animation.nextCoinAt-now),lane=animation.lane++%3;animation.nextCoinAt=now+wait+336;trackDuelAnimation(owner,new Promise(resolve=>setTimeout(()=>{if(engine!==owner||screen!=='duel'){resolve();return}const field=document.querySelector('.field-wrap');if(!field){resolve();return}const box=pageRect(field),el=document.createElement('div');el.className='float-coins';el.title=label;el.setAttribute('aria-label',label+': +'+coins+' coins');el.innerHTML=`<b>+${coins}</b><img src="assets/ui/coins.png" alt="coins">`;Object.assign(el.style,{left:box.left+box.width*(.38+lane*.12)+'px',top:box.top+box.height*.76+'px'});document.body.append(el);setTimeout(()=>{el.remove();resolve()},2040);playCoinPickup();},wait)));

  }

 }catch(error){console.warn('Coin milestone preview unavailable',error.message)}

}



function renderPersonalStats(){

 const p=state.profile,rows=state.history||p.run_history||[],won=rows.filter(r=>r.result==='complete').length,first=Math.min(...rows.map(r=>r.started_at||r.finished_at||Infinity));

 const metrics=[['Active hours played',Math.round(personalPlaySeconds()/360)/10],['Runs started',Math.max(p.runs||0,rows.length,p.wins||0)],['Runs won',p.wins||0],['Duels won',p.victories||0],['Recorded runs lost',rows.length-won],['Characters unlocked',p.unlocked?.length||0],['Most coins held',p.max_gold||0],['Most relics held',p.max_artifacts||0],['Singles bought',p.singles_bought||0],['Starter decks bought',p.decks_bought||0]];

 shell('Stats',`${statsNavigation('personal')}<div class="scroll personal-stats">${statsSince(Number.isFinite(first)&&first*1000)}<div class="personal-stat-grid">${metrics.map(([name,n])=>`<article class="panel"><strong>${Number(n).toLocaleString()}</strong><span>${name}</span></article>`).join('')}</div><section class="device-records"><div class="device-record-tabs" role="tablist">${[['collectors','Fallen Ultimate Collectors'],['opponents','Opponents']].map(([k,label])=>btn(label,'device-stats-tab',`data-tab="${k}" role="tab" aria-selected="${k===deviceStatsTab}"`,k===deviceStatsTab?'primary':'')).join('')}</div>${deviceStatsTab==='opponents'?`<section id="opponent-records">${opponentRecordMarkup(rows)}</section>`:'<section id="defeated-collectors"><h2>Defeated Ultimate Collector duelists</h2><p>Loading records…</p></section>'}</section></div>`);

 if(deviceStatsTab==='collectors')void loadDefeatedCollectors();

}

let deviceStatsTab='collectors';
// Wins and losses per opponent from Run History timelines. Runs saved before timelines were recorded can't add to it.
function opponentRecords(rows){const tally=new Map();for(const r of rows)for(const x of r.timeline||[]){const t=tally.get(x.opponent)||{opponent:x.opponent,w:0,l:0};if(x.won)t.w++;else t.l++;tally.set(x.opponent,t)}return [...tally.values()].sort((a,b)=>b.w+b.l-(a.w+a.l)||b.w-a.w)}
function opponentRecordMarkup(rows){const list=opponentRecords(rows);return `<h2>Opponents faced</h2><p>Every duel in Run History, most played first. Runs from before duel timelines were saved aren't counted.</p>${list.length?`<div class="opponent-record-grid">${list.map(t=>{const c=content.characters[t.opponent];return `<article class="opponent-record"><img loading="lazy" decoding="async" src="assets/${esc(c?.sprite)}" alt=""><b>${esc(c?.name||'Unknown duelist')}</b><span><em class="cs-w">${t.w}</em> W · <em class="cs-l">${t.l}</em> L</span></article>`}).join('')}</div>`:'<p>No recorded duels yet.</p>'}`}



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

 dialog('Link devices',`<p>Sync unlocked characters, completed achievements, card sleeves, challenge levels and secret unlocks. Runs, cards, Ultimate Collector duelists and device statistics stay on this device.</p>${message}<p>${linked?'This device is linked. Unlocks sync automatically while online in menus.':'Generate a code here, then enter it on your other device.'}</p>${btn('Generate code','device-sync-create')}${linked?btn('Sync now','device-sync-now')+btn('Disconnect this device','device-sync-unlink'):`<label>Code from your other device <input id="device-link-code" maxlength="12" autocapitalize="characters" autocomplete="off" spellcheck="false"></label>${btn('Link Devices','device-sync-join')}`}`);

}

// Linked devices sync unlocks (2026-11-11, fewer Cloudflare requests): at start, the next time a menu is open after a
// duel or run ends or an unlock changes, after the app was hidden 10+ minutes, and otherwise every 15 minutes in menus.
// The 60 s tick below is local only; it sends nothing unless one of those is due.
let deviceSyncTimer,deviceSyncDue=true,deviceSyncAt=0,deviceSyncHiddenAt=0,deviceSyncUnlocks=null;
const DEVICE_SYNC_EVERY=900000,DEVICE_SYNC_AFTER_HIDDEN=600000;
const syncedUnlocks=p=>p?JSON.stringify([p.unlocked,p.character_levels,p.gallery_unlocked,p.relicless_unlocked,p.cpu_viewer_unlocked]):'';
function noteDeviceSyncChange(action){if(action==='device-sync-read')return;const now=syncedUnlocks(state?.profile);if(action!=='device-sync-merge'&&(action==='finish'||deviceSyncUnlocks!==null&&now!==deviceSyncUnlocks))deviceSyncDue=true;deviceSyncUnlocks=now}
document.addEventListener('visibilitychange',()=>{if(document.hidden){deviceSyncHiddenAt=Date.now();return}if(deviceSyncHiddenAt&&Date.now()-deviceSyncHiddenAt>=DEVICE_SYNC_AFTER_HIDDEN)deviceSyncDue=true;deviceSyncHiddenAt=0});

function startDeviceSync(){

 clearInterval(deviceSyncTimer);

 const sync=async()=>{if(deviceSync.linked===false||document.hidden||navigator.onLine===false||tagUI||!['title','settings','collection','stats','achievements','characters'].includes(screen)||quotaPausedUntil('progress'))return;if(!deviceSyncDue&&Date.now()-deviceSyncAt<DEVICE_SYNC_EVERY)return;deviceSyncDue=false;deviceSyncAt=Date.now();try{const before=JSON.stringify(state.profile),result=await deviceSync.run('sync');if(result.linked&&before!==JSON.stringify(state.profile)&&!modal.open&&!tagUI&&['title','collection','stats','achievements','characters'].includes(screen))render();}catch{/* Retry on the next menu sync; offline play keeps working. */}};

 void sync();deviceSyncTimer=setInterval(sync,60000);

}



// Recovery is explicit; normal background backups never replace local progress.

const loadDeviceSave=async()=>window.ShadowNative?await ShadowNative.load():localStorage.getItem('shadow-run-mobile')||'{}';
const storeDeviceSave=async data=>{if(window.ShadowNative){if(!await ShadowNative.store(data))throw Error('Could not save recovered progress.')}else localStorage.setItem('shadow-run-mobile',data)};

// Cloud save (device-backup.js): the first-start question is asked once, and the code dialog is the one place
// that explains it. cloudRestore holds a found save until the player confirms.
const CLOUD_ASKED='ygo-cloud-save-asked';let cloudRestore=null;
function showCloudCode(intro){const code=deviceBackup.status().code;if(code)dialog('Cloud save code',cloudCodeMarkup(code,intro,btn,esc))}
// Firefox notice (user, 2026-11-13): every time the game opens in Firefox, explain that Compatibility Mode is on there
// because effects flickered a lot otherwise, and suggest another browser. Shown after any startup dialog closes.
// Sound effects this device could not decode (boot step 6 goes on without them, 2026-11-24). Shown once per device and
// again only if it still happens after an update. The Linux app's WebKitGTK decodes audio through GStreamer: its
// "good" plugins play the WAV and MP3 effects, libav the music.
function soundNotice(check){
 // The music is AAC (.m4a). The Linux app's GStreamer plays it only with libav, which Debian and Ubuntu leave out, so a
 // player had sound effects but no music and no hint why (2026-11-24). canPlayType asks the media engine itself.
 const linux=window.ShadowDesktop?.platform==='linux';
 let noMusic=false;if(linux)try{noMusic=!document.createElement('audio').canPlayType('audio/mp4; codecs="mp4a.40.2"')}catch{}
 if(!check?.undecodable&&!noMusic)return;
 const key='ygo-sound-notice',seen=(()=>{try{return localStorage.getItem(key)}catch{return null}})();if(seen===replayVersion)return;
 if(modal.open){modal.addEventListener('close',()=>setTimeout(()=>soundNotice(check),300),{once:true});return}
 try{localStorage.setItem(key,replayVersion)}catch{}
 const effects=!!check?.undecodable;
 dialog(effects?'Sound effects are off':'Music is off',`<p>${esc(effects?'This device could not play the game\'s sound effects, so the game runs without them.':'This device cannot play the game\'s music, so the game runs without it.')}</p>${linux
  ?`<p>${esc('The Linux app plays sound through GStreamer. Install its "good" plugins and libav with your package manager, then restart the game:')}</p><pre class="sound-help">Ubuntu, Debian, Mint: gstreamer1.0-plugins-good gstreamer1.0-libav\nFedora: gstreamer1-plugins-good gstreamer1-plugin-libav\nArch, Manjaro: gst-plugins-good gst-libav\nopenSUSE: gstreamer-plugins-good gstreamer-plugins-libav</pre>`
  :`<p>${esc('Updating your browser, or trying another one, usually fixes this.')}</p>`}`);
}
function firefoxNotice(){
 if(window.ShadowNative||!compatibilityBrowser())return;
 if(modal.open){modal.addEventListener('close',()=>setTimeout(firefoxNotice,300),{once:true});return}
 const on=compatibilityEnabled();
 dialog('Playing on Firefox',`<p>${esc(on?"Many of the game's effects flicker a lot in Firefox, so Compatibility Mode is on: blur, glow, 3D card turns and animated backgrounds are replaced with simpler versions.":"Compatibility Mode is off, so many of the game's effects may flicker a lot in Firefox.")}</p><p>${esc("For the full look and smoother animations, play in Chrome, Edge, Opera or Safari, or install the Android app.")}</p>${on?`<p class="muted">${esc("You can turn Compatibility Mode off in Settings › Display, but you may see flickering.")}</p>`:''}<div class="actions">${btn('OK','close')}</div>`);
}
function cloudStartup(newDevice){
 deviceBackup.migrate();const notice=deviceBackup.notice();
 if(notice){deviceBackup.clearNotice();showCloudCode(notice==='changed'?'Your cloud save needed a new code. Your new code:':'Cloud save is now encrypted with a code that only you have. Your code:');return}
 if(newDevice&&localStorage.getItem('ygo-cloud-saves-enabled')===null&&!localStorage.getItem(CLOUD_ASKED)){localStorage.setItem(CLOUD_ASKED,'true');dialog('Cloud save',cloudFirstBootMarkup(btn))}
}

document.addEventListener('change',async event=>{

 if(event.target.id!=='device-recovery-file')return;

 try{const file=event.target.files[0];if(!file)return;if(file.size>16*1024*1024)throw Error('Recovery file is too large.');let recovery;try{recovery=recoveryFromFile(JSON.parse(await file.text()))}catch(error){throw error instanceof SyntaxError?Error('Choose a save file exported from the game.'):error}validateRecovery(recovery);

 if(!confirm('Import this save? This replaces current runs, progress and Ultimate Collectors.'))return;

 deviceBackup.destroy();

 await restoreRecovery(recovery,{loadSave:loadDeviceSave,storeSave:storeDeviceSave});

 location.reload();

 }catch(error){deviceBackup.resume();dialog('Save recovery',`<p>${esc(error.message)}</p>`)}finally{event.target.value=''}

});



window.addEventListener('resize',()=>tagUI?.drawTurnTimer?.());



// Hover previews share the same facts as Inspect, including per-copy stat changes.

installHandHover(app);
// Opens the card window for a card tile (controller X, the Inspect hotkey).
function inspectElement(el){const id=Number(el.dataset.inspect||el.dataset.preview||el.dataset.code||el.dataset.id);if(!id||!card(id))return false;if(screen==='duel')setPreview(id,el);noteCardNavSource(el);inspect(id);return true}
// Controller buttons replay existing inputs; these hooks cover what has no pointer equivalent.
const padUsable=el=>!!el&&!el.disabled&&el.checkVisibility();
// Y in the deck editor hides or shows the controller's hover details (this session only).
let padDetailsHidden=false;
// Stable ids for engine prompt objects, so the controller snap can tell prompts apart.
const padPromptIds=new WeakMap();let padPromptCount=0;
function padPromptId(){const p=promptKey();if(!p||typeof p!=='object')return String(p);if(!padPromptIds.has(p))padPromptIds.set(p,++padPromptCount);return padPromptIds.get(p)}
installGamepad({
 screen:()=>screen,
 phaseButton:()=>nextPhaseButton(app)||[...app.querySelectorAll('.phases [data-phase]')].find(padUsable)||null,
 options:()=>{const el=[...app.querySelectorAll('[data-do="duel-options"],[data-do="pause"]')].find(padUsable);if(el&&!modal.open)el.click();else if(modal.dataset.duelOptionsPause==='1')window.androidBack()},
 chainStep:dir=>{if(cpuViewer||!padUsable(document.getElementById('chain-toggle')))return;heldChainPrompt=null;chainMode=(dir>0?{always:'never',never:'sometimes',sometimes:'always'}:{never:'always',sometimes:'never',always:'sometimes'})[chainMode];refreshChainToggle();if(!busy){renderDuel();scheduleAI()}},
 shopButton:name=>[...app.querySelectorAll({buy:'[data-do="buy-selected"]',reroll:'[data-do="shop-reroll"]',next:'.shop-next[data-do="routes"]',deck:'[data-do="draft"]'}[name])].find(padUsable)||null,
 autoPress:el=>screen==='characters'&&el.matches('.roster .portrait')&&!el.classList.contains('selected'),
 cursorClass:el=>el.matches('.roster .portrait')?'pad-cursor-pointer':el.matches('.save-slot')?'pad-cursor-center':'',
 cursorAnchor:el=>el.matches('.save-slot')?el.querySelector('.slot-portrait'):null,
 jump:dir=>screen!=='characters'?null:dir>0?[...app.querySelectorAll('[data-do="choose-variant"]')].filter(padUsable).sort((a,b)=>b.classList.contains('active')-a.classList.contains('active'))[0]||null:app.querySelector('.roster .portrait.selected'),
 confirmJump:el=>screen==='characters'&&el.matches('.roster .portrait')?[...app.querySelectorAll('[data-do="new"]')].find(padUsable)||null:null,
 aButton:top=>top?.matches('.pack-theatre.all-revealed')?[...top.querySelectorAll('.pack-next')].find(padUsable)||null:null,
 toggleDetails:()=>{if(screen!=='draft'||modal.open)return false;padDetailsHidden=!padDetailsHidden;return true},
 // A new chain prompt or zone/target pick puts the selection on a choice: the mandatory activation, else the one nearest the middle of the board.
 snap:()=>{if(screen!=='duel')return null;if(modal.open&&(modal.dataset.duelOptionsPause||modal.querySelector('.inspect,.pile-inspection,.duel-log')))return {key:null,el:null};
  // Every prompt counts: field targets and zones, chain cards, and cards or choices inside a selection window.
  const inWindow=modal.open,area=inWindow?modal:app;
  let list=[...area.querySelectorAll(inWindow?'[data-target]':'.reaction-available:not(.reaction-orb),.zone.selectable,.hand [data-field-target]')].filter(padUsable);
  if(!list.length&&inWindow)list=[...modal.querySelectorAll('[data-response]')].filter(padUsable).slice(0,1);
  if(!list.length)return null;
  const forced=list.find(el=>el.dataset.reactionForced!==undefined),box=(inWindow?modal:app.querySelector('.mat'))?.getBoundingClientRect(),cx=box?box.left+box.width/2:innerWidth/2,cy=box?box.top+box.height/2:innerHeight/2,d=el=>{const r=el.getBoundingClientRect();return Math.hypot(r.left+r.width/2-cx,r.top+r.height/2-cy)};
  // One engine prompt can hold several picks (Change of Heart: its zone, then its target), so the choices are part of the key.
  return {key:padPromptId()+'|'+engine?.pending?.type+'|'+list.map(el=>el.dataset.zone||el.dataset.target||el.dataset.fieldTarget||el.dataset.response||'').join(','),el:forced||list.reduce((a,b)=>d(b)<d(a)?b:a)}},
 steer:(el,dx,dy,from)=>{if(screen!=='duel'||dy<=0||!el.closest('.duel .phases'))return null;const cx=from.left+from.width/2;
  return [...app.querySelectorAll('.mat [data-zone^="0,4,"]')].filter(padUsable).reduce((best,z)=>{const r=z.getBoundingClientRect(),d=Math.abs(r.left+r.width/2-cx);return !best||d<best.d?{el:z,d}:best},null)?.el||null},
 // A duel prompt covers the board under it (the opponent's Deck sat under the Attribute choices).
 covers:()=>screen==='duel'?[...app.querySelectorAll('.duel .prompt')].filter(padUsable):[],
 settingsButton:()=>[...(modal.open?modal:app).querySelectorAll('[data-do="settings"]')].find(padUsable)||null,
 confirm:()=>[...(modal.open?modal:app).querySelectorAll('button.duel-confirm,button.reaction-confirm')].find(padUsable)||null,
 // What each button does on this screen, for the controller legend; null hides it.
 legend:top=>{
  if(!padLegendOn())return null;
  if(top?.matches('.pack-theatre'))return top.classList.contains('all-revealed')?[['a','Next pack'],['x','Inspect'],['b','Close']]:[['a','Reveal'],['b','Close']];
  if(top)return screen==='duel'&&!modal.dataset.duelOptionsPause?[['a','Select'],['x','Inspect'],['start','Confirm'],['b','Cancel']]:[['a','Select'],['x','Inspect'],['b','Close']];
  if(screen==='title')return [['dpad','Browse'],['a','Open']];
  if(screen==='characters')return [['a','Choose'],['rb','Variants'],['lb','Roster'],['start','Start run'],['select','Settings'],['b','Back']];
  if(screen==='shop')return [['a','Select'],['x','Info'],['rb','Buy'],['lb','Reroll'],['start','Next duel'],['select','Edit deck']];
  if(screen==='draft')return [['a','Add / remove'],['x','Inspect'],['y',padDetailsHidden?'Show details':'Hide details'],['start','Next duel'],['select','Settings']];
  if(screen==='routes')return [['a','Select'],['select','Settings'],['b','Back']];
  if(screen==='duel')return [['a','Select'],['b','Cancel'],['x','Inspect'],['y','Phases'],[['lb','rb'],'Chain mode'],['start','Confirm'],['select','Options']];
  if(screen==='loading')return null;
  return [['a','Select'],['x','Inspect'],...(app.querySelector('[data-do="settings"]')?[['select','Settings']]:[]),['b','Back']];
 },
 startButton:()=>[...app.querySelectorAll(screen==='characters'?'[data-do="new"]':screen==='draft'?'.draft-next[data-do="routes"]':':not(*)')].find(padUsable)||null,
 carousel:()=>screen==='title'&&titleMotion&&!modal.open?{center:[...app.querySelectorAll('.menu-card')].reduce((best,el)=>!best||Math.abs(el.dataset.distance)<Math.abs(best.dataset.distance)?el:best,null),step:dir=>action(dir>0?'menu-next':'menu-prev')}:null,
 // B steps back from the screens a main-menu card opens, from the Online submenu, and from the opponent screen.
 screenBack:()=>{if(modal.open||busy)return false;
  if(screen==='title'&&menuPage!=='main'){action('main-menu');return true}
  if(screen==='routes'&&['shop','draft'].includes(previousScreen)){go(previousScreen);return true}
  if(screen==='settings'){action('settings-back');return true}
  if(screen==='cpu'&&cpuViewer){cpuViewer.back();return true}
  if(['characters','collection','stats','achievements'].includes(screen)){go('title');return true}
  return false},
 inspect:el=>inspectElement(el),
 back:d=>{if(d===modal||d.classList.contains('replay-upload-reminder')){window.androidBack();return}if(d.dispatchEvent(new Event('cancel',{cancelable:true})))d.close()},
});

installMouseDetails(app,el=>{

 if(modal.open||!content)return null;

 let id=Number(el.dataset.preview||el.dataset.id),run=tagUI?.view?.run||state.run;

 const packDetails=pid=>{const p=packInfo(pid);return p?.randomized?`<h3>${esc(p.name)}</h3><p>${esc(RANDOM_PACK_TEXT)}</p>`:p?`<h3>${esc(p.name)}</h3><p>${boosterDescriptionHtml(p)}</p>`:null;};

 if(el.closest('.duel')&&(el.dataset.relic||el.dataset.enemyRelic)){const key=el.dataset.relic||el.dataset.enemyRelic,a=content.artifacts[key];if(!a)return null;const enemy=!!el.dataset.enemyRelic;return `<h3>${enemy?'Opponent relic: ':''}${esc(a[0])}</h3>${!enemy&&relicNegated()?'<p>Negated this duel.</p>':''}<p>${esc(a[2])}</p>`;}

 if(el.dataset.curse){const key=el.dataset.curse;return content.curses[key]?`<h3>${esc(content.curses[key][0])}</h3><p>${esc(curseDescription(content,key,run?.challenge_level||0))}</p>`:null;}

 const packId=el.dataset.pack||el.getAttribute('src')?.match(/^assets\/packs\/(.+)\.jpg$/)?.[1];

 if(packId)return packDetails(packId);

 if(el.matches('.product-art')){

  const item=run?.shop?.[Number(el.dataset.shopItem)];if(!item)return null;

  if(item.kind==='artifact'){const a=content.artifacts[item.id];return a?`<h3>${esc(a[0])}</h3><p>${esc(a[2])}</p>${fusionHint(content,item.id)}`:null;}

  if(item.kind==='pack')return packDetails(item.id);

  if(item.kind!=='single')return null;id=Number(item.id);

 }

 let c=card(id);if(!c)return null;

 const index=el.dataset.pick??(el.dataset.tag==='card'?el.dataset.index:null),mod=index==null?null:run?.card_mods?.[index];

 if(index!=null)c=modifiedCard(c,run,index);

 return `${cardFacts(c)}<p class="mouse-details-effect">${esc(displayCardText(c.desc))}</p>`;

},()=>!(padDetailsHidden&&screen==='draft'&&document.documentElement.classList.contains('pad-active')));



document.addEventListener('change',e=>{if(e.target.matches('[data-preload-visuals]'))setPreloadVisualPreference(e.target.checked)});



deviceBackup.setUploadGuard(()=>screen!=='duel'&&tagUI?.view?.phase!=='duel');

document.addEventListener('change',e=>{if(e.target.id!=='cloud-saves-enabled')return;deviceBackup.setEnabled(e.target.checked);localStorage.setItem(CLOUD_ASKED,'true');renderSettings();if(e.target.checked)showCloudCode('Cloud save is on. Your code:')});



// Capture before draft/duel context-menu handlers so closing never selects underneath.

document.addEventListener('contextmenu',e=>{if(e.pointerType==='touch'||performance.now()-lastTouchAt<2500||!rightClickCloses()||!modal.querySelector('.inspect,.pile-inspection'))return;e.preventDefault();e.stopImmediatePropagation();closeDialog();},true);

function modifierRowsMarkup(rows=[]){if(!rows.length)return '<p>No active curses or LVL modifiers.</p>';return `<div class="active-modifier-list">${rows.map(row=>{let art='';if(row.kind==='curse'&&row.key)art=`<span class="curse-icon curse-${esc(row.key)}" aria-hidden="true"><img src="${curseIconFile(row.key)}" alt=""></span>`;else if(row.kind==='opponent-relic'&&row.id){const info=content.artifactInfo[row.id];art=info?.art?relicArtwork(relicImage(info.art)):`<span class="modifier-generic-icon">${relicEyeIcon}</span>`;}else if(row.kind==='level'){const level=Number(row.name.match(/-?\d+/)?.[0]??0);art=`<span class="level-badge challenge-level-badge modifier-level-image" data-challenge-level="${level}" aria-hidden="true"><span>LVL</span><img src="assets/icons/level-star.png" alt=""><strong>${level}</strong></span>`;}return `<section class="panel active-modifier-row"><div class="active-modifier-art">${art}</div><div class="active-modifier-copy"><h3>${esc(row.name)}</h3><p>${esc(row.description)}</p></div></section>`;}).join('')}</div>`;}
function duelCurseMarkup(){const r=state.run||{},enemies=[...new Set([r.opponent_relic,...(r.opponent_relics||[]),...((r.curses||[]).includes('relic_mirror')?r.mirrored_relics||[]:[])])].filter(id=>content.artifactInfo[id]);return (r.curses?.length||enemies.length)?`<div class="active-curse-strip" aria-label="Active curses and opponent relics">${curseIcons(content,r.curses||[])}${enemies.map(enemy=>`<button data-do="active-curses" data-enemy-relic="${enemy}" aria-label="Opponent relic: ${esc(content.artifacts[enemy]?.[0])}">${relicArtwork(relicImage(content.artifactInfo[enemy].art))}</button>`).join('')}</div>`:'';}
function wasmFromBytes(){const W=globalThis.WebAssembly;if(!W||W.__fromBytes)return;W.__fromBytes=true;const bytes=async source=>(await source).arrayBuffer();W.instantiateStreaming=async(source,imports)=>W.instantiate(await bytes(source),imports);W.compileStreaming=async source=>W.compile(await bytes(source))}
