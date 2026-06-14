/*
 * milestones.js — SINGLE SOURCE OF TRUTH
 * =====================================================================
 * Diese Datei wird von DREI Stellen genutzt:
 *   1) index.html  (die geschützte Seite — Zähler, Countdown, Liste)
 *   2) gen-ics.mjs (baut love-milestones.ics)
 *   3) scripts/check-milestones.mjs (der tägliche GitHub-Action-Mailer)
 *
 * Sie enthält KEINE persönlichen Texte (Namen, Liebesnotizen) — die liegen
 * verschlüsselt in index.html. Hier stehen nur die Daten + die Mathematik,
 * weil der Server-seitige Mailer diese Datei im Klartext lesen muss.
 *
 * Die Datei ist als UMD geschrieben:
 *   • Im Browser  -> setzt window.LoveMilestones
 *   • In Node     -> module.exports  (per `import LM from "./milestones.js"`)
 * =====================================================================
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;            // Node (CommonJS / per ESM-Default-Import)
  } else {
    root.LoveMilestones = api;       // Browser-Global
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // ====== FIXE DATEN ==================================================
  var TZ          = "Europe/Berlin";
  var START_ISO   = "2026-06-06";   // Zusammen seit, 00:00 Ortszeit Berlin
  var WEDDING_ISO = "2029-06-06";   // Spätester Hochzeitstermin

  // Wie weit in die Zukunft erzeugen wir wiederkehrende Meilensteine?
  // (Frei anpassbar — größere Werte = mehr Einträge in .ics & mehr Mails.)
  var MONTHLY_HORIZON_YEARS = 10;   // jeder 6. eines Monats
  var YEARLY_HORIZON_YEARS  = 25;   // jeder 06.06.

  // ====== KLEINE HELFER ==============================================
  function pad(n) { return String(n).padStart(2, "0"); }

  // Anzahl Tage in Monat m (1–12) des Jahres y — schaltjahrsicher.
  function daysInMonth(y, m) {
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  }

  // Wall-Clock-Zeit einer Zeitzone -> UTC-Millisekunden (DST-korrekt).
  // mo ist 1–12.
  function zonedTimeToUtcMs(y, mo, d, h, mi, s, tz) {
    var guess = Date.UTC(y, mo - 1, d, h, mi, s);
    var p = getZonedParts(guess, tz);
    var asTz = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
    var offset = asTz - guess;       // tz-Offset zum Zeitpunkt guess
    return guess - offset;
  }

  // UTC-ms -> Wall-Clock-Bestandteile in Zeitzone tz.
  var _dtfCache = {};
  function getZonedParts(ms, tz) {
    var dtf = _dtfCache[tz];
    if (!dtf) {
      dtf = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz, hourCycle: "h23",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
      });
      _dtfCache[tz] = dtf;
    }
    var parts = dtf.formatToParts(new Date(ms));
    var m = {};
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type !== "literal") m[parts[i].type] = parts[i].value;
    }
    return {
      y: +m.year, mo: +m.month, d: +m.day,
      h: +m.hour % 24, mi: +m.minute, s: +m.second
    };
  }

  // UTC-ms -> "YYYY-MM-DD" in Zeitzone tz.
  function isoDateOf(ms, tz) {
    var p = getZonedParts(ms, tz);
    return p.y + "-" + pad(p.mo) + "-" + pad(p.d);
  }

  // Heutiges Datum (in tz) als "YYYY-MM-DD".
  function todayISO(tz) { return isoDateOf(Date.now(), tz || TZ); }

  // "YYYY-MM-DD" + n Tage -> "YYYY-MM-DD" (reine Kalender-Arithmetik, DST-egal).
  function addDaysISO(iso, n) {
    var a = iso.split("-").map(Number);
    var dt = new Date(Date.UTC(a[0], a[1] - 1, a[2] + n));
    return dt.getUTCFullYear() + "-" + pad(dt.getUTCMonth() + 1) + "-" + pad(dt.getUTCDate());
  }

  // Der 6. des Monats, der i Monate nach START liegt -> "YYYY-MM-DD".
  function monthsAfterStart_day6(i) {
    var a = START_ISO.split("-").map(Number); // [2026, 6, 6]
    var dt = new Date(Date.UTC(a[0], (a[1] - 1) + i, 6));
    return dt.getUTCFullYear() + "-" + pad(dt.getUTCMonth() + 1) + "-" + pad(dt.getUTCDate());
  }

  // Kalendergenaue Differenz end-start (end >= start) als
  // { years, months, days, hours, mins, secs } — volle Kalendereinheiten + Rest.
  function diffYMD(startMs, endMs, tz) {
    var s = getZonedParts(startMs, tz);
    var e = getZonedParts(endMs, tz);
    var years = e.y - s.y, months = e.mo - s.mo, days = e.d - s.d;
    var hours = e.h - s.h, mins = e.mi - s.mi, secs = e.s - s.s;
    if (secs < 0) { secs += 60; mins -= 1; }
    if (mins < 0) { mins += 60; hours -= 1; }
    if (hours < 0) { hours += 24; days -= 1; }
    if (days < 0) {
      var py = e.y, pm = e.mo - 1;        // Monat VOR end -> dessen Tageszahl leihen
      if (pm === 0) { pm = 12; py -= 1; }
      days += daysInMonth(py, pm);
      months -= 1;
    }
    if (months < 0) { months += 12; years -= 1; }
    return { years: years, months: months, days: days, hours: hours, mins: mins, secs: secs };
  }

  // Deutsche Tausendertrennung (1234567 -> "1.234.567").
  var _nf = new Intl.NumberFormat("de-DE");
  function deNum(n) { return _nf.format(n); }

  // ====== ABGELEITETE ZEITSTEMPEL ====================================
  var START_MS    = zonedTimeToUtcMs(2026, 6, 6, 0, 0, 0, TZ);
  var WEDDING_MS  = zonedTimeToUtcMs(2029, 6, 6, 0, 0, 0, TZ);
  var HALFTIME_MS = START_MS + Math.round((WEDDING_MS - START_MS) / 2);

  // 00:00 Berlin eines "YYYY-MM-DD" als UTC-ms (für Countdowns).
  function midnightMs(iso) {
    var a = iso.split("-").map(Number);
    return zonedTimeToUtcMs(a[0], a[1], a[2], 0, 0, 0, TZ);
  }

  // ====== MEILENSTEINE ===============================================
  // Prioritäten bestimmen Emoji/Farbe, wenn mehrere auf denselben Tag fallen.
  var PRIO = { wedding: 5, year: 4, round: 3, fun: 2, month: 1 };

  function buildMilestones() {
    var byDate = {}; // "YYYY-MM-DD" -> { date, items:[{title,emoji,category,prio}] }

    function add(dateISO, title, emoji, category) {
      if (!byDate[dateISO]) byDate[dateISO] = { date: dateISO, items: [] };
      byDate[dateISO].items.push({
        title: title, emoji: emoji, category: category, prio: PRIO[category] || 0
      });
    }

    // --- Runde Tage ------------------------------------------------
    var ROUND_DAYS = [100, 200, 365, 500, 555, 1000, 1111, 2000, 2500, 3000, 3650];
    ROUND_DAYS.forEach(function (n) {
      add(addDaysISO(START_ISO, n), deNum(n) + " Tage zusammen", "💯", "round");
    });

    // --- Spaß-Meilensteine (Sekunden/Minuten/Stunden) --------------
    add(isoDateOf(START_MS + 1000000 * 1000, TZ),        "1.000.000 Sekunden zusammen",   "⏱️", "fun");
    add(isoDateOf(START_MS + 100000000 * 1000, TZ),      "100.000.000 Sekunden zusammen", "🚀", "fun");
    add(isoDateOf(START_MS + 10000 * 3600 * 1000, TZ),   "10.000 Stunden zusammen",       "⌛", "fun");
    add(isoDateOf(START_MS + 1000000 * 60 * 1000, TZ),   "1.000.000 Minuten zusammen",    "💫", "fun");
    // (1.000 Tage ist bereits ein "runder Tag" oben und wird dort gefeiert.)

    // --- Monats-Jubiläen: jeder 6. eines Monats --------------------
    for (var i = 1; i <= 12 * MONTHLY_HORIZON_YEARS; i++) {
      var dISO = monthsAfterStart_day6(i);
      if (+dISO.slice(5, 7) === 6) continue;       // Juni -> Jahres-Jubiläum
      add(dISO, i + (i === 1 ? " Monat" : " Monate") + " zusammen", "🥰", "month");
    }

    // --- Jahres-Jubiläen: jeder 06.06. -----------------------------
    for (var y = 1; y <= YEARLY_HORIZON_YEARS; y++) {
      var yearISO = (2026 + y) + "-06-06";
      add(yearISO, y + (y === 1 ? " Jahr" : " Jahre") + " zusammen", "🎉", "year");
    }

    // --- Hochzeits-Bezug -------------------------------------------
    add(isoDateOf(HALFTIME_MS, TZ), "Halbzeit bis zur Hochzeit", "💕", "wedding");
    add("2028-06-06", "Noch 1 Jahr bis zur Hochzeit", "💒", "wedding");
    add(WEDDING_ISO,  "Hochzeitstag", "💍", "wedding");

    // --- Zusammenführen, sortieren ---------------------------------
    var list = Object.keys(byDate).map(function (date) {
      var entry = byDate[date];
      // höchste Priorität bestimmt Emoji + Kategorie
      var top = entry.items.slice().sort(function (a, b) { return b.prio - a.prio; })[0];
      // eindeutige Titel, nach Priorität
      var seen = {}, titles = [];
      entry.items.slice().sort(function (a, b) { return b.prio - a.prio; }).forEach(function (it) {
        if (!seen[it.title]) { seen[it.title] = 1; titles.push(it.title); }
      });
      return {
        date: date,
        ms: midnightMs(date),
        title: titles.join(" · "),
        titles: titles,
        emoji: top.emoji,
        category: top.category
      };
    });
    list.sort(function (a, b) { return a.ms - b.ms; });
    return list;
  }

  // Einmal berechnen und cachen.
  var _cache = null;
  function getMilestones() {
    if (!_cache) _cache = buildMilestones();
    return _cache;
  }

  // Auch als fertiges Array exportiert (wie in der Spec gewünscht).
  var MILESTONES = getMilestones();

  // ====== ICS-EXPORT =================================================
  // RFC-5545-Zeilenfaltung auf 75 Oktetts (vereinfacht, ASCII-orientiert).
  function foldLine(line) {
    // RFC 5545: auf max. 75 Oktette (UTF-8) falten, Fortsetzung mit Leerzeichen.
    // Nach Oktetten zählen, aber Mehrbyte-Zeichen (z. B. ❤, –) nie zerschneiden.
    var TE = new TextEncoder();
    if (TE.encode(line).length <= 75) return line;
    var chars = Array.from(line);
    var out = "", cur = "", curBytes = 0, first = true, limit = 75;
    for (var i = 0; i < chars.length; i++) {
      var b = TE.encode(chars[i]).length;
      if (curBytes + b > limit) {
        out += (first ? "" : "\r\n ") + cur;
        first = false; cur = chars[i]; curBytes = b; limit = 74; // 74 + führendes Leerzeichen
      } else {
        cur += chars[i]; curBytes += b;
      }
    }
    out += (first ? "" : "\r\n ") + cur;
    return out;
  }
  function esc(t) {
    return String(t)
      .replace(/\\/g, "\\\\").replace(/;/g, "\\;")
      .replace(/,/g, "\\,").replace(/\n/g, "\\n");
  }
  function slug(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
  }
  function dtstamp() {
    var d = new Date();
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "T" +
           pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + "Z";
  }

  // Baut den kompletten .ics-Text aus einer Meilenstein-Liste.
  function buildICS(list) {
    var stamp = dtstamp();
    var L = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Niklas & Angela//Liebes-Counter//DE",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Niklas & Angela – Meilensteine",
      "X-WR-TIMEZONE:" + TZ
    ];
    list.forEach(function (m) {
      var start = m.date.replace(/-/g, "");                 // YYYYMMDD (Ganztag)
      var end   = addDaysISO(m.date, 1).replace(/-/g, "");  // exklusives Ende
      var uid   = m.date + "-" + slug(m.titles[0]) + "@niklas-angela.love";
      var summary = m.emoji + " " + m.title;
      var desc = m.titles.join(" \\n ") + " \\n— Niklas \u2764 Angela";
      L.push("BEGIN:VEVENT");
      L.push("UID:" + uid);
      L.push("DTSTAMP:" + stamp);
      L.push(foldLine("SUMMARY:" + esc(summary)));
      L.push(foldLine("DESCRIPTION:" + desc));
      L.push("DTSTART;VALUE=DATE:" + start);
      L.push("DTEND;VALUE=DATE:" + end);
      L.push("TRANSP:TRANSPARENT");
      L.push("CATEGORIES:" + m.category.toUpperCase());
      // Erinnerung am Morgen des Tages: 9 Stunden NACH 00:00 = 09:00 Ortszeit.
      // (Manche Kalender nutzen für Ganztags-Termine ihre eigene Standard-Zeit;
      //  bei Bedarf in den Kalender-Einstellungen anpassen.)
      L.push("BEGIN:VALARM");
      L.push("ACTION:DISPLAY");
      L.push(foldLine("DESCRIPTION:" + esc(summary)));
      L.push("TRIGGER;RELATED=START:PT9H");
      L.push("END:VALARM");
      L.push("END:VEVENT");
    });
    L.push("END:VCALENDAR");
    return L.join("\r\n") + "\r\n";
  }

  // ====== ÖFFENTLICHE API ============================================
  return {
    TZ: TZ,
    START_ISO: START_ISO,
    WEDDING_ISO: WEDDING_ISO,
    START_MS: START_MS,
    WEDDING_MS: WEDDING_MS,
    HALFTIME_MS: HALFTIME_MS,
    MILESTONES: MILESTONES,
    getMilestones: getMilestones,
    buildICS: buildICS,
    // Helfer (auch von index.html für die Zähler genutzt):
    helpers: {
      pad: pad, deNum: deNum, daysInMonth: daysInMonth,
      zonedTimeToUtcMs: zonedTimeToUtcMs, getZonedParts: getZonedParts,
      isoDateOf: isoDateOf, todayISO: todayISO, addDaysISO: addDaysISO,
      diffYMD: diffYMD, midnightMs: midnightMs
    }
  };
});
