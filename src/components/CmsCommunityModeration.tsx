import React, { useMemo, useState } from 'react';
import { Ban, Check, Clock3, MessageCircle, RotateCcw, ShieldAlert, X } from 'lucide-react';
import { CmsCommunityBan, CmsTourComment } from '../lib/cmsContent';
import { HeritageSite, TourSummary } from '../types';

interface CmsCommunityModerationProps {
  comments: CmsTourComment[];
  bans: CmsCommunityBan[];
  tours: TourSummary[];
  sites: HeritageSite[];
  loading: boolean;
  canReview: boolean;
  canBan: boolean;
  onReviewComment: (commentId: string, decision: 'approved' | 'changes_requested' | 'rejected', notes?: string) => Promise<void>;
  onBanUser: (userId: string, reason: string, durationDays?: number) => Promise<string>;
  onLiftBan: (banId: string, reason: string) => Promise<void>;
}

const field = 'w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100';

export const CmsCommunityModeration: React.FC<CmsCommunityModerationProps> = ({ comments, bans, tours, sites, loading, canReview, canBan, onReviewComment, onBanUser, onLiftBan }) => {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [banTarget, setBanTarget] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('30');
  const [liftReasons, setLiftReasons] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const pending = comments.filter((item) => item.status === 'pending_review');
  const published = comments.filter((item) => item.status === 'approved');
  const activeBans = useMemo(() => bans.filter((item) => !item.liftedAt && (!item.expiresAt || new Date(item.expiresAt) > new Date())), [bans]);

  const review = async (item: CmsTourComment, decision: 'approved' | 'changes_requested' | 'rejected') => {
    setMessage('');
    try {
      await onReviewComment(item.id, decision, notes[item.id]);
      setNotes((current) => ({ ...current, [item.id]: '' }));
      setMessage(decision === 'approved' ? 'Comment approved for anonymous public display.' : decision === 'rejected' ? 'Comment retained privately and removed from public display.' : 'Changes requested from the visitor.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Comment moderation failed.'); }
  };

  const ban = async (item: CmsTourComment) => {
    if (banReason.trim().length < 10) return setMessage('Enter a clear ban reason of at least 10 characters.');
    const duration = banDuration === 'permanent' ? undefined : Number(banDuration);
    if (!window.confirm(`Restrict this account from community submissions${duration ? ` for ${duration} days` : ' permanently'}? Its current comments will be hidden but retained as moderation evidence.`)) return;
    setMessage('');
    try {
      await onBanUser(item.userId, banReason, duration);
      setBanTarget(null); setBanReason(''); setMessage('Community submission ban applied and recorded in the audit trail.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'The account could not be restricted.'); }
  };

  const lift = async (item: CmsCommunityBan) => {
    const reason = liftReasons[item.id]?.trim() || '';
    if (reason.length < 3) return setMessage('Enter a reason before lifting the ban.');
    if (!window.confirm('Lift this community submission ban? The account will be able to submit new moderated comments.')) return;
    setMessage('');
    try { await onLiftBan(item.id, reason); setMessage('Community submission ban lifted. Previously rejected comments remain private.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'The ban could not be lifted.'); }
  };

  const commentCard = (item: CmsTourComment, isPublished: boolean) => {
    const tour = tours.find((entry) => entry.id === item.tourId);
    const stop = sites.find((entry) => entry.id === item.stopId);
    const removalReasonRequired = isPublished;
    return <article key={item.id} className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">{item.stopId ? 'Stop comment' : 'Legacy tour comment'} · revision {item.revision}</p><h4 className="mt-1 text-sm font-bold text-slate-900">{stop?.name || tour?.title || 'Tour'}</h4>{stop && <p className="mt-0.5 text-[10px] font-semibold text-slate-600">Tour: {tour?.title || 'Tour'}</p>}<p className="mt-1 text-[9px] text-slate-400">Visitor account {item.userId.slice(0, 8)}… · {new Date(item.submittedAt).toLocaleDateString()}</p></div><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{isPublished ? 'public' : 'pending review'}</span></div>
      <blockquote className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800">{item.body}</blockquote>
      {canReview && <><label className="mt-3 block text-[10px] font-bold text-slate-600">Moderation notes {removalReasonRequired ? '(required to remove)' : ''}</label><textarea className={field} rows={2} value={notes[item.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder={isPublished ? 'Explain why this public comment must be removed' : 'Required when requesting changes'}/>{isPublished ? <button type="button" disabled={loading || !notes[item.id]?.trim()} onClick={() => void review(item, 'rejected')} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 text-xs font-bold text-rose-700 disabled:opacity-40"><X className="h-4 w-4"/>Remove from public display</button> : <div className="mt-3 grid grid-cols-3 gap-2"><button type="button" disabled={loading || !notes[item.id]?.trim()} onClick={() => void review(item, 'changes_requested')} className="rounded-xl border border-amber-300 py-2 text-[10px] font-bold text-amber-900 disabled:opacity-40">Changes</button><button type="button" disabled={loading} onClick={() => void review(item, 'rejected')} className="rounded-xl border border-rose-200 py-2 text-[10px] font-bold text-rose-700 disabled:opacity-40">Reject</button><button type="button" disabled={loading} onClick={() => void review(item, 'approved')} className="rounded-xl bg-emerald-700 py-2 text-[10px] font-bold text-white disabled:opacity-40">Approve</button></div>}</>}
      {canBan && <div className="mt-3 border-t border-slate-100 pt-3">{banTarget !== item.id ? <button type="button" onClick={() => { setBanTarget(item.id); setBanReason(''); }} className="flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-[10px] font-bold text-slate-700"><Ban className="h-3.5 w-3.5"/>Restrict this account</button> : <div className="space-y-2 rounded-xl bg-rose-50 p-3"><p className="flex items-center gap-2 text-[10px] font-bold text-rose-900"><ShieldAlert className="h-4 w-4"/>Administrator community ban</p><textarea rows={2} className={field} value={banReason} onChange={(event) => setBanReason(event.target.value)} placeholder="Required reason (10+ characters)"/><select className={field} value={banDuration} onChange={(event) => setBanDuration(event.target.value)}><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="365">1 year</option><option value="permanent">Permanent</option></select><div className="flex gap-2"><button type="button" onClick={() => setBanTarget(null)} className="min-h-9 flex-1 rounded-xl border border-slate-200 bg-white text-[10px] font-bold">Cancel</button><button type="button" disabled={loading || banReason.trim().length < 10} onClick={() => void ban(item)} className="min-h-9 flex-1 rounded-xl bg-rose-700 text-[10px] font-bold text-white disabled:opacity-40">Apply ban</button></div></div>}</div>}
    </article>;
  };

  return <section className="mt-5 space-y-5">
    <div><h3 className="flex items-center gap-2 font-bold"><MessageCircle className="h-4 w-4 text-blue-800"/>Tour comments awaiting review</h3>{pending.length === 0 ? <p className="mt-2 rounded-2xl border bg-white p-4 text-center text-xs text-slate-500">No tour comments are waiting for review.</p> : <div className="mt-2 space-y-3">{pending.map((item) => commentCard(item, false))}</div>}</div>
    <div><h3 className="flex items-center gap-2 font-bold"><Check className="h-4 w-4 text-emerald-700"/>Published tour comments</h3><p className="mt-1 text-[10px] text-slate-500">Approved comments can be removed from public display with a recorded reason.</p>{published.length === 0 ? <p className="mt-2 rounded-2xl border bg-white p-4 text-center text-xs text-slate-500">No comments are currently public.</p> : <div className="mt-2 space-y-3">{published.map((item) => commentCard(item, true))}</div>}</div>
    <div><h3 className="flex items-center gap-2 font-bold"><Ban className="h-4 w-4 text-rose-700"/>Active community bans</h3><p className="mt-1 text-[10px] text-slate-500">Reviewers can see restrictions. Only Administrators and Super Admins can apply or lift them.</p>{activeBans.length === 0 ? <p className="mt-2 rounded-2xl border bg-white p-4 text-center text-xs text-slate-500">No active community bans.</p> : <div className="mt-2 space-y-3">{activeBans.map((item) => <article key={item.id} className="rounded-2xl border border-rose-100 bg-white p-4"><p className="text-xs font-bold text-slate-900">Account {item.userId.slice(0, 8)}…</p><p className="mt-2 whitespace-pre-wrap rounded-xl bg-rose-50 p-3 text-xs text-rose-950">{item.reason}</p><p className="mt-2 flex items-center gap-1 text-[9px] text-slate-500"><Clock3 className="h-3 w-3"/>{item.expiresAt ? `Expires ${new Date(item.expiresAt).toLocaleString()}` : 'Permanent until lifted'}</p>{canBan && <div className="mt-3 flex gap-2"><input className={field} value={liftReasons[item.id] || ''} onChange={(event) => setLiftReasons((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Reason for lifting ban"/><button type="button" disabled={loading || (liftReasons[item.id]?.trim().length || 0) < 3} onClick={() => void lift(item)} className="flex shrink-0 items-center gap-1 rounded-xl bg-emerald-700 px-3 text-[10px] font-bold text-white disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5"/>Lift</button></div>}</article>)}</div>}</div>
    {message && <p role="status" className="rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-900">{message}</p>}
  </section>;
};
