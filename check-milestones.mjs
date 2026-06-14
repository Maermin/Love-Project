#!/usr/bin/env node
/* =============================================================================
 * check-milestones.mjs — prüft, ob HEUTE (Europe/Berlin) ein Meilenstein ist.
 * -----------------------------------------------------------------------------
 * Läuft im GitHub-Action-Workflow. Liest die zentrale milestones.js, bestimmt
 * das heutige Datum in der Zeitzone Europe/Berlin und schreibt das Ergebnis
 * nach $GITHUB_OUTPUT:
 *
 *   hit=true|false          ob heute ein (oder mehrere) Meilenstein(e) ist
 *   subject=<Betreff>       Betreffzeile der Mail
 *   html<<DELIM …           HTML-Body der Mail (Multiline via Heredoc-Muster)
 *
 * Mit FORCE=true (manueller Start via workflow_dispatch) wird – falls heute
 * nichts ansteht – der NÄCHSTE kommende Meilenstein als Test verwendet, damit
 * man den Versand einmal ausprobieren kann.
 *
 * Bewusst OHNE Namen formuliert: Diese Datei und die Mail-Logik liegen im
 * (ggf. öffentlichen) Repository. Die persönlichen Inhalte stecken nur
 * verschlüsselt in index.html.
 * ========================================================================== */
import { appendFileSync } from 'node:fs';
import LM from '../../milestones.js';

const H = LM.helpers;
const FORCE = String(process.env.FORCE || '').toLowerCase() === 'true';
const SITE = process.env.SITE_URL || ''; // optional: Link zur Seite in der Mail

const today = H.todayISO();                 // YYYY-MM-DD in Europe/Berlin
const all = LM.getMilestones();
let todays = all.filter((m) => m.date === today);

let isTest = false;
if (todays.length === 0 && FORCE) {
  // Test-Modus: nächsten kommenden Meilenstein heraussuchen.
  const next = all.find((m) => m.date >= today) || all[all.length - 1];
  if (next) { todays = [next]; isTest = true; }
}

const hit = todays.length > 0;

/* ----------------------------- Ausgabe bauen ------------------------------ */
function escHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

let subject = '';
let html = '';

if (hit) {
  const titles = todays.flatMap((m) => m.titles);
  const emoji = todays[0].emoji || '💛';
  const headline = titles.join(' · ');
  subject = `${emoji} Heute: ${headline}`;
  if (isTest) subject = `[Test] ${subject}`;

  const items = titles.map((t) => `<li style="margin:6px 0;">${escHtml(t)}</li>`).join('\n');
  const link = SITE
    ? `<p style="margin:22px 0 0;"><a href="${escHtml(SITE)}" style="color:#e7b873;">Zur Seite öffnen →</a></p>`
    : '';
  const testNote = isTest
    ? `<p style="margin:0 0 14px;color:#b6a7b8;font-size:13px;">Testlauf – heute steht eigentlich kein Meilenstein an. Dies ist der nächste.</p>`
    : '';

  html = `<!DOCTYPE html>
<html lang="de">
<body style="margin:0;background:#17121d;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#f3e8da;">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
    <div style="font-size:40px;line-height:1;margin-bottom:10px;">${emoji}</div>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;margin:0 0 4px;color:#e7b873;">Heute ist ein besonderer Tag</h1>
    ${testNote}
    <p style="margin:0 0 10px;color:#e2899a;font-size:15px;">${escHtml(today)}</p>
    <ul style="list-style:none;padding:0;margin:14px 0 0;font-size:18px;">
${items}
    </ul>
    ${link}
    <p style="margin:28px 0 0;color:#b6a7b8;font-size:12px;">Automatischer Gruß vom Liebes-Counter 💌</p>
  </div>
</body>
</html>`;
} else {
  subject = '';
  html = '';
}

/* ------------------------ nach GITHUB_OUTPUT schreiben -------------------- */
const outFile = process.env.GITHUB_OUTPUT;
const lines = [];
lines.push(`hit=${hit ? 'true' : 'false'}`);
lines.push(`subject=${subject.replace(/\r?\n/g, ' ')}`);
// Multiline-Wert via zufälligem Heredoc-Delimiter (GitHub-Actions-Muster).
const DELIM = 'EOF_HTML_' + Math.random().toString(36).slice(2);
lines.push(`html<<${DELIM}`);
lines.push(html);
lines.push(DELIM);

if (outFile) {
  appendFileSync(outFile, lines.join('\n') + '\n');
}

// Für die Logs/Konsole (auch ohne GITHUB_OUTPUT nutzbar zum Testen).
console.log(`today=${today} hit=${hit} test=${isTest}` + (hit ? ` subject="${subject}"` : ''));
