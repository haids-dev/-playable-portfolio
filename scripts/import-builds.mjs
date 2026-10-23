import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {fingerprintHtml} from './build-fingerprint.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.resolve(process.env.PLAYABLE_SOURCE_ROOT || 'D:/Cocos');
const ignored = new Set(['.git','node_modules','library','temp','.wrangler','.local','playable-portfolio']);
const candidates = [];
const galleryGroups=JSON.parse(await fs.readFile(new URL('./gallery-groups.json',import.meta.url),'utf8')).groups;
const slug = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const games = {
  Bino: {title:'Bino', genre:'Platformer', description:'Platforming adventures with themed worlds, enemies and interactive obstacles.'},
  BlockCrusher: {title:'Block Crusher', genre:'Action', description:'A playable experiment built around crushing, timing and satisfying feedback.'},
  CAR_PARKING: {title:'Car Parking', genre:'Driving', description:'Compact parking challenges with touch controls and playful obstacles.'},
  CarRace: {title:'Car Race', genre:'Racing', description:'A bite-sized driving experience built for immediate interaction.'},
  CarRace_PA_Neon_V3: {title:'Neon Racer', genre:'Racing', description:'A neon driving concept with quick interactions and visual feedback.'},
  FruitSalon: {title:'Fruit Salon', genre:'Simulation', description:'Character interactions, playful tools and fruit-themed transformations.'},
  LiveScore: {title:'LiveScore', genre:'Sports', description:'An interactive sports concept designed for a short playable experience.'},
  MiniGame: {title:'Mini Games', genre:'Mini games', description:'A collection of small game ideas, from puzzles to quick reaction challenges.'},
  Mini4_WorldCup: {title:'Mini Games · World Cup', genre:'Sports', description:'Football-themed mini games and interactive creative variations.'},
  NextBots: {title:'NextBots', genre:'Action', description:'A character-driven playable concept with direct, responsive controls.'},
  PixelPaint: {title:'Pixel Paint', genre:'Puzzle', description:'Pixel art reveals, character designs and satisfying paint interactions.'},
  PocketSort: {title:'Pocket Sort', genre:'Puzzle', description:'Sorting interactions designed around a compact, tactile puzzle loop.'},
  Rush: {title:'Rush', genre:'Action', description:'Fast, focused interactions explored through short playable variations.'},
  Secu: {title:'Secu', genre:'Simulation', description:'A playable game concept focused on character interaction.'},
  TaxiGame3D: {title:'Taxi Game 3D', genre:'Driving', description:'A short taxi-driving experience with a three-dimensional game world.'},
  TaxiSimu: {title:'Taxi Simulator', genre:'Simulation', description:'Taxi gameplay, passenger encounters and character-driven creative variations.'},
  Wheelie2: {title:'Wheelie', genre:'Racing', description:'Motorcycle tricks, ramps and city riding in a compact playable format.'}
};
function gameKey(relative) {
  const parts = relative.split('/');
  if(parts[0]==='Cooking'||/^\d{6,8}_AppLovin_Cooking/i.test(path.basename(relative))) return 'Cooking';
  return ['Cooking','IEC_Download'].includes(parts[0]) ? parts.slice(0,2).join('/') : parts[0];
}
function cleanVariant(relative, game) {
  const parts = relative.split('/');
  let name = path.basename(relative,'.html');
  if(/^(?:applovin|index|game|playable|applovin_unity_ironsource_facebook_vungle)$/i.test(name)) {
    const relevant=parts.slice(game.split('/').length,-1).filter(v=>!['build','_release','release','out','dist','playable','playable-tool','applovin','super-html'].includes(v.toLowerCase()));
    name=relevant.join(' ')||'Original';
  }
  name=name.replace(/^\d{6,8}[_ -]+/,'').replace(/applovin/ig,' ').replace(/(^|[_\s-])PA(?=[_\s-]|$)/ig,' ').replace(/^[_\s-]+/,'').trim();
  if(game==='Bino') name=name.replace(/^Bino\d*[_\s-]*/i,'');
  if(game==='FruitSalon') name=name.replace(/^FruitSalon(\d*)[_\s-]*/i,(_,v)=>v?'V'+v+' ':'');
  if(game==='PixelPaint') name=name.replace(/^Pixel[_\s]*Paint[_\s-]*/i,'');
  if(game==='MiniGame') name=name.replace(/^Mini4[_\s-]*/i,'');
  if(game==='MiniGame'&&/spy6-reskin\/squid/i.test(relative)) name='Squid reskin';
  if(game==='Cooking') name=name.replace(/^Cooking(\d+)[_\s-]*/i,(_,v)=>'V'+v+' ');
  const projectName=game.split('/').at(-1);
  name=name.replace(new RegExp(projectName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'ig'),' ');
  name=name.replace(/[_-]+/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/\s+/g,' ').trim();
  if(game==='PixelPaint'&&/dumpling\.reveal/i.test(name)) name+=' '+(relative.match(/reveal_([a-f0-9]{6})/i)?.[1]||'');
  return name||'Original';
}
async function walk(dir) {
  for(const item of await fs.readdir(dir,{withFileTypes:true})) {
    if(item.isSymbolicLink()) continue;
    const file=path.join(dir,item.name);
    if(item.isDirectory()) {
      if(!ignored.has(item.name.toLowerCase())) await walk(file);
      continue;
    }
    if(!/\.html$/i.test(item.name)) continue;
    const relative=path.relative(sourceRoot,file).replace(/\\/g,'/');
    if(!/applovin/i.test(relative)) continue;
    const stat=await fs.stat(file);
    if(stat.size<50*1024) continue;
    const buffer=await fs.readFile(file);
    const html=buffer.toString('utf8');
    if(!/<html|<!doctype|<canvas/i.test(html)) continue;
    const game=gameKey(relative);
    const variant=cleanVariant(relative,game);
    const prefix=path.basename(file).match(/^(\d{6}|\d{8})[_ -]/)?.[1];
    const date=prefix ? (prefix.length===6?'20'+prefix:prefix).replace(/^(\d{4})(\d{2})(\d{2})$/,'$1-$2-$3') : stat.mtime.toISOString().slice(0,10);
    const content=fingerprintHtml(buffer);
    candidates.push({file,relative,game,variant,date,bytes:stat.size,sha256:crypto.createHash('sha256').update(buffer).digest('hex'),gameplaySha256:content.sha256,fingerprintMethod:content.method,storeUrls:content.storeUrls,priority:/\/_release\//i.test(relative)?3:/\/out\//i.test(relative)?2:1,review:/\b(?:test|debug|backup)\b/i.test(variant),oversize:stat.size>25*1024*1024});
  }
}
await walk(sourceRoot);
candidates.sort((a,b)=>b.priority-a.priority||b.date.localeCompare(a.date)||a.relative.localeCompare(b.relative));
const seen=new Map(), unique=[];
for(const candidate of candidates) {
  const identical=seen.get(candidate.sha256);
  if(identical) identical.duplicates.push(candidate.relative);
  else { const item={...candidate,duplicates:[]};seen.set(candidate.sha256,item);unique.push(item); }
}
await fs.mkdir(path.join(project,'.local'),{recursive:true});
await fs.writeFile(path.join(project,'.local','inventory.json'),JSON.stringify({sourceRoot,candidates:unique,discovered:candidates.length},null,2));
const grouped=new Map();
for(const item of unique){
 if(item.oversize)continue;
 const curated=galleryGroups.find(group=>group.gameKey===item.game&&group.variants.includes(item.variant));
 const key=item.game+':'+(curated?'curated:'+curated.variant:item.gameplaySha256);
 if(!grouped.has(key))grouped.set(key,{label:curated?.variant,members:[]});
 grouped.get(key).members.push(item);
}
const selected=[...grouped.values()].map(group=>{
 group.members.sort((a,b)=>b.date.localeCompare(a.date)||b.priority-a.priority||a.relative.localeCompare(b.relative));
 return {...group,selected:group.members[0]};
});
const summary={discovered:candidates.length,unique:unique.length,duplicates:candidates.length-unique.length,gallery: selected.length,storeOrPackagingDuplicates:unique.length-selected.length,MiB:Math.round(selected.reduce((s,v)=>s+v.selected.bytes,0)/1024/1024),oversize:unique.filter(v=>v.oversize).map(v=>v.relative),games:Object.fromEntries([...new Set(unique.map(v=>v.game))].sort().map(k=>[k,selected.filter(v=>v.selected.game===k).length]))};
console.log(JSON.stringify(summary,null,2));
if(process.argv.includes('--scan')) process.exit(0);
const catalog=[],aliases={},deduplication=[];
for(const group of selected) {
  const item=group.selected;
  const id=slug(item.game)+'--'+slug(item.variant)+'--'+item.sha256.slice(0,8);
  const directory=path.join(project,'public','games',id);
  await fs.mkdir(directory,{recursive:true});
  await fs.copyFile(item.file,path.join(directory,'index.html'));
  const metadata=item.game==='Cooking'?{title:'Cooking',genre:'Simulation',description:'Cooking interactions, character encounters and playful creative variations.'}:games[item.game]||{title:item.game.split('/').at(-1).replace(/[_-]/g,' '),genre:item.game.startsWith('IEC_Download/')?'Interactive':'Mini games',description:'An interactive playable ad experiment.'};
  const variant=group.label||(group.members.length>1&&['Cooking','FruitSalon'].includes(item.game)?item.variant.replace(/^V\d+\s+/,''):item.variant);
  catalog.push({id,game:metadata.title,gameKey:item.game,variant,genre:metadata.genre,description:metadata.description,network:'AppLovin',date:item.date,bytes:item.bytes,sha256:item.sha256,gameplaySha256:item.gameplaySha256,url:'games/'+id+'/index.html',thumbnail:'thumbnails/'+id+'.png',sourceName:path.basename(item.file),review:item.review});
  for(const alternate of group.members.slice(1))aliases[slug(alternate.game)+'--'+slug(alternate.variant)+'--'+alternate.sha256.slice(0,8)]=id;
  if(group.members.length>1)deduplication.push({kept:id,variant,reason:group.label?'owner-confirmed creative; newest revision':'exact game content; store URLs and ZIP metadata ignored',members:group.members.map(member=>({source:member.relative,sha256:member.sha256,storeUrls:member.storeUrls}))});
}
catalog.sort((a,b)=>a.game.localeCompare(b.game)||a.variant.localeCompare(b.variant));
await fs.writeFile(path.join(project,'public','catalog.json'),JSON.stringify({schema:2,generatedAt:new Date().toISOString(),aliases,items:catalog},null,2));
await fs.writeFile(path.join(project,'.local','deduplication.json'),JSON.stringify(deduplication,null,2));
console.log('IMPORTED '+catalog.length);
