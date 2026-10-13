import assert from 'node:assert/strict';
import { SETTINGS_COPY } from '../src/data/settingsTranslations.js';
import { PUBLIC_INFORMATION_COPY } from '../src/data/publicInformationTranslations.js';
import { LanguageCode } from '../src/data/translations.js';
import { readFile } from 'node:fs/promises';

const languages: LanguageCode[] = ['en', 'he', 'ru', 'fr', 'de', 'es'];

for (const language of languages) {
  const copy = SETTINGS_COPY[language];
  assert.ok(copy.title);
  assert.ok(copy.productInformation);
  assert.ok(copy.version);
  assert.ok(copy.build);
  assert.ok(copy.publishedBy.includes('Tudela Global'));
  assert.ok(copy.informationAndSupport && copy.privacy && copy.terms && copy.aiDisclosure && copy.support);
  assert.ok(copy.faqItems.length >= 6);
  for (const item of copy.faqItems) {
    assert.ok(item.question.length >= 10, `${language} has an incomplete FAQ question.`);
    assert.ok(item.answer.length >= 40, `${language} has an incomplete FAQ answer.`);
  }
  const publicCopy = PUBLIC_INFORMATION_COPY[language];
  assert.ok(publicCopy.reviewNotice.length >= 60, `${language} is missing the legal-review qualification.`);
  for (const page of ['privacy', 'terms', 'ai', 'support'] as const) {
    const item = publicCopy.pages[page];
    assert.ok(item.title.length >= 5 && item.introduction.length >= 40, `${language}/${page} public information is incomplete.`);
    assert.ok(item.sections.length >= 2, `${language}/${page} needs substantive sections.`);
    item.sections.forEach((section) => {
      assert.ok(section.title && section.paragraphs.every((paragraph) => paragraph.length >= 35), `${language}/${page} contains incomplete copy.`);
    });
  }
}

const settingsSource = await readFile(new URL('../src/components/SettingsPanel.tsx', import.meta.url), 'utf8');
const publicPageSource = await readFile(new URL('../src/components/PublicInformationPage.tsx', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
for (const route of ['/privacy', '/terms', '/ai-disclosure', '/support']) {
  assert.match(settingsSource, new RegExp(`href: ['\"]${route}`), `Settings is missing ${route}.`);
  assert.match(publicPageSource, new RegExp(`['\"]${route}['\"]`), `Public route map is missing ${route}.`);
}
assert.match(appSource, /publicInformationPageForPath/, 'The application does not render stable public information routes.');
assert.match(publicPageSource, /jeremy@3sci\.com/, 'The pilot support contact is missing.');
assert.match(publicPageSource, /platform\.openai\.com/, 'The AI disclosure must link to official API data controls.');

console.log('Settings copy checks passed for all six languages.');
