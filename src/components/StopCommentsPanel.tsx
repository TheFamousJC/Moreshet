import React, { useEffect, useRef, useState } from 'react';
import type { AccountPromptReason } from './AccountAccessModal';
import { ChevronDown, ChevronUp, EyeOff, Loader2, MessageCircle, Send, ShieldCheck } from 'lucide-react';
import { LanguageCode } from '../data/translations';
import {
  getPublicStopComments,
  loadMyStopComment,
  PublicTourComment,
  submitStopComment,
  TourComment,
  withdrawStopComment,
} from '../lib/community';

const COPY: Record<LanguageCode, {
  comment: string; intro: string; none: string; placeholder: string; submit: string; update: string;
  withdraw: string; pending: string; approved: string; changes: string; rejected: string; withdrawn: string;
  saved: string; withdrawnNotice: string; anonymous: string;
}> = {
  en: { comment:'Comment', intro:'Comments appear after review.', none:'No approved comments for this stop yet.', placeholder:'What was useful, memorable or could be improved at this stop?', submit:'Send for review', update:'Update comment', withdraw:'Withdraw', pending:'Awaiting review', approved:'Approved', changes:'Changes requested', rejected:'Not approved', withdrawn:'Withdrawn', saved:'Your comment was sent for review.', withdrawnNotice:'Your comment was withdrawn.', anonymous:'Community visitor' },
  he: { comment:'תגובה', intro:'תגובות מופיעות לאחר בדיקה.', none:'עדיין אין תגובות מאושרות לתחנה זו.', placeholder:'מה היה מועיל, זכור או ראוי לשיפור בתחנה זו?', submit:'שליחה לבדיקה', update:'עדכון תגובה', withdraw:'משיכה', pending:'ממתין לבדיקה', approved:'מאושר', changes:'נדרשים שינויים', rejected:'לא אושר', withdrawn:'נמשך', saved:'התגובה נשלחה לבדיקה.', withdrawnNotice:'התגובה נמשכה.', anonymous:'מבקר בקהילה' },
  fr: { comment:'Commenter', intro:'Les commentaires paraissent après validation.', none:'Aucun commentaire approuvé pour cette étape.', placeholder:'Qu’avez-vous apprécié ou que pourrions-nous améliorer à cette étape ?', submit:'Envoyer pour validation', update:'Modifier', withdraw:'Retirer', pending:'En attente', approved:'Approuvé', changes:'Modifications demandées', rejected:'Non approuvé', withdrawn:'Retiré', saved:'Votre commentaire a été envoyé.', withdrawnNotice:'Votre commentaire a été retiré.', anonymous:'Visiteur de la communauté' },
  ru: { comment:'Комментарий', intro:'Комментарии появляются после проверки.', none:'Для этой остановки пока нет одобренных комментариев.', placeholder:'Что запомнилось или что можно улучшить на этой остановке?', submit:'Отправить на проверку', update:'Обновить', withdraw:'Отозвать', pending:'На проверке', approved:'Одобрено', changes:'Нужны изменения', rejected:'Не одобрено', withdrawn:'Отозвано', saved:'Комментарий отправлен на проверку.', withdrawnNotice:'Комментарий отозван.', anonymous:'Посетитель' },
  de: { comment:'Kommentieren', intro:'Kommentare erscheinen nach der Prüfung.', none:'Noch keine freigegebenen Kommentare zu diesem Stopp.', placeholder:'Was war an diesem Stopp hilfreich oder verbesserungswürdig?', submit:'Zur Prüfung senden', update:'Aktualisieren', withdraw:'Zurückziehen', pending:'In Prüfung', approved:'Freigegeben', changes:'Änderungen erforderlich', rejected:'Nicht freigegeben', withdrawn:'Zurückgezogen', saved:'Kommentar wurde zur Prüfung gesendet.', withdrawnNotice:'Kommentar wurde zurückgezogen.', anonymous:'Community-Besucher' },
  es: { comment:'Comentar', intro:'Los comentarios aparecen después de su revisión.', none:'No hay comentarios aprobados para esta parada.', placeholder:'¿Qué fue útil o qué podría mejorarse en esta parada?', submit:'Enviar para revisión', update:'Actualizar', withdraw:'Retirar', pending:'Pendiente', approved:'Aprobado', changes:'Cambios solicitados', rejected:'No aprobado', withdrawn:'Retirado', saved:'Comentario enviado para revisión.', withdrawnNotice:'Comentario retirado.', anonymous:'Visitante' },
};

const statusLabel = (copy: typeof COPY.en, status: TourComment['status']) => ({
  pending_review: copy.pending, approved: copy.approved, changes_requested: copy.changes,
  rejected: copy.rejected, withdrawn: copy.withdrawn,
}[status]);

interface Props {
  tourId: string; stopId: string; stopName: string; language: LanguageCode;
  signedIn: boolean; onOpenAccount: (reason?: AccountPromptReason) => void;
}

export const StopCommentsPanel: React.FC<Props> = ({ tourId, stopId, stopName, language, signedIn, onOpenAccount }) => {
  const copy = COPY[language];
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<PublicTourComment[]>([]);
  const [mine, setMine] = useState<TourComment | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const resumeAfterSignInRef = useRef(false);

  useEffect(() => {
    if (!signedIn || !resumeAfterSignInRef.current) return;
    resumeAfterSignInRef.current = false;
    setOpen(true);
  }, [signedIn]);

  const reload = async () => {
    const [publicItems, own] = await Promise.all([
      getPublicStopComments(tourId, stopId),
      signedIn ? loadMyStopComment(tourId, stopId) : Promise.resolve(null),
    ]);
    setComments(publicItems); setMine(own); setBody(own && own.status !== 'withdrawn' ? own.body : '');
  };

  useEffect(() => {
    if (!open) return;
    let active = true;
    void Promise.all([getPublicStopComments(tourId, stopId), signedIn ? loadMyStopComment(tourId, stopId) : Promise.resolve(null)])
      .then(([publicItems, own]) => { if (active) { setComments(publicItems); setMine(own); setBody(own && own.status !== 'withdrawn' ? own.body : ''); } })
      .catch(() => { if (active) setNotice('Comments could not be loaded.'); });
    return () => { active = false; };
  }, [open, signedIn, stopId, tourId]);

  const toggle = () => {
    if (!signedIn) { resumeAfterSignInRef.current = true; onOpenAccount('comment'); return; }
    setOpen((value) => !value);
  };

  const submit = async () => {
    if (body.trim().length < 3) return;
    setBusy(true); setNotice('');
    try { await submitStopComment(tourId, stopId, body); await reload(); setNotice(copy.saved); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : 'The comment could not be saved.'); }
    finally { setBusy(false); }
  };

  const withdraw = async () => {
    setBusy(true); setNotice('');
    try { await withdrawStopComment(tourId, stopId); await reload(); setNotice(copy.withdrawnNotice); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : 'The comment could not be withdrawn.'); }
    finally { setBusy(false); }
  };

  return <div className="border-t border-slate-100 pt-2">
    <button type="button" onClick={toggle} aria-expanded={open} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-900">
      <MessageCircle className="h-4 w-4"/>{copy.comment}{open ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
    </button>
    {open && <section className="mt-2 space-y-3 rounded-2xl border border-blue-100 bg-white p-3" aria-label={`${copy.comment}: ${stopName}`}>
      <p className="text-[10px] text-slate-500">{copy.intro}</p>
      {comments.length === 0 ? <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">{copy.none}</p> : comments.map((comment) => <article key={comment.id} className="rounded-xl bg-slate-50 p-3"><p className="flex items-center gap-1 text-[10px] font-bold text-emerald-800"><ShieldCheck className="h-3 w-3"/>{copy.anonymous}</p><p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">{comment.body}</p></article>)}
      <div className="rounded-xl border border-slate-200 p-3">
        <div className="flex justify-end">{mine && <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-800">{statusLabel(copy, mine.status)}</span>}</div>
        <textarea rows={4} maxLength={2000} value={body} onChange={(event) => { setBody(event.target.value); setNotice(''); }} placeholder={copy.placeholder} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-xs"/>
        <div className="mt-2 flex gap-2"><button type="button" disabled={busy || body.trim().length < 3} onClick={() => void submit()} className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-900 px-3 text-xs font-bold text-white disabled:opacity-45">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}{mine && mine.status !== 'withdrawn' ? copy.update : copy.submit}</button>{mine && mine.status !== 'withdrawn' && <button type="button" disabled={busy} onClick={() => void withdraw()} className="flex min-h-10 items-center gap-1 rounded-xl border px-3 text-[10px] font-bold text-slate-600"><EyeOff className="h-3.5 w-3.5"/>{copy.withdraw}</button>}</div>
      </div>
      {notice && <p role="status" className="rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-900">{notice}</p>}
    </section>}
  </div>;
};
