import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  FileText,
  FastForward,
  Check,
  Copy,
  Sparkles,
  Navigation,
  ExternalLink,
  Square,
} from 'lucide-react';
import { HeritageSite, AudioGuideSettings } from '../types';
import { LanguageCode, getTranslatedSite, t } from '../data/translations';
import { formatDistance, getBearingDegrees, getCompassDirection, getDistanceMeters } from '../utils/geo';
import { narrationPlaybackSource } from '../lib/narrationPlayback';
import { ImageCredit } from './ImageCredit';

interface AudioPlayerDrawerProps {
  site: HeritageSite | null;
  audioSettings: AudioGuideSettings;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (percentage: number) => void;
  onChangeRate: (rate: number) => void;
  onNextSite?: () => void;
  onPrevSite?: () => void;
  onClosePlayer: () => void;
  selectedLanguage?: LanguageCode;
  sites?: HeritageSite[];
  onSelectSite?: (site: HeritageSite) => void;
}

export const AudioPlayerDrawer: React.FC<AudioPlayerDrawerProps> = ({
  site: rawSite,
  audioSettings,
  onPlay,
  onPause,
  onSeek,
  onChangeRate,
  onClosePlayer,
  selectedLanguage = 'en' as LanguageCode,
  sites = [],
  onSelectSite,
}) => {
  const [showTranscript, setShowTranscript] = useState<boolean>(false);
  const [showDirections, setShowDirections] = useState<boolean>(false);
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(true);

  useEffect(() => {
    setIsMinimized(true);
  }, [rawSite?.id]);

  const lang: LanguageCode = selectedLanguage;

  if (!rawSite) return null;
  const playbackSource = audioSettings.currentSiteId === rawSite.id
    ? audioSettings.playbackSource
    : narrationPlaybackSource(rawSite, lang);
  const site = getTranslatedSite(rawSite, lang);
  const currentIndex = sites.findIndex((candidate) => candidate.id === rawSite.id);
  const nextIndex = currentIndex >= 0 && currentIndex < sites.length - 1 ? currentIndex + 1 : -1;
  const rawNextSite = nextIndex >= 0 ? sites[nextIndex] : null;
  const nextSite = rawNextSite ? getTranslatedSite(rawNextSite, lang) : null;
  const nextDistance = rawNextSite ? getDistanceMeters(rawSite.lat, rawSite.lng, rawNextSite.lat, rawNextSite.lng) : 0;
  const nextDirection = rawNextSite ? getCompassDirection(getBearingDegrees(rawSite.lat, rawSite.lng, rawNextSite.lat, rawNextSite.lng)) : '';
  const nextWalkMinutes = Math.max(1, Math.round(nextDistance / 80));

  const handleCopyTranscript = () => {
    navigator.clipboard.writeText(site.transcript);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  // Minimized Audio Guide Player View (Bottom of the Map)
  if (isMinimized) {
    return (
      <div className="app-tour-panel fixed left-3 right-3 z-40 mx-auto flex max-w-md flex-col gap-2 rounded-2xl border border-slate-700/80 bg-slate-900/95 p-2.5 text-white shadow-2xl backdrop-blur-xl transition-all sm:left-4 sm:right-4">
        {/* Minimized Top Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Site thumbnail & info */}
          <div
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
            onClick={() => setIsMinimized(false)}
            title="Click to expand audio guide"
          >
            <div className="relative shrink-0">
              <img
                src={site.imageUrl}
                alt={site.name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=800&q=80';
                }}
                className="w-10 h-10 rounded-xl object-cover border border-slate-700"
              />
              {audioSettings.isPlaying && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-slate-900 animate-pulse" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider truncate">
                  {site.cityName || site.category}
                </span>
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${playbackSource === 'recorded' ? 'bg-emerald-400/20 text-emerald-300' : 'bg-sky-400/20 text-sky-200'}`}>
                  {t(playbackSource === 'recorded' ? 'recordedGuide' : 'deviceVoice', lang)}
                </span>
              </div>
              <h2 className="text-xs font-bold text-white truncate leading-tight">
                {site.name}
              </h2>
              <p className="text-[10px] text-slate-300 font-mono">
                {Math.floor((audioSettings.currentTime || 0) / 60)}:
                {String(Math.floor((audioSettings.currentTime || 0) % 60)).padStart(2, '0')} /{' '}
                {Math.floor(site.audioDuration / 60)}:
                {String(site.audioDuration % 60).padStart(2, '0')}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Play / Pause button */}
            <button
              onClick={audioSettings.isPlaying ? onPause : onPlay}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-md transition-transform hover:bg-blue-500 active:scale-95"
              title={audioSettings.isPlaying ? t('pauseAudio', lang) : t('playAudio', lang)}
              aria-label={audioSettings.isPlaying ? t('pauseAudio', lang) : t('playAudio', lang)}
            >
              {audioSettings.isPlaying ? (
                <Pause className="w-4 h-4 fill-white" />
              ) : (
                <Play className="w-4 h-4 fill-white ml-0.5" />
              )}
            </button>

            {/* Expand Drawer Button */}
            <button
              onClick={() => setIsMinimized(false)}
              className="flex h-10 w-10 items-center justify-center rounded-xl p-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
              title={t('expandAudioPlayer', lang)}
              aria-label={t('expandAudioPlayer', lang)}
            >
              <ChevronUp className="w-5 h-5 text-amber-400" />
            </button>

            {/* Close Player Button */}
            <button
              onClick={onClosePlayer}
              className="flex h-10 w-10 items-center justify-center rounded-xl p-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-red-300"
              title={t('stopAudio', lang)}
              aria-label={t('stopAudio', lang)}
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>

        {/* Mini Progress Bar */}
        <div
          className="relative w-full h-1.5 bg-slate-800 rounded-full cursor-pointer overflow-hidden border border-slate-700/60"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = (clickX / rect.width) * 100;
            onSeek(percentage);
          }}
        >
          <div
            className="absolute left-0 top-0 bottom-0 bg-blue-500 transition-all"
            style={{ width: `${audioSettings.playbackProgress}%` }}
          />
        </div>
        {audioSettings.playbackError && (
          <button type="button" onClick={() => setIsMinimized(false)} className="rounded-xl bg-red-950/70 px-3 py-2 text-left text-[10px] font-semibold text-red-100">
            {t('audioUnavailable', lang)}
          </button>
        )}
      </div>
    );
  }

  // Expanded Full Audio Guide Drawer View
  return (
    <div className="app-tour-panel fixed left-3 right-3 z-40 mx-auto flex max-h-[72vh] max-w-md flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white text-gray-900 shadow-[0_-12px_35px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all">
      {/* Drawer Header handle */}
      <div className="pt-3 px-4 flex items-center justify-between border-b border-gray-100 pb-2.5 bg-slate-50/80">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
            {t('audioGuidePlayer', lang)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="flex min-h-10 items-center gap-1 rounded-lg border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-900 transition-colors hover:bg-blue-50"
            title={t('minimizePlayer', lang)}
          >
            <ChevronDown className="w-4 h-4 text-blue-900" />
            <span>{t('minimize', lang)}</span>
          </button>
          <button
            onClick={onClosePlayer}
            className="flex h-10 w-10 items-center justify-center rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-red-700"
            title={t('stopAudio', lang)}
            aria-label={t('stopAudio', lang)}
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>

      <div className="p-5 overflow-y-auto space-y-4">
        {audioSettings.playbackError && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold leading-relaxed text-red-800">
            {t('audioUnavailable', lang)}
          </div>
        )}
        <div className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${playbackSource === 'recorded' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>
          {t(playbackSource === 'recorded' ? 'recordedGuide' : 'deviceVoice', lang)}
        </div>
        {/* Site Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={site.imageUrl}
              alt={site.name}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=800&q=80';
              }}
              className="w-14 h-14 rounded-2xl object-cover border border-gray-100 shadow-sm"
            />
            <div>
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                {site.cityName ? `${site.cityName} • ${site.category}` : site.category}
              </span>
              <h2 className="text-lg font-bold text-gray-900 leading-snug">
                {site.name}
              </h2>
              <p className="text-xs text-gray-500 font-serif italic">{site.hebrewName}</p>
            </div>
          </div>

        </div>

        <ImageCredit credit={site.imageCredit} sourceUrl={site.imageSourceUrl} licenseName={site.imageLicenseName} licenseUrl={site.imageLicenseUrl}/>

        {/* Audio Progress Bar */}
        <div className="space-y-1.5">
          <div
            className="relative w-full h-2 bg-gray-100 rounded-full cursor-pointer overflow-hidden border border-gray-200"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const percentage = (clickX / rect.width) * 100;
              onSeek(percentage);
            }}
          >
            <div
              className="absolute left-0 top-0 bottom-0 bg-blue-900 transition-all"
              style={{ width: `${audioSettings.playbackProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-gray-600 font-medium">
            <span>
              {Math.floor((audioSettings.currentTime || 0) / 60)}:
              {String(Math.floor((audioSettings.currentTime || 0) % 60)).padStart(2, '0')}
            </span>
            <span>
              {Math.floor(site.audioDuration / 60)}:
              {String(site.audioDuration % 60).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Audio Controls */}
        <div className="flex items-center justify-between px-2">
          {/* Speed Rate selector */}
          <button
            onClick={() => {
              const rates = [1.0, 1.25, 1.5];
              const nextIndex = (rates.indexOf(audioSettings.speechRate) + 1) % rates.length;
              onChangeRate(rates[nextIndex]);
            }}
            className="flex min-h-10 items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs font-bold text-blue-900 hover:bg-gray-100"
            title={t('playbackSpeed', lang)}
          >
            <FastForward className="w-3.5 h-3.5" />
            {audioSettings.speechRate}x
          </button>

          {/* Main Play / Pause Button */}
          <button
            id="btn-main-play-pause"
            onClick={audioSettings.isPlaying ? onPause : onPlay}
            className="w-14 h-14 rounded-2xl bg-blue-900 hover:bg-blue-800 text-white flex items-center justify-center shadow-lg shadow-blue-200 transition-transform active:scale-95"
            aria-label={audioSettings.isPlaying ? t('pauseAudio', lang) : t('playAudio', lang)}
          >
            {audioSettings.isPlaying ? (
              <Pause className="w-6 h-6 fill-white" />
            ) : (
              <Play className="w-6 h-6 fill-white ml-1" />
            )}
          </button>

          <button
            onClick={onClosePlayer}
            className="flex min-h-10 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
            title={t('stopAudio', lang)}
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>{t('stop', lang)}</span>
          </button>
        </div>

        {/* Directions now live in the map's dedicated top panel. */}
        <div className="hidden" aria-hidden="true">
          <button
            onClick={() => {
              setShowDirections((current) => !current);
              setShowTranscript(false);
            }}
            className="flex min-h-10 w-full items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-blue-900 transition-colors hover:bg-gray-100"
          >
            <span className="flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              Directions
            </span>
            {showDirections ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showDirections && (
            <div className="mt-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-xs">
              {nextSite && rawNextSite ? (
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-blue-950">Next: Stop {nextIndex + 1}</p>
                      <p className="truncate font-semibold text-gray-900">{nextSite.name}</p>
                      <p className="mt-0.5 text-[11px] text-gray-600">
                        {formatDistance(nextDistance)} · {nextDirection} · about {nextWalkMinutes} min walk
                      </p>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${rawSite.lat},${rawSite.lng}&destination=${rawNextSite.lat},${rawNextSite.lng}&travelmode=walking`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 p-2 text-white"
                      title="Open walking directions in Google Maps"
                      aria-label="Open walking directions in Google Maps"
                    >
                      <img src="/google-maps-mark.svg" alt="" className="h-5 w-5 rounded bg-white" />
                    </a>
                  </div>
                  <button
                    onClick={() => {
                      onSelectSite?.(rawNextSite);
                      setShowDirections(false);
                      setIsMinimized(true);
                    }}
                    className="w-full rounded-xl bg-blue-900 py-2 font-bold text-white"
                  >
                    Show stop {nextIndex + 1} on tour map
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-emerald-800">Final stop</p>
                    <p className="text-[11px] text-gray-600">This is the last stop on the tour route.</p>
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${rawSite.lat},${rawSite.lng}&travelmode=walking`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 p-2 text-white"
                    title="Open walking directions in Google Maps"
                    aria-label="Open walking directions in Google Maps"
                  >
                    <img src="/google-maps-mark.svg" alt="" className="h-5 w-5 rounded bg-white" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Transcript Dropdown Button & Container */}
        <div className="border-t border-gray-100 pt-3">
          <button
            id="btn-show-transcript-toggle"
            onClick={() => {
              setShowTranscript((current) => !current);
              setShowDirections(false);
            }}
            className="flex min-h-10 w-full items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-blue-900 transition-colors hover:bg-gray-100"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-900" />
              <span>{showTranscript ? t('hideTranscript', lang) : t('showTranscript', lang)}</span>
            </div>
            {showTranscript ? (
              <ChevronUp className="w-4 h-4 text-blue-900" />
            ) : (
              <ChevronDown className="w-4 h-4 text-blue-900" />
            )}
          </button>

          {/* Collapsible Transcript Content */}
          {showTranscript && (
            <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3 text-xs leading-relaxed text-gray-800 shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="font-bold text-gray-900 text-sm">
                  {t('fullAudioTranscript', lang)}
                </span>
                <button
                  onClick={handleCopyTranscript}
                  className="flex items-center gap-1 text-[11px] text-blue-900 hover:underline font-bold"
                >
                  {copiedTranscript ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t('copied', lang)}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t('copyText', lang)}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="whitespace-pre-line font-sans text-gray-700 leading-relaxed max-h-48 overflow-y-auto pr-1">
                {site.transcript}
              </div>

              {/* Key Historical Facts */}
              {site.keyFacts && site.keyFacts.length > 0 && (
                <div className="pt-2 border-t border-gray-200 space-y-1">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    {t('keyHighlights', lang)}
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-600">
                    {site.keyFacts.map((fact, idx) => (
                      <li key={idx}>{fact}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
