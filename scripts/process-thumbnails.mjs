import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(await fs.readFile(path.join(root,'public/catalog.json'),'utf8'));
const stats=[];
for(const item of catalog.items){
 const file=path.join(root,'public',item.thumbnail);try{await fs.access(file);}catch{continue;}
 const original=await fs.readFile(file),info=await sharp(original).metadata(),summary=await sharp(original).stats();
 if(info.width>640)await fs.writeFile(file,await sharp(original).resize({width:640}).png().toBuffer());
 stats.push({id:item.id,entropy:Math.round(summary.entropy*100)/100,possibleLoading:summary.entropy<1.25});
}
await fs.writeFile(path.join(root,'.local/thumbnail-stats.json'),JSON.stringify(stats,null,2));
const existing=catalog.items.filter(item=>stats.some(s=>s.id===item.id));
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
for(let page=0;page<Math.ceil(existing.length/25);page++){
 const items=existing.slice(page*25,page*25+25),columns=5,tileWidth=230,tileHeight=158,images=[];
 for(let i=0;i<items.length;i++){
  const item=items[i],x=(i%columns)*tileWidth,y=Math.floor(i/columns)*tileHeight;
  const image=await sharp(path.join(root,'public',item.thumbnail)).resize(222,124,{fit:'cover'}).png().toBuffer();
  const label=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="222" height="30"><rect width="222" height="30" fill="white"/><text x="4" y="12" font-size="10" font-family="Arial">'+escape(item.game.slice(0,32))+'</text><text x="4" y="25" font-size="9" fill="#64748b" font-family="Arial">'+escape(item.variant.slice(0,37))+'</text></svg>');
  images.push({input:image,left:x+4,top:y},{input:label,left:x+4,top:y+124});
 }
 await sharp({create:{width:columns*tileWidth,height:Math.ceil(items.length/columns)*tileHeight,channels:3,background:'#e5e7eb'}}).composite(images).png().toFile(path.join(root,'.local','contact-sheet-'+String(page+1).padStart(2,'0')+'.png'));
}
console.log(JSON.stringify({captured:stats.length,remaining:catalog.items.length-stats.length,possibleLoading:stats.filter(s=>s.possibleLoading).map(s=>s.id)}));
