import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const code=await fs.readFile(new URL('../public/play.js',import.meta.url),'utf8');
async function host(existingMraid,requested='fixture'){
 const listeners={},navigation=[],labels=new Map();
 const game={mraid:existingMraid,location:{href:'https://portfolio.example/games/original/index.html'}};
 game.bingoPlayableApiDemo=function(url){if(game.mraid)game.mraid.open(url);};
 const frame={contentWindow:game,addEventListener(name,callback){listeners[name]=callback;}};
 const document={documentElement:{dataset:{}},body:{classList:{add(){}}},querySelector(selector){if(selector==='#game')return frame;if(!labels.has(selector))labels.set(selector,{addEventListener(){}});return labels.get(selector);}};
 const window={location:{assign(url){navigation.push(url);}},open(){}};
 vm.runInNewContext(code,{document,window,location:{search:'?id='+requested},URL,URLSearchParams,queueMicrotask,fetch:async()=>({ok:true,json:async()=>({aliases:{'old-store-variant':'fixture'},items:[{id:'fixture',url:'games/original/index.html',game:'Fixture',variant:'Original'}]})})});
 await new Promise(resolve=>setImmediate(resolve));listeners.load();
 return{game,frame,navigation,document};
}
test('The player embeds the untouched original HTML URL',async()=>{const result=await host();assert.equal(result.frame.src,'games/original/index.html');assert.equal(result.frame.srcdoc,undefined);});
test('An old store variant link resolves to the retained original build',async()=>{const result=await host(undefined,'old-store-variant');assert.equal(result.frame.src,'games/original/index.html');});
test('AppLovin MRAID CTA opens the exact original store destination',async()=>{const result=await host();const store='https://play.google.com/store/apps/details?id=com.example.game&referrer=creative_2';assert.equal(result.game.mraid,undefined);result.game.bingoPlayableApiDemo(store);assert.deepEqual(result.navigation,[store]);assert.equal(result.game.mraid,undefined);});
test('A game-provided MRAID implementation is preserved',async()=>{const native={open(){}};const result=await host(native);assert.equal(result.game.mraid,native);assert.deepEqual(result.navigation,[]);});
test('The store bridge does not execute a JavaScript URL',async()=>{const result=await host();result.game.bingoPlayableApiDemo('javascript:alert(1)');assert.deepEqual(result.navigation,[]);});
