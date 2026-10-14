import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
const base=process.env.TUDELA_BASE || '/TudelaGlobal_2/';
if(!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base))throw new Error('Invalid public base path');
const env={...process.env,TUDELA_BASE:base,TUDELA_FRONTEND_ONLY:'true',VITE_FRONTEND_PREVIEW:'true',VITE_SUPABASE_URL:'',VITE_SUPABASE_PUBLISHABLE_KEY:'',VITE_GOOGLE_MAPS_EMBED_KEY:''};
const result=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--configLoader','runner'],{stdio:'inherit',env});if(result.status!==0)process.exit(result.status || 1);
const html=await readFile('frontend-dist/index.html','utf8');
for(const route of ['privacy','terms','ai-disclosure','support']){await mkdir('frontend-dist/'+route,{recursive:true});await writeFile('frontend-dist/'+route+'/index.html',html);}
await writeFile('frontend-dist/404.html',html);await writeFile('frontend-dist/.nojekyll','');
const files=await readdir('frontend-dist');if(files.some(file=>/server|Project Documents|Docs|\.env/.test(file)))throw new Error('Nonpublic material in frontend bundle');
console.log('Public frontend preview ready. No server or private documents included.');
