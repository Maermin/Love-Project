/* =============================================================================
 * sw.js — sehr defensiver Service Worker (Offline-Cache)
 * -----------------------------------------------------------------------------
 * Cacht die wenigen statischen Dateien, damit die Seite auch offline lädt.
 * Grundsatz: NIE die Seite kaputtmachen. Jeder Fehler wird verschluckt; im
 * Zweifel geht die Anfrage normal ins Netz.
 *
 * Nach inhaltlichen Änderungen die CACHE-Version hochzählen, damit Clients die
 * neue Fassung laden (z. B. v1 -> v2).
 * ========================================================================== */
"use strict";

var CACHE = "liebes-counter-v1";
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

// Aktivieren: alte Caches aufräumen.
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

// Abrufen: nur eigene GET-Anfragen behandeln; Cache zuerst, dann Netz.
self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return; // nur Same-Origin

  event.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        // Erfolgreiche Antworten frisch in den Cache spiegeln.
        if (res && res.ok && res.type === "basic") {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        }
        return res;
      }).catch(function () {
        // Offline: gecachte Version oder, bei Navigation, die Startseite.
        return cached || caches.match("index.html");
      });
      return cached || network;
    }).catch(function () { return fetch(req); })
  );
});
