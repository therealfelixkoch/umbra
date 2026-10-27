// Profil: Rang, Verlauf, Bestleistungen, Einstellungen, Daten.
import { esc, sys, stepper, loadText, kg, helpDot } from './kit.js';
import { hud, seasonTrack } from './today.js';
import { pillars, formatScore, MEDAL_NAMES, GROUP_NAMES } from '../engine/pillars.js';
import { BENCHMARKS } from '../data/benchmarks.js';
import { weightSeries } from '../engine/events.js';
import { playerStats, RANKS, rankName } from '../engine/game.js';
import { rankEmblem } from './emblem.js';
import { testSound } from './sound.js';
import { titleStatus, equippedTitle } from '../engine/story.js';
import { QUOTES, QUOTE_CATS } from '../data/story.js';
import { startDeload } from '../engine/cycle.js';
import { weekInfo, holidayActive, DEFAULT_HOLIDAY, completeWeekManually, seasonPlan, inDeload } from '../engine/arc.js';
import { ARCS, WEEK_PLAN, arcWeeks, planWeek, CYCLE_INFO, arcOf } from '../data/arcs.js';
import { logDecision } from '../engine/rulelog.js';
import { formatDay } from '../engine/dates.js';
import { MISSIONS } from '../data/missions.js';
import { getDef } from '../data/exercises.js';
import { toggleIn } from './onboarding.js';
import { exportFile, readImportFile } from '../store.js';
import { defaultData } from '../state.js';
import { scoreChart, historyList } from './check.js';
import { latestTest } from '../engine/mobility.js';
import { weekView, attributeRanks, achievementsView, RANK_LORE } from './week.js';
import { ASCENSIONS, highestAscension } from '../engine/progress.js';
import { guardianImage } from './lore.js';
import { APP_VERSION } from '../version.js';
import { bladeEmblem } from './temper.js';
import { wristView } from './wrist.js';
import { feetView, mountPhotos } from './feet.js';
import { equipmentSetup, equipmentActions } from './equipment.js';
import { overviewView } from './overview.js';
import { setStory, shareStory } from './storycard.js';
import { bladeTier } from '../engine/temper.js';
import { journalView, xpSourceView, journalActions, journalChange } from './journal.js';
import { guardianTier, GUARDIANS, BOSSES, BOSS_BY_ARC, guardianName } from '../data/lore.js';

function holidayDate(h, key) {
  const md = (h ?? DEFAULT_HOLIDAY)[key];
  const y = new Date().getFullYear() + (key === 'to' && md < (h ?? DEFAULT_HOLIDAY).from ? 1 : 0);
  return `${y}-${md}`;
}

// Körpergewicht: optional wöchentlich, Kurve der laufenden Saison
function weightCard(data, c) {
  const start = data.engine.arc?.startedDay || null;
  const series = weightSeries(data, start && start <= c.today() ? start : null).slice(-26);
  const draft = c.ui.bwDraft ?? data.settings.bodyweight ?? 80;
  let chart = '<p class="muted small">Noch keine Einträge in dieser Saison.</p>';
  if (series.length >= 2) {
    const w = 300; const h = 70;
    const ys = series.map((p) => p.kg);
    const lo = Math.min(...ys) - 0.5; const hi = Math.max(...ys) + 0.5;
    const pts = series.map((p, i) => `${(8 + (i / (series.length - 1)) * (w - 16)).toFixed(1)},${(h - 8 - ((p.kg - lo) / (hi - lo)) * (h - 16)).toFixed(1)}`).join(' ');
    const d = Math.round((ys.at(-1) - ys[0]) * 10) / 10;
    chart = `<svg class="j-curve" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="var(--sys)" stroke-width="2"/></svg>
      <p class="muted small">Seit Saisonstart ${d > 0 ? '+' : ''}${String(d).replace('.', ',')} kg. Im Winter darf es etwas mehr sein, im Frühjahr und Sommer etwas weniger.</p>`;
  }
  return sys('Körpergewicht', `${stepper('bw-step', String(draft).replace('.', ','), 'kg')}
    <button class="btn wide" data-act="bw-log">Heute eintragen</button>${chart}
    <p class="muted small">Optional. Keine Ernährungslogik, nur der Verlauf.</p>`);
}

// Die drei Säulen des Wächters mit aktuellem Stand
function pillarPanel(data, arc) {
  const p = pillars(data, arc.n, getDef);
  const b = p.benchmark;
  const ix = p.index;
  const mark = (ok) => `<b class="${ok ? 'gold-text' : 'muted'}">${ok ? '✓' : '○'}</b>`;
  const bench = `${mark(b.passed)} <b>Benchmark · ${esc(b.bench.name)}</b> ${helpDot('benchmark')}<br><span class="small">${b.baseline ? `Baseline ${formatScore(b.bench, b.baseline.value)} (${b.variant === 'full' ? 'voll' : 'halb'})` : 'Baseline im ersten Kapitel'} · ${b.revenge ? `Revanche ${formatScore(b.bench, b.revenge.value)}` : 'Revanche in der Prüfwoche'}</span>`;
  const groups = Object.keys(GROUP_NAMES).map((g) => {
    const a = ix.areas.filter((x) => x.group === g);
    return a.length ? `${GROUP_NAMES[g]}${ix.focus.includes(g) ? ' (Fokus)' : ''} ${a.filter((x) => x.better).length}/${a.length}` : null;
  }).filter(Boolean).join(' · ');
  const index = `${mark(ix.passed)} <b>Fortschritts-Index</b> ${helpDot('index')}<br><span class="small">${ix.areas.length ? `${ix.better} von ${ix.areas.length} Bereichen besser${ix.worse.length ? `, ${ix.worse.length} deutlich schlechter` : ''}. ${groups}` : 'Vergleich Wochen 1–4 mit Wochen 9–13. Noch keine Daten.'}</span>`;
  const chap = `${mark(p.chapters.passed)} <b>Durchziehen</b><br><span class="small">Beide Kapitel inkl. Deload. Stand: Woche ${arc.week}/13.</span>`;
  const ev = data.engine.bossEvents?.[arc.n];
  return `<div class="pillar-panel"><div class="label">${helpDot('pillars')} Säulen · ${p.count}/3${p.medal ? ` · aktuell ${MEDAL_NAMES[p.medal]}` : ''}</div>
    <p>${bench}</p><p>${index}</p><p>${chap}</p>
    <p class="muted small">1 Säule = Bronze, 2 = Silber, 3 = Gold. Entschieden wird am Ende der Prüfwoche.${ev?.medal ? ` Ergebnis: ${MEDAL_NAMES[ev.medal]}.` : ''}</p></div>`;
}

function arcPanel(data, today) {
  const arc = data.engine.arc;
  if (!arc) return '';
  const info = weekInfo(arc);
  const holiday = holidayActive(today, data.settings.holiday ?? DEFAULT_HOLIDAY);
  const plan = seasonPlan(arc, today, data.settings.holiday ?? DEFAULT_HOLIDAY);
  const wp = WEEK_PLAN[planWeek(arc)];
  const chap = (c, i) => `<div class="chapter${info.chapterIndex === i ? ' cur' : ''}"><b>Kapitel ${i + 1} · ${esc(c.name)}</b><ul class="cues">${c.changes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  return sys(`${info.arc.name} · ${guardianName(arc.n)}`, `<p class="muted">${esc(info.arc.focus)}. ${esc(info.arc.desc)}</p>
    ${seasonTrack(arc)}
    <dl class="facts">
      <div><dt>Woche</dt><dd>${arc.week}/${info.weeks} · ${info.chapter ? `Kapitel ${info.chapterIndex + 1} ${esc(info.chapter.name)}` : 'Prüfwoche'} · ${esc(wp.label)}</dd></div>
      <div><dt>RIR-Ziel</dt><dd>${wp.rir}${wp.failLast ? ', letzter Satz darf ans Versagen' : ''}</dd></div>
      <div><dt>Jahr</dt><dd>${ARCS.map((a, i) => (i === arc.n % 4 ? `<b>${esc(a.name)}</b>` : esc(a.name))).join(' → ')}</dd></div>
      ${plan ? `<div><dt>Plan</dt><dd>${plan.startsIn ? `Start ${formatDay(plan.startsIn)} · ` : ''}Ende ca. ${formatDay(plan.end)}</dd></div>` : ''}
    </dl>
    ${pillarPanel(data, arc)}
    <details class="arc-why"><summary>Warum diese Saison, was sich ändert</summary>
      <p>${esc(info.arc.why)}</p>
      ${info.arc.chapters.map(chap).join('')}
      <div class="chapter${info.chapterIndex === 'exam' ? ' cur' : ''}"><b>Woche 13 · Prüfwoche</b><p class="small">Ausgeruht nach dem zweiten Deload. Hier entscheiden die drei Säulen über den Wächter: Benchmark-Workout, Fortschritts-Index und ob beide Kapitel durchgezogen wurden.</p></div></details>
    <details class="arc-why"><summary>${CYCLE_INFO.name}: alle vier Saisons</summary>
      <p>${esc(CYCLE_INFO.summary)}</p>
      <ol class="arc-cycle">${ARCS.map((a, i) => `<li class="${i === arc.n % 4 ? 'cur' : ''}"><b>${esc(a.name)} · ${esc(BOSSES[BOSS_BY_ARC[i]].name)}</b><br><span>${esc(a.focus)}. Kapitel: ${a.chapters.map((c) => esc(c.name)).join(', ')}, dann Prüfwoche.</span></li>`).join('')}</ol>
      <div class="label">Bleibt in jeder Saison</div><ul class="cues">${CYCLE_INFO.stays.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="label">Wechseln die Übungen?</div><p class="small">${esc(CYCLE_INFO.exercises)}</p></details>
    <p class="muted small">Eine Woche zählt, sobald darin 2 volle Missionen stattfinden (Kompakt zählt, SHADOWSTEP nicht). Sonst wird sie wiederholt.${holiday ? ' Feiertagsmodus aktiv: Die Saison pausiert.' : ''}</p>
    ${inDeload(arc) || info.chapterIndex === 'exam' ? '' : '<button class="btn wide" data-act="p-deload">Ich brauche einen Deload</button>'}
    <button class="btn wide" data-act="p-season-story">Saison-Karte teilen</button>
    <button class="btn ghost wide" data-act="p-week-manual">Saison-Woche manuell abschließen</button>`);
}

function quoteSettings(s) {
  const hidden = new Set(s.quotesHidden || []);
  const catsOff = new Set(s.quoteCatsOff || []);
  const all = [...QUOTES, ...(s.ownQuotes || [])].filter((q) => !catsOff.has(q.cat));
  return `<section class="card"><div class="label">Zitate</div>
    <p class="muted small">Jeden Tag eins oben auf „Heute“, dazu im Arc-Intro, im Debrief und nach jeder dritten Mission. Antippen blendet aus.</p>
    <div class="chips">${[['on', 'Tageszitat an'], ['off', 'aus']].map(([v, l]) => `<button class="chip${(s.dailyQuote === false ? 'off' : 'on') === v ? ' on' : ''}" data-act="q-daily" data-v="${v}">${l}</button>`).join('')}</div>
    <div class="label">Quellen</div><div class="chips">${Object.entries(QUOTE_CATS).map(([k, l]) => `<button class="chip${catsOff.has(k) ? '' : ' on'}" data-act="q-cat" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="quote-list">${all.map((q) => `<div class="quote-row${hidden.has(q.id) ? ' off' : ''}">
      <button class="quote-btn" data-act="q-hide" data-id="${q.id}"><span>„${esc(q.text)}“</span><small>${esc(q.person)} · ${esc(q.source)}</small></button>
      ${q.own ? `<button class="x" data-act="q-del" data-id="${q.id}" aria-label="Löschen">×</button>` : ''}</div>`).join('')}</div>
    <div class="label">Eigenes Zitat</div>
    <input class="search" data-input="qText" placeholder="Text" autocomplete="off">
    <input class="search" data-input="qPerson" placeholder="Person (optional)" autocomplete="off" style="margin-top:8px">
    <button class="btn wide" data-act="q-add" style="margin-top:8px">Hinzufügen</button></section>`;
}

const setSettings = (c, patch) => c.update((data) => ({ ...data, settings: { ...data.settings, ...patch } }));

function sessionLabel(s) {
  if (s.kind === 'arena') return `ARENA${s.bmt ? ` · BMT W${s.bmt.week}` : ''} · ${s.rpe ? `Intensität ${s.rpe}` : s.intensity === 'hard' ? 'Sparring' : 'Technik'} · ${s.minutes} min`;
  if (s.kind === 'check') return 'Mobility-Check';
  if (s.kind === 'temper') return s.ep ? `TEMPER · Episode ${s.ep}${s.clarity ? ` · Klarheit ${s.clarity}` : ''}` : `TEMPER · Einsatz`;
  if (s.kind === 'temperBook') return `TEMPER · Buch ${s.book} abgeschlossen`;
  if (s.kind === 'wrist') return `Handgelenk · ${{ strength: 'Kraftblock', activation: 'Aktivierung', minimal: 'Minimal-Dosis', maintenance: 'Erhaltung' }[s.wristBlock] || 'Block'}`;
  if (s.kind === 'wristCheck') return 'Handgelenk-Status-Check';
  if (s.kind === 'wristDone') return 'Handgelenk-Protokoll beendet';
  if (s.kind === 'hands') return `HANDS${s.feel ? ` · Gefühl ${s.feel}/5` : ''}`;
  if (s.kind === 'feet') return `FEET · Stufe ${s.stage || '?'}${s.noJumps ? ' · ohne Sprünge' : ''}`;
  if (s.kind === 'feetCheck') return 'Fuß-Check';
  if (s.missionId === 'BENCH' && s.benchmark) { const b = BENCHMARKS[s.benchmark.id]; return `${b.name} · ${s.benchmark.kind === 'baseline' ? 'Baseline' : 'Revanche'} · ${formatScore(b, s.benchmark.value)}${s.benchmark.variant === 'half' ? ' (halb)' : ''}`; }
  if (s.kind === 'quest') return 'Wochen-Quest erfüllt';
  if (s.kind === 'ascension') return `Erfolg: ${ASCENSIONS.find((a) => a.id === s.ascension)?.name || ''}`;
  if (s.kind === 'micro') return `Kapitel-Erfolg: ${s.name || s.micro}`;
  if (s.kind === 'event') return `Event: ${s.name || s.eventId}`;
  if (s.kind === 'zone2') return `ZONE 2 · ${s.minutes} min`;
  const m = MISSIONS[s.missionId];
  const pct = s.kind === 'mission' && s.completion < 0.999 ? ` · ${Math.round(s.completion * 100)} %` : '';
  const mod = s.modifier === 'deload' ? ' · Deload' : s.modifier === 'comeback' ? ' · Wiedereinstieg' : '';
  return `${m?.name || s.missionId}${s.profile === 'gym' && s.kind === 'mission' ? ' · Gym' : s.profile === 'travel' ? ' · Unterwegs' : ''}${mod}${pct}`;
}

export default {
  render(c) {
    const data = c.data;
    const st = playerStats(data, c.today());
    const tab = c.ui.ptab || 'status';
    const tabs = [['status', 'Status'], ['woche', 'Woche'], ['mobility', 'Mobil'], ['verlauf', 'Verlauf'], ['hand', 'Gelenke'], ['setup', 'Setup']];
    let out = `${hud(c)}<div class="seg">${tabs.map(([k, v]) => `<button class="${tab === k ? 'on' : ''}" data-act="ptab" data-v="${k}">${v}</button>`).join('')}</div>`;

    if (tab === 'status') {
      const next = st.rank.next;
      const tier = guardianTier(st.rank.id);
      const asc = highestAscension(data);
      const title = equippedTitle(data);
      out += guardianImage(tier, { aura: asc?.aura, caption: `Der Wächter${title ? ` · ${esc(title)}` : ''}${asc ? `<br><span class="cap-sub">${esc(asc.name)}</span>` : ''}` });
      out += sys(`Rang · ${rankName(st.rank)}`, `
        <div class="row gap blade-row">${bladeEmblem(bladeTier(data), 26)}<small class="muted">Klinge · TEMPER-Stufe ${['–', 'HEAT', 'HAMMER', 'QUENCH', 'TEMPER', 'EDGE'][bladeTier(data)]}</small></div>
        <div class="rank-row emblems">${RANKS.map((r, i) => `<span class="${i <= st.rank.index ? 'on' : ''}${i === st.rank.index ? ' cur' : ''}" title="${rankName(r)}">${rankEmblem(i, { size: i === st.rank.index ? 40 : 30 })}</span>`).join('')}</div>
        <div class="xpbar big"><i style="width:${Math.round(st.rank.progress * 100)}%"></i></div>
        <p class="lore">${RANK_LORE[st.rank.id]}</p>
        <p class="muted">${st.xp.toLocaleString('de-DE')} XP${next ? ` · noch ${(next.xp - st.xp).toLocaleString('de-DE')} bis ${rankName(next)}` : ''}</p>
        <dl class="facts">
          <div><dt>Kampfkraft ${helpDot("kk")}</dt><dd class="num">${st.kk.toLocaleString("de-DE")}</dd></div>
          <div><dt>Wochen-Streak</dt><dd class="num">${st.week.streak} (Rekord ${st.week.best})</dd></div>
          <div><dt>Diese Woche</dt><dd>${st.week.thisWeek} von 3 Einsätzen</dd></div>
          <div><dt>Schild</dt><dd>${st.week.shieldUsedThisMonth ? 'diesen Monat verbraucht' : 'bereit'}</dd></div>
        </dl>`);
      out += sys('Titel', `<div class="titles">${titleStatus(data).map((t) => `<button class="title-chip${t.unlocked ? ' on' : ''}${data.settings.title === t.id ? ' eq' : ''}" ${t.unlocked ? `data-act="p-title" data-id="${t.id}"` : 'disabled'}>
          <b>${esc(t.name)}</b><small>${esc(t.desc)}${data.settings.title === t.id ? ' · ausgerüstet' : ''}</small></button>`).join('')}</div>`);
      out += overviewView(data, c.today());
      out += sys('Attribut-Ränge', attributeRanks(data));
      out += achievementsView(data, c.today());
      out += weightCard(data, c);
      const e = data.engine;
      out += arcPanel(data, c.today());
      out += xpSourceView(c);
      const recs = Object.entries(data.records).filter(([id]) => getDef(id) || id === 'EXPRESS');
      out += `<section class="card"><div class="label">Bestleistungen</div>${recs.length ? recs.map(([id, r]) => {
        if (id === 'EXPRESS') return `<div class="done-row"><span>SHADOWSTEP</span><b>${r.value} Runden</b></div>`;
        const def = getDef(id);
        return `<div class="done-row"><span>${esc(def.name)}</span><b>${r.value}${def.mode === 'time' ? ' s' : ''}${r.load ? ` · ${esc(loadText(def, r.load))}` : ''}</b></div>`;
      }).join('') : '<p class="muted">Noch keine. Die erste Mission setzt die Messlatte.</p>'}</section>`;
      return out;
    }

    if (tab === 'woche') return out + weekView(c);

    if (tab === 'mobility') {
      const tests = data.mobility || [];
      if (!latestTest(tests)) {
        return out + sys('Noch kein Mobility-Check', '<p>8 Tests, 10 Minuten. Danach kennst du deine Scores pro Region und dein FLOW wird persönlich.</p><button class="btn primary wide" data-act="go" data-to="check">Check starten</button>');
      }
      return out + sys('Mobility pro Region', scoreChart(tests))
        + `<section class="card"><div class="label">Alle Checks</div>${historyList(tests)}</section>
        <button class="btn primary wide" data-act="go" data-to="check">Neuen Check machen</button>`;
    }

    if (tab === 'verlauf') return out + journalView(c, sessionLabel);
    if (tab === 'hand') {
      const j = c.ui.jtab || 'hand';
      const seg = `<div class="seg sub">${[['hand', 'Hand'], ['fuss', 'Fuß']].map(([k, v]) => `<button class="${j === k ? 'on' : ''}" data-act="jtab" data-v="${k}">${v}</button>`).join('')}</div>`;
      const paused = !!data.settings.jointPause;
      const pause = sys('Gelenk-Pause', `${helpDot('jointpause')} <div class="chips"><button class="chip${paused ? ' on' : ''}" data-act="joint-pause" data-v="1">Pausiert</button><button class="chip${paused ? '' : ' on'}" data-act="joint-pause" data-v="0">Aktiv</button></div>
        <p class="muted small">${paused ? 'Handgelenk-Protokoll und Ellbogen-Protokoll ruhen: kein Unterarm-Prehab und kein Dead Hang in den Missionen, keine Ellbogen-Frage, kein Ellbogen-Zähler, keine Handgelenk-Blöcke. Alle Daten bleiben gespeichert.' : 'Handgelenk-Protokoll (falls an) und Ellbogen-Prehab, Ellbogen-Frage und -Zähler laufen.'}</p>`, { tone: paused ? 'calm' : 'sys' });
      return out + pause + seg + (j === 'fuss' ? feetView(c) : wristView(c));
    }

    const s = data.settings;
    return out + `
      ${equipmentSetup(c)}
      <section class="card"><div class="label">Körpergewicht</div>${stepper('p-bw', kg(s.bodyweight), 'kg')}
        <div class="label">Satzpausen</div>
        <p class="muted small">Automatisch nach Schwere der Übung: schwer 150 s, mittel 90 s, leicht 60 s, explosiv 90 s. +30 s nach Top-Satz oder RIR 0. Im Pausen-Timer mit ±15 s anpassen, die App merkt es sich pro Übung.${Object.keys(s.restAdjust || {}).length ? ` <button class="link" data-act="p-rest-reset">Gemerkte Anpassungen zurücksetzen</button>` : ''}</p>
        <div class="label">Ellbogen-Zähler: voll ab</div>
        ${stepper('p-elbow', `${s.elbowThreshold || 3}`, 'Meldungen in 7 Tagen')}
        <div class="label">Feiertagsmodus</div>
        <div class="chips"><button class="chip${(s.holiday ?? DEFAULT_HOLIDAY).enabled ? ' on' : ''}" data-act="p-holiday" data-v="1">An</button><button class="chip${(s.holiday ?? DEFAULT_HOLIDAY).enabled ? '' : ' on'}" data-act="p-holiday" data-v="0">Aus</button></div>
        <div class="row gap holiday-dates"><label>von <input type="date" data-change="holiday-from" value="${holidayDate(s.holiday, 'from')}"></label><label>bis <input type="date" data-change="holiday-to" value="${holidayDate(s.holiday, 'to')}"></label></div>
        <p class="muted small">Jedes Jahr wiederkehrend. Im Zeitraum pausiert der Arc, das Wochenziel sinkt auf 2 Einsätze, SHADOWSTEP, Kompakt und FLOW zählen voll.</p>
        <div class="label">Ton beim Pausenende</div>
        <div class="chips"><button class="chip${s.sound !== false ? ' on' : ''}" data-act="p-sound" data-v="1">An</button><button class="chip${s.sound === false ? ' on' : ''}" data-act="p-sound" data-v="0">Aus</button></div>
        <button class="btn wide" data-act="p-sound-test">Ton testen</button>
        <p class="muted small">Der Ton mischt sich unter deine Musik und pausiert sie nie. Bei Lautlos-Schalter bleibt er stumm, dafür pulsiert der Bildschirm violett und die Timer-Zahl blinkt. Ist das iPhone gesperrt, pausiert iOS die App: Bildschirm anlassen.</p></section>
      <section class="card"><div class="label">Einführung</div><button class="btn wide" data-act="tour-start">Geführte Tour starten</button><p class="muted small">Erklärungen zu allem stehen im Kodex unter „Handbuch“ und hinter den „?“-Punkten.</p></section>
      ${quoteSettings(s)}
      <section class="card"><div class="label">Daten</div>
        <p class="muted small">Letzte Sicherung: ${s.lastBackupAt ? formatDay(s.lastBackupAt.slice(0, 10)) : 'noch nie'}</p>
        <div class="row gap"><button class="btn primary grow" data-act="p-export">Exportieren</button>
        <label class="btn grow">Importieren<input type="file" accept="application/json,.json" data-change="import" hidden></label></div>
        <button class="btn ghost wide" data-act="p-repair">App-Dateien neu laden</button>
        <p class="muted small">Hilft, wenn nach einem Update etwas komisch aussieht. Lädt nur die App neu, deine Daten bleiben. Version ${APP_VERSION}.</p>
        <button class="btn ghost wide danger" data-act="p-reset">Alle Daten löschen</button></section>
      <p class="foot muted">UMBRA · Daten nur auf diesem Gerät.</p>`;
  },
  mount(c, root) { mountPhotos(root); },
  actions: {
    ...journalActions,
    ...equipmentActions,
    ptab: (c, d) => c.setUi({ ptab: d.v }),
    jtab: (c, d) => c.setUi({ jtab: d.v }),
    'p-season-story': (c) => {
      const arc = c.data.engine.arc;
      const p = pillars(c.data, arc.n, getDef);
      const done = c.data.sessions.filter((s) => s.arc?.n === arc.n && s.kind === 'mission').length;
      setStory({ kicker: 'SAISON', title: arcOf(arc.n).name, stats: [[`${arc.week}/13`, 'Woche'], [done, 'Missionen'], [`${p.count}/3`, 'Säulen']] });
      shareStory(c);
    },
    'bw-step': (c, d) => c.setUi({ bwDraft: Math.round(((c.ui.bwDraft ?? c.data.settings.bodyweight ?? 80) + Number(d.dir) * 0.1) * 10) / 10 }),
    'bw-log': (c) => {
      const kg = c.ui.bwDraft ?? c.data.settings.bodyweight ?? 80;
      c.update((data) => ({ ...data, bodyLog: { ...(data.bodyLog || {}), [c.today()]: kg }, settings: { ...data.settings, bodyweight: kg } }));
    },
    'joint-pause': (c, d) => setSettings(c, { jointPause: d.v === '1' }),
    'wk-tip': (c, d, el) => el.classList.toggle('open'),
    'p-deload': (c) => c.system('Deload-Woche jetzt?', '<p>Das laufende Kapitel springt in seine Deload-Woche: halbe Sätze, gleiches Gewicht, 3 Wdh. im Tank. Danach geht es mit dem nächsten Kapitel weiter.</p>',
      [['p-deload-yes', 'Deload-Woche starten', 'primary'], ['close-modal', 'Abbrechen']]),
    'p-deload-yes': (c) => {
      c.modal(null);
      c.update((data) => logDecision({ ...data, engine: startDeload(data.engine) },
        { rule: 'deload:manual', day: c.today(), suggestion: 'deload_week', decision: 'accepted' }));
    },
    'p-week-manual': (c) => c.system('Saison-Woche abschließen?', `<p>Für Sonderfälle: Die laufende Saison-Woche ${c.data.engine.arc?.week}/${arcWeeks(c.data.engine.arc?.n ?? 0)} gilt sofort als abgeschlossen, egal wie viele Missionen darin waren. Die Korrektur wird im Regel-Protokoll vermerkt.</p>`,
      [['p-week-manual-yes', 'Abschließen', 'primary'], ['close-modal', 'Abbrechen']]),
    'p-week-manual-yes': (c) => {
      c.modal(null);
      const before = c.data.engine.arc;
      const r = completeWeekManually(before, c.today());
      c.update((data) => logDecision({ ...data, engine: { ...data.engine, arc: r.arc } },
        { rule: 'arc:manual_week', day: c.today(), input: { n: before.n, week: before.week }, suggestion: r.event.type, decision: 'accepted' }));
    },
    'p-holiday': (c, d) => {
      const h = c.data.settings.holiday ?? DEFAULT_HOLIDAY;
      setSettings(c, { holiday: { ...h, enabled: d.v === '1' } });
    },
    'toggle-eq': (c, d) => {
      const eq = c.data.settings.equipment;
      setSettings(c, { equipment: { ...eq, [d.profile]: toggleIn(eq[d.profile], d.id) } });
    },
    'toggle-kb': (c, d) => {
      const w = toggleIn(c.data.settings.kbWeights, Number(d.w));
      if (w.length) setSettings(c, { kbWeights: w });
    },
    'p-bw': (c, d) => setSettings(c, { bodyweight: Math.max(40, Math.min(160, c.data.settings.bodyweight + Number(d.dir))) }),
    'p-elbow': (c, d) => setSettings(c, { elbowThreshold: Math.max(1, Math.min(10, (c.data.settings.elbowThreshold || 3) + Number(d.dir))) }),
    'p-sound-test': (c) => {
      const r = testSound();
      c.system('Ton-Test', `<p>Du solltest drei Töne hören und ein violettes Pulsieren sehen.</p>
        <dl class="facts"><div><dt>Web Audio</dt><dd>${r.webAudio}</dd></div><div><dt>Audio-Sitzung</dt><dd>${r.audioSession}</dd></div>
        <div><dt>Bildschirm an</dt><dd>${r.wakeLock}</dd></div><div><dt>Als App gestartet</dt><dd>${r.standalone ? 'ja' : 'nein'}</dd></div></dl>
        <p class="muted small">Am besten mit laufendem Spotify testen: Die Musik soll weiterspielen und der Ton darüber liegen. Bei Lautlos-Schalter kommt bewusst kein Ton, das violette Signal kommt immer.</p>`);
    },
    'p-title': (c, d) => setSettings(c, { title: c.data.settings.title === d.id ? null : d.id }),
    'q-hide': (c, d) => {
      const h = new Set(c.data.settings.quotesHidden || []);
      if (h.has(d.id)) h.delete(d.id); else h.add(d.id);
      setSettings(c, { quotesHidden: [...h] });
    },
    'q-add': (c) => {
      const text = (c.ui.qText || '').trim();
      if (!text) return;
      const q = { id: `own-${Date.now()}`, text, person: (c.ui.qPerson || '').trim() || 'Eigenes Zitat', source: 'eigene Sammlung', own: true };
      c.ui.qText = '';
      c.ui.qPerson = '';
      setSettings(c, { ownQuotes: [...(c.data.settings.ownQuotes || []), q] });
    },
    'q-daily': (c, d) => setSettings(c, { dailyQuote: d.v === 'on' }),
    'q-cat': (c, d) => {
      const off = new Set(c.data.settings.quoteCatsOff || []);
      if (off.has(d.v)) off.delete(d.v); else off.add(d.v);
      setSettings(c, { quoteCatsOff: [...off] });
    },
    'q-del': (c, d) => setSettings(c, { ownQuotes: (c.data.settings.ownQuotes || []).filter((q) => q.id !== d.id) }),
    'p-repair': () => window.__umbraRepair?.(),
    'p-rest-reset': (c) => setSettings(c, { restAdjust: {} }),
    'p-sound': (c, d) => setSettings(c, { sound: d.v === '1' }),
    'p-export': async (c) => {
      if (await exportFile(c.data, c.today())) setSettings(c, { lastBackupAt: new Date().toISOString() });
    },
    'p-reset': (c) => c.system('Alle Daten löschen?', '<p>Das löscht Log, Fortschritt und Einstellungen auf diesem Gerät. Exportiere vorher eine Sicherung.</p>',
      [['p-reset-yes', 'Endgültig löschen', 'danger'], ['close-modal', 'Abbrechen', 'primary']], 'warn'),
    'p-reset-yes': (c) => {
      c.modal(null);
      c.update(() => defaultData());
      c.go('heute');
    },
    'p-import-yes': (c) => {
      const data = c.ui.pendingImport;
      c.ui.pendingImport = null;
      c.modal(null);
      c.update(() => ({ ...data, settings: { ...data.settings, lastBackupAt: new Date().toISOString() } }));
      c.system('Import abgeschlossen', `<p>${data.sessions.length} Einträge wiederhergestellt.</p>`);
    },
  },
  onInput(c, name, value) {
    if (name === 'qText' || name === 'qPerson') c.ui[name] = value;
  },
  async onChange(c, name, el) {
    if (journalChange(c, name, el)) return;
    if (name === 'holiday-from' || name === 'holiday-to') {
      if (!el.value) return;
      const h = c.data.settings.holiday ?? DEFAULT_HOLIDAY;
      setSettings(c, { holiday: { ...h, [name === 'holiday-from' ? 'from' : 'to']: el.value.slice(5) } });
      return;
    }
    if (name !== 'import' || !el.files?.[0]) return;
    try {
      const data = await readImportFile(el.files[0]);
      c.ui.pendingImport = data;
      c.system('Sicherung importieren?', `<p>Datei mit ${data.sessions.length} Einträgen. Die aktuellen Daten auf diesem Gerät werden ersetzt.</p>`,
        [['p-import-yes', 'Importieren', 'primary'], ['close-modal', 'Abbrechen']], 'warn');
    } catch (e) {
      c.system('Import fehlgeschlagen', `<p>${esc(e.message)}</p>`, undefined, 'warn');
    }
    el.value = '';
  },
};
