export type SiteCategory = 
  | 'juderia' 
  | 'synagogue' 
  | 'mikveh' 
  | 'bridge' 
  | 'monument' 
  | 'scholar' 
  | 'cemetery'
  | 'museum'
  | 'kosher_food'
  | 'community'
  | 'education'
  | 'archaeology'
  | 'archives'
  | 'historic_site'
  | 'memorial'
  | 'culture'
  | 'holocaust'
  | 'legends'
  | 'personalities'
  | 'historic_sites';

export type ContentStatus =
  | 'draft'
  | 'pending_review'
  | 'changes_requested'
  | 'approved'
  | 'published'
  | 'archived';

export type ContentLanguage = 'en' | 'he' | 'ru' | 'fr' | 'de' | 'es';

export type PronunciationEncoding = 'ipa' | 'x_sampa' | 'spoken_hint';

export interface PronunciationEntry {
  phrase: string;
  encoding: PronunciationEncoding;
  pronunciation: string;
  reviewerNote: string;
}

export interface HeritageSiteTranslation {
  title: string;
  nativeName: string;
  shortDescription: string;
  fullDescription: string;
  transcript: string;
  pronunciations: PronunciationEntry[];
}

export interface HeritageSite {
  id: string;
  name: string;
  hebrewName: string;
  category: SiteCategory;
  cityId?: string;
  cityName?: string;
  lat: number;
  lng: number;
  address: string;
  shortDescription: string;
  fullDescription: string;
  audioDuration: number; // in seconds
  transcript: string;
  narrationUrl?: string;
  narrationLanguage?: 'en' | 'he' | 'ru' | 'fr' | 'de' | 'es';
  narrationVoice?: string;
  narrationProvider?: string;
  historicalPeriod: string;
  imageUrl: string;
  imageCredit?: string;
  imageSourceUrl?: string;
  imageLicenseName?: string;
  imageLicenseUrl?: string;
  tags: string[];
  keyFacts: string[];
  distanceMeters?: number;
  isSaved?: boolean;
  tourOrder?: number;
  tourId?: string;
  tourAssignments?: Array<{ tourId: string; position: number }>;
  organizationId?: string;
  imageMediaId?: string;
  status?: ContentStatus;
  translations?: Partial<Record<ContentLanguage, HeritageSiteTranslation>>;
}

export interface TourCity {
  id: string;
  name: string;
  country: string;
  flagEmoji: string;
  subtitle: string;
  description: string;
  centerLat: number;
  centerLng: number;
  imageUrl?: string;
  imageCredit?: string;
  imageSourceUrl?: string;
  imageLicenseName?: string;
  imageLicenseUrl?: string;
  tourId?: string;
  organizationId?: string;
  imageMediaId?: string;
  status?: ContentStatus;
}

export interface TourSummary {
  id: string;
  cityId: string;
  title: string;
  subtitle: string;
  overview: string;
  completionMessage?: string;
  imageUrl?: string;
  imageCredit?: string;
  imageSourceUrl?: string;
  imageLicenseName?: string;
  imageLicenseUrl?: string;
  imageMediaId?: string;
  estimatedDurationMinutes?: number;
  distanceMetres?: number;
  difficulty?: 'easy' | 'moderate' | 'challenging';
  wheelchairAccessible?: boolean;
  accessMode?: 'free' | 'paid' | 'subscription';
  organizationId?: string;
  status?: ContentStatus;
}

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
  heading?: number | null;
  isSimulated: boolean;
}

export interface NearbyGooglePlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  primaryType: string;
  googleMapsUrl: string;
  websiteUrl?: string;
  openNow?: boolean;
  distanceMeters: number;
  source: 'google';
  verificationStatus: 'unverified';
}

export interface AudioGuideSettings {
  autoTriggerEnabled: boolean;
  triggerRadiusMeters: number; // default 25m
  speechRate: number; // 0.8 to 1.5
  volume: number; // 0 to 1
  isPlaying: boolean;
  currentSiteId: string | null;
  playbackSource: 'recorded' | 'device';
  playbackError: boolean;
  playbackProgress: number; // 0 to 100 percentage
  currentTime: number; // seconds
}

export interface VisitorPreferences {
  locationEnabled: boolean;
  arrivalPlaybackMode: 'auto' | 'manual';
  arrivalAlertsEnabled: boolean;
  arrivalToneEnabled: boolean;
  arrivalVibrationEnabled: boolean;
  arrivalPulseEnabled: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'herzl' | 'benjamin';
  text: string;
  timestamp: string;
  suggestedTopics?: string[];
  sources?: { title: string; url: string }[];
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: 'proximity' | 'heritage_fact' | 'system';
  siteId?: string;
}

export interface SyncState {
  isOnline: boolean;
  lastSyncedAt: string | null;
  pendingSyncCount: number;
  syncing: boolean;
  savedSiteIds: string[];
  userNotes: Record<string, string>;
}
