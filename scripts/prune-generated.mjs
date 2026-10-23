import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/games');
const catalog=JSON.parse(await fs.readFile(path.resolve(root,'../../public/catalog.json'),'utf8'));
const inventory=JSON.parse(await fs.readFile(path.resolve(root,'../../.local/inventory.json'),'utf8'));
const valid=new Set(catalog.items.map(item=>item.id)),hashes=new Set(inventory.candidates.map(item=>item.sha256));
let removed=0;
for(const entry of await fs.readdir(root,{withFileTypes:true})){
 if(!entry.isDirectory()||valid.has(entry.name)||!/^[-a-z0-9]+--[a-f0-9]{8}$/.test(entry.name))continue;
 const directory=path.resolve(root,entry.name);assert(directory.startsWith(root+path.sep));
 const contents=await fs.readdir(directory);if(contents.length!==1||contents[0]!=='index.html')continue;
 const file=path.join(directory,'index.html'),data=await fs.readFile(file);
 if(!hashes.has(crypto.createHash('sha256').update(data).digest('hex')))continue;
 await fs.unlink(file);await fs.rmdir(directory);removed++;
}
console.log('Removed obsolete generated copies: '+removed);
const thumbnails=path.resolve(root,'../thumbnails');let images=0;
for(const id of Object.keys(catalog.aliases||{})){
 if(!/^[-a-z0-9]+--[a-f0-9]{8}$/.test(id))continue;
 const file=path.resolve(thumbnails,id+'.png');assert(file.startsWith(thumbnails+path.sep));
 try{await fs.unlink(file);images++;}catch(error){if(error.code!=='ENOENT')throw error;}
}
console.log('Removed obsolete generated thumbnails: '+images);
