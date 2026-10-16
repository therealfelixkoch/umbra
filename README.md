# UMBRA – Werde unzerbrechlich.

Persönliche Trainings-App fürs iPhone. Du öffnest sie, beantwortest vier Fragen per Tipp, und die App sagt dir, was heute dran ist: Mission (A–D), leichter Zirkel, Kurzeinsatz, Fluss (Mobility) oder Ruhetag. Sie merkt sich jeden Satz, steigert dich automatisch, plant Deloads und fängt Pausen ab.

- **Offline:** Die App läuft als Web-App vom Homescreen, auch im Flugmodus.
- **Privat:** Alle Daten liegen nur auf deinem iPhone (IndexedDB). Es gibt kein Konto und keinen Server. Sicherungen machst du über Export/Import (JSON-Datei).
- **Grundlage:** Die Trainingsprinzipien basieren auf Adam Sinickis (The Bioneer) Programm *SuperMover*, angepasst auf Muay Thai und Vater-Alltag. Alle Texte in der App sind eigene Formulierungen.

---

## Was Phase 1 kann

| Bereich | Inhalt |
| --- | --- |
| **Heute** | Check-in mit 4 Fragen → Empfehlung mit Begründung in einem Satz, „Andere Einheit“, Ruhetag mit Überstimmen und einmaliger Warnung, Fluss-Erinnerung, Deload-Vorschlag, wöchentliche Backup-Erinnerung |
| **Training** | Übung für Übung: letztes Mal → heute, Steigerungs-Badge, Satz-Logging mit großen ± Tasten, Pausen-Timer mit Ton, Glyph-Chips, Info zum Kodex. Zirkel-Modus (D), Kurzeinsatz mit 15-min-Uhr, Sack-Intervalle, geführter Fluss mit 30-s-Takt |
| **Arena** | Muay Thai loggen mit **Intensität 1–10** (ab 7 zählt sie wie Sparring) und **Dauer in Stunden**. Eigener Bereich **Timer**: Runde/Pause/Rundenzahl einstellbar, Boxring-Glocke („Ding Ding Ding“) am Rundenende, Klacken 10 s vorher, ein „Ding“ zum Start, danach Dauer übernehmen. Bereich **Footwork**: 1–3 min Runden, zufällige Kommandos (Right, Left, Forward, Back, Switch) per Roboterstimme in unregelmäßigem Takt |
| **Woche & Fortschritt** (Phase 3) | Wochen-Quest aus den Lücken der Vorwoche (+100 XP), Glyph-Abdeckung gegen „Muay Thai“ und „Vater-Alltag“, Ausprägungen der Woche, Einsätze der letzten 8 Wochen, Attribut-Ränge (Kraft, Explosivität, Ausdauer, Mobilität, Stabilität, Nacken & Griff), 8 Ascensions mit Aura (+150 XP), Kampfkraft zählt sichtbar hoch, Übungstausch im Training schlägt Lückenfüller vor |
| **Mobility-Check** (Phase 2) | 8 Heimtests mit je 5 Stufen und Skizze → Score 0–100 pro Region, alle 4 Wochen. 3 Fokus-Stretches nach Muay-Thai-Gewicht im täglichen Fluss, Verlaufsdiagramm unter Profil → Mobility |
| **Kodex** | 96 Übungen und Stretches, durchsuchbar, filterbar nach Kategorie und Ausprägung (Farbe) |
| **Profil** | Rang, Kampfkraft, Wochen-Streak mit Schild, Deload-Knopf, Bestleistungen, Verlauf, Equipment, KB-Gewichte, Körpergewicht, Pausenzeit, Export/Import |

### Entscheidungsregeln (in dieser Reihenfolge)

0. Heute Abend Arena = Ja und keine Morgeneinheit gewünscht → nur Fluss (Arena reicht). Mit „Zusätzlich Morgeneinheit: Ja“ fragt die App nach Ort und Zeit und plant normal
1. „Nur Mobility“ → Fluss + Spaziergang
2. 3 harte Tage am Stück (Arena oder volle Mission) → Ruhetag (überstimmbar)
3. Platt **und** gestern hartes Sparring → nur Fluss
4. Platt **oder** gestern hartes Sparring → Infiltration leicht (bei 15 min: Kurzeinsatz)
5. Nur 15 Minuten → Kurzeinsatz
6. Heute Abend Arena (Ja/Vielleicht) und B ist dran → nächste Einheit, die nicht B ist; B bleibt vorn
7. Sonst → nächste Mission der Rotation

**Rotation als Warteschlange:** Die erledigte Mission wandert ans Ende. Wenn du C statt B machst, bleibt B vorne. Infiltration leicht und Kurzeinsatz drehen die Rotation nicht weiter.

### Mobility-Check (Phase 2)

| Region | Test | Muay-Thai-Gewicht |
| --- | --- | --- |
| Hüftbeuger | Thomas-Test auf Box/Bett | 1,2 |
| Adduktoren / Seitspagat | Breiter Stand, Winkel zwischen den Beinen | 1,5 |
| Hamstrings | Aktives Beinheben in Rückenlage (statt Vorbeuge: misst ohne Mogeln über den Rücken) | 1,2 |
| Hüftrotation | 90/90-Sitz | 1,2 |
| Sprunggelenk | Knie-zur-Wand in cm | 0,8 |
| Brustwirbelsäule | Rotation im Vierfüßlerstand, Po auf den Fersen | 1,2 |
| Schulter überkopf | Arme an der Wand, Rücken flach | 0,8 |
| Nacken | Rotation im Sitzen | 0,8 |

Stufe 1–5 → Score 0/25/50/75/100. Priorität = (100 − Score) × Gewicht. Für die drei Regionen mit der höchsten Priorität wählt die App je einen Stretch und wechselt täglich zwischen den zwei besten. Die übrigen fünf Positionen bleiben Basis-Fluss.

### Pausen, Deload, Progression

- **Pausen** (Tage seit der letzten vollen Mission): 8–14 Tage → erste Einheit −10 % und ein Satz weniger. Ab 15 Tagen → zwei Einheiten −20 % ohne Versagen. Ab 10 Tagen gilt die Pause als Deload.
- **Deload:** nach 18 vollen Missionen folgen 4 Einheiten mit halben Sätzen, gleichem Gewicht und ohne Versagen. Bei 3× „Platt“ in 7 Tagen schlägt die App einen Deload vor. Es gibt auch einen manuellen Knopf.
- **Double Progression:** Schaffst du in allen Sätzen das obere Ende der Spanne, kommt die nächste Gewichtsstufe und das Ziel geht aufs untere Ende. Schaffst du in allen Sätzen das Ziel, steigt es um +1. Zeit-Übungen steigen um +5 s. Bodyweight ohne Last wechselt an der Obergrenze zur schwereren Variante. Wer zweimal hintereinander unter dem unteren Ende bleibt, bekommt eine Stufe weniger.
- Nach Deload- oder Wiedereinstiegs-Einheiten gibt es keine Progression. Das gewählte Gewicht wird als neue Basis übernommen.

---

## Projektstruktur

```
index.html, manifest.webmanifest, sw.js   PWA-Hülle + Offline-Cache
css/app.css                               Design (nur Dark Mode)
fonts/oxanium.woff2                       Display-Schrift (SIL Open Font License)
icons/                                    App-Icons
js/engine/   reine Logik, ohne DOM:
  decide.js       Entscheidungsregeln
  cycle.js        Rotation, Deload, Wiedereinstieg
  progression.js  Double Progression, Varianten, Rekord-Score
  plan.js         Plan bauen, Training verbuchen, Arena loggen
  game.js         XP, Ränge, Wochen-Streak, Kampfkraft
  roundtimer.js   Arena-Rundentimer
  mobility.js     Mobility-Scores, Prioritäten, Fokus-Stretches
  footwork.js     zufällige Footwork-Kommandos
  progress.js     Wochenabdeckung, Quests, Ascensions, Attribut-Ränge
  history.js, dates.js
js/data/     exercises.js (Kodex), missions.js (A–D, Express, Fluss), glyphs.js, mobility.js (Tests)
js/ui/       Screens (today, training, arena, footwork, kodex, profile, week, onboarding, check), voice.js, sound.js
js/store.js  IndexedDB + Export/Import
tests/       Unit-Tests (im Browser)
```

Es gibt **keinen Build-Schritt**: Die Dateien werden genau so ausgeliefert, wie sie hier liegen.

### Lokal starten und testen (Mac)

```bash
python3 -m http.server 8765
```

- App: <http://localhost:8765>. Lokal ist der Service Worker aus, damit Änderungen sofort sichtbar sind. Mit `?sw` ist er an.
- Tests: <http://localhost:8765/tests/index.html> (zeigt „92/92 grün“)

**Nach jeder Code-Änderung** in `sw.js` die Zeile `const VERSION = 'umbra-v5'` hochzählen, sonst zeigt das iPhone die alte Version aus dem Cache. Neue Dateien zusätzlich in die `ASSETS`-Liste eintragen.

### Referenzmaterial

Das SuperMover-PDF gehört nach `reference/`. Dieser Ordner steht in `.gitignore` und darf **nie** hochgeladen werden.

---

## Anleitung: von null zur App auf dem iPhone

Du brauchst keine Programmierkenntnisse. Alles läuft im Browser, ohne Terminal.

### 1. GitHub-Account anlegen (5 Minuten)

1. Öffne <https://github.com/signup>.
2. E-Mail, Passwort und einen **Benutzernamen** eingeben, z. B. `felix-umbra`. Der Name steht später in der App-Adresse.
3. E-Mail mit dem Code bestätigen. Den kostenlosen Plan („Free“) wählen und Fragebögen überspringen.

### 2. Repository anlegen

1. Oben rechts auf **+** → **New repository**.
2. **Repository name:** `umbra`
3. **Public** auswählen. GitHub Pages ist nur für öffentliche Repos kostenlos. Öffentlich ist dabei nur der Code; deine Trainingsdaten bleiben auf dem iPhone.
4. Kein Häkchen bei README. Dann **Create repository**.

### 3. Dateien hochladen

1. Im neuen Repo auf den Link **„uploading an existing file“** klicken.
2. Im Finder den UMBRA-Ordner öffnen und **diese** Dateien und Ordner in das Browserfenster ziehen:
   `index.html`, `manifest.webmanifest`, `sw.js`, `README.md`, `.gitignore`, `css`, `fonts`, `icons`, `js`, `tests`.
   **Nicht** hochladen: `reference/` (das Buch) und `.claude/`.
   Tipp: `.gitignore` ist im Finder versteckt. Mit **⌘ + ⇧ + .** werden versteckte Dateien sichtbar. Wenn sie fehlt, ist das auch nicht schlimm.
3. Unten auf **Commit changes**.

### 4. GitHub Pages einschalten

1. Im Repo auf **Settings** → links **Pages**.
2. Unter **Build and deployment** → **Source:** „Deploy from a branch“.
3. **Branch:** `main`, Ordner `/ (root)` → **Save**.
4. Nach 1–2 Minuten erscheint oben: *„Your site is live at https://DEINNAME.github.io/umbra/“*. Notier dir diese Adresse.

### 5. Auf dem iPhone installieren

1. Die Adresse in **Safari** öffnen. Nicht in Chrome: nur Safari kann Web-Apps auf den Homescreen legen.
2. Unten auf **Teilen** (Quadrat mit Pfeil) → **Zum Home-Bildschirm** → **Hinzufügen**.
3. UMBRA **vom Homescreen** öffnen und das Onboarding durchgehen.
4. **Offline-Test:** Die App einmal komplett öffnen, dann den Flugmodus an, App schließen und wieder öffnen. Sie startet trotzdem.

### 6. Updates einspielen

1. Geänderte Dateien wie in Schritt 3 erneut hochladen (gleiche Namen werden überschrieben), vorher `VERSION` in `sw.js` hochzählen.
2. Auf dem iPhone die App öffnen, ganz schließen und wieder öffnen. Beim zweiten Start ist die neue Version da.

### 7. Backups

- **Profil → Einstellungen → Exportieren** öffnet das Teilen-Menü. Wähle **„In Dateien sichern“** (iCloud Drive) oder AirDrop an den Mac.
- Die App erinnert dich einmal pro Woche freundlich daran. iOS kann den Speicher von Web-Apps löschen, wenn das Gerät lange voll ist oder die App wochenlang nicht geöffnet wurde.
- **Gerätewechsel:** UMBRA auf dem neuen iPhone installieren → Profil → **Importieren** → Backup-Datei wählen.

---

## Hinweise zu iOS

- **Stummschalter:** Steht der Schalter am iPhone auf lautlos, bleiben Glocke und Timer-Töne stumm, weil iOS das für Web-Apps so vorgibt. Vibration können Web-Apps auf dem iPhone nicht auslösen.
- **Bildschirm an:** Während Training und Rundentimer hält die App den Bildschirm wach. Sperrst du das iPhone, pausiert der Timer. Beim Entsperren holt er die verpasste Zeit wieder auf, der Ton dazwischen fällt aber aus.
- Die App fragt beim Start, ob iOS den Speicher dauerhaft schützen soll (`navigator.storage.persist()`).
- **Footwork-Stimme:** Die App nimmt eine eingebaute englische Roboterstimme (Zarvox, Trinoids, Fred …), sonst die Standardstimme so tief wie möglich. Fehlt die Stimme auf dem iPhone, kannst du sie unter Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Englisch → Neuheit laden.
