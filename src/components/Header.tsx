import React, { useEffect, useState } from 'react';
import { Battery, BatteryCharging, Bookmark, ChevronDown, CircleHelp, Crosshair, Globe, Settings, UserCircle } from 'lucide-react';
import { LANGUAGE_OPTIONS, LanguageCode, t } from '../data/translations';

interface HeaderProps {
  selectedLanguage: LanguageCode;
  locationEnabled: boolean;
  savedCount: number;
  onSelectLanguage: (lang: LanguageCode) => void;
  onToggleLocation: () => void;
  onOpenAccount: () => void;
  onGoDiscovery: () => void;
  onOpenSaved: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  accountLabel?: string;
}

interface BatteryManagerLike extends EventTarget { charging: boolean; level: number; }

export const Header: React.FC<HeaderProps> = ({ selectedLanguage, locationEnabled, savedCount, onSelectLanguage, onToggleLocation, onOpenAccount, onGoDiscovery, onOpenSaved, onOpenSettings, onOpenHelp, accountLabel }) => {
  const [languageOpen, setLanguageOpen] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [charging, setCharging] = useState(false);
  const language = LANGUAGE_OPTIONS.find((item) => item.code === selectedLanguage) || LANGUAGE_OPTIONS[0];

  useEffect(() => {
    let battery: BatteryManagerLike | null = null;
    const navigatorWithBattery = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    const update = () => { if (battery) { setBatteryLevel(Math.round(battery.level * 100)); setCharging(battery.charging); } };
    navigatorWithBattery.getBattery?.().then((manager) => { battery = manager; update(); battery.addEventListener('levelchange', update); battery.addEventListener('chargingchange', update); }).catch(() => setBatteryLevel(null));
    return () => { battery?.removeEventListener('levelchange', update); battery?.removeEventListener('chargingchange', update); };
  }, []);

  const control = 'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border bg-white shadow-sm transition-colors min-[350px]:h-9 min-[350px]:w-9';
  return <header dir="ltr" className="app-safe-header sticky top-0 z-30 shrink-0 border-b border-[#b6daf3]/40 bg-[#f0f8ff]/95 pb-2 shadow-sm backdrop-blur-md">
    <div className="mx-auto flex w-full max-w-md items-center justify-center gap-0.5 px-1 min-[350px]:gap-1">
      <button type="button" onClick={onGoDiscovery} className="flex h-8 w-20 shrink-0 items-center justify-center rounded-xl border border-[#164b77]/25 bg-white px-1 text-center text-[11px] font-extrabold leading-[0.9] tracking-tight text-[#164b77] shadow-sm min-[350px]:h-9" title={t('navDiscover', selectedLanguage)} aria-label={t('navDiscover', selectedLanguage)}><span>Moreshet</span></button>
      <button type="button" onClick={onOpenAccount} className={`${control} border-[#318bbf] text-[#318bbf]`} title={accountLabel || t('signInOrRegister', selectedLanguage)} aria-label={accountLabel || t('signInOrRegister', selectedLanguage)}><UserCircle className="h-4 w-4" /></button>
      <div className="relative">
        <button type="button" onClick={() => setLanguageOpen((open) => !open)} className={`${control} border-[#2879ae] text-[#2879ae]`} title={t('selectLanguage', selectedLanguage)} aria-label={t('selectLanguage', selectedLanguage)}><Globe className="h-3.5 w-3.5" /><span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white px-1 text-[10px] leading-none">{language.flag}</span><ChevronDown className="absolute right-0 top-0 h-3 w-3" /></button>
        {languageOpen && <div className="absolute left-0 top-11 z-50 flex w-40 flex-col gap-1 rounded-2xl border border-[#b6daf3]/50 bg-white p-2 shadow-xl">{LANGUAGE_OPTIONS.map((item) => <button key={item.code} type="button" onClick={() => { onSelectLanguage(item.code); setLanguageOpen(false); }} className={`flex min-h-10 items-center rounded-xl px-3 text-xs ${item.code === selectedLanguage ? 'bg-[#e0f1ff] font-bold text-[#164b77]' : 'text-slate-700 hover:bg-[#f0f8ff]'}`}>{item.flag} {item.nativeName}</button>)}</div>}
      </div>
      <div className={`${control} border-[#2484b8] text-[#2484b8]`} title={batteryLevel === null ? t('batteryUnavailable', selectedLanguage) : `${batteryLevel}%`} aria-label={batteryLevel === null ? t('batteryUnavailable', selectedLanguage) : `${batteryLevel}%`}>{charging ? <BatteryCharging className="h-4 w-4" /> : <Battery className="h-4 w-4" />}<span className="absolute -bottom-1 rounded bg-white px-0.5 text-[8px] font-bold">{batteryLevel === null ? '--' : batteryLevel}</span></div>
      <button type="button" onClick={onToggleLocation} className={`${control} border-[#3498d0] text-[#216a9b]`} title={`Location ${locationEnabled ? 'On' : 'Off'}`} aria-label={`Location ${locationEnabled ? 'On' : 'Off'}`}><Crosshair className="h-4 w-4" />{locationEnabled && <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-[#3498d0]" />}</button>
      <button type="button" onClick={onOpenSaved} className={`${control} border-[#297fad] text-[#297fad]`} title={t('navSaved', selectedLanguage)} aria-label={t('navSaved', selectedLanguage)}><Bookmark className="h-4 w-4" />{savedCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[#297fad] px-1 text-[8px] font-bold text-white">{savedCount}</span>}</button>
      <button type="button" onClick={onOpenSettings} className={`${control} border-[#164b77]/20 bg-white text-[#164b77]`} title={t('navSettings', selectedLanguage)} aria-label={t('navSettings', selectedLanguage)}><Settings className="h-4 w-4" /></button>
      <button type="button" onClick={onOpenHelp} className={`${control} border-[#b6daf3] bg-[#e0f1ff] text-[#164b77]`} title={t('help', selectedLanguage)} aria-label={t('help', selectedLanguage)}><CircleHelp className="h-4 w-4" /></button>
    </div>
  </header>;
};
