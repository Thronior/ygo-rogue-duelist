// The bundled Pyodide MEMFS rename replaces directory entries but leaves the
// overwritten node in FS.nameTable. Release that orphan only AFTER a successful
// rename; never unlink the destination first (atomic saves must stay atomic).
const installed=new WeakSet();
export function installMemfsRenameCleanup(FS){
 if(installed.has(FS)||!FS.nameTable||!FS.hashName||!FS.destroyNode)return false;
 const rename=FS.rename;
 FS.rename=function(oldPath,newPath){
  let previous;try{previous=FS.lookupPath(newPath,{follow:false}).node}catch{}
  const result=rename.call(this,oldPath,newPath);
  if(previous){
   const current=FS.lookupPath(newPath,{follow:false}).node;
   if(current!==previous){
    // A future runtime may already remove the old node. Do not remove twice.
    const hash=FS.hashName(previous.parent.id,previous.name);
    for(let node=FS.nameTable[hash];node;node=node.name_next){
     if(node===previous){FS.destroyNode(previous);break;}
    }
   }
  }
  return result;
 };
 installed.add(FS);return true;
}
