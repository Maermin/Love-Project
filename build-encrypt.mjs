#!/usr/bin/env node
/* =============================================================================
 * build-encrypt.mjs — Inhalt verschlüsseln (Node-Variante von encrypt.html)
 * -----------------------------------------------------------------------------
 * Erzeugt aus einer Klartext-HTML-Datei + Passphrase die base64-Blöcke
 * (salt / iv / ciphertext) für index.html. Nutzt dieselbe Web-Crypto-Routine
 * wie der Browser -> die Blöcke sind 1:1 austauschbar.
 *
 *   PBKDF2(SHA-256, >=250.000 Iterationen) -> AES-GCM 256 bit
 *   Salt 16 byte zufällig, IV 12 byte zufällig.
 *
 * Aufruf:
 *   PASSPHRASE='deine lange passphrase' node build-encrypt.mjs default-content.html
 *
 * Optionen (per Env):
 *   PASSPHRASE   (Pflicht)  die Passphrase
 *   ITERATIONS   (optional) Standard 250000
 *   OUT          (optional) schreibt den ENC-Block als JSON in diese Datei
 * ========================================================================== */
import { readFile, writeFile } from 'node:fs/promises';

const subtle = globalThis.crypto.subtle;
const ITER = Number(process.env.ITERATIONS || 250000);

function b64(bytes) { return Buffer.from(bytes).toString('base64'); }

async function deriveKey(password, salt, iterations) {
  const base = await subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function main() {
  const file = process.argv[2];
  const pass = process.env.PASSPHRASE;
  if (!file) { console.error('Nutzung: PASSPHRASE=... node build-encrypt.mjs <datei.html> [> ausgabe]'); process.exit(1); }
  if (!pass) { console.error('Fehler: Umgebungsvariable PASSPHRASE fehlt.'); process.exit(1); }
  if (ITER < 250000) { console.error('Fehler: ITERATIONS muss >= 250000 sein.'); process.exit(1); }

  const plaintext = await readFile(file, 'utf8');
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pass, salt, ITER);
  const ct = await subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));

  const ENC = { v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) };
  const json = JSON.stringify(ENC, null, 2);

  if (process.env.OUT) {
    await writeFile(process.env.OUT, json);
    console.error(`ENC-Block geschrieben nach ${process.env.OUT}`);
  } else {
    // Auf stdout der reine JSON-Block (gut zum Weiterverarbeiten / Einsetzen).
    process.stdout.write(json + '\n');
  }
  console.error(`OK: ${plaintext.length} Zeichen verschlüsselt, ${ITER.toLocaleString('de-DE')} Iterationen.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
