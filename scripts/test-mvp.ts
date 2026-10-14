import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { buildPersonalAiPrompt, PERSONAL_AI_SERVICES } from '../src/lib/externalAi.js';
import { googleMapsSearch, googleMapsWalking } from '../src/lib/googleMaps.js';
import { readFile } from 'node:fs/promises';

const walk=new URL(googleMapsWalking({lat:47.4979,lng:19.0402}));assert.equal(walk.hostname,'www.google.com');assert.equal(walk.searchParams.get('api'),'1');assert.equal(walk.searchParams.get('travelmode'),'walking');assert.equal(walk.searchParams.get('origin'),null);
assert.equal(new URL(googleMapsSearch('synagogues Budapest')).searchParams.get('query'),'synagogues Budapest');
assert.throws(()=>googleMapsWalking({lat:999,lng:19}));
const prompt=buildPersonalAiPrompt('Tell me about this synagogue','Budapest','en');assert.ok(prompt.includes('Budapest'));assert.ok(prompt.includes('Do not invent'));assert.ok(!prompt.includes('access_token'));assert.equal(Object.keys(PERSONAL_AI_SERVICES).length,3);
assert.ok(!(await readFile('src/components/AskHerzlChat.tsx','utf8')).includes('fetch('));
assert.ok(!(await readFile('src/components/WhatsAroundMe.tsx','utf8')).includes("fetch('/api/places/nearby'"));
const migration=await readFile('supabase/migrations/20261013100000_private_visitor_sync.sql','utf8');assert.ok(migration.includes('enable row level security'));assert.ok(migration.includes('auth.uid()) = user_id'));
const child=spawn(process.execPath,['--import','tsx','server.ts'],{env:{...process.env,PORT:'3229',APP_URL:'http://localhost:3220',NODE_ENV:'development',SUPABASE_URL:'',SUPABASE_SECRET_KEY:'',VITE_SUPABASE_PUBLISHABLE_KEY:'',HERZL_MODE:'live',OPENAI_API_KEY:'test-not-a-real-key',NARRATION_MODE:'live'},stdio:['ignore','pipe','pipe']});
try{
  await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('MVP server startup timed out')),30000);let output='';child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('MVP ready')){clearTimeout(timer);resolve();}});child.once('exit',code=>{clearTimeout(timer);reject(new Error(`MVP server exited ${code}`));});});
  const base='http://127.0.0.1:3229';const health=await (await fetch(base+'/api/health')).json();assert.equal(health.paidApiCallsEnabled,false);assert.equal(health.modes.ai,'external-user-service-only');
  for(const route of ['/api/chat','/api/routes/walking','/api/places/nearby','/api/admin/narration/preview','/api/admin/narration/pronunciation-preview'])assert.equal((await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,410,route);
  assert.equal((await fetch(base+'/api/geocode?q=Budapest')).status,410);
  assert.equal((await fetch(base+'/api/sync')).status,401);
  assert.equal((await fetch(base+'/api/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
  assert.equal((await fetch(base+'/api/ready')).status,503);
  const trustedOrigin='http://localhost:3220';
  const preflight=await fetch(base+'/api/sync',{method:'OPTIONS',headers:{Origin:trustedOrigin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),trustedOrigin);
  assert.equal((await fetch(base+'/api/sync',{headers:{Origin:'https://untrusted.example'}})).status,403);
  assert.equal((await fetch(base+'/api/sync',{headers:{Origin:trustedOrigin}})).status,401);

  assert.equal((await fetch(base+'/')).status,200);
  console.log('MVP checks passed: external AI, Google Maps links, disabled paid endpoints, anonymous sync rejection and visitor server.');
} finally {child.kill();}
