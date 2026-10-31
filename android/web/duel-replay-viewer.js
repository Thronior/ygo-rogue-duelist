// Run History playback: rebuilds a stored duel from its start and replays the recorded core responses
// on the Watch CPU duel board. The core is deterministic, as duel resume already relies on.
import {CPUViewer} from './cpu-viewer.js';
import {loadDuelResources} from './engine.js';
import {MobileDuel} from './duel.js';
import {replayVersion} from './replay-version.js';
import {relicArtwork,relicImage} from './ui-art.js';
import {curseIconFile} from './experience-ui.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class ReplayViewer extends CPUViewer{
 constructor({record,characters,onFlag,...options}){super(options);Object.assign(this,{record,characters,onFlag,responses:record.responses||[]});this.start(true,{paused:false});}
 setup(){/* No opponent picker: the CPUViewer constructor calls this before the record is set. */}
 async start(_repeat,{replay=[],paused=true}={}){
  clearTimeout(this.timer);this.engine?.destroy();this.engine=null;const generation=++this.generation;this.history=[];this.decisions=[];this.paused=true;this.state=null;this.error='';this.preview=null;
  this.root.innerHTML='<section class="loading"><img class="loading-wizard" src="assets/time-wizard.png" alt="Time Wizard"><h2>Preparing replay…</h2><progress></progress></section>';
  const resources=await loadDuelResources();if(generation!==this.generation)return;
  const created=await new MobileDuel([...this.content.cards,...(this.content.tokenCards||[])]).init(resources);
  if(generation!==this.generation){created.destroy();return}this.engine=created;
  this.state=this.engine.start(...this.record.start);
  // Watching must never record over the stored duel.
  this.engine.replayRecord=null;this.capture();
  try{for(let i=0;i<replay.length;i++){this.applyDecision(replay[i]);if(i%25===24){await new Promise(resolve=>setTimeout(resolve,0));if(generation!==this.generation)return;}}}
  catch(error){this.fail(error)}
  this.paused=paused||this.done();this.render();this.schedule();
 }
 // The relics and curses active in this duel, as recorded in its script header.
 modifiers(){try{const info=JSON.parse(String(this.record.start?.[8]||'').match(/SHADOW_RUN_AI (\{.*\})/)[1]);return {relics:[...new Set(info.activeRelics?.[0]||[])].filter(id=>this.content.artifacts?.[id]),curses:[...new Set(info.activeCurses||[])].filter(key=>this.content.curses?.[key])}}catch{return {relics:[],curses:[]}}}
 modifiersMarkup(){const {relics,curses}=this.modifiers();if(!relics.length&&!curses.length)return '';return `<div class="replay-modifiers" aria-label="Relics and curses in this duel">${relics.map(id=>`<button data-cpu="relic" data-id="${esc(id)}" aria-label="${esc(this.content.artifacts[id][0])}">${relicArtwork(relicImage(this.content.artifactInfo[id].art))}</button>`).join('')}${curses.map(key=>`<button class="replay-curse" data-cpu="curse" data-id="${esc(key)}" aria-label="${esc(this.content.curses[key][0])}"><img src="${curseIconFile(key)}" alt=""></button>`).join('')}</div>`}
 done(){return !!this.state?.finished||this.decisions.length>=this.responses.length}
 fail(error){this.paused=true;this.error=this.record.build&&this.record.build!==replayVersion?`This duel was recorded in v${this.record.build} and cannot be fully replayed in v${replayVersion}.`:'Replay stopped: '+error.message;}
 applyDecision(saved){const response=structuredClone(saved);this.decisions.push(response);this.state=this.engine.respond(response);this.capture();}
 schedule(){clearTimeout(this.timer);if(!this.paused&&!this.done()&&this.engine&&!this.error)this.timer=setTimeout(()=>this.step(),this.speed);}
 step(){if(!this.engine||this.done()||this.error)return;try{this.applyDecision(this.responses[this.decisions.length])}catch(error){this.fail(error)}if(this.done())this.paused=true;this.render();this.schedule();}
 async stepBack(){if(!this.decisions?.length)return;clearTimeout(this.timer);await this.start(true,{replay:this.responses.slice(0,this.decisions.length-1)});}
 render(){
  if(!this.state)return;super.render();
  const pause=this.root.querySelector('[data-cpu="pause"]'),step=this.root.querySelector('[data-cpu="step"]'),restart=this.root.querySelector('[data-cpu="restart"]'),status=this.root.querySelector('.cpu-status');
  if(pause)pause.disabled=step.disabled=this.done()||!!this.error;if(restart)restart.textContent='Restart';this.root.querySelector('[data-cpu="setup"]')?.remove();
  if(status&&!this.error&&!this.state.finished&&this.done())status.textContent='End of recording';
  this.root.querySelector('.duel')?.classList.add('replay-watch');
  this.root.querySelector('.cpu-playback')?.insertAdjacentHTML('beforeend',`${this.onFlag?'<button data-cpu="flag">Flag behaviour</button>':''}${this.modifiersMarkup()}`);
 }
 async action(action,button){
  if(action==='restart'){this.error='';return this.start(true)}
  if(action==='log'){this.paused=true;clearTimeout(this.timer);this.render();return this.dialog('Duel log',`<pre class="cpu-log">${this.history.map(x=>String(x).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))).join('\n')}</pre>`)}
  if(action==='relic'||action==='curse'){const row=action==='relic'?this.content.artifacts[button.dataset.id]:this.content.curses[button.dataset.id];this.paused=true;clearTimeout(this.timer);this.render();return this.dialog(row[0],`<p>${esc(row[action==='relic'?2:1])}</p>`)}
  if(action==='flag'){this.paused=true;clearTimeout(this.timer);this.render();return this.onFlag({...this.record,responses:this.responses.slice(0,this.decisions.length)},{mode:'solo',seat:0,turn:this.state.turn,phase:this.state.phase,fromReplay:true})}
  if(['pause','back','step','reveal','inspect','pile','exit'].includes(action))return super.action(action,button);
 }
}
