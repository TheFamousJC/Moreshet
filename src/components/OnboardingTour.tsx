import React, { useEffect, useState } from 'react';
import { Bookmark, ChevronLeft, ChevronRight, Compass, Headphones, MapPinned, Sparkles } from 'lucide-react';
import { LanguageCode } from '../data/translations';
import { ONBOARDING_COPY } from '../data/onboardingTranslations';
import { useModalFocus } from '../hooks/useModalFocus';

interface OnboardingTourProps {
  isOpen: boolean;
  selectedLanguage: LanguageCode;
  onFinish: () => void;
}

const STEP_ICONS = [Compass, MapPinned, Bookmark];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, selectedLanguage, onFinish }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const copy = ONBOARDING_COPY[selectedLanguage] || ONBOARDING_COPY.en;
  const step = copy.steps[stepIndex];
  const StepIcon = STEP_ICONS[stepIndex] || Sparkles;
  const modalRef = useModalFocus(isOpen, onFinish);

  useEffect(() => {
    if (isOpen) setStepIndex(0);
  }, [isOpen]);

  if (!isOpen) return null;

  const isLastStep = stepIndex === copy.steps.length - 1;
  const previousIcon = selectedLanguage === 'he' ? ChevronRight : ChevronLeft;
  const nextIcon = selectedLanguage === 'he' ? ChevronLeft : ChevronRight;
  const PreviousIcon = previousIcon;
  const NextIcon = nextIcon;

  return (
    <div ref={modalRef} className="fixed inset-0 z-[950] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" aria-describedby="onboarding-description">
      <section className="max-h-[calc(100dvh-env(safe-area-inset-top)-1rem)] w-full overflow-y-auto rounded-t-[2rem] bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 text-slate-900 shadow-2xl sm:max-w-md sm:rounded-[2rem] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-700">{copy.welcome}</p>
          <button type="button" onClick={onFinish} className="min-h-10 rounded-xl px-3 text-xs font-bold text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">{copy.skip}</button>
        </div>

        <div className="mt-2 flex gap-1.5" aria-label={`${copy.progress} ${stepIndex + 1} / ${copy.steps.length}`}>
          {copy.steps.map((item, index) => <span key={item.title} className={`h-1.5 flex-1 rounded-full ${index <= stepIndex ? 'bg-blue-700' : 'bg-slate-200'}`} />)}
        </div>

        <div className="mt-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-950 text-amber-300 shadow-md" aria-hidden="true">
          <StepIcon className={`h-8 w-8 ${stepIndex === 2 ? 'text-[#c43d4d]' : ''}`} />
        </div>
        <h1 id="onboarding-title" className="mt-5 text-2xl font-bold leading-tight text-blue-950">{step.title}</h1>
        <p id="onboarding-description" className="mt-3 text-sm leading-relaxed text-slate-600">{step.body}</p>

        <ul className="mt-5 space-y-3">
          {step.points.map((point, index) => (
            <li key={point} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-800">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800" aria-hidden="true">{index === 0 ? <Headphones className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}</span>
              <span className="pt-1">{point}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setStepIndex((current) => Math.max(0, current - 1))} disabled={stepIndex === 0} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-700 disabled:invisible">
            <PreviousIcon className="h-4 w-4" /> {copy.back}
          </button>
          <button type="button" onClick={() => isLastStep ? onFinish() : setStepIndex((current) => current + 1)} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-900 px-4 text-sm font-bold text-white shadow-md">
            {isLastStep ? copy.start : copy.next} {!isLastStep && <NextIcon className="h-4 w-4" />}
          </button>
        </div>
      </section>
    </div>
  );
};
