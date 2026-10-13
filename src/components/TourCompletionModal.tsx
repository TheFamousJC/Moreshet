import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Star, X } from 'lucide-react';
import { LanguageCode } from '../data/translations';
import { TourSummary } from '../types';
import { loadMyTourRating, submitTourRating } from '../lib/community';

const COPY: Record<LanguageCode, {
  eyebrow: string; title: string; completed: string; rate: string; review: string;
  signIn: string; submit: string; update: string; later: string; saved: string; home: string;
}> = {
  en: { eyebrow: 'Tour completed', title: 'Well done!', completed: 'You visited every stop on this tour.', rate: 'How would you rate this tour?', review: 'Your rating is checked before it is added to the public score.', signIn: 'Sign in to rate this tour', submit: 'Submit rating', update: 'Update rating', later: 'Stay here', saved: 'Thank you. Your rating was sent for review.', home: 'Back to Discover' },
  he: { eyebrow: 'הסיור הושלם', title: 'כל הכבוד!', completed: 'ביקרתם בכל התחנות בסיור.', rate: 'כיצד הייתם מדרגים את הסיור?', review: 'הדירוג ייבדק לפני שיצורף לציון הציבורי.', signIn: 'התחברו כדי לדרג את הסיור', submit: 'שליחת דירוג', update: 'עדכון דירוג', later: 'להישאר כאן', saved: 'תודה. הדירוג נשלח לבדיקה.', home: 'חזרה לגילוי' },
  fr: { eyebrow: 'Visite terminée', title: 'Bravo !', completed: 'Vous avez visité toutes les étapes de cette visite.', rate: 'Comment évaluez-vous cette visite ?', review: 'Votre note sera vérifiée avant d’être ajoutée au score public.', signIn: 'Connectez-vous pour noter cette visite', submit: 'Envoyer la note', update: 'Modifier la note', later: 'Rester ici', saved: 'Merci. Votre note a été envoyée pour validation.', home: 'Retour à Découvrir' },
  ru: { eyebrow: 'Маршрут завершён', title: 'Отлично!', completed: 'Вы посетили все точки этого маршрута.', rate: 'Как вы оцените этот маршрут?', review: 'Оценка будет проверена перед добавлением к общему результату.', signIn: 'Войдите, чтобы оценить маршрут', submit: 'Отправить оценку', update: 'Изменить оценку', later: 'Остаться здесь', saved: 'Спасибо. Оценка отправлена на проверку.', home: 'Назад к поиску' },
  de: { eyebrow: 'Tour abgeschlossen', title: 'Sehr gut!', completed: 'Sie haben alle Stationen dieser Tour besucht.', rate: 'Wie bewerten Sie diese Tour?', review: 'Ihre Bewertung wird geprüft, bevor sie in die öffentliche Wertung einfließt.', signIn: 'Anmelden, um die Tour zu bewerten', submit: 'Bewertung senden', update: 'Bewertung ändern', later: 'Hier bleiben', saved: 'Vielen Dank. Ihre Bewertung wurde zur Prüfung gesendet.', home: 'Zurück zu Entdecken' },
  es: { eyebrow: 'Recorrido completado', title: '¡Muy bien!', completed: 'Has visitado todas las paradas de este recorrido.', rate: '¿Cómo valorarías este recorrido?', review: 'Tu valoración se revisará antes de añadirse a la puntuación pública.', signIn: 'Inicia sesión para valorar el recorrido', submit: 'Enviar valoración', update: 'Actualizar valoración', later: 'Quedarme aquí', saved: 'Gracias. Tu valoración se envió para revisión.', home: 'Volver a Descubrir' },
};

interface TourCompletionModalProps {
  tour: TourSummary;
  language: LanguageCode;
  signedIn: boolean;
  onOpenAccount: () => void;
  onReturnHome: () => void;
  onClose: () => void;
}

export const TourCompletionModal: React.FC<TourCompletionModalProps> = ({ tour, language, signedIn, onOpenAccount, onReturnHome, onClose }) => {
  const copy = COPY[language];
  const [rating, setRating] = useState(0);
  const [existing, setExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    void loadMyTourRating(tour.id).then((current) => {
      if (!active || !current) return;
      setRating(current.rating);
      setExisting(true);
    }).catch(() => { /* The submission path will show any actionable error. */ });
    return () => { active = false; };
  }, [signedIn, tour.id]);

  const submit = async () => {
    if (!rating) return;
    setBusy(true); setNotice('');
    try { await submitTourRating(tour.id, rating); setExisting(true); setNotice(copy.saved); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : 'The rating could not be saved.'); }
    finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="tour-complete-title">
    <section className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3"><span className="rounded-2xl bg-emerald-100 p-3 text-emerald-700"><CheckCircle2 className="h-7 w-7"/></span><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-500" aria-label={copy.later}><X className="h-5 w-5"/></button></div>
      <p className="mt-4 text-[10px] font-bold uppercase tracking-[.18em] text-emerald-700">{copy.eyebrow}</p>
      <h2 id="tour-complete-title" className="mt-1 text-2xl font-bold text-slate-950">{copy.title}</h2>
      <p className="mt-2 text-sm text-slate-600">{tour.completionMessage || copy.completed}</p>
      <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4"><p className="text-sm font-bold text-slate-900">{copy.rate}</p><div className="mt-3 flex justify-center gap-2" role="radiogroup" aria-label={copy.rate}>{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} / 5`} onClick={() => { setRating(value); setNotice(''); }} className="rounded-xl p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"><Star className={`h-9 w-9 ${value <= rating ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}`}/></button>)}</div><p className="mt-3 text-[10px] leading-relaxed text-slate-600">{copy.review}</p></div>
      {notice && <p role="status" className={`mt-3 rounded-xl p-3 text-xs font-semibold ${notice === copy.saved ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{notice}</p>}
      {!signedIn ? <button type="button" onClick={onOpenAccount} className="mt-4 w-full rounded-xl bg-blue-900 py-3 text-sm font-bold text-white">{copy.signIn}</button> : <button type="button" disabled={!rating || busy} onClick={() => void submit()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 py-3 text-sm font-bold text-white disabled:opacity-45">{busy && <Loader2 className="h-4 w-4 animate-spin"/>}{existing ? copy.update : copy.submit}</button>}
      <button type="button" onClick={onReturnHome} className="mt-3 w-full rounded-xl border border-blue-200 bg-blue-50 py-3 text-sm font-bold text-blue-900">{copy.home}</button>
      <button type="button" onClick={onClose} className="mt-1 w-full py-2 text-xs font-bold text-slate-500">{copy.later}</button>
    </section>
  </div>;
};
