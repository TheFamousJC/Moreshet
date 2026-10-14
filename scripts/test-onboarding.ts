import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ONBOARDING_COPY } from '../src/data/onboardingTranslations';
import { getOnboardingStorageKey, hasCompletedOnboarding, markOnboardingComplete } from '../src/lib/onboarding';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const languages = ['en', 'he', 'ru', 'fr', 'de', 'es'] as const;
for (const language of languages) {
  const copy = ONBOARDING_COPY[language];
  assert.equal(copy.steps.length, 3, `${language} must provide three introduction steps.`);
  assert.ok(copy.skip && copy.back && copy.next && copy.start, `${language} navigation copy is incomplete.`);
  assert.ok(copy.replayTitle && copy.replayDescription, `${language} replay copy is incomplete.`);
  copy.steps.forEach((step, index) => {
    assert.ok(step.title && step.body, `${language} step ${index + 1} is incomplete.`);
    assert.equal(step.points.length, 2, `${language} step ${index + 1} must contain two concise points.`);
  });
}

const storage = new MemoryStorage();
assert.equal(hasCompletedOnboarding(storage, null), false);
markOnboardingComplete(storage, null);
assert.equal(hasCompletedOnboarding(storage, null), true);
assert.equal(hasCompletedOnboarding(storage, 'user-1'), false, 'Account completion must be independent from guest completion.');
markOnboardingComplete(storage, 'user-1');
assert.equal(hasCompletedOnboarding(storage, 'user-1'), true);
assert.notEqual(getOnboardingStorageKey('user-1'), getOnboardingStorageKey('user-2'));

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const settingsSource = await readFile(new URL('../src/components/SettingsPanel.tsx', import.meta.url), 'utf8');
const setupSource = await readFile(new URL('../src/components/FirstSignInSetupWizard.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(appSource, /hasCompletedOnboarding/, 'First-login onboarding must remain paused.');
assert.match(appSource, /useState\(false\)/, 'Onboarding must be closed by default.');
assert.match(appSource, /onReplayOnboarding/, 'Settings must be able to replay onboarding.');
assert.match(settingsSource, /replayTitle/, 'Settings replay control is missing localized copy.');
assert.match(settingsSource, /onOpenSetupWizard/, 'Settings must let a visitor review the preferences wizard later.');
assert.match(appSource, /moreshet_setup_completed_\$\{account\.user\.id\}/, 'First-sign-in setup completion must be stored separately for each account.');
assert.match(appSource, /supabase\.auth\.updateUser/, 'First-sign-in setup completion must follow the account across devices.');
assert.match(appSource, /FirstSignInSetupWizard/, 'Signed-in visitors must receive the preferences setup wizard.');
assert.match(setupSource, /arrivalPlaybackMode/, 'The setup wizard must explain automatic and manual narration.');
assert.match(setupSource, /arrivalToneEnabled[\s\S]*arrivalVibrationEnabled[\s\S]*arrivalPulseEnabled/, 'The setup wizard must offer independent arrival alerts.');
assert.match(setupSource, /Record<LanguageCode, Copy>/, 'The setup wizard must cover all visitor languages.');

console.log('Optional introduction and mandatory first-sign-in preferences setup tests passed.');
