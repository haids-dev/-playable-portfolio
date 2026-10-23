import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(await fs.readFile(path.join(root,'public/catalog.json'),'utf8'));
assert(catalog.items.length>0,'Catalog must not be empty');
const ids=new Set(),hashes=new Set(),gameplay=new Set();let bytes=0;
for(const item of catalog.items){
 assert(!ids.has(item.id),'Duplicate catalog ID: '+item.id);ids.add(item.id);
 assert(!hashes.has(item.sha256),'Duplicate build content: '+item.id);hashes.add(item.sha256);
 assert(!gameplay.has(item.gameplaySha256),'Duplicate gameplay content: '+item.id);gameplay.add(item.gameplaySha256);
 assert.equal(item.network,'AppLovin');
 const file=path.resolve(root,'public',item.url);assert(file.startsWith(path.resolve(root,'public','games')+path.sep));
 const data=await fs.readFile(file);assert.equal(data.length,item.bytes);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),item.sha256,'Original HTML bytes changed: '+item.id);
 assert(data.length<=25*1024*1024,'Cloudflare asset limit exceeded: '+item.id);bytes+=data.length;
 await fs.access(path.join(root,'public',item.thumbnail));
}
for(const [alias,id] of Object.entries(catalog.aliases||{})){assert(!ids.has(alias),'Alias is also a visible card');assert(ids.has(id),'Alias target is missing');}
const inventoryFile=path.join(root,'.local/inventory.json');let sourceChecked=0;
try{
 const inventory=JSON.parse(await fs.readFile(inventoryFile,'utf8'));
 for(const item of catalog.items){const source=inventory.candidates.find(source=>source.sha256===item.sha256);assert(source,'Missing source record');const original=await fs.readFile(source.file);assert.equal(crypto.createHash('sha256').update(original).digest('hex'),item.sha256,'Source has changed since import: '+source.relative);sourceChecked++;}
}catch(error){if(error.code!=='ENOENT')throw error;}
for(const file of ['index.html','styles.css','app.js','play.html','play.js','favicon.svg'])await fs.access(path.join(root,'public',file));
const player=await fs.readFile(path.join(root,'public/play.js'),'utf8');assert(!/srcdoc|\.srcdoc/.test(player),'Player must serve original files directly');assert(player.includes('window.location.assign(destination.href)'),'CTA must navigate to the original store URL');
console.log(JSON.stringify({builds:catalog.items.length,groupedDuplicates:Object.keys(catalog.aliases||{}).length,sourceFilesVerified:sourceChecked,originalHtmlIntegrity:'all SHA-256 hashes match',sizeMiB:Math.round(bytes/1024/1024),thumbnails:'all present'}));
