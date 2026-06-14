#!/usr/bin/env node
/* =============================================================================
 * gen-ics.mjs — Kalenderdatei (love-milestones.ics) erzeugen
 * -----------------------------------------------------------------------------
 * Liest die zentrale milestones.js (Single Source of Truth) und schreibt eine
 * iCalendar-Datei mit einem Ganztags-Termin + Erinnerung (09:00) je Meilenstein.
 *
 * Aufruf:
 *   node gen-ics.mjs            -> schreibt love-milestones.ics
 *   node gen-ics.mjs mein.ics   -> eigener Dateiname
 *
 * Die eigentliche ICS-Logik lebt in milestones.js (LM.buildICS), damit Seite,
 * Mailer und diese Datei garantiert dieselben Termine verwenden.
 * ========================================================================== */
import { writeFile } from 'node:fs/promises';
import LM from './milestones.js';

const out = process.argv[2] || 'love-milestones.ics';
const list = LM.getMilestones();
const ics = LM.buildICS(list);

await writeFile(out, ics, 'utf8');
console.log(`OK: ${list.length} Meilensteine -> ${out} (${ics.length} Bytes)`);
