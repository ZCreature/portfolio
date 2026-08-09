import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { pbkdf2Sync, randomBytes, createCipheriv } from 'crypto';
import { dirname } from 'path';

// Binary sibling of encrypt.mjs, for media too large to base64 into the
// page payload. Output layout: "CAG1" | salt(16) | iv(12) | ciphertext+tag.
// gate.js fetches this as an ArrayBuffer after the page unlocks.
const [,, inPath, outPath, passphrase] = process.argv;
const ITER = 310000;

const data = readFileSync(inPath);
const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(passphrase, salt, ITER, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const enc = Buffer.concat([cipher.update(data), cipher.final(), cipher.getAuthTag()]);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, Buffer.concat([Buffer.from('CAG1'), salt, iv, enc]));
console.log(`  encrypted ${(data.length / 1048576).toFixed(2)} MB -> ${outPath}`);
