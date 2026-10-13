import React from 'react';
import { TourCity } from '../types';
import { MapPin, Navigation, Sparkles } from 'lucide-react';

interface CityTourSelectorProps {
  cities: TourCity[];
  selectedCityId: string;
  onSelectCity: (cityId: string) => void;
  siteCountByCity: Record<string, number>;
}

export const CityTourSelector: React.FC<CityTourSelectorProps> = ({
  cities,
  selectedCityId,
  onSelectCity,
  siteCountByCity,
}) => {
  const selectedCity = cities.find((c) => c.id === selectedCityId) || cities[0];

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-white px-3 py-2.5 shadow-inner">
      {/* City Chips Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[11px] font-bold rounded-lg shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
          <span>GPS TOURS:</span>
        </div>

        {cities.map((city) => {
          const isSelected = city.id === selectedCityId;
          const count = siteCountByCity[city.id] || 0;

          return (
            <button
              key={city.id}
              onClick={() => onSelectCity(city.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                isSelected
                  ? 'bg-blue-600 text-white ring-2 ring-blue-400/50 shadow-md shadow-blue-900/40 font-bold'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700/60'
              }`}
            >
              <span className="text-sm">{city.flagEmoji}</span>
              <span>{city.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {count} stops
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Tour Summary Sub-Bar */}
      {selectedCity && (
        <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5 truncate mr-2">
            <Navigation className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-semibold text-amber-300 truncate">{selectedCity.subtitle}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 shrink-0 text-[10px] bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-700/50">
            <MapPin className="w-3 h-3 text-blue-400" />
            <span>{selectedCity.country}</span>
          </div>
        </div>
      )}
    </div>
  );
};
