import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const index=read('index.html'), app=read('assets/js/app.js');
for(const relative of ['assets/css/base.css','assets/css/design-v2.css','assets/css/design-v4.css','assets/js/ribbon3d.js','assets/js/app.js']) {
  assert.ok(fs.existsSync(path.join(root,relative)), `Missing ${relative}`);
  assert.ok(index.includes(relative), `HTML does not link ${relative}`);
}
assert.ok(app.includes('JUDGE01') && app.includes('ADMINDEMO'));
assert.ok(app.includes('score-half') && app.includes('score-base'));
assert.ok(index.includes('<div id="app"'));
console.log('Static smoke test passed');
