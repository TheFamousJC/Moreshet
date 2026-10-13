import React, { useMemo, useState } from 'react';
import { CheckCircle2, CopyPlus, ExternalLink, FileSearch, Loader2, Pencil, Send, ShieldX } from 'lucide-react';
import { HeritageSite, TourCity, TourSummary } from '../types';
import { CmsAiSource } from '../lib/cmsContent';

const blankSource = (organizationId: string): CmsAiSource => ({
  id: '', organizationId, name: '', sourceType: 'web', url: '', citationLabel: '', author: '', publisher: '', publicationDate: '',
  rightsStatus: 'unknown', verificationNotes: '', evidenceText: '', scopeType: 'organization', status: 'draft',
});

interface Props {
  organizationId: string;
  sources: CmsAiSource[];
  cities: TourCity[];
  tours: TourSummary[];
  sites: HeritageSite[];
  loading: boolean;
  canEdit: boolean;
  canReview: boolean;
  canDisable: boolean;
  onSave: (source: CmsAiSource) => Promise<CmsAiSource>;
  onSubmit: (sourceId: string) => Promise<void>;
  onReview: (sourceId: string, decision: 'published' | 'changes_requested' | 'disabled' | 'draft', notes?: string) => Promise<void>;
}

export const CmsAiSources: React.FC<Props> = ({ organizationId, sources, cities, tours, sites, loading, canEdit, canReview, canDisable, onSave, onSubmit, onReview }) => {
  const [draft, setDraft] = useState<CmsAiSource>(() => blankSource(organizationId));
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
  const label = 'mb-1 block text-xs font-bold text-slate-600';
  const filtered = useMemo(() => sources.filter((source) => `${source.name} ${source.citationLabel} ${source.publisher} ${source.status}`.toLowerCase().includes(query.toLowerCase())), [query, sources]);
  const update = <K extends keyof CmsAiSource>(key: K, value: CmsAiSource[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const reset = () => { setDraft(blankSource(organizationId)); setMessage(''); };
  const act = async (operation: () => Promise<unknown>, success: string) => {
    try { await operation(); setMessage(success); } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'The source operation failed.'); }
  };
  const scopeOptions = draft.scopeType === 'city' ? cities.map((item) => ({ id: item.id, name: item.name }))
    : draft.scopeType === 'tour' ? tours.map((item) => ({ id: item.id, name: item.title }))
      : draft.scopeType === 'stop' ? sites.map((item) => ({ id: item.id, name: item.name })) : [];
  const scopeValue = draft.scopeType === 'city' ? draft.cityId || '' : draft.scopeType === 'tour' ? draft.tourId || '' : draft.scopeType === 'stop' ? draft.stopId || '' : '';

  return <div className="space-y-4">
    <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-950">Add authoritative sources for Ask Herzl. Every source is reviewed before it can ground public answers. Use links and citation metadata; only include material you have the right to use.</p>
    {canEdit && <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2"><div><h3 className="font-bold text-slate-900">{draft.id ? 'Edit source draft' : 'Add AI source'}</h3><p className="text-[10px] text-slate-500">Published sources remain locked; create a revised draft to change one.</p></div>{draft.id && <button type="button" onClick={reset} className="rounded-lg border px-3 py-2 text-xs font-bold">Cancel</button>}</div>
      <div className="grid gap-3 lg:grid-cols-2">
        <label><span className={label}>Source name *</span><input className={field} value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder="National Library of Israel" /></label>
        <label><span className={label}>Source type</span><select className={field} value={draft.sourceType} onChange={(event) => update('sourceType', event.target.value as CmsAiSource['sourceType'])}>{['institution','web','document','book','article','archive'].map((value) => <option key={value} value={value}>{value.replace('_',' ')}</option>)}</select></label>
        <label className="lg:col-span-2"><span className={label}>Source URL</span><input className={field} type="url" value={draft.url} onChange={(event) => update('url', event.target.value)} placeholder="https://..." /></label>
        <label className="lg:col-span-2"><span className={label}>Citation shown with answers *</span><input className={field} value={draft.citationLabel} onChange={(event) => update('citationLabel', event.target.value)} placeholder="National Library of Israel, collection title" /></label>
        <label><span className={label}>Author</span><input className={field} value={draft.author} onChange={(event) => update('author', event.target.value)} /></label>
        <label><span className={label}>Publisher / institution</span><input className={field} value={draft.publisher} onChange={(event) => update('publisher', event.target.value)} /></label>
        <label><span className={label}>Publication date</span><input className={field} type="date" value={draft.publicationDate} onChange={(event) => update('publicationDate', event.target.value)} /></label>
        <label><span className={label}>Usage rights</span><select className={field} value={draft.rightsStatus} onChange={(event) => update('rightsStatus', event.target.value as CmsAiSource['rightsStatus'])}>{['unknown','public_domain','licensed','permission_granted','link_only'].map((value) => <option key={value} value={value}>{value.replaceAll('_',' ')}</option>)}</select></label>
        <label><span className={label}>Applies to</span><select className={field} value={draft.scopeType} onChange={(event) => setDraft((current) => ({ ...current, scopeType: event.target.value as CmsAiSource['scopeType'], cityId: undefined, tourId: undefined, stopId: undefined }))}>{['organization','city','tour','stop'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        {draft.scopeType !== 'organization' && <label><span className={label}>Choose {draft.scopeType} *</span><select className={field} value={scopeValue} onChange={(event) => setDraft((current) => ({ ...current, cityId: current.scopeType === 'city' ? event.target.value : undefined, tourId: current.scopeType === 'tour' ? event.target.value : undefined, stopId: current.scopeType === 'stop' ? event.target.value : undefined }))}><option value="">Select…</option>{scopeOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        <label className="lg:col-span-2"><span className={label}>Verification notes</span><textarea className={`${field} min-h-20`} value={draft.verificationNotes} onChange={(event) => update('verificationNotes', event.target.value)} placeholder="Why this source is reliable and what it supports" /></label>
        <label className="lg:col-span-2"><span className={label}>Approved evidence text</span><textarea className={`${field} min-h-32`} maxLength={30000} value={draft.evidenceText} onChange={(event) => update('evidenceText', event.target.value)} placeholder="Paste a verified extract or an editor-written factual summary only when you have permission to use it. Ask Herzl can ground answers in this text after review." /><span className="mt-1 block text-[10px] text-slate-400">{draft.evidenceText.length.toLocaleString()} / 30,000 characters</span></label>
      </div>
      <button disabled={loading} type="button" onClick={() => void act(async () => { await onSave(draft); reset(); }, 'Source draft saved.') } className="mt-3 flex min-h-11 items-center gap-2 rounded-xl bg-blue-950 px-4 text-sm font-bold text-white disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}Save source draft</button>
    </section>}

    <section><div className="mb-2 flex items-center gap-2 rounded-xl border bg-white px-3"><FileSearch className="h-4 w-4 text-slate-400"/><input className="min-h-11 flex-1 text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sources" /></div>
      {filtered.length === 0 ? <p className="rounded-2xl border bg-white p-5 text-center text-sm text-slate-500">No AI sources have been added yet.</p> : <div className="space-y-3">{filtered.map((source) => <article key={source.id} className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="font-bold text-slate-900">{source.name}</h4><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${source.status === 'published' ? 'bg-emerald-100 text-emerald-800' : source.status === 'pending_review' ? 'bg-amber-100 text-amber-800' : source.status === 'changes_requested' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>{source.status.replace('_',' ')}</span></div><p className="mt-1 text-xs text-slate-600">{source.citationLabel}</p><p className="mt-1 text-[10px] text-slate-400">{source.sourceType} · {source.scopeType} · rights: {source.rightsStatus.replaceAll('_',' ')}</p>{source.reviewNotes && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-800">Review note: {source.reviewNotes}</p>}</div>{source.url && <a href={source.url} target="_blank" rel="noreferrer" aria-label={`Open ${source.name}`} className="rounded-lg border p-2 text-blue-800"><ExternalLink className="h-4 w-4"/></a>}</div>
        <div className="mt-3 flex flex-wrap gap-2">{canEdit && ['draft','changes_requested'].includes(source.status) && <><button type="button" onClick={() => { setDraft(source); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold"><Pencil className="h-3.5 w-3.5"/>Edit</button><button disabled={loading} type="button" onClick={() => void act(() => onSubmit(source.id), 'Source submitted for review.')} className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-blue-950"><Send className="h-3.5 w-3.5"/>Submit</button></>}
          {canEdit && source.status === 'published' && <button type="button" onClick={() => { setDraft({ ...source, id: '', status: 'draft', name: `${source.name} (revised draft)` }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold"><CopyPlus className="h-3.5 w-3.5"/>Revised draft</button>}
          {canReview && source.status === 'pending_review' && <button disabled={loading} type="button" onClick={() => void act(() => onReview(source.id, 'published'), 'Source approved and published.')} className="flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white"><CheckCircle2 className="h-3.5 w-3.5"/>Approve</button>}
          {canDisable && source.status !== 'disabled' && <button disabled={loading} type="button" onClick={() => { if (window.confirm(`Archive “${source.name}”? It will stop grounding public AI answers but can be restored.`)) void act(() => onReview(source.id, 'disabled', notes[source.id]), 'Source archived.'); }} className="flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700"><ShieldX className="h-3.5 w-3.5"/>Archive</button>}
          {canDisable && source.status === 'disabled' && <button disabled={loading} type="button" onClick={() => void act(() => onReview(source.id, 'draft'), 'Source restored as a draft.')} className="flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700">Restore as draft</button>}
        </div>
        {canReview && source.status === 'pending_review' && <div className="mt-2 flex gap-2"><input className={`${field} min-w-0 flex-1`} value={notes[source.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [source.id]: event.target.value }))} placeholder="Reason if changes are required"/><button disabled={loading || !notes[source.id]?.trim()} type="button" onClick={() => void act(() => onReview(source.id, 'changes_requested', notes[source.id]), 'Source returned for changes.')} className="rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-700 disabled:opacity-40">Request changes</button></div>}
      </article>)}</div>}
    </section>
    {message && <p role="status" className="rounded-xl bg-blue-50 p-3 text-xs font-bold text-blue-900">{message}</p>}
  </div>;
};
