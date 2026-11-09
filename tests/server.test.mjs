// Integration tests for server/server.mjs — run with `npm test`.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-s2-test-'));
const port = 18000 + Math.floor(Math.random() * 2000);
const base = `http://127.0.0.1:${port}`;
let proc, codes;

const FINAL = ['pain_point', 'process_alignment', 'innovation', 'ai_rpa_tools', 'presentation_qa', 'benefits'];
const full = v => Object.fromEntries(FINAL.map(id => [id, v]));

async function call(method, url, body, token) {
  const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data };
}
const login = async (role, code) => (await call('POST', '/api/login', { role, code })).data.token;

before(async () => {
  execFileSync(process.execPath, [path.join(root, 'server/generate-codes.mjs')], { env: { ...process.env, DATA_DIR: dataDir, JUDGES: '7' } });
  const txt = fs.readFileSync(path.join(dataDir, 'CODES-PRIVATE.txt'), 'utf8');
  codes = { judges: [...txt.matchAll(/\tJ\d+\t(PI-[A-Z0-9]+)/g)].map(m => m[1]), admin: /Admin\t-\t(\S+)/.exec(txt)[1] };
  proc = spawn(process.execPath, [path.join(root, 'server/server.mjs')], { env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), HOST: '127.0.0.1' }, stdio: 'pipe' });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(base + '/api/health')).ok) return; } catch {} await new Promise(r => setTimeout(r, 100)); }
  throw new Error('server did not start');
});
after(() => { proc?.kill(); fs.rmSync(dataDir, { recursive: true, force: true }); });

test('7 judge codes + admin code are generated; hashes only on disk', () => {
  assert.equal(codes.judges.length, 7);
  const stored = fs.readFileSync(path.join(dataDir, 'judges.json'), 'utf8');
  for (const c of [...codes.judges, codes.admin]) assert.ok(!stored.includes(c), 'plain code must not be stored');
});

test('health, static pages and private files', async () => {
  assert.equal((await call('GET', '/api/health')).data.judges, 7);
  assert.equal((await fetch(base + '/')).status, 200);
  assert.equal((await fetch(base + '/admin')).status, 200);
  for (const p of ['/data/judges.json', '/data/CODES-PRIVATE.txt', '/server/server.mjs', '/package.json', '/assets/../data/judges.json']) {
    assert.equal((await fetch(base + p)).status, 404, p);
  }
});

test('login checks codes and roles', async () => {
  assert.equal((await call('POST', '/api/login', { role: 'judge', code: 'JUDGE01' })).status, 401);
  assert.equal((await call('POST', '/api/login', { role: 'admin', code: codes.judges[0] })).status, 401);
  const r = await call('POST', '/api/login', { role: 'judge', code: codes.judges[0].toLowerCase() });
  assert.equal(r.status, 200); assert.equal(r.data.judge.id, 'J1');
  assert.equal((await call('GET', '/api/admin/state', null, r.data.token)).status, 403, 'judge cannot read admin data');
  assert.equal((await call('GET', '/api/judge/state')).status, 401);
});

test('full flow: drafts, submit, lock gate, publish gate', async () => {
  const admin = await login('admin', codes.admin);
  const judges = [];
  for (const c of codes.judges) judges.push(await login('judge', c));

  // draft is saved but not confirmed
  let r = await call('PUT', '/api/judge/scores', { teamId: 1, draft: { pain_point: 8 } }, judges[0]);
  assert.equal(r.status, 200); assert.equal(r.data.scores[1].confirmed, null);
  // incomplete / invalid submit rejected
  assert.equal((await call('PUT', '/api/judge/scores', { teamId: 1, draft: { pain_point: 8 }, submit: true }, judges[0])).status, 400);
  assert.equal((await call('PUT', '/api/judge/scores', { teamId: 1, draft: full(7.3), submit: true }, judges[0])).status, 400);

  // a judge only sees their own scores
  await call('PUT', '/api/judge/scores', { teamId: 1, draft: full(9), submit: true }, judges[0]);
  const other = await call('GET', '/api/judge/state', null, judges[1]);
  assert.deepEqual(other.data.scores, {});

  let s = (await call('GET', '/api/admin/state', null, admin)).data;
  assert.equal(Object.keys(s.confirmed[1]).length, 1);
  // lock refused until all 7 judges confirmed team 1
  r = await call('PUT', '/api/admin/event', { ...s.event, locked: [1] }, admin);
  assert.equal(r.status, 409);

  for (let i = 1; i < 7; i++) await call('PUT', '/api/judge/scores', { teamId: 1, draft: full(8.5), submit: true }, judges[i]);
  s = (await call('GET', '/api/admin/state', null, admin)).data;
  assert.equal(Object.keys(s.confirmed[1]).length, 7);
  r = await call('PUT', '/api/admin/event', { ...s.event, locked: [1] }, admin);
  assert.equal(r.status, 200); assert.deepEqual(r.data.event.locked, [1]);

  // stale revision is refused
  assert.equal((await call('PUT', '/api/admin/event', { ...s.event, demoWeight: 30 }, admin)).status, 409);

  // locked team can no longer be edited by judges
  assert.equal((await call('PUT', '/api/judge/scores', { teamId: 1, draft: full(5), submit: true }, judges[0])).status, 409);

  // publish needs every team locked
  s = r.data;
  assert.equal((await call('PUT', '/api/admin/event', { ...s.event, published: true }, admin)).status, 409);

  for (const t of s.event.teams.filter(t => t.id !== 1)) for (const j of judges) await call('PUT', '/api/judge/scores', { teamId: t.id, draft: full(7), submit: true }, j);
  s = (await call('GET', '/api/admin/state', null, admin)).data;
  r = await call('PUT', '/api/admin/event', { ...s.event, locked: s.event.teams.map(t => t.id) }, admin);
  assert.equal(r.status, 200);
  r = await call('PUT', '/api/admin/event', { ...r.data.event, published: true }, admin);
  assert.equal(r.status, 200); assert.equal(r.data.event.published, true);
  // no unlock / unpublish after publish
  assert.equal((await call('PUT', '/api/admin/event', { ...r.data.event, locked: [] }, admin)).status, 409);
  assert.equal((await call('PUT', '/api/admin/event', { ...r.data.event, published: false }, admin)).status, 409);

  const log = fs.readFileSync(path.join(dataDir, 'audit.log'), 'utf8');
  assert.match(log, /score_submitted/); assert.match(log, /event_updated/);
});

test('admin reset-scores: needs RESET, backs up, clears scores, unlocks, unpublishes', async () => {
  const admin = await login('admin', codes.admin);
  const judge = await login('judge', codes.judges[0]);
  const before = (await call('GET', '/api/admin/state', null, admin)).data;
  assert.equal(before.event.published, true); // published by the previous test

  assert.equal((await call('POST', '/api/admin/reset-scores', {}, judge)).status, 403);
  assert.equal((await call('POST', '/api/admin/reset-scores', { confirm: 'nope' }, admin)).status, 400);

  const r = await call('POST', '/api/admin/reset-scores', { confirm: 'reset' }, admin);
  assert.equal(r.status, 200);
  assert.equal(r.data.event.published, false);
  assert.deepEqual(r.data.event.locked, []);
  assert.deepEqual(r.data.event.teams, before.event.teams);
  assert.deepEqual(r.data.event.demoScores, before.event.demoScores);
  assert.ok(r.data.cleared > 0);
  assert.deepEqual(Object.keys(r.data.confirmed[1] || {}), []);
  const backup = JSON.parse(fs.readFileSync(path.join(dataDir, r.data.backup, 'scores.json'), 'utf8'));
  assert.ok(Object.keys(backup).length > 0);

  assert.deepEqual((await call('GET', '/api/judge/state', null, judge)).data.scores, {});
  // judges can score again after the reset
  assert.equal((await call('PUT', '/api/judge/scores', { teamId: 1, draft: full(6), submit: true }, judge)).status, 200);
  assert.match(fs.readFileSync(path.join(dataDir, 'audit.log'), 'utf8'), /scores_reset/);
});

test('fresh data dir: login codes come from seed/ and work', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-s2-seed-'));
  const p2 = 20000 + Math.floor(Math.random() * 2000);
  const child = spawn(process.execPath, [path.join(root, 'server/server.mjs')], { env: { ...process.env, DATA_DIR: dir, PORT: String(p2), HOST: '127.0.0.1' }, stdio: 'pipe' });
  try {
    let ok = false;
    for (let i = 0; i < 50 && !ok; i++) { try { ok = (await fetch(`http://127.0.0.1:${p2}/api/health`)).ok; } catch {} if (!ok) await new Promise(r => setTimeout(r, 100)); }
    assert.ok(ok, 'server started');
    assert.equal(fs.readFileSync(path.join(dir, 'judges.json'), 'utf8'), fs.readFileSync(path.join(root, 'seed/judges.json'), 'utf8'));
    const txt = fs.readFileSync(path.join(dir, 'CODES-PRIVATE.txt'), 'utf8');
    const judge = /\tJ1\t(PI-[A-Z0-9]+)/.exec(txt)[1], admin = /Admin\t-\t(\S+)/.exec(txt)[1];
    for (const [role, code] of [['judge', judge], ['admin', admin]]) {
      const r = await fetch(`http://127.0.0.1:${p2}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, code }) });
      assert.equal(r.status, 200, `${role} seed code logs in`);
    }
    const ev = JSON.parse(fs.readFileSync(path.join(dir, 'event.json'), 'utf8'));
    assert.equal(ev.teams.length, 12);
    assert.equal(ev.teams[9].name, 'PANDA');
  } finally { child.kill(); fs.rmSync(dir, { recursive: true, force: true }); }
});
