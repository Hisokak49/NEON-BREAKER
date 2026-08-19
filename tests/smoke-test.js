const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const requiredElements = [
  'gameCanvas',
  'btnPlay',
  'btnMenuOptions',
  'btnResume',
  'btnPauseOptions',
  'btnQuit',
  'btnRetry',
  'btnGoMenu',
  'btnNext',
  'btnVicMenu',
];

for (const id of requiredElements) {
  assert.match(index, new RegExp(`id=["']${id}["']`), `Missing required element: ${id}`);
}

for (const script of ['script.js', 'ui-fixes.js', 'touch-controls.js']) {
  assert.match(index, new RegExp(`src=["']${script.replace('.', '\\.') }["']`), `Missing script: ${script}`);
}

console.log(`Smoke test passed: ${requiredElements.length} required UI elements and game scripts are present.`);
