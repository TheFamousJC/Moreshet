import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
export function createVisitorSyncRouter() {
  const router=Router();
  router.all('/sync', async(req,res)=>{
    const token=req.header('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if(!token) return res.status(401).json({error:'Sign in to sync. Your saved tours and notes remain on this device.'});
    const url=process.env.SUPABASE_URL;const key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if(!url||!key)return res.status(503).json({error:'Account sync is not configured. Local saving still works.'});
    const client=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:auth,error:authError}=await client.auth.getUser(token);
    if(authError||!auth.user)return res.status(401).json({error:'Sign in again to sync your own account.'});
    try {
      if(req.method==='GET') {
        const {data,error}=await client.from('visitor_state').select('saved_site_ids,user_notes,updated_at').eq('user_id',auth.user.id).maybeSingle();
        if(error)throw error;
        return res.json({success:true,data:{savedSiteIds:data?.saved_site_ids || [],userNotes:data?.user_notes || {},lastSyncedAt:data?.updated_at || null}});
      }
      if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
      const {savedSiteIds,userNotes}=req.body || {};
      if(!Array.isArray(savedSiteIds)||savedSiteIds.length>1000||savedSiteIds.some(id=>typeof id!=='string'||id.length>200)||!userNotes||Array.isArray(userNotes)||typeof userNotes!=='object'||Object.entries(userNotes).some(([key,value])=>key.length>200||typeof value!=='string'||value.length>10000)||Object.keys(userNotes).length>1000)return res.status(400).json({error:'Saved tours or notes are invalid or too large.'});
      const now=new Date().toISOString();const {error}=await client.from('visitor_state').upsert({user_id:auth.user.id,saved_site_ids:savedSiteIds,user_notes:userNotes,updated_at:now},{onConflict:'user_id'});
      if(error)throw error;
      return res.json({success:true,lastSyncedAt:now});
    } catch {return res.status(503).json({error:'Account sync is unavailable. Your local notes are safe; check the database setup.'});}
  });return router;
}
