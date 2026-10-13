import { readFile } from 'node:fs/promises';
import { HERZL_EVAL_CASES } from '../evals/herzl/cases.js';
import { gradeHerzlResponse, validateHerzlEvalDataset } from './herzl-eval-lib.js';

const datasetErrors = validateHerzlEvalDataset();
if (datasetErrors.length) {
  console.error(datasetErrors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Ask Herzl eval dataset valid: ${HERZL_EVAL_CASES.length} cases, 6 languages, 5 behavior categories.`);
}
const responseIndex = process.argv.indexOf('--responses');
if (responseIndex >= 0) {
  const responsePath = process.argv[responseIndex + 1];
  if (!responsePath) throw new Error('Provide a JSON response file after --responses.');
  const responses = JSON.parse(await readFile(responsePath, 'utf8')) as Record<string,string>;
  let passed = 0;
  for (const item of HERZL_EVAL_CASES) {
    const failures = gradeHerzlResponse(item, responses[item.id] || '');
    if (failures.length) console.error(`FAIL ${item.id}: ${failures.join('; ')}`);
    else { passed += 1; console.log(`PASS ${item.id}`); }
  }
  console.log(`Ask Herzl response score: ${passed}/${HERZL_EVAL_CASES.length}`);
  if (passed !== HERZL_EVAL_CASES.length) process.exitCode = 1;
} else {
  console.log('Validation-only mode: no provider called and no billable API usage.');
  console.log('Later: npm run eval:herzl -- --responses <reviewed-response-file.json>');
}
