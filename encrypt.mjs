import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { pbkdf2Sync, randomBytes, createCipheriv } from 'crypto';
import { dirname } from 'path';

const [,, htmlPath, outPath, passphrase] = process.argv;
const ITER = 310000;

const html = readFileSync(htmlPath, 'utf8');
// Everything between <main> and </main> is what the gate protects.
const m = html.match(/<main[^>]*>([\s\S]*)<\/main>/);
if (!m) { console.error('no <main> found'); process.exit(1); }
const plaintext = m[1];

const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(passphrase, salt, ITER, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
// Web Crypto expects the GCM tag appended to the ciphertext.
const payload = Buffer.concat([enc, cipher.getAuthTag()]);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({
  v: 1, kdf: 'PBKDF2-SHA256', iterations: ITER, cipher: 'AES-256-GCM',
  salt: salt.toString('base64'),
  iv: iv.toString('base64'),
  data: payload.toString('base64'),
}));
console.log(`  encrypted ${(plaintext.length/1024).toFixed(0)} KB → ${(payload.length/1024).toFixed(0)} KB ciphertext`);
