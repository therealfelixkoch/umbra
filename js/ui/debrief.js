// Arc-Debrief: Zahlen des Arcs, 3 Fragen, Export als JSON-Datei für den Coach.
// Die Comic-Panels (Erzählung durch das System) kommen in Paket 3 dazu.
import { SOURCE_LABELS } from '../data/xp-config.js';
import { sys, esc } from './kit.js';
import { debriefDue, debriefStats, debriefExport } from '../engine/debrief.js';
import { REGION } from '../data/mobility.js';
import { exportFile } from '../store.js';
import { debriefPanels } from '../engine/story.js';
import { comicPanels, bindPanels, guardianImage } from './lore.js';
import { playerStats, rankName } from '../engine/game.js';
import { guardianTier } from '../data/lore.js';
import { highestAscension } from '../engine/progress.js';

const num = (v) => (typeof v === 'number' ? v.toLocaleString('de-DE', { maximumFractionDigits: 1 }) : v);
const QUESTIONS = [['annoyed', 'Was hat genervt?'], ['fun', 'Was hat Spaß gemacht?'], ['pinched', 'Was hat gezwickt?']];

export default {
  render(c) {
    const today = c.today();
    const n = c.ui.debriefArc ?? debriefDue(c.data, today) ?? c.data.engine.arc?.n ?? 0;
    c.ui.debriefArc = n;
    const st = debriefStats(c.data, n, today);
    if (!st) return sys('Keine Saison', '<p>Für diese Saison gibt es noch keine Daten.</p><button class="btn wide" data-act="go" data-to="heute">Zurück</button>');
    const saved = c.data.debriefs?.[n] || {};
    const draft = c.ui.debrief || (c.ui.debrief = { ...(saved.answers || {}) });
    return `<button class="btn ghost back" data-act="go" data-to="heute">← Heute</button>
      <h1 class="h">Debrief · ${st.arc.name}</h1>
      <p class="muted">${esc(st.arc.name)} · ${st.arc.from} bis ${st.arc.to}</p>
      ${comicPanels(debriefPanels(c.data, st), 'debrief-panels')}
      ${(() => { const ps = playerStats(c.data, today); const asc = highestAscension(c.data);
        return guardianImage(guardianTier(ps.rank.id), { aura: asc?.aura, caption: `Der Wächter · ${esc(rankName(ps.rank))}` }); })()}
      ${st.sleep.length ? sys('Schlaf · deine Zusammenhänge', `${st.sleep.map((x) => `<p class="small">${esc(x.text)}</p>`).join('')}<p class="muted small">Deine Daten, keine Diagnose.</p>`, { tone: 'calm' }) : ''}
      <details class="raw"><summary>Alle Zahlen</summary>
      ${sys('Konstanz', `<dl class="facts">
        <div><dt>Missionen</dt><dd class="num">${st.missions}${st.compact ? ` (${st.compact} Kompakt)` : ''}</dd></div>
        <div><dt>ARENA</dt><dd class="num">${st.arena} · ${st.arenaHours.toLocaleString('de-DE')} h</dd></div>
        <div><dt>FLOW-Tage</dt><dd class="num">${st.flowDays}</dd></div>
        <div><dt>Längste Serie</dt><dd class="num">${st.longestStreak} W</dd></div>
        <div><dt>Bestleistungen</dt><dd class="num">${st.records}</dd></div>
        <div><dt>TEMPER</dt><dd>${esc(st.temper)}</dd></div>
        ${st.wrist ? `<div><dt>Handgelenk</dt><dd>${esc(st.wrist)}</dd></div>` : ''}
        ${st.feet ? `<div><dt>FEET</dt><dd>${esc(st.feet)}</dd></div>` : ''}
        ${st.boss ? `<div><dt>Wächter</dt><dd>${esc(st.boss.name)}${st.boss.defeated ? ' · besiegt' : ''}</dd></div>` : ''}
      </dl>`)}
      ${sys('ARENA', `<dl class="facts">
        <div><dt>Einheiten</dt><dd class="num">${st.arenaDetail.sessions} · ${st.arenaDetail.hours.toLocaleString('de-DE')} h</dd></div>
        <div><dt>Sparringsrunden</dt><dd class="num">${st.arenaDetail.sparRounds}</dd></div>
        <div><dt>Inhalte</dt><dd>${Object.entries(st.arenaDetail.content).filter(([, v]) => v).map(([k, v]) => `${esc(k)} ${v}×`).join(', ') || '–'}</dd></div>
        ${st.arenaDetail.tech.current ? `<div><dt>Technik-Check</dt><dd>${(Object.values(st.arenaDetail.tech.current.scores).reduce((a, b) => a + b, 0) / Object.keys(st.arenaDetail.tech.current.scores).length).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Ø${st.arenaDetail.tech.previous ? ` (vorher ${(Object.values(st.arenaDetail.tech.previous.scores).reduce((a, b) => a + b, 0) / Object.keys(st.arenaDetail.tech.previous.scores).length).toLocaleString('de-DE', { maximumFractionDigits: 1 })})` : ''}</dd></div>` : ''}
        <div><dt>Trainingslast gesamt</dt><dd class="num">${st.trainingLoad || '–'}</dd></div></dl>`)}
      ${sys('XP pro Quelle', `${Object.entries(st.xpBySource).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="done-row"><span>${esc(SOURCE_LABELS[k] || k)}</span><span class="num">${v}</span></div>`).join('') || '<p class="muted">Keine XP in diesem Arc.</p>'}`)}
      ${st.strength.length ? sys('Kraft', `<ul class="cues">${st.strength.map((x) => `<li>${esc(x.name)}: ${num(x.first)} → ${num(x.best)} ${esc(x.unit)}${x.gain > 0 ? ` (+${num(x.gain)})` : ''}</li>`).join('')}</ul>`) : ''}
      ${st.mobility.length ? sys('Mobility', `<ul class="cues">${st.mobility.map((m) => `<li>${esc(REGION[m.region]?.name || m.region)}: ${m.before ?? '–'} → ${m.after}</li>`).join('')}</ul>`) : ''}
      ${sys('Körpersignale', `<dl class="facts">
        <div><dt>Ellbogen-Meldungen</dt><dd class="num">${st.signals.elbowReports}</dd></div>
        <div><dt>Zwick-Meldungen</dt><dd>${Object.entries(st.signals.painByRegion).map(([r, k]) => `${esc(r)} ${k}×`).join(', ') || 'keine'}</dd></div>
        <div><dt>Stagnationen</dt><dd class="num">${st.signals.stagnations}</dd></div>
        <div><dt>Deloads</dt><dd class="num">${st.signals.deloads}</dd></div></dl>
        ${st.signals.patterns.length ? `<ul class="cues">${st.signals.patterns.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}`)}
      </details>
      ${sys('Drei Fragen', `${QUESTIONS.map(([k, q]) => `<div class="q debrief-q"><div class="q-label">${q}</div>
        <textarea data-input="db-${k}" rows="3" placeholder="Kurz und ehrlich.">${esc(draft[k] || '')}</textarea></div>`).join('')}
        <button class="btn primary wide" data-act="db-save">Antworten speichern</button>`)}
      ${sys('Export für den Coach', `<p class="muted">Eine JSON-Datei mit allen Logs des Arcs, deinen Antworten, den Wochenrückblicken und dem Regel-Protokoll. Gib sie deinem Coach für die nächste Verbesserungsrunde.</p>
        <button class="btn wide" data-act="db-export">Debrief exportieren</button>${saved.exportedAt ? `<p class="muted small">Zuletzt exportiert: ${saved.exportedAt.slice(0, 10)}</p>` : ''}`)}`;
  },
  mount(c, root) {
    bindPanels(root);
  },
  onInput(c, name, value) {
    if (!name.startsWith('db-')) return;
    c.ui.debrief = { ...c.ui.debrief, [name.slice(3)]: value };
  },
  actions: {
    'db-save': (c) => {
      const n = c.ui.debriefArc;
      const answers = { ...c.ui.debrief };
      c.update((data) => ({ ...data, debriefs: { ...(data.debriefs || {}), [n]: { ...(data.debriefs?.[n] || {}), answers, done: true, day: c.today() } } }));
      c.system('Debrief gespeichert', '<p>Exportiere die Datei, damit dein Coach sie auswerten kann.</p>', undefined, 'calm');
    },
    'db-export': async (c) => {
      const n = c.ui.debriefArc;
      const today = c.today();
      // Aktuelle Entwürfe mitnehmen, auch wenn noch nicht gespeichert
      const data = { ...c.data, debriefs: { ...(c.data.debriefs || {}), [n]: { ...(c.data.debriefs?.[n] || {}), answers: { ...c.ui.debrief } } } };
      const file = debriefExport(data, n, today);
      const ok = await exportFile(file, today, `umbra-debrief-arc-${file.arc.id}-${today}.json`);
      if (ok) {
        c.update((d) => ({ ...d, debriefs: { ...(d.debriefs || {}), [n]: { ...(d.debriefs?.[n] || {}), answers: { ...c.ui.debrief }, exportedAt: new Date().toISOString() } } }));
      }
    },
  },
};
