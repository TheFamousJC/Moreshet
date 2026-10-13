import React from 'react';
import { Bookmark, MapPin, Play, Trash2 } from 'lucide-react';
import { LanguageCode, t } from '../data/translations';
import { HeritageSite, TourCity, TourSummary } from '../types';

interface SavedToursPanelProps {
  tours: TourSummary[];
  cities: TourCity[];
  sites: HeritageSite[];
  savedTourIds: string[];
  selectedLanguage: LanguageCode;
  onOpenTour: (tour: TourSummary) => void;
  onRemoveTour: (tourId: string) => void;
}

const COPY: Record<LanguageCode, { title: string; subtitle: string; empty: string; emptyHelp: string; open: string; remove: string }> = {
  en: { title: 'Saved tours', subtitle: 'Tours bookmarked on this device', empty: 'No saved tours yet', emptyHelp: 'Open Discover and tap the bookmark on a tour to keep it here.', open: 'Open tour', remove: 'Remove' },
  he: { title: 'סיורים שמורים', subtitle: 'סיורים שסומנו במכשיר זה', empty: 'עדיין אין סיורים שמורים', emptyHelp: 'פתחו את הגילוי ולחצו על הסימנייה בסיור כדי לשמור אותו כאן.', open: 'פתיחת הסיור', remove: 'הסרה' },
  ru: { title: 'Сохранённые экскурсии', subtitle: 'Экскурсии, отмеченные на этом устройстве', empty: 'Сохранённых экскурсий пока нет', emptyHelp: 'В разделе «Каталог» нажмите закладку у экскурсии.', open: 'Открыть', remove: 'Удалить' },
  fr: { title: 'Visites enregistrées', subtitle: 'Visites ajoutées aux favoris sur cet appareil', empty: 'Aucune visite enregistrée', emptyHelp: 'Dans Découvrir, touchez le signet d’une visite.', open: 'Ouvrir', remove: 'Retirer' },
  de: { title: 'Gespeicherte Touren', subtitle: 'Auf diesem Gerät vorgemerkte Touren', empty: 'Noch keine Tour gespeichert', emptyHelp: 'Tippen Sie in Entdecken bei einer Tour auf das Lesezeichen.', open: 'Tour öffnen', remove: 'Entfernen' },
  es: { title: 'Tours guardados', subtitle: 'Tours marcados en este dispositivo', empty: 'Todavía no hay tours guardados', emptyHelp: 'En Descubrir, toca el marcador de un tour.', open: 'Abrir tour', remove: 'Quitar' },
};

export const SavedToursPanel: React.FC<SavedToursPanelProps> = ({ tours, cities, sites, savedTourIds, selectedLanguage, onOpenTour, onRemoveTour }) => {
  const copy = COPY[selectedLanguage] || COPY.en;
  const savedTours = savedTourIds.map((id) => tours.find((tour) => tour.id === id)).filter((tour): tour is TourSummary => Boolean(tour));
  return <div className="h-full overflow-y-auto bg-[#f7f0e5] px-3 pb-24 pt-4 text-[#173f46]">
    <div className="mx-auto max-w-md space-y-4">
      <header className="rounded-3xl bg-[#173f46] p-5 text-white shadow-md"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><Bookmark className="h-5 w-5 text-[#c43d4d]" /></span><div><h1 className="text-lg font-bold">{copy.title}</h1><p className="text-xs text-[#f4e4c9]">{copy.subtitle}</p></div></div></header>
      {savedTours.length === 0 && <section className="rounded-3xl border border-[#d7b276]/50 bg-white p-8 text-center shadow-sm"><Bookmark className="mx-auto h-9 w-9 text-[#c43d4d]" /><h2 className="mt-3 font-bold">{copy.empty}</h2><p className="mt-2 text-xs leading-relaxed text-slate-600">{copy.emptyHelp}</p></section>}
      {savedTours.map((tour) => {
        const city = cities.find((item) => item.id === tour.cityId);
        const firstStop = sites.find((site) => site.tourId === tour.id || site.tourAssignments?.some((assignment) => assignment.tourId === tour.id));
        const image = tour.imageUrl || city?.imageUrl || firstStop?.imageUrl;
        const stopCount = sites.filter((site) => site.tourId === tour.id || site.tourAssignments?.some((assignment) => assignment.tourId === tour.id)).length;
        return <article key={tour.id} className="overflow-hidden rounded-3xl border border-[#d7b276]/40 bg-white shadow-sm">{image && <img src={image} alt="" className="h-32 w-full object-cover" />}<div className="space-y-3 p-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-[#a74d38]">{city?.flagEmoji} {city?.name}</p><h2 className="mt-1 font-bold text-[#173f46]">{tour.title}</h2><p className="mt-1 text-xs text-slate-600">{tour.subtitle}</p></div><p className="text-[11px] font-semibold text-slate-600"><MapPin className="me-1 inline h-3 w-3" />{stopCount} {t('stops', selectedLanguage)}</p><div className="grid grid-cols-[1fr_auto] gap-2"><button type="button" onClick={() => onOpenTour(tour)} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#173f46] px-4 text-xs font-bold text-white"><Play className="h-4 w-4" />{copy.open}</button><button type="button" onClick={() => onRemoveTour(tour.id)} className="flex min-h-11 items-center gap-1 rounded-2xl border border-[#a74d38]/30 px-3 text-xs font-bold text-[#a74d38]" aria-label={`${copy.remove} ${tour.title}`}><Trash2 className="h-4 w-4" /><span className="sr-only">{copy.remove}</span></button></div></div></article>;
      })}
    </div>
  </div>;
};
