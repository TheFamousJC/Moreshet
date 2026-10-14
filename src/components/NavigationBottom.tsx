import React from 'react';
import { MapPin, Search, Bookmark } from 'lucide-react';
import { LanguageCode, t } from '../data/translations';

export type TabType = 'walk' | 'search' | 'podcast' | 'herzl' | 'benjamin' | 'saved' | 'settings';

interface NavigationBottomProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  savedCount: number;
  unreadChatCount?: number;
  selectedLanguage: LanguageCode;
}

export const NavigationBottom: React.FC<NavigationBottomProps> = ({
  activeTab,
  onTabChange,
  savedCount,
  selectedLanguage,
}) => {
  return (
    <nav className="app-safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-gray-100 bg-white/95 pt-1 shadow-lg backdrop-blur-lg">
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1.5">
        {/* Tab 1: Discovery */}
        <button
          id="tab-btn-search"
          onClick={() => onTabChange('search')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all ${
            activeTab === 'search'
              ? 'bg-blue-50 text-blue-900 font-bold border border-blue-100/80 shadow-xs'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Search className={`w-5 h-5 ${activeTab === 'search' ? 'text-blue-900' : ''}`} />
          <span className="text-[10px] mt-1 leading-none">{t('navDiscover', selectedLanguage)}</span>
        </button>

        {/* Tab 2: Live Walk & Map */}
        <button
          id="tab-btn-walk"
          onClick={() => onTabChange('walk')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all ${
            activeTab === 'walk'
              ? 'bg-blue-50 text-blue-900 font-bold border border-blue-100/80 shadow-xs'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="relative">
            <MapPin className={`w-5 h-5 ${activeTab === 'walk' ? 'text-blue-900' : ''}`} />
            {activeTab === 'walk' && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-900 rounded-full animate-ping opacity-75" />
            )}
          </div>
          <span className="text-[10px] mt-1 leading-none">{t('navLiveWalk', selectedLanguage)}</span>
        </button>

        {/* Tab 3: Ask Benjamin AI */}
        <button
          id="tab-btn-benjamin"
          onClick={() => onTabChange('benjamin')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all ${
            activeTab === 'herzl' || activeTab === 'benjamin'
              ? 'bg-blue-50 text-blue-900 font-bold border border-blue-100/80 shadow-xs'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <img
            src={`${import.meta.env.BASE_URL}ask-benjamin-sage.png`}
            alt="Ask Benjamin"
            className={`w-6 h-6 rounded-lg object-cover border bg-white ${
              activeTab === 'herzl' || activeTab === 'benjamin'
                ? 'border-blue-300 shadow-sm'
                : 'border-gray-200 opacity-75'
            }`}
          />
          <span className="text-[10px] mt-1 leading-none">{t('navAskBenjamin', selectedLanguage)}</span>
        </button>

        {/* Tab 4: Saved & Sync */}
        <button
          id="tab-btn-saved"
          onClick={() => onTabChange('saved')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all relative ${
            activeTab === 'saved'
              ? 'bg-blue-50 text-blue-900 font-bold border border-blue-100/80 shadow-xs'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="relative">
          <Bookmark className={`h-5 w-5 text-[#297fad] ${activeTab === 'saved' ? 'fill-current' : ''}`} />
            {savedCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[14px] rounded-full bg-[#297fad] px-1 text-center text-[9px] font-bold text-white">
                {savedCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 leading-none">{t('navSaved', selectedLanguage)}</span>
        </button>

      </div>
    </nav>
  );
};
