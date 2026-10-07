export async function saveDeckImage(blob,title){
 const name=(title||'Deck').replace(/[^a-zA-Z0-9 _-]/g,'').slice(0,80)+'.png';
 if(globalThis.ShadowNative?.saveDeckImage){
  const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=()=>reject(Error('Could not prepare image.'));r.readAsDataURL(blob)});
  if(!ShadowNative.saveDeckImage(name,data))throw Error('Could not open Save image. Finish any open save window and try again.');
  return 'Choose where to save the image in the Android window.';
 }
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);return 'Image download started.';
}
