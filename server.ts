import express from 'express';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { createAuthAdminRouter } from './server/authAdmin.js';
import { createPublicContentRouter } from './server/publicContent.js';
import { createVisitorSyncRouter } from './server/visitorSync.js';
import { applySecurityHeaders, createMemoryRateLimiter, loadRuntimeConfig } from './server/production.js';

dotenv.config({path:'.env.local'});dotenv.config();
async function startServer(){
  // User's MVP constraint: never call an AI, TTS, Places, Routes or geocoding service.
  const runtime=loadRuntimeConfig({...process.env,PORT:process.env.PORT || '3220',HERZL_MODE:'simulator',HERZL_PROVIDER:'openai'});
  const app=express();app.disable('x-powered-by');if(runtime.trustProxy)app.set('trust proxy',1);
  app.use((req,res,next)=>{const requestId=randomUUID();res.setHeader('X-Request-Id',requestId);next();});
  app.use(applySecurityHeaders);app.use(express.json({limit:'5mb'}));
  app.get('/api/health',(_req,res)=>res.json({status:'ok',service:'Tudela Global MVP',version:'1.0.0-mvp',modes:{ai:'external-user-service-only',narration:'manual-and-device',maps:'google-maps-links'},databaseConfigured:Boolean(runtime.supabaseUrl&&runtime.supabaseSecretKey),paidApiCallsEnabled:false}));
  app.get('/api/ready',async(_req,res)=>{
    if(!runtime.supabaseUrl||!runtime.supabaseSecretKey)return res.status(503).json({status:'visitor-demo-ready',dependency:'shared-accounts-and-cms-not-configured'});
    try{const response=await fetch(`${runtime.supabaseUrl}/rest/v1/organizations?select=id&limit=1`,{headers:{apikey:runtime.supabaseSecretKey,Authorization:`Bearer ${runtime.supabaseSecretKey}`},signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error();return res.json({status:'ready',dependency:'supabase'});}catch{return res.status(503).json({status:'not_ready',dependency:'supabase'});}
  });
  app.post('/api/chat',(_req,res)=>res.status(410).json({error:'Use Ask Benjamin to copy a prompt and open your own AI. Tudela does not generate AI answers.'}));
  app.post(['/api/routes/walking','/api/places/nearby'],(_req,res)=>res.status(410).json({error:'Paid map APIs are disabled. Open Google Maps for live walking directions or nearby search.'}));
  app.get('/api/geocode',(_req,res)=>res.status(410).json({error:'Automatic coordinate lookup is disabled. Find the location in Google Maps and enter verified latitude and longitude.'}));
  app.use('/api',createMemoryRateLimiter({windowMs:60000,limit:180}),createVisitorSyncRouter(),createPublicContentRouter(),createAuthAdminRouter());
  app.use('/api',(_req,res)=>res.status(404).json({error:'API endpoint not found.'}));
  app.use((error:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(error?.type==='entity.too.large'?413:500).json({error:error?.type==='entity.too.large'?'Request too large.':'The request could not be completed.'}));
  app.get('/mvp-guide',(_req,res)=>res.sendFile(path.join(process.cwd(),'Docs','MVP-Guide.html')));
  if(process.env.NODE_ENV!=='production'){
    const vite=await createViteServer({configLoader:'runner',server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);
  }else{const dist=path.join(process.cwd(),'dist');app.use(express.static(dist));app.get('*',(_req,res)=>res.sendFile(path.join(dist,'index.html')));}
  const host=process.env.NODE_ENV==='production'?'0.0.0.0':'127.0.0.1';
  const server=app.listen(runtime.port,host,()=>console.log(`Tudela Global MVP ready at http://localhost:${runtime.port} — guide: /mvp-guide`));
  const stop=()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),10000).unref();};process.once('SIGINT',stop);process.once('SIGTERM',stop);
}
startServer().catch(()=>{console.error('Startup failed. Check local port and service configuration.');process.exit(1);});
