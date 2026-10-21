// FEET im UI: dezente Karte, Fuß-Check (Foto nur lokal, Stoppuhr, Zähler), Profil-Ansicht, Barfuß-Zeit.
// Die App empfiehlt, du entscheidest. Keine Sperren, keine Diagnosen.
import { sys, esc, stepper } from './kit.js';
import { formatDay, weekStart } from '../engine/dates.js';
import { FEET_SIGNS, BAREFOOT_WARN } from '../data/feet.js';
import { FT, STAGE_NAMES, checkDue, lastCheck, addCheck, setStage, feetWeek, weakerSide, barefootTarget, barefootAvg } from '../engine/feet.js';
import { sessionXp } from '../engine/game.js';
import { XP_CONFIG } from '../data/xp-config.js';
import { putPhoto, getPhoto, shrinkImage } from '../store.js';

const LORE_UP = (n) => `Das Fundament trägt mehr. Stufe ${n}.`;
const stageLabel = (n) => (n === 5 ? 'Erhaltung' : `Stufe ${n}`);
const setFeet = (c, fn) => c.update((data) => ({ ...data, feet: fn(FT(data)) }));
const signs = () => `<ul class="cues">${FEET_SIGNS.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`;

/** Dezente Karte auf Heute (+ Check-Erinnerung alle 4 Wochen, Sparring-Frage bei Stufe 4). */
export function feetCard(c, rec = null) {
  const today = c.today();
  const f = FT(c.data);
  let out = '';
  if (checkDue(f, today)) {
    out += `<section class="card flow-card feet-card"><div><b>Fuß-Check</b><small>${lastCheck(f) ? '4 Wochen um · ca. 5 min' : 'Startwerte · ca. 5 min'}</small></div>
      <button class="btn primary" data-act="go" data-to="feetcheck">Start</button></section>`;
  }
  if (c.data.sessions.some((s) => s.kind === 'feet' && s.day === today)) return out;
  const n = feetWeek(c.data.sessions, today);
  const ci = c.data.checkins[today];
  const suggest = rec?.kind === 'five' || ci?.where === 'travel';
  const spar = f.stage === 4 && ci && ci.sparTomorrow == null
    ? `<div class="row gap feet-spar"><small>Morgen hartes Sparring?</small><button class="chip${ci.feetSpar === false ? ' on' : ''}" data-act="feet-spar" data-v="0">Nein</button><button class="chip${ci.feetSpar ? ' on' : ''}" data-act="feet-spar" data-v="1">Ja</button></div>` : '';
  out += `<section class="card flow-card feet-card${suggest ? '' : ' quiet'}"><div><b>FEET · ${stageLabel(f.stage)}</b><small>${STAGE_NAMES[f.stage]} · barfuß · ${n ? `diese Woche ${n}×` : '3–5 × pro Woche'}</small>${spar}</div>
    <button class="btn ${suggest ? 'primary' : 'ghost'}" data-act="start" data-id="FEET">Start</button></section>`;
  return out;
}

/** Profil-Ansicht. */
export function feetView(c) {
  const f = FT(c.data);
  const today = c.today();
  const n = feetWeek(c.data.sessions, today);
  const heel = f.checks.filter((x) => x.heel);
  const eyes = f.checks.filter((x) => x.eyes);
  const weak = weakerSide(lastCheck(f));
  let out = sys(`FEET · ${stageLabel(f.stage)}`, `<p>${STAGE_NAMES[f.stage]} · diese Woche <b>${n}</b> Einheiten (Empfehlung 3–5)</p>
    ${weak ? `<p class="muted small">Schwächere Seite laut Check: ${weak === 'l' ? 'links' : 'rechts'} (einbeinig +1 Satz).</p>` : ''}
    <div class="row gap"><button class="btn primary grow" data-act="start" data-id="FEET">FEET starten</button><button class="btn grow" data-act="go" data-to="feetcheck">Fuß-Check</button></div>
    <div class="label">Stufe wählen</div><div class="chips">${[1, 2, 3, 4, 5].map((s) => `<button class="chip${f.stage === s ? ' on' : ''}" data-act="feet-stage" data-v="${s}">${stageLabel(s)}</button>`).join('')}</div>
    <p class="muted small">Zurückschalten geht jederzeit. Aufstieg schlägt der Fuß-Check vor.</p>`);
  if (heel.length) out += sys('Einbeinige Fersenhebungen', sideCurve(heel.map((x) => ({ day: x.day, l: x.heel.l, r: x.heel.r })), 'Wdh.', 20));
  if (eyes.length) out += sys('Einbeinstand Augen zu', sideCurve(eyes.map((x) => ({ day: x.day, l: x.eyes.l, r: x.eyes.r })), 's', 30));
  const photos = f.checks.filter((x) => x.photo);
  if (photos.length) {
    out += sys('Fußabdrücke', `<div class="prints">${photos.slice().reverse().map((x) => `<figure><img data-photo="${x.photo}" alt="Fußabdruck ${formatDay(x.day)}"><figcaption>${formatDay(x.day)}</figcaption></figure>`).join('')}</div>
      <p class="muted small">Nur auf diesem Gerät gespeichert, nicht im JSON-Export.</p>`);
  }
  out += barefootCard(c, f);
  out += `<details class="card"><summary>Info: Wann zum Arzt</summary>${signs()}</details>`;
  return out;
}

function sideCurve(rows, unit, goal) {
  const w = 300;
  const h = 80;
  const vals = rows.flatMap((r) => [r.l, r.r]).filter((x) => x != null);
  const hi = Math.max(goal, ...vals);
  const x = (i) => (rows.length < 2 ? w / 2 : 8 + (i / (rows.length - 1)) * (w - 16));
  const y = (v) => h - 8 - (v / hi) * (h - 16);
  const line = (k, col) => (rows.length < 2 ? '' : `<polyline points="${rows.map((r, i) => `${x(i).toFixed(1)},${y(r[k] ?? 0).toFixed(1)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="1.6"/>`);
  const last = rows.at(-1);
  return `<svg class="j-curve" viewBox="0 0 ${w} ${h}" aria-hidden="true"><line x1="0" x2="${w}" y1="${y(goal).toFixed(1)}" y2="${y(goal).toFixed(1)}" stroke="var(--line)" stroke-dasharray="4 4"/>
    ${line('l', 'var(--cyan)')}${line('r', 'var(--sys)')}</svg>
    <div class="row muted small" style="justify-content:space-between"><span><b class="cyan-text">L</b> ${last.l ?? '–'} ${unit} · <b class="sys-text">R</b> ${last.r ?? '–'} ${unit}</span><span>Ziel ${goal}+ ${unit}</span></div>`;
}

function barefootCard(c, f) {
  const today = c.today();
  const target = barefootTarget(f, today);
  const avg = barefootAvg(f, today);
  const v = f.steps[today];
  const ws = weekStart(today);
  const arena = c.data.sessions.filter((s) => s.kind === 'arena' && s.day >= ws).length;
  return sys('Barfuß-Zeit (optional)', `<p class="muted small">Barfuß bzw. Minimalschuh-Schritte heute, grob in Tausendern.</p>
    ${stepper('feet-steps', v != null ? v.toLocaleString('de-DE') : '–', 'Schritte heute')}
    <p class="small">Vorschlag diese Woche: ca. <b>${target.toLocaleString('de-DE')}</b> pro Tag${avg != null ? ` · dein Schnitt ${avg.toLocaleString('de-DE')}` : ''}</p>
    ${arena ? `<p class="small">ARENA diese Woche: ${arena}× barfuß auf der Matte (zählt automatisch).</p>` : ''}
    <p class="muted small">${esc(BAREFOOT_WARN)} Einlagen im Alltagsschuh dürfen bleiben.</p>`);
}

/** Fotos nachladen (async aus IndexedDB). */
export function mountPhotos(root) {
  root.querySelectorAll('img[data-photo]').forEach((img) => {
    getPhoto(img.dataset.photo).then((src) => { if (src) img.src = src; }).catch(() => {});
  });
}

// ——— Fuß-Check (eigener Screen) ———
let sw = null; // laufende Stoppuhr { k, side, start }
let swTimer = null;

const sides = (k, label, kind, f) => {
  if (kind === 'chips') {
    return ['l', 'r'].map((s) => `<div class="q"><div class="q-label">${label} · ${s === 'l' ? 'links' : 'rechts'}</div><div class="chips">${[1, 2, 3].map((v) =>
      `<button class="chip${f[k][s] === v ? ' on' : ''}" data-act="fc-pick" data-k="${k}" data-s="${s}" data-v="${v}">${v}</button>`).join('')}</div></div>`).join('');
  }
  if (kind === 'count') {
    return ['l', 'r'].map((s) => `<div class="field"><span>${s === 'l' ? 'Links' : 'Rechts'}</span>${stepper('fc-count', `${f[k][s] ?? 0}`, 'Wdh.', { idx: `${k}:${s}` })}</div>`).join('');
  }
  return ['l', 'r'].map((s) => {
    const run = sw && sw.k === k && sw.side === s;
    const step = (dir, sign) => `<button class="step" data-act="fc-count" data-dir="${dir}" data-idx="${k}:${s}" aria-label="${dir > 0 ? 'mehr' : 'weniger'}">${sign}</button>`;
    return `<div class="sw-row"><span>${s === 'l' ? 'Links' : 'Rechts'}</span>
      ${step(-1, '−')}<b class="num sw-val" ${run ? 'data-sw' : ''}>${run ? '0' : f[k][s] ?? '–'} s</b>${step(1, '+')}
      <button class="btn small ${run ? 'primary' : ''}" data-act="fc-sw" data-k="${k}" data-s="${s}">${run ? 'Stopp' : 'Start'}</button></div>`;
  }).join('');
};

const STEPS = [
  ['photo', '1 · Fußabdruck'],
  ['spread', '2 · Zehenspreizen'],
  ['toe', '3 · Großzeh-Druck'],
  ['heel', '4 · Einbeinige Fersenhebungen'],
  ['eyes', '5 · Einbeinstand Augen zu'],
  ['arch', '6 · Gewölbe halten einbeinig'],
  ['extra', 'Noch kurz'],
];

export const feetCheckScreen = {
  render(c) {
    const f0 = FT(c.data);
    const f = c.ui.fc || (c.ui.fc = { step: 0, spread: {}, toe: {}, heel: { l: 0, r: 0 }, eyes: {}, arch: {}, photo: null });
    const back = '<button class="btn ghost back" data-act="fc-cancel">← Abbrechen</button>';
    if (f.step >= STEPS.length) {
      const r = c.ui.fcResult;
      const next = r.suggest;
      return `${back}<h1 class="h">Fuß-Check</h1>${sys(next ? `Vorschlag: ${stageLabel(next)}` : `Bleib auf ${stageLabel(f0.stage)}`, `
        <p class="muted small">Zehenspreizen L ${f.spread.l ?? '–'} / R ${f.spread.r ?? '–'} · Großzeh L ${f.toe.l ?? '–'} / R ${f.toe.r ?? '–'} · Fersenheben L ${f.heel.l} / R ${f.heel.r} · Augen zu L ${f.eyes.l ?? '–'} / R ${f.eyes.r ?? '–'} s · Gewölbe L ${f.arch.l ?? '–'} / R ${f.arch.r ?? '–'} s</p>
        ${r.weaker ? `<p class="note">Die ${r.weaker === 'l' ? 'linke' : 'rechte'} Seite ist deutlich schwächer und bekommt bei einbeinigen Übungen einen Satz mehr.</p>` : ''}
        ${next ? `<button class="btn primary wide" data-act="fc-stage" data-v="${next}">${stageLabel(next)} übernehmen</button><button class="btn ghost wide" data-act="fc-stage" data-v="${f0.stage}">Auf ${stageLabel(f0.stage)} bleiben</button>`
          : `<p>Die Kriterien für die nächste Stufe sind noch nicht ganz erreicht. Weiter so.</p><button class="btn primary wide" data-act="fc-stage" data-v="${f0.stage}">Fertig</button>`}`, { tone: 'gold' })}`;
    }
    const [k, title] = STEPS[f.step];
    let body = '';
    if (k === 'photo') {
      const prev = f0.checks.filter((x) => x.photo).slice(-2);
      body = `<p>Fuß nass machen, auf Papier oder Fliese stellen, Foto machen. Wie breit ist der Mittelfuß im Abdruck?</p>
        <label class="btn wide">Foto aufnehmen oder wählen<input type="file" accept="image/*" capture="environment" data-change="fc-photo" hidden></label>
        <div class="prints">${f.photo ? `<figure><img data-photo="${f.photo}" alt="Neuer Abdruck"><figcaption>heute</figcaption></figure>` : ''}${prev.map((x) => `<figure><img data-photo="${x.photo}" alt="Abdruck ${formatDay(x.day)}"><figcaption>${formatDay(x.day)}</figcaption></figure>`).join('')}</div>
        <p class="muted small">Fotos bleiben nur auf diesem Gerät. Kein automatisches Auswerten.</p>`;
    }
    if (k === 'spread') body = `<p>Alle Zehen so weit wie möglich auseinander. 1 = kaum, 2 = einige Zehen bleiben hängen, 3 = alle gut getrennt.</p>${sides('spread', 'Zehenspreizen', 'chips', f)}`;
    if (k === 'toe') body = `<p>Sitzend, Fuß flach, Finger unter den großen Zeh, Zeh fest nach unten drücken, Ferse bleibt am Boden. 1 = schwach, 2 = mittel, 3 = kräftig.</p>${sides('toe', 'Großzeh-Druck', 'chips', f)}`;
    if (k === 'heel') body = `<p>Barfuß, an der Wand abgestützt, voll hoch, 1 s hoch, 1 s runter, bis zum sauberen Versagen. Richtwert 20+.</p>${sides('heel', '', 'count', f)}`;
    if (k === 'eyes') body = `<p>Barfuß, Hände an der Hüfte, Augen zu. Höchstens 60 s.</p>${sides('eyes', '', 'sw', f)}`;
    if (k === 'arch') body = `<p>Im Einbeinstand das Gewölbe aktiv anheben (Short Foot) und halten, ohne dass die Zehen krallen.</p>${sides('arch', '', 'sw', f)}`;
    if (k === 'extra') {
      const yn = (key, label) => `<div class="q"><div class="q-label">${label}</div><div class="chips"><button class="chip${f[key] === true ? ' on' : ''}" data-act="fc-yn" data-k="${key}" data-v="1">Ja</button><button class="chip${f[key] === false ? ' on' : ''}" data-act="fc-yn" data-k="${key}" data-v="0">Nein</button></div></div>`;
      body = `${f0.stage === 1 ? yn('shortClean', 'Short Foot im Sitzen sauber, ohne Krallen?') : ''}
        ${f0.stage === 2 ? yn('openStance30', 'Einbeinstand mit offenen Augen 30 s stabil (beide Seiten)?') : ''}
        ${f0.stage === 4 ? yn('pogoClean', 'Pogos ohne Einknicken?') : ''}
        ${f0.stage === 3 || f0.stage === 5 ? '<p class="muted">Alles drin. Weiter zur Auswertung.</p>' : ''}`;
    }
    return `${back}<h1 class="h">Fuß-Check</h1><p class="muted small">Schritt ${f.step + 1} von ${STEPS.length} · barfuß</p>
      ${sys(title, `${body}${k === 'photo' && !f.photo ? '<button class="btn ghost wide" data-act="fc-next">Ohne Foto weiter</button>'
        : `<button class="btn primary wide" data-act="fc-next">${f.step === STEPS.length - 1 ? 'Auswerten' : 'Weiter'}</button>`}`)}`;
  },
  mount(c, root) {
    mountPhotos(root);
    clearInterval(swTimer);
    if (sw) {
      swTimer = setInterval(() => {
        const el = document.querySelector('[data-sw]');
        const t = Math.min(60, Math.floor((Date.now() - sw.start) / 1000));
        if (el) el.textContent = `${t} s`;
        if (t >= 60) feetCheckScreen.actions['fc-sw'](c, { k: sw.k, s: sw.side });
      }, 200);
    }
  },
  async onChange(c, name, el) {
    if (name !== 'fc-photo' || !el.files?.[0]) return;
    try {
      const data = await shrinkImage(el.files[0]);
      const id = `foot${Date.now()}`;
      await putPhoto(id, data);
      c.ui.fc.photo = id;
      c.render();
    } catch (e) {
      c.system('Foto', `<p>${esc(e.message)}</p>`);
    }
  },
  actions: {
    'fc-cancel': (c) => { sw = null; c.ui.fc = null; c.go('profil'); },
    'fc-pick': (c, d) => { c.ui.fc[d.k][d.s] = Number(d.v); c.render(); },
    'fc-yn': (c, d) => { c.ui.fc[d.k] = d.v === '1'; c.render(); },
    'fc-count': (c, d) => {
      const [k, s] = d.idx.split(':');
      const cur = c.ui.fc[k][s] ?? 0;
      c.ui.fc[k][s] = Math.max(0, Math.min(k === 'heel' ? 60 : 60, cur + Number(d.dir) * (k === 'heel' ? 1 : 5)));
      c.render();
    },
    'fc-sw': (c, d) => {
      if (sw && sw.k === d.k && sw.side === d.s) {
        c.ui.fc[d.k][d.s] = Math.min(60, Math.round((Date.now() - sw.start) / 1000));
        sw = null;
      } else sw = { k: d.k, side: d.s, start: Date.now() };
      c.render();
    },
    'fc-next': (c) => {
      const f = c.ui.fc;
      sw = null;
      f.step += 1;
      if (f.step === STEPS.length) {
        const check = { day: c.today(), photo: f.photo || undefined, spread: f.spread, toe: f.toe, heel: f.heel, eyes: f.eyes, arch: f.arch,
          shortClean: f.shortClean, openStance30: f.openStance30, pogoClean: f.pogoClean };
        let r;
        c.update((data) => {
          r = addCheck(data, check);
          const s = { id: `fc${Date.now()}`, day: c.today(), kind: 'feetCheck', missionId: 'FEET' };
          s.xp = sessionXp(s);
          return { ...r.data, sessions: [...r.data.sessions, s] };
        });
        c.ui.fcResult = { suggest: r.suggest, weaker: r.weaker };
      }
      c.render();
    },
    'fc-stage': (c, d) => {
      const stage = Number(d.v);
      let up = false;
      c.update((data) => { const r = setStage(data, stage, c.today()); up = r.up; return r.data; });
      c.ui.fc = null;
      c.ui.fcResult = null;
      c.go('heute');
      c.system(up ? LORE_UP(stage === 5 ? 'Erhaltung' : stage) : 'Fuß-Check gespeichert', `<p>FEET läuft auf ${stageLabel(stage)}: ${esc(STAGE_NAMES[stage])}.</p><div class="xp-gain num">+${XP_CONFIG.sources.feetCheck} XP</div>`,
        undefined, up ? 'gold' : 'sys');
    },
  },
};

export const feetActions = {
  'feet-stage': (c, d) => c.update((data) => setStage(data, Number(d.v), c.today()).data),
  'feet-spar': (c, d) => {
    const today = c.today();
    c.update((data) => ({ ...data, checkins: { ...data.checkins, [today]: { ...data.checkins[today], feetSpar: d.v === '1' } } }));
  },
  'feet-steps': (c, d) => {
    const today = c.today();
    setFeet(c, (f) => {
      const cur = f.steps[today] ?? 0;
      const v = Math.max(0, Math.min(30000, cur + Number(d.dir) * 1000));
      return { ...f, steps: { ...f.steps, [today]: v } };
    });
  },
};

export { checkDue as feetCheckDue };
