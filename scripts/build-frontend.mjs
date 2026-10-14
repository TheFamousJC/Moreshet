import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
const base=process.env.MORESHET_BASE || '/Moreshet/';
if(!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base))throw new Error('Invalid public base path');
const url=process.env.VITE_SUPABASE_URL || '';
const key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const api=process.env.VITE_API_BASE_URL || '';
const connected=Boolean(url && key && api);
if((url || key || api) && !connected)throw new Error('Connected build requires public Supabase URL, publishable key and API origin together');
if(connected){
  if(!url.startsWith('https://') || !api.startsWith('https://'))throw new Error('Hosted services require HTTPS');
  if(key.startsWith('sb_secret_'))throw new Error('A server secret cannot be used in a browser build');
  if(key.split('.').length===3){try{if(JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role!=='anon')throw new Error('Only anon legacy keys are allowed');}catch{throw new Error('Invalid browser key');}}
}
const env={...process.env,MORESHET_BASE:base,MORESHET_FRONTEND_ONLY:'true',VITE_FRONTEND_PREVIEW:connected?'false':'true',VITE_SUPABASE_URL:url,VITE_SUPABASE_PUBLISHABLE_KEY:key,VITE_API_BASE_URL:api,VITE_GOOGLE_MAPS_EMBED_KEY:''};
const result=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--configLoader','runner'],{stdio:'inherit',env});if(result.status!==0)process.exit(result.status || 1);
const html=await readFile('frontend-dist/index.html','utf8');
for(const route of ['privacy','terms','ai-disclosure','support','cms']){await mkdir('frontend-dist/'+route,{recursive:true});await writeFile('frontend-dist/'+route+'/index.html',html);}
await writeFile('frontend-dist/404.html',html);await writeFile('frontend-dist/.nojekyll','');
const files=await readdir('frontend-dist');if(files.some(file=>/server|Project Documents|Docs|\.env/.test(file)))throw new Error('Nonpublic material in frontend bundle');
console.log(connected ? 'Connected frontend ready. No server secrets or private documents included.' : 'Public frontend preview ready. No server or private documents included.');
