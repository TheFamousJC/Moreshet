export const ONBOARDING_VERSION = '1';

type OnboardingStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function getOnboardingStorageKey(userId?: string | null) {
  const audience = userId?.trim() ? `user:${userId.trim()}` : 'guest';
  return `moreshet_onboarding_v${ONBOARDING_VERSION}:${audience}`;
}

export function hasCompletedOnboarding(storage: OnboardingStorage, userId?: string | null) {
  try {
    return storage.getItem(getOnboardingStorageKey(userId)) === 'complete';
  } catch {
    return false;
  }
}

export function markOnboardingComplete(storage: OnboardingStorage, userId?: string | null) {
  try {
    storage.setItem(getOnboardingStorageKey(userId), 'complete');
  } catch {
    // The tour can still be dismissed when private browsing blocks persistence.
  }
}
