import React, { useEffect, useState } from 'react';
import { BellRing, Bookmark, Check, ChevronLeft, ChevronRight, CircleHelp, MapPin, Settings, Volume2 } from 'lucide-react';
import { LanguageCode } from '../data/translations';
import { VisitorPreferences } from '../types';
import { useModalFocus } from '../hooks/useModalFocus';

interface FirstSignInSetupWizardProps {
  isOpen: boolean;
  selectedLanguage: LanguageCode;
  preferences: VisitorPreferences;
  onComplete: (preferences: VisitorPreferences) => void;
}

type Copy = {
  welcome: string; progress: string; back: string; next: string; finish: string;
  steps: Array<{ title: string; body: string }>;
  locationOn: string; locationOff: string; recommended: string;
  auto: string; autoHelp: string; manual: string; manualHelp: string;
  alerts: string; tone: string; vibrate: string; pulse: string;
  readyPoints: string[];
};

const COPY: Record<LanguageCode, Copy> = {
  en: { welcome: 'Welcome to Moreshet', progress: 'Setup step', back: 'Back', next: 'Next', finish: 'Save and start', steps: [
    { title: 'Set up the app your way', body: 'A few quick choices will make tours easier and more comfortable. You can change every choice later using the Settings cog.' },
    { title: 'Choose Location', body: 'Location shows your distance from a stop, guides you on the map and detects when you arrive. Moreshet does not need Location when you are simply reading or listening.' },
    { title: 'Choose how narration starts', body: 'Automatic starts the guide when your phone detects the next stop. Manual alerts you when you arrive, then waits for you to press Play.' },
    { title: 'Choose your arrival alerts', body: 'Select any combination of tone, vibration and a visible screen pulse. Turn Arrival alerts off if you prefer no alert.' },
    { title: 'You are ready', body: 'Your choices are saved on this device for your account.' },
  ], locationOn: 'Location On', locationOff: 'Location Off', recommended: 'Recommended for walking tours', auto: 'Auto start', autoHelp: 'Narration begins when you arrive.', manual: 'Manual start', manualHelp: 'You decide when to press Play.', alerts: 'Arrival alerts', tone: 'Tone', vibrate: 'Vibrate', pulse: 'Screen pulse', readyPoints: ['The bookmark saves complete tours.', 'The Settings cog changes these choices.', 'Help opens the FAQ at any time.'] },
  he: { welcome: 'ברוכים הבאים ל-Moreshet', progress: 'שלב הגדרה', back: 'חזרה', next: 'הבא', finish: 'שמירה והתחלה', steps: [
    { title: 'הגדירו את היישום בדרך שלכם', body: 'כמה בחירות קצרות יהפכו את הסיורים לנוחים וברורים יותר. אפשר לשנות הכול מאוחר יותר בגלגל השיניים.' },
    { title: 'בחרו מיקום', body: 'המיקום מציג מרחק, מנחה במפה ומזהה הגעה. אין צורך במיקום כאשר רק קוראים או מאזינים.' },
    { title: 'בחרו כיצד הקריינות מתחילה', body: 'הפעלה אוטומטית מתחילה בהגעה. הפעלה ידנית מתריעה וממתינה שתלחצו על הפעלה.' },
    { title: 'בחרו התראות הגעה', body: 'אפשר לבחור צליל, רטט והבהוב מסך בכל שילוב.' },
    { title: 'הכול מוכן', body: 'הבחירות נשמרו במכשיר זה עבור החשבון שלכם.' },
  ], locationOn: 'מיקום פעיל', locationOff: 'מיקום כבוי', recommended: 'מומלץ לסיורים רגליים', auto: 'הפעלה אוטומטית', autoHelp: 'הקריינות מתחילה בהגעה.', manual: 'הפעלה ידנית', manualHelp: 'אתם מחליטים מתי להפעיל.', alerts: 'התראות הגעה', tone: 'צליל', vibrate: 'רטט', pulse: 'הבהוב מסך', readyPoints: ['הסימנייה שומרת סיורים שלמים.', 'גלגל השיניים משנה את הבחירות.', 'עזרה פותחת את השאלות הנפוצות.'] },
  fr: { welcome: 'Bienvenue sur Moreshet', progress: 'Étape de réglage', back: 'Retour', next: 'Suivant', finish: 'Enregistrer et commencer', steps: [
    { title: 'Réglez l’application à votre façon', body: 'Quelques choix rapides rendent les visites plus simples et confortables. Vous pourrez tout modifier dans Réglages.' },
    { title: 'Choisissez la localisation', body: 'La localisation indique la distance, vous guide sur la carte et détecte votre arrivée. Elle n’est pas nécessaire pour lire ou écouter.' },
    { title: 'Choisissez le démarrage audio', body: 'Automatique lance la narration à l’arrivée. Manuel vous avertit puis attend que vous touchiez Lecture.' },
    { title: 'Choisissez les alertes', body: 'Sélectionnez le son, la vibration et le flash de l’écran, ensemble ou séparément.' },
    { title: 'Tout est prêt', body: 'Vos choix sont enregistrés sur cet appareil pour votre compte.' },
  ], locationOn: 'Localisation activée', locationOff: 'Localisation désactivée', recommended: 'Recommandé pour les visites à pied', auto: 'Démarrage automatique', autoHelp: 'La narration commence à l’arrivée.', manual: 'Démarrage manuel', manualHelp: 'Vous choisissez quand lancer Lecture.', alerts: 'Alertes d’arrivée', tone: 'Son', vibrate: 'Vibration', pulse: 'Flash écran', readyPoints: ['Le signet enregistre des visites complètes.', 'La roue dentée modifie ces choix.', 'Aide ouvre la FAQ à tout moment.'] },
  ru: { welcome: 'Добро пожаловать в Moreshet', progress: 'Шаг настройки', back: 'Назад', next: 'Далее', finish: 'Сохранить и начать', steps: [
    { title: 'Настройте приложение для себя', body: 'Несколько быстрых настроек сделают экскурсии удобнее. Их всегда можно изменить через значок шестерёнки.' },
    { title: 'Выберите местоположение', body: 'Оно показывает расстояние, ведёт по карте и определяет прибытие. Для чтения и прослушивания оно не требуется.' },
    { title: 'Выберите запуск аудио', body: 'Автозапуск включает рассказ по прибытии. Ручной режим ждёт, пока вы нажмёте Play.' },
    { title: 'Выберите сигналы', body: 'Можно отдельно включить звук, вибрацию и мигание экрана.' },
    { title: 'Всё готово', body: 'Настройки сохранены на этом устройстве для вашей учётной записи.' },
  ], locationOn: 'Местоположение включено', locationOff: 'Местоположение выключено', recommended: 'Рекомендуется для пеших туров', auto: 'Автозапуск', autoHelp: 'Рассказ начинается по прибытии.', manual: 'Ручной запуск', manualHelp: 'Вы сами нажимаете Play.', alerts: 'Сигналы прибытия', tone: 'Звук', vibrate: 'Вибрация', pulse: 'Мигание', readyPoints: ['Закладка сохраняет целые экскурсии.', 'Шестерёнка меняет настройки.', 'Справка открывает FAQ.'] },
  de: { welcome: 'Willkommen bei Moreshet', progress: 'Einrichtungsschritt', back: 'Zurück', next: 'Weiter', finish: 'Speichern und starten', steps: [
    { title: 'Richten Sie die App passend ein', body: 'Einige kurze Einstellungen machen Touren einfacher. Alles lässt sich später über das Zahnrad ändern.' },
    { title: 'Standort auswählen', body: 'Der Standort zeigt Entfernungen, führt auf der Karte und erkennt die Ankunft. Zum Lesen oder Hören ist er nicht nötig.' },
    { title: 'Audiostart auswählen', body: 'Automatisch startet bei Ankunft. Manuell wartet, bis Sie Play drücken.' },
    { title: 'Ankunftssignale auswählen', body: 'Ton, Vibration und Bildschirmblinken können einzeln gewählt werden.' },
    { title: 'Alles bereit', body: 'Ihre Auswahl ist für Ihr Konto auf diesem Gerät gespeichert.' },
  ], locationOn: 'Standort an', locationOff: 'Standort aus', recommended: 'Für Rundgänge empfohlen', auto: 'Automatisch', autoHelp: 'Audio startet bei Ankunft.', manual: 'Manuell', manualHelp: 'Sie drücken selbst Play.', alerts: 'Ankunftssignale', tone: 'Ton', vibrate: 'Vibration', pulse: 'Bildschirmblinken', readyPoints: ['Das Lesezeichen speichert ganze Touren.', 'Das Zahnrad ändert diese Auswahl.', 'Hilfe öffnet jederzeit die FAQ.'] },
  es: { welcome: 'Bienvenido a Moreshet', progress: 'Paso de configuración', back: 'Atrás', next: 'Siguiente', finish: 'Guardar y empezar', steps: [
    { title: 'Configura la aplicación a tu manera', body: 'Unas decisiones rápidas harán los tours más sencillos. Puedes cambiarlas después en el engranaje.' },
    { title: 'Elige la ubicación', body: 'La ubicación muestra distancias, guía en el mapa y detecta la llegada. No es necesaria para leer o escuchar.' },
    { title: 'Elige cómo empieza el audio', body: 'Automático inicia la narración al llegar. Manual espera a que pulses Play.' },
    { title: 'Elige los avisos de llegada', body: 'Puedes activar por separado el tono, la vibración y el destello de pantalla.' },
    { title: 'Todo listo', body: 'Tus opciones están guardadas en este dispositivo para tu cuenta.' },
  ], locationOn: 'Ubicación activada', locationOff: 'Ubicación desactivada', recommended: 'Recomendado para recorridos a pie', auto: 'Inicio automático', autoHelp: 'La narración comienza al llegar.', manual: 'Inicio manual', manualHelp: 'Tú decides cuándo pulsar Play.', alerts: 'Avisos de llegada', tone: 'Tono', vibrate: 'Vibración', pulse: 'Destello', readyPoints: ['El marcador guarda tours completos.', 'El engranaje cambia estas opciones.', 'Ayuda abre las preguntas frecuentes.'] },
};

const ICONS = [Settings, MapPin, Volume2, BellRing, Check];

export const FirstSignInSetupWizard: React.FC<FirstSignInSetupWizardProps> = ({ isOpen, selectedLanguage, preferences, onComplete }) => {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(preferences);
  const copy = COPY[selectedLanguage] || COPY.en;
  const modalRef = useModalFocus(isOpen, () => undefined);
  useEffect(() => { if (isOpen) { setStep(0); setDraft(preferences); } }, [isOpen, preferences]);
  if (!isOpen) return null;
  const StepIcon = ICONS[step];
  const last = step === copy.steps.length - 1;
  const toggle = (key: keyof VisitorPreferences) => setDraft((current) => ({ ...current, [key]: !current[key] }));
  return <div ref={modalRef} className="fixed inset-0 z-[980] flex items-end justify-center bg-[#164b77]/80 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="setup-wizard-title">
    <section className="max-h-[calc(100dvh-env(safe-area-inset-top))] w-full overflow-y-auto rounded-t-[2rem] bg-[#f0f8ff] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 text-slate-900 shadow-2xl sm:max-w-md sm:rounded-[2rem] sm:p-6">
      <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#247eb1]">{copy.welcome}</p>
      <div className="mt-3 flex gap-1.5" aria-label={`${copy.progress} ${step + 1} / ${copy.steps.length}`}>{copy.steps.map((item, index) => <span key={item.title} className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-[#318bbf]' : 'bg-[#b6daf3]/40'}`} />)}</div>
      <div className="mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#164b77] text-[#b6daf3]"><StepIcon className="h-7 w-7" /></div>
      <h1 id="setup-wizard-title" className="mt-4 text-xl font-bold text-[#164b77]">{copy.steps[step].title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{copy.steps[step].body}</p>

      <div className="mt-5 space-y-3">
        {step === 1 && <><ChoiceButton selected={draft.locationEnabled} onClick={() => setDraft((current) => ({ ...current, locationEnabled: true }))} title={copy.locationOn} body={copy.recommended} /><ChoiceButton selected={!draft.locationEnabled} onClick={() => setDraft((current) => ({ ...current, locationEnabled: false }))} title={copy.locationOff} /></>}
        {step === 2 && <><ChoiceButton selected={draft.arrivalPlaybackMode === 'auto'} onClick={() => setDraft((current) => ({ ...current, arrivalPlaybackMode: 'auto' }))} title={copy.auto} body={copy.autoHelp} /><ChoiceButton selected={draft.arrivalPlaybackMode === 'manual'} onClick={() => setDraft((current) => ({ ...current, arrivalPlaybackMode: 'manual' }))} title={copy.manual} body={copy.manualHelp} /></>}
        {step === 3 && <><WizardToggle label={copy.alerts} checked={draft.arrivalAlertsEnabled} onClick={() => toggle('arrivalAlertsEnabled')} /><div className={`grid grid-cols-3 gap-2 ${draft.arrivalAlertsEnabled ? '' : 'pointer-events-none opacity-40'}`}><WizardToggle compact label={copy.tone} checked={draft.arrivalToneEnabled} onClick={() => toggle('arrivalToneEnabled')} /><WizardToggle compact label={copy.vibrate} checked={draft.arrivalVibrationEnabled} onClick={() => toggle('arrivalVibrationEnabled')} /><WizardToggle compact label={copy.pulse} checked={draft.arrivalPulseEnabled} onClick={() => toggle('arrivalPulseEnabled')} /></div></>}
        {step === 4 && <ul className="space-y-2">{copy.readyPoints.map((point, index) => <li key={point} className="flex items-center gap-3 rounded-2xl bg-white p-3 text-xs font-semibold text-[#164b77]">{index === 0 ? <Bookmark className="h-4 w-4 text-[#297fad]" /> : index === 1 ? <Settings className="h-4 w-4 text-[#318bbf]" /> : <CircleHelp className="h-4 w-4 text-[#3b9ed8]" />}{point}</li>)}</ul>}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" disabled={step === 0} onClick={() => setStep((current) => current - 1)} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#b6daf3] bg-white text-sm font-bold text-[#164b77] disabled:invisible"><ChevronLeft className="h-4 w-4 rtl:rotate-180" />{copy.back}</button><button type="button" onClick={() => last ? onComplete(draft) : setStep((current) => current + 1)} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#164b77] px-3 text-sm font-bold text-white">{last ? copy.finish : copy.next}{!last && <ChevronRight className="h-4 w-4 rtl:rotate-180" />}</button></div>
    </section>
  </div>;
};

const ChoiceButton: React.FC<{ selected: boolean; title: string; body?: string; onClick: () => void }> = ({ selected, title, body, onClick }) => <button type="button" aria-pressed={selected} onClick={onClick} className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border p-3 text-start ${selected ? 'border-[#318bbf] bg-[#dce9e4]' : 'border-slate-200 bg-white'}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-[#318bbf] bg-[#318bbf] text-white' : 'border-slate-300'}`}>{selected && <Check className="h-4 w-4" />}</span><span><span className="block text-sm font-bold text-[#164b77]">{title}</span>{body && <span className="mt-1 block text-[11px] text-slate-600">{body}</span>}</span></button>;

const WizardToggle: React.FC<{ label: string; checked: boolean; onClick: () => void; compact?: boolean }> = ({ label, checked, onClick, compact }) => <button type="button" role="switch" aria-checked={checked} onClick={onClick} className={`flex items-center rounded-2xl border text-xs font-bold ${compact ? 'min-h-14 flex-col justify-center gap-1 px-2' : 'min-h-12 w-full gap-3 px-3'} ${checked ? 'border-[#318bbf] bg-[#318bbf] text-white' : 'border-slate-200 bg-white text-slate-600'}`}><span>{label}</span><span className={`h-2 w-2 rounded-full ${checked ? 'bg-white' : 'bg-slate-300'}`} /></button>;
