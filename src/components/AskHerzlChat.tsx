import React, { useEffect, useState } from 'react';
import { ExternalLink, Copy, X, BookOpen } from 'lucide-react';
import { ChatMessage, TourCity } from '../types';
import { LanguageCode } from '../data/translations';
import { PERSONAL_AI_SERVICES, buildPersonalAiPrompt } from '../lib/externalAi';
import { JEWISH_HERITAGE_ARCHIVES } from '../data/heritageArchives';

interface AskHerzlChatProps {
  chatMessages: ChatMessage[]; onSendMessage: (text: string) => Promise<void>; isSending: boolean;
  responseMode?: 'simulator' | 'live' | 'fallback' | null;
  selectedCityId: string; selectedTourId: string; currentCity?: TourCity | null;
  contentSource: 'shared' | 'cache' | 'demo'; selectedLanguage: LanguageCode; signedIn: boolean;
  onOpenAccount: () => void; onClose?: () => void; initialQuestion?: string; onInitialQuestionConsumed?: () => void;
}
export const AskHerzlChat: React.FC<AskHerzlChatProps> = (props) => {
  const [question,setQuestion]=useState(props.initialQuestion || 'What should I know about the Jewish heritage of this city?');
  const [provider,setProvider]=useState<keyof typeof PERSONAL_AI_SERVICES>('chatgpt');
  const [notice,setNotice]=useState('');
  useEffect(()=>{if(props.initialQuestion){setQuestion(props.initialQuestion);props.onInitialQuestionConsumed?.();}},[props.initialQuestion]);
  const prompt=buildPersonalAiPrompt(question,props.currentCity?.name || props.selectedCityId,props.selectedLanguage,props.selectedTourId);
  const copy=async()=>{try{await navigator.clipboard.writeText(prompt);setNotice('Prompt copied. Open your AI and paste it into your own chat.');}catch{setNotice('Clipboard unavailable. Select and copy the prompt below.');}};
  return <section className="mx-auto max-w-xl space-y-5 p-5 pb-28 text-slate-900" dir={props.selectedLanguage==='he'?'rtl':'ltr'}>
    <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Ask Benjamin</p><h1 className="mt-2 text-2xl font-bold">Explore with your own AI</h1></div>{props.onClose&&<button aria-label="Close AI assistant" onClick={props.onClose} className="p-3"><X/></button>}</div>
    <p className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed">Tudela prepares a research prompt. You choose an AI website, sign in there, and paste it yourself. Nothing is submitted automatically and no AI API is used.</p>
    <label className="block text-sm font-semibold">Your question<textarea className="mt-2 min-h-24 w-full rounded-xl border p-3 font-normal" maxLength={2000} value={question} onChange={e=>setQuestion(e.target.value)}/></label>
    <label className="block text-sm font-semibold">Your AI service<select className="mt-2 w-full rounded-xl border bg-white p-3" value={provider} onChange={e=>setProvider(e.target.value as keyof typeof PERSONAL_AI_SERVICES)}>{Object.entries(PERSONAL_AI_SERVICES).map(([key,item])=><option key={key} value={key}>{item.name}</option>)}</select></label>
    <div className="flex flex-wrap gap-3"><button disabled={!question.trim()} onClick={copy} className="flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-3 text-sm font-bold text-white"><Copy size={17}/>1. Copy prompt</button><a href={PERSONAL_AI_SERVICES[provider].url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-900"><ExternalLink size={17}/>2. Open {PERSONAL_AI_SERVICES[provider].name}</a></div>
    <p role="status" className="text-sm text-emerald-800">{notice}</p>
    <details className="rounded-xl border bg-white p-4" open><summary className="cursor-pointer text-sm font-bold">Review what you will share</summary><textarea aria-label="Prepared research prompt" readOnly value={prompt} className="mt-3 min-h-56 w-full rounded-lg border p-3 text-xs leading-relaxed"/></details>
    <p className="text-xs leading-relaxed text-slate-500">Only this prompt is copied. GPS, private notes and your account are excluded. Your chosen AI may have limits or subscription costs. Answers stay in that service and require human fact-checking.</p>
    <details className="rounded-xl border bg-white p-4"><summary className="flex cursor-pointer items-center gap-2 text-sm font-bold"><BookOpen size={16}/>Heritage research sources</summary><p className="my-3 text-xs text-slate-500">Research starting points; listing a source does not mean an AI checked it.</p><div className="space-y-2">{JEWISH_HERITAGE_ARCHIVES.map((archive,index)=><a key={index} href={archive.url} target="_blank" rel="noopener noreferrer" className="block text-sm text-blue-800 underline">{archive.name}</a>)}</div></details>
  </section>;
};
export const AskBenjaminChat=AskHerzlChat;
