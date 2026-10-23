const frame=document.querySelector('#game'),params=new URLSearchParams(location.search);
if(params.has('capture'))document.body.classList.add('capture');
document.documentElement.dataset.previewState='loading';
// Serve the original file byte-for-byte. Expose the missing store API only
// during the existing CTA helper, so game startup keeps normal browser behavior.
function attachStoreBridge(){
 try{
  const game=frame.contentWindow;
  if(!game||game.mraid||typeof game.bingoPlayableApiDemo!=='function')return;
  const original=game.bingoPlayableApiDemo;
  const bridge={getState:()=> 'default',addEventListener:(name,callback)=>{if(name==='ready')callback();},
   open:url=>{if(typeof url!=='string'||!url)return;const destination=new URL(url,game.location.href);if(['https:','http:','market:','itms-apps:','intent:'].includes(destination.protocol))window.location.assign(destination.href);}
  };
  game.bingoPlayableApiDemo=function(...args){
   if(game.mraid)return original.apply(game,args);
   game.mraid=bridge;
   try{return original.apply(game,args);}finally{delete game.mraid;}
  };
  document.documentElement.dataset.storeBridge='host';
 }catch{/* An original game may already have navigated to its store link. */}
}
frame.addEventListener('load',()=>{attachStoreBridge();document.documentElement.dataset.previewState='loaded';});
if(!document.fullscreenEnabled)document.querySelector('#fullscreen').hidden=true;
document.querySelector('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await frame.requestFullscreen();}catch{/* The browser may decline fullscreen. The original game remains playable. */}});
async function start(){
 const response=await fetch('catalog.json');if(!response.ok)throw Error('The game collection could not load.');
 const catalog=await response.json(),requested=params.get('id'),id=catalog.aliases?.[requested]||requested,item=catalog.items.find(item=>item.id===id);if(!item)throw Error('This game was not found. Return to the collection to choose another.');
 document.querySelector('#title').textContent=item.variant;document.querySelector('#game-name').textContent=item.game;document.title=item.game+' — '+item.variant+' | Playables';frame.title=item.game+' — '+item.variant;frame.src=item.url;
}
start().catch(error=>{document.documentElement.dataset.previewState='error';const box=document.querySelector('#error');box.textContent=error.message;box.hidden=false;});
