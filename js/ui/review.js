// Wochenrückblick (sonntags, unter 2 Minuten): Zahlen ansehen, 2 Taps, fertig.
import { sys, esc } from './kit.js';
import { reviewDue, reviewSnapshot } from '../engine/debrief.js';
import { REGIONS } from '../engine/signals.js';
import { BOSSES } from '../data/lore.js';
import { bossImage } from './lore.js';
import { getDef } from '../data/exercises.js';
import { weekStart, formatDay, addDays } from '../engine/dates.js';
import { weekLoad } from '../engine/session.js';
import { activeOaths, rateAutomaticity, oathText, nightsKept } from '../engine/oaths.js';
import { sleepInsights, INSIGHT_NOTE } from '../engine/sleep.js';
import { settleReset } from '../engine/reset.js';

function scale(name, value, low, high) {
  return `<div class="scale5">${[1, 2, 3, 4, 5].map((n) => `<button class="rpe${value === n ? ' on' : ''}" data-act="rv-pick" data-name="${name}" data-v="${n}">${n}</button>`).join('')}</div>
    <div class="row muted small" style="justify-content:space-between"><span>${low}</span><span>${high}</span></div>`;
}

function oathRating(c, ws) {
  const list = activeOaths(c.data.oaths);
  if (!list.length) return '';
  const nights = nightsKept(c.data.oaths, ws, addDays(ws, 6));
  return sys('Der Eid · wie automatisch?', `<p class="muted small">${nights ? `In ${nights} ${nights === 1 ? 'Nacht' : 'Nächten'} diese Woche Wort gehalten.` : 'Gezählt wird nur, was du hältst.'} 1 = kostet Kraft, 5 = läuft von allein.</p>
    ${list.map((o) => `<div class="q"><div class="q-label oath-q">${esc(oathText(o))}</div><div class="scale5">${[1, 2, 3, 4, 5].map((n) =>
      `<button class="rpe${o.auto?.[ws] === n ? ' on' : ''}" data-act="rv-auto" data-id="${o.id}" data-v="${n}">${n}</button>`).join('')}</div></div>`).join('')}`, { tone: 'gold' });
}

export function insightsCard(data, today, opts = {}) {
  const list = sleepInsights(data, today, opts);
  if (!list.length) return '';
  return sys('Schlaf · deine Zusammenhänge', `${list.map((x) => `<div class="insight"><b>${esc(x.title)}</b><p class="small">${esc(x.text)}</p>
    <small class="muted">${esc(x.a.label)}: ${x.a.n} · ${esc(x.b.label)}: ${x.b.n} Datenpunkte</small></div>`).join('')}
    <p class="muted small">${INSIGHT_NOTE}</p>`, { tone: 'calm' });
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
          <div><dt>Trainingslast</dt><dd class="num">${weekLoad(c.data.sessions, ws, addDays(ws, 6)) || '–'}</dd></div>
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
      ${oathRating(c, ws)}
      ${insightsCard(c.data, c.today())}
      ${sys('Zwei Taps', `<div class="q"><div class="q-label">Spaß</div>${scale('fun', f.fun, 'zäh', 'stark')}</div>
        <div class="q"><div class="q-label">Belastung</div>${scale('strain', f.strain, 'leicht', 'am Limit')}</div>
        <button class="btn primary wide" data-act="rv-save" ${f.fun && f.strain ? '' : 'disabled'}>Abschließen</button>`)}`;
  },
  actions: {
    'rv-auto': (c, d) => {
      const ws = c.ui.reviewWeek;
      let sealed = [];
      c.update((data) => {
        const r = rateAutomaticity(data.oaths, ws, d.id, Number(d.v), c.today());
        sealed = r.sealed;
        if (!sealed.length) return { ...data, oaths: r.oaths };
        const codex = { ...(data.codex || {}) };
        for (const id of sealed) codex[`oath:${id}`] = { day: c.today(), text: oathText(r.oaths.list.find((x) => x.id === id)) };
        return { ...data, oaths: r.oaths, codex };
      });
      if (sealed.length) {
        const o = c.data.oaths.list.find((x) => x.id === sealed[0]);
        c.system('Besiegelt.', `<div class="seal big" aria-hidden="true">◆</div><p class="oath-line">${esc(oathText(o))}</p>
          <p class="muted">Drei Wochen in Folge automatisch. Das gehört jetzt zu dir. Du kannst ein neues Gelübde wählen.</p>`, [['close-modal', 'Weiter', 'primary']], 'gold aura');
      }
    },
    'rv-pick': (c, d) => { c.ui.rv = { ...c.ui.rv, [d.name]: Number(d.v) }; c.render(); },
    'rv-save': (c) => {
      const ws = c.ui.reviewWeek;
      const snap = reviewSnapshot(c.data, ws, c.today());
      const entry = { day: c.today(), fun: c.ui.rv.fun, strain: c.ui.rv.strain, snapshot: snap };
      c.update((data) => settleReset({ ...data, reviews: { ...(data.reviews || {}), [ws]: entry } }, ws, c.today()));
      c.ui.rv = null;
      c.ui.reviewWeek = null;
      c.go('heute');
      c.system('Woche verbucht', '<p>Neue Woche, neuer Fokus.</p>', undefined, 'calm');
    },
  },
};
