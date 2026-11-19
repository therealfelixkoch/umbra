// Lore als Daten: Saison-Geschichte (BANG COMBAT), Nemesis, Codex-Vorlagen, Titel und Zitate.
// Erzähler: kurz, ernst, ohne Ausrufezeichen, ohne Schuld. Platzhalter {…} füllt die Engine mit echten Zahlen.

/**
 * BANG COMBAT · Saison-Geschichte (Stand 19.11.2026, Entscheid Felix: keine Gegner, keine Endbosse).
 * Erzählt wird der Fighter selbst: wo er steht, was ihn erwartet, wohin es nach der Saison geht.
 * Schlüssel = Saison-id aus js/data/arcs.js. Ein Kapitel = 15 Einheiten (A → B → C), kein Kalender.
 *   sub       Saison-Unternamen (IRON · STRIKE · FIGHT · RESET)
 *   now       Saisonstart: wo du stehst
 *   ahead     Saisonstart: was dich erwartet (je Kapitel ein Satz)
 *   goal      Saisonstart: wohin es nach dieser Saison geht
 *   chapters  je Kapitel: start (eine Zeile beim Kapitelstart), done (Abschluss nach Einheit 15)
 *   done      Saisonende: Rückblick und Übergang zur nächsten Saison (next)
 *   codex     Kodex-Eintrag der Saison
 * Platzhalter: {einheiten} Kraft-Einheiten im Kapitel bzw. in der Saison · {muaythai} Muay-Thai-Einheiten
 *   in der Saison. Fehlt ein Wert, bleibt die Stelle leer, darum stehen
 *   Zahlen immer in eigenen Sätzen.
 * Optional zum Kapitelende: freiwilliger Vergleichstest (BENCH_TEXT), nie Pflicht, kein Sieg, keine Niederlage.
 */
export const SEASON_STORY = {
  WINTER: {
    sub: 'IRON', theme: 'Fundament und Kraft', next: 'SPRING',
    now: ['Der Herbst hat Gelenke und Sehnen beruhigt. Die Basis ist da. Die Kraft noch nicht.'],
    ahead: ['Kapitel 1 · Fundament: mehr Wiederholungen, saubere Technik, die richtigen Gewichte finden.',
      'Kapitel 2 · Kraft: weniger Wiederholungen, mehr Last. Schwerer werden, ohne zu hetzen.'],
    goal: ['Am Ende des Winters ist mehr Kraft da als im Herbst. Der Frühling macht daraus Schlagkraft.'],
    chapters: [
      { start: 'Kapitel 1 · Fundament. Erst die Technik, dann die Last.',
        done: ['Das Fundament steht. Die Bewegungen sitzen, die Gewichte sind gefunden.', '{einheiten} Einheiten in diesem Kapitel.'] },
      { start: 'Kapitel 2 · Kraft. Jetzt wird es schwer.',
        done: ['Die Kraft ist gewachsen. Sie bleibt, auch wenn das Training sich ändert.', '{einheiten} Einheiten in diesem Kapitel.'] },
    ],
    done: ['IRON ist durch. {einheiten} Einheiten Kraft, {muaythai} Mal Muay Thai.', 'Als Nächstes: STRIKE. Aus Kraft wird Schnelligkeit.'],
    codex: 'IRON ist der Winter von BANG COMBAT. Wenig Licht, wenig Antrieb, darum ein klarer Auftrag: Kraft aufbauen. Erst das Fundament mit mehr Wiederholungen, dann schwere Sätze mit wenigen. Kraft ist die Grundlage für alles, was danach kommt.',
  },
  SPRING: {
    sub: 'STRIKE', theme: 'Schnellkraft und Kondition', next: 'SUMMER',
    now: ['Aus dem Winter bringst du Kraft mit. Noch ist sie langsam.'],
    ahead: ['Kapitel 1 · Kontrast: nach dem schweren Satz ein Sprung oder Wurf im selben Muster. Kraft wird schnell.',
      'Kapitel 2 · Motor: kurze, harte Intervalle. Schläge, die auch in späten Runden noch sitzen.'],
    goal: ['Am Ende des Frühlings ist aus Kraft Schnellkraft geworden, und der Atem hält länger. Der Sommer macht daraus Kampfform.'],
    chapters: [
      { start: 'Kapitel 1 · Kontrast. Schwer, dann schnell.',
        done: ['Die Kraft ist schneller geworden. Sprünge und Würfe sitzen.', '{einheiten} Einheiten in diesem Kapitel.'] },
      { start: 'Kapitel 2 · Motor. Hart, kurz, wiederholt.',
        done: ['Der Motor läuft länger. Die späten Runden werden leichter.', '{einheiten} Einheiten in diesem Kapitel.'] },
    ],
    done: ['STRIKE ist durch. {einheiten} Einheiten, {muaythai} Mal Muay Thai.', 'Als Nächstes: FIGHT. Aus Schlagkraft wird Kampfform.'],
    codex: 'STRIKE ist der Frühling von BANG COMBAT. Die Kraft aus dem Winter wird schnell: Kontrastpaare aus schwerem Satz und explosiver Bewegung, danach harte Intervalle für die Kondition. Ziel ist Schlagkraft, die bis in die späten Runden hält.',
  },
  SUMMER: {
    sub: 'FIGHT', theme: 'Athletik und Ausdauer', next: 'AUTUMN',
    now: ['Kraft und Schnellkraft sind da. Jetzt zählt, wie du dich bewegst.'],
    ahead: ['Kapitel 1 · Athletik: einbeinig, seitlich, schnelle Richtungswechsel. Die Kraft wird mit weniger Sätzen gehalten.',
      'Kapitel 2 · Ausdauer: harte Intervalle und lockere, lange Einheiten draußen.'],
    goal: ['Am Ende des Sommers bist du leicht, beweglich und hältst lange Runden durch. Danach brauchen Gelenke und Sehnen Ruhe.'],
    chapters: [
      { start: 'Kapitel 1 · Athletik. Leicht auf den Füßen.',
        done: ['Die Füße sind schneller geworden, die Richtungswechsel sauberer.', '{einheiten} Einheiten in diesem Kapitel.'] },
      { start: 'Kapitel 2 · Ausdauer. Lange tragen, was du aufgebaut hast.',
        done: ['Die Ausdauer trägt. Die Kraft ist geblieben.', '{einheiten} Einheiten in diesem Kapitel.'] },
    ],
    done: ['FIGHT ist durch. {einheiten} Einheiten, {muaythai} Mal Muay Thai.', 'Als Nächstes: RESET. Der Körper holt auf.'],
    codex: 'FIGHT ist der Sommer von BANG COMBAT. Die Kraft wird mit wenig Aufwand gehalten, der Schwerpunkt liegt auf Athletik und Ausdauer: einbeinig, seitlich, schnell, dazu Intervalle und lockere Einheiten draußen. Ziel ist Kampfform.',
  },
  AUTUMN: {
    sub: 'RESET', theme: 'Gelenke, Beweglichkeit, Basis', next: 'WINTER',
    now: ['Drei Saisons Last stecken in Gelenken und Sehnen. Jetzt holen sie auf.'],
    ahead: ['Kapitel 1 · Reset: weniger Sätze, langsames Ablassen, Beweglichkeit unter Last.',
      'Kapitel 2 · Basis: höhere Wiederholungen, saubere Technik, wieder normale Satzzahl.'],
    goal: ['Am Ende des Herbstes sind die Gelenke frei und die Technik sauber. Darauf baut der nächste Winter neue Kraft.'],
    chapters: [
      { start: 'Kapitel 1 · Reset. Langsam ist hier richtig.',
        done: ['Die Gelenke sind ruhiger, die Positionen tiefer.', '{einheiten} Einheiten in diesem Kapitel.'] },
      { start: 'Kapitel 2 · Basis. Saubere Wiederholungen für den Winter.',
        done: ['Die Basis für den Winter steht.', '{einheiten} Einheiten in diesem Kapitel.'] },
    ],
    done: ['RESET ist durch. {einheiten} Einheiten, {muaythai} Mal Muay Thai.', 'Als Nächstes: IRON. Ein neues Jahr Kraft.'],
    codex: 'RESET ist der Herbst von BANG COMBAT. Nach drei Saisons Last bekommen Gelenke und Sehnen Zeit: weniger Sätze, langsames Tempo, belastete Mobility. Danach legen höhere Wiederholungen die Basis für den nächsten Winter.',
  },
};

/** Freiwilliger Vergleichstest am Kapitelende (nach Einheit 15). Wegklickbar, kein Sieg, keine Niederlage. */
export const BENCH_TEXT = {
  offer: ['Kapitel geschafft. Wenn du willst: ein Vergleichstest.', 'Dasselbe Workout wie beim letzten Mal. Nur um zu sehen, wo du stehst.'],
  first: ['Erster Wert. Ab jetzt gibt es einen Vergleich.'],
  better: ['{diff} besser als beim letzten Mal.'],
  same: ['Etwa wie beim letzten Mal. Gehalten ist auch ein Ergebnis.'],
  lower: ['Diesmal etwas weniger. Tagesform, Schlaf und Muay Thai spielen mit. Der Wert ist ein Blick, kein Urteil.'],
};

// ——— Veraltet (seit 19.11.2026): Saison-Gegner COLDIRON, STORMLUNG, SCORCH, WITHER ———
// Felix hat entschieden: Die Gegner fallen ganz weg. Die Einträge bleiben nur, bis js/engine/story.js und die
// Screens auf SEASON_STORY umgestellt sind (sonst bricht der Import). Danach löschen. Nicht mehr erweitern.
// THE PLATEAU (unten im selben Objekt) bleibt, sanft formuliert.
export const BOSS_LORE = {
  coldiron: {
    epithet: 'Der Koloss aus gefrorenem Eisen',
    weakness: 'Er macht dich schwach und träge, wenn es draußen dunkel wird. Er weicht nur der Kraft.',
    world: ['Eine Schmiede, in der das Feuer erloschen ist. Raureif auf dem Amboss.', 'Der Winter ist lang. Hier wird Kraft gesammelt.'],
    confront: ['COLDIRON hebt den Kopf. Eis splittert von seinen Schultern.', 'Kein Sprint. Schwerer werden, Woche für Woche.'],
    victory: ['COLDIRON bricht in kalte Splitter.', '{missions} Missionen. Das Eisen gehört jetzt dir.'],
    retreat: ['COLDIRON zieht sich ins Eis zurück. Angeschlagen, nicht gebrochen.', 'Er wird wiederkommen. Stärker. Du auch.'],
    codex: 'COLDIRON ist die Schwäche des Winters: wenig Licht, wenig Antrieb. Er verliert gegen Kraft, die Woche für Woche wächst, ohne Hast und ohne Pause.',
  },
  stormlung: {
    epithet: 'Der Sturm, der dir die Luft nimmt',
    weakness: 'Er wartet bis Runde drei. Dann nimmt er dir den Atem, und die Hände sinken.',
    world: ['Eine Küste im Frühjahrssturm. Regen fällt waagerecht.', 'Wer hier stehen bleibt, verliert. Wer atmet, bleibt.'],
    confront: ['STORMLUNG reißt am Wächter. Der Wächter atmet tief und geht weiter.', 'Schnell, dann ausdauernd. Runde um Runde.'],
    victory: ['Der Sturm legt sich. STORMLUNG zerfällt in Nebel.', '{arena} ARENA-Abende. Der Atem gehört wieder dir.'],
    retreat: ['STORMLUNG zieht weiter, aber leiser.', 'Er wird wiederkommen. Die nächste Runde auch.'],
    codex: 'STORMLUNG ist der Einbruch unter Druck: späte Runden, schwere Arme, kurzer Atem. Er verliert gegen schnelle Kraft und einen Motor, der lange läuft.',
  },
  scorch: {
    epithet: 'Die Hitze, die dich schwer macht',
    weakness: 'Er macht dich langsam und schwerfällig. Jeder Schritt kostet mehr, als er sollte.',
    world: ['Eine Ebene aus glühendem Stein. Die Luft flimmert.', 'Leicht sein, schnell sein. Oder brennen.'],
    confront: ['SCORCH umkreist den Wächter. Der Boden glüht unter seinen Füßen.', 'Springen, laufen, beweglich bleiben.'],
    victory: ['SCORCH erlischt zu Asche.', '{records} Bestleistungen. Leicht und schnell, mitten in der Hitze.'],
    retreat: ['SCORCH sinkt zurück in den Stein. Die Glut bleibt.', 'Er wird wiederkommen. Bleib leicht.'],
    codex: 'SCORCH ist Schwerfälligkeit: zu viel Gewicht, zu wenig Tempo, keine Luft. Er verliert gegen Athletik, Sprünge und Ausdauer.',
  },
  wither: {
    epithet: 'Das Verwelken in den Gelenken',
    weakness: 'Er legt sich unbemerkt um Gelenke und Sehnen und zieht langsam zu.',
    world: ['Ein Wald im späten Herbst. Äste knacken bei jeder Bewegung.', 'Hier wird nicht gekämpft. Hier wird repariert.'],
    confront: ['WITHER kriecht über die Gelenke des Wächters.', 'Tief, langsam, unter Last. Die Starre gibt nach.'],
    victory: ['WITHER zerfällt zu trockenem Laub.', '{flow} Tage FLOW. Nichts hält dich mehr fest.'],
    retreat: ['WITHER zieht sich in den Boden zurück.', 'Er wird wiederkommen. Bleib beweglich.'],
    codex: 'WITHER ist Verschleiß: Steifheit und kleine Schmerzen, die sich festsetzen. Er verliert gegen Beweglichkeit unter Last und eine Saison, die dem Körper Zeit gibt.',
  },
  plateau: {
    // Bleibt (Felix, 19.11.2026), aber sanft: ein Hinweis bei Stillstand, kein Kampf. Er verblasst nach der leichten Phase.
    epithet: 'Der Stillstand',
    weakness: 'Er kommt, wenn mehrere Muster gleichzeitig stehen bleiben. Das ist normal und kein Fehler.',
    appears: ['THE PLATEAU taucht auf. Mehrere Muster stehen gerade still.', 'Mehr Härte hilft hier nicht. Ein paar leichte Einheiten schon.'],
    fades: ['THE PLATEAU verblasst.', 'Die leichten Einheiten sind durch. Es geht wieder nach oben.'],
    codex: 'THE PLATEAU zeigt sich, wenn mehrere Bewegungsmuster gleichzeitig stillstehen. Das passiert jedem, der lange trainiert. Mehr Härte vertreibt ihn nicht, eine leichte Phase schon. Danach verblasst er von selbst.',
  },
};

// Codex-Vorlagen für Übungen und Rekorde (Varianten werden per Hash gewählt)
export const CODEX_EXERCISE = [
  'Eintrag: {name}. Neues Bewegungsmuster erfasst: {pattern}. {mt}',
  'Eintrag: {name}. Das System registriert die erste Ausführung. Muster: {pattern}. {mt}',
  'Eintrag: {name}. Ein weiteres Werkzeug im Arsenal des Wächters. {mt}',
];
export const CODEX_RECORD = [
  'Rekord: {name}, {value}. Die Messlatte liegt höher. Die nächsten Ziele werden angepasst.',
  'Rekord: {name}, {value}. Gemessen und gespeichert. Der alte Wert existiert nicht mehr.',
  'Rekord: {name}, {value}. Eine Grenze wurde verschoben. Das System notiert es ohne Kommentar.',
];

// Titel zum Ausrüsten: „Der Wächter · {Titel}“
export const TITLES = [
  { id: 'unermuedlich', name: 'Der Unermüdliche', desc: '12 gute Wochen (2× Gym und 1× Muay Thai), egal wann' },
  { id: 'geduldig', name: 'Der Geduldige', desc: 'Die leichten Einheiten 13–15 eines Kapitels gemacht' },
  { id: 'zurueckgekehrt', name: 'Der Zurückgekehrte', desc: 'Wiedereinstieg nach 15 oder mehr Tagen' },
  { id: 'arenagaenger', name: 'Der Arenagänger', desc: '25 ARENA-Einheiten' },
  { id: 'geschmeidig', name: 'Der Geschmeidige', desc: 'Mobility im Schnitt über 70' },
  { id: 'eisern', name: 'Der Eiserne', desc: '50 Einheiten, die Kurzversion zählt mit' },
];

/**
 * Zitate über Härte, Disziplin und Durchhalten. Nur nachweislich zugeordnete Zitate mit Quelle.
 * text = deutsche Fassung (eigene Übersetzung), original = Original, falls Latein oder Englisch.
 */
// Zitate mit Quelle. cat: bibel, suntzu, kaempfer, krieger, stoa. Nur belegte Zitate; wo nur der Sinn überliefert ist,
// steht das in der Quelle. Bibel nach Luther 1912 (gemeinfrei), Sun Tzu und Musashi eigene Übersetzung gemeinfreier Fassungen.
export const QUOTE_CATS = { bibel: 'Bibel', suntzu: 'Sun Tzu', kaempfer: 'Kämpfer', krieger: 'Krieger', stoa: 'Stoiker' };
export const QUOTES = [
  // Stoiker
  { id: 'ma-5-20', cat: 'stoa', person: 'Marc Aurel', source: 'Selbstbetrachtungen, Buch V, 20',
    text: 'Was dem Handeln im Weg steht, treibt das Handeln voran. Was im Weg steht, wird zum Weg.' },
  { id: 'ma-4-49', cat: 'stoa', person: 'Marc Aurel', source: 'Selbstbetrachtungen, Buch IV, 49',
    text: 'Sei wie das Vorgebirge, an dem sich die Wellen ohne Ende brechen. Es steht fest, und um es herum legt sich das Toben des Wassers.' },
  { id: 'ma-10-16', cat: 'stoa', person: 'Marc Aurel', source: 'Selbstbetrachtungen, Buch X, 16',
    text: 'Hör auf zu reden, wie ein guter Mensch sein sollte. Sei einer.' },
  { id: 'ma-7-61', cat: 'stoa', person: 'Marc Aurel', source: 'Selbstbetrachtungen, Buch VII, 61',
    text: 'Die Lebenskunst gleicht mehr der Ringkunst als der Tanzkunst: bereit stehen und fest gegen das, was unerwartet kommt.' },
  { id: 'sen-13-4', cat: 'stoa', person: 'Seneca', source: 'Briefe an Lucilius, 13, 4', original: 'Saepius opinione quam re laboramus.',
    text: 'Wir leiden öfter in der Vorstellung als in der Wirklichkeit.' },
  { id: 'sen-71-3', cat: 'stoa', person: 'Seneca', source: 'Briefe an Lucilius, 71, 3', original: 'Ignoranti, quem portum petat, nullus suus ventus est.',
    text: 'Wer nicht weiß, welchen Hafen er ansteuert, für den ist kein Wind der richtige.' },
  { id: 'sen-herc-437', cat: 'stoa', person: 'Seneca', source: 'Hercules furens, 437', original: 'Non est ad astra mollis e terris via.',
    text: 'Es gibt keinen bequemen Weg von der Erde zu den Sternen.' },
  { id: 'epi-ench-1', cat: 'stoa', person: 'Epiktet', source: 'Handbüchlein der Moral, 1',
    text: 'Einiges steht in unserer Macht, anderes nicht.' },
  { id: 'epi-diss-1-24', cat: 'stoa', person: 'Epiktet', source: 'Lehrgespräche, Buch I, 24, 1',
    text: 'Schwierigkeiten sind es, die zeigen, wer einer ist.' },
  { id: 'epi-diss-1-15', cat: 'stoa', person: 'Epiktet', source: 'Lehrgespräche, Buch I, 15, 7',
    text: 'Nichts Großes entsteht plötzlich, nicht einmal eine Traube oder eine Feige.' },
  // Bibel (Luther 1912)
  { id: 'ps-144-1', cat: 'bibel', person: 'Psalm 144, 1', source: 'Lutherbibel 1912',
    text: 'Gelobet sei der HERR, mein Hort, der meine Hände lehrt streiten und meine Fäuste kriegen.' },
  { id: 'ps-18-35', cat: 'bibel', person: 'Psalm 18, 35', source: 'Lutherbibel 1912',
    text: 'Er lehrt meine Hände streiten und meinen Arm den ehernen Bogen spannen.' },
  { id: 'ps-18-30', cat: 'bibel', person: 'Psalm 18, 30', source: 'Lutherbibel 1912',
    text: 'Denn mit dir kann ich Kriegsvolk zerschmeißen und mit meinem Gott über die Mauer springen.' },
  { id: 'jes-40-31', cat: 'bibel', person: 'Jesaja 40, 31', source: 'Lutherbibel 1912',
    text: 'Die auf den HERRN harren, kriegen neue Kraft, daß sie auffahren mit Flügeln wie Adler, daß sie laufen und nicht matt werden, daß sie wandeln und nicht müde werden.' },
  { id: 'jos-1-9', cat: 'bibel', person: 'Josua 1, 9', source: 'Lutherbibel 1912',
    text: 'Siehe, ich habe dir geboten, daß du getrost und freudig seist. Laß dir nicht grauen und entsetze dich nicht.' },
  { id: '1kor-16-13', cat: 'bibel', person: '1. Korinther 16, 13', source: 'Lutherbibel 1912',
    text: 'Wachet, stehet im Glauben, seid männlich und seid stark!' },
  { id: '1kor-9-26', cat: 'bibel', person: '1. Korinther 9, 26–27', source: 'Lutherbibel 1912',
    text: 'Ich laufe aber also, nicht als aufs Ungewisse; ich fechte also, nicht als der in die Luft streicht; sondern ich betäube meinen Leib und zähme ihn.' },
  { id: '2tim-4-7', cat: 'bibel', person: '2. Timotheus 4, 7', source: 'Lutherbibel 1912',
    text: 'Ich habe einen guten Kampf gekämpft, ich habe den Lauf vollendet, ich habe Glauben gehalten.' },
  { id: 'spr-24-10', cat: 'bibel', person: 'Sprüche 24, 10', source: 'Lutherbibel 1912',
    text: 'Der ist nicht stark, der in der Not nicht fest ist.' },
  { id: 'spr-27-17', cat: 'bibel', person: 'Sprüche 27, 17', source: 'Lutherbibel 1912',
    text: 'Ein Messer wetzt das andere und ein Mann den andern.' },
  { id: 'hebr-12-11', cat: 'bibel', person: 'Hebräer 12, 11', source: 'Lutherbibel 1912',
    text: 'Alle Züchtigung aber, wenn sie da ist, dünkt uns nicht Freude, sondern Traurigkeit zu sein; aber darnach wird sie geben eine friedsame Frucht der Gerechtigkeit denen, die dadurch geübt sind.' },
  { id: 'eph-6-13', cat: 'bibel', person: 'Epheser 6, 13', source: 'Lutherbibel 1912',
    text: 'Ergreifet den Harnisch Gottes, auf daß ihr an dem bösen Tage Widerstand tun und alles wohl ausrichten und das Feld behalten möget.' },
  { id: 'pred-9-10', cat: 'bibel', person: 'Prediger 9, 10', source: 'Lutherbibel 1912',
    text: 'Alles, was dir vor Handen kommt, zu tun, das tue frisch.' },
  // Sun Tzu (Die Kunst des Krieges, eigene Übersetzung nach der Fassung von Lionel Giles 1910)
  { id: 'st-3-18', cat: 'suntzu', person: 'Sun Tzu', source: 'Die Kunst des Krieges, III, 18',
    text: 'Kennst du den Feind und kennst du dich selbst, musst du den Ausgang von hundert Schlachten nicht fürchten.' },
  { id: 'st-4-1', cat: 'suntzu', person: 'Sun Tzu', source: 'Die Kunst des Krieges, IV, 1',
    text: 'Die guten Kämpfer machten sich zuerst unbesiegbar und warteten dann auf die Gelegenheit, den Feind zu besiegen.' },
  { id: 'st-4-2', cat: 'suntzu', person: 'Sun Tzu', source: 'Die Kunst des Krieges, IV, 2',
    text: 'Sich gegen die Niederlage zu sichern, liegt in unserer eigenen Hand. Die Gelegenheit zum Sieg liefert der Feind.' },
  { id: 'st-4-15', cat: 'suntzu', person: 'Sun Tzu', source: 'Die Kunst des Krieges, IV, 15',
    text: 'Der siegreiche Krieger sucht den Kampf erst, wenn der Sieg schon errungen ist. Der Unterlegene kämpft zuerst und sucht dann den Sieg.' },
  { id: 'st-6-32', cat: 'suntzu', person: 'Sun Tzu', source: 'Die Kunst des Krieges, VI, 32',
    text: 'Wie das Wasser keine feste Form behält, so gibt es im Kampf keine festen Bedingungen.' },
  { id: 'st-7-19', cat: 'suntzu', person: 'Sun Tzu', source: 'Die Kunst des Krieges, VII, 19',
    text: 'Deine Pläne seien dunkel und undurchdringlich wie die Nacht. Und wenn du dich bewegst, schlage zu wie der Blitz.' },
  { id: 'st-1-18', cat: 'suntzu', person: 'Sun Tzu', source: 'Die Kunst des Krieges, I, 18',
    text: 'Alle Kriegsführung beruht auf Täuschung.' },
  { id: 'st-5-11', cat: 'suntzu', person: 'Sun Tzu', source: 'Die Kunst des Krieges, V, 10–11',
    text: 'Im Kampf gibt es nur zwei Arten des Angriffs, den direkten und den indirekten. Doch ihre Verbindung bringt eine endlose Reihe von Manövern hervor.' },
  // Kämpfer (nur mit belegbarer Quelle; „überliefert“, wo der genaue Wortlaut nicht gesichert ist)
  { id: 'tyson-1987', cat: 'kaempfer', person: 'Mike Tyson', source: 'zu Reportern vor dem Kampf gegen Tyrell Biggs, AP, August 1987',
    original: 'Everybody has plans until they get hit for the first time.', text: 'Jeder hat Pläne, bis er zum ersten Mal getroffen wird.' },
  { id: 'damato-fear', cat: 'kaempfer', person: 'Cus D’Amato', source: 'Lehre, überliefert von Mike Tyson in „Undisputed Truth“ (2013)',
    original: 'Fear is like fire.', text: 'Angst ist wie Feuer. Sie kann dich wärmen oder dein Haus niederbrennen. Lerne, sie zu kontrollieren.' },
  { id: 'louis-1946', cat: 'kaempfer', person: 'Joe Louis', source: 'vor dem Rückkampf gegen Billy Conn, 1946',
    original: 'He can run, but he can’t hide.', text: 'Er kann rennen, aber er kann sich nicht verstecken.' },
  { id: 'ali-1964', cat: 'kaempfer', person: 'Muhammad Ali', source: 'vor dem Kampf gegen Sonny Liston, Miami 1964 (Zeile von Drew „Bundini“ Brown)',
    original: 'Float like a butterfly, sting like a bee.', text: 'Schweb wie ein Schmetterling, stich wie eine Biene.' },
  { id: 'lee-1971', cat: 'kaempfer', person: 'Bruce Lee', source: 'Interview in „The Pierre Berton Show“, 1971',
    original: 'Be water, my friend.', text: 'Leere deinen Geist, sei formlos, gestaltlos wie Wasser. Sei Wasser, mein Freund.' },
  { id: 'gable-gold', cat: 'kaempfer', person: 'Dan Gable', source: 'aus einem Interview, laut Gable sinngemäß (A Wrestling Life 2, 2017)',
    text: 'Goldmedaillen sind nicht wirklich aus Gold. Sie sind aus Schweiß, Entschlossenheit und einer seltenen Legierung namens Mumm.' },
  { id: 'khabib-father', cat: 'kaempfer', person: 'Abdulmanap Nurmagomedov', source: 'Antwort an Khabib nach einem UFC-Sieg, überliefert von Khabib (Podcast „Hotboxin’“)',
    text: 'Gut gemacht. Wir müssen weiter trainieren.' },
  // Krieger
  { id: 'musashi-water', cat: 'krieger', person: 'Miyamoto Musashi', source: 'Das Buch der fünf Ringe, Buch des Wassers (1645)',
    text: 'Tausend Tage Übung nennt man Schmieden, zehntausend Tage Übung nennt man Polieren.' },
  { id: 'musashi-dokkodo', cat: 'krieger', person: 'Miyamoto Musashi', source: 'Dokkōdō, Regel 6 (1645)',
    text: 'Bereue nicht, was du getan hast.' },
  { id: 'musashi-earth', cat: 'krieger', person: 'Miyamoto Musashi', source: 'Das Buch der fünf Ringe, Buch der Erde (1645)',
    text: 'Aus einer Sache zehntausend Dinge erkennen.' },
  { id: 'roosevelt-arena', cat: 'krieger', person: 'Theodore Roosevelt', source: 'Rede „Citizenship in a Republic“, Sorbonne, Paris, 23. April 1910',
    original: 'The credit belongs to the man who is actually in the arena.', text: 'Die Ehre gehört dem, der wirklich in der Arena steht, das Gesicht voll Staub, Schweiß und Blut.' },
  { id: 'leonidas-molon', cat: 'krieger', person: 'Leonidas', source: 'Antwort an Xerxes bei den Thermopylen, überliefert von Plutarch (Apophthegmata Laconica 225c)',
    original: 'Μολὼν λαβέ', text: 'Komm und hol sie dir.' },
  { id: 'sparta-shield', cat: 'krieger', person: 'Spartanische Mutter', source: 'zum Sohn beim Überreichen des Schildes, überliefert von Plutarch (Moralia 241F)',
    original: 'Ἢ τὰν ἢ ἐπὶ τᾶς.', text: 'Mit ihm oder auf ihm.' },
  { id: 'vegetius', cat: 'krieger', person: 'Vegetius', source: 'Epitoma rei militaris, Buch III, Vorrede', original: 'Igitur qui desiderat pacem, praeparet bellum.',
    text: 'Wer den Frieden wünscht, bereite den Krieg vor.' },
  { id: 'nietzsche-gd', cat: 'krieger', person: 'Friedrich Nietzsche', source: 'Götzen-Dämmerung, Sprüche und Pfeile 8 (1889)',
    text: 'Aus der Kriegsschule des Lebens. Was mich nicht umbringt, macht mich stärker.' },
  { id: 'jocko-def', cat: 'krieger', person: 'Jocko Willink', source: 'Buchtitel „Discipline Equals Freedom: Field Manual“ (2017)', original: 'Discipline equals freedom.',
    text: 'Disziplin ist Freiheit.' },
  { id: 'goggins-boats', cat: 'krieger', person: 'David Goggins', source: '„Can’t Hurt Me“ (2018)', original: 'Who’s gonna carry the boats?',
    text: 'Wer trägt die Boote?' },
];
