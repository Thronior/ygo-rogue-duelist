// Small command replies must preserve unrelated data and screen-owned state.
export function applyCommandUpdate(state,result,action){
 if(result.partial){
  if(result.runPatch)state={...state,run:{...state.run,...result.runPatch}};
  if(result.settings)state={...state,settings:result.settings};
  if(result.duelResponse!==undefined&&state.run?.mobile_duel)state.run.mobile_duel.responses.push(result.duelResponse);
  return state;
 }
 if(action.startsWith('device-sync-'))return {...state,profile:result.profile,achievements:result.achievements};
 return action.startsWith('tag-')?state:result;
}
export const phaseCheckpoint=(before,after)=>before.turn!==after.turn||before.phase!==after.phase;
