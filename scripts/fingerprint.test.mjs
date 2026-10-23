import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fingerprintHtml} from './build-fingerprint.mjs';
import {deflateRawSync} from 'node:zlib';

function fixture({store='com.first.game',image=Buffer.from([0xff,0xfe,0,42]),code='score += 1;',time=0,level=6}={}){
 const files=[['game.js',Buffer.from(code)],['art.png',image]],local=[],central=[];let offset=0;
 for(const [name,data] of files){
  const nameBytes=Buffer.from(name),packed=deflateRawSync(data,{level}),header=Buffer.alloc(30),directory=Buffer.alloc(46);
  header.writeUInt32LE(0x04034b50);header.writeUInt16LE(8,8);header.writeUInt16LE(time,10);header.writeUInt32LE(packed.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(nameBytes.length,26);
  directory.writeUInt32LE(0x02014b50);directory.writeUInt16LE(8,10);directory.writeUInt16LE(time,12);directory.writeUInt32LE(packed.length,20);directory.writeUInt32LE(data.length,24);directory.writeUInt16LE(nameBytes.length,28);directory.writeUInt32LE(offset,42);
  local.push(header,nameBytes,packed);central.push(directory,nameBytes);offset+=header.length+nameBytes.length+packed.length;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
 const zip=Buffer.concat([...local,directory,end]).toString('base64');
 return Buffer.from('<html><script>const store="https://play.google.com/store/apps/details?id='+store+'";window.__zipEncoding="base64";window.__zip="'+zip+'";</script></html>');
}
test('Store target, ZIP timestamp and compression changes collapse to one creative',()=>{
 const first=fingerprintHtml(fixture()),other=fingerprintHtml(fixture({store:'com.second.game',time:1240,level:1}));
 assert.equal(first.method,'zip-content');assert.equal(first.sha256,other.sha256);assert.notDeepEqual(first.storeUrls,other.storeUrls);
});
test('Different binary artwork remains distinct even with invalid UTF-8 bytes',()=>{
 assert.notEqual(fingerprintHtml(fixture()).sha256,fingerprintHtml(fixture({image:Buffer.from([0xfd,0xfc,0,42])})).sha256);
});
test('A gameplay code change remains a separate creative',()=>{
 assert.notEqual(fingerprintHtml(fixture()).sha256,fingerprintHtml(fixture({code:'score += 2;'})).sha256);
});
test('Unrecognized or damaged archives are compared conservatively',()=>{
 const a=Buffer.from('<script>window.__zipEncoding="base64";window.__zip="broken-one";</script>'),b=Buffer.from('<script>window.__zipEncoding="base64";window.__zip="broken-two";</script>');
 assert.equal(fingerprintHtml(a).method,'html');assert.notEqual(fingerprintHtml(a).sha256,fingerprintHtml(b).sha256);
});
