import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const env={...process.env};
if(env.CLOUDFLARE_API_TOKEN){
 const token=env.CLOUDFLARE_API_TOKEN.trim().replace(/^Bearer\s+/i,'').replace(/^['"]|['"]$/g,'');
 if(/^[A-Za-z0-9_-]{35,100}$/.test(token)&&!/paste|your_|token_here|example/i.test(token))env.CLOUDFLARE_API_TOKEN=token;
 else delete env.CLOUDFLARE_API_TOKEN;
}
const child=spawn(process.execPath,[path.join(root,'node_modules/wrangler/bin/wrangler.js'),...process.argv.slice(2)],{cwd:root,env,stdio:'inherit'});
child.on('exit',code=>process.exitCode=code??1);
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
