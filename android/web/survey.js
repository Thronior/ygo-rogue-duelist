// 10K player survey (user, 2026-11-24). Closed on 2026-11-27 (user): no more answers are sent, and the stats Worker
// refuses new ones (multiplayer/global-stats, SURVEY_CLOSED). In its place a thank-you popup opens once on the main
// menu, after the new version's patch notes, with [See results]: a Family Feud style quiz over the survey's
// multiple-choice questions, a shareable score image and the full results (survey-results.js, loaded only when
// opened, with the frozen tallies in survey-results.json). The bell window keeps a card for it.
import {currentLocale} from './i18n.js';
export const SURVEY_ID='10k-2026';
const SEEN='ygo-survey-10k-results-seen',QUIZ='ygo-survey-10k-quiz';
// The old survey's keys: an unsent answer or a half-done draft can never be sent now.
const OLD=['ygo-survey-10k-draft','ygo-survey-10k-outbox'];
// Players who answered, for the popup (survey-results.json has the exact tallies; the build checks they match).
export const SURVEY_PLAYERS=1300;
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
const write=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v))}catch{}};
const players=()=>SURVEY_PLAYERS.toLocaleString(currentLocale?.()||undefined);

let dialogFn=null,contentRef=null,hooks={},modal=null,bound=false;
// mobile.js calls this on every main menu; only the first call binds anything. `hooks.music(id|null)` plays a track
// over the menu theme while the quiz is open.
export function initSurvey(dialog,content,gameHooks={}){
 dialogFn=dialog;contentRef=content;hooks=gameHooks;
 if(!bound){bound=true;modal=document.querySelector('#modal');modal?.addEventListener('click',onClick);modal?.addEventListener('close',onClose);for(const k of OLD)write(k,null)}
}
export const quizResult=()=>read(QUIZ);
// The card at the top of the bell window.
export function surveyBanner(){
 if(!contentRef)return '';
 const done=quizResult();
 return `<div class="survey-banner"><div><h3>10K player survey results</h3><p>${done?`Your quiz score: ${done.score} points`:`See what ${players()} players picked, in a Family Feud style quiz.`}</p></div><div class="survey-banner-actions">${done?'<button data-survey="results">Full results</button>':''}<button class="primary" data-survey="quiz">${done?'Play again':'See results'}</button></div></div>`;
}
// Once per player, on the main menu when nothing else is open. It counts as seen only when the player closes it or
// presses a button, so the new version's patch notes (or a notice queued behind them) never push it away for good.
let retryCanShow=null;
export function queueSurvey(canShow){retryCanShow=canShow}
export function maybeShowSurvey(canShow){
 retryCanShow=canShow;
 if(!dialogFn||!contentRef||read(SEEN)||!canShow())return false;
 dialogFn('10K player survey',`<div class="survey survey-intro survey-closed"><h3>Thank you for your votes on the 10K players survey!</h3><p>${players()} players answered. Can you guess what they picked? Find out in a Family Feud style quiz.</p><div class="survey-actions"><span class="survey-spacer"></span><button data-do="close">Not now</button><button class="primary" data-survey="quiz">See results</button></div></div>`);
 modal?.classList.add('survey-modal');
 return true;
}
function onClose(){
 if(modal.classList.contains('feud-modal'))hooks.music?.(null);
 modal.classList.remove('survey-modal','feud-modal');
 if(modal.querySelector('.survey-closed'))write(SEEN,1);
 // Let any window queued behind the one that closed open first (notices wait ~300 ms), then try again.
 if(retryCanShow&&!read(SEEN))setTimeout(()=>{if(retryCanShow&&!modal.open)maybeShowSurvey(retryCanShow)},450);
}
let loading=null;
function onClick(e){
 const el=e.target.closest?.('[data-survey]');if(!el||!modal.contains(el))return;
 const a=el.dataset.survey;
 if(a!=='quiz'&&a!=='results')return;
 write(SEEN,1);
 loading??=import('./survey-results.js');
 loading.then(m=>m.openSurveyResults(a,{dialog:dialogFn,content:contentRef,modal,hooks,saveQuiz:v=>write(QUIZ,v),quizResult})).catch(err=>{loading=null;console.error(err)});
}
