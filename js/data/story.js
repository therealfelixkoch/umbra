// Lore als Daten: Bosse, Vorlagen für Arc-Intro und Debrief (Platzhalter {…} für echte Zahlen),
// Codex-Vorlagen, Titel und Zitate. Erzähler ist das System: kurz, ernst, ohne Ausrufezeichen.

export const BOSS_LORE = {
  torpor: {
    epithet: 'Der Steinkoloss',
    weakness: 'Er macht dich schwer und träge. Er lebt von jedem Tag, an dem du liegen bleibst.',
    world: ['Ein Steinbruch in der Nacht. Nebel liegt schwer über dem Boden.', 'Nichts bewegt sich. Das ist sein Reich.'],
    confront: ['Der Wächter tritt vor. Der Koloss öffnet die Augen.', 'Kein Sprint. Gleichmäßige Schläge, Woche für Woche.'],
    victory: ['TORPOR zerfällt zu Staub.', '{missions} Missionen. Kein Stein konnte dich halten.'],
    retreat: ['TORPOR sinkt zurück in den Nebel. Angeschlagen, nicht gebrochen.', 'Er wird wiederkommen. Du auch.'],
    codex: 'TORPOR ist die Schwere nach einem langen Tag. Er gewinnt nicht durch Kraft, sondern durch Stillstand. Jede Mission ist ein Schlag gegen Stein.',
  },
  fracture: {
    epithet: 'Der Glasriese',
    weakness: 'Alles an ihm ist hart, aber spröde. Kraft ohne Kontrolle zerbricht.',
    world: ['Ein Feld aus schwarzem Glas. Jedes Licht bricht sich hundertfach.', 'Hier zählt nur, was schnell und sauber ist.'],
    confront: ['Der Wächter senkt den Stand. Risse laufen durch den Riesen.', 'Schwer, dann explosiv. Keine Wiederholung ohne Absicht.'],
    victory: ['FRACTURE zerspringt in tausend Splitter.', '{records} Bestleistungen. Härte allein reicht nicht. Präzision schon.'],
    retreat: ['FRACTURE weicht zurück, neue Risse im Körper.', 'Er wird wiederkommen. Spröder als zuvor.'],
    codex: 'FRACTURE verkörpert rohe Härte ohne Elastizität. Er bricht, wenn du lernst, Kraft schnell und kontrolliert zu entladen.',
  },
  hollow: {
    epithet: 'Der Atemräuber',
    weakness: 'Er nimmt dir in Runde drei die Luft. Er wartet, bis dein Motor stottert.',
    world: ['Eine endlose Straße unter einem Himmel ohne Sterne.', 'Kalter Nebel zieht darüber. Kein Ende in Sicht.'],
    confront: ['HOLLOW greift nach deinem Atem. Der Wächter geht weiter.', 'Lange, ruhige Arbeit. Der Motor wächst im Gleichmaß.'],
    victory: ['HOLLOW löst sich in Asche auf.', '{arena} ARENA-Abende. Der Atem gehört wieder dir.'],
    retreat: ['HOLLOW zieht sich in den Nebel zurück. Er beobachtet weiter.', 'Er wird wiederkommen. Die Straße bleibt.'],
    codex: 'HOLLOW ist die Erschöpfung in der späten Runde. Er verliert gegen eine aerobe Basis, die still und Woche für Woche aufgebaut wird.',
  },
  rigor: {
    epithet: 'Die Eisenschlange',
    weakness: 'Sie legt sich um deine Gelenke und zieht langsam zu.',
    world: ['Ein schwarzer See, vollkommen still. Ein violetter Mond liegt auf dem Wasser.', 'Ruhe ist hier keine Schwäche.'],
    confront: ['RIGOR schlingt sich um den Wächter.', 'Tiefer Stand, langsamer Atem. Die Windungen geben nach.'],
    victory: ['Die Windungen brechen. RIGOR versinkt im See.', '{flow} Tage FLOW. Nichts hält dich mehr fest.'],
    retreat: ['RIGOR lockert den Griff und gleitet unter das Wasser.', 'Sie wird wiederkommen. Bleib beweglich.'],
    codex: 'RIGOR ist Steifheit, die sich unbemerkt festsetzt. Sie verliert gegen tägliche Bewegung in die Tiefe, unter Last und ohne Eile.',
  },
  plateau: {
    epithet: 'Die Nemesis',
    weakness: 'Er tut nichts. Er wartet, bis du aufhörst, Fortschritt zu erwarten.',
    appears: ['THE PLATEAU erscheint. Mehrere Muster stehen still.', 'Kein Gegner ist gefährlicher als der, der sich nicht bewegt.'],
    fades: ['THE PLATEAU zerfällt zu grauem Staub.', 'Die Deload-Woche ist durch. Der Weg geht wieder nach oben.'],
    codex: 'THE PLATEAU taucht auf, wenn mehrere Bewegungsmuster gleichzeitig stagnieren. Er verschwindet nicht durch mehr Härte, sondern durch eine Woche Entlastung.',
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
  { id: 'unermuedlich', name: 'Der Unermüdliche', desc: '12 Wochen in Folge mindestens 2 Einsätze' },
  { id: 'geduldig', name: 'Der Geduldige', desc: 'Eine Deload-Woche vollständig durchgezogen' },
  { id: 'zurueckgekehrt', name: 'Der Zurückgekehrte', desc: 'Wiedereinstieg nach 15 oder mehr Tagen' },
  { id: 'arenagaenger', name: 'Der Arenagänger', desc: '25 ARENA-Einheiten' },
  { id: 'geschmeidig', name: 'Der Geschmeidige', desc: 'Mobility im Schnitt über 70' },
  { id: 'eisern', name: 'Der Eiserne', desc: '50 volle Missionen' },
];

/**
 * Zitate über Härte, Disziplin und Durchhalten. Nur nachweislich zugeordnete Zitate mit Quelle.
 * text = deutsche Fassung (eigene Übersetzung), original = Original, falls Latein oder Englisch.
 */
export const QUOTES = [
  { id: 'ma-5-20', person: 'Marc Aurel', source: 'Selbstbetrachtungen, Buch V, 20',
    text: 'Was dem Handeln im Weg steht, treibt das Handeln voran. Was im Weg steht, wird zum Weg.' },
  { id: 'ma-4-49', person: 'Marc Aurel', source: 'Selbstbetrachtungen, Buch IV, 49',
    text: 'Sei wie das Vorgebirge, an dem sich die Wellen ohne Ende brechen. Es steht fest, und um es herum legt sich das Toben des Wassers.' },
  { id: 'ma-10-16', person: 'Marc Aurel', source: 'Selbstbetrachtungen, Buch X, 16',
    text: 'Hör auf zu reden, wie ein guter Mensch sein sollte. Sei einer.' },
  { id: 'sen-13-4', person: 'Seneca', source: 'Briefe an Lucilius, 13, 4', original: 'Saepius opinione quam re laboramus.',
    text: 'Wir leiden öfter in der Vorstellung als in der Wirklichkeit.' },
  { id: 'sen-71-3', person: 'Seneca', source: 'Briefe an Lucilius, 71, 3', original: 'Ignoranti, quem portum petat, nullus suus ventus est.',
    text: 'Wer nicht weiß, welchen Hafen er ansteuert, für den ist kein Wind der richtige.' },
  { id: 'epi-ench-1', person: 'Epiktet', source: 'Handbüchlein der Moral, 1',
    text: 'Einiges steht in unserer Macht, anderes nicht.' },
  { id: 'epi-diss-1-24', person: 'Epiktet', source: 'Lehrgespräche, Buch I, 24, 1',
    text: 'Schwierigkeiten sind es, die zeigen, wer einer ist.' },
  { id: 'jocko-def', person: 'Jocko Willink', source: 'Buchtitel „Discipline Equals Freedom: Field Manual“ (2017)', original: 'Discipline equals freedom.',
    text: 'Disziplin ist Freiheit.' },
  { id: 'goggins-boats', person: 'David Goggins', source: '„Can’t Hurt Me“ (2018)', original: 'Who’s gonna carry the boats?',
    text: 'Wer trägt die Boote?' },
];
