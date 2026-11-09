// Generate login codes for the fixed judge roster and the admin.
//   node server/generate-codes.mjs            # 7 judges (default)
//   JUDGES=7 node server/generate-codes.mjs --force   # replace existing codes
//
// Writes DATA_DIR/judges.json (salted hashes only) and DATA_DIR/CODES-PRIVATE.txt
// (plain codes to hand out). DATA_DIR is git-ignored: never commit either file.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const COUNT = Number(process.env.JUDGES || 7);
const force = process.argv.includes('--force');
const target = path.join(DATA_DIR, 'judges.json');

if (fs.existsSync(target) && !force) {
  console.error(`${target} already exists. Use --force to replace every code (old codes stop working).`);
  process.exit(1);
}
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L
const randomCode = n => Array.from(crypto.randomBytes(n), b => ALPHABET[b % ALPHABET.length]).join('');
const hash = (code, salt) => crypto.scryptSync(code.toUpperCase(), salt, 32).toString('hex');
const entry = code => { const salt = crypto.randomBytes(16).toString('hex'); return { salt, hash: hash(code, salt) }; };

const judges = [], lines = [];
const used = new Set();
for (let i = 1; i <= COUNT; i++) {
  let code; do { code = `PI-${randomCode(6)}`; } while (used.has(code)); used.add(code);
  judges.push({ id: `J${i}`, name: `กรรมการ ${i}`, ...entry(code) });
  lines.push(`กรรมการ ${i}\tJ${i}\t${code}`);
}
const adminCode = `ADM-${randomCode(4)}-${randomCode(4)}`;

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.writeFileSync(target, JSON.stringify({ createdAt: new Date().toISOString(), judges, admin: entry(adminCode) }, null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'CODES-PRIVATE.txt'),
  `PI Champion Season 2 — login codes (created ${new Date().toISOString()})\n` +
  `เก็บไฟล์นี้เป็นความลับ ห้าม commit ขึ้น Git\n\n` +
  `ชื่อ\tID\tรหัส\n${lines.join('\n')}\n\nAdmin\t-\t${adminCode}\n\n` +
  `เปลี่ยนชื่อกรรมการได้ที่ judges.json (ช่อง "name") แล้ว restart server\n`);
console.log(`Created ${COUNT} judge codes + 1 admin code in ${DATA_DIR}`);
console.log(`Plain codes: ${path.join(DATA_DIR, 'CODES-PRIVATE.txt')}`);
