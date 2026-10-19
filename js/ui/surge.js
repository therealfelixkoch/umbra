// SURGE: „Ich bin im Nebel.“ Stimmung, Warum, Protokoll, Stimmung danach. Dazu Wim Hof, Kälte-Log und DAS WARUM.
// Laufende Abläufe leben außerhalb der Daten (wie der ARENA-Timer), gespeichert wird erst am Ende.
import { sys, esc, stepper } from './kit.js';
import { bossImage } from './lore.js';
import { beep, signal, keepAwake, unlockAudio } from './sound.js';
import { formatDay } from '../engine/dates.js';
import { sideCapLeft } from '../engine/game.js';
import { XP_CONFIG } from '../data/xp-config.js';
import {
  PULLS, PROTOCOLS, protocolSteps, breathAt, roundsAt, cueAt, surgeEffect, recommendProtocol, logSurge,
  whSafetyDue, whStart, whTap, whTick, logWimhof, wimhofStats, WH_RECOVER, COLD_TYPES, logCold, coldWeeks,
  currentWhy, addWhy,
} from '../engine/surge.js';

const fmt = (sec) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const mood = (act, cur) => `<div class="effort-chips mood">${[1, 2, 3, 4, 5].map((v) => `<button class="${cur === v ? 'on' : ''}" data-act="${act}" data-v="${v}">${v}</button>`).join('')}</div>
  <div class="effort-scale"><span>am Boden</span><span>klar</span></div>`;

// ——— Laufzeit (außerhalb des Render-Baums) ———
let run = null; // { protocol, pull, opts, steps, i, stepStart, startedAt, moodBefore }
let wh = null; // Wim-Hof-Zustand
let cold = null; // { startAt }
let ticker = null;
let ctxRef = null;

function startTicker() {
  clearInterval(ticker);
  ticker = setInterval(tick, 100);
  keepAwake(true);
}
function stopTicker() {
  clearInterval(ticker);
  ticker = null;
  keepAwake(false);
}

function tick() {
  const now = Date.now();
  if (run && run.i < run.steps.length) {
    const step = run.steps[run.i];
    const el = (now - run.stepStart) / 1000;
    if (el >= step.sec) {
      nextStep(now);
      return;
    }
    if (step.type === 'rounds') {
      const r = roundsAt(step, el);
      if (run.roundKey !== `${r.round}${r.phase}`) {
        if (run.roundKey) signal(r.phase === 'work' ? 1 : 2);
        run.roundKey = `${r.round}${r.phase}`;
        rerender();
        return;
      }
    }
    if (step.type === 'guide') {
      const cue = cueAt(step.cues, step.sec, el);
      if (cue !== run.cue) { run.cue = cue; rerender(); return; }
    }
    paint(step, el, now);
  }
  if (wh) {
    const n = whTick(wh, now);
    if (n !== wh) {
      wh = n;
      beep(1, n.phase === 'done' ? 523 : 660);
      rerender();
      return;
    }
    if (wh.phase === 'breathe' && wh.countTone) {
      const k = Math.floor((now - wh.since) / 1600) + 1;
      if (k <= 30 && k !== wh.count) { wh.count = k; beep(1, 330); }
    }
    const el = document.querySelector('[data-wh-clock]');
    if (el) {
      const t = (now - wh.since) / 1000;
      el.textContent = wh.phase === 'recover' ? `${Math.ceil(WH_RECOVER - t)}` : wh.phase === 'hold' ? fmt(t) : wh.countTone ? `${Math.min(30, wh.count || 1)}` : '';
    }
  }
  if (cold) {
    const el = document.querySelector('[data-cold-clock]');
    if (el) el.textContent = fmt((now - cold.startAt) / 1000);
  }
}

// Nur die bewegten Teile neu zeichnen (Kreis, Welle, Uhren)
function paint(step, el, now) {
  const clock = document.querySelector('[data-sg-clock]');
  if (step.type === 'rounds') {
    const r = roundsAt(step, el);
    if (clock) clock.textContent = fmt(r.left);
  } else if (clock) clock.textContent = fmt(step.sec - el);
  if (step.type === 'breath') {
    const b = breathAt(run.stepStart, now);
    const c = document.querySelector('[data-breath]');
    if (c) c.style.transform = `scale(${(0.45 + 0.55 * b.scale).toFixed(3)})`;
    const l = document.querySelector('[data-breath-label]');
    if (l && l.textContent !== b.label) l.textContent = b.label;
    const n = document.querySelector('[data-breath-n]');
    if (n && step.cycles) n.textContent = `${Math.min(step.cycles, b.cycle + 1)} / ${step.cycles}`;
  }
}

function nextStep(now = Date.now()) {
  const step = run.steps[run.i];
  if (step?.type === 'cold') run.coldSec = (run.coldSec || 0) + Math.round(Math.min(step.sec, (now - run.stepStart) / 1000));
  run.i += 1;
  run.stepStart = now;
  run.roundKey = null;
  run.cue = null;
  if (run.i >= run.steps.length) {
    stopTicker();
    if (step?.soft) beep(1, 392); else signal(2);
    ctxRef?.setUi({ sg: { ...(ctxRef.ui.sg || {}), stage: 'after' } });
    return;
  }
  signal(1);
  rerender();
}

const rerender = () => { if (location.hash.startsWith('#surge')) ctxRef?.render(); };

// ——— Ansichten ———
function whyCard(c) {
  const w = currentWhy(c.data.whys);
  if (!w) return `<section class="card why-card"><div class="label">Dein Warum</div><p class="muted">Noch nicht geschrieben. Zwei Sätze reichen.</p>
    <button class="btn small" data-act="go" data-to="surge" data-param="warum">Warum schreiben</button></section>`;
  return `<section class="card why-card"><div class="label">Dein Warum</div>
    ${w.forWhom ? `<p><small class="muted">Für wen</small><br>${esc(w.forWhom)}</p>` : ''}
    ${w.oneYear ? `<p><small class="muted">In einem Jahr</small><br>${esc(w.oneYear)}</p>` : ''}</section>`;
}

function startView(c) {
  const sg = c.ui.sg || (c.ui.sg = { stage: 'mood' });
  const eff = surgeEffect(c.data.sessions);
  const head = `<button class="btn ghost back" data-act="sg-home">← Heute</button>`;
  if (sg.stage === 'mood') {
    return `${head}<h1 class="h">SURGE</h1>
      <div class="boss-row">${bossImage('hollow', { cls: 'lore-small' })}<p class="lore">HOLLOW will, dass du die nächsten Minuten verschenkst. Hol sie dir zurück.</p></div>
      ${sys('Wie ist deine Stimmung gerade?', mood('sg-before', sg.before))}
      <div class="row gap surge-links">
        <button class="card archive-link grow" data-act="go" data-to="surge" data-param="wimhof"><b>Wim Hof</b><small>eher morgens / vor dem Training</small></button>
        <button class="card archive-link grow" data-act="go" data-to="surge" data-param="cold"><b>Kälte</b><small>Dusche oder Bad eintragen</small></button></div>
      <button class="card archive-link wide" data-act="go" data-to="surge" data-param="warum"><b>DAS WARUM</b><small>${currentWhy(c.data.whys) ? 'ansehen und neu schreiben' : 'noch nicht geschrieben'}</small></button>
      ${Object.keys(eff).length ? sys('Was bei dir wirkt', Object.entries(eff).map(([k, e]) => `<div class="done-row"><span>${esc(PROTOCOLS[k]?.name || k)}</span><span class="num">${e.avg > 0 ? '+' : ''}${String(e.avg).replace('.', ',')} · ${e.n}×</span></div>`).join('')
        + '<p class="muted small">Stimmung nachher minus vorher. Ab 3 Durchgängen schlägt SURGE das Wirksamste zuerst vor.</p>') : ''}
      <p class="muted small">Cyclic Sighing eher abends, Wim Hof eher morgens oder vor dem Training.</p>`;
  }
  if (sg.stage === 'pull') {
    const rec = recommendProtocol(c.data.sessions);
    return `${head}<h1 class="h">SURGE</h1>${whyCard(c)}
      ${rec ? `<section class="card quest"><div class="quest-head"><div><div class="label">Bei dir am wirksamsten</div><b>${esc(PROTOCOLS[rec.id].name)}</b><small>${esc(rec.text)}</small></div>
        <button class="btn primary small" data-act="sg-proto" data-id="${rec.id}">Los</button></div></section>` : ''}
      ${sys('Was zieht gerade?', `<div class="pull-list">${PULLS.map(([id, name, sub]) => {
        const p = Object.values(PROTOCOLS).find((x) => x.pull === id);
        return `<button class="swap" data-act="sg-proto" data-id="${p.id}" data-pull="${id}"><b>${esc(name)}</b><small>${esc(sub)} → ${esc(p.name)} · ${esc(p.desc)}</small></button>`;
      }).join('')}</div>`)}`;
  }
  if (sg.stage === 'setup') {
    const p = PROTOCOLS[sg.protocol];
    const chip = (act, v, label, on) => `<button class="chip${on ? ' on' : ''}" data-act="${act}" data-v="${v}">${label}</button>`;
    let opts = '';
    if (p.id === 'nsdr') opts = `<div class="label">Dauer</div><div class="chips">${chip('sg-opt-nsdr', 10, '10 min', sg.nsdrMin !== 20)}${chip('sg-opt-nsdr', 20, '20 min', sg.nsdrMin === 20)}</div><p class="muted small">Leg dich hin. Der Bildschirm wird dunkel, ein sanfter Ton weckt dich am Ende.</p>`;
    if (p.id === 'glut' || p.id === 'flamme') opts += `<div class="label">Kalte Dusche</div><div class="chips">${[60, 120, 180].map((v) => chip('sg-opt-cold', v, `${v / 60} min`, (sg.coldSec || 120) === v)).join('')}</div>`;
    if (p.id === 'flamme') {
      opts = `<div class="label">Erst</div><div class="chips">${chip('sg-opt-flame', 'bag', 'Sack', sg.flame !== 'walk')}${chip('sg-opt-flame', 'walk', 'Spaziergang 20 min', sg.flame === 'walk')}</div>
        ${sg.flame !== 'walk' ? `<div class="label">Runden à 3 min</div><div class="chips">${[3, 4, 5].map((v) => chip('sg-opt-rounds', v, `${v}`, (sg.rounds || 3) === v)).join('')}</div>` : ''}${opts}`;
    }
    return `<button class="btn ghost back" data-act="sg-back">← Zurück</button><h1 class="h">${esc(p.name)}</h1>
      ${sys(p.desc, `${opts || '<p class="muted">Bereit?</p>'}<button class="btn primary wide" data-act="sg-start">Starten</button>
        <p class="muted small">Bildschirm anlassen, dann kommt das Signal bei jedem Schritt.</p>`)}`;
  }
  if (sg.stage === 'after') {
    return `<h1 class="h">Rückeroberung</h1>${sys('Und jetzt? Stimmung nachher', `${mood('sg-after', sg.after)}
      <button class="btn primary wide" data-act="sg-save" ${sg.after ? '' : 'disabled'}>Verbuchen</button>`, { tone: 'gold' })}`;
  }
  return '';
}

function runView() {
  const step = run.steps[run.i];
  const now = Date.now();
  const el = (now - run.stepStart) / 1000;
  const n = `${run.i + 1}/${run.steps.length}`;
  let body = '';
  if (step.type === 'wave') {
    body = `<div class="wave-box"><div class="wave-lift"><svg viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden="true"><path class="wave-path" d="M0 40 Q25 20 50 40 T100 40 T150 40 T200 40 V120 H0Z"/></svg></div></div>
      <p class="surge-text">${esc(step.text)}</p>`;
  } else if (step.type === 'breath') {
    const b = breathAt(run.stepStart, now);
    body = `<div class="breath"><i data-breath style="transform:scale(${(0.45 + 0.55 * b.scale).toFixed(3)})"></i><b data-breath-label>${b.label}</b></div>
      ${step.cycles ? `<p class="muted center" data-breath-n>${Math.min(step.cycles, b.cycle + 1)} / ${step.cycles}</p>` : ''}
      <p class="muted small center">Zweimal durch die Nase ein (lang, dann kurz nachfüllen), lang durch den Mund aus.</p>`;
  } else if (step.type === 'guide') {
    body = `<p class="surge-text guide">${esc(run.cue || cueAt(step.cues, step.sec, el))}</p>`;
  } else if (step.type === 'rounds') {
    const r = roundsAt(step, el);
    body = `<p class="t-target center">Runde ${r.round}/${step.rounds} · ${r.phase === 'work' ? 'Arbeit' : 'Pause'}</p><p class="surge-text">${esc(step.text)}</p>`;
  } else {
    body = `<p class="surge-text">${esc(step.text || '')}</p>`;
  }
  const clock = step.type === 'rounds' ? roundsAt(step, el).left : step.sec - el;
  return `<div class="surge-run type-${step.type}">
    <header class="t-head"><button class="icon-btn" data-act="sg-cancel" aria-label="Abbrechen">×</button><div><small>${esc(PROTOCOLS[run.protocol].name)}</small><b>${esc(step.label)}</b></div><span class="num">${n}</span></header>
    ${body}
    ${step.type === 'guide' ? '' : `<b class="clock num center" data-sg-clock>${fmt(clock)}</b>`}
    <footer class="t-nav"><button class="btn grow" data-act="sg-next">${step.type === 'cold' ? 'Fertig, raus' : run.i === run.steps.length - 1 ? 'Abschließen' : 'Weiter'}</button></footer></div>`;
}

// ——— Wim Hof ———
function wimhofView(c) {
  const s = c.data.settings;
  const today = c.today();
  if (wh) {
    const t = (Date.now() - wh.since) / 1000;
    if (wh.phase === 'done') {
      return `<h1 class="h">Wim Hof</h1>${sys('Fertig', `<div class="wh-holds">${wh.holds.map((h, i) => `<div><small>Runde ${i + 1}</small><b class="num">${fmt(h)}</b></div>`).join('')}</div>
        <p class="muted small">Die Zeit steigt meist von Runde zu Runde. Länger ist kein Ziel.</p>
        <button class="btn primary wide" data-act="wh-save">Verbuchen</button><button class="btn ghost wide" data-act="wh-discard">Verwerfen</button>`)}`;
    }
    const label = wh.phase === 'breathe' ? `Runde ${wh.round} · Atme` : wh.phase === 'hold' ? 'Halten' : 'Tief einatmen, halten';
    const clock = wh.phase === 'recover' ? `${Math.ceil(WH_RECOVER - t)}` : wh.phase === 'hold' ? fmt(t) : wh.countTone ? `${Math.min(30, wh.count || 1)}` : '';
    const hint = wh.phase === 'breathe' ? 'Ca. 30 tiefe Atemzüge im eigenen Tempo. Dann ausatmen und irgendwo tippen.'
      : wh.phase === 'hold' ? 'Tippen, sobald du einatmen musst.' : '15 Sekunden, dann geht es weiter.';
    return `<button class="wh-screen phase-${wh.phase}" data-act="wh-tap" aria-label="${esc(label)}">
      <small>Runde ${wh.round} von ${wh.rounds}</small><b class="wh-label">${esc(label)}</b><b class="wh-clock num" data-wh-clock>${clock}</b>
      <span class="wh-hint">${esc(hint)}</span><span class="wh-water">Nie im oder am Wasser.</span></button>
      <button class="btn ghost wide wh-stop" data-act="wh-stop">Abbrechen</button>`;
  }
  if (whSafetyDue(s.whSafetyAt, today)) {
    return `<button class="btn ghost back" data-act="go" data-to="surge">← SURGE</button><h1 class="h">Wim Hof</h1>
      ${sys('Bevor du startest', `<p><b>Ich sitze oder liege. Nicht im Wasser, nicht in der Badewanne, nicht am Steuer.</b></p>
        <p class="muted small">Die Atmung kann zu Schwindel oder kurzer Bewusstlosigkeit führen. Bei Herz-Kreislauf-Problemen, Epilepsie oder in der Schwangerschaft vorher ärztlich abklären. Die Bestätigung gilt 30 Tage.</p>
        <button class="btn primary wide" data-act="wh-confirm">Bestätigt</button>`, { tone: 'warn' })}`;
  }
  const st = wimhofStats(c.data.sessions, today);
  const rounds = c.ui.whRounds || s.whRounds || 3;
  return `<button class="btn ghost back" data-act="go" data-to="surge">← SURGE</button><h1 class="h">Wim Hof</h1>
    ${sys('Setup', `<div class="field"><span>Runden</span>${stepper('wh-rounds', `${rounds}`, '')}</div>
      <div class="label">Leiser Zähl-Ton bis 30</div>
      <div class="chips"><button class="chip${s.whCount ? ' on' : ''}" data-act="wh-count" data-v="1">An</button><button class="chip${s.whCount ? '' : ' on'}" data-act="wh-count" data-v="0">Aus</button></div>
      <button class="btn primary wide" data-act="wh-start">Starten</button>
      <p class="muted small">Du atmest im eigenen Tempo, die App liegt daneben. Tippen irgendwo startet und stoppt das Halten, auch mit geschlossenen Augen. Bildschirm bleibt an. Nie im oder am Wasser.</p>
      <p class="muted small">Eher morgens oder vor dem Training. Abends lieber Cyclic Sighing.</p>`)}
    ${st.count ? sys('Verlauf', `${calmCurve(st.sessions.map((x) => x.avg))}
      <dl class="facts"><div><dt>Durchgänge</dt><dd class="num">${st.count}</dd></div><div><dt>Schnitt diese Woche</dt><dd class="num">${st.weekAvg != null ? fmt(st.weekAvg) : '–'}</dd></div></dl>
      ${st.sessions.slice(-5).reverse().map((x) => `<div class="done-row"><span>${formatDay(x.day)}</span><span class="num muted">${x.retention.map(fmt).join(' · ')}</span></div>`).join('')}
      <p class="muted small">Schnitt pro Durchgang. Kein Rekord, kein Ziel.</p>`) : ''}`;
}

function calmCurve(vals) {
  if (vals.length < 2) return '';
  const w = 300;
  const h = 70;
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const pts = vals.map((v, i) => `${(6 + (i / (vals.length - 1)) * (w - 12)).toFixed(1)},${(hi === lo ? h / 2 : h - 8 - ((v - lo) / (hi - lo)) * (h - 16)).toFixed(1)}`).join(' ');
  return `<svg class="j-curve" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="var(--cyan)" stroke-opacity=".7" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
}

// ——— Kälte ———
function coldView(c) {
  const s = c.data.settings;
  const f = c.ui.cold || (c.ui.cold = { type: 'dusche', seconds: 120 });
  const weeks = coldWeeks(c.data.sessions, c.today());
  const max = Math.max(1, ...weeks.map((w) => w.minutes));
  const note = s.coldNoteSeen ? '' : sys('Einmal vorweg', `<p>Bei Herz-Kreislauf-Problemen vorher ärztlich abklären. Und nie Atemübungen im Wasser.</p>
    <button class="btn small" data-act="cold-note">Verstanden</button>`, { tone: 'warn' });
  return `<button class="btn ghost back" data-act="go" data-to="surge">← SURGE</button><h1 class="h">Kälte</h1>${note}
    ${sys('Eintragen', `<div class="chips">${COLD_TYPES.map(([k, l]) => `<button class="chip${f.type === k ? ' on' : ''}" data-act="cold-type" data-v="${k}">${l}</button>`).join('')}</div>
      ${cold ? `<b class="clock num center" data-cold-clock>${fmt((Date.now() - cold.startAt) / 1000)}</b><button class="btn primary wide" data-act="cold-stop">Stopp</button>`
        : `<div class="field"><span>Dauer</span>${stepper('cold-sec', fmt(f.seconds), 'min')}</div>
      <div class="row gap"><button class="btn grow" data-act="cold-timer">Timer starten</button><button class="btn primary grow" data-act="cold-save">Eintragen</button></div>`}`)}
    ${sys('Minuten pro Woche', `<div class="cold-bars">${weeks.map((w) => `<div><i style="height:${Math.round((w.minutes / max) * 100)}%"></i><small>${formatDay(w.ws).slice(0, 6)}</small></div>`).join('')}</div>
      <p class="muted small">Nur zum Ansehen, ohne Zielwert.</p>`)}`;
}

// ——— DAS WARUM ———
function whyView(c) {
  const whys = c.data.whys || [];
  const f = c.ui.why || (c.ui.why = { forWhom: currentWhy(whys)?.forWhom || '', oneYear: currentWhy(whys)?.oneYear || '' });
  return `<button class="btn ghost back" data-act="go" data-to="${c.ui.whyBack || 'surge'}">← Zurück</button><h1 class="h">DAS WARUM</h1>
    ${sys('Ein paar Sätze, nur für dich', `<div class="q"><div class="q-label">Für wen mache ich das?</div><textarea data-input="why-forWhom" rows="3">${esc(f.forWhom)}</textarea></div>
      <div class="q"><div class="q-label">Wer will ich in einem Jahr sein?</div><textarea data-input="why-oneYear" rows="3">${esc(f.oneYear)}</textarea></div>
      <button class="btn primary wide" data-act="why-save">Speichern</button>
      <p class="muted small">SURGE zeigt es dir direkt nach „Ich bin im Nebel“, der Debrief am Arc-Ende. Alte Fassungen bleiben in Kodex → Chronik.</p>`, { tone: 'gold' })}
    ${whys.length > 1 ? sys('Frühere Fassungen', whys.slice(0, -1).reverse().map((w) => `<div class="chron"><small>${formatDay(w.day)}${w.arc != null ? ` · Arc ${w.arc + 1}` : ''}</small><p>${esc(w.forWhom)}</p><p class="muted">${esc(w.oneYear)}</p></div>`).join('')) : ''}`;
}

const xpLine = (c, kind) => {
  const left = sideCapLeft(c.data, c.today());
  const xp = Math.min(XP_CONFIG.sources[kind], left);
  return xp ? `<div class="xp-gain num">+${xp} XP</div>` : '<p class="muted small">Tagesdeckel für Neben-XP erreicht. Zählt trotzdem.</p>';
};

const screen = {
  render(c) {
    ctxRef = c;
    if (c.param === 'wimhof') return wimhofView(c);
    if (c.param === 'cold') return coldView(c);
    if (c.param === 'warum') return whyView(c);
    if (run && run.i < run.steps.length) return runView();
    return startView(c);
  },
  mount(c) {
    ctxRef = c;
    if ((run && run.i < run.steps.length) || wh || cold) { if (!ticker) startTicker(); }
  },
  onInput(c, name, value) {
    if (name.startsWith('why-') && c.ui.why) c.ui.why[name.slice(4)] = value.slice(0, 600);
  },
  actions: {
    'sg-home': (c) => { c.ui.sg = null; c.go('heute'); },
    'sg-before': (c, d) => { unlockAudio(); c.setUi({ sg: { stage: 'pull', before: Number(d.v) } }); },
    'sg-proto': (c, d) => c.setUi({ sg: { ...c.ui.sg, stage: 'setup', protocol: d.id, pull: d.pull || PROTOCOLS[d.id].pull } }),
    'sg-back': (c) => c.setUi({ sg: { ...c.ui.sg, stage: 'pull' } }),
    'sg-opt-nsdr': (c, d) => c.setUi({ sg: { ...c.ui.sg, nsdrMin: Number(d.v) } }),
    'sg-opt-cold': (c, d) => c.setUi({ sg: { ...c.ui.sg, coldSec: Number(d.v) } }),
    'sg-opt-flame': (c, d) => c.setUi({ sg: { ...c.ui.sg, flame: d.v } }),
    'sg-opt-rounds': (c, d) => c.setUi({ sg: { ...c.ui.sg, rounds: Number(d.v) } }),
    'sg-start': (c) => {
      unlockAudio();
      const sg = c.ui.sg;
      const now = Date.now();
      run = { protocol: sg.protocol, steps: protocolSteps(sg.protocol, sg), i: 0, stepStart: now, startedAt: now };
      startTicker();
      signal(1);
      c.render();
    },
    'sg-next': () => nextStep(),
    'sg-cancel': (c) => c.system('Abbrechen?', '<p>Was du bis hierher gemacht hast, zählt trotzdem. Wie ist die Stimmung jetzt?</p>',
      [['sg-cancel-yes', 'Beenden und eintragen', 'primary'], ['close-modal', 'Weitermachen']]),
    'sg-cancel-yes': (c) => {
      c.modal(null);
      run.i = run.steps.length - 1;
      nextStep();
    },
    'sg-after': (c, d) => c.setUi({ sg: { ...c.ui.sg, after: Number(d.v) } }),
    'sg-save': (c) => {
      const sg = c.ui.sg;
      const minutes = run ? Math.max(1, Math.round((Date.now() - run.startedAt) / 60000)) : 0;
      const coldSec = run?.coldSec || 0;
      const xpHtml = xpLine(c, 'surge');
      c.update((data) => {
        let d = logSurge(data, { day: c.today(), protocol: sg.protocol, pull: sg.pull, moodBefore: sg.before, moodAfter: sg.after, minutes }).data;
        if (coldSec >= 15) d = logCold(d, { day: c.today(), seconds: coldSec, type: 'dusche', now: Date.now() + 1 }).data;
        return d;
      });
      run = null;
      const diff = sg.after - sg.before;
      c.ui.sg = null;
      c.go('heute');
      c.system('Rückeroberung.', `${xpHtml}<p>${diff > 0 ? `Stimmung ${sg.before} → ${sg.after}. HOLLOW verliert Boden.` : 'Du hast den Nebel nicht gewinnen lassen. Das zählt.'}</p>
        ${coldSec >= 15 ? `<p class="muted small">Kalte Dusche (${fmt(coldSec)}) im Kälte-Log eingetragen.</p>` : ''}`);
    },

    // Wim Hof
    'wh-confirm': (c) => c.update((data) => ({ ...data, settings: { ...data.settings, whSafetyAt: c.today() } })),
    'wh-rounds': (c, d) => { c.ui.whRounds = Math.max(1, Math.min(5, (c.ui.whRounds || c.data.settings.whRounds || 3) + Number(d.dir))); c.render(); },
    'wh-count': (c, d) => c.update((data) => ({ ...data, settings: { ...data.settings, whCount: d.v === '1' } })),
    'wh-start': (c) => {
      unlockAudio();
      const rounds = c.ui.whRounds || c.data.settings.whRounds || 3;
      wh = { ...whStart(rounds, Date.now()), countTone: !!c.data.settings.whCount };
      document.body.classList.add('dim');
      startTicker();
      c.update((data) => ({ ...data, settings: { ...data.settings, whRounds: rounds } }));
    },
    'wh-tap': (c) => {
      if (!wh || !['breathe', 'hold'].includes(wh.phase)) return;
      wh = whTap(wh, Date.now());
      beep(1, wh.phase === 'hold' ? 440 : 520);
      c.render();
    },
    'wh-stop': (c) => {
      if (wh?.holds.length) { wh = { ...wh, phase: 'done' }; } else { wh = null; stopTicker(); }
      document.body.classList.remove('dim');
      c.render();
    },
    'wh-save': (c) => {
      const holds = wh.holds;
      const xpHtml = xpLine(c, 'wimhof');
      wh = null;
      stopTicker();
      document.body.classList.remove('dim');
      c.update((data) => logWimhof(data, { day: c.today(), holds }).data);
      c.system('Wim Hof verbucht.', `${xpHtml}<p class="muted">${holds.length} ${holds.length === 1 ? 'Runde' : 'Runden'}. Gezählt wird das Durchführen, nicht die Zeit.</p>`);
    },
    'wh-discard': (c) => { wh = null; stopTicker(); document.body.classList.remove('dim'); c.render(); },

    // Kälte
    'cold-note': (c) => c.update((data) => ({ ...data, settings: { ...data.settings, coldNoteSeen: true } })),
    'cold-type': (c, d) => { c.ui.cold.type = d.v; c.render(); },
    'cold-sec': (c, d) => { c.ui.cold.seconds = Math.max(15, Math.min(1800, c.ui.cold.seconds + Number(d.dir) * 15)); c.render(); },
    'cold-timer': (c) => { unlockAudio(); cold = { startAt: Date.now() }; startTicker(); c.render(); },
    'cold-stop': (c) => {
      c.ui.cold.seconds = Math.max(15, Math.round((Date.now() - cold.startAt) / 1000));
      cold = null;
      stopTicker();
      screen.actions['cold-save'](c);
    },
    'cold-save': (c) => {
      const f = c.ui.cold;
      const xpHtml = xpLine(c, 'cold');
      c.update((data) => logCold(data, { day: c.today(), seconds: f.seconds, type: f.type }).data);
      c.system('Kälte eingetragen.', `${xpHtml}<p class="muted">${fmt(f.seconds)} min · ${COLD_TYPES.find(([k]) => k === f.type)[1]}</p>`);
    },

    // Warum
    'why-save': (c) => {
      const f = c.ui.why;
      if (!f.forWhom.trim() && !f.oneYear.trim()) return;
      c.update((data) => addWhy(data, { day: c.today(), forWhom: f.forWhom, oneYear: f.oneYear }));
      c.ui.why = null;
      c.system('Gespeichert.', '<p>Dein Warum steht. Es taucht auf, wenn du es brauchst.</p>');
    },
  },
};

export default screen;
