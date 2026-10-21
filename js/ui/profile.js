// Profil: Rang, Verlauf, Bestleistungen, Einstellungen, Daten.
import { esc, sys, stepper, loadText, kg } from './kit.js';
import { hud } from './today.js';
import { playerStats, RANKS, rankName } from '../engine/game.js';
import { rankEmblem } from './emblem.js';
import { testSound } from './sound.js';
import { titleStatus, equippedTitle } from '../engine/story.js';
import { QUOTES } from '../data/story.js';
import { startDeload } from '../engine/cycle.js';
import { weekInfo, holidayActive, DEFAULT_HOLIDAY, completeWeekManually } from '../engine/arc.js';
import { ARCS, ARC_WEEKS, WEEK_PLAN } from '../data/arcs.js';
import { logDecision } from '../engine/rulelog.js';
import { formatDay } from '../engine/dates.js';
import { MISSIONS } from '../data/missions.js';
import { getDef } from '../data/exercises.js';
import { equipmentToggles, kbGrid, toggleIn, ROOM_EQUIPMENT, GYM_EQUIPMENT } from './onboarding.js';
import { exportFile, readImportFile } from '../store.js';
import { defaultData } from '../state.js';
import { scoreChart, historyList } from './check.js';
import { latestTest } from '../engine/mobility.js';
import { weekView, attributeRanks, ascensionGrid, RANK_LORE } from './week.js';
import { ASCENSIONS, highestAscension } from '../engine/progress.js';
import { guardianImage } from './lore.js';
import { bladeEmblem } from './temper.js';
import { bladeTier } from '../engine/temper.js';
import { journalView, xpSourceView, journalActions, journalChange } from './journal.js';
import { guardianTier, GUARDIANS } from '../data/lore.js';

function holidayDate(h, key) {
  const md = (h ?? DEFAULT_HOLIDAY)[key];
  const y = new Date().getFullYear() + (key === 'to' && md < (h ?? DEFAULT_HOLIDAY).from ? 1 : 0);
  return `${y}-${md}`;
}

function arcPanel(data, today) {
  const arc = data.engine.arc;
  if (!arc) return '';
  const info = weekInfo(arc);
  const steps = Array.from({ length: ARC_WEEKS }, (_, i) => `<i class="${i + 1 < arc.week ? 'on' : i + 1 === arc.week ? 'cur' : ''}"></i>`).join('');
  const holiday = holidayActive(today, data.settings.holiday ?? DEFAULT_HOLIDAY);
  return sys(`ARC ${info.arc.id} · ${info.arc.name}`, `<p class="muted">${esc(info.arc.focus)}. ${esc(info.arc.desc)}</p>
    <div class="arc-steps">${steps}</div>
    <dl class="facts">
      <div><dt>Arc-Woche</dt><dd>${arc.week}/${ARC_WEEKS} · ${esc(WEEK_PLAN[arc.week].label)}</dd></div>
      <div><dt>RIR-Ziel</dt><dd>${WEEK_PLAN[arc.week].rir}${WEEK_PLAN[arc.week].failLast ? ', letzter Satz darf ans Versagen' : ''}</dd></div>
      <div><dt>Zyklus</dt><dd>${ARCS.map((a, i) => (i === arc.n % 4 ? `<b>${a.id}</b>` : a.id)).join(' → ')}</dd></div>
    </dl>
    <p class="muted small">Eine Woche zählt, sobald darin 2 volle Missionen stattfinden (Kompakt zählt, SHADOWSTEP nicht). Sonst wird sie wiederholt.${holiday ? ' Feiertagsmodus aktiv: Der Arc pausiert.' : ''}</p>
    ${arc.week === ARC_WEEKS ? '' : '<button class="btn wide" data-act="p-deload">Ich brauche einen Deload</button>'}
    <button class="btn ghost wide" data-act="p-week-manual">Arc-Woche manuell abschließen</button>`);
}

function quoteSettings(s) {
  const hidden = new Set(s.quotesHidden || []);
  const all = [...QUOTES, ...(s.ownQuotes || [])];
  return `<section class="card"><div class="label">Zitate</div>
    <p class="muted small">Erscheinen im Arc-Intro, im Debrief und nach jeder dritten Mission. Antippen blendet aus.</p>
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
  if (s.kind === 'quest') return 'Wochen-Quest erfüllt';
  if (s.kind === 'ascension') return `Ascension: ${ASCENSIONS.find((a) => a.id === s.ascension)?.name || ''}`;
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
    const tabs = [['status', 'Status'], ['woche', 'Woche'], ['mobility', 'Mobil'], ['verlauf', 'Verlauf'], ['setup', 'Setup']];
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
          <div><dt>Kampfkraft</dt><dd class="num">${st.kk.toLocaleString('de-DE')}</dd></div>
          <div><dt>Wochen-Streak</dt><dd class="num">${st.week.streak} (Rekord ${st.week.best})</dd></div>
          <div><dt>Diese Woche</dt><dd>${st.week.thisWeek} von 3 Einsätzen</dd></div>
          <div><dt>Schild</dt><dd>${st.week.shieldUsedThisMonth ? 'diesen Monat verbraucht' : 'bereit'}</dd></div>
        </dl>`);
      out += sys('Titel', `<div class="titles">${titleStatus(data).map((t) => `<button class="title-chip${t.unlocked ? ' on' : ''}${data.settings.title === t.id ? ' eq' : ''}" ${t.unlocked ? `data-act="p-title" data-id="${t.id}"` : 'disabled'}>
          <b>${esc(t.name)}</b><small>${esc(t.desc)}${data.settings.title === t.id ? ' · ausgerüstet' : ''}</small></button>`).join('')}</div>`);
      out += sys('Attribut-Ränge', attributeRanks(data));
      out += sys('Ascensions', ascensionGrid(data, c.today()));
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

    const s = data.settings;
    return out + `
      <section class="card"><div class="label">Eigener Raum</div>${equipmentToggles(ROOM_EQUIPMENT, s.equipment.room, 'room')}</section>
      <section class="card"><div class="label">Home Gym</div>${equipmentToggles(GYM_EQUIPMENT, s.equipment.gym, 'gym')}
        <p class="muted small">Ohne Kettlebells im Home Gym nimmt die App Kurzhanteln.</p></section>
      <section class="card"><div class="label">Kettlebell-Gewichte (kg)</div>${kbGrid(s.kbWeights)}</section>
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
      ${quoteSettings(s)}
      <section class="card"><div class="label">Daten</div>
        <p class="muted small">Letzte Sicherung: ${s.lastBackupAt ? formatDay(s.lastBackupAt.slice(0, 10)) : 'noch nie'}</p>
        <div class="row gap"><button class="btn primary grow" data-act="p-export">Exportieren</button>
        <label class="btn grow">Importieren<input type="file" accept="application/json,.json" data-change="import" hidden></label></div>
        <button class="btn ghost wide danger" data-act="p-reset">Alle Daten löschen</button></section>
      <p class="foot muted">UMBRA · Daten nur auf diesem Gerät.</p>`;
  },
  actions: {
    ...journalActions,
    ptab: (c, d) => c.setUi({ ptab: d.v }),
    'wk-tip': (c, d, el) => el.classList.toggle('open'),
    'p-deload': (c) => c.system('Deload-Woche jetzt?', '<p>Die laufende Arc-Woche wird zur Deload-Woche: halbe Sätze, gleiches Gewicht, 3 Wdh. im Tank. Danach beginnt der nächste Arc.</p>',
      [['p-deload-yes', 'Deload-Woche starten', 'primary'], ['close-modal', 'Abbrechen']]),
    'p-deload-yes': (c) => {
      c.modal(null);
      c.update((data) => logDecision({ ...data, engine: startDeload(data.engine) },
        { rule: 'deload:manual', day: c.today(), suggestion: 'deload_week', decision: 'accepted' }));
    },
    'p-week-manual': (c) => c.system('Arc-Woche abschließen?', `<p>Für Sonderfälle: Die laufende Arc-Woche ${c.data.engine.arc?.week}/${ARC_WEEKS} gilt sofort als abgeschlossen, egal wie viele Missionen darin waren. Die Korrektur wird im Regel-Protokoll vermerkt.</p>`,
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
    'q-del': (c, d) => setSettings(c, { ownQuotes: (c.data.settings.ownQuotes || []).filter((q) => q.id !== d.id) }),
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
