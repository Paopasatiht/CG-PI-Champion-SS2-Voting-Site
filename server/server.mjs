// PI Champion Season 2 — live scoring server.
// Zero dependencies (Node >= 18). Serves the Judge page (/), the Admin page (/admin)
// and a small JSON API. Data lives in DATA_DIR as JSON files (atomic writes).
//
//   node server/server.mjs            # PORT=8080, DATA_DIR=./data
//   node server/generate-codes.mjs    # create judge/admin codes first
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const SESSION_HOURS = Number(process.env.SESSION_HOURS || 24);

// ---------- shared event configuration (same file the browser uses) ----------
export function loadConfig() {
  const ctx = {}; ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'assets/js/event-config.js'), 'utf8'), ctx);
  return ctx.PI_CONFIG;
}
const CONFIG = loadConfig();
const FINAL_IDS = CONFIG.FINAL.map(c => c.id);
const DEMO_IDS = CONFIG.DEMO.map(c => c.id);

// ---------- storage ----------
const file = name => path.join(DATA_DIR, name);
function readJson(name, fallback) {
  try { return JSON.parse(fs.readFileSync(file(name), 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return fallback; throw e; }
}
function writeJson(name, value) {
  const tmp = file(`${name}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file(name));
}
function audit(entry) {
  fs.appendFileSync(file('audit.log'), JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n');
}

fs.mkdirSync(DATA_DIR, { recursive: true });
const credentials = readJson('judges.json', null);
if (!credentials || !Array.isArray(credentials.judges) || !credentials.admin) {
  console.error(`No codes found in ${file('judges.json')}. Run: node server/generate-codes.mjs`);
  process.exit(1);
}
const JUDGES = credentials.judges.map(j => ({ id: j.id, name: j.name }));

let event = readJson('event.json', null);
if (!event) {
  event = {
    rev: 1,
    teams: CONFIG.TEAM_NAMES.map((name, i) => ({ id: i + 1, name })),
    demoScores: {},
    demoWeight: CONFIG.DEFAULT_DEMO_WEIGHT,
    locked: [],
    published: false,
    updatedAt: new Date().toISOString(),
  };
  writeJson('event.json', event);
}
let scores = readJson('scores.json', {});          // { judgeId: { teamId: {draft, confirmed, submittedAt} } }
let sessions = readJson('sessions.json', {});      // { token: {role, judgeId, exp} }

// ---------- helpers ----------
const hashCode = (code, salt) => crypto.scryptSync(String(code).trim().toUpperCase(), salt, 32).toString('hex');
const safeEqual = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const isScore = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 10 && Number.isInteger(v * 2);
const isComplete = s => !!s && FINAL_IDS.every(id => isScore(s[id]));

function cleanScores(input) {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  for (const id of FINAL_IDS) if (isScore(input[id])) out[id] = input[id];
  return out;
}
function confirmedCount(teamId) {
  return JUDGES.filter(j => isComplete(scores[j.id]?.[teamId]?.confirmed)).length;
}
function confirmedByTeam() {
  const out = {};
  for (const t of event.teams) {
    out[t.id] = {};
    for (const j of JUDGES) {
      const c = scores[j.id]?.[t.id]?.confirmed;
      if (isComplete(c)) out[t.id][j.id] = c;
    }
  }
  return out;
}
function draftStatus() {
  const out = {};
  for (const t of event.teams) {
    out[t.id] = {};
    for (const j of JUDGES) {
      const r = scores[j.id]?.[t.id];
      out[t.id][j.id] = !r ? 'none' : isComplete(r.confirmed) ? 'confirmed' : Object.keys(r.draft || {}).length ? 'draft' : 'none';
    }
  }
  return out;
}

// login throttling per IP: at most 10 wrong codes per minute
const failures = new Map();
const recentFailures = ip => (failures.get(ip) || []).filter(t => Date.now() - t < 60_000);
const throttled = ip => recentFailures(ip).length >= 10;
const noteFailure = ip => failures.set(ip, [...recentFailures(ip), Date.now()]);

function newSession(data) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions[token] = { ...data, exp: Date.now() + SESSION_HOURS * 3600_000 };
  for (const [k, v] of Object.entries(sessions)) if (v.exp < Date.now()) delete sessions[k];
  writeJson('sessions.json', sessions);
  return token;
}
function sessionFrom(req) {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '');
  const s = m && sessions[m[1]];
  if (!s || s.exp < Date.now()) return null;
  return { ...s, token: m[1] };
}

// ---------- HTTP ----------
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
};
function send(res, status, body, headers = {}) {
  const isJson = typeof body !== 'string' && !Buffer.isBuffer(body);
  res.writeHead(status, { ...SECURITY_HEADERS, ...(isJson ? { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } : {}), ...headers });
  res.end(isJson ? JSON.stringify(body) : body);
}
const fail = (res, status, message, extra = {}) => send(res, status, { error: message, ...extra });

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > 200_000) { reject(Object.assign(new Error('Body too large'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })); } });
    req.on('error', reject);
  });
}

const STATIC = {
  '/': 'index.html', '/index.html': 'index.html',
  '/admin': 'admin.html', '/admin.html': 'admin.html',
};
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };
function serveStatic(req, res, pathname) {
  let rel = STATIC[pathname];
  if (!rel && pathname.startsWith('/assets/')) rel = pathname.slice(1);
  if (pathname === '/robots.txt') rel = 'robots.txt';
  if (!rel) return fail(res, 404, 'Not found');
  const abs = path.resolve(ROOT, rel);
  if (!abs.startsWith(path.join(ROOT, 'assets')) && !Object.values(STATIC).includes(rel) && rel !== 'robots.txt') return fail(res, 404, 'Not found');
  fs.readFile(abs, (err, buf) => {
    if (err) return fail(res, 404, 'Not found');
    const etag = '"' + crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16) + '"';
    const headers = { 'Content-Type': TYPES[path.extname(abs)] || 'application/octet-stream', 'Cache-Control': 'no-cache', ETag: etag };
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ...SECURITY_HEADERS, ...headers }); return res.end(); }
    send(res, 200, buf, headers);
  });
}

function eventView() {
  return { rev: event.rev, teams: event.teams, demoScores: event.demoScores, demoWeight: event.demoWeight, locked: event.locked, published: event.published, updatedAt: event.updatedAt };
}

async function api(req, res, pathname) {
  const ip = req.socket.remoteAddress || '';
  if (pathname === '/api/health' && req.method === 'GET') return send(res, 200, { ok: true, mode: 'live', judges: JUDGES.length });

  if (pathname === '/api/login' && req.method === 'POST') {
    if (throttled(ip)) return fail(res, 429, 'ลองใส่รหัสบ่อยเกินไป กรุณารอ 1 นาที');
    const { role, code } = await readBody(req);
    if (typeof code !== 'string' || !code.trim()) return fail(res, 400, 'กรุณากรอกรหัส');
    if (role === 'admin') {
      if (!safeEqual(hashCode(code, credentials.admin.salt), credentials.admin.hash)) { noteFailure(ip); audit({ type: 'login_failed', role, ip }); return fail(res, 401, 'รหัส Admin ไม่ถูกต้อง'); }
      audit({ type: 'login', role, ip });
      return send(res, 200, { token: newSession({ role: 'admin' }), role: 'admin' });
    }
    if (role === 'judge') {
      const j = credentials.judges.find(x => safeEqual(hashCode(code, x.salt), x.hash));
      if (!j) { noteFailure(ip); audit({ type: 'login_failed', role, ip }); return fail(res, 401, 'รหัสกรรมการไม่ถูกต้อง'); }
      audit({ type: 'login', role, judgeId: j.id, ip });
      return send(res, 200, { token: newSession({ role: 'judge', judgeId: j.id }), role: 'judge', judge: { id: j.id, name: j.name } });
    }
    return fail(res, 400, 'role ไม่ถูกต้อง');
  }

  const s = sessionFrom(req);
  if (pathname === '/api/logout' && req.method === 'POST') {
    if (s) { delete sessions[s.token]; writeJson('sessions.json', sessions); }
    return send(res, 200, { ok: true });
  }
  if (!s) return fail(res, 401, 'กรุณาเข้าสู่ระบบใหม่');

  // ----- judge -----
  if (pathname.startsWith('/api/judge/')) {
    if (s.role !== 'judge') return fail(res, 403, 'Forbidden');
    const judge = JUDGES.find(j => j.id === s.judgeId);
    if (!judge) return fail(res, 401, 'กรุณาเข้าสู่ระบบใหม่');
    if (pathname === '/api/judge/state' && req.method === 'GET') {
      return send(res, 200, { judge, event: { teams: event.teams, locked: event.locked, published: event.published }, scores: scores[judge.id] || {} });
    }
    if (pathname === '/api/judge/scores' && req.method === 'PUT') {
      const { teamId, draft, submit } = await readBody(req);
      const team = event.teams.find(t => t.id === Number(teamId));
      if (!team) return fail(res, 404, 'ไม่พบทีม');
      if (event.published || event.locked.includes(team.id)) return fail(res, 409, 'ทีมนี้ถูกล็อกแล้ว ไม่สามารถแก้ไขคะแนนได้', { scores: scores[judge.id] || {} });
      const clean = cleanScores(draft);
      const mine = scores[judge.id] ||= {};
      const prev = mine[team.id] || { draft: {}, confirmed: null };
      if (submit) {
        if (!isComplete(clean)) return fail(res, 400, 'กรุณากรอกคะแนนทุกเกณฑ์ก่อนยืนยัน');
        mine[team.id] = { draft: clean, confirmed: clean, submittedAt: new Date().toISOString() };
        audit({ type: prev.confirmed ? 'score_changed' : 'score_submitted', judgeId: judge.id, teamId: team.id, scores: clean });
      } else {
        mine[team.id] = { ...prev, draft: clean, draftAt: new Date().toISOString() };
      }
      writeJson('scores.json', scores);
      return send(res, 200, { scores: mine });
    }
    return fail(res, 404, 'Not found');
  }

  // ----- admin -----
  if (pathname.startsWith('/api/admin/')) {
    if (s.role !== 'admin') return fail(res, 403, 'Forbidden');
    if (pathname === '/api/admin/state' && req.method === 'GET') {
      return send(res, 200, { event: eventView(), judges: JUDGES, confirmed: confirmedByTeam(), status: draftStatus() });
    }
    if (pathname === '/api/admin/event' && req.method === 'PUT') {
      const body = await readBody(req);
      if (Number(body.rev) !== event.rev) return fail(res, 409, 'มีการแก้ไขจากที่อื่น โหลดข้อมูลล่าสุดแล้ว', { event: eventView() });
      // teams: names required, ids unique, existing teams cannot disappear once scored
      const teams = Array.isArray(body.teams) ? body.teams.map(t => ({ id: Number(t.id), name: String(t.name || '').trim().slice(0, 120) })) : event.teams;
      if (teams.some(t => !Number.isInteger(t.id) || t.id < 1 || !t.name) || new Set(teams.map(t => t.id)).size !== teams.length) return fail(res, 400, 'ข้อมูลทีมไม่ถูกต้อง');
      const removed = event.teams.filter(t => !teams.some(x => x.id === t.id));
      if (removed.length) return fail(res, 400, 'ลบทีมไม่ได้ในระบบจริง');
      if (event.published && JSON.stringify(teams) !== JSON.stringify(event.teams)) return fail(res, 409, 'ประกาศผลแล้ว แก้ไขทีมไม่ได้');
      // demo scores 0–10
      const demoScores = {};
      for (const t of teams) {
        const src = body.demoScores?.[t.id] || {};
        demoScores[t.id] = {};
        for (const id of DEMO_IDS) {
          const v = Number(src[id]);
          if (src[id] !== undefined && src[id] !== null && src[id] !== '') {
            if (!Number.isFinite(v) || v < 0 || v > 10) return fail(res, 400, `คะแนน Demo ${id} ของทีม ${t.id} ต้องอยู่ 0–10`);
            demoScores[t.id][id] = v;
          }
        }
      }
      const demoWeight = Number(body.demoWeight);
      if (!Number.isFinite(demoWeight) || demoWeight < 0 || demoWeight > 100) return fail(res, 400, 'น้ำหนัก Demo ไม่ถูกต้อง');
      // locks: only teams every judge confirmed; no unlock after publish
      const locked = [...new Set((body.locked || []).map(Number))].filter(id => teams.some(t => t.id === id));
      for (const id of locked) if (!event.locked.includes(id) && confirmedCount(id) !== JUDGES.length) return fail(res, 409, `ทีม ${id} ยังมีกรรมการส่งคะแนนไม่ครบ ${confirmedCount(id)}/${JUDGES.length}`);
      if (event.published && event.locked.some(id => !locked.includes(id))) return fail(res, 409, 'ประกาศผลแล้ว จึงไม่สามารถ Unlock ได้');
      const published = !!body.published;
      if (published && !teams.every(t => locked.includes(t.id))) return fail(res, 409, 'ต้อง Lock ทุกทีมก่อน Publish');
      if (event.published && !published) return fail(res, 409, 'ประกาศผลแล้ว ยกเลิกไม่ได้');
      const before = eventView();
      event = { rev: event.rev + 1, teams, demoScores, demoWeight, locked, published, updatedAt: new Date().toISOString() };
      writeJson('event.json', event);
      const changes = Object.keys(before).filter(k => !['rev', 'updatedAt'].includes(k) && JSON.stringify(before[k]) !== JSON.stringify(event[k]));
      audit({ type: 'event_updated', changes, locked: event.locked, published: event.published });
      return send(res, 200, { event: eventView(), judges: JUDGES, confirmed: confirmedByTeam(), status: draftStatus() });
    }
    // Test helper: wipe every judge score, unlock all teams and cancel publish.
    // Teams, order, Demo scores and weights stay. A copy is kept in DATA_DIR/backups first.
    if (pathname === '/api/admin/reset-scores' && req.method === 'POST') {
      const body = await readBody(req);
      if (String(body.confirm || '').trim().toUpperCase() !== 'RESET') return fail(res, 400, 'พิมพ์ RESET เพื่อยืนยัน');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dir = path.join(DATA_DIR, 'backups', `reset-${stamp}`);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'scores.json'), JSON.stringify(scores, null, 2));
      fs.writeFileSync(path.join(dir, 'event.json'), JSON.stringify(event, null, 2));
      const cleared = Object.values(scores).reduce((n, m) => n + Object.keys(m || {}).length, 0);
      scores = {};
      writeJson('scores.json', scores);
      event = { ...event, rev: event.rev + 1, locked: [], published: false, updatedAt: new Date().toISOString() };
      writeJson('event.json', event);
      audit({ type: 'scores_reset', cleared, backup: path.relative(DATA_DIR, dir) });
      return send(res, 200, { event: eventView(), judges: JUDGES, confirmed: confirmedByTeam(), status: draftStatus(), backup: path.relative(DATA_DIR, dir), cleared });
    }
    return fail(res, 404, 'Not found');
  }
  return fail(res, 404, 'Not found');
}

export const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://local');
  try {
    if (pathname.startsWith('/api/')) return await api(req, res, pathname);
    if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'Method not allowed');
    return serveStatic(req, res, pathname);
  } catch (e) {
    if (!e.status) console.error(e);
    return fail(res, e.status || 500, e.status ? e.message : 'Server error');
  }
});

server.listen(PORT, HOST, () => {
  const nets = Object.values(os.networkInterfaces()).flat().filter(n => n && n.family === 'IPv4' && !n.internal).map(n => n.address);
  console.log(`PI Champion S2 live server — ${JUDGES.length} judges, data in ${DATA_DIR}`);
  if (process.env.PUBLIC_URL) console.log(`  Judges : ${process.env.PUBLIC_URL.replace(/\/$/, '')}/   (Admin: ${process.env.PUBLIC_URL.replace(/\/$/, '')}/admin)`);
  else if (fs.existsSync('/.dockerenv')) console.log(`  Judges : http://<IP of this host>:<published port>/   (set PUBLIC_URL to print the exact link)`);
  else console.log(`  Judges : http://localhost:${PORT}/` + nets.map(a => `   http://${a}:${PORT}/`).join(''));
  console.log(`  Admin  : http://localhost:${PORT}/admin`);
});

// Graceful shutdown (docker stop / Ctrl+C): finish in-flight requests, then exit.
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    console.log(`${sig} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
