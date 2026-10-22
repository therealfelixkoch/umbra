# UMBRA – Werde unzerbrechlich.

Persönliche Trainings-App fürs iPhone. Du öffnest sie, beantwortest vier Fragen per Tipp, und die App sagt dir, was heute dran ist: Mission (A–D), leichter Zirkel, Kurzeinsatz, Fluss (Mobility) oder Ruhetag. Sie merkt sich jeden Satz, steigert dich automatisch, plant Deloads und fängt Pausen ab.

- **Offline:** Die App läuft als Web-App vom Homescreen, auch im Flugmodus.
- **Privat:** Alle Daten liegen nur auf deinem iPhone (IndexedDB). Es gibt kein Konto und keinen Server. Sicherungen machst du über Export/Import (JSON-Datei).
- **Übungsnamen:** Alle Übungen tragen ihre englischen Standardnamen (z. B. Bulgarian Split Squat, Nordic Curls, Prayer Squat). Erklärungen bleiben deutsch.
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

### Entscheidungsregeln (Stand 22.10.2026: Rotation strikt, du entscheidest die Dauer)

Check-in fragt getrennt **Wie viel Zeit?** (volle Einheit · 30 min · 15 min · 5 min · Nur Mobility) und **Wo?** (Eigener Raum · Home Gym · Unterwegs).

0. Heute Abend Arena = Ja und keine Morgeneinheit gewünscht → nur FLOW (Arena reicht). Mit „Zusätzlich Morgeneinheit: Ja“ plant die App normal
1. 5 min → HANDS · Nur Mobility → FLOW + Spaziergang
2. 15 min → SHADOWSTEP (zählt für die Woche, die Rotation bleibt stehen)
3. Sonst → **nächster Platz der Rotation A → B → C → D → FORGE**, an keine Wochentage gebunden. 30 min = Kompakt dieser Mission
4. FORGE braucht das Home Gym. Bist du woanders, kommt der nächste Platz dran und FORGE bleibt vorgemerkt. Im Home Gym laufen A–D mit ihren Gym-Übungen
5. Pause 5–14 Tage → Einstieg mit dem Platz, der am längsten liegt
6. Arc III: 4x4 statt D (einmal pro Woche) · unterwegs Hotel-Zirkel statt D

**Hinweise statt Tausch:** 3 harte Tage am Stück, platt, gestern hartes Sparring, gestern High-Tag vor einem High-Platz (B, FORGE, 4x4) oder Arena heute Abend vor BEDROCK tauschen keine Mission mehr. Sie erscheinen als Hinweis unter „Wie viel Zeit?“ mit einer Empfehlung (30 min, 15 min oder Mobility). Du entscheidest.

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

### Bang Muay Thai (ARENA → BMT)

- Eigenes Programm „Bang Muay Thai · Jahr 1“ mit einem Plan pro Woche. Wochen trägst du selbst ein, auch nachträglich und in beliebiger Reihenfolge (ARENA → BMT → Wochen verwalten → Neue Woche).
- Plan als Text, so wie du ihn aus dem Kurs rausschreibst: Leerzeile = neuer Block, erste Zeile = Blocktitel. „Week 7“ in der ersten Zeile setzt die Wochennummer. Zeitangaben wie „2 Runden 3 min“ oder „2x 3 min“ bekommen einen Rundentimer-Knopf (1 min Pause), „1x 3 min footwork“ einen Footwork-Drill-Knopf.
- In der Ansicht: Fortschritt über alle Wochen (trainiert ×, abgeschlossen ✓, aktuell in Gold), der Plan der aktuellen Woche zum Abhaken, „Einheit eintragen“ (ARENA-Eintrag mit Intensität und Dauer, verknüpft mit der Woche), „Woche abschließen“ (dann wird die nächste offene Woche aktuell).
- Pauschal per Zeit eintragen geht weiterhin unter ARENA → Eintragen.

### Baustein: Handgelenk-Modul (TFCC) und HANDS

Grundlage: `docs/tfcc-protokoll.md`. Keine Diagnosen, nur Ampel, Stufe und Empfehlung.

- **Schalter** im Profil (Tab „Hand“): Seite wählen, Warnzeichen einmal bestätigen, danach direkt der Status-Check. AUS = nur Erhaltung (1–2 × pro Woche) und HANDS, alle Daten bleiben.
- **Ampel:** nach Einheiten mit Handgelenk-Last „Handgelenk während 0–10“ (+ „Klicken mit Schmerz?“), im Check-in „Handgelenk heute 0–10“. Grün → nach 3 grünen Einheiten in Folge steigt die Übung eine Stufe (Flasche, Hebel, Leiter). Gelb → halten. Rot → 2–3 Tage nur Aktivierung (leicht) und HANDS, die Übungen eine Stufe zurück. Zwick-Meldung Handgelenk = Gelb. Steigt der Morgenschmerz von Woche zu Woche, schlägt die App eine Stufe zurück vor.
- **Status-Check** wöchentlich (Karte auf Heute): Ruhezeichen, Griffkraft (überspringbar ohne Dynamometer), Push-off, Hammer-Drehung, Ulnar-Hebel, Rotation unter Last. Die App schlägt die Stufe vor, du bestätigst. Ausschalt-Vorschlag nach 3 Wochen alle Tests 0–1 ohne rote Tage, Hinweis bei 6 Wochen ohne Fortschritt.
- **Blöcke:** Kraftblock am Ende von ASCENT, IMPACT, FORGE (ersetzt das Unterarm-Prehab und Dead Hang; Goblet Curls und Armübungen bleiben). Aktivierung im Aufwärmen von BEDROCK und INFILTRATION, vor der ARENA als Karte. Eigene Session an FLOW-/Ruhetagen. Minimal-Dosis bei „Nur 5 Minuten“. Ohne Hammer bzw. unterwegs: Flasche, Rucksack, eigene Hand.
- **Dosis:** Kraftblock höchstens 3 × pro Woche, nie an zwei Tagen in Folge, nicht nach hartem ARENA-Abend, im Rot-Fenster nur Aktivierung. Für heute ablehnbar.
- **Tausch im Training:** Liegestütz, Pike, Krabbeln auf Fäusten oder Griffen bis Test 2 grün (ab Stufe 4), neutraler Griff bei Klimmzügen und Rows, Hinweis bei Dips.
- **HANDS** (5 min, unabhängig vom Modul): Sehnengleiten, Finger spreizen, Handgelenkskreise, Dart-Thrower, Unterarm-Rotation, Beuger-/Strecker-Dehnung, Vierfüßler (auf den Knöcheln, bis Test 2 grün), Daumen. Karte morgens, unterwegs und bei „Nur 5 Minuten“, optional Handgelenk-Gefühl 1–5.
- **XP:** Handgelenk-Session/Aktivierung/Minimal-Dosis 10, Status-Check 10, HANDS 5 (alle im Tagesdeckel), Protokoll beendet 150. Kraftblock in einer Mission: keine Extra-XP.

### Update 22.10.2026

- **Tageszitat** oben auf „Heute“, jeden Tag ein anderes, keine Wiederholung vor Ablauf der Liste. Quellen: Bibel (Luther 1912), Sun Tzu und Musashi (eigene Übersetzung gemeinfreier Fassungen), Kämpfer (nur mit Quelle; „überliefert“, wo der Wortlaut nicht gesichert ist), Krieger, Stoiker. Profil → Setup: Tageszitat an/aus, Quellen einzeln abschaltbar, einzelne Zitate ausblendbar.
- **Aufwärmsätze (Ramping)** vor schweren Grundübungen mit Last (Langhantel, Kurzhantel, Gürtel, KB): Die erste schwere Übung der Einheit bekommt die volle Rampe (leere Stange ab 50 kg, ca. 45 % × 8, 70 % × 3, 85 % × 1), jede weitere einen Feeder-Satz (ca. 70 % × 3). Zählt nicht als Satz, rechnet mit dem eingestellten Gewicht.
- **Supersets (freiwillig):** Bei passenden Paaren (Drücken ↔ Ziehen, Drücken ↔ hintere Schulter, Wade ↔ Schienbein, Nacken hinten ↔ vorne, Rumpf ↔ Arme, Schulter ↔ Rumpf) erscheint „Superset“. Dann wechseln die Sätze ab: 20 s Wechsel, volle Pause nach dem Paar.
- **Gesamt-Timer** oben rechts in jeder Einheit (lange Unterbrechungen zählen nicht, wie beim Verbuchen).
- Schema 7 (FORGE in die Queue hinter INFILTRATION).

### Baustein: FEET (Fußtraining barfuß)

- **Unabhängig:** zählt nicht für Rotation, Arc-Woche oder Wochenziel. Dezente Karte auf „Heute“ (Stufe, Einheiten diese Woche, Empfehlung 3–5). Unterwegs und bei „Nur 5 Minuten“ hervorgehoben. Auch über „Andere Einheit“ und Profil → Gelenke → Fuß startbar.
- **Stufen:** 1 Erwachen, 2 Aufrichten, 3 Tragen, 4 Federn, Erhaltung. Geführte Folge wie HANDS, einbeinige Übungen links und rechts als eigene Schritte. Die schwächere Seite (Fersenheben 3+ Wdh. oder Augen-zu-Stand 10+ s Unterschied) bekommt einen Satz mehr.
- **Sparring:** Stufe 4 fragt „Morgen hartes Sparring?“. Bei Ja ohne Sprünge (langsame einbeinige Fersenhebungen statt Pogos, Seilspringen, Hops).
- **Equipment-Ersatz:** ohne Ball Flasche, ohne Balance-Board Kissen, ohne Seil Schattenseil, ohne Band Hand als Widerstand, ohne Pipes weglassen.
- **Fuß-Check alle 4 Wochen:** Fußabdruck-Foto (nur lokal in IndexedDB, nicht im JSON-Export, keine Auswertung, Vergleich nebeneinander), Zehenspreizen und Großzeh-Druck 1–3, einbeinige Fersenhebungen, Einbeinstand Augen zu und Gewölbe halten mit Stoppuhr. Die App schlägt die nächste Stufe vor, du bestätigst. Zurückschalten geht jederzeit.
- **Profil → Gelenke → Fuß:** Stufe, Kurven pro Seite, Fußabdruck-Galerie, Barfuß-Zeit (optional, Start 2.500 Schritte/Tag, +500 pro Woche, Warnzeichen), Info „Wann zum Arzt“ (auch einmal vor der ersten Einheit).
- **XP:** Einheit 5, Check 10, beide im Tagesdeckel. Debrief-Zeile „FEET: Stufe x → y · Fersenheben …“. Schema 6.

### Update v4 · Paket 2: TEMPER

- **Eigener Bereich**, unabhängig von den Arcs: 5–10 Minuten für den Geist. Karte auf Heute unter der Tagesmission, Klingen-Emblem neben dem Rang (schärfer mit jeder Stufe).
- **Buch I – ERWACHEN** (Stufe HEAT, 30 Episoden) aus `docs/temper-geschichten.md`: Story → getaktete Übung → „Wie klar bist du jetzt? 1–5“. Bausteine: Regler (eine Runde Wim Hof bzw. 4 s ein / 6–8 s aus), Klinge (Zählen mit Abschweif-Taps), ECHO-Scan (mit deinem Namen und deiner ECHO-Beschreibung aus Episode 11), Welle, CO2-Test, Innenkarte, 3-Atemzüge-Reset. Jeder Baustein erklärt kurz, was er körperlich bewirkt.
- **Freischaltung pro gemachter Episode**, keine Serien, keine Strafen. Einsätze: Verlangen (ab Ep. 9), NSDR (15), Stress/Wut (18), Einschlafen (22), Vor dem Kampf (26). Schlaf 1–2 im Check-in → TEMPER schlägt NSDR vor. Ab Ep. 26 optional „Reset?“ in der Satzpause vor dem letzten Satz einer Hauptübung.
- **Messwerte:** Klarheit, CO2-Test (Ep. 5, 25, 30, danach wöchentlich), Abschweif-Taps pro Minute, Retention als ruhige Kurve (ohne XP, Rekord oder Rang), Minuten pro Woche. TEMPER-Zeile im Debrief.
- **Sicherheit:** Bestätigung vor der ersten Wim-Hof-Runde und alle 30 Tage, Hinweis „Nie im oder am Wasser.“
- **Stimme:** optional Gerätestimme (Deutsch, langsam), standardmäßig aus.

### Update v4 · Paket 1: Training, Feedback und Fehler

- **Entfernt (v4-Entscheidung):** SURGE, eigener Wim-Hof-Bereich, Kälte-Log, DAS WARUM, Gelübde, SUNDAY RESET. Atem- und Wim-Hof-Bausteine leben in `js/engine/breath.js` weiter (für TEMPER).
- **Ton und Musik:** `audioSession = ambient`, nur Web Audio, kein HTML-Audio mehr: Signaltöne mischen sich unter Spotify und pausieren es nie. Bei Lautlos-Schalter kein Ton, dafür immer ein großes visuelles Signal (Bildschirm-Blitz, blinkende Timer-Zahl). Vibration komplett entfernt.
- **RPE 1–10** nach der letzten Serie jeder Übung (ersetzt Belastung 1–5, Migration 1→2 … 5→10). Session-Intensität = RPE gewichtet nach Sätzen, Trainingslast = Session-RPE × Minuten.
- **Fixes Gewicht** pro Übung (Schalter „fix“ an der Last): nie mehr Gewicht, stattdessen mehr Wdh. → +1 Satz → langsameres Tempo → schwerere Stufe.
- **Pausenklassen** pro Übung in der Datenbank (`rest`): schwer 150 s · mittel 90 s · leicht 60 s · explosiv 90 s · Aufwärmen 30 s, Runden 60 s. +30 s nach Top-Satz oder RIR 0. ±15 s im Pausen-Timer, gemerkt pro Übung.
- **Vollbild-Timer** für Zeit-, Je-Seite- (Seite 1 → 5 s Wechsel → Seite 2 → dann Pause) und Runden-Übungen. Wiederholungs-Übungen je Seite mit Feldern links/rechts.
- **Tauschen:** empfohlen → gleiche Kategorie → alle Übungen mit Suche, jede wählbar.
- **Progressionsleitern** (`js/data/ladders.js`): 2 Einheiten in Folge oben mit RIR ≥ 2 → Vorschlag „Jetzt“ / „Ab dem nächsten Arc“ / „Nicht jetzt“. 2× unteres Ende verfehlt → Vorschlag leichter. In der Übungskarte jederzeit ▼▲.
- **XP:** TEMPER 15, Buchabschluss 150, Tagesdeckel für TEMPER + FLOW 40.

### Update v3 · Paket 1: Feedback V5

- **Arc-Woche anteilig:** Startet der Arc mitten in der Woche (oder endet der Feiertagsmodus), zählt die angebrochene Woche mit 5+ verfügbaren Tagen 2 Missionen, sonst 1. Arc I wurde per Migration auf den Tag deiner ersten Mission gelegt. Im Profil gibt es „Arc-Woche manuell abschließen“ (wird im Regel-Protokoll vermerkt).
- **Ton auf dem iPhone:** Audio wird beim ersten Tap freigeschaltet, `audioSession = playback` (Signal auch bei Stummschalter, wo iOS es erlaubt), Fallback über ein HTML-Audio-Element, dazu ein violetter Bildschirm-Puls. Vibration gibt es in iPhone-Web-Apps nicht. „Ton testen“ in Profil → Setup zeigt, was auf deinem Gerät geht.
- **Satz-Logging:** „Letztes Mal“ pro Satz (Gewicht × Wdh.), RIR-Chips 0 · 1 · 2 · 3 · 4+ nach jedem Satz (vorausgewählt mit dem Ziel der Arc-Woche), Belastung 1–5 nach der letzten Serie. Die Progression nutzt das echte RIR: deutlich zu leicht → früher steigern, RIR 0 statt 2 → nicht steigern.
- **Tauschen:** „Nur für heute“ (Arc-Plan und Progression der Originalübung bleiben unberührt) oder „Für den Rest des Arcs“.
- **Timer in der Karte:** Zeit- und Runden-Übungen (Holds, Carries, Seil, Sack) mit Start/Stopp, Countdown, Signal; die echte Zeit wird geloggt. **Norwegian 4x4:** 3 min warm → 4 × (4 hart · 3 aktiv) → 3 min aus, Signal bei jedem Phasenwechsel, danach RPE pro Intervall und optional Meter/Notiz. Alle Uhren laufen über Zeitstempel und stimmen auch nach dem Hintergrund.
- **Session-Auswertung:** Dauer (Lücken über 30 min werden einmal nachgefragt), Intensität (Belastung gewichtet nach Sätzen), Trainingslast = Intensität × Minuten. Wochensumme im Wochenrückblick, Arc-Summe im Debrief. Nur Anzeige, keine Regeln.
- **Verlauf** (Profil): alle Einheiten mit Details (Sätze, RIR, Belastung, Tausch, Ellbogen), Filter nach Mission, Arc und Übung, Kurve pro Übung.
- **Unterwegs / Hotel:** Check-in-Option mit Häkchen für Kurzhanteln, Laufband, Widerstandsband, Bank/Stuhl. Jede Übung wird durch eine mit gleichem Muster ersetzt, zählt voll für die Rotation, Progression getrennt (`travel:`). Der Zirkel-Platz wird zum **HOTEL**-Zirkel ohne Geräte.
- **ARENA:** Inhalte (Technik, Pratzen, Sack, Clinch, Sparring, Kondition), Sparringsrunden, Fokus/Notiz. Neuer Tab **Status**: Einheiten, Stunden, Sparringsrunden, Inhalte, pro Monat und Arc, Technik-Radar (monatlicher Technik-Check, aktueller vs. vorheriger Monat). Auch im Debrief.
- **XP neu** (zentral in `js/data/xp-config.js`): Mission 100, QUICK STRIKE 70, SHADOWSTEP 40, ARENA 80, FLOW 20, Wochenziel +100, Bestleistung +25, Boss +500. Nebenquellen zusammen max. 60 XP pro Tag. Ränge: BLADE 3.000 · WARDEN 9.000 · PHANTOM 21.000 · UMBRA 45.000 · Unzerbrechlich 90.000. Alte XP wurden per Migration neu berechnet (der alte Wert bleibt als `xpV2` im Export). „XP pro Quelle“ pro Woche und Arc im Profil und im Debrief-Export.

### Update v2 · Paket 3: Lore, UI und Gamification

- **Namen:** Missionen ASCENT (A), BEDROCK (B), IMPACT (C), INFILTRATION (D), QUICK STRIKE (Kompakt), SHADOWSTEP (15 min), FLOW (Mobility), ARENA (Muay Thai), FORGE (Home Gym). Arcs: IRONROOT, IGNITION, ENDLESS NIGHT, STILL WATER. Titel und Eigennamen englisch, alle Texte deutsch. Erzähler ist das System, ernst und knapp.
- **Ränge:** SHADE → BLADE → WARDEN → PHANTOM → UMBRA → Unzerbrechlich, je mit eigenem SVG-Emblem und Wächter-Stufe (guardian-0 … 5). Attribut-Ränge E–S.
- **Bosse:** TORPOR, FRACTURE, HOLLOW, RIGOR mit Lebensbalken. Fällt der Boss vor Woche 6: Siegsequenz. Steht er in der Deload-Woche noch: Rückzug („Er wird wiederkommen.“). **Nemesis THE PLATEAU** erscheint bei Stagnation Stufe 2 und verschwindet nach abgeschlossener Deload-Woche.
- **Arc-Intro** (Karte auf „Heute“, 5 Panels: Welt, Boss, Konfrontation, Trainingsinhalt, Zitat) und **Debrief** (Panels mit deinen echten Zahlen: Boss-Ausgang, Konstanz, Kraft, Mobility, Körpersignale, Zitat; danach 3 Fragen und Export).
- **Freischaltbares:** Chronik im Kodex (neue Übungen, Rekorde, Bosse), Ascensions inkl. IRON GRIP (Dead Hang 90 s), ECLIPSE FORM (erster Boss besiegt), UNBROKEN (4 Arcs), Titel zum Ausrüsten (z. B. „Der Unermüdliche“, „Der Geduldige“, „Der Zurückgekehrte“).
- **Zitate:** nur mit sicher belegter Quelle (Marc Aurel, Seneca, Epiktet, Jocko Willink, David Goggins). Erscheinen im Intro, im Debrief und nach jeder dritten Mission. In Setup ausblenden oder eigene hinzufügen.
- **Startbildschirm:** oben Check-in bzw. Mission, darunter klein Rang, Kampfkraft, Boss-Lebensbalken, Arc-Woche.
- **Feedback:** Vibration bei erledigtem Satz, Pausenende und Rang-Aufstieg, Ton beim Pausenende, beides abschaltbar. Auf dem iPhone gibt es keine Vibrations-Schnittstelle. Die App nutzt dort den haptischen Klick des iOS-Schalters (ab iOS 18). Der funktioniert nur direkt beim Antippen, also beim erledigten Satz und beim Aufstieg, nicht beim zeitgesteuerten Pausenende.

### Update v2 · Paket 2: Körpersignale und Auswertung

- **Ellbogen:** Jede Übung hat `elbowLoad` (0 keine, 1 mittel, 2 hoch). Melden im Check-in („Ellbogen zwickt?“) oder im Training: Der Tap „Ellbogen gezwickt“ erscheint nur bei Übungen mit Ellbogenlast, nach dem ersten Satz. Zähler über 7 Tage, voll ab 3 Meldungen (Profil → Setup änderbar). Bei vollem Zähler ersetzt die App Übungen mit hoher Ellbogenlast (Kettlebell Hammer Curls statt Goblet Curls, Single-Arm Cable Row statt schwerer Rows, bei Dips weniger Zusatzgewicht). „Heute ohne Anpassung“ lehnt das für den Tag ab. Nach 3 Wochen in Folge mit vollem Zähler einmal der Hinweis, es von einem Physio anschauen zu lassen.
- **Ellbogen-Prehab** fest in A und C (unter 3 Minuten): Forearm Pronation & Supination, Eccentric Wrist Extensions, Dead Hang, mit Progression. Nicht im Kompakt-Modus.
- **Zwick-Melder:** optional im Check-in, Körperkarte mit 7 Regionen. Eine markierte Region gilt 7 Tage: Übungen mit Last auf dieser Region werden durch Varianten mit gleichem Muster ersetzt, sonst steht „nur locker und schmerzfrei, notfalls weglassen“ dabei. Muster wie „Knie meldet sich 2 Tage nach Box Jumps (2×)“ erscheinen im Wochenrückblick und im Debrief.
- **Side Quest:** aus den Glyph-Lücken der Vorwoche, nie zweimal hintereinander dieselbe.
- **Wochenrückblick** (sonntags, montags noch für die Vorwoche): Einsätze, Verteilung High/Normal/Low, Ellbogen-Zähler, gemeldete Regionen, Stagnation, Boss-Lebensbalken, Muster. Dazu 2 Taps: Spaß 1–5, Belastung 1–5.
- **Boss-Lebensbalken:** 15 Lebenspunkte (3 Einsätze × 5 Wochen). Schaden: Mission 1, Kompakt 0,6, Kurzeinsatz 0,3, Arena 0,5, Bestleistung +0,5. Heilt nie, die Deload-Woche zählt nicht.
- **Arc-Debrief** (in Woche 6 und bis 3 Wochen nach Arc-Ende): Zahlen des Arcs, 3 Fragen, Export als JSON für den Coach (alle Logs des Arcs, Antworten, Wochenrückblicke, Regel-Protokoll, Einstellungen).

### Lore-Bilder

- Ablage: `assets/lore/` als WebP, Namen laut `docs/umbra-bild-prompts.md`, max. ca. 300 KB pro Bild. Prüfen mit `python3 tools/check_lore.py` (Name, Größe, Format, was noch fehlt).
- Die Originale aus Firefly liegen in `lore-originale/` und werden **nicht** hochgeladen. Für die App werden sie auf WebP-Qualität 86 verkleinert (gleiche Pixelmaße, etwa 25–200 KB statt 0,7–2 MB, sichtbar gleich).
- Fehlt ein Bild, zeigt die App einen SVG-Platzhalter (dunkle Silhouette, violetter Rand). Bilder laufen an den Kanten weich in den Hintergrund #0B0A10 aus.
- Offline: Der Service Worker lädt die Lore-Bilder in einen eigenen Cache. Fehlende Bilder brechen nichts. Neu hochgeladene Bilder holt er bei jedem App-Start mit Netz automatisch nach, dafür musst du nichts an der Version ändern.
- Wächter-Stufe je Gesamtrang (bis Paket 3: E→0, D→1, C→2, B→3, A/S→4, Unzerbrechlich→5), Ascension-Aura als Leuchtebene. Boss-Zustände per Effekt: angeschlagen (Risse nach Lebensbalken, Entsättigung), besiegt (grau, goldene Risse, Zerfall), Rückzug (verblasst).
- Vorschau aller Bilder und Zustände: **Kodex → Archiv** (zeigt auch, welche Datei vorhanden ist und wie groß).

### Update v2 · Paket 1: Arcs und Trainingslogik

- **Arcs (6 Wochen):** IRONROOT (I) → IGNITION (II) → ENDLESS NIGHT (III) → STILL WATER (IV), dann von vorn. Eine Kalenderwoche schiebt den Arc nur weiter, wenn darin 2 volle Missionen stattfanden (Kompakt zählt, Kurzeinsatz nicht). RIR-Ziel: Woche 1 → 3, 2–3 → 2, 4–5 → 1 (letzter Satz darf ans Versagen), Woche 6 = Deload (halbe Sätze) und Mobility-Re-Test. Ersetzt den alten Deload-Zähler.
- **Varianten** wechseln nur beim Arc-Wechsel: Hauptübungen zur vorgemerkten Stufe, Nebenplätze mit Variantenliste rotieren. Ausnahme: Stagnation Stufe 1.
- **Belastungsklassen:** High (hartes Sparring, B, FORGE, 4x4), Normal (A, C, D), Low (Technik, D leicht, Kurzeinsatz, Kompakt, Fluss). Zwei High-Tage in Folge: nur Hinweis mit Empfehlung 30 min (seit 22.10.2026).
- **Neue Check-in-Option „Nur 30 Minuten“** = QUICK STRIKE: Hauptübungen, je 2 Sätze, zählt für Rotation und Arc-Woche.
- **FORGE = 5. Platz der Rotation** (nur im Home Gym, seit 22.10.2026; vorher ersetzte FORGE jeden Home-Gym-Tag). Kontrastpaar Barbell Deadlift ↔ Vertical Jump, Push Press bzw. Barbell Bench Press, Single-Arm Dumbbell Row, Explosive Step-ups, in Arc III plus Rowing 4x4.
- **Arc II:** Kontrastpaare (schwer ↔ explosiv) und Top-Satz + Backdown (−18 %), Progression nur über den Top-Satz. **Arc III:** 4x4 ersetzt einmal pro Woche D. **Arc IV:** ein Satz weniger, belastete Mobility (Copenhagen Plank, Long Lunge Hold, Kettlebell Windmill …).
- **Plyo-Stufen 1–5** je Arc-Woche auf dem Sprungplatz von B. Steht Stufe 4–5 an, fragt die App, ob morgen hartes Sparring geplant ist, dann bleibt es bei Stufe 3.
- **Stagnation:** Stufe 1 (eine Übung: 3 Einheiten ohne Fortschritt oder 2× unter Arc-Bestwert) → Vorschlag Variante. Stufe 2 (≥ 3 Muster) → Vorschlag Deload-Woche. Nicht in Woche 1 und nicht in den ersten 2 Einheiten nach einer Pause.
- **Pausen:** 1–4 Tage normal, 5–7 Tage die am längsten liegende Mission (Rotation läuft ab dort weiter), 8–14 zusätzlich −10 % und ein Satz weniger, 15+ zwei Einheiten −20 % ohne Versagen, die Arc-Woche wird wiederholt.
- **Feiertagsmodus** (Standard 21.12.–03.01., in Setup änderbar): Arc pausiert, Wochenziel 2, Kurzeinsatz, Kompakt und Fluss zählen voll, keine Pausenlogik.
- **Regel-Protokoll:** Empfehlungen und deine Entscheidungen werden mitgeschrieben (für den Arc-Debrief in Paket 2).
- **Migration:** Bestehende Daten werden beim ersten Start automatisch auf Schema 2 gehoben. Log, Rekorde, Gewichte, Check-ins und Mobility bleiben erhalten, Arc I startet in der Woche des Updates.

### Pausen, Deload, Progression (Basis aus Phase 1)

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
- Tests: <http://localhost:8765/tests/index.html> (zeigt „194/194 grün“)

**Nach jeder Code-Änderung** `python3 tools/build_sw.py` ausführen. Das Skript zählt die Version in `sw.js` hoch (aktuell `umbra-v10`) und trägt alle Dateien ein. Sonst zeigt das iPhone die alte Version aus dem Cache.

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
   `index.html`, `manifest.webmanifest`, `sw.js`, `README.md`, `.gitignore`, `assets`, `css`, `fonts`, `icons`, `js`, `tests`, `tools`.
   **Nicht** hochladen: `reference/` (das Buch), `lore-originale/` (unkomprimierte Bilder), `.claude/`.
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

1. Vorher in der App exportieren (Profil → Setup → Exportieren).
2. Geänderte Dateien wie in Schritt 3 hochladen. Die Version in `sw.js` zählt `tools/build_sw.py` hoch, sie steht auch in `js/version.js` und oben in `css/app.css`.
3. Gelöschte Dateien auf GitHub einzeln löschen (Hochladen überschreibt nur, entfernt nie).
4. **2–3 Minuten warten**, bis GitHub Pages fertig ist (Repo → Actions: grüner Haken).
5. Auf dem iPhone die App öffnen, ganz schließen, wieder öffnen.
6. Sieht etwas komisch aus: **Profil → Setup → App-Dateien neu laden**. Startet die App gar nicht, erscheint nach 6 Sekunden derselbe Knopf. Deine Daten bleiben dabei immer erhalten.

Hintergrund: Der Service Worker holt beim Update jede Datei frisch vom Server und liefert nur aus dem Cache der eigenen Version. Passen JavaScript- und CSS-Stand trotzdem nicht zusammen, repariert sich die App beim Start einmal selbst.

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
