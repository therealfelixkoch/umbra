// Wochenrückblick (sonntags, unter 2 Minuten): Zahlen ansehen, 2 Taps, fertig.
import { sys, esc } from './kit.js';
import { reviewDue, reviewSnapshot } from '../engine/debrief.js';
import { REGIONS } from '../engine/signals.js';
import { BOSSES } from '../data/lore.js';
import { bossImage } from './lore.js';
import { getDef } from '../data/exercises.js';
import { weekStart, formatDay } from '../engine/dates.js';

function scale(name, value, low, high) {
  return `<div class="scale5">${[1, 2, 3, 4, 5].map((n) => `<button class="rpe${value === n ? ' on' : ''}" data-act="rv-pick" data-name="${name}" data-v="${n}">${n}</button>`).join('')}</div>
    <div class="row muted small" style="justify-content:space-between"><span>${low}</span><span>${high}</span></div>`;
}

export default {
  render(c) {
    const today = c.today();
    const ws = c.ui.reviewWeek || reviewDue(c.data, today) || weekStart(today);
    c.ui.reviewWeek = ws;
    const snap = reviewSnapshot(c.data, ws, today);
    const f = c.ui.rv || (c.ui.rv = { ...(c.data.reviews?.[ws] || {}) });
    const total = snap.classes.high + snap.classes.normal + snap.classes.low || 1;
    const bar = (k, label) => `<div class="bar-row static"><span class="bar-label">${label}</span><span class="bar-track"><i class="bar-fill ${k}" style="width:${(snap.classes[k] / total) * 100}%"></i></span><span class="bar-val num">${snap.classes[k]}</span></div>`;
    const boss = snap.boss;
    return `<button class="btn ghost back" data-act="go" data-to="heute">← Heute</button>
      <h1 class="h">Wochenrückblick</h1>
      <p class="muted">Woche ab ${formatDay(ws)}</p>
      ${sys('Bilanz', `<dl class="facts">
          <div><dt>Einsätze</dt><dd class="num">${snap.einsaetze}</dd></div>
          <div><dt>Ellbogen-Zähler</dt><dd>${snap.elbow.count}/${snap.elbow.threshold}${snap.elbow.full ? ' · voll' : ''}</dd></div>
          <div><dt>Gemeldete Regionen</dt><dd>${snap.regions.length ? snap.regions.map((r) => REGIONS[r]).join(', ') : 'keine'}</dd></div>
          <div><dt>Stagnation</dt><dd>${snap.stagnation.stage2 ? 'mehrere Muster' : snap.stagnation.stage1.length ? snap.stagnation.stage1.map((id) => esc(getDef(id)?.name || id)).join(', ') : 'keine'}</dd></div>
        </dl>
        <div class="label">Belastung</div><div class="bar-chart load-bars">${bar('high', 'High')}${bar('normal', 'Normal')}${bar('low', 'Low')}</div>
        ${snap.patterns.length ? `<div class="label">Muster</div><ul class="cues">${snap.patterns.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}`)}
      ${boss ? sys(BOSSES[boss.id].name, `<div class="boss-row">${bossImage(boss.id, { hp: boss.hp, max: boss.max, cls: 'lore-small' })}
          <div><div class="hpbar"><i style="width:${(boss.hp / boss.max) * 100}%"></i></div>
          <p class="num">${boss.hp.toLocaleString('de-DE')} / ${boss.max} Lebenspunkte</p>
          <p class="muted small">${boss.defeated ? 'Gefallen.' : 'Er heilt sich nicht. Jeder Einsatz zählt.'}</p></div></div>`) : ''}
      ${sys('Zwei Taps', `<div class="q"><div class="q-label">Spaß</div>${scale('fun', f.fun, 'zäh', 'stark')}</div>
        <div class="q"><div class="q-label">Belastung</div>${scale('strain', f.strain, 'leicht', 'am Limit')}</div>
        <button class="btn primary wide" data-act="rv-save" ${f.fun && f.strain ? '' : 'disabled'}>Abschließen</button>`)}`;
  },
  actions: {
    'rv-pick': (c, d) => { c.ui.rv = { ...c.ui.rv, [d.name]: Number(d.v) }; c.render(); },
    'rv-save': (c) => {
      const ws = c.ui.reviewWeek;
      const snap = reviewSnapshot(c.data, ws, c.today());
      const entry = { day: c.today(), fun: c.ui.rv.fun, strain: c.ui.rv.strain, snapshot: snap };
      c.update((data) => ({ ...data, reviews: { ...(data.reviews || {}), [ws]: entry } }));
      c.ui.rv = null;
      c.ui.reviewWeek = null;
      c.go('heute');
      c.system('Woche verbucht', '<p>Neue Woche, neuer Fokus.</p>', undefined, 'calm');
    },
  },
};
