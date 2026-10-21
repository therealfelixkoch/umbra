// Handgelenk-Modul (TFCC) im UI: Schmerz-Abfrage, Karten auf Heute, Status-Check, Profil-Ansicht, Schalter.
// Ton: nüchtern, keine Alarmfarben, keine Diagnosen. Die App empfiehlt, du entscheidest.
import { sys, esc } from './kit.js';
import { formatDay, addDays, weekStart } from '../engine/dates.js';
import { getDef } from '../data/exercises.js';
import { WRIST_SIGNS, FLAT_HAND, DIP_BARS, HANDS_SEQUENCE } from '../data/wrist.js';
import {
  W, logWristPain, resolvePain, inRedWindow, ampelDays, addCheck, confirmStage, lastCheck, checkDue, offSuggested, noProgress,
  trendDown, strengthAllowed, RED_DAYS, flatHandOk,
} from '../engine/wrist.js';
import { buildPlan, createActive } from '../engine/plan.js';
import { sessionXp } from '../engine/game.js';
import { XP_CONFIG } from '../data/xp-config.js';
import { handsWeek } from './hands.js';

const LORE_ON = 'Die Hand, die die Klinge hält, wird neu geschmiedet.';
const LORE_UP = (n) => `Das Handgelenk trägt mehr. Stufe ${n}.`;
const LORE_OFF = 'Die Hand hält. Das Protokoll kann ruhen.';
const STAGE_NAMES = { 1: 'Schützen', 2: 'Ansteuern', 3: 'Aufbauen', 4: 'Belastbar machen' };
const DOT = { green: 'Grün', yellow: 'Gelb', red: 'Rot' };

const setWrist = (c, fn) => c.update((data) => ({ ...data, wrist: fn(W(data)) }));
const maxLevels = () => Object.fromEntries(Object.values(EXL).map((d) => [d.id, (d.levels?.length || 1) - 1]));
const EXL = {};
['w_curl', 'w_rev_curl', 'w_ecc_ext', 'w_hammer_rot', 'w_radial', 'w_ulnar', 'w_pushup_ladder', 'w_bottomup', 'w_knuckle_taps', 'w_rot_iso']
  .forEach((id) => { EXL[id] = getDef(id); });

const signsList = () => `<ul class="cues">${WRIST_SIGNS.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`;
const painChips = (act, cur) => `<div class="pain-chips">${Array.from({ length: 11 }, (_, v) => `<button class="${cur === v ? 'on' : ''}${v >= 5 ? ' pc-hi' : v >= 3 ? ' pc-mid' : ''}" data-act="${act}" data-v="${v}">${v}</button>`).join('')}</div>`;

/** Belastet die Einheit das Handgelenk? (Kraftblock, Aktivierung, Liegestütz/Dips, ARENA) */
export function wristRelevant(session) {
  if (!session) return false;
  if (session.kind === 'arena' || session.kind === 'wrist' || session.wristBlock) return true;
  return (session.exercises || []).some((e) => (FLAT_HAND.includes(e.exId) || DIP_BARS.includes(e.exId)) && e.sets.some((s) => s.done));
}

/** Schmerz-Abfrage nach einer Einheit (Teil der Abschluss-Meldung). */
export function painPrompt(c, session) {
  if (!W(c.data).on || !wristRelevant(session)) return '';
  c.ui.wp = { sessionId: session.id, during: null, click: false };
  return `<div class="wrist-ask"><div class="label">Handgelenk während (0–10)</div>${painChips('wp-during', null)}
    <div class="row gap wrist-click"><span class="small">Klicken mit Schmerz?</span><button class="chip on" data-act="wp-click" data-v="0">Nein</button><button class="chip" data-act="wp-click" data-v="1">Ja</button></div>
    <button class="btn primary wide" data-act="wp-save" disabled>Eintragen</button></div>`;
}

/** Karten auf Heute. rec = Tagesempfehlung (kann null sein, vor dem Check-in). */
export function wristCards(c, rec) {
  const data = c.data;
  const w = W(data);
  const today = c.today();
  const doneToday = data.sessions.some((s) => s.day === today && (s.kind === 'wrist' || s.wristBlock));
  const card = (title, sub, act, btn, extra = '') => `<section class="card flow-card wrist-card"><div><b>${title}</b><small>${sub}</small></div>
    <div class="row gap"><button class="btn primary" ${act}>${btn}</button>${extra}</div></section>`;
  let out = '';
  if (!w.on) {
    // Erhaltung 1–2 × pro Woche, sobald das Protokoll einmal lief
    if ((w.stageLog.length || w.ended) && !doneToday) {
      const ws = weekStart(today);
      const n = data.sessions.filter((s) => s.wristBlock === 'maintenance' && s.day >= ws).length;
      const recent = data.sessions.some((s) => s.wristBlock === 'maintenance' && s.day >= addDays(today, -2));
      if (n < 2 && !recent) out += card('Handgelenk · Erhaltung', '10 min · 1–2 × pro Woche', 'data-act="wrist-start" data-kind="maintenance"', 'Start');
    }
    return out;
  }
  if (checkDue(w, today)) out += card('Handgelenk-Status-Check', 'ca. 5 min · entscheidet über die Stufe', 'data-act="go" data-to="wristcheck"', 'Start');
  if (offSuggested(w, today)) {
    out += sys('Handgelenk', `<p class="lore">${LORE_OFF}</p><p>3 Wochen alle Tests 0–1, keine roten Tage. Protokoll beenden und in die Erhaltung wechseln?</p>
      <div class="row gap"><button class="btn primary grow" data-act="wrist-end">Beenden</button><button class="btn" data-act="wrist-end-no">Weiter</button></div>`, { tone: 'gold' });
  }
  if (noProgress(w, today)) {
    out += sys('Hinweis Handgelenk', `<p>Seit 6 Wochen keine höhere Stufe und keine stärkere Griffkraft. Lass es von einer Handchirurgin oder Handtherapie anschauen, vor allem die Stabilität des DRUJ.</p>
      ${signsList()}<button class="btn small" data-act="wrist-np-ok">Verstanden</button>`, { tone: 'calm' });
  }
  if (trendDown(w, data.checkins, today)) {
    out += sys('Handgelenk', `<p>Morgenschmerz oder rote Tage sind diese Woche gestiegen. Vorschlag: eine Stufe zurück (Stufe ${w.stage - 1}).</p>
      <div class="row gap"><button class="btn primary grow" data-act="wrist-trend-yes">Eine Stufe zurück</button><button class="btn" data-act="wrist-trend-no">Nein</button></div>`, { tone: 'calm' });
  }
  if (inRedWindow(w, today)) {
    out += `<p class="muted small wrist-red">Ampel rot am ${formatDay(w.redFrom)}: bis ${formatDay(addDays(w.redFrom, RED_DAYS))} nur Aktivierung (leicht) und HANDS.</p>`;
  }
  if (doneToday || !rec) return out;
  const ci = data.checkins[today];
  if (rec.kind === 'five') {
    out += card('Handgelenk · Minimal-Dosis', '5 min · Isometrie und Gelenkgefühl', 'data-act="wrist-start" data-kind="minimal"', 'Start');
  } else if (ci?.tonightMT === 'yes') {
    out += card('Vor der Arena: 4 min Handgelenk', 'Aktivierung. Heute kein Kraftblock.', 'data-act="wrist-start" data-kind="activation"', 'Start');
  } else if (['flow', 'rest', 'arenaday'].includes(rec.kind)) {
    const s = strengthAllowed(data, today);
    out += s.ok ? card('Handgelenk-Session', `Kraftblock Stufe ${w.stage || 2} · 10–12 min`, 'data-act="wrist-start" data-kind="strength"', 'Start')
      : card('Handgelenk · Aktivierung', esc(s.reason), 'data-act="wrist-start" data-kind="activation"', 'Start');
  }
  return out;
}

/** Ansicht im Profil. */
export function wristView(c) {
  const w = W(c.data);
  const today = c.today();
  const dots = ampelDays(w, today, 14);
  const first = w.checks[0];
  const last = lastCheck(w);
  const pcts = w.checks.filter((x) => x.pct != null);
  const ws = weekStart(today);
  const blocks = c.data.sessions.filter((s) => s.wristBlock === 'strength' && s.day >= ws).length;
  let out = sys('Handgelenk-Protokoll', `<div class="chips"><button class="chip${w.on ? ' on' : ''}" data-act="wrist-toggle" data-v="1">AN</button><button class="chip${w.on ? '' : ' on'}" data-act="wrist-toggle" data-v="0">AUS</button></div>
    ${w.on ? `<p>Seite: <b>${esc(w.side || '–')}</b> · Stufe <b>${w.stage ?? '–'}</b>${w.stage ? ` · ${STAGE_NAMES[w.stage]}` : ''}</p>` : '<p class="muted small">Aus: nur Erhaltung (1–2 × pro Woche) und HANDS. Alle Daten bleiben gespeichert.</p>'}
    <button class="btn wide" data-act="go" data-to="wristcheck">Status-Check starten</button>`);
  const hw = handsWeek(c.data.sessions, today);
  out += sys('HANDS', `<p>Diese Woche: <b>${hw.minutes} min</b> (${hw.count}×)</p><button class="btn wide" data-act="start" data-id="HANDS">HANDS starten</button>`);
  if (!w.checks.length && !w.pain.length) return out;
  out += sys('Ampel · 14 Tage', `<div class="ampel-dots">${dots.map((d) => `<i class="${d.color || 'none'}" title="${formatDay(d.day)}${d.color ? ` · ${DOT[d.color]}` : ''}"></i>`).join('')}</div>
    <p class="muted small">Grün = während 0–2 und am nächsten Tag zurück auf Ausgangsniveau. Gelb = halten. Rot = 2–3 Tage nur Aktivierung, dann eine Stufe zurück.</p>
    <p class="small">Kraftblöcke diese Woche: <b>${blocks}</b> von höchstens 3</p>`);
  if (pcts.length) out += sys('Griffkraft betroffen/gesund', gripCurve(pcts));
  if (last) {
    const row = (k, label) => `<tr><td>${label}</td><td class="num">${first?.[k] ?? '–'}</td><td class="num">${last[k] ?? '–'}</td></tr>`;
    out += sys('Status-Check', `<table class="mini"><tr><th></th><th>Erster ${formatDay(first.day)}</th><th>Letzter ${formatDay(last.day)}</th></tr>
      ${first.pct != null || last.pct != null ? `<tr><td>Griffkraft %</td><td class="num">${first.pct ?? '–'}</td><td class="num">${last.pct ?? '–'}</td></tr>` : ''}
      ${row('t2', 'Push-off')}${row('t3', 'Hammer-Drehung')}${row('t4', 'Ulnar-Hebel')}${row('t5', 'Rotation unter Last')}</table>`);
  }
  out += `<details class="card"><summary>Wann zum Arzt oder in die Handtherapie</summary>${signsList()}</details>`;
  return out;
}

function gripCurve(pcts) {
  if (pcts.length < 2) return `<p class="num">${pcts[0].pct} %</p>`;
  const w = 300;
  const h = 70;
  const vals = pcts.map((p) => p.pct);
  const lo = Math.min(80, ...vals);
  const hi = Math.max(100, ...vals);
  const pts = vals.map((v, i) => `${(6 + (i / (vals.length - 1)) * (w - 12)).toFixed(1)},${(h - 6 - ((v - lo) / (hi - lo)) * (h - 12)).toFixed(1)}`).join(' ');
  const y95 = (h - 6 - ((95 - lo) / (hi - lo)) * (h - 12)).toFixed(1);
  return `<svg class="j-curve" viewBox="0 0 ${w} ${h}" aria-hidden="true"><line x1="0" x2="${w}" y1="${y95}" y2="${y95}" stroke="var(--line)" stroke-dasharray="4 4"/>
    <polyline points="${pts}" fill="none" stroke="var(--cyan)" stroke-width="1.6"/></svg>
    <div class="row muted small" style="justify-content:space-between"><span>${vals[0]} %</span><span>Ziel ≥ 95 %</span><span>${vals.at(-1)} %</span></div>`;
}

// ——— Status-Check (eigener Screen) ———
const TESTS = [
  ['t2', 'Push-off', 'Aus dem Sitzen mit flachen Händen vom Stuhl hochdrücken, dann 5 Liegestütze auf flachen Händen.'],
  ['t3', 'Hammer-Drehung', 'Hammer am Stielende fassen, Unterarm auf dem Tisch, langsam 10 × nach innen und außen drehen.'],
  ['t4', 'Ulnar-Hebel', 'Hammer neutral fassen, Kopf nach hinten, 10 × Richtung Kleinfinger anheben.'],
  ['t5', 'Rotation unter Last', 'Handgelenk leicht Richtung Kleinfinger gekippt, 5 s den Unterarm mit ca. 70 % Kraft gegen Widerstand nach innen drehen.'],
];

export const wristCheckScreen = {
  render(c) {
    const w = W(c.data);
    const f = c.ui.wc || (c.ui.wc = { step: 0, rest: { pain: false, swelling: false, instab: false }, grip: { l: ['', '', ''], r: ['', '', ''] } });
    const back = '<button class="btn ghost back" data-act="wc-cancel">← Abbrechen</button>';
    const head = (n) => `${back}<h1 class="h">Status-Check</h1><p class="muted small">Schritt ${n} von 6 · bewertet wird die Kleinfingerseite, 0–10</p>`;
    if (!w.side) return `${back}${sys('Erst einschalten', '<p>Schalte das Handgelenk-Protokoll im Profil ein und wähle die Seite.</p>')}`;
    if (f.step === 0) {
      const yn = (k, label) => `<div class="q"><div class="q-label">${label}</div><div class="chips"><button class="chip${f.rest[k] ? '' : ' on'}" data-act="wc-rest" data-k="${k}" data-v="0">Nein</button><button class="chip${f.rest[k] ? ' on' : ''}" data-act="wc-rest" data-k="${k}" data-v="1">Ja</button></div></div>`;
      return `${head(1)}${sys('Ruhezustand', `${yn('pain', 'Ruheschmerz?')}${yn('swelling', 'Schwellung?')}${yn('instab', 'Gefühl, dass das Handgelenk instabil ist oder wegrutscht?')}
        <button class="btn primary wide" data-act="wc-next">Weiter</button>`)}`;
    }
    if (f.step === 1) {
      const inputs = (side) => f.grip[side].map((v, i) => `<input class="grip-in" type="number" inputmode="decimal" data-input="wc-grip-${side}-${i}" value="${esc(String(v))}" placeholder="kg">`).join('');
      return `${head(2)}${sys('1 · Griffkraft', `<p class="muted small">Handdynamometer, Ellbogen 90°, je Hand 3 Versuche. Gewertet wird der Bestwert.</p>
        <div class="grip-row"><span>Links</span>${inputs('l')}</div><div class="grip-row"><span>Rechts</span>${inputs('r')}</div>
        ${w.side === 'beide' ? '<p class="muted small">Bei „beide“ gibt es keine gesunde Vergleichshand. Die Werte werden nur gespeichert.</p>' : ''}
        <button class="btn primary wide" data-act="wc-next">Weiter</button><button class="btn ghost wide" data-act="wc-skip-grip">Kein Dynamometer: überspringen</button>`)}`;
    }
    if (f.step >= 2 && f.step <= 5) {
      const [k, name, how] = TESTS[f.step - 2];
      return `${head(f.step + 1)}${sys(`${f.step} · ${name}`, `<p>${esc(how)}</p><div class="label">Schmerz 0–10</div>${painChips('wc-test', f[k])}
        <button class="btn primary wide" data-act="wc-next" ${f[k] == null ? 'disabled' : ''}>Weiter</button>`)}`;
    }
    // Ergebnis
    const res = c.ui.wcResult;
    return `${back}<h1 class="h">Status-Check</h1>${sys(`Vorschlag: Stufe ${res.stage} · ${STAGE_NAMES[res.stage]}`, `
      ${res.pct != null ? `<p>Griffkraft betroffen/gesund: <b>${res.pct} %</b></p>` : ''}
      <p class="muted small">Push-off ${f.t2} · Hammer-Drehung ${f.t3} · Ulnar-Hebel ${f.t4} · Rotation ${f.t5}${f.rest.pain || f.rest.swelling || f.rest.instab ? ' · Ruhezeichen: ja' : ''}</p>
      ${res.offReady ? '<p class="note">Alle Tests 0–1. Drei Wochen in Folge so, dann schlägt die App vor, das Protokoll zu beenden.</p>' : ''}
      ${f.rest.instab ? `<p class="note">Instabilitätsgefühl ist ein Warnzeichen. Lass es abklären.</p>` : ''}
      <button class="btn primary wide" data-act="wc-confirm" data-v="${res.stage}">Stufe ${res.stage} bestätigen</button>
      <div class="label">Oder selbst wählen</div><div class="chips">${[1, 2, 3, 4].map((s) => `<button class="chip" data-act="wc-confirm" data-v="${s}">Stufe ${s}</button>`).join('')}</div>`, { tone: 'gold' })}`;
  },
  onInput(c, name, value) {
    const m = name.match(/^wc-grip-(l|r)-(\d)$/);
    if (m && c.ui.wc) c.ui.wc.grip[m[1]][Number(m[2])] = value;
  },
  actions: {
    'wc-cancel': (c) => { c.ui.wc = null; c.go('profil'); },
    'wc-rest': (c, d) => { c.ui.wc.rest[d.k] = d.v === '1'; c.render(); },
    'wc-skip-grip': (c) => { c.ui.wc.gripSkipped = true; c.ui.wc.step = 2; c.render(); },
    'wc-test': (c, d) => { const k = TESTS[c.ui.wc.step - 2][0]; c.ui.wc[k] = Number(d.v); c.render(); },
    'wc-next': (c) => {
      const f = c.ui.wc;
      f.step += 1;
      if (f.step === 6) {
        const num = (a) => a.map((x) => Number(String(x).replace(',', '.'))).filter((x) => x > 0);
        const grip = f.gripSkipped ? null : { l: num(f.grip.l), r: num(f.grip.r) };
        const check = { day: c.today(), rest: f.rest.pain || f.rest.swelling || f.rest.instab, restDetail: f.rest,
          grip: grip && (grip.l.length || grip.r.length) ? grip : null, t2: f.t2, t3: f.t3, t4: f.t4, t5: f.t5 };
        let r;
        c.update((data) => {
          r = addCheck(data, check);
          const s = { id: `wc${Date.now()}`, day: c.today(), kind: 'wristCheck', missionId: 'WRIST' };
          s.xp = sessionXp(s);
          return { ...r.data, sessions: [...r.data.sessions, s] };
        });
        c.ui.wcResult = { stage: r.stage, offReady: r.offReady, pct: r.pct };
      }
      c.render();
    },
    'wc-confirm': (c, d) => {
      const stage = Number(d.v);
      let up = false;
      c.update((data) => { const r = confirmStage(data, stage, c.today()); up = r.up; return r.data; });
      c.ui.wc = null;
      c.ui.wcResult = null;
      c.go('heute');
      c.system(up ? LORE_UP(stage) : `Stufe ${stage} bestätigt`, `<p>${esc(STAGE_NAMES[stage])}. Die Blöcke passen sich ab sofort an.</p><div class="xp-gain num">+${XP_CONFIG.sources.wristCheck} XP</div>`,
        undefined, up ? 'gold' : 'sys');
    },
  },
};

// ——— Aktionen (global, damit sie aus jedem Screen und Modal funktionieren) ———
export const wristActions = {
  'wp-during': (c, d) => {
    c.ui.wp.during = Number(d.v);
    document.querySelectorAll('[data-act="wp-during"]').forEach((b) => b.classList.toggle('on', b.dataset.v === d.v));
    const s = document.querySelector('[data-act="wp-save"]');
    if (s) s.disabled = false;
  },
  'wp-click': (c, d) => {
    c.ui.wp.click = d.v === '1';
    document.querySelectorAll('[data-act="wp-click"]').forEach((b) => b.classList.toggle('on', b.dataset.v === d.v));
  },
  'wp-save': (c) => {
    const f = c.ui.wp;
    if (f?.during == null) return;
    const s = c.data.sessions.find((x) => x.id === f.sessionId);
    let res;
    c.update((data) => {
      res = logWristPain(data, { day: s?.day || c.today(), during: f.during, click: f.click, source: s?.kind || 'mission', exercises: s?.wristKeys || [] });
      return res.data;
    });
    c.ui.wp = null;
    const firstClick = f.click && !W(c.data).flags.clickSeen;
    if (firstClick) setWrist(c, (w) => ({ ...w, flags: { ...w.flags, clickSeen: true } }));
    if (res.entry.color === 'red' || firstClick) {
      c.system('Handgelenk', `${res.entry.color === 'red' ? `<p>Ampel rot. Die nächsten ${RED_DAYS} Tage nur Aktivierung (leicht) und HANDS, danach geht es eine Stufe tiefer weiter.</p>` : ''}
        ${firstClick ? `<p>Klicken mit Schmerz ist ein Warnsignal. Wenn das wiederkommt oder lauter wird, lass es abklären:</p>${signsList()}` : ''}`, undefined, 'calm');
    } else c.modal(null);
  },
  'wrist-start': (c, d) => {
    if (c.data.active) { c.go('training'); return; }
    const today = c.today();
    const profile = c.data.checkins[today]?.where === 'travel' ? 'travel' : 'room';
    const plan = buildPlan({ missionId: 'WRIST', profile, data: c.data, today, wristKind: d.kind });
    c.update((data) => ({ ...data, active: createActive(plan, today) }));
    c.go('training');
  },
  'wrist-toggle': (c, d) => {
    const w = W(c.data);
    if (d.v === '1' && !w.on) {
      c.ui.wside = w.side || null;
      c.system('Handgelenk-Protokoll', `<p class="lore">${LORE_ON}</p>
        <div class="label">Welche Seite?</div><div class="chips">${['links', 'rechts', 'beide'].map((s) => `<button class="chip${c.ui.wside === s ? ' on' : ''}" data-act="wrist-side" data-v="${s}">${s}</button>`).join('')}</div>
        <div class="label">Wann zum Arzt oder in die Handtherapie</div>${signsList()}
        <p class="muted small">Das Protokoll ersetzt keine Handtherapie. Die App gibt Ampel, Stufe und Empfehlung, keine Befunde.</p>`,
      [['wrist-on', 'Verstanden, einschalten', 'primary'], ['close-modal', 'Abbrechen']]);
    } else if (d.v === '0' && w.on) {
      setWrist(c, (x) => ({ ...x, on: false }));
    }
  },
  'wrist-side': (c, d) => {
    c.ui.wside = d.v;
    document.querySelectorAll('[data-act="wrist-side"]').forEach((b) => b.classList.toggle('on', b.dataset.v === d.v));
  },
  'wrist-on': (c) => {
    if (!c.ui.wside) return;
    const side = c.ui.wside;
    c.modal(null);
    setWrist(c, (w) => ({ ...w, on: true, side, onSince: c.today(), ended: null, flags: { ...w.flags, noProgressShown: false } }));
    c.go('wristcheck');
  },
  'wrist-end': (c) => {
    c.update((data) => {
      const s = { id: `wd${Date.now()}`, day: c.today(), kind: 'wristDone', missionId: 'WRIST' };
      s.xp = sessionXp(s);
      return { ...data, wrist: { ...W(data), on: false, ended: c.today() }, sessions: [...data.sessions, s] };
    });
    c.system('Protokoll beendet', `<p class="lore">${LORE_OFF}</p><p>Ab jetzt 1–2 × pro Woche der Erhaltungsblock und HANDS. Einmal im Monat ein Status-Check.</p><div class="xp-gain num">+${XP_CONFIG.sources.wristDone} XP</div>`,
      undefined, 'gold');
  },
  'wrist-end-no': (c) => setWrist(c, (w) => ({ ...w, flags: { ...w.flags, offDeclined: c.today() } })),
  'wrist-np-ok': (c) => setWrist(c, (w) => ({ ...w, flags: { ...w.flags, noProgressShown: true } })),
  'wrist-trend-yes': (c) => {
    const ws = weekStart(c.today());
    setWrist(c, (w) => ({ ...w, stage: Math.max(1, (w.stage || 2) - 1), stageLog: [...w.stageLog, { day: c.today(), stage: Math.max(1, (w.stage || 2) - 1) }], flags: { ...w.flags, trendWeek: ws } }));
  },
  'wrist-trend-no': (c) => setWrist(c, (w) => ({ ...w, flags: { ...w.flags, trendWeek: weekStart(c.today()) } })),
};

/** Nach dem Check-in: Folgetag-Werte einarbeiten, Zwick-Meldung Handgelenk = Gelb. */
export function afterCheckin(data, today, painRegions = []) {
  if (!W(data).on) return { data, events: [] };
  let d = data;
  if (painRegions.includes('handgelenk')) d = logWristPain(d, { day: today, during: 3, source: 'zwick' }).data;
  return resolvePain(d, maxLevels());
}

export { flatHandOk, HANDS_SEQUENCE };
