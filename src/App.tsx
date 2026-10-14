/**
 * European Jewish Heritage & Live Walk Mobile Application
 *
 * Built with React, Tailwind CSS, Leaflet, and Gemini AI.
 */

import React, { Suspense, lazy, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { HERITAGE_SITES, TOUR_CITIES } from './data/heritageSites';
import { HeritageSite, TourSummary, UserLocation, AudioGuideSettings, ChatMessage, SyncState, VisitorPreferences } from './types';
import { getDistanceMeters, speechManager } from './utils/geo';
import { LanguageCode, getTranslatedSite } from './data/translations';
import { Header } from './components/Header';
import { NavigationBottom, TabType } from './components/NavigationBottom';
import { LiveWalkMap } from './components/LiveWalkMap';
import { AudioPlayerDrawer } from './components/AudioPlayerDrawer';
import { HeritageSearch } from './components/HeritageSearch';
import { SettingsPanel } from './components/SettingsPanel';
import { PublicInformationPage, publicInformationPageForPath } from './components/PublicInformationPage';
import { AskBenjaminChat } from './components/AskHerzlChat';
import { SavedToursPanel } from './components/SavedToursPanel';
import { JewishHeritagePodcast } from './components/JewishHeritagePodcast';
import { AccountAccessModal, AccountPromptReason } from './components/AccountAccessModal';
import { OnboardingTour } from './components/OnboardingTour';
import { FirstSignInSetupWizard } from './components/FirstSignInSetupWizard';
import { VisitorSplashScreen } from './components/VisitorSplashScreen';
import { TourCompletionModal } from './components/TourCompletionModal';
import { AccountContext, loadAccountContext, supabase } from './lib/supabase';
import { markOnboardingComplete } from './lib/onboarding';
import { useCmsContent } from './hooks/useCmsContent';
import { usePublicContent } from './hooks/usePublicContent';
import { getTourSites } from './lib/tourStops';
import { findMatchingRecordedNarration, narrationPlaybackSource } from './lib/narrationPlayback';
import { markTourStopCompleted } from './lib/community';

const CmsPanel = lazy(() => import('./components/CmsPanel').then((module) => ({ default: module.CmsPanel })));

const GPS_SIMULATION_MODE = import.meta.env.VITE_GPS_MODE === 'simulator';
const initialPublicParams = new URLSearchParams(window.location.search);
const requestedOrganization = initialPublicParams.get('organization')?.trim().toLowerCase();
const requestedCity = initialPublicParams.get('city')?.trim();
const requestedTour = initialPublicParams.get('tour')?.trim();
const PUBLIC_ORGANIZATION = requestedOrganization && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requestedOrganization)
  ? requestedOrganization
  : (import.meta.env.VITE_ORGANIZATION_SLUG || '3sci');

export default function App() {
  const isCmsRoute = window.location.pathname === '/cms' || window.location.pathname.startsWith('/cms/');
  // Navigation State
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [settingsReturnTab, setSettingsReturnTab] = useState<TabType>('search');
  const [settingsFocus, setSettingsFocus] = useState<'preferences' | 'help'>('preferences');
  const [isAccountOpen, setIsAccountOpen] = useState(isCmsRoute);
  const [accountPromptReason, setAccountPromptReason] = useState<AccountPromptReason>('general');
  const [account, setAccount] = useState<AccountContext | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [accountNotice, setAccountNotice] = useState('');
  const [authResolved, setAuthResolved] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isFirstSignInSetupOpen, setIsFirstSignInSetupOpen] = useState(false);
  const [showVisitorSplash, setShowVisitorSplash] = useState(() => !isCmsRoute && !publicInformationPageForPath(window.location.pathname));
  const cmsContent = useCmsContent(account, isCmsRoute);
  const [experienceMode, setExperienceMode] = useState<'tour' | 'pod'>(() => {
    try {
      return localStorage.getItem('tudela_experience_mode') === 'pod' ? 'pod' : 'tour';
    } catch {
      return 'tour';
    }
  });
  const [completedSiteIds, setCompletedSiteIds] = useState<string[]>([]);
  const [completedTour, setCompletedTour] = useState<TourSummary | null>(null);
  const completionPromptedTourIdsRef = useRef(new Set<string>());
  const deepLinkAppliedRef = useRef(false);
  useEffect(() => {
    if(import.meta.env.VITE_FRONTEND_PREVIEW === 'true'){setAuthResolved(true);setAccount(null);return;}
    let active = true;
    const applySession = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      if (!active) return;
      if (!session) { setAccount(null); setAuthResolved(true); return; }
      try {
        const context = await loadAccountContext(session);
        if (!active) return;
        setAccount(context);
        setAuthResolved(true);
        if (context.profile.password_reset_required) setIsAccountOpen(true);
      } catch (error) {
        if (active) {
          setAccountNotice(error instanceof Error ? error.message : 'The account could not be loaded.');
          setAuthResolved(true);
        }
      }
    };
    void supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        setIsAccountOpen(true);
      }
      // Defer profile queries until Supabase has finished dispatching the auth event.
      window.setTimeout(() => { void applySession(session); }, 0);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const finishOnboarding = () => {
    markOnboardingComplete(localStorage, account?.user.id);
    setIsOnboardingOpen(false);
  };

  useEffect(() => {
    if (!isCmsRoute) return;
    document.title = 'Tudela Global CMS';
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = 'noindex, nofollow, noarchive';
  }, [isCmsRoute]);

  const handleAuthenticated = (context: AccountContext) => {
    setAccount(context);
    setIsPasswordRecovery(false);
    setAccountNotice('');
    if (context.profile.password_reset_required) {
      setIsAccountOpen(true);
      return;
    }
    setIsAccountOpen(false);
    if (isCmsRoute && !context.canAccessCms) {
      setAccountNotice('This account does not have permission to access the CMS.');
    }
  };

  const openAccount = useCallback((reason: AccountPromptReason = 'general') => {
    setAccountPromptReason(reason);
    setIsAccountOpen(true);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAccount(null);
    setIsPasswordRecovery(false);
    setIsAccountOpen(false);
    setIsFirstSignInSetupOpen(false);
    setAccountNotice('Signed out.');
  };

  // Multi-Language State (English, Hebrew, Russian)
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(() => {
    try {
      const stored = localStorage.getItem('tudela_selected_lang');
      return (stored as LanguageCode) || 'en';
    } catch {
      return 'en';
    }
  });

  const [visitorPreferences, setVisitorPreferences] = useState<VisitorPreferences>(() => {
    const defaults: VisitorPreferences = {
      locationEnabled: false,
      arrivalPlaybackMode: 'manual',
      arrivalAlertsEnabled: true,
      arrivalToneEnabled: true,
      arrivalVibrationEnabled: true,
      arrivalPulseEnabled: true,
    };
    try {
      const stored = localStorage.getItem('tudela_visitor_preferences');
      return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    if (!showVisitorSplash) return;
    const timer = window.setTimeout(() => setShowVisitorSplash(false), 2200);
    return () => window.clearTimeout(timer);
  }, [showVisitorSplash]);

  useEffect(() => {
    try { localStorage.setItem('tudela_visitor_preferences', JSON.stringify(visitorPreferences)); }
    catch { /* Preferences remain available for this session. */ }
  }, [visitorPreferences]);

  useEffect(() => {
    if (isCmsRoute || !account || account.profile.password_reset_required) return;
    if (account.user.user_metadata?.tudela_setup_completed_at) return;
    try {
      if (localStorage.getItem(`tudela_setup_completed_${account.user.id}`) !== 'true') setIsFirstSignInSetupOpen(true);
    } catch {
      setIsFirstSignInSetupOpen(true);
    }
  }, [account, isCmsRoute]);

  const completeFirstSignInSetup = async (preferences: VisitorPreferences) => {
    setVisitorPreferences(preferences);
    if (account) {
      try { localStorage.setItem(`tudela_setup_completed_${account.user.id}`, 'true'); }
      catch { /* The setup still applies for this session. */ }
      const { error } = await supabase.auth.updateUser({ data: { tudela_setup_completed_at: new Date().toISOString() } });
      if (error) setAccountNotice('Your choices were saved on this device. Account setup will synchronize after your next sign-in.');
    }
    setIsFirstSignInSetupOpen(false);
  };

  const handleSelectLanguage = (langCode: LanguageCode) => {
    setSelectedLanguage(langCode);
    try {
      localStorage.setItem('tudela_selected_lang', langCode);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const documentLanguage: LanguageCode = isCmsRoute ? 'en' : selectedLanguage;
    const direction = documentLanguage === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = documentLanguage;
    document.documentElement.dir = direction;
    document.body.dir = direction;
  }, [isCmsRoute, selectedLanguage]);

  // Active GPS City Tour State
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const [selectedTourId, setSelectedTourId] = useState<string>('');
  const [discoveryHomeRequest, setDiscoveryHomeRequest] = useState(0);

  // Heritage Sites State & Saved Bookmarks
  const [savedSiteIds, setSavedSiteIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('tudela_saved_sites');
      return stored ? JSON.parse(stored) : ['budapest-dohany-synagogue', 'budapest-herzl-birthplace'];
    } catch {
      return ['budapest-dohany-synagogue', 'budapest-herzl-birthplace'];
    }
  });

  const [savedTourIds, setSavedTourIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('tudela_saved_tours');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [userNotes, setUserNotes] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('tudela_user_notes');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const publicContent = usePublicContent(selectedLanguage, PUBLIC_ORGANIZATION);
  const refreshPublicContent = publicContent.refresh;
  const cities = publicContent.cities;
  const tours = publicContent.tours;
  const sites = useMemo(() => publicContent.sites.map((site) => ({
    ...site,
    isSaved: savedSiteIds.includes(site.id),
  })), [publicContent.sites, savedSiteIds]);

  useEffect(() => {
    if (isCmsRoute || publicContent.isLoading || deepLinkAppliedRef.current) return;
    deepLinkAppliedRef.current = true;
    if (!requestedCity || !requestedTour) return;
    const linkedTour = tours.find((tour) => tour.id === requestedTour && tour.cityId === requestedCity);
    if (!linkedTour || !cities.some((city) => city.id === requestedCity)) return;
    setSelectedCityId(requestedCity);
    setSelectedTourId(requestedTour);
    setActiveTab('search');
  }, [cities, isCmsRoute, publicContent.isLoading, tours]);

  // Demo content is shown while an organization has no complete published tour.
  // Reconcile selections when the canonical CMS catalogue replaces that fallback.
  useEffect(() => {
    if (selectedCityId && !cities.some((city) => city.id === selectedCityId)) {
      setSelectedCityId('');
      setSelectedTourId('');
      setSelectedSite(null);
      return;
    }
    if (selectedTourId && !tours.some((tour) => tour.id === selectedTourId && tour.cityId === selectedCityId)) {
      setSelectedTourId('');
      setSelectedSite(null);
    }
  }, [cities, selectedCityId, selectedTourId, tours]);

  // Persist bookmarks independently of the shared CMS catalogue.
  useEffect(() => {
    try {
      localStorage.setItem('tudela_saved_sites', JSON.stringify(savedSiteIds));
    } catch (e) {
      console.error(e);
    }
  }, [savedSiteIds]);

  useEffect(() => {
    try { localStorage.setItem('tudela_saved_tours', JSON.stringify(savedTourIds)); }
    catch { /* Saved tours remain available for this session. */ }
  }, [savedTourIds]);

  // Filtered stops for the selected published tour.
  const currentCitySites = useMemo(() => {
    if (!selectedCityId) return [];
    const citySites = sites.filter((site) => site.cityId === selectedCityId);
    if (!selectedTourId) return [];
    return getTourSites(citySites, selectedTourId);
  }, [sites, selectedCityId, selectedTourId]);

  // If a visitor signs in immediately after finishing as a guest, safely replay
  // only the locally completed stop evidence through the same idempotent RPC.
  useEffect(() => {
    if (!account || !selectedTourId || completedSiteIds.length === 0) return;
    const completedTourStops = currentCitySites.filter((site) => completedSiteIds.includes(site.id));
    if (completedTourStops.length === 0) return;
    let active = true;
    void (async () => {
      let finalResult: Awaited<ReturnType<typeof markTourStopCompleted>> | null = null;
      for (const site of completedTourStops) finalResult = await markTourStopCompleted(selectedTourId, site.id);
      if (!active || !finalResult?.tourComplete || completionPromptedTourIdsRef.current.has(selectedTourId)) return;
      const tour = tours.find((candidate) => candidate.id === selectedTourId);
      if (!tour) return;
      completionPromptedTourIdsRef.current.add(selectedTourId);
      setCompletedTour(tour);
    })().catch((reason) => { if (active) setAccountNotice(reason instanceof Error ? reason.message : 'Tour completion could not be saved.'); });
    return () => { active = false; };
  }, [account?.user.id]);

  // Selected Site & Active Audio Guide State
  const [selectedSite, setSelectedSite] = useState<HeritageSite | null>(null);
  const recordedAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackSessionRef = useRef(0);
  useEffect(() => () => { playbackSessionRef.current += 1; recordedAudioRef.current?.pause(); recordedAudioRef.current = null; }, []);

  // User GPS Location State initialized to Budapest first stop
  const [userLocation, setUserLocation] = useState<UserLocation>(() => {
    const firstBudapest = HERITAGE_SITES.find((s) => s.cityId === 'budapest') || HERITAGE_SITES[0];
    return {
      lat: firstBudapest ? firstBudapest.lat : 47.4959,
      lng: firstBudapest ? firstBudapest.lng : 19.0606,
      accuracy: 5,
      isSimulated: true,
    };
  });
  const [gpsStatus, setGpsStatus] = useState<'off' | 'simulated' | 'requesting' | 'live' | 'denied' | 'unavailable' | 'error'>(visitorPreferences.locationEnabled ? (GPS_SIMULATION_MODE ? 'simulated' : 'requesting') : 'off');

  // Handle City Change
  const handleSelectCity = (cityId: string) => {
    setSelectedCityId(cityId);
    setSelectedTourId('');
    triggeredSiteIdsRef.current.clear();
    arrivedSiteIdsRef.current.clear();
    playbackSessionRef.current += 1;
    recordedAudioRef.current?.pause();
    recordedAudioRef.current = null;
    speechManager.cancel();
    setAudioSettings((prev) => ({ ...prev, currentSiteId: null, isPlaying: false }));

    if (!cityId) {
      setSelectedSite(null);
      setActiveTab('search');
      return;
    }

    setSelectedSite(null);
    setActiveTab(experienceMode === 'pod' ? 'podcast' : 'search');
  };

  const handleSelectTour = (tourId: string) => {
    setSelectedTourId(tourId);
    triggeredSiteIdsRef.current.clear();
    arrivedSiteIdsRef.current.clear();
    playbackSessionRef.current += 1;
    recordedAudioRef.current?.pause();
    recordedAudioRef.current = null;
    speechManager.cancel();
    setAudioSettings((prev) => ({ ...prev, currentSiteId: null, isPlaying: false }));
    const firstSite = getTourSites(sites, tourId)[0] || null;
    setSelectedSite(firstSite);
    if (firstSite && GPS_SIMULATION_MODE && visitorPreferences.locationEnabled) setUserLocation({ lat: firstSite.lat, lng: firstSite.lng, accuracy: 5, isSimulated: true });
  };

  const [audioSettings, setAudioSettings] = useState<AudioGuideSettings>({
    autoTriggerEnabled: visitorPreferences.arrivalPlaybackMode === 'auto',
    triggerRadiusMeters: 50,
    speechRate: 1.0,
    volume: 1.0,
    voice: 'en-US',
    isPlaying: false,
    currentSiteId: null,
    playbackSource: 'device',
    playbackError: false,
    playbackProgress: 0,
    currentTime: 0,
  });

  // Network Online/Offline Sync State
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastSyncedAt: new Date().toISOString(),
    pendingSyncCount: 0,
    syncing: false,
    savedSiteIds: [],
    userNotes: {},
  });

  const [arrivalAlert, setArrivalAlert] = useState<HeritageSite | null>(null);

  // Ask Herzl Chat History
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [benjaminDraftQuestion, setBenjaminDraftQuestion] = useState('');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  const [herzlResponseMode, setHerzlResponseMode] = useState<'simulator' | 'live' | 'fallback' | null>(null);

  // Auto Sync on Online Restore
  useEffect(() => {
    const handleOnline = () => {
      setSyncState((prev) => ({ ...prev, isOnline: true }));
      triggerCloudSync();
    };
    const handleOffline = () => {
      setSyncState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Production accepts live device coordinates anywhere in the world.
  useEffect(() => {
    if (!visitorPreferences.locationEnabled) {
      setGpsStatus('off');
      return;
    }
    if (GPS_SIMULATION_MODE) {
      setGpsStatus('simulated');
      return;
    }

    setGpsStatus('requesting');

    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            isSimulated: false,
          });
          setGpsStatus('live');
        },
        (err) => {
          setGpsStatus(err.code === err.PERMISSION_DENIED ? 'denied' : err.code === err.POSITION_UNAVAILABLE ? 'unavailable' : 'error');
          console.info('Device geolocation unavailable:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
    setGpsStatus('unavailable');
  }, [visitorPreferences.locationEnabled]);

  useEffect(() => {
    setAudioSettings((previous) => ({ ...previous, autoTriggerEnabled: visitorPreferences.arrivalPlaybackMode === 'auto' }));
  }, [visitorPreferences.arrivalPlaybackMode]);

  const completeVisitedStop = useCallback((site: HeritageSite) => {
    setCompletedSiteIds((previous) => {
      if (previous.includes(site.id)) return previous;
      const completed = [...previous, site.id];
      const tourSites = sites.filter((candidate) => candidate.cityId === site.cityId && (!selectedTourId || candidate.tourAssignments?.some((assignment) => assignment.tourId === selectedTourId) || candidate.tourId === selectedTourId));
      const nextSite = tourSites.find((candidate) => !completed.includes(candidate.id));
      if (nextSite) setSelectedSite(nextSite);
      if (!account && selectedTourId && tourSites.length > 0 && tourSites.every((candidate) => completed.includes(candidate.id)) && !completionPromptedTourIdsRef.current.has(selectedTourId)) {
        const tour = tours.find((candidate) => candidate.id === selectedTourId);
        if (tour) {
          completionPromptedTourIdsRef.current.add(selectedTourId);
          setCompletedTour(tour);
        }
      }
      return completed;
    });
    if (account && selectedTourId) {
      void markTourStopCompleted(selectedTourId, site.id).then((result) => {
        if (!result.tourComplete || completionPromptedTourIdsRef.current.has(selectedTourId)) return;
        const tour = tours.find((candidate) => candidate.id === selectedTourId);
        if (!tour) return;
        completionPromptedTourIdsRef.current.add(selectedTourId);
        setCompletedTour(tour);
      }).catch((reason) => setAccountNotice(reason instanceof Error ? reason.message : 'Tour progress could not be saved.'));
    }
  }, [account, selectedTourId, sites, tours]);

  // Prefer reviewed recorded narration; retain device speech as the accessible fallback.
  const playAudioForSite = useCallback(
    (site: HeritageSite) => {
      const playbackSession = playbackSessionRef.current + 1;
      playbackSessionRef.current = playbackSession;
      setSelectedSite(site);
      recordedAudioRef.current?.pause();
      recordedAudioRef.current = null;
      speechManager.cancel();
      const canUseRecording = narrationPlaybackSource(site, selectedLanguage) === 'recorded';
      setAudioSettings((prev) => ({
        ...prev,
        currentSiteId: site.id,
        isPlaying: true,
        playbackSource: canUseRecording ? 'recorded' : 'device',
        playbackError: false,
        playbackProgress: 0,
        currentTime: 0,
      }));

      const translatedSite = getTranslatedSite(site, selectedLanguage);
      const completePlayback = (duration: number) => {
        if (playbackSessionRef.current !== playbackSession) return;
        setAudioSettings((prev) => ({ ...prev, isPlaying: false, playbackProgress: 100, currentTime: duration }));
      };
      let deviceFallbackStarted = false;
      const playDeviceSpeech = () => {
        if (deviceFallbackStarted || playbackSessionRef.current !== playbackSession) return;
        deviceFallbackStarted = true;
        setAudioSettings((prev) => ({ ...prev, playbackSource: 'device' }));
        speechManager.speak(
          translatedSite.transcript,
          (charIndex) => {
            if (playbackSessionRef.current !== playbackSession) return;
            const totalLength = translatedSite.transcript.length;
            const progress = Math.min(100, Math.round((charIndex / totalLength) * 100));
            const timeEstimate = Math.round((charIndex / totalLength) * site.audioDuration);

            setAudioSettings((prev) => ({
              ...prev,
              playbackProgress: progress,
              currentTime: timeEstimate,
            }));
          },
          () => {
            completePlayback(site.audioDuration);
          },
          (err) => {
            console.error('Audio playback error:', err);
            setAudioSettings((prev) => ({ ...prev, isPlaying: false, playbackError: true }));
          },
          selectedLanguage
        );
      };
      if (!canUseRecording) { playDeviceSpeech(); return; }
      const playRecording = (recordingSite: HeritageSite, allowUrlRefresh: boolean) => {
        if (playbackSessionRef.current !== playbackSession) return;
        const audio = new Audio(recordingSite.narrationUrl);
        recordedAudioRef.current = audio;
        audio.preload = 'auto';
        audio.playbackRate = audioSettings.speechRate;
        audio.volume = audioSettings.volume;
        audio.ontimeupdate = () => {
          if (playbackSessionRef.current !== playbackSession) return;
          const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : site.audioDuration;
          setAudioSettings((prev) => ({ ...prev, currentTime: audio.currentTime, playbackProgress: duration > 0 ? Math.min(100, (audio.currentTime / duration) * 100) : 0 }));
        };
        audio.onloadedmetadata = () => {
          if (Number.isFinite(audio.duration) && audio.duration > 0) setAudioSettings((prev) => ({ ...prev, currentTime: 0, playbackProgress: 0 }));
        };
        audio.onended = () => { if (playbackSessionRef.current !== playbackSession) return; recordedAudioRef.current = null; completePlayback(Number.isFinite(audio.duration) ? audio.duration : site.audioDuration); };
        let failureHandled = false;
        const recoverOrFallback = async () => {
          if (failureHandled || playbackSessionRef.current !== playbackSession) return;
          failureHandled = true;
          if (recordedAudioRef.current === audio) recordedAudioRef.current = null;
          if (allowUrlRefresh && navigator.onLine) {
            const refreshed = await refreshPublicContent();
            if (playbackSessionRef.current !== playbackSession) return;
            const refreshedSite = refreshed ? findMatchingRecordedNarration(refreshed.sites, site.id, selectedLanguage) : null;
            if (refreshedSite) {
              playRecording(refreshedSite, false);
              return;
            }
          }
          playDeviceSpeech();
        };
        audio.onerror = () => { void recoverOrFallback(); };
        void audio.play().catch(() => { void recoverOrFallback(); });
      };
      playRecording(site, true);
    },
    [audioSettings.speechRate, audioSettings.volume, refreshPublicContent, selectedLanguage]
  );

  // Pause Audio
  const pauseAudio = useCallback(() => {
    if (recordedAudioRef.current) recordedAudioRef.current.pause(); else speechManager.pause();
    setAudioSettings((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  // Resume Audio
  const resumeAudio = useCallback(() => {
    if (recordedAudioRef.current) void recordedAudioRef.current.play(); else speechManager.resume();
    setAudioSettings((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  // Seek Audio Progress
  const seekAudioProgress = useCallback(
    (percentage: number) => {
      const activeSite = sites.find((s) => s.id === audioSettings.currentSiteId) || selectedSite;
      if (!activeSite) return;

      if (recordedAudioRef.current && Number.isFinite(recordedAudioRef.current.duration) && recordedAudioRef.current.duration > 0) {
        recordedAudioRef.current.currentTime = (percentage / 100) * recordedAudioRef.current.duration;
        setAudioSettings((prev) => ({ ...prev, playbackProgress: percentage, currentTime: recordedAudioRef.current?.currentTime || 0 }));
        return;
      }

      const targetChar = Math.round((percentage / 100) * activeSite.transcript.length);
      const remainingText = activeSite.transcript.substring(targetChar);

      setAudioSettings((prev) => ({
        ...prev,
        playbackProgress: percentage,
        currentTime: Math.round((percentage / 100) * activeSite.audioDuration),
      }));

      speechManager.speak(remainingText, (charIndex) => {
        const charActual = targetChar + charIndex;
        const prog = Math.min(100, Math.round((charActual / activeSite.transcript.length) * 100));
        setAudioSettings((prev) => ({
          ...prev,
          playbackProgress: prog,
          currentTime: Math.round((charActual / activeSite.transcript.length) * activeSite.audioDuration),
        }));
      });
    },
    [sites, audioSettings.currentSiteId, selectedSite]
  );

  // Change Speech Speed Rate
  const changeSpeechRate = useCallback((rate: number) => {
    speechManager.setRate(rate);
    if (recordedAudioRef.current) recordedAudioRef.current.playbackRate = rate;
    setAudioSettings((prev) => ({ ...prev, speechRate: rate }));
  }, []);

  // Ref to track sites that have already been auto-triggered via geofence
  const triggeredSiteIdsRef = useRef<Set<string>>(new Set());
  const arrivedSiteIdsRef = useRef<Set<string>>(new Set());

  const signalArrival = useCallback((site: HeritageSite) => {
    if (!visitorPreferences.arrivalAlertsEnabled) return;
    if (visitorPreferences.arrivalPulseEnabled) {
      setArrivalAlert(site);
      window.setTimeout(() => setArrivalAlert((current) => current?.id === site.id ? null : current), 3500);
    }
    if (visitorPreferences.arrivalVibrationEnabled && 'vibrate' in navigator) navigator.vibrate([180, 90, 180]);
    if (!visitorPreferences.arrivalToneEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      gain.gain.setValueAtTime(0.001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.36);
      oscillator.addEventListener('ended', () => { void context.close(); });
    } catch {
      // Visual and vibration alerts remain available if mobile autoplay rules block the tone.
    }
  }, [visitorPreferences.arrivalAlertsEnabled, visitorPreferences.arrivalPulseEnabled, visitorPreferences.arrivalToneEnabled, visitorPreferences.arrivalVibrationEnabled]);

  // Arrival detection records a physical visit. Audio playback is a separate choice.
  useEffect(() => {
    if (gpsStatus !== 'live' || currentCitySites.length === 0) return;

    const targetSite = currentCitySites.find((site) => !completedSiteIds.includes(site.id));
    if (!targetSite) return;
    const targetDistance = getDistanceMeters(userLocation.lat, userLocation.lng, targetSite.lat, targetSite.lng);
    if (targetDistance > audioSettings.triggerRadiusMeters * 2) triggeredSiteIdsRef.current.delete(targetSite.id);
    if (targetDistance > audioSettings.triggerRadiusMeters) return;
    const closest = { site: targetSite, distance: targetDistance };

    if (!arrivedSiteIdsRef.current.has(closest.site.id)) {
      arrivedSiteIdsRef.current.add(closest.site.id);
      completeVisitedStop(closest.site);
    }

    if (!triggeredSiteIdsRef.current.has(closest.site.id)) {
      triggeredSiteIdsRef.current.add(closest.site.id);
      signalArrival(closest.site);
      if (audioSettings.autoTriggerEnabled && audioSettings.currentSiteId !== closest.site.id) playAudioForSite(closest.site);

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(`Arrived at ${closest.site.name}`, {
          body: audioSettings.autoTriggerEnabled ? 'Narration started automatically.' : 'Open Tudela and press Play when you are ready.',
          icon: closest.site.imageUrl,
        });
      }
    }
  }, [userLocation, gpsStatus, audioSettings.autoTriggerEnabled, audioSettings.triggerRadiusMeters, audioSettings.currentSiteId, currentCitySites, completedSiteIds, completeVisitedStop, playAudioForSite, signalArrival]);

  // Toggle Saved Bookmark
  const handleToggleSaved = (siteId: string) => {
    setSavedSiteIds((prev) => {
      if (prev.includes(siteId)) {
        return prev.filter((id) => id !== siteId);
      } else {
        return [...prev, siteId];
      }
    });
  };

  // Save Travel Note
  const handleSaveNote = (siteId: string, note: string) => {
    const updated = { ...userNotes, [siteId]: note };
    setUserNotes(updated);
    try {
      localStorage.setItem('tudela_user_notes', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger Cloud Storage Sync API
  const triggerCloudSync = async () => {
    if(import.meta.env.VITE_FRONTEND_PREVIEW === 'true'){setAccountNotice('This preview saves on your device. Shared account sync will be enabled in a later stage.');return;}
    setSyncState((prev) => ({ ...prev, syncing: true }));
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(account?.session.access_token ? { Authorization: `Bearer ${account.session.access_token}` } : {}) },
        body: JSON.stringify({
          savedSiteIds,
          userNotes,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Account sync is unavailable.');
      if (data.success) {
        setSyncState((prev) => ({
          ...prev,
          syncing: false,
          lastSyncedAt: data.lastSyncedAt || new Date().toISOString(),
          pendingSyncCount: 0,
        }));
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.warn('Sync failed (using local offline storage fallback):', error);
      setSyncState((prev) => ({
        ...prev,
        syncing: false,
        pendingSyncCount: prev.pendingSyncCount + 1,
      }));
    }
  };

  // AI is used only in the visitor's chosen external service.
  const handleSendChatMessage = async (text: string) => {
    setBenjaminDraftQuestion(text); setActiveTab('benjamin');
  };

  const handleToggleMasterAudio = () => {
    if (audioSettings.isPlaying) {
      pauseAudio();
    } else {
      const activeSite = sites.find((s) => s.id === audioSettings.currentSiteId) || selectedSite || currentCitySites[0];
      if (activeSite) {
        if (audioSettings.currentSiteId === activeSite.id && audioSettings.playbackProgress > 0 && audioSettings.playbackProgress < 100) {
          resumeAudio();
        } else {
          playAudioForSite(activeSite);
        }
      }
    }
  };

  const savedSitesList = sites.filter((s) => s.isSaved);
  const activeAudioSite = sites.find((s) => s.id === audioSettings.currentSiteId) || selectedSite;
  const tourControlSite = activeAudioSite || currentCitySites[0] || null;

  if (isCmsRoute) {
    const cmsAccount = account?.canAccessCms && !account.profile.password_reset_required ? account : null;
    return (
      <div className="cms-route-shell min-h-screen bg-slate-950 font-sans text-slate-900">
        {cmsAccount ? (
          <Suspense fallback={<main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-5 py-10 text-sm font-bold text-white">Loading the secure CMS…</main>}>
          <CmsPanel
            cities={cmsContent.cities}
            tours={cmsContent.tours}
            sites={cmsContent.sites}
            reviewItems={cmsContent.reviewItems}
            archivedReviewItems={cmsContent.archivedReviewItems}
            mediaItems={cmsContent.mediaItems}
            narrationItems={cmsContent.narrationItems}
            archivedItems={cmsContent.archivedItems}
            aiSources={cmsContent.aiSources}
            tourRatings={cmsContent.tourRatings}
            tourComments={cmsContent.tourComments}
            heritageStories={cmsContent.heritageStories}
            communityBans={cmsContent.communityBans}
            organizations={cmsContent.organizations}
            organizationId={cmsContent.organizationId}
            onSelectOrganization={cmsContent.setOrganizationId}
            onRefresh={cmsContent.refresh}
            loading={cmsContent.loading}
            error={cmsContent.error}
            canEdit={cmsContent.canEdit}
            canReview={cmsContent.canReview}
            canArchive={cmsContent.canArchive}
            onSaveCity={cmsContent.saveCity}
            onSaveTour={cmsContent.saveTour}
            onDeleteCity={cmsContent.archiveCity}
            onDeleteTour={cmsContent.archiveTour}
            onReorderTourStops={cmsContent.reorderTourStops}
            onReplaceTourStops={cmsContent.replaceTourStops}
            onSaveSite={cmsContent.saveSite}
            onDeleteSite={cmsContent.archiveSite}
            onRestoreContent={cmsContent.restoreContent}
            onArchiveRevision={cmsContent.archiveRevision}
            onRestoreRevision={cmsContent.restoreRevision}
            onSaveTourBundle={cmsContent.saveTourBundle}
            onSubmitTourPackage={cmsContent.submitTourPackage}
            onImport={cmsContent.importData}
            onUploadImage={cmsContent.uploadImage}
            onAmendRevision={cmsContent.amendRevision}
            onReview={cmsContent.review}
            onReviewMedia={cmsContent.reviewMedia}
            onReviewNarration={cmsContent.reviewNarration}
            onReviewTourRating={cmsContent.reviewTourRating}
            onReviewTourComment={cmsContent.reviewTourComment}
            onReviewHeritageStory={cmsContent.reviewHeritageStory}
            onBanCommunityUser={cmsContent.banCommunityUser}
            onLiftCommunityBan={cmsContent.liftCommunityBan}
            onPublish={cmsContent.publish}
            onSaveAiSource={cmsContent.saveAiSource}
            onSubmitAiSource={cmsContent.submitAiSource}
            onReviewAiSource={cmsContent.reviewAiSource}
            account={cmsAccount}
            onSignOut={handleSignOut}
          />
          </Suspense>
        ) : (
          <main className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
            <section className="w-full rounded-3xl border border-slate-700 bg-white p-6 shadow-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-700">Restricted administration route</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-950">Tudela Global CMS</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Sign in with an authorized Super Admin, Administrator, Editor or Reviewer account.</p>
              {accountNotice && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">{accountNotice}</p>}
              {account && !account.canAccessCms ? (
                <div className="mt-5 space-y-2">
                  <p className="text-sm font-bold">Signed in as {account.profile.display_name || account.user.email}</p>
                  <button onClick={handleSignOut} className="w-full rounded-xl border border-slate-200 py-3 text-sm font-bold">Sign out</button>
                </div>
              ) : (
                <button onClick={() => setIsAccountOpen(true)} className="mt-5 w-full rounded-xl bg-blue-900 py-3 text-sm font-bold text-white">Sign in to CMS</button>
              )}
              <a href={import.meta.env.BASE_URL} className="mt-4 block text-center text-xs font-semibold text-slate-500">Return to visitor website</a>
            </section>
          </main>
        )}
        <AccountAccessModal isOpen={isAccountOpen} forcePasswordChange={Boolean(account?.profile.password_reset_required)} recoveryMode={isPasswordRecovery} account={account} promptReason={accountPromptReason} onClose={() => setIsAccountOpen(false)} onAuthenticated={handleAuthenticated} onSignOut={handleSignOut} />
      </div>
    );
  }

  const publicInformationPage = publicInformationPageForPath(window.location.pathname);
  if (publicInformationPage) {
    return <PublicInformationPage page={publicInformationPage} language={selectedLanguage} onSelectLanguage={handleSelectLanguage} />;
  }

  return (
    <div dir={selectedLanguage === 'he' ? 'rtl' : 'ltr'} className="tudela-visitor-shell h-full w-full bg-[#173f46] flex flex-col font-sans select-none overflow-hidden relative">
      {/* Mobile Header Bar */}
      <Header
        selectedLanguage={selectedLanguage}
        locationEnabled={visitorPreferences.locationEnabled}
        savedCount={savedTourIds.length}
        onSelectLanguage={handleSelectLanguage}
        onToggleLocation={() => setVisitorPreferences((previous) => ({ ...previous, locationEnabled: !previous.locationEnabled }))}
        onOpenAccount={() => openAccount('general')}
        onGoDiscovery={() => { setDiscoveryHomeRequest((value) => value + 1); setSelectedCityId(''); setSelectedTourId(''); setSelectedSite(null); setActiveTab('search'); }}
        onOpenSaved={() => setActiveTab('saved')}
        onOpenSettings={() => {
          if (activeTab !== 'settings') setSettingsReturnTab(activeTab);
          setSettingsFocus('preferences');
          setActiveTab('settings');
        }}
        onOpenHelp={() => { if (activeTab !== 'settings') setSettingsReturnTab(activeTab); setSettingsFocus('help'); setActiveTab('settings'); }}
        accountLabel={account?.profile.display_name || account?.user.email || undefined}
      />

      {showVisitorSplash && <VisitorSplashScreen />}

      {accountNotice && <button onClick={() => setAccountNotice('')} className="app-safe-notice absolute left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs font-semibold text-amber-900 shadow-lg">{accountNotice}</button>}

      {/* Main Tab Content Display */}
      {publicContent.source === 'demo' && <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">{import.meta.env.VITE_FRONTEND_PREVIEW === 'true' ? 'Online frontend preview · Sample tours · Accounts and shared publishing are not connected.' : 'MVP sample tours · Check venue details and accessibility before travelling.'}</div>}
      <main className="relative min-h-0 flex-1 overflow-hidden">
        {activeTab === 'walk' && (
          <LiveWalkMap
            sites={currentCitySites}
            userLocation={userLocation}
            gpsStatus={gpsStatus}
            locationEnabled={visitorPreferences.locationEnabled}
            audioSettings={audioSettings}
            selectedSite={selectedSite}
            nextSiteId={currentCitySites.find((site) => !completedSiteIds.includes(site.id))?.id || null}
            completedSiteIds={completedSiteIds}
            onSelectSite={(site) => setSelectedSite(site)}
            onToggleLocation={() => setVisitorPreferences((previous) => ({ ...previous, locationEnabled: !previous.locationEnabled }))}
            onOpenSettings={() => { setSettingsReturnTab('walk'); setSettingsFocus('preferences'); setActiveTab('settings'); }}
            onPlayAudioForSite={(site) => playAudioForSite(site)}
            onSelectDestination={() => setActiveTab('search')}
            onOpenTourStops={() => setActiveTab('search')}
            selectedLanguage={selectedLanguage}
            organizationSlug={PUBLIC_ORGANIZATION}
            selectedTourId={selectedTourId}
          />
        )}

        {activeTab === 'search' && (
          <HeritageSearch
            sites={currentCitySites}
            allSites={sites}
            userLocation={userLocation}
            gpsStatus={gpsStatus}
            locationEnabled={visitorPreferences.locationEnabled}
            onEnableLocation={() => setVisitorPreferences((previous) => ({ ...previous, locationEnabled: true }))}
            audioSettings={audioSettings}
            cities={cities}
            selectedCityId={selectedCityId}
            onSelectCity={handleSelectCity}
            tours={tours}
            selectedTourId={selectedTourId}
            onSelectTour={handleSelectTour}
            selectedLanguage={selectedLanguage}
            experienceMode={experienceMode}
            onSelectExperience={(mode) => {
              setExperienceMode(mode);
              try {
                localStorage.setItem('tudela_experience_mode', mode);
              } catch {
                // Continue without persistence if storage is unavailable.
              }
              if (mode === 'pod') {
                playbackSessionRef.current += 1;
                recordedAudioRef.current?.pause();
                recordedAudioRef.current = null;
                speechManager.cancel();
                setAudioSettings((prev) => ({
                  ...prev,
                  autoTriggerEnabled: false,
                  currentSiteId: null,
                  isPlaying: false,
                }));
                setActiveTab('podcast');
              } else {
                setActiveTab('search');
              }
            }}
            onSelectSite={(site) => {
              setSelectedSite(site);
              setActiveTab('walk');
            }}
            onPlayAudioForSite={(site) => {
              playAudioForSite(site);
              setActiveTab('walk');
            }}
            onPauseAudio={pauseAudio}
            onResumeAudio={resumeAudio}
            savedTourIds={savedTourIds}
            onToggleSavedTour={(tourId) => setSavedTourIds((previous) => previous.includes(tourId) ? previous.filter((id) => id !== tourId) : [...previous, tourId])}
            signedIn={Boolean(account)}
            onOpenAccount={(reason) => openAccount(reason)}
            onAskBenjamin={(question) => { setBenjaminDraftQuestion(question); setActiveTab('benjamin'); }}
            homeRequestId={discoveryHomeRequest}
          />
        )}

        {activeTab === 'podcast' && (
          <JewishHeritagePodcast
            sites={currentCitySites}
            selectedLanguage={selectedLanguage}
            audioSettings={audioSettings}
            onBack={() => setActiveTab('search')}
            onPlay={(site) => playAudioForSite(site)}
            onPause={pauseAudio}
            onResume={resumeAudio}
            cities={cities}
            selectedCityId={selectedCityId}
            onSelectCity={handleSelectCity}
          />
        )}

        {(activeTab === 'herzl' || activeTab === 'benjamin') && (
          <AskBenjaminChat
            chatMessages={chatMessages}
            onSendMessage={handleSendChatMessage}
            isSending={isSendingChat}
            responseMode={herzlResponseMode}
            selectedCityId={selectedCityId}
            selectedTourId={selectedTourId}
            currentCity={cities.find((city) => city.id === selectedCityId) || null}
            contentSource={publicContent.source}
            selectedLanguage={selectedLanguage}
            signedIn={Boolean(account)}
            onOpenAccount={() => openAccount('benjamin')}
            onClose={() => setActiveTab(selectedTourId ? 'walk' : 'search')}
            initialQuestion={benjaminDraftQuestion}
            onInitialQuestionConsumed={() => setBenjaminDraftQuestion('')}
          />
        )}

        {activeTab === 'saved' && (
          <SavedToursPanel
            tours={tours}
            cities={cities}
            sites={sites}
            savedTourIds={savedTourIds}
            selectedLanguage={selectedLanguage}
            onOpenTour={(tour) => { handleSelectCity(tour.cityId); handleSelectTour(tour.id); setActiveTab('search'); }}
            onRemoveTour={(tourId) => setSavedTourIds((previous) => previous.filter((id) => id !== tourId))}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPanel selectedLanguage={selectedLanguage} onBack={() => setActiveTab(settingsReturnTab)} onReplayOnboarding={() => setIsOnboardingOpen(true)} onOpenSetupWizard={() => setIsFirstSignInSetupOpen(true)} preferences={visitorPreferences} onChangePreferences={setVisitorPreferences} syncState={syncState} onSync={triggerCloudSync} focusSection={settingsFocus} />
        )}

      </main>

      {/* Sticky Floating Audio Player Drawer - Only shown on Live Walk & Map tab */}
      {tourControlSite && activeTab === 'walk' && (
        <AudioPlayerDrawer
          site={tourControlSite}
          sites={currentCitySites}
          audioSettings={audioSettings}
          selectedLanguage={selectedLanguage}
          onPlay={() => {
            if (audioSettings.currentSiteId !== tourControlSite.id || audioSettings.playbackProgress >= 100) {
              playAudioForSite(tourControlSite);
            } else {
              resumeAudio();
            }
          }}
          onPause={pauseAudio}
          onSeek={seekAudioProgress}
          onChangeRate={changeSpeechRate}
          onSelectSite={(site) => setSelectedSite(site)}
          onClosePlayer={() => {
            playbackSessionRef.current += 1;
            recordedAudioRef.current?.pause();
            recordedAudioRef.current = null;
            speechManager.cancel();
            setAudioSettings((prev) => ({ ...prev, currentSiteId: null, isPlaying: false, playbackError: false }));
          }}
        />
      )}

      {arrivalAlert && (
        <div className="pointer-events-none fixed inset-0 z-[900] flex items-center justify-center border-[6px] border-emerald-400 bg-emerald-300/20 p-5 animate-pulse" role="status" aria-live="assertive">
          <div className="rounded-3xl bg-white px-6 py-5 text-center shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">You have arrived</p>
            <p className="mt-2 text-lg font-bold text-blue-950">{getTranslatedSite(arrivalAlert, selectedLanguage).name}</p>
            <p className="mt-1 text-xs text-slate-600">{visitorPreferences.arrivalPlaybackMode === 'auto' ? 'Narration is starting automatically.' : 'Press Play when you are ready.'}</p>
          </div>
        </div>
      )}

      <AccountAccessModal isOpen={isAccountOpen} forcePasswordChange={Boolean(account?.profile.password_reset_required)} recoveryMode={isPasswordRecovery} account={account} promptReason={accountPromptReason} onClose={() => setIsAccountOpen(false)} onAuthenticated={handleAuthenticated} onSignOut={handleSignOut} />

      <FirstSignInSetupWizard isOpen={isFirstSignInSetupOpen && !isAccountOpen} selectedLanguage={selectedLanguage} preferences={visitorPreferences} onComplete={completeFirstSignInSetup} />

      {completedTour && <TourCompletionModal tour={completedTour} language={selectedLanguage} signedIn={Boolean(account)} onOpenAccount={() => openAccount('rating')} onReturnHome={() => { setCompletedTour(null); setSelectedCityId(''); setSelectedTourId(''); setSelectedSite(null); setActiveTab('search'); }} onClose={() => setCompletedTour(null)}/>}

      <OnboardingTour isOpen={isOnboardingOpen && !isAccountOpen && !isFirstSignInSetupOpen} selectedLanguage={selectedLanguage} onFinish={finishOnboarding} />

      {/* Bottom Mobile Tab Bar */}
      {activeTab !== 'settings' && (
        <NavigationBottom
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === 'search') {
              setDiscoveryHomeRequest((value) => value + 1);
              setSelectedTourId('');
              setSelectedSite(null);
            }
            setActiveTab(tab);
          }}
          savedCount={savedTourIds.length}
          selectedLanguage={selectedLanguage}
        />
      )}
    </div>
  );
}

