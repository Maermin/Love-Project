/* =============================================================================
 * sw.js — sehr defensiver Service Worker (Offline-Cache)
 * -----------------------------------------------------------------------------
 * Cacht die wenigen statischen Dateien, damit die Seite auch offline lädt.
 * Grundsatz: NIE die Seite kaputtmachen. Jeder Fehler wird verschluckt; im
 * Zweifel geht die Anfrage normal ins Netz.
 *
 * Strategie: NETZ ZUERST, Cache nur als Offline-Fallback. Dadurch greift jeder
 * Deploy sofort (keine veralteten Dateien mehr), und offline funktioniert die
 * Seite trotzdem aus dem letzten Stand.
 *
 * Nach inhaltlichen Änderungen die CACHE-Version hochzählen (z. B. v2 -> v3).
 * ========================================================================== */
"use strict";

var CACHE = "liebes-counter-v2";
var ASSETS = [
  ".",
  "index.html",
  "milestones.js",
  "manifest.webmanifest",
  "icon.svg"
];

// Installieren: Kern-Dateien vorab ablegen (Fehler einzelner Dateien ignorieren).
self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.allSettled(ASSETS.map(function (u) { return cache.add(u); }));
    }).catch(function () { /* egal */ })
  );
});

// Aktivieren: ALLE alten Caches (auch v1) aufräumen und sofort übernehmen.
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
      .catch(function () { /* egal */ })
  );
});

// Abrufen: nur eigene GET-Anfragen behandeln; NETZ ZUERST, Cache als Fallback.
self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return; // nur Same-Origin

  event.respondWith(
    fetch(req).then(function (res) {
      // Erfolgreiche Antworten frisch in den Cache spiegeln (für offline).
      if (res && res.ok && res.type === "basic") {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
      }
      return res;
    }).catch(function () {
      // Offline: gecachte Version oder, bei Navigation, die Startseite.
      return caches.match(req).then(function (cached) {
        return cached || caches.match("index.html");
      });
    })
  );
});
