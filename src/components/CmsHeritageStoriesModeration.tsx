import React, { useState } from 'react';
import { Ban, BookHeart, Check, ShieldCheck, X } from 'lucide-react';
import { CmsHeritageStory } from '../lib/cmsContent';
import { TourSummary } from '../types';

interface Props {
  stories: CmsHeritageStory[];
  tours: TourSummary[];
  loading: boolean;
  canReview: boolean;
  canBan: boolean;
  onReview: (storyId: string, decision: 'approved' | 'changes_requested' | 'rejected', notes?: string) => Promise<void>;
  onBanUser: (userId: string, reason: string, durationDays?: number) => Promise<string>;
}

const field = 'w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100';

export const CmsHeritageStoriesModeration: React.FC<Props> = ({ stories, tours, loading, canReview, canBan, onReview, onBanUser }) => {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [banTarget, setBanTarget] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const pending = stories.filter((story) => story.status === 'pending_review');
  const published = stories.filter((story) => story.status === 'approved');

  const review = async (story: CmsHeritageStory, decision: 'approved' | 'changes_requested' | 'rejected') => {
    setMessage('');
    try {
      await onReview(story.id, decision, notes[story.id]);
      setNotes((current) => ({ ...current, [story.id]: '' }));
      setMessage(decision === 'approved' ? 'Heritage story approved for public display.' : decision === 'changes_requested' ? 'Changes requested from the contributor.' : 'Story retained as moderation evidence and not displayed publicly.');
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Story moderation failed.');
    }
  };

  const ban = async (story: CmsHeritageStory) => {
    if (banReason.trim().length < 10) return;
    if (!window.confirm('Restrict this account from community submissions? Its public heritage stories will be hidden without deleting evidence.')) return;
    try {
      await onBanUser(story.userId, banReason, 30);
      setBanTarget(null); setBanReason(''); setMessage('Community submission restriction applied.');
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'The account could not be restricted.');
    }
  };

  const card = (story: CmsHeritageStory, isPublished: boolean) => (
    <article key={story.id} className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Heritage story · revision {story.revision} · {story.originalLanguage.toUpperCase()}</p>
          <h4 className="mt-1 text-sm font-bold text-slate-900">{story.title}</h4>
          <p className="mt-1 text-[9px] text-slate-400">{tours.find((tour) => tour.id === story.tourId)?.title || 'Tour'} · account {story.userId.slice(0, 8)}… · {story.attributionMode === 'anonymous' ? 'anonymous' : 'display name'}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{isPublished ? 'public' : 'pending review'}</span>
      </div>
      <blockquote className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800">{story.body}</blockquote>
      {story.media.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{story.media.map((photo) => photo.url ? <a key={photo.path} href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt={`${story.title} ${photo.position}`} className="aspect-square w-full rounded-xl object-cover"/></a> : null)}</div>}
      <p className="mt-2 flex items-center gap-1 text-[9px] text-emerald-700"><ShieldCheck className="h-3 w-3"/>Explicit publication consent recorded for this revision</p>
      {canReview && <>
        <label className="mt-3 block text-[10px] font-bold text-slate-600">Moderation notes {isPublished ? '(required to remove)' : '(required for changes)'}</label>
        <textarea rows={2} className={field} value={notes[story.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [story.id]: event.target.value }))}/>
        {isPublished ? <button disabled={loading || !notes[story.id]?.trim()} onClick={() => void review(story, 'rejected')} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 text-xs font-bold text-rose-700 disabled:opacity-40"><X className="h-4 w-4"/>Remove from public display</button> :
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button disabled={loading || !notes[story.id]?.trim()} onClick={() => void review(story, 'changes_requested')} className="rounded-xl border border-amber-300 py-2 text-[10px] font-bold text-amber-900 disabled:opacity-40">Changes</button>
            <button disabled={loading} onClick={() => void review(story, 'rejected')} className="rounded-xl border border-rose-200 py-2 text-[10px] font-bold text-rose-700 disabled:opacity-40">Reject</button>
            <button aria-label="Approve heritage story" disabled={loading} onClick={() => void review(story, 'approved')} className="rounded-xl bg-emerald-700 py-2 text-[10px] font-bold text-white disabled:opacity-40"><Check className="mx-auto h-4 w-4"/></button>
          </div>}
      </>}
      {canBan && <div className="mt-3 border-t pt-3">{banTarget !== story.id ?
        <button onClick={() => { setBanTarget(story.id); setBanReason(''); }} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-bold"><Ban className="h-3.5 w-3.5"/>Restrict this account</button> :
        <div className="space-y-2 rounded-xl bg-rose-50 p-3"><textarea rows={2} className={field} value={banReason} onChange={(event) => setBanReason(event.target.value)} placeholder="Required reason (10+ characters)"/><div className="flex gap-2"><button onClick={() => setBanTarget(null)} className="flex-1 rounded-xl border bg-white py-2 text-[10px] font-bold">Cancel</button><button disabled={banReason.trim().length < 10} onClick={() => void ban(story)} className="flex-1 rounded-xl bg-rose-700 py-2 text-[10px] font-bold text-white disabled:opacity-40">30-day restriction</button></div></div>}
      </div>}
    </article>
  );

  return <section className="mt-5 space-y-5">
    <div><h3 className="flex items-center gap-2 font-bold"><BookHeart className="h-4 w-4 text-amber-700"/>Heritage stories awaiting review</h3>{pending.length === 0 ? <p className="mt-2 rounded-2xl border bg-white p-4 text-center text-xs text-slate-500">No heritage stories are waiting for review.</p> : <div className="mt-2 space-y-3">{pending.map((story) => card(story, false))}</div>}</div>
    <div><h3 className="flex items-center gap-2 font-bold"><Check className="h-4 w-4 text-emerald-700"/>Published heritage stories</h3>{published.length === 0 ? <p className="mt-2 rounded-2xl border bg-white p-4 text-center text-xs text-slate-500">No heritage stories are currently public.</p> : <div className="mt-2 space-y-3">{published.map((story) => card(story, true))}</div>}</div>
    {message && <p role="status" className="rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-900">{message}</p>}
  </section>;
};
