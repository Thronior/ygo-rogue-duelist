// Escape is exclusively an inspection-close shortcut. Android Back stays separate.
export function installEscapeInspection(isInspectionOpen,closeInspection){
 const keydown=e=>{
  if(e.key!=='Escape')return;
  e.preventDefault();e.stopImmediatePropagation();
  if(!e.repeat&&isInspectionOpen())closeInspection();
 };
 window.addEventListener('keydown',keydown,true);
 return ()=>window.removeEventListener('keydown',keydown,true);
}
