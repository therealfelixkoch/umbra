// Profil: Rang, Verlauf, Bestleistungen, Einstellungen, Daten.
import { esc, sys, stepper, loadText, kg } from './kit.js';
import { hud } from './today.js';
import { playerStats, RANKS } from '../engine/game.js';
import { startDeload, DELOAD_AFTER } from '../engine/cycle.js';
import { formatDay } from '../engine/dates.js';
import { MISSIONS } from '../data/missions.js';
import { getDef } from '../data/exercises.js';
import { equipmentToggles, kbGrid, toggleIn, ROOM_EQUIPMENT, GYM_EQUIPMENT } from './onboarding.js';
import { exportFile, readImportFile } from '../store.js';
import { defaultData } from '../state.js';
import { scoreChart, historyList } from './check.js';
import { latestTest } from '../engine/mobility.js';

const setSettings = (c, patch) => c.update((data) => ({ ...data, settings: { ...data.settings, ...patch } }));

function sessionLabel(s) {
  if (s.kind === 'arena') return `Arena · ${s.rpe ? `Intensität ${s.rpe}` : s.intensity === 'hard' ? 'Sparring' : 'Technik'} · ${s.minutes} min`;
  if (s.kind === 'check') return 'Mobility-Check';
  const m = MISSIONS[s.missionId];
  const pct = s.kind === 'mission' && s.completion < 0.999 ? ` · ${Math.round(s.completion * 100)} %` : '';
  const mod = s.modifier === 'deload' ? ' · Deload' : s.modifier === 'comeback' ? ' · Wiedereinstieg' : '';
  return `${m?.name || s.missionId}${s.profile === 'gym' && s.kind === 'mission' ? ' · Gym' : ''}${mod}${pct}`;
}

export default {
  render(c) {
    const data = c.data;
    const st = playerStats(data, c.today());
    const tab = c.ui.ptab || 'status';
    const tabs = [['status', 'Status'], ['mobility', 'Mobility'], ['verlauf', 'Verlauf'], ['setup', 'Setup']];
    let out = `${hud(c)}<div class="seg">${tabs.map(([k, v]) => `<button class="${tab === k ? 'on' : ''}" data-act="ptab" data-v="${k}">${v}</button>`).join('')}</div>`;

    if (tab === 'status') {
      const next = st.rank.next;
      out += sys(`Rang ${st.rank.name || st.rank.id}`, `
        <div class="rank-row">${RANKS.map((r, i) => `<span class="${i <= st.rank.index ? 'on' : ''}">${r.id === 'U' ? '∞' : r.id}</span>`).join('')}</div>
        <div class="xpbar big"><i style="width:${Math.round(st.rank.progress * 100)}%"></i></div>
        <p class="muted">${st.xp.toLocaleString('de-DE')} XP${next ? ` · noch ${(next.xp - st.xp).toLocaleString('de-DE')} bis ${next.name || `Rang ${next.id}`}` : ''}</p>
        <dl class="facts">
          <div><dt>Kampfkraft</dt><dd class="num">${st.kk.toLocaleString('de-DE')}</dd></div>
          <div><dt>Wochen-Streak</dt><dd class="num">${st.week.streak} (Rekord ${st.week.best})</dd></div>
          <div><dt>Diese Woche</dt><dd>${st.week.thisWeek} von 3 Einsätzen</dd></div>
          <div><dt>Schild</dt><dd>${st.week.shieldUsedThisMonth ? 'diesen Monat verbraucht' : 'bereit'}</dd></div>
        </dl>`);
      const e = data.engine;
      out += sys('Belastungssteuerung', `<p>${e.deloadRemaining > 0 ? `Deload aktiv: noch ${e.deloadRemaining} Einheiten.` : `Nächster Deload in ${DELOAD_AFTER - e.fullSinceDeload} vollen Missionen.`}</p>
        ${e.deloadRemaining > 0 ? '' : '<button class="btn wide" data-act="p-deload">Ich brauche einen Deload</button>'}`);
      const recs = Object.entries(data.records).filter(([id]) => getDef(id) || id === 'EXPRESS');
      out += `<section class="card"><div class="label">Bestleistungen</div>${recs.length ? recs.map(([id, r]) => {
        if (id === 'EXPRESS') return `<div class="done-row"><span>Kurzeinsatz</span><b>${r.value} Runden</b></div>`;
        const def = getDef(id);
        return `<div class="done-row"><span>${esc(def.name)}</span><b>${r.value}${def.mode === 'time' ? ' s' : ''}${r.load ? ` · ${esc(loadText(def, r.load))}` : ''}</b></div>`;
      }).join('') : '<p class="muted">Noch keine. Die erste Mission setzt die Messlatte.</p>'}</section>`;
      return out;
    }

    if (tab === 'mobility') {
      const tests = data.mobility || [];
      if (!latestTest(tests)) {
        return out + sys('Noch kein Mobility-Check', '<p>8 Tests, 10 Minuten. Danach kennst du deine Scores pro Region und dein Fluss wird persönlich.</p><button class="btn primary wide" data-act="go" data-to="check">Check starten</button>');
      }
      return out + sys('Mobility pro Region', scoreChart(tests))
        + `<section class="card"><div class="label">Alle Checks</div>${historyList(tests)}</section>
        <button class="btn primary wide" data-act="go" data-to="check">Neuen Check machen</button>`;
    }

    if (tab === 'verlauf') {
      const list = data.sessions.slice().reverse().slice(0, 60);
      return out + `<section class="card">${list.length ? list.map((s) =>
        `<div class="done-row"><span><small class="muted">${formatDay(s.day)}</small> ${esc(sessionLabel(s))}</span><b class="muted">+${s.xp} XP</b></div>`).join('')
        : '<p class="muted">Noch nichts geloggt.</p>'}</section>`;
    }

    const s = data.settings;
    return out + `
      <section class="card"><div class="label">Eigener Raum</div>${equipmentToggles(ROOM_EQUIPMENT, s.equipment.room, 'room')}</section>
      <section class="card"><div class="label">Home Gym</div>${equipmentToggles(GYM_EQUIPMENT, s.equipment.gym, 'gym')}
        <p class="muted small">Ohne Kettlebells im Home Gym nimmt die App Kurzhanteln.</p></section>
      <section class="card"><div class="label">Kettlebell-Gewichte (kg)</div>${kbGrid(s.kbWeights)}</section>
      <section class="card"><div class="label">Körpergewicht</div>${stepper('p-bw', kg(s.bodyweight), 'kg')}
        <div class="label">Pausenzeit zwischen Sätzen</div>
        <div class="chips">${[60, 75, 90, 120].map((v) => `<button class="chip${s.restSec === v ? ' on' : ''}" data-act="p-rest" data-v="${v}">${v} s</button>`).join('')}</div>
        <div class="label">Ton bei Timer-Ende</div>
        <div class="chips"><button class="chip${s.sound !== false ? ' on' : ''}" data-act="p-sound" data-v="1">An</button><button class="chip${s.sound === false ? ' on' : ''}" data-act="p-sound" data-v="0">Aus</button></div></section>
      <section class="card"><div class="label">Daten</div>
        <p class="muted small">Letzte Sicherung: ${s.lastBackupAt ? formatDay(s.lastBackupAt.slice(0, 10)) : 'noch nie'}</p>
        <div class="row gap"><button class="btn primary grow" data-act="p-export">Exportieren</button>
        <label class="btn grow">Importieren<input type="file" accept="application/json,.json" data-change="import" hidden></label></div>
        <button class="btn ghost wide danger" data-act="p-reset">Alle Daten löschen</button></section>
      <p class="foot muted">UMBRA · Daten nur auf diesem Gerät.</p>`;
  },
  actions: {
    ptab: (c, d) => c.setUi({ ptab: d.v }),
    'p-deload': (c) => {
      c.update((data) => ({ ...data, engine: startDeload(data.engine) }));
      c.system('Deload aktiviert', '<p>Die nächsten 4 Missionen: halbe Sätze, gleiches Gewicht, kein Versagen.</p>');
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
    'p-rest': (c, d) => setSettings(c, { restSec: Number(d.v) }),
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
  async onChange(c, name, el) {
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
