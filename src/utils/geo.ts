/**
 * Geo utilities for distance calculation and speech synthesis audio guides.
 */

// Haversine formula to calculate distance between two coordinates in meters
export function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    typeof lat1 !== 'number' || isNaN(lat1) ||
    typeof lon1 !== 'number' || isNaN(lon1) ||
    typeof lat2 !== 'number' || isNaN(lat2) ||
    typeof lon2 !== 'number' || isNaN(lon2)
  ) {
    return 0;
  }
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const clampedA = Math.max(0, Math.min(1, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

  const d = Math.round(R * c);
  return isNaN(d) ? 0 : d;
}

export function formatDistance(meters: number): string {
  if (typeof meters !== 'number' || isNaN(meters) || meters < 0) {
    return '0m';
  }
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

// Calculate compass bearing in degrees between two coordinates (0-360)
export function getBearingDegrees(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (
    typeof lat1 !== 'number' || isNaN(lat1) ||
    typeof lon1 !== 'number' || isNaN(lon1) ||
    typeof lat2 !== 'number' || isNaN(lat2) ||
    typeof lon2 !== 'number' || isNaN(lon2)
  ) {
    return 0;
  }
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  const bearing = ((θ * 180) / Math.PI + 360) % 360;
  return isNaN(bearing) ? 0 : bearing;
}

// Convert compass bearing into human-readable cardinal direction
export function getCompassDirection(bearing: number): string {
  if (typeof bearing !== 'number' || isNaN(bearing)) return 'North';
  const directions = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
  const index = Math.abs(Math.round(bearing / 45)) % 8;
  return directions[index] || 'North';
}

// Speech Synthesis & Audio Guide Manager with Web Audio Fallback
class SpeechSynthesisManager {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speechRate: number = 1.0;
  private isPaused: boolean = false;
  private fallbackTimer: number | null = null;
  private audioCtx: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  private playToneFallback() {
    try {
      if (typeof window === 'undefined') return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.015, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.3);
    } catch {
      // Ignore audio context autoplay restrictions
    }
  }

  private lastText: string = '';
  private lastCharIndex: number = 0;
  private lastOnBoundary?: (charIndex: number) => void;
  private lastOnEnd?: () => void;

  public speak(
    text: string,
    onBoundary?: (charIndex: number) => void,
    onEnd?: () => void,
    onError?: (err: any) => void,
    langCode: 'en' | 'he' | 'ru' = 'en'
  ) {
    this.speakFromOffset(text, 0, onBoundary, onEnd, onError, langCode);
  }

  public speakFromOffset(
    fullText: string,
    startCharIndex: number,
    onBoundary?: (charIndex: number) => void,
    onEnd?: () => void,
    onError?: (err: any) => void,
    langCode: 'en' | 'he' | 'ru' = 'en'
  ) {
    this.cancel();
    this.lastText = fullText;
    this.lastCharIndex = startCharIndex;
    this.lastOnBoundary = onBoundary;
    this.lastOnEnd = onEnd;

    const remainingText = fullText.substring(startCharIndex);
    if (!remainingText.trim()) {
      if (onEnd) onEnd();
      return;
    }

    if (!this.synth) {
      this.startFallbackSimulationFromOffset(fullText, startCharIndex, onBoundary, onEnd);
      return;
    }

    try {
      this.currentUtterance = new SpeechSynthesisUtterance(remainingText);
      this.currentUtterance.rate = this.speechRate;
      this.currentUtterance.pitch = 1.0;

      const langMap: Record<string, string> = {
        en: 'en-US',
        he: 'he-IL',
        ru: 'ru-RU',
      };
      const targetLang = langMap[langCode] || 'en-US';
      this.currentUtterance.lang = targetLang;

      const voices = this.synth.getVoices();
      if (voices.length > 0) {
        const langPrefix = langCode === 'he' ? ['he', 'iw'] : [langCode];
        const preferredVoice = voices.find((v) =>
          langPrefix.some((p) => v.lang.toLowerCase().startsWith(p))
        );
        if (preferredVoice) {
          this.currentUtterance.voice = preferredVoice;
        }
      }

      if (onBoundary) {
        this.currentUtterance.onboundary = (event) => {
          this.lastCharIndex = startCharIndex + event.charIndex;
          onBoundary(this.lastCharIndex);
        };
      }

      if (onEnd) {
        this.currentUtterance.onend = () => {
          this.isPaused = false;
          onEnd();
        };
      }

      this.currentUtterance.onerror = (e: any) => {
        const errorType = e?.error || e;
        if (errorType === 'interrupted' || errorType === 'canceled') return;
        this.startFallbackSimulationFromOffset(fullText, this.lastCharIndex, onBoundary, onEnd);
      };

      this.isPaused = false;
      this.synth.speak(this.currentUtterance);
      this.playToneFallback();
    } catch {
      this.startFallbackSimulationFromOffset(fullText, startCharIndex, onBoundary, onEnd);
    }
  }

  private startFallbackSimulationFromOffset(
    fullText: string,
    startCharIndex: number,
    onBoundary?: (charIndex: number) => void,
    onEnd?: () => void
  ) {
    this.stopFallback();
    this.playToneFallback();

    let currentChar = startCharIndex;
    const totalChars = fullText.length;
    const charsPerStep = Math.max(2, Math.round(15 * this.speechRate));
    const stepIntervalMs = 200;

    this.fallbackTimer = window.setInterval(() => {
      if (this.isPaused) return;

      currentChar += charsPerStep;
      this.lastCharIndex = currentChar;
      if (currentChar >= totalChars) {
        currentChar = totalChars;
        if (onBoundary) onBoundary(currentChar);
        this.stopFallback();
        if (onEnd) onEnd();
      } else {
        if (onBoundary) onBoundary(currentChar);
      }
    }, stepIntervalMs);
  }

  private stopFallback() {
    if (this.fallbackTimer !== null) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  public pause() {
    this.isPaused = true;
    this.stopFallback();
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // Ignore
      }
    }
  }

  public resume() {
    this.isPaused = false;
    if (this.lastText) {
      this.speakFromOffset(
        this.lastText,
        this.lastCharIndex,
        this.lastOnBoundary,
        this.lastOnEnd
      );
    }
  }

  public cancel() {
    this.isPaused = false;
    this.stopFallback();
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // Ignore cancel errors
      }
    }
  }

  public setRate(rate: number) {
    this.speechRate = rate;
  }

  public getSpeakingState(): { speaking: boolean; paused: boolean } {
    return {
      speaking: !!(this.synth && this.synth.speaking) || this.fallbackTimer !== null,
      paused: this.isPaused,
    };
  }
}

export const speechManager = new SpeechSynthesisManager();
