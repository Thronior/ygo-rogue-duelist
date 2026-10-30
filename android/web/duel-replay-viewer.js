// Run History playback: rebuilds a stored duel from its start and replays the recorded core responses
// on the Watch CPU duel board. The core is deterministic, as duel resume already relies on.
import {CPUViewer} from './cpu-viewer.js';
import {loadDuelResources} from './engine.js';
import {MobileDuel} from './duel.js';
import {replayVersion} from './replay-version.js';
export class ReplayViewer extends CPUViewer{
 constructor({record,characters,...options}){super(options);Object.assign(this,{record,characters,responses:record.responses||[]});this.start(true,{paused:false});}
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
 }
 async action(action,button){
  if(action==='restart'){this.error='';return this.start(true)}
  if(action==='log'){this.paused=true;clearTimeout(this.timer);this.render();return this.dialog('Duel log',`<pre class="cpu-log">${this.history.map(x=>String(x).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))).join('\n')}</pre>`)}
  if(['pause','back','step','reveal','inspect','pile','exit'].includes(action))return super.action(action,button);
 }
}
