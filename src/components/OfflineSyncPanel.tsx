import React, { useState } from 'react';
import {
  Wifi,
  WifiOff,
  CloudCheck,
  RefreshCw,
  BookmarkCheck,
  FileText,
  Save,
  Trash2,
  Check,
  Sparkles,
  Download
} from 'lucide-react';
import { HeritageSite, SyncState } from '../types';
import { CATEGORY_NAMES, getTranslatedSite, LanguageCode, t } from '../data/translations';
import { ImageCredit } from './ImageCredit';

interface OfflineSyncPanelProps {
  syncState: SyncState;
  savedSites: HeritageSite[];
  userNotes: Record<string, string>;
  onSaveNote: (siteId: string, note: string) => void;
  onRemoveSaved: (siteId: string) => void;
  onTriggerSync: () => Promise<void>;
  onSelectSite: (site: HeritageSite) => void;
  selectedLanguage: LanguageCode;
}

export const OfflineSyncPanel: React.FC<OfflineSyncPanelProps> = ({
  syncState,
  savedSites,
  userNotes,
  onSaveNote,
  onRemoveSaved,
  onTriggerSync,
  onSelectSite,
  selectedLanguage,
}) => {
  const [activeNoteSiteId, setActiveNoteSiteId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState<string>('');
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<boolean>(false);
  const localizedSavedSites = savedSites.map((site) => getTranslatedSite(site, selectedLanguage));
  const timeLocale: Record<LanguageCode, string> = { en: 'en-GB', he: 'he-IL', ru: 'ru-RU', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' };

  const handleOpenNoteEditor = (siteId: string) => {
    setActiveNoteSiteId(siteId);
    setNoteInput(userNotes[siteId] || '');
  };

  const handleSaveNoteSubmit = (siteId: string) => {
    onSaveNote(siteId, noteInput);
    setSavedSuccessMsg(true);
    setTimeout(() => {
      setSavedSuccessMsg(false);
      setActiveNoteSiteId(null);
    }, 1200);
  };

  return (
    <div className="mx-auto h-full max-w-md space-y-4 overflow-y-auto bg-gray-50 px-4 pb-28 pt-5 text-gray-900">
      {/* Network & Cloud Sync Status Header */}
      <div className="bg-white border border-gray-200 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            {syncState.isOnline ? (
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                <Wifi className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
                <WifiOff className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="text-sm font-bold leading-tight text-gray-900">
                  {syncState.isOnline ? t('onlineConnection', selectedLanguage) : t('offlineModeActive', selectedLanguage)}
                </h1>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    syncState.isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {syncState.isOnline ? t('statusOnline', selectedLanguage) : t('statusOffline', selectedLanguage)}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-gray-500">
                {syncState.isOnline
                  ? t('onlineSyncDescription', selectedLanguage)
                  : t('offlineAccessDescription', selectedLanguage)}
              </p>
            </div>
          </div>
        </div>

        {/* Sync Progress Bar & Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-2.5">
          <div className="text-xs text-gray-500">
            <span className="text-gray-700 font-semibold">{t('lastSynced', selectedLanguage)}: </span>
            {syncState.lastSyncedAt
              ? new Date(syncState.lastSyncedAt).toLocaleTimeString(timeLocale[selectedLanguage], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : t('never', selectedLanguage)}
          </div>

          <button
            id="btn-trigger-cloud-sync"
            onClick={() => onTriggerSync()}
            disabled={syncState.syncing}
            className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncState.syncing ? 'animate-spin' : ''}`} />
            <span>{syncState.syncing ? t('syncing', selectedLanguage) : t('syncNow', selectedLanguage)}</span>
          </button>
        </div>
      </div>

      {/* Offline Storage Download Notice */}
      <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-blue-950 shadow-xs">
        <Download className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-blue-900 font-bold">{t('offlineTourReadyTitle', selectedLanguage)}</strong>{' '}{t('offlineTourReadyDescription', selectedLanguage)}
        </p>
      </div>

      {/* Saved Sites Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
            <BookmarkCheck className="h-5 w-5 text-[#297fad]" />
            {t('savedHeritageSites', selectedLanguage)} ({localizedSavedSites.length})
          </h2>
        </div>

        {localizedSavedSites.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center space-y-2 shadow-xs">
            <p className="text-xs text-gray-500">
              {t('noSavedSites', selectedLanguage)}
            </p>
          </div>
        ) : (
          localizedSavedSites.map((site) => {
            const isEditingNote = activeNoteSiteId === site.id;
            const currentNote = userNotes[site.id];

            return (
              <div
                key={site.id}
                className="bg-white border border-gray-100 rounded-3xl p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={site.imageUrl}
                    alt={site.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=800&q=80';
                    }}
                    className="w-16 h-16 rounded-2xl object-cover border border-gray-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                      {CATEGORY_NAMES[selectedLanguage]?.[site.category] || CATEGORY_NAMES.en[site.category] || site.category}
                    </span>
                    <h4 className="font-bold text-gray-900 text-base truncate">
                      {site.name}
                    </h4>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                      {site.shortDescription}
                    </p>
                  </div>

                  <button
                    onClick={() => onRemoveSaved(site.id)}
                    className="p-1.5 text-gray-600 hover:text-rose-700 rounded-lg"
                    title={t('removeFromSaved', selectedLanguage)}
                    aria-label={t('removeFromSaved', selectedLanguage)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <ImageCredit
                  credit={site.imageCredit}
                  sourceUrl={site.imageSourceUrl}
                  licenseName={site.imageLicenseName}
                  licenseUrl={site.imageLicenseUrl}
                />

                {/* Custom User Travel Notes Box */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-blue-900 font-bold">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      {t('personalTourNotes', selectedLanguage)}
                    </span>
                    {!isEditingNote && (
                      <button
                        onClick={() => handleOpenNoteEditor(site.id)}
                        className="text-blue-900 hover:underline font-bold"
                      >
                        {currentNote ? t('editNote', selectedLanguage) : t('addNote', selectedLanguage)}
                      </button>
                    )}
                  </div>

                  {isEditingNote ? (
                    <div className="space-y-2">
                      <textarea
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder={t('notePlaceholder', selectedLanguage)}
                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 min-h-[60px]"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setActiveNoteSiteId(null)}
                          className="px-2.5 py-1 text-gray-500 text-xs hover:text-gray-700 font-semibold"
                        >
                          {t('cancel', selectedLanguage)}
                        </button>
                        <button
                          onClick={() => handleSaveNoteSubmit(site.id)}
                          className="px-3 py-1 bg-blue-900 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {t('saveNote', selectedLanguage)}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 italic">
                      {currentNote || t('noPersonalNotes', selectedLanguage)}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => onSelectSite(site)}
                    className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 text-blue-900 text-xs font-bold rounded-xl border border-gray-200"
                  >
                    {t('viewOnLiveMap', selectedLanguage)}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
