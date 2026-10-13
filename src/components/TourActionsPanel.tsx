import React, { useEffect, useRef, useState } from 'react';
import { Copy, Heart, Share2, Star } from 'lucide-react';
import { LanguageCode } from '../data/translations';
import { TourSummary } from '../types';
import { getTourLikeSummary, getTourRatingSummary, setTourLike } from '../lib/community';
import { buildTourShareUrl } from '../lib/tourSharing';
import type { AccountPromptReason } from './AccountAccessModal';

const COPY: Record<LanguageCode, { rating:string; ratings:string; like:string; unlike:string; share:string; copy:string; copied:string; shared:string }> = {
  en:{rating:'rating',ratings:'ratings',like:'Like',unlike:'Unlike',share:'Share',copy:'Copy link',copied:'Tour link copied.',shared:'Tour ready to share.'},
  he:{rating:'דירוג',ratings:'דירוגים',like:'אהבתי',unlike:'ביטול',share:'שיתוף',copy:'העתקת קישור',copied:'הקישור הועתק.',shared:'הסיור מוכן לשיתוף.'},
  fr:{rating:'note',ratings:'notes',like:'J’aime',unlike:'Je n’aime plus',share:'Partager',copy:'Copier le lien',copied:'Lien copié.',shared:'Visite prête à partager.'},
  ru:{rating:'оценка',ratings:'оценок',like:'Нравится',unlike:'Не нравится',share:'Поделиться',copy:'Копировать ссылку',copied:'Ссылка скопирована.',shared:'Маршрут готов к публикации.'},
  de:{rating:'Bewertung',ratings:'Bewertungen',like:'Gefällt mir',unlike:'Entfernen',share:'Teilen',copy:'Link kopieren',copied:'Link kopiert.',shared:'Tour kann geteilt werden.'},
  es:{rating:'valoración',ratings:'valoraciones',like:'Me gusta',unlike:'Quitar',share:'Compartir',copy:'Copiar enlace',copied:'Enlace copiado.',shared:'Recorrido listo para compartir.'},
};

interface Props { tour: TourSummary; language: LanguageCode; signedIn: boolean; onOpenAccount: (reason?: AccountPromptReason) => void }

export const TourActionsPanel: React.FC<Props> = ({ tour, language, signedIn, onOpenAccount }) => {
  const copy = COPY[language];
  const [average,setAverage]=useState<number|null>(null); const [ratingCount,setRatingCount]=useState(0);
  const [likeCount,setLikeCount]=useState(0); const [liked,setLiked]=useState(false); const [notice,setNotice]=useState('');
  const likeAfterSignInRef=useRef(false);
  useEffect(()=>{let active=true;void Promise.all([getTourRatingSummary(tour.id),getTourLikeSummary(tour.id)]).then(([rating,like])=>{if(active){setAverage(rating.average);setRatingCount(rating.count);setLikeCount(like.count);setLiked(like.liked);}}).catch(()=>{});return()=>{active=false;};},[tour.id,signedIn]);
  const url=()=>buildTourShareUrl(window.location.origin,new URLSearchParams(window.location.search).get('organization'),tour.cityId,tour.id);
  const copyLink=async()=>{await navigator.clipboard.writeText(url());setNotice(copy.copied);};
  const share=async()=>{if(navigator.share){await navigator.share({title:tour.title,text:tour.subtitle||tour.overview,url:url()});setNotice(copy.shared);}else await copyLink();};
  useEffect(()=>{if(!signedIn||!likeAfterSignInRef.current)return;likeAfterSignInRef.current=false;void setTourLike(tour.id,true).then(result=>{setLiked(result.liked);setLikeCount(result.count);}).catch(()=>setNotice('The tour could not be liked.'));},[signedIn,tour.id]);
  const toggle=async()=>{if(!signedIn){likeAfterSignInRef.current=true;onOpenAccount('like');return;}const result=await setTourLike(tour.id,!liked);setLiked(result.liked);setLikeCount(result.count);};
  return <section className="rounded-3xl border border-blue-100 bg-white p-3 shadow-xs">
    <div className="flex items-center gap-2">
      {ratingCount>0&&<div className="shrink-0 rounded-xl bg-amber-50 px-2.5 py-2 text-center text-amber-900"><p className="flex items-center justify-center gap-1 text-sm font-bold"><Star className="h-4 w-4 fill-amber-400 text-amber-500"/>{average?.toFixed(1)}</p><p className="text-[9px]">{ratingCount} {ratingCount===1?copy.rating:copy.ratings}</p></div>}
      <div className="grid flex-1 grid-cols-3 gap-2">
        <button type="button" aria-pressed={liked} onClick={()=>void toggle()} className={`flex min-h-11 items-center justify-center gap-1 rounded-xl border px-2 text-[10px] font-bold ${liked?'border-rose-200 bg-rose-50 text-rose-700':'border-slate-200 text-slate-700'}`}><Heart className={`h-4 w-4 ${liked?'fill-current':''}`}/>{liked?copy.unlike:copy.like} · {likeCount}</button>
        <button type="button" onClick={()=>void share()} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-2 text-[10px] font-bold text-blue-900"><Share2 className="h-4 w-4"/>{copy.share}</button>
        <button type="button" onClick={()=>void copyLink()} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border px-2 text-[10px] font-bold text-slate-700"><Copy className="h-4 w-4"/>{copy.copy}</button>
      </div>
    </div>{notice&&<p role="status" className="mt-2 rounded-xl bg-emerald-50 p-2 text-[10px] font-bold text-emerald-800">{notice}</p>}
  </section>;
};
