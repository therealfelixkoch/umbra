// OATHS: der Eid des Wächters. Drei Wenn-dann-Gelübde, abends ein Tap pro gehaltenem Gelübde.
// Keine roten Zustände, keine Serien, die abreißen. Ein Ausrutscher ist ein Datenpunkt.
import { sys, esc } from './kit.js';
import { formatDay } from '../engine/dates.js';
import {
  TEMPLATES, SITUATIONS, ACTIONS, MAX_OATHS, activeOaths, sealedOaths, addOath, rephraseOath, retireOath, toggleKept, keptOn,
  logSlip, nightsKept, arcReviewDue, oathText, isAlcohol, eveningDay, emptyOaths,
} from '../engine/oaths.js';

export const ALCOHOL_INFO = 'Nach sehr viel Alkohol (in der Studie ca. 12 Drinks) war die Muskelproteinsynthese nach dem Training um 24–37 % geringer (Parr et al., PLOS ONE 2014).';

const arcRef = (data) => (data.engine?.arc ? { n: data.engine.arc.n, week: data.engine.arc.week } : null);
const setOaths = (c, fn) => c.update((data) => ({ ...data, oaths: fn(data.oaths || emptyOaths()) }));

/** Karte für Heute: ab 20 Uhr ein Tap pro gehaltenem Gelübde (bis mittags für gestern nachholbar). */
export function eveningCard(c) {
  const list = activeOaths(c.data.oaths);
  const day = eveningDay(c.today(), new Date().getHours());
  if (!list.length || !day) return '';
  const kept = keptOn(c.data.oaths, day);
  return `<section class="card oath-card"><div class="label">Der Eid · ${day === c.today() ? 'heute Abend' : 'gestern'}</div>
    <p class="muted small">Tipp, was du gehalten hast. Jedes gehaltene Gelübde zündet eine Glut an.</p>
    <div class="oath-taps">${list.map((o) => `<button class="oath-tap${kept.includes(o.id) ? ' on' : ''}" data-act="oath-keep" data-id="${o.id}" data-day="${day}">
      <i class="ember" aria-hidden="true"></i><span>${esc(oathText(o))}</span></button>`).join('')}</div></section>`;
}

function builder(c) {
  const f = c.ui.ob;
  const chip = (act, v, label) => `<button class="chip" data-act="${act}" data-v="${esc(v)}">${esc(label)}</button>`;
  return `<button class="btn ghost back" data-act="ob-cancel">← Der Eid</button>
    <h1 class="h">${f.mode === 'rephrase' ? 'Umformulieren' : 'Neues Gelübde'}</h1>
    ${f.mode === 'rephrase' ? '' : sys('Vorlagen', `<div class="pull-list">${TEMPLATES.map((t, i) => `<button class="swap" data-act="ob-tpl" data-i="${i}"><small>${esc(oathText(t))}</small></button>`).join('')}</div>`)}
    ${sys('Wenn …', `<input class="search" data-input="ob-when" value="${esc(f.when)}" placeholder="Situation" autocomplete="off">
      <div class="chips scroll">${SITUATIONS.map((s) => chip('ob-when', s, s)).join('')}</div>`)}
    ${sys('… dann', `<input class="search" data-input="ob-then" value="${esc(f.then)}" placeholder="Handlung" autocomplete="off">
      <div class="chips scroll">${ACTIONS.map((s) => chip('ob-then', s, s)).join('')}</div>`)}
    <section class="card oath-preview"><div class="label">Dein Eid</div><p class="oath-line">${esc(oathText({ when: f.when || '…', then: f.then || '…' }))}</p></section>
    <button class="btn primary wide" data-act="ob-save" ${f.when.trim() && f.then.trim() ? '' : 'disabled'}>${f.mode === 'rephrase' ? 'Neu schwören' : 'Schwören'}</button>
    <p class="muted small">Konkrete Situation, eine kleine Handlung. Je klarer das Wenn, desto automatischer wird das Dann.</p>`;
}

function slipView(c) {
  const f = c.ui.slip;
  const o = (c.data.oaths?.list || []).find((x) => x.id === f.id);
  return `<button class="btn ghost back" data-act="slip-cancel">← Der Eid</button><h1 class="h">Ausrutscher</h1>
    ${sys('Ein Ausrutscher ist ein Datenpunkt.', `<p class="muted">${esc(oathText(o))}</p>
      <div class="q"><div class="q-label">Was war der Auslöser?</div><textarea data-input="slip-trigger" rows="2">${esc(f.trigger)}</textarea></div>
      <div class="q"><div class="q-label">Wie muss der Wenn-dann-Satz anders lauten?</div>
        <input class="search" data-input="slip-when" value="${esc(f.when)}" placeholder="Wenn …" autocomplete="off">
        <input class="search" data-input="slip-then" value="${esc(f.then)}" placeholder="dann …" autocomplete="off"></div>
      <button class="btn primary wide" data-act="slip-save">Festhalten${f.when !== o.when || f.then !== o.then ? ' und anpassen' : ''}</button>`, { tone: 'calm' })}`;
}

function arcReview(c, list) {
  const n = c.data.engine.arc.n;
  return sys(`Arc ${n + 1}: neu schwören`, `<p class="muted small">Wenn-dann-Pläne verlieren nach etwa einem Monat an Wirkung. Für jedes Gelübde: behalten, umformulieren oder ersetzen.</p>
    ${list.map((o) => `<div class="oath-row"><p>${esc(oathText(o))}</p><div class="row gap">
      <button class="btn small" data-act="oar-keep" data-id="${o.id}">Behalten</button>
      <button class="btn small" data-act="oath-rephrase" data-id="${o.id}">Umformulieren</button>
      <button class="btn small ghost" data-act="oath-replace" data-id="${o.id}">Ersetzen</button></div></div>`).join('')}
    <button class="btn primary wide" data-act="oar-done">Fertig</button>`, { tone: 'gold' });
}

export function oathsView(c) {
  if (c.ui.ob) return builder(c);
  if (c.ui.slip) return slipView(c);
  const o = c.data.oaths || emptyOaths();
  const list = activeOaths(o);
  const sealed = sealedOaths(o);
  const arc = c.data.engine.arc;
  const from = arc?.startedDay || '0000';
  const nights = nightsKept(o, from, c.today());
  const today = c.today();
  const kept = keptOn(o, today);
  let out = `<button class="btn ghost back" data-act="go" data-to="heute">← Heute</button><h1 class="h">Der Eid</h1>
    <p class="lore">Der Wächter schwört wenig, aber er hält es. Jedes gehaltene Wort trifft den Gegner, leise und jeden Abend.</p>`;
  if (arc && arcReviewDue(o, arc.n)) out += arcReview(c, list.filter((x) => x.arc != null && x.arc < arc.n));
  out += sys(`Gelübde · ${list.length}/${MAX_OATHS}`, `${list.map((x) => {
    const autos = Object.entries(x.auto || {}).sort().slice(-4).map(([, v]) => v);
    return `<div class="oath-row"><p class="oath-line">${esc(oathText(x))}</p>
      <div class="row gap oath-meta"><button class="oath-tap mini${kept.includes(x.id) ? ' on' : ''}" data-act="oath-keep" data-id="${x.id}" data-day="${today}"><i class="ember"></i><span>heute gehalten</span></button>
      ${autos.length ? `<small class="muted">Automatik ${autos.join(' · ')}</small>` : ''}</div>
      <div class="oath-actions"><button class="btn small ghost" data-act="oath-rephrase" data-id="${x.id}">Umformulieren</button>
      <button class="btn small ghost" data-act="oath-slip" data-id="${x.id}">Ausrutscher</button>
      <button class="btn small ghost" data-act="oath-replace" data-id="${x.id}">Ersetzen</button></div></div>`;
  }).join('') || '<p class="muted">Noch kein Gelübde. Drei kleine Sätze, die dich tragen.</p>'}
    ${list.length < MAX_OATHS ? '<button class="btn primary wide" data-act="oath-new">Gelübde hinzufügen</button>' : ''}
    <p class="muted small">${nights ? `In ${nights} ${nights === 1 ? 'Nacht' : 'Nächten'} hast du in diesem Arc Wort gehalten.` : 'Gezählt wird nur, was du hältst.'} Sonntags fragt der Rückblick, wie automatisch es sich anfühlt. Drei Wochen in Folge 4 oder 5: besiegelt.</p>`, { tone: 'gold' });
  if (sealed.length) {
    out += sys('Besiegelt', sealed.map((x) => `<div class="oath-row sealed"><span class="seal" aria-hidden="true">◆</span><p>${esc(oathText(x))}<br><small class="muted">besiegelt am ${formatDay(x.sealedDay)}</small></p></div>`).join(''));
  }
  out += `<details class="card info-card"${o.alcoholInfoSeen ? '' : ' open'}><summary>Info: Alkohol und Training</summary><p class="small">${ALCOHOL_INFO}</p>
    ${o.alcoholInfoSeen ? '' : '<button class="btn small" data-act="oath-alc-seen">Gelesen</button>'}</details>`;
  return out;
}

export const oathActions = {
  'oath-keep': (c, d) => setOaths(c, (o) => toggleKept(o, d.day, d.id, arcRef(c.data))),
  'oath-new': (c) => c.setUi({ ob: { mode: 'new', when: '', then: '' } }),
  'oath-rephrase': (c, d) => {
    const o = c.data.oaths.list.find((x) => x.id === d.id);
    c.setUi({ ob: { mode: 'rephrase', id: d.id, when: o.when, then: o.then } });
  },
  'oath-replace': (c, d) => {
    c.ui.replaceId = d.id;
    c.system('Gelübde ersetzen?', '<p>Das alte Gelübde wird abgelegt, nicht als gebrochen markiert. Danach wählst du ein neues.</p>',
      [['oath-replace-yes', 'Ersetzen', 'primary'], ['close-modal', 'Abbrechen']], 'calm');
  },
  'oath-replace-yes': (c) => {
    c.modal(null);
    const id = c.ui.replaceId;
    setOaths(c, (o) => retireOath(o, id, c.today()));
    c.setUi({ ob: { mode: 'new', when: '', then: '' } });
  },
  'oath-slip': (c, d) => {
    const o = c.data.oaths.list.find((x) => x.id === d.id);
    c.setUi({ slip: { id: d.id, trigger: '', when: o.when, then: o.then } });
  },
  'oath-alc-seen': (c) => setOaths(c, (o) => ({ ...o, alcoholInfoSeen: true })),
  'ob-cancel': (c) => c.setUi({ ob: null }),
  'ob-tpl': (c, d) => { const t = TEMPLATES[Number(d.i)]; c.setUi({ ob: { ...c.ui.ob, when: t.when, then: t.then, alcohol: !!t.alcohol } }); },
  'ob-when': (c, d) => c.setUi({ ob: { ...c.ui.ob, when: d.v } }),
  'ob-then': (c, d) => c.setUi({ ob: { ...c.ui.ob, then: d.v } }),
  'ob-save': (c) => {
    const f = c.ui.ob;
    let alc = false;
    try {
      if (f.mode === 'rephrase') setOaths(c, (o) => rephraseOath(o, f.id, { when: f.when, then: f.then, day: c.today() }));
      else {
        setOaths(c, (o) => addOath(o, { when: f.when, then: f.then, alcohol: f.alcohol, day: c.today(), arc: c.data.engine.arc?.n ?? null }));
        alc = isAlcohol(f);
      }
    } catch (err) {
      c.system('Nicht gespeichert', `<p>${esc(err.message)}</p>`);
      return;
    }
    c.setUi({ ob: null });
    if (alc && !c.data.oaths.alcoholInfoSeen) {
      c.system('Zur Info', `<p>${ALCOHOL_INFO}</p><p class="muted small">Sachlich, kein Urteil. Nachlesbar unter Der Eid.</p>`, [['oath-alc-ok', 'Verstanden', 'primary']], 'calm');
    } else c.system('Geschworen.', `<p class="oath-line">${esc(oathText({ when: f.when.trim(), then: f.then.trim() }))}</p>`, undefined, 'gold');
  },
  'oath-alc-ok': (c) => { c.modal(null); setOaths(c, (o) => ({ ...o, alcoholInfoSeen: true })); },
  'slip-cancel': (c) => c.setUi({ slip: null }),
  'slip-save': (c) => {
    const f = c.ui.slip;
    const o = c.data.oaths.list.find((x) => x.id === f.id);
    const changed = f.when.trim() && f.then.trim() && (f.when.trim() !== o.when || f.then.trim() !== o.then);
    setOaths(c, (os) => {
      let n = logSlip(os, { day: c.today(), id: f.id, trigger: f.trigger, rewrite: changed ? oathText({ when: f.when.trim(), then: f.then.trim() }) : '' });
      if (changed) n = rephraseOath(n, f.id, { when: f.when, then: f.then, day: c.today() });
      return n;
    });
    c.setUi({ slip: null });
    c.system('Festgehalten.', `<p>${changed ? 'Neuer Wortlaut gilt ab jetzt.' : 'Morgen ist ein neuer Abend.'}</p>`, undefined, 'calm');
  },
  'oar-keep': (c, d) => setOaths(c, (o) => ({ ...o, list: o.list.map((x) => (x.id === d.id ? { ...x, arc: c.data.engine.arc.n } : x)) })),
  'oar-done': (c) => setOaths(c, (o) => ({ ...o, reviewedArc: c.data.engine.arc.n })),
};

export function oathInput(c, name, value) {
  if (c.ui.ob && (name === 'ob-when' || name === 'ob-then')) {
    c.ui.ob[name.slice(3)] = value.slice(0, 120);
    const btn = document.querySelector('[data-act="ob-save"]');
    if (btn) btn.disabled = !(c.ui.ob.when.trim() && c.ui.ob.then.trim());
    const line = document.querySelector('.oath-preview .oath-line');
    if (line) line.textContent = oathText({ when: c.ui.ob.when || '…', then: c.ui.ob.then || '…' });
  }
  if (c.ui.slip && name.startsWith('slip-')) c.ui.slip[name.slice(5)] = value.slice(0, 200);
}

export default {
  render: (c) => oathsView(c),
  actions: oathActions,
  onInput: oathInput,
};
