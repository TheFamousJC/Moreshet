import React, { useEffect, useState } from 'react';
import { Copy, EyeOff, Heart, Loader2, MessageCircle, Send, Share2, ShieldCheck, Star } from 'lucide-react';
import { LanguageCode } from '../data/translations';
import { TourSummary } from '../types';
import {
  getPublicTourComments,
  getTourLikeSummary,
  getTourRatingSummary,
  loadMyTourComment,
  PublicTourComment,
  submitTourComment,
  setTourLike,
  TourComment,
  withdrawTourComment,
} from '../lib/community';
import { buildTourShareUrl } from '../lib/tourSharing';

const COPY: Record<LanguageCode, {
  title: string; publicOnly: string; noComments: string; rating: string; ratings: string;
  write: string; placeholder: string; submit: string; update: string; withdraw: string;
  signIn: string; pending: string; approved: string; changes: string; rejected: string; withdrawn: string;
  saved: string; withdrawnNotice: string; anonymous: string;
  like: string; unlike: string; likes: string; share: string; copyLink: string; linkCopied: string; shared: string;
}> = {
  en: { title: 'Tour comments', publicOnly: 'Comments appear here only after review. Public comments do not reveal account identities.', noComments: 'No approved comments yet.', rating: 'rating', ratings: 'ratings', write: 'Share a comment', placeholder: 'What was useful, memorable or could be improved?', submit: 'Send for review', update: 'Update comment', withdraw: 'Withdraw comment', signIn: 'Sign in to comment', pending: 'Awaiting review', approved: 'Approved', changes: 'Changes requested', rejected: 'Not approved', withdrawn: 'Withdrawn', saved: 'Your comment was sent for review.', withdrawnNotice: 'Your comment was withdrawn.', anonymous: 'Community visitor', like: 'Like', unlike: 'Unlike', likes: 'likes', share: 'Share', copyLink: 'Copy link', linkCopied: 'Tour link copied.', shared: 'Tour ready to share.' },
  he: { title: 'תגובות לסיור', publicOnly: 'תגובות מופיעות כאן רק לאחר בדיקה, ללא חשיפת זהות החשבון.', noComments: 'עדיין אין תגובות מאושרות.', rating: 'דירוג', ratings: 'דירוגים', write: 'שיתוף תגובה', placeholder: 'מה היה מועיל, זכור או ראוי לשיפור?', submit: 'שליחה לבדיקה', update: 'עדכון תגובה', withdraw: 'משיכת תגובה', signIn: 'התחברו כדי להגיב', pending: 'ממתין לבדיקה', approved: 'מאושר', changes: 'נדרשים שינויים', rejected: 'לא אושר', withdrawn: 'נמשך', saved: 'התגובה נשלחה לבדיקה.', withdrawnNotice: 'התגובה נמשכה.', anonymous: 'מבקר בקהילה', like: 'אהבתי', unlike: 'ביטול אהבתי', likes: 'אהבו', share: 'שיתוף', copyLink: 'העתקת קישור', linkCopied: 'הקישור לסיור הועתק.', shared: 'הסיור מוכן לשיתוף.' },
  fr: { title: 'Commentaires sur la visite', publicOnly: 'Les commentaires paraissent uniquement après validation, sans révéler l’identité du compte.', noComments: 'Aucun commentaire approuvé pour le moment.', rating: 'note', ratings: 'notes', write: 'Partager un commentaire', placeholder: 'Qu’avez-vous apprécié ou que pourrions-nous améliorer ?', submit: 'Envoyer pour validation', update: 'Modifier le commentaire', withdraw: 'Retirer le commentaire', signIn: 'Connectez-vous pour commenter', pending: 'En attente de validation', approved: 'Approuvé', changes: 'Modifications demandées', rejected: 'Non approuvé', withdrawn: 'Retiré', saved: 'Votre commentaire a été envoyé pour validation.', withdrawnNotice: 'Votre commentaire a été retiré.', anonymous: 'Visiteur de la communauté', like: 'J’aime', unlike: 'Je n’aime plus', likes: 'mentions J’aime', share: 'Partager', copyLink: 'Copier le lien', linkCopied: 'Lien de la visite copié.', shared: 'Visite prête à être partagée.' },
  ru: { title: 'Комментарии к маршруту', publicOnly: 'Комментарии публикуются только после проверки и без раскрытия личности.', noComments: 'Одобренных комментариев пока нет.', rating: 'оценка', ratings: 'оценок', write: 'Оставить комментарий', placeholder: 'Что было полезно или что можно улучшить?', submit: 'Отправить на проверку', update: 'Обновить комментарий', withdraw: 'Отозвать комментарий', signIn: 'Войдите, чтобы комментировать', pending: 'Ожидает проверки', approved: 'Одобрено', changes: 'Запрошены изменения', rejected: 'Не одобрено', withdrawn: 'Отозвано', saved: 'Комментарий отправлен на проверку.', withdrawnNotice: 'Комментарий отозван.', anonymous: 'Участник сообщества', like: 'Нравится', unlike: 'Убрать отметку', likes: 'отметок', share: 'Поделиться', copyLink: 'Копировать ссылку', linkCopied: 'Ссылка на маршрут скопирована.', shared: 'Маршрут готов к отправке.' },
  de: { title: 'Tour-Kommentare', publicOnly: 'Kommentare erscheinen erst nach Prüfung und ohne Offenlegung der Kontoidentität.', noComments: 'Noch keine freigegebenen Kommentare.', rating: 'Bewertung', ratings: 'Bewertungen', write: 'Kommentar teilen', placeholder: 'Was war hilfreich oder könnte verbessert werden?', submit: 'Zur Prüfung senden', update: 'Kommentar aktualisieren', withdraw: 'Kommentar zurückziehen', signIn: 'Zum Kommentieren anmelden', pending: 'Prüfung ausstehend', approved: 'Freigegeben', changes: 'Änderungen angefordert', rejected: 'Nicht freigegeben', withdrawn: 'Zurückgezogen', saved: 'Ihr Kommentar wurde zur Prüfung gesendet.', withdrawnNotice: 'Ihr Kommentar wurde zurückgezogen.', anonymous: 'Community-Besucher', like: 'Gefällt mir', unlike: 'Gefällt mir nicht mehr', likes: 'Gefällt-mir-Angaben', share: 'Teilen', copyLink: 'Link kopieren', linkCopied: 'Tour-Link kopiert.', shared: 'Tour kann geteilt werden.' },
  es: { title: 'Comentarios del recorrido', publicOnly: 'Los comentarios aparecen solo tras su revisión y sin revelar la identidad de la cuenta.', noComments: 'Todavía no hay comentarios aprobados.', rating: 'valoración', ratings: 'valoraciones', write: 'Compartir un comentario', placeholder: '¿Qué fue útil o qué podría mejorarse?', submit: 'Enviar para revisión', update: 'Actualizar comentario', withdraw: 'Retirar comentario', signIn: 'Inicia sesión para comentar', pending: 'Pendiente de revisión', approved: 'Aprobado', changes: 'Cambios solicitados', rejected: 'No aprobado', withdrawn: 'Retirado', saved: 'Tu comentario fue enviado para revisión.', withdrawnNotice: 'Tu comentario fue retirado.', anonymous: 'Visitante de la comunidad', like: 'Me gusta', unlike: 'Ya no me gusta', likes: 'me gusta', share: 'Compartir', copyLink: 'Copiar enlace', linkCopied: 'Enlace del recorrido copiado.', shared: 'Recorrido listo para compartir.' },
};

const statusLabel = (copy: typeof COPY.en, status: TourComment['status']) => ({
  pending_review: copy.pending,
  approved: copy.approved,
  changes_requested: copy.changes,
  rejected: copy.rejected,
  withdrawn: copy.withdrawn,
}[status]);

interface TourCommunityPanelProps {
  tour: TourSummary;
  language: LanguageCode;
  signedIn: boolean;
  onOpenAccount: () => void;
}

export const TourCommunityPanel: React.FC<TourCommunityPanelProps> = ({ tour, language, signedIn, onOpenAccount }) => {
  const copy = COPY[language];
  const [comments, setComments] = useState<PublicTourComment[]>([]);
  const [myComment, setMyComment] = useState<TourComment | null>(null);
  const [body, setBody] = useState('');
  const [average, setAverage] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const reload = async () => {
    const [publicComments, ratingSummary, likeSummary, own] = await Promise.all([
      getPublicTourComments(tour.id),
      getTourRatingSummary(tour.id),
      getTourLikeSummary(tour.id),
      signedIn ? loadMyTourComment(tour.id) : Promise.resolve(null),
    ]);
    setComments(publicComments);
    setAverage(ratingSummary.average);
    setRatingCount(ratingSummary.count);
    setLikeCount(likeSummary.count);
    setLiked(likeSummary.liked);
    setMyComment(own);
    setBody(own && own.status !== 'withdrawn' ? own.body : '');
  };

  useEffect(() => {
    let active = true;
    void Promise.all([
      getPublicTourComments(tour.id),
      getTourRatingSummary(tour.id),
      getTourLikeSummary(tour.id),
      signedIn ? loadMyTourComment(tour.id) : Promise.resolve(null),
    ]).then(([publicComments, ratingSummary, likeSummary, own]) => {
      if (!active) return;
      setComments(publicComments); setAverage(ratingSummary.average); setRatingCount(ratingSummary.count); setMyComment(own);
      setLikeCount(likeSummary.count); setLiked(likeSummary.liked);
      setBody(own && own.status !== 'withdrawn' ? own.body : '');
    }).catch(() => { if (active) setNotice('Community information could not be loaded.'); });
    return () => { active = false; };
  }, [signedIn, tour.id]);

  const submit = async () => {
    if (body.trim().length < 3) return;
    setBusy(true); setNotice('');
    try { await submitTourComment(tour.id, body); await reload(); setNotice(copy.saved); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : 'The comment could not be saved.'); }
    finally { setBusy(false); }
  };

  const withdraw = async () => {
    setBusy(true); setNotice('');
    try { await withdrawTourComment(tour.id); await reload(); setNotice(copy.withdrawnNotice); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : 'The comment could not be withdrawn.'); }
    finally { setBusy(false); }
  };

  const toggleLike = async () => {
    if (!signedIn) return onOpenAccount();
    setBusy(true); setNotice('');
    try { const result = await setTourLike(tour.id, !liked); setLiked(result.liked); setLikeCount(result.count); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : 'The tour like could not be updated.'); }
    finally { setBusy(false); }
  };

  const shareUrl = () => {
    const organization = new URLSearchParams(window.location.search).get('organization');
    return buildTourShareUrl(window.location.origin, organization, tour.cityId, tour.id);
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl()); setNotice(copy.linkCopied); }
    catch { setNotice('The tour link could not be copied.'); }
  };

  const shareTour = async () => {
    const data = { title: tour.title, text: tour.subtitle || tour.overview, url: shareUrl() };
    try {
      if (navigator.share) { await navigator.share(data); setNotice(copy.shared); }
      else await copyLink();
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setNotice('The tour could not be shared.');
    }
  };

  return <section className="space-y-3 rounded-3xl border border-blue-100 bg-white p-4 shadow-xs" aria-labelledby="tour-comments-title">
    <div className="flex items-start justify-between gap-3">
      <div><h2 id="tour-comments-title" className="flex items-center gap-2 text-sm font-bold text-blue-950"><MessageCircle className="h-4 w-4 text-blue-700"/>{copy.title}</h2><p className="mt-1 text-[10px] leading-relaxed text-slate-500">{copy.publicOnly}</p></div>
      {ratingCount > 0 && <div className="shrink-0 rounded-xl bg-amber-50 px-2.5 py-2 text-center text-amber-900" aria-label={`${average} out of 5, ${ratingCount}`}><p className="flex items-center justify-center gap-1 text-sm font-bold"><Star className="h-4 w-4 fill-amber-400 text-amber-500"/>{average?.toFixed(1)}</p><p className="text-[9px]">{ratingCount} {ratingCount === 1 ? copy.rating : copy.ratings}</p></div>}
    </div>

    <div className="grid grid-cols-3 gap-2" aria-label="Tour community actions">
      <button type="button" aria-pressed={liked} disabled={busy} onClick={() => void toggleLike()} className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-[10px] font-bold disabled:opacity-45 ${liked ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-700'}`}><Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`}/>{liked ? copy.unlike : copy.like} · {likeCount}</button>
      <button type="button" onClick={() => void shareTour()} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-2 text-[10px] font-bold text-blue-900"><Share2 className="h-4 w-4"/>{copy.share}</button>
      <button type="button" onClick={() => void copyLink()} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 text-[10px] font-bold text-slate-700"><Copy className="h-4 w-4"/>{copy.copyLink}</button>
    </div>

    <div className="space-y-2">
      {comments.length === 0 ? <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">{copy.noComments}</p> : comments.map((comment) => <article key={comment.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><p className="flex items-center gap-1 text-[10px] font-bold text-emerald-800"><ShieldCheck className="h-3 w-3"/>{copy.anonymous}</p><p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{comment.body}</p><time className="mt-2 block text-[9px] text-slate-400">{new Date(comment.publishedAt).toLocaleDateString(language)}</time></article>)}
    </div>

    {!signedIn ? <button type="button" onClick={onOpenAccount} className="min-h-11 w-full rounded-2xl bg-blue-900 px-4 text-xs font-bold text-white">{copy.signIn}</button> : <div className="rounded-2xl border border-slate-200 p-3"><div className="flex items-center justify-between gap-2"><label htmlFor={`tour-comment-${tour.id}`} className="text-xs font-bold text-slate-800">{copy.write}</label>{myComment && <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-800">{statusLabel(copy, myComment.status)}</span>}</div><textarea id={`tour-comment-${tour.id}`} rows={4} maxLength={2000} value={body} onChange={(event) => { setBody(event.target.value); setNotice(''); }} placeholder={copy.placeholder} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"/><div className="mt-1 text-right text-[9px] text-slate-400">{body.length}/2000</div><div className="mt-2 flex gap-2"><button type="button" disabled={busy || body.trim().length < 3} onClick={() => void submit()} className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-900 px-3 text-xs font-bold text-white disabled:opacity-45">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}{myComment && myComment.status !== 'withdrawn' ? copy.update : copy.submit}</button>{myComment && myComment.status !== 'withdrawn' && <button type="button" disabled={busy} onClick={() => void withdraw()} className="flex min-h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-[10px] font-bold text-slate-600 disabled:opacity-45"><EyeOff className="h-3.5 w-3.5"/>{copy.withdraw}</button>}</div></div>}
    {notice && <p role="status" className={`rounded-xl p-3 text-xs font-semibold ${[copy.saved, copy.withdrawnNotice, copy.linkCopied, copy.shared].includes(notice) ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{notice}</p>}
  </section>;
};
