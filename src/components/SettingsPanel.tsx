import { apiUrl } from '../lib/api';
import React, { useEffect, useState } from 'react';
import { ArrowLeft, BellRing, Bot, ChevronDown, Cloud, Info, LifeBuoy, LockKeyhole, MapPin, PlayCircle, Scale, Settings, ShieldCheck, Volume2, Waves } from 'lucide-react';
import { LanguageCode } from '../data/translations';
import { SETTINGS_COPY } from '../data/settingsTranslations';
import { ONBOARDING_COPY } from '../data/onboardingTranslations';
import { SyncState, VisitorPreferences } from '../types';

interface SettingsPanelProps {
  selectedLanguage: LanguageCode;
  onBack: () => void;
  onReplayOnboarding: () => void;
  onOpenSetupWizard: () => void;
  preferences: VisitorPreferences;
  onChangePreferences: (preferences: VisitorPreferences) => void;
  syncState: SyncState;
  onSync: () => void;
  focusSection?: 'preferences' | 'help';
}

type BuildInformation = { version: string; build: string };

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ selectedLanguage, onBack, onReplayOnboarding, onOpenSetupWizard, preferences, onChangePreferences, syncState, onSync, focusSection = 'preferences' }) => {
  const copy = SETTINGS_COPY[selectedLanguage] || SETTINGS_COPY.en;
  const onboardingCopy = ONBOARDING_COPY[selectedLanguage] || ONBOARDING_COPY.en;
  const [buildInformation, setBuildInformation] = useState<BuildInformation>({ version: 'pilot-0.1', build: 'local' });

  useEffect(() => {
    if(import.meta.env.VITE_FRONTEND_PREVIEW === 'true'){setBuildInformation({version:'1.0.0 frontend preview',build:'online'});return;}
    const controller = new AbortController();
    void fetch(apiUrl('/api/health'), { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Health request failed.')))
      .then((payload) => setBuildInformation({
        version: String(payload.version || 'pilot-0.1'),
        build: String(payload.build || 'local'),
      }))
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setBuildInformation({ version: 'pilot-0.1', build: 'offline' });
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    document.getElementById(focusSection === 'help' ? 'settings-faq-heading' : 'visitor-preferences')?.scrollIntoView({ block: 'start' });
  }, [focusSection]);

  const labels = selectedLanguage === 'fr' ? { preferences: 'Préférences de visite', location: 'Localisation', arrival: 'Lecture à l’arrivée', auto: 'Automatique', manual: 'Manuelle', alerts: 'Alertes d’arrivée', tone: 'Son', vibration: 'Vibration', pulse: 'Flash écran', connection: 'Connexion et synchronisation', sync: 'Synchroniser', setup: 'Revoir l’assistant de réglage' }
    : selectedLanguage === 'he' ? { preferences: 'העדפות סיור', location: 'מיקום', arrival: 'הפעלה בהגעה', auto: 'אוטומטית', manual: 'ידנית', alerts: 'התראות הגעה', tone: 'צליל', vibration: 'רטט', pulse: 'הבהוב מסך', connection: 'חיבור וסנכרון', sync: 'סנכרון', setup: 'פתיחת אשף ההגדרה מחדש' }
    : selectedLanguage === 'ru' ? { preferences: 'Настройки экскурсии', location: 'Местоположение', arrival: 'Аудио по прибытии', auto: 'Автозапуск', manual: 'Вручную', alerts: 'Сигналы прибытия', tone: 'Звук', vibration: 'Вибрация', pulse: 'Мигание', connection: 'Связь и синхронизация', sync: 'Синхронизировать', setup: 'Повторить мастер настройки' }
    : selectedLanguage === 'de' ? { preferences: 'Tour-Einstellungen', location: 'Standort', arrival: 'Audio bei Ankunft', auto: 'Automatisch', manual: 'Manuell', alerts: 'Ankunftssignale', tone: 'Ton', vibration: 'Vibration', pulse: 'Bildschirmblinken', connection: 'Verbindung und Synchronisierung', sync: 'Jetzt synchronisieren', setup: 'Einrichtungsassistent erneut öffnen' }
    : selectedLanguage === 'es' ? { preferences: 'Preferencias del tour', location: 'Ubicación', arrival: 'Audio al llegar', auto: 'Inicio automático', manual: 'Inicio manual', alerts: 'Avisos de llegada', tone: 'Tono', vibration: 'Vibración', pulse: 'Destello', connection: 'Conexión y sincronización', sync: 'Sincronizar ahora', setup: 'Repetir el asistente de configuración' }
    : { preferences: 'Tour preferences', location: 'Location', arrival: 'Play narration on arrival', auto: 'Auto start', manual: 'Manual start', alerts: 'Arrival alerts', tone: 'Tone', vibration: 'Vibrate', pulse: 'Screen pulse', connection: 'Connection and sync', sync: 'Sync now', setup: 'Review setup wizard' };
  const toggle = (key: keyof VisitorPreferences) => onChangePreferences({ ...preferences, [key]: !preferences[key] });

  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-[#f7f0e5] px-3 pb-24 pt-3 text-slate-900">
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-900 shadow-xs" aria-label={copy.back}>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-blue-950">{copy.title}</h1>
            <p className="text-[11px] text-slate-600">{copy.subtitle}</p>
          </div>
        </div>

        <section id="visitor-preferences" className="scroll-mt-4 rounded-3xl border border-[#d7b276]/50 bg-white p-4 shadow-sm" aria-labelledby="visitor-preferences-heading">
          <div className="mb-4 flex items-center gap-3"><img src={`${import.meta.env.BASE_URL}tudela-global-logo.png`} alt="Tudela Global" className="h-12 w-12 rounded-2xl border border-[#d7b276]/30 bg-[#f7f0e5] object-contain" /><div><h2 id="visitor-preferences-heading" className="font-bold text-[#173f46]">{labels.preferences}</h2><p className="text-[11px] text-slate-600">Changes apply immediately and are remembered on this device.</p></div></div>
          <div className="space-y-3">
            <PreferenceToggle icon={<MapPin className="h-4 w-4" />} label={labels.location} checked={preferences.locationEnabled} onClick={() => toggle('locationEnabled')} />
            <div className="rounded-2xl bg-[#f7f0e5] p-3"><div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#173f46]"><Volume2 className="h-4 w-4" />{labels.arrival}</div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => onChangePreferences({ ...preferences, arrivalPlaybackMode: 'auto' })} className={`min-h-10 rounded-xl text-xs font-bold ${preferences.arrivalPlaybackMode === 'auto' ? 'bg-[#4f8078] text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>{labels.auto}</button><button type="button" onClick={() => onChangePreferences({ ...preferences, arrivalPlaybackMode: 'manual' })} className={`min-h-10 rounded-xl text-xs font-bold ${preferences.arrivalPlaybackMode === 'manual' ? 'bg-[#4f8078] text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>{labels.manual}</button></div></div>
            <PreferenceToggle icon={<BellRing className="h-4 w-4" />} label={labels.alerts} checked={preferences.arrivalAlertsEnabled} onClick={() => toggle('arrivalAlertsEnabled')} />
            <div className={`grid grid-cols-3 gap-2 ${preferences.arrivalAlertsEnabled ? '' : 'pointer-events-none opacity-45'}`}><MiniToggle label={labels.tone} checked={preferences.arrivalToneEnabled} onClick={() => toggle('arrivalToneEnabled')} /><MiniToggle label={labels.vibration} checked={preferences.arrivalVibrationEnabled} onClick={() => toggle('arrivalVibrationEnabled')} /><MiniToggle label={labels.pulse} checked={preferences.arrivalPulseEnabled} onClick={() => toggle('arrivalPulseEnabled')} /></div>
            <button type="button" onClick={onOpenSetupWizard} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#d7b276] bg-white text-xs font-bold text-[#173f46]"><Settings className="h-4 w-4" />{labels.setup}</button>
          </div>
        </section>

        <section className="rounded-3xl border border-[#4f8078]/30 bg-white p-4 shadow-sm"><div className="flex items-center gap-2"><Cloud className="h-4 w-4 text-[#4f8078]" /><h2 className="font-bold text-[#173f46]">{labels.connection}</h2></div><p className="mt-2 text-xs text-slate-600">{syncState.isOnline ? 'Online' : 'Offline'} · {syncState.pendingSyncCount ? `${syncState.pendingSyncCount} pending` : 'Up to date'}</p><button type="button" onClick={onSync} disabled={syncState.syncing || !syncState.isOnline} className="mt-3 min-h-10 w-full rounded-xl bg-[#173f46] text-xs font-bold text-white disabled:opacity-50">{syncState.syncing ? 'Syncing…' : labels.sync}</button></section>

        <section className="overflow-hidden rounded-3xl bg-[#173f46] text-white shadow-md" aria-labelledby="settings-product-heading">
          <div className="flex items-center gap-3 border-b border-white/10 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/30 bg-white/10">
              <img src={`${import.meta.env.BASE_URL}tudela-global-logo.png`} alt="" className="h-10 w-10 rounded-xl object-contain" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-amber-300">Tudela Global</p>
              <h2 id="settings-product-heading" className="mt-1 font-bold">{copy.productInformation}</h2>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-px bg-white/10 text-xs">
            <div className="bg-[#173f46] p-3"><dt className="text-[#d7b276]">{copy.version}</dt><dd className="mt-1 font-mono font-bold">{buildInformation.version}</dd></div>
            <div className="bg-[#173f46] p-3"><dt className="text-[#d7b276]">{copy.build}</dt><dd className="mt-1 truncate font-mono font-bold">{buildInformation.build}</dd></div>
            <div className="col-span-2 bg-[#173f46] p-3"><dt className="text-[#d7b276]">{copy.publisher}</dt><dd className="mt-1 font-bold">{copy.publishedBy}</dd></div>
          </dl>
        </section>

        <section aria-labelledby="settings-introduction-heading">
          <button type="button" onClick={onReplayOnboarding} className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-blue-100 bg-white p-3 text-start shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-900"><PlayCircle className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span id="settings-introduction-heading" className="block text-sm font-bold text-blue-950">{onboardingCopy.replayTitle}</span>
              <span className="mt-1 block text-[11px] leading-relaxed text-slate-600">{onboardingCopy.replayDescription}</span>
            </span>
          </button>
        </section>

        <section aria-labelledby="settings-faq-heading">
          <div className="mb-2 flex items-center gap-2 px-1">
            <Info className="h-4 w-4 text-blue-800" />
            <h2 id="settings-faq-heading" className="font-bold text-blue-950">{copy.faq}</h2>
          </div>
          <div className="space-y-2">
            {copy.faqItems.map((item) => (
              <details key={item.question} className="group rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
                <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-xs font-bold text-slate-900">
                  <span>{item.question}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-blue-800 transition-transform group-open:rotate-180" />
                </summary>
                <p className="border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-700">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="settings-information-heading">
          <div className="mb-2 flex items-center gap-2 px-1">
            <ShieldCheck className="h-4 w-4 text-blue-800" />
            <h2 id="settings-information-heading" className="font-bold text-blue-950">{copy.informationAndSupport}</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: '/privacy', label: copy.privacy, Icon: LockKeyhole },
              { href: '/terms', label: copy.terms, Icon: Scale },
              { href: '/ai-disclosure', label: copy.aiDisclosure, Icon: Bot },
              { href: '/support', label: copy.support, Icon: LifeBuoy },
            ].map(({ href, label, Icon }) => (
              <a key={href} href={`${import.meta.env.BASE_URL}${href.replace(/^\//, '')}/`} className="flex min-h-20 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3 text-start shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                <Icon className="h-5 w-5 text-blue-800" />
                <span className="mt-3 text-xs font-bold leading-snug text-slate-900">{label}</span>
              </a>
            ))}
          </div>
        </section>

        <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-950">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          {copy.pilotNotice}
        </p>
      </div>
    </div>
  );
};

const PreferenceToggle: React.FC<{ icon: React.ReactNode; label: string; checked: boolean; onClick: () => void }> = ({ icon, label, checked, onClick }) => <button type="button" role="switch" aria-checked={checked} onClick={onClick} className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-[#f7f0e5] px-3 text-start"><span className="text-[#4f8078]">{icon}</span><span className="flex-1 text-xs font-bold text-[#173f46]">{label}</span><span className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-[#4f8078]' : 'bg-slate-300'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-1 rtl:-translate-x-1'}`} /></span></button>;

const MiniToggle: React.FC<{ label: string; checked: boolean; onClick: () => void }> = ({ label, checked, onClick }) => <button type="button" role="switch" aria-checked={checked} onClick={onClick} className={`min-h-12 rounded-2xl border px-2 text-[10px] font-bold ${checked ? 'border-[#4f8078] bg-[#4f8078] text-white' : 'border-slate-200 bg-white text-slate-600'}`}><Waves className="mx-auto mb-1 h-3 w-3" />{label}</button>;
