import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const s=fs.readFileSync(new URL('./web/mobile.js',import.meta.url),'utf8'),f=s.match(/function inspectionPaused\(\)\{[^\n]+/)[0];
const context=vm.createContext({screen:'duel',tagUI:null,document:{hidden:true},state:{settings:{}},modal:{open:false,dataset:{},classList:{contains:()=>false},querySelector:()=>null}});
vm.runInContext(f,context);const paused=()=>vm.runInContext('inspectionPaused()',context);
assert.equal(paused(),true);context.state.settings.pauseWhenHidden=false;assert.equal(paused(),false);
context.modal.open=true;context.modal.dataset.duelOptionsPause='1';assert.equal(paused(),true);
context.modal.open=false;context.tagUI={};context.state.settings.pauseWhenHidden=true;assert.equal(paused(),false);
context.tagUI=null;context.document.hidden=false;assert.equal(paused(),false);
console.log('PASS hidden-tab default/toggle, options still pause, online excluded, visible resume');
