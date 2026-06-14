# Liebes-Counter 💛 — Niklas & Angela

Eine private, romantische Ein-Seiten-Website für GitHub Pages: ein **Live-Zähler**
„seit dem 06.06.2026", ein **Countdown zur Hochzeit** (spätestens 06.06.2029) inkl.
**Halbzeit-Markierung**, eine Liste schöner **Meilensteine** mit Konfetti am
jeweiligen Tag, **Passwortschutz mit echter Verschlüsselung** (AES-GCM im Browser)
und drei Wegen, an Meilensteine **erinnert** zu werden (auf der Seite, per Kalender
und per automatischer E-Mail).

Alles läuft rein clientseitig (statische Dateien, kein Server, keine Tracker).

---

## Inhalt

1. [Wie es funktioniert (Architektur)](#wie-es-funktioniert-architektur)
2. [Dateiübersicht](#dateiübersicht)
3. [Schnellstart](#schnellstart)
4. [Auf GitHub Pages veröffentlichen](#auf-github-pages-veröffentlichen)
5. [Passwort setzen / Inhalt verschlüsseln](#passwort-setzen--inhalt-verschlüsseln)  ← **wichtig, bitte lesen**
6. [E-Mail-Erinnerung einrichten](#e-mail-erinnerung-einrichten)
7. [Kalender (.ics) abonnieren](#kalender-ics-abonnieren)
8. [Optional: Cloudflare Access davorschalten](#optional-cloudflare-access-davorschalten)
9. [Meilensteine anpassen](#meilensteine-anpassen)
10. [Lokal testen](#lokal-testen)
11. [Sicherheit – ehrlich erklärt](#sicherheit--ehrlich-erklärt)

---

## Wie es funktioniert (Architektur)

Drei Bausteine teilen sich **eine einzige Quelle der Wahrheit** für alle Termine —
die Datei `milestones.js`:

```
                       ┌────────────────────┐
                       │   milestones.js    │   ← alle Daten & Termine,
                       │ (Single Source of  │     ohne Namen (neutral)
                       │      Truth)        │
                       └─────────┬──────────┘
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                     ▼
     index.html            gen-ics.mjs        .github/workflows/
   (Seite + Zähler      (love-milestones.ics   milestone-mail.yml
    + Entschlüsselung)    für Kalender-Abo)    (tägliche E-Mail)
```

- **`index.html`** ist die Seite selbst. Der Zähler und die Meilenstein-Logik sind
  offen sichtbar (kein Geheimnis). Die **persönlichen Texte/Namen** liegen darin nur
  **verschlüsselt** und erscheinen erst nach Eingabe der Passphrase. Entschlüsselt
  wird direkt im Browser mit der Web-Crypto-API (AES-GCM 256 Bit, Schlüssel via
  PBKDF2-SHA-256, ≥ 250 000 Iterationen).
- **`milestones.js`** berechnet kalendergenau alle runden Tage, Monats- und
  Jahrestage, „Spaß"-Marken (z. B. 1 000 000 Sekunden) sowie Hochzeit/Halbzeit.
- **`gen-ics.mjs`** schreibt aus denselben Daten eine `.ics`-Kalenderdatei.
- Der **GitHub-Action-Workflow** prüft täglich, ob heute ein Meilenstein ist, und
  schickt nur dann eine E-Mail.

Feste Eckdaten (in `milestones.js` oben einstellbar):

| Was | Wert |
|---|---|
| Zusammen seit | **06.06.2026, 00:00** (Europe/Berlin) |
| Hochzeit (spätestens) | **06.06.2029** |
| Halbzeit bis zur Hochzeit | **05.12.2027** |

---

## Dateiübersicht

| Datei | Zweck | Muss ins Repo? |
|---|---|---|
| `index.html` | Die Seite (Zähler, Countdown, Meilensteine, Schloss) | ✅ ja |
| `milestones.js` | Zentrale Termin-Logik | ✅ ja |
| `manifest.webmanifest`, `icon.svg`, `sw.js` | „App installieren" + Offline-Cache (optional, aber empfohlen) | ✅ ja |
| `love-milestones.ics` | Kalenderdatei zum Abonnieren/Importieren | optional |
| `.nojekyll` | verhindert, dass GitHub Pages Dateien „verschluckt" | ✅ ja |
| `encrypt.html` | Browser-Werkzeug zum Verschlüsseln des Inhalts | nur als Werkzeug |
| `build-encrypt.mjs` | dasselbe als Node-Kommandozeile | nur als Werkzeug |
| `gen-ics.mjs` | erzeugt `love-milestones.ics` neu | nur als Werkzeug |
| `.github/workflows/milestone-mail.yml` | täglicher Mail-Workflow | ✅ für Mail |
| `.github/scripts/check-milestones.mjs` | Logik hinter dem Workflow | ✅ für Mail |

> **Hinweis zur Privatsphäre:** `index.html` verbirgt eure Texte verschlüsselt.
> `manifest.webmanifest`, `icon.svg` und (falls hochgeladen) `love-milestones.ics`
> enthalten dagegen die **Namen im Klartext**. Wer es ganz privat will: Repository
> **privat** lassen (GitHub Pages geht auch mit privatem Repo) und/oder
> [Cloudflare Access](#optional-cloudflare-access-davorschalten) davorschalten.
> Die Mail-Logik selbst ist bewusst namensfrei gehalten.

---

## Schnellstart

1. Neues GitHub-Repository anlegen (z. B. `love`), **alle** Dateien hochladen
   (inklusive des Ordners `.github/` und der Datei `.nojekyll`).
2. **Wichtig:** Mit `encrypt.html` eigene Texte + **eigene Passphrase** setzen
   (siehe [Abschnitt 5](#passwort-setzen--inhalt-verschlüsseln)). Solange ihr das
   nicht tut, gilt die **dokumentierte Standard-Passphrase** – also nicht privat!
3. GitHub Pages aktivieren ([Abschnitt 4](#auf-github-pages-veröffentlichen)).
4. Optional: Mail-Erinnerung ([Abschnitt 6](#e-mail-erinnerung-einrichten)) und
   Kalender-Abo ([Abschnitt 7](#kalender-ics-abonnieren)) einrichten.

---

## Auf GitHub Pages veröffentlichen

1. Repository auf GitHub öffnen → **Settings** → **Pages**.
2. Unter **Build and deployment** → **Source**: „Deploy from a branch" wählen.
3. Branch **`main`** und Ordner **`/ (root)`** auswählen → **Save**.
4. Nach ein bis zwei Minuten ist die Seite unter
   `https://DEIN-NAME.github.io/love/` erreichbar.

Die mitgelieferte Datei **`.nojekyll`** sorgt dafür, dass GitHub keine Dateien
ausfiltert (sie ist leer und gehört einfach ins Wurzelverzeichnis).

> Ohne `https` funktioniert die Entschlüsselung nicht (Web-Crypto braucht einen
> „sicheren Kontext"). GitHub Pages liefert automatisch `https` – passt also.

---

## Passwort setzen / Inhalt verschlüsseln

> ### ⚠️ Bitte zuerst lesen: Standard-Passphrase ändern!
> Die ausgelieferte `index.html` ist mit einer **öffentlich dokumentierten**
> Standard-Passphrase verschlüsselt:
>
> ```
> Sechster-Juni-Zwei-Herzen-2026
> ```
>
> Damit ist die Seite **noch nicht privat** – jede:r, der diese README liest,
> kennt das Passwort. **Setzt vor der Veröffentlichung eure eigene Passphrase**
> (und gern auch eigene Texte). Das dauert zwei Minuten:

### Variante A — im Browser mit `encrypt.html` (empfohlen)

1. `encrypt.html` öffnen. Am einfachsten lokal über `http://localhost`
   (siehe [Lokal testen](#lokal-testen)) – Web-Crypto braucht `https`/`localhost`.
2. Auf **„Standard-Inhalt laden"** klicken, dann die Texte/Namen nach Wunsch
   anpassen (es ist HTML; die `id="…"`-Attribute bitte stehen lassen, daran hängt
   der Zähler).
3. Eine **starke Passphrase** eingeben (Empfehlung: vier oder mehr zufällige
   Wörter, z. B. `Mond-Kaffee-Anker-Veilchen-72`). Iterationen bei `250000` lassen.
4. **„Verschlüsseln"** klicken. Unten erscheint ein Block der Form
   `var ENC = {…};`. Mit **„Snippet kopieren"** kopieren.
5. In `index.html` die vorhandene Zeile (beginnt mit `var ENC = {`) **komplett**
   durch den kopierten Block ersetzen. Speichern, hochladen – fertig.
6. Optional vorher testen: im Aufklapp-Bereich „2 · Test" die Passphrase eingeben
   und prüfen, ob sich der Inhalt wieder entschlüsseln lässt.

### Variante B — am Terminal mit Node

```bash
PASSPHRASE='deine-lange-passphrase' node build-encrypt.mjs default-content.html
```

Das gibt denselben `ENC`-Block aus (zum Einsetzen in `index.html`). Mit
`OUT=enc.json` lässt er sich in eine Datei schreiben. Eigene Inhalte: einfach eine
eigene HTML-Datei statt `default-content.html` angeben.

> Beide Wege nutzen exakt dasselbe Verfahren (PBKDF2-SHA-256 → AES-GCM-256), die
> Ergebnisse sind austauschbar.

---

## E-Mail-Erinnerung einrichten

Der Workflow `.github/workflows/milestone-mail.yml` läuft täglich (Cron `6 6 * * *`,
also 06:06 UTC) und schickt **nur dann** eine Mail, wenn heute (Berliner Zeit) ein
Meilenstein ansteht. Versand über die fertige Action `dawidd6/action-send-mail`.

Die Zugangsdaten kommen **ausschließlich aus GitHub-Secrets** – niemals in den Code
schreiben.

### Secrets anlegen

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository
secret**. Diese Secrets anlegen:

| Name | Beispiel / Inhalt |
|---|---|
| `MAIL_SERVER` | `smtp.gmail.com` |
| `MAIL_PORT` | `465` |
| `MAIL_USERNAME` | eure Absende-Adresse (SMTP-Login) |
| `MAIL_PASSWORD` | **App-Passwort** (siehe unten) |
| `MAIL_TO` | Empfänger, mehrere mit Komma trennbar |
| `SITE_URL` *(optional)* | `https://DEIN-NAME.github.io/love/` (Link in der Mail) |

### Gmail: App-Passwort erstellen

Gmail erlaubt SMTP nicht mit dem normalen Passwort. So geht's:

1. Google-Konto → **Sicherheit** → **Bestätigung in zwei Schritten** aktivieren
   (Voraussetzung).
2. Danach unter **Sicherheit** → **App-Passwörter** ein neues Passwort erzeugen
   (16 Zeichen).
3. Dieses 16-stellige Passwort als `MAIL_PASSWORD` hinterlegen, `MAIL_SERVER` =
   `smtp.gmail.com`, `MAIL_PORT` = `465`.

(Andere Anbieter funktionieren analog mit ihren SMTP-Daten.)

### Testen

Repo → **Actions** → Workflow **„Meilenstein-Mail"** → **Run workflow** → Häkchen
bei **force** setzen → starten. Dann wird testweise der **nächste** kommende
Meilenstein verschickt, auch wenn heute keiner ist. So seht ihr sofort, ob der
Versand klappt.

> Hinweis: GitHub-Cron läuft in UTC und kann sich um einige Minuten verspäten.
> Die „Ist heute ein Meilenstein?"-Prüfung selbst nutzt aber **Europe/Berlin**,
> stimmt also datumsgenau.

---

## Kalender (.ics) abonnieren

Es gibt zwei Wege, die Termine in deinen Kalender zu holen.

**Einmalig importieren (einfachste Variante):**
Auf der Seite (nach dem Entsperren) gibt es den Button **„Kalender (.ics) laden"**.
Die heruntergeladene Datei in Apple Kalender / Google Kalender / Outlook
importieren. Enthält für jeden Meilenstein einen Ganztagstermin mit Erinnerung
um 09:00 morgens.

**Dauerhaft abonnieren (aktualisiert sich):**
Lade `love-milestones.ics` mit ins Repo. Sie ist dann erreichbar unter
`https://DEIN-NAME.github.io/love/love-milestones.ics`. Diese URL als
„Kalender abonnieren" eintragen:

- **Google Kalender:** Andere Kalender → **Per URL** → die Adresse einfügen.
- **Apple Kalender:** Ablage → **Neues Kalenderabonnement…** → Adresse einfügen.

Wenn sich die Meilensteine ändern, `love-milestones.ics` neu erzeugen:

```bash
node gen-ics.mjs
```

---

## Optional: Cloudflare Access davorschalten

Für eine zweite Schutzschicht (z. B. Login per E-Mail-Code, bevor die Seite
überhaupt lädt):

1. Domain zu **Cloudflare** hinzufügen (kostenloser Tarif genügt) und die Seite
   z. B. über eine eigene (Sub-)Domain ausliefern, die auf GitHub Pages zeigt.
2. In **Cloudflare Zero Trust** → **Access** → **Applications** eine
   *Self-hosted*-Anwendung für diese Domain anlegen.
3. Eine **Policy** erstellen, die nur eure beiden E-Mail-Adressen zulässt
   (Regel „Emails" → eure Adressen).

Danach verlangt Cloudflare vor dem Laden der Seite einen Login – die
clientseitige Passphrase bleibt als zweite Ebene zusätzlich bestehen.

---

## Meilensteine anpassen

Alles steckt in `milestones.js` (oben, gut kommentiert):

- `ROUND_DAYS` — Liste runder Tage (100, 200, 365, 500, 1000, 1111 …). Werte
  ergänzen oder entfernen.
- `MONTHLY_HORIZON_YEARS` / `YEARLY_HORIZON_YEARS` — wie weit Monats- bzw.
  Jahrestage in die Zukunft erzeugt werden.
- Die „Spaß"-Marken (1 000 000 Sekunden usw.) und Hochzeit/Halbzeit stehen
  ebenfalls dort.

Nach Änderungen:
- Die Seite zeigt sie automatisch (lädt `milestones.js`).
- Für den Kalender `node gen-ics.mjs` neu laufen lassen.
- Die Mail nutzt die Datei direkt – nichts weiter nötig.

> Die Titel in `milestones.js` sind absichtlich **ohne Namen** (z. B. „2. Jahrestag"),
> damit Kalenderdatei und Mail keine Namen verraten. Die Namen leben nur im
> verschlüsselten Teil von `index.html`.

---

## Lokal testen

`file://` reicht **nicht** (Web-Crypto und das Nachladen von `milestones.js`
brauchen einen echten Server-Kontext). Einfach einen kleinen lokalen Server
starten:

```bash
# im Projektordner
python3 -m http.server 8000
```

Dann im Browser öffnen:

- Seite: `http://localhost:8000/`
- Verschlüsseln: `http://localhost:8000/encrypt.html`

`http://localhost` zählt als sicherer Kontext – die Entschlüsselung funktioniert
also wie später unter `https`.

---

## Sicherheit – ehrlich erklärt

- Die Inhalte werden mit **AES-GCM (256 Bit)** verschlüsselt. Der Schlüssel wird
  aus deiner Passphrase mit **PBKDF2-SHA-256** und **≥ 250 000 Iterationen**,
  zufälligem 16-Byte-Salt und zufälligem 12-Byte-IV abgeleitet. In `index.html`
  steht **nur** der verschlüsselte Block (Salt/IV/Chiffretext als base64) – **kein**
  Passwort, kein Klartext, kein Hash des Passworts.
- **Die Stärke hängt allein an der Passphrase.** Da die `index.html` öffentlich
  ist, kann jemand beliebig oft Passwörter ausprobieren (offline). Eine kurze oder
  erratbare Passphrase ist daher unsicher. Nimm **vier oder mehr zufällige Wörter**
  und verwende sie nirgends sonst.
- Schreib die Passphrase **nicht** ins Repository (auch nicht in Kommentare).
- Für „richtig privat": Repository **privat** halten und/oder **Cloudflare Access**
  davorschalten. Bedenke, dass `manifest.webmanifest`, `icon.svg` und eine
  hochgeladene `love-milestones.ics` die **Namen** im Klartext enthalten.

---

Mit Liebe gebaut. 💛  *Für Niklas & Angela.*
