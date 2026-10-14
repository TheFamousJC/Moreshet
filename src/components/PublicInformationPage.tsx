import React from 'react';
import { ArrowLeft, Bot, ExternalLink, LifeBuoy, LockKeyhole, Scale, ShieldCheck } from 'lucide-react';
import { LanguageCode } from '../data/translations';
import { PUBLIC_INFORMATION_COPY, PublicInformationPageKind } from '../data/publicInformationTranslations';

const LANGUAGE_LABELS: Record<LanguageCode, string> = { en: 'EN', he: 'עברית', ru: 'RU', fr: 'FR', de: 'DE', es: 'ES' };
const PAGE_ICONS = { privacy: LockKeyhole, terms: Scale, ai: Bot, support: LifeBuoy } as const;

export const PUBLIC_INFORMATION_ROUTES: Record<string, PublicInformationPageKind> = {
  '/privacy': 'privacy', '/terms': 'terms', '/ai-disclosure': 'ai', '/support': 'support',
};

export function publicInformationPageForPath(pathname: string): PublicInformationPageKind | null {
  const base=import.meta.env?.BASE_URL || '/';
  const localPath=base!=='/' && pathname.startsWith(base) ? '/'+pathname.slice(base.length) : pathname;
  const normalized = localPath.length > 1 ? localPath.replace(/\/+$/, '') : localPath;
  return PUBLIC_INFORMATION_ROUTES[normalized] || null;
}

export const PublicInformationPage: React.FC<{
  page: PublicInformationPageKind;
  language: LanguageCode;
  onSelectLanguage: (language: LanguageCode) => void;
}> = ({ page, language, onSelectLanguage }) => {
  const copy = PUBLIC_INFORMATION_COPY[language] || PUBLIC_INFORMATION_COPY.en;
  const pageCopy = copy.pages[page];
  const Icon = PAGE_ICONS[page];

  return (
    <div dir={language === 'he' ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <a href={import.meta.env.BASE_URL} className="flex min-w-0 items-center gap-2 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
            <ArrowLeft className="h-5 w-5 shrink-0 text-blue-950 rtl:rotate-180" />
            <img src={`${import.meta.env.BASE_URL}moreshet-logo.jpg`} alt="Moreshet" className="h-9 w-9 rounded-lg object-cover" />
            <span className="truncate text-sm font-bold text-blue-950">{copy.backHome}</span>
          </a>
          <span className="hidden rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900 sm:inline">{copy.pilotLabel}</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-7 sm:py-10">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-950 text-amber-300"><Icon className="h-6 w-6" /></span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-700">{copy.pilotLabel}</p>
            <h1 className="mt-1 text-2xl font-bold text-blue-950 sm:text-3xl">{pageCopy.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{pageCopy.introduction}</p>
            <p className="mt-2 text-[11px] font-semibold text-slate-500">{copy.lastUpdated}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2" aria-label={copy.languageLabel}>
          <span className="me-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{copy.languageLabel}</span>
          {(Object.keys(LANGUAGE_LABELS) as LanguageCode[]).map((item) => (
            <button key={item} type="button" onClick={() => onSelectLanguage(item)} aria-pressed={language === item} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${language === item ? 'border-blue-900 bg-blue-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
              {LANGUAGE_LABELS[item]}
            </button>
          ))}
        </div>

        <div className="mt-7 space-y-4">
          {pageCopy.sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="text-base font-bold text-blue-950">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-6 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />{copy.reviewNotice}
        </p>
        {page === 'privacy' && (
          <p className="mt-4 text-center text-xs text-slate-500">
            <a className="inline-flex items-center gap-1 font-semibold text-blue-800 underline" href="https://www.gov.il/en/departments/the_privacy_protection_authority/govil-landing-page" target="_blank" rel="noreferrer">Israel Privacy Protection Authority <ExternalLink className="h-3 w-3" /></a>
          </p>
        )}
        {page === 'ai' && (
          <p className="mt-4 text-center text-xs text-slate-500">
            <a className="inline-flex items-center gap-1 font-semibold text-blue-800 underline" href="https://platform.openai.com/docs/models/default-usage-policies-by-endpoint" target="_blank" rel="noreferrer">OpenAI API data controls <ExternalLink className="h-3 w-3" /></a>
          </p>
        )}
        {page === 'support' && <p className="mt-5 text-center"><a className="rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white" href="mailto:jeremy@3sci.com">jeremy@3sci.com</a></p>}
      </main>
    </div>
  );
};
