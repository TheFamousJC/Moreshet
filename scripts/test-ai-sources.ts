import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20260810180000_ai_sources_and_usage.sql', import.meta.url), 'utf8');
const budgetMigration = await readFile(new URL('../supabase/migrations/20260819130000_persistent_ai_daily_budget.sql', import.meta.url), 'utf8');
const cms = await readFile(new URL('../src/components/CmsAiSources.tsx', import.meta.url), 'utf8');
const server = await readFile(new URL('../server.ts', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const chat = await readFile(new URL('../src/components/AskHerzlChat.tsx', import.meta.url), 'utf8');

assert.match(migration, /create table public\.ai_sources/);
assert.match(migration, /status in \('draft','pending_review','changes_requested','published','disabled'\)/);
assert.match(migration, /Only Reviewers, Administrators or the Super Admin may review AI sources/);
assert.match(migration, /private\.is_public_organization\(organization_id\)/);
assert.match(migration, /ai_usage_events_append_only/);
assert.match(migration, /prompts and answers are not stored/);
assert.match(budgetMigration, /pg_advisory_xact_lock/);
assert.match(budgetMigration, /count\(distinct event\.request_id\)/);
assert.match(budgetMigration, /grant execute on function public\.reserve_ai_daily_request.*service_role/);
assert.doesNotMatch(budgetMigration, /grant execute on function public\.reserve_ai_daily_request.*authenticated/);
for (const expectedUrl of [
  'https://www.totallyjewishtravel.com/',
  'https://www.jewishgen.org/',
  'https://anumuseum.org.il/',
  'https://mjhnyc.org/',
  'https://www.jewish-heritage-lithuania.org/',
  'https://schumstaedte.de/en/',
  'https://swissjews.ch/en/topics/culturalheritage/',
  'https://jewisheritage.org/european-routes/',
  'https://jewish-heritage-europe.eu/europe-map/',
]) assert.ok(migration.includes(expectedUrl), `Starter source is missing: ${expectedUrl}`);
assert.match(migration, /Reviewed and approved by the Moreshet owner on 11 August 2026/);
assert.match(migration, /null, 'organization', 'published'/, 'Owner-approved starter sources must be published reference links.');
assert.match(cms, /Approved evidence text/);
assert.match(cms, /Revised draft/);
assert.match(cms, /Request changes/);
assert.match(server, /Sign in to use Ask Benjamin/);
assert.match(server, /reserveHerzlDailyRequest/);
assert.match(server, /usage controls are temporarily unavailable/);
assert.match(server, /citedHerzlSources/);
assert.match(server, /selected tour is not available as published CMS content/);
assert.match(server, /answer general questions about Jewish history, heritage, culture, people, places and travel/);
assert.doesNotMatch(server, /Select a published city and tour before using live Ask Herzl/);
assert.match(server, /selected city and tour do not match/);
assert.match(server, /selected published tour has no published stops/);
assert.match(server, /You are Ask Benjamin, a fictional, warm and scholarly AI guide/);
assert.match(server, /findHerzlPersonaSafetyIssues/);
assert.doesNotMatch(server, /const systemInstruction = `You are Theodor Herzl/);
assert.match(app, /Authorization: `Bearer \$\{account\.session\.access_token\}`/);
assert.match(app, /if \(!response\.ok\) throw new Error\(data\.error/);
assert.match(app, /setHerzlResponseMode\(data\.mode\)/);
assert.match(app, /contentSource: publicContent\.source/);
assert.match(app, /!cities\.some\(\(city\) => city\.id === selectedCityId\)/);
assert.match(chat, /responseMode === 'live'/);
assert.match(chat, /Sign in or register to use Ask Benjamin/);
assert.match(chat, /No tour is selected\. Ask Benjamin can answer general Jewish heritage questions/);
assert.match(chat, /disabled=\{isSending \|\| !signedIn\}/);
assert.doesNotMatch(chat, /disabled=\{isSending \|\| !tourReady\}/);
assert.doesNotMatch(chat, /searching & synthesizing records from global archives/i);
assert.doesNotMatch(chat, /\{simulatorLabel\}/);

console.log('Stage 5 reviewed AI source and usage-control checks passed.');
