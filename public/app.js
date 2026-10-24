const grid=document.querySelector('#games'),search=document.querySelector('#search'),collection=document.querySelector('#collection');
const featured=['Bino','PixelPaint','TaxiSimu','Wheelie2','FruitSalon','BlockCrusher','MiniGame','Cooking','Rush','NextBots','Mini4_WorldCup','CAR_PARKING','LiveScore','CarRace_PA_Neon_V3'];
let items=[];
function render(){
 const query=search.value.trim().toLowerCase();
 const matches=items.filter(item=>(!collection.value||item.game===collection.value)&&(!query||(item.game+' '+item.variant).toLowerCase().includes(query)));
 grid.replaceChildren();
 for(const item of matches){
  const card=document.createElement('a');card.className='game-card';card.href='play.html?id='+encodeURIComponent(item.id);card.setAttribute('aria-label','Play '+item.game+' — '+item.variant);
  const picture=document.createElement('div');picture.className='thumbnail';
  const placeholder=document.createElement('span');placeholder.className='placeholder';placeholder.setAttribute('aria-hidden','true');placeholder.textContent=item.game.split(' ').map(w=>w[0]).slice(0,2).join('');picture.append(placeholder);
  const img=document.createElement('img');img.src=item.thumbnail;img.alt=item.game+' — '+item.variant;img.loading='lazy';img.decoding='async';img.addEventListener('error',()=>img.hidden=true,{once:true});picture.append(img);
  const play=document.createElement('span');play.className='play-icon';play.textContent='▶';play.setAttribute('aria-hidden','true');picture.append(play);
  const text=document.createElement('div');text.className='card-text';const title=document.createElement('h2');title.textContent=item.variant;const game=document.createElement('p');game.textContent=item.game;text.append(title,game);
  if(items.some(other=>other.id!==item.id&&other.game===item.game&&other.variant===item.variant)){const date=document.createElement('span');date.className='card-date';date.textContent=item.date;text.append(date);}
  card.append(picture,text);grid.append(card);
 }
 if(!matches.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='No games found.';const reset=document.createElement('button');reset.textContent='Clear filters';reset.addEventListener('click',()=>{search.value='';collection.value='';render();});empty.append(reset);grid.append(empty);}
 document.querySelector('#result-count').textContent=matches.length+' games';grid.setAttribute('aria-busy','false');
}
search.addEventListener('input',render);collection.addEventListener('change',render);
fetch('catalog.json').then(response=>{if(!response.ok)throw Error('Catalog unavailable');return response.json();}).then(catalog=>{
 items=catalog.items;const first=new Map();for(const item of items)if(!first.has(item.gameKey)||item.date>first.get(item.gameKey).date)first.set(item.gameKey,item);
 items.sort((a,b)=>{const af=first.get(a.gameKey)===a,bf=first.get(b.gameKey)===b;if(af!==bf)return af?-1:1;if(af){const ai=featured.indexOf(a.gameKey),bi=featured.indexOf(b.gameKey);return(ai<0?99:ai)-(bi<0?99:bi);}return b.date.localeCompare(a.date)||a.game.localeCompare(b.game)||a.variant.localeCompare(b.variant);});
 for(const game of [...new Set(items.map(item=>item.game))].sort()){const option=document.createElement('option');option.value=game;option.textContent=game;collection.append(option);}
 document.querySelector('#total').textContent=items.length+' playables';render();
}).catch(()=>{grid.innerHTML='<p class="empty">The collection could not load. Please refresh to try again.</p>';grid.setAttribute('aria-busy','false');});
