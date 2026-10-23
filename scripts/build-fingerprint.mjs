import crypto from 'node:crypto';
import {inflateRawSync} from 'node:zlib';

const sha256=data=>crypto.createHash('sha256').update(data).digest('hex');
// Only recognized store destinations are ignored. Assets and gameplay remain exact.
const storePattern=/https?:\/\/(?:play\.google\.com\/store\/apps\/details\?|(?:apps|itunes)\.apple\.com\/)[^\s"'<>\\]*/gi;
export function normalizeStoreUrls(text,stores=new Set()){
 return text.replace(storePattern,url=>{stores.add(url);return '__STORE_DESTINATION__';});
}
function base122Decode(text){
 const output=[],illegal=[0,10,13,34,38,92,60];let current=0,bits=0;
 function push(value){value<<=1;current|=value>>>bits;bits+=7;if(bits>=8){output.push(current);bits-=8;current=(value<<(7-bits))&255;}}
 for(let i=0;i<text.length;i++){
  const value=text.charCodeAt(i);
  if(value>127){const escaped=(value>>>8)&7;if(escaped!==7)push(illegal[escaped]);push(value&127);}else push(value);
 }
 return Buffer.from(output);
}
export function zipEntries(zip){
 let end=zip.length-22;const minimum=Math.max(0,zip.length-65557);
 while(end>=minimum&&zip.readUInt32LE(end)!==0x06054b50)end--;
 if(end<minimum)throw Error('ZIP end directory missing');
 const count=zip.readUInt16LE(end+10);let position=zip.readUInt32LE(end+16);const entries=[];
 for(let i=0;i<count;i++){
  if(zip.readUInt32LE(position)!==0x02014b50)throw Error('Invalid ZIP directory');
  if(zip.readUInt16LE(position+8)&1)throw Error('Encrypted ZIP is unsupported');
  const method=zip.readUInt16LE(position+10),length=zip.readUInt32LE(position+20),size=zip.readUInt32LE(position+24);
  const nameLength=zip.readUInt16LE(position+28),extraLength=zip.readUInt16LE(position+30),commentLength=zip.readUInt16LE(position+32),offset=zip.readUInt32LE(position+42);
  const name=zip.subarray(position+46,position+46+nameLength).toString('utf8');position+=46+nameLength+extraLength+commentLength;
  if(name.endsWith('/'))continue;
  if(zip.readUInt32LE(offset)!==0x04034b50)throw Error('Invalid ZIP local entry');
  const start=offset+30+zip.readUInt16LE(offset+26)+zip.readUInt16LE(offset+28),packed=zip.subarray(start,start+length);
  const data=method===0?packed:method===8?inflateRawSync(packed,{maxOutputLength:128*1024*1024}):null;
  if(!data||data.length!==size)throw Error('Unsupported or damaged ZIP entry');
  entries.push({name,data});
 }
 const names=new Set(entries.map(entry=>entry.name));if(names.size!==entries.length)throw Error('Duplicate ZIP paths');
 return entries.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
}
export function fingerprintHtml(buffer){
 const html=buffer.toString('utf8'),stores=new Set();
 const raw=()=>({sha256:sha256(normalizeStoreUrls(html,stores)),method:'html',storeUrls:[...stores].sort()});
 if(!Buffer.from(html,'utf8').equals(buffer))return {sha256:sha256(buffer),method:'bytes',storeUrls:[]};
 const match=/window\.__zip="([^"]*)";/.exec(html),encoding=/window\.__zipEncoding="(base122|base64)"/.exec(html)?.[1];
 if(!match||!encoding)return raw();
 try{
  const zip=encoding==='base122'?base122Decode(match[1]):Buffer.from(match[1],'base64');
  const files=zipEntries(zip).map(({name,data})=>{
   // Never decode binary assets as UTF-8: different images must stay different.
   if(/\.(?:js|mjs|json|html?|css|txt|xml|svg)$/i.test(name)){
    const text=data.toString('utf8');
    if(Buffer.from(text,'utf8').equals(data))return [name,sha256(normalizeStoreUrls(text,stores))];
   }
   return [name,sha256(data)];
  });
  const shell=normalizeStoreUrls(html.replace(match[0],'window.__zip="__ARCHIVE__";'),stores);
  return {sha256:sha256(JSON.stringify([sha256(shell),files])),method:'zip-content',entries:files.length,storeUrls:[...stores].sort()};
 }catch{
  // An unrecognized format is retained as its own build, never guessed similar.
  return raw();
 }
}
