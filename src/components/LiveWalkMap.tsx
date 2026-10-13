import React from 'react';
import { MapPin, Navigation, Settings, LocateFixed, Play, List } from 'lucide-react';
import { HeritageSite, UserLocation, AudioGuideSettings } from '../types';
import { getDistanceMeters, formatDistance } from '../utils/geo';
import { getTranslatedSite, LanguageCode } from '../data/translations';
import { googleMapsWalking, googleMapsSearch } from '../lib/googleMaps';
interface LiveWalkMapProps {
  sites: HeritageSite[]; userLocation: UserLocation; gpsStatus:'off'|'simulated'|'requesting'|'live'|'denied'|'unavailable'|'error';
  audioSettings:AudioGuideSettings; selectedSite:HeritageSite|null; nextSiteId:string|null; completedSiteIds:string[];
  onSelectSite:(site:HeritageSite)=>void; locationEnabled:boolean; onToggleLocation:()=>void; onOpenSettings:()=>void;
  onPlayAudioForSite:(site:HeritageSite)=>void; onSelectDestination:()=>void; onOpenTourStops:()=>void;
  selectedLanguage:LanguageCode; organizationSlug:string; selectedTourId:string;
}
export const LiveWalkMap:React.FC<LiveWalkMapProps>=(props)=>{
  const active=props.sites.find(s=>s.id===props.nextSiteId)||props.selectedSite||props.sites[0];
  const embedKey=import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY;
  const translated=active?getTranslatedSite(active,props.selectedLanguage):null;
  const trusted=props.gpsStatus==='live';
  const origin=trusted?props.userLocation:undefined;
  return <section className="mx-auto max-w-3xl space-y-4 p-4 pb-32 text-slate-900" dir={props.selectedLanguage==='he'?'rtl':'ltr'}>
    <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Live walk</p><h1 className="text-xl font-bold">Your next heritage stop</h1></div><button aria-label="Walk settings" onClick={props.onOpenSettings} className="rounded-xl border bg-white p-3"><Settings size={19}/></button></div>
    <div className="rounded-2xl bg-blue-950 p-5 text-white"><div className="flex items-center gap-2 text-xs text-blue-200"><MapPin size={16}/>Google Maps navigation</div><h2 className="mt-3 text-xl font-bold">{translated?.name || 'Choose a tour to begin'}</h2><p className="mt-2 text-sm text-blue-100">{active?.address}</p>{active&&trusted&&<p className="mt-2 text-xs text-blue-200">{formatDistance(getDistanceMeters(props.userLocation.lat,props.userLocation.lng,active.lat,active.lng))} away in a straight line. Walking distance is shown by Google Maps.</p>}
    {active&&<a href={googleMapsWalking(active,origin)} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-blue-950"><Navigation size={17}/>Open walking directions</a>}<p className="mt-3 text-xs text-blue-200">Google Maps opens in its app or a new tab. No paid routing API is called.</p></div>
    {active&&embedKey?<iframe title="Google map of the next stop" className="h-80 w-full rounded-2xl border" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen src={`https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(embedKey)}&q=${encodeURIComponent(`${active.lat},${active.lng}`)}`}/>:<div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-5"><p className="text-sm font-semibold">Maps without a platform bill</p><p className="mt-2 text-xs leading-relaxed text-slate-600">The MVP uses Google Maps directly for maps and turn-by-turn guidance. Your stop list and notes remain here. An optional embedded map needs a Google Cloud setup; it is not enabled.</p>{active&&<a className="mt-3 inline-block text-sm font-bold text-blue-800 underline" href={googleMapsSearch(`${active.lat},${active.lng}`)} target="_blank" rel="noopener noreferrer">View this stop on Google Maps ↗</a>}</div>}
    <div className="flex flex-wrap gap-2"><button onClick={props.onToggleLocation} className="flex items-center gap-2 rounded-xl border bg-white p-3 text-xs font-bold"><LocateFixed size={16}/>{props.locationEnabled?'Turn location off':'Use my location'}</button><button onClick={props.onOpenTourStops} className="flex items-center gap-2 rounded-xl border bg-white p-3 text-xs font-bold"><List size={16}/>Tour stops</button><button onClick={props.onSelectDestination} className="rounded-xl border bg-white p-3 text-xs font-bold">Change tour</button></div>
    <p className="text-xs text-slate-500">Location: {props.gpsStatus==='simulated'?'simulation — not your real position':props.gpsStatus}. Location stays on this device unless you explicitly open directions with it.</p>
    <ol className="space-y-2">{props.sites.map((site,index)=>{const localized=getTranslatedSite(site,props.selectedLanguage);return <li key={site.id} className="flex items-center gap-3 rounded-xl border bg-white p-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-bold text-blue-900">{props.completedSiteIds.includes(site.id)?'✓':index+1}</span><button onClick={()=>props.onSelectSite(site)} className="flex-1 text-left text-sm font-semibold">{localized.name}</button><button aria-label={`Play narration for ${localized.name}`} onClick={()=>props.onPlayAudioForSite(site)} className="p-2 text-blue-800"><Play size={18}/></button><a aria-label={`Directions to ${localized.name}`} href={googleMapsWalking(site,origin)} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-800"><Navigation size={18}/></a></li>;})}</ol>
  </section>;
};
