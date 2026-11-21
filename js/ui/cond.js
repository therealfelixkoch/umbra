// Conditioning in der Fighting Cave (POWER/MIX, 15 oder 30 min) und der Hinweis auf den Cave-Zirkel.
// Conditioning zählt für die Woche, ist aber keine Einheit: A/B/C bleibt stehen.
// Plan und Prüfung kommen aus der Engine (engine/conditioning.js, buildPlan mit cond bzw. cave).
import { esc } from './kit.js';
import { buildPlan, createActive, profileContext } from '../engine/plan.js';
import { condOptions, caveStatus, CAVE_KB } from '../engine/conditioning.js';
import { EQUIPMENT } from '../data/exercises.js';
import { UNIT_LETTER } from '../data/program.js';

const FORMAT_TEXT = {
  power: '20 s voll, 40 s locker · nur Sack',
  mix: '40 s Arbeit, 20 s Pause · Sack und Körpergewicht im Wechsel',
};

/** Machbare Formate in der Fighting Cave. */
export function condChoices(data) {
  const { equipment, settings } = profileContext(data.settings, 'room');
  return condOptions(equipment, settings.kbWeights);
}

function condCfg(c, opts) {
  const saved = c.data.settings.cond || {};
  const cur = c.ui.cond || {};
  const format = [cur.format, saved.format].find((f) => opts.some((o) => o.id === f)) || opts[0]?.id;
  const minutes = [cur.minutes, saved.minutes].find((m) => m === 15 || m === 30) || 15;
  return (c.ui.cond = { format, minutes });
}

/** Auswahl Format + Dauer und Start-Knopf. `compact` = ohne eigene Karte (für Heute). */
export function condPicker(c, { compact = false } = {}) {
  const opts = condChoices(c.data);
  if (!opts.length) {
    return `<p class="muted small">Conditioning braucht den Sack in der Fighting Cave. Im Profil unter Ausstattung anhaken.</p>`;
  }
  const cfg = condCfg(c, opts);
  const body = `<div class="cond-formats">${opts.map((o) => `<button class="cond-opt${cfg.format === o.id ? ' on' : ''}" data-act="cond-format" data-v="${o.id}" aria-pressed="${cfg.format === o.id}">
      <b>${esc(o.name)}</b><small>${esc(FORMAT_TEXT[o.id] || o.focus)}</small></button>`).join('')}</div>
    <div class="chips cond-min">${[15, 30].map((m) => `<button class="chip${cfg.minutes === m ? ' on' : ''}" data-act="cond-min" data-v="${m}" aria-pressed="${cfg.minutes === m}">${m} min</button>`).join('')}</div>
    <button class="btn ${compact ? '' : 'primary '}wide" data-act="cond-start">Conditioning starten</button>`;
  if (compact) return body;
  return `<section class="card">
      <div class="label">Conditioning</div>
      <p class="muted small">15 oder 30 min Power in der Fighting Cave, mit 2 min Aufwärmen. Zählt für die Woche, die nächste Einheit bleibt stehen.</p>
      ${body}
    </section>`;
}

const missingName = (id) => (id === CAVE_KB ? 'Kettlebell ab 16 kg' : EQUIPMENT[id] || id);

/** Cave-Zirkel: Start-Knopf, wenn die Cave die Einheit trägt, sonst dezent, was noch fehlt. */
export function caveOffer(c, next) {
  if (!next) return '';
  const st = caveStatus(c.data, next);
  if (st.ok) {
    return `<button class="btn wide kurz-btn" data-act="cave-start" data-id="${esc(next)}"><b>Cave-Zirkel · ${esc(UNIT_LETTER[next] || next)}</b><small>ca. 30 min · zählt als Einheit</small></button>
      <p class="muted small center">Hauptübung, CMPND Block und Power am Sack in der Fighting Cave. Ganz freiwillig.</p>`;
  }
  if (!st.missing.length) return '';
  return `<p class="muted small cave-miss">Cave-Zirkel geht, sobald in der Fighting Cave da sind: ${st.missing.map((m) => esc(missingName(m))).join(', ')}.</p>`;
}

function startPlan(c, plan) {
  if (c.data.active) { c.go('training'); return; }
  const today = c.today();
  c.update((data) => ({ ...data, active: createActive(plan, today) }));
  c.go('training');
}

export const condActions = {
  'cond-format': (c, d) => { c.ui.cond = { ...c.ui.cond, format: d.v }; c.render(); },
  'cond-min': (c, d) => { c.ui.cond = { ...c.ui.cond, minutes: Number(d.v) }; c.render(); },
  'cond-start': (c) => {
    const opts = condChoices(c.data);
    if (!opts.length) return;
    const cfg = condCfg(c, opts);
    const plan = buildPlan({ missionId: 'COND', profile: 'room', data: c.data, today: c.today(), cond: { format: cfg.format, minutes: cfg.minutes } });
    if (plan.unavailable) {
      c.system('Conditioning', '<p>Mit der Ausstattung der Fighting Cave geht dieses Format gerade nicht.</p>');
      return;
    }
    c.update((data) => ({ ...data, settings: { ...data.settings, cond: { format: cfg.format, minutes: cfg.minutes } } }));
    startPlan(c, plan);
  },
  'cave-start': (c, d) => {
    if (!caveStatus(c.data, d.id).ok) return;
    const plan = buildPlan({ missionId: d.id, data: c.data, today: c.today(), cave: true });
    startPlan(c, plan);
  },
};
