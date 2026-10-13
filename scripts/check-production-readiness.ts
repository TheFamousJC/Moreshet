import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { productionConfigurationIssues } from '../server/production.js';

dotenv.config({ path: '.env.production' });
dotenv.config({ path: '.env.local' });
dotenv.config();

const requiredFiles = ['Dockerfile', 'public/manifest.webmanifest', 'public/sw.js', 'Docs/production-release-runbook.md'];
const issues = productionConfigurationIssues({ ...process.env, NODE_ENV: 'production' });
for (const file of requiredFiles) if (!existsSync(file)) issues.push(`Required deployment file is missing: ${file}`);

if (issues.length) {
  console.error('Production readiness check FAILED:');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}
console.log('Production readiness configuration PASS. Run database, acceptance, build and deployed device QA before release.');
