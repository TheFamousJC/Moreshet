import React, { useState } from 'react';
import { ArrowLeft, Headphones, Play, Pause, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { AudioGuideSettings, HeritageSite, TourCity } from '../types';
import { getTranslatedCity, getTranslatedSite, LanguageCode } from '../data/translations';
import { ImageCredit } from './ImageCredit';

interface JewishHeritagePodcastProps {
  sites: HeritageSite[];
  selectedLanguage: LanguageCode;
  audioSettings: AudioGuideSettings;
  onBack: () => void;
  onPlay: (site: HeritageSite) => void;
  onPause: () => void;
  onResume: () => void;
  cities: TourCity[];
  selectedCityId: string;
  onSelectCity: (cityId: string) => void;
}

export const JewishHeritagePodcast: React.FC<JewishHeritagePodcastProps> = ({
  sites,
  selectedLanguage,
  audioSettings,
  onBack,
  onPlay,
  onPause,
  onResume,
  cities,
  selectedCityId,
  onSelectCity,
}) => {
  const [openTranscriptId, setOpenTranscriptId] = useState<string | null>(null);
  const episodes = sites.map((site) => getTranslatedSite(site, selectedLanguage));
  const sortedCities = cities
    .map((city) => getTranslatedCity(city, selectedLanguage))
    .sort((a, b) => a.name.localeCompare(b.name, selectedLanguage, { sensitivity: 'base' }));

  return (
    <div className="h-[calc(100vh-120px)] overflow-y-auto bg-gray-50 p-3 pb-28 text-gray-900 max-w-md mx-auto">
      <header className="mb-4 rounded-3xl bg-blue-950 p-4 text-white shadow-lg">
        <button onClick={onBack} className="mb-3 flex items-center gap-1 text-xs text-blue-100">
          <ArrowLeft className="h-4 w-4" /> Discover
        </button>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-amber-400 p-2.5 text-blue-950">
            <Headphones className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Jewish Heritage Podcast</h2>
          </div>
        </div>
        <select
          value={selectedCityId}
          onChange={(event) => onSelectCity(event.target.value)}
          className="mt-3 w-full rounded-2xl border border-blue-700 bg-blue-900 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          aria-label="Podcast city"
        >
          <option value="">Select City</option>
          {sortedCities.map((city) => (
            <option key={city.id} value={city.id}>{city.flagEmoji} {city.name}</option>
          ))}
        </select>
      </header>

      {episodes.length === 0 ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <Headphones className="mx-auto h-8 w-8 text-amber-600" />
          <p className="mt-3 text-sm font-semibold text-blue-900">Select a city to see its podcast episodes.</p>
          <button onClick={onBack} className="mt-4 rounded-2xl bg-blue-900 px-4 py-2 text-xs font-bold text-white">
            Select City
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {episodes.map((site) => {
            const isCurrent = audioSettings.currentSiteId === site.id;
            const isPlaying = isCurrent && audioSettings.isPlaying;
            const isTranscriptOpen = openTranscriptId === site.id;
            return (
              <article key={site.id} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <img src={site.imageUrl} alt={site.name} className="h-36 w-full object-cover" />
                <div className="p-3.5">
                  <ImageCredit credit={site.imageCredit} sourceUrl={site.imageSourceUrl} licenseName={site.imageLicenseName} licenseUrl={site.imageLicenseUrl} className="mb-2"/>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">{site.historicalPeriod}</p>
                  <h3 className="mt-1 text-sm font-bold text-blue-950">{site.name}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{site.shortDescription}</p>
                  <button
                    onClick={() => isPlaying ? onPause() : isCurrent ? onResume() : onPlay(site)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 py-2 text-xs font-bold text-blue-950"
                  >
                    {isPlaying ? <Pause className="h-4 w-4 fill-blue-950" /> : <Play className="h-4 w-4 fill-blue-950" />}
                    {isPlaying ? 'Pause episode' : isCurrent ? 'Resume episode' : 'Play episode'}
                  </button>
                  {isCurrent && (
                    <div className="mt-2">
                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                        <div className="h-full rounded-full bg-blue-900 transition-all" style={{ width: `${audioSettings.playbackProgress}%` }} />
                      </div>
                      <p className="mt-1 text-right text-[10px] text-gray-500">{Math.round(audioSettings.playbackProgress)}%</p>
                    </div>
                  )}
                  <button
                    onClick={() => setOpenTranscriptId(isTranscriptOpen ? null : site.id)}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 py-2 text-xs font-bold text-blue-900"
                  >
                    <FileText className="h-4 w-4" />
                    Transcript
                    {isTranscriptOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {isTranscriptOpen && (
                    <div className="mt-2 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs leading-relaxed text-gray-700">
                      <p className="whitespace-pre-line">{site.transcript}</p>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
