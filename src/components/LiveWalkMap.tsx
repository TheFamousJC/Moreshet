import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, Settings, LocateFixed, Play, List } from 'lucide-react';
import { HeritageSite, UserLocation, AudioGuideSettings } from '../types';
import { getDistanceMeters, formatDistance } from '../utils/geo';
import { getTranslatedSite, LanguageCode } from '../data/translations';
import { apiUrl } from '../lib/api';
import { googleMapsWalking, googleMapsSearch, googleMapsEmbed } from '../lib/googleMaps';
interface LiveWalkMapProps {
  sites: HeritageSite[]; userLocation: UserLocation; gpsStatus:'off'|'simulated'|'requesting'|'live'|'denied'|'unavailable'|'error';
  audioSettings:AudioGuideSettings; selectedSite:HeritageSite|null; nextSiteId:string|null; completedSiteIds:string[];
  onSelectSite:(site:HeritageSite)=>void; locationEnabled:boolean; onToggleLocation:()=>void; onOpenSettings:()=>void;
  onPlayAudioForSite:(site:HeritageSite)=>void; onSelectDestination:()=>void; onOpenTourStops:()=>void;
  selectedLanguage:LanguageCode; organizationSlug:string; selectedTourId:string;
}
export const LiveWalkMap:React.FC<LiveWalkMapProps>=(props)=>{
  const [mapMode, setMapMode] = useState<'stop' | 'tour'>('stop');
  const [viewedStop, setViewedStop] = useState<string | null>(null);
  const active=props.sites.find(s=>s.id===viewedStop)||props.sites.find(s=>s.id===props.nextSiteId)||props.selectedSite||props.sites[0];
  const [embedKey, setEmbedKey]=useState(import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY || '');
  useEffect(()=>{
    if (embedKey) return;
    const controller=new AbortController();
    fetch(apiUrl('/api/maps/config'),{signal:controller.signal})
      .then(response=>response.ok?response.json():null)
      .then(config=>{if(config?.configured && /^AIza[0-9A-Za-z_-]{35}$/.test(config.embedKey || ''))setEmbedKey(config.embedKey);})
      .catch(()=>{});
    return ()=>controller.abort();
  },[embedKey]);
  const showRoute=mapMode==='tour' && props.sites.length>1 && props.sites.length<=22;
  const translated=active?getTranslatedSite(active,props.selectedLanguage):null;
  const trusted=props.gpsStatus==='live';
  const origin=trusted?props.userLocation:undefined;
  return <section className="mx-auto max-w-3xl space-y-4 p-4 pb-32 text-slate-900" dir={props.selectedLanguage==='he'?'rtl':'ltr'}>
    <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Live walk</p><h1 className="text-xl font-bold">Your heritage walk</h1></div><button aria-label="Walk settings" onClick={props.onOpenSettings} className="rounded-xl border bg-white p-3"><Settings size={19}/></button></div>
    <div className="rounded-2xl bg-blue-950 p-5 text-white"><div className="flex items-center gap-2 text-xs text-blue-200"><MapPin size={16}/>Google Maps navigation</div><h2 className="mt-3 text-xl font-bold">{translated?.name || 'Choose a tour to begin'}</h2><p className="mt-2 text-sm text-blue-100">{active?.address}</p>{active&&trusted&&<p className="mt-2 text-xs text-blue-200">{formatDistance(getDistanceMeters(props.userLocation.lat,props.userLocation.lng,active.lat,active.lng))} away in a straight line. Walking distance is shown by Google Maps.</p>}
    {active&&<a href={googleMapsWalking(active,origin)} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-blue-950"><Navigation size={17}/>Open walking directions</a>}<p className="mt-3 text-xs text-blue-200">Google Maps opens in its app or a new tab. No paid routing API is called.</p></div>
    {active && <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white">
      <div className="flex items-center justify-between gap-2 p-3"><h2 className="text-sm font-bold">Tour map</h2>{embedKey && props.sites.length > 1 && props.sites.length <= 22 && <div className="flex gap-1" aria-label="Map view">{(['stop','tour'] as const).map(mode=><button key={mode} onClick={()=>setMapMode(mode)} aria-pressed={mapMode===mode} className={`rounded-lg px-3 py-2 text-xs font-bold ${mapMode===mode?'bg-blue-950 text-white':'bg-blue-50 text-blue-950'}`}>{mode==='stop'?'Selected stop':'Walking route'}</button>)}</div>}</div>
      {embedKey ? <iframe title={showRoute?'Google walking tour map':'Google map of the selected stop'} className="h-80 w-full border-0" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen src={googleMapsEmbed(embedKey,showRoute?props.sites:[active],props.selectedLanguage,showRoute)}/> : <div className="px-4 pb-4"><p className="text-sm text-slate-600">Explore this stop and get walking directions in Google Maps.</p><a className="mt-3 inline-block rounded-xl bg-blue-950 px-4 py-3 text-sm font-bold text-white" href={googleMapsSearch(`${active.lat},${active.lng}`)} target="_blank" rel="noopener noreferrer">Open stop map ↗</a></div>}
      {embedKey && <p className="px-4 py-3 text-xs text-slate-500">Choose a stop below to view its location. Open walking directions for live navigation.</p>}
    </div>}
    <div className="flex flex-wrap gap-2"><button onClick={props.onToggleLocation} className="flex items-center gap-2 rounded-xl border bg-white p-3 text-xs font-bold"><LocateFixed size={16}/>{props.locationEnabled?'Turn location off':'Use my location'}</button><button onClick={props.onOpenTourStops} className="flex items-center gap-2 rounded-xl border bg-white p-3 text-xs font-bold"><List size={16}/>Tour stops</button><button onClick={props.onSelectDestination} className="rounded-xl border bg-white p-3 text-xs font-bold">Change tour</button></div>
    <p className="text-xs text-slate-500">Location: {props.gpsStatus==='simulated'?'simulation — not your real position':props.gpsStatus}. Your live location stays on this device unless you open directions with it. Google receives tour coordinates when a map is loaded.</p>
    <ol className="space-y-2">{props.sites.map((site,index)=>{const localized=getTranslatedSite(site,props.selectedLanguage);return <li key={site.id} className="flex items-center gap-3 rounded-xl border bg-white p-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-bold text-blue-900">{props.completedSiteIds.includes(site.id)?'✓':index+1}</span><button onClick={()=>{setViewedStop(site.id);setMapMode('stop');props.onSelectSite(site);}} className="flex-1 text-left text-sm font-semibold">{localized.name}</button><button aria-label={`Play narration for ${localized.name}`} onClick={()=>props.onPlayAudioForSite(site)} className="p-2 text-blue-800"><Play size={18}/></button><a aria-label={`Directions to ${localized.name}`} href={googleMapsWalking(site,origin)} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-800"><Navigation size={18}/></a></li>;})}</ol>
  </section>;
};
