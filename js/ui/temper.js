// TEMPER: Ritual für den Geist. Startbereich, Episoden (Story → Übung → Klarheit) und Situations-Einsätze.
// Die laufende Übung lebt außerhalb der Daten (wie der ARENA-Timer); gespeichert wird am Ende.
import { sys, esc, stepper } from './kit.js';
import { beep, signal, keepAwake, unlockAudio } from './sound.js';
import { formatDay } from '../engine/dates.js';
import { BOOKS, STAGES, WHY, MAP_PLACES, ECHO_DEFAULT } from '../data/temper.js';
import { breathAt, slowPattern, SIGH, NSDR_CUES, cueAt, whStart, whTap, whTick, whSafetyDue, WH_RECOVER } from '../engine/breath.js';
import {
  nextEpisode, missionsAvailable, suggestion, expandScript, isTimed, segAt, scanCue, echoDesc, logTemper, temperMetrics,
  episodeValue, bladeTier, doneEpisodes, scriptMinutes,
} from '../engine/temper.js';
import { sideCapLeft } from '../engine/game.js';
import { XP_CONFIG } from '../data/xp-config.js';

const fmt = (sec) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// ——— Klingen-Emblem: wird mit jeder Stufe schärfer ———
export function bladeEmblem(tier, size = 28) {
  const t = Math.max(0, Math.min(5, tier));
  const glow = ['#9a93bd', '#8b7dff', '#a99cff', '#c9c0ff', '#e6e1ff', '#ffcf5a'][t];
  const half = 3.2 - t * 0.35; // die Klinge wird mit jeder Stufe schmaler, also schärfer
  // Kontur-Ring hebt das Emblem vom dunklen Grund ab
  return `<svg class="blade" width="${size}" height="${size}" viewBox="0 0 32 32" aria-label="Klinge Stufe ${t}">
    <circle cx="16" cy="16" r="14.6" fill="#14111f" stroke="${glow}" stroke-width="1.6" stroke-opacity="${0.75 + t * 0.05}"/>
    ${t >= 4 ? `<circle cx="16" cy="16" r="14.6" fill="none" stroke="${glow}" stroke-width="3.5" stroke-opacity=".18"/>` : ''}
    <path d="M16 6.5L${(16 + half).toFixed(2)} 19.5H${(16 - half).toFixed(2)}Z" fill="${glow}"/>
    ${t >= 2 ? '<path d="M16 8.5V18.5" stroke="#fff" stroke-opacity=".7" stroke-width=".7"/>' : ''}
    <path d="M11 21h10M16 21v5" stroke="${glow}" stroke-width="2" stroke-linecap="round"/></svg>`;
}

// ——— Laufzeit ———
let run = null;
let ticker = null;
let ctxRef = null;
let lastSpoken = '';

function speak(text) {
  if (!ctxRef?.data.settings.temperVoice || !text || text === lastSpoken || !('speechSynthesis' in window)) return;
  lastSpoken = text;
  try {
    const u = new SpeechSynthesisUtterance(text.replace(/[„“]/g, ''));
    u.lang = 'de-DE';
    u.rate = 0.85;
    u.pitch = 0.9;
    const v = speechSynthesis.getVoices().find((x) => x.lang?.startsWith('de'));
    if (v) u.voice = v;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch { /* keine Stimme */ }
}

const seg = () => run?.segs[run.i];
const rerender = () => { if (location.hash.startsWith('#temper')) ctxRef?.render(); };

function startTicker() {
  clearInterval(ticker);
  ticker = setInterval(tick, 100);
  keepAwake(true);
}
function stopTicker() {
  clearInterval(ticker);
  ticker = null;
  keepAwake(false);
  try { speechSynthesis.cancel(); } catch { /* nichts */ }
}

function tick() {
  if (!run || run.stage !== 'run') return;
  const s = seg();
  const now = Date.now();
  if (s.t === 'wimhof' && run.wh) {
    const n = whTick(run.wh, now);
    if (n !== run.wh) {
      run.wh = n;
      beep(1, 660);
      if (n.phase === 'done') { run.retention = n.holds[0]; next(); return; }
      rerender();
      return;
    }
    const el = document.querySelector('[data-tclock]');
    if (el) {
      const t = (now - run.wh.since) / 1000;
      el.textContent = run.wh.phase === 'recover' ? `${Math.ceil(WH_RECOVER - t)}` : run.wh.phase === 'hold' ? fmt(t)
        : run.countTone ? `${Math.min(30, Math.floor(t / 1.6) + 1)}` : '';
      if (run.wh.phase === 'breathe' && run.countTone) {
        const k = Math.floor(t / 1.6) + 1;
        if (k <= 30 && k !== run.whCount) { run.whCount = k; beep(1, 330); }
      }
    }
    return;
  }
  if (s.t === 'co2' && run.co2State?.phase === 'exhale') {
    const el = document.querySelector('[data-tclock]');
    if (el) el.textContent = `${Math.floor((now - run.co2State.since) / 1000)} s`;
    return;
  }
  if (!isTimed(s)) return;
  const st = segAt(s, run.segStart, now);
  if (st.done) { next(); return; }
  const clock = document.querySelector('[data-tclock]');
  if (clock) clock.textContent = fmt(st.left);
  if (s.t === 'breath' || s.t === 'sigh') {
    const b = breathAt(run.segStart, now, s.t === 'sigh' ? SIGH : slowPattern(s.out || 6));
    const c = document.querySelector('[data-breath]');
    if (c) c.style.transform = `scale(${(0.45 + 0.55 * b.scale).toFixed(3)})`;
    const l = document.querySelector('[data-breath-label]');
    if (l && l.textContent !== b.label) { l.textContent = b.label; }
  }
  // Text-Hinweise wechseln: neu zeichnen (und vorlesen, falls an)
  const cue = currentCue(s, st.elapsed);
  if (cue !== run.cue) { run.cue = cue; speak(cue); rerender(); }
}

function currentCue(s, elapsed) {
  if (s.t === 'guide') return cueAt(s.cues, s.sec, elapsed);
  if (s.t === 'nsdr') return cueAt(NSDR_CUES, s.sec, elapsed);
  if (s.t === 'scan') return scanCue(s, elapsed, { name: ctxRef?.data.settings.echo?.name, echo: ctxRef?.data.settings.echo ? echoDesc(ctxRef.data.settings) : '' }).text;
  if (s.t === 'count' && s.thought) return elapsed < 20 ? `Gedanke? Kurz benennen: ${s.thought}. Zurück zum Atem.` : '';
  return '';
}

function next() {
  const prev = seg();
  // Zählzeit für „Taps pro Minute“: echte Dauer des Abschnitts (auch wenn früher weitergetippt)
  if (prev?.t === 'count' || (prev?.t === 'guide' && prev.tap) || prev?.t === 'silent') run.countSec += Math.min(prev.sec, (Date.now() - run.segStart) / 1000);
  if (prev?.t === 'silent') beep(1, 523);
  run.i += 1;
  run.segStart = Date.now();
  run.cue = null;
  run.segTaps = 0;
  if (run.i >= run.segs.length) {
    stopTicker();
    signal(2);
    run.stage = 'clarity';
    rerender();
    return;
  }
  const s = seg();
  if (s.t === 'silent') beep(1, 523);
  else if (prev) beep(1, 523);
  if (s.t === 'wimhof') run.wh = null;
  rerender();
}

// ——— Ansichten ———
function homeView(c) {
  const data = c.data;
  const sug = suggestion(data, c.today());
  const tier = bladeTier(data);
  const m = temperMetrics(data, c.today());
  const done = doneEpisodes(data);
  const book = BOOKS[0];
  const dots = book.episodes.map((e) => `<i class="${done[1]?.has(e.n) ? 'on' : ''}${sug.ep?.n === e.n ? ' cur' : ''}"></i>`).join('');
  let out = `<button class="btn ghost back" data-act="go" data-to="heute">← Heute</button>
    <div class="temper-head">${bladeEmblem(tier, 40)}<div><h1 class="h">TEMPER</h1><small class="muted">Stufe ${STAGES[Math.min(tier, 4)]} · Buch ${Math.min(tier + 1, 5)}</small></div></div>`;
  if (sug.kind === 'mission') {
    out += sys(sug.mission.name, `<p>${esc(sug.reason)}</p><button class="btn primary wide" data-act="tp-mission" data-id="${sug.mission.id}">NSDR starten</button>`, { tone: 'calm' });
  }
  if (sug.kind !== 'done') {
    const nx = sug.ep ? sug : nextEpisode(data);
    if (nx?.ep) {
      out += sys(`Buch ${nx.book.n} · ${nx.book.name}`, `<p class="t-target">Episode ${nx.ep.n} · ${esc(nx.ep.title)}</p>
        <p class="muted small">${esc(nx.ep.dur)} · ${esc(nx.ep.exercise.replace(/\*\*/g, ''))}</p>
        ${sug.co2 ? '<p class="note">Vorher kurz: der wöchentliche CO2-Test.</p>' : ''}
        <button class="btn primary wide" data-act="tp-episode">Episode starten</button>
        <div class="ep-dots">${dots}</div>`, { tone: 'gold' });
    }
  } else {
    out += sys('Alle Episoden gemacht', '<p>Das nächste Buch folgt. Die Einsätze bleiben jederzeit abrufbar.</p>');
  }
  const ms = missionsAvailable(data);
  out += sys('Einsätze', ms.length ? `<div class="pull-list">${ms.map((x) => `<button class="swap" data-act="tp-mission" data-id="${x.id}"><b>${esc(x.name)}</b><small>${esc(x.sub)}</small></button>`).join('')}</div>`
    : '<p class="muted small">Schalten sich mit den Episoden frei: Verlangen ab Episode 9, NSDR ab 15, Stress ab 18, Einschlafen ab 22, Vor dem Kampf ab 26.</p>');
  out += metricsCard(m);
  out += `<section class="card"><div class="label">Stimme</div>
    <div class="chips"><button class="chip${data.settings.temperVoice ? ' on' : ''}" data-act="tp-voice" data-v="1">Vorlesen</button><button class="chip${data.settings.temperVoice ? '' : ' on'}" data-act="tp-voice" data-v="0">Nur Text</button></div>
    <p class="muted small">Gerätestimme (Deutsch, langsam). Klingt je nach iPhone mechanisch, deshalb standardmäßig aus. Sie mischt sich nicht so sauber unter Musik wie die Signaltöne.</p>
    <div class="label">Reset-Hinweis im Training</div>
    <div class="chips"><button class="chip${data.settings.temperResetHint !== false ? ' on' : ''}" data-act="tp-hint" data-v="1">An</button><button class="chip${data.settings.temperResetHint === false ? ' on' : ''}" data-act="tp-hint" data-v="0">Aus</button></div>
    <p class="muted small">Ab Episode 26: In der Pause vor dem letzten Satz einer Hauptübung erscheint „Reset?“.</p></section>`;
  return out;
}

function curve(points, label, unit = '') {
  if (points.length < 2) return points.length ? `<p class="small">${label}: ${points[0].value}${unit}</p>` : '';
  const vals = points.map((p) => p.value);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const w = 300;
  const h = 60;
  const pts = vals.map((v, i) => `${(6 + (i / (vals.length - 1)) * (w - 12)).toFixed(1)},${(hi === lo ? h / 2 : h - 6 - ((v - lo) / (hi - lo)) * (h - 12)).toFixed(1)}`).join(' ');
  return `<div class="label">${label}</div><svg class="j-curve" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="var(--cyan)" stroke-opacity=".75" stroke-width="1.6" stroke-linejoin="round"/></svg>
    <div class="row muted small" style="justify-content:space-between"><span>${vals[0]}${unit}</span><span>${vals.at(-1)}${unit}</span></div>`;
}

function metricsCard(m) {
  const max = Math.max(1, ...m.weeks.map((w) => w.minutes));
  const body = `${curve(m.co2, 'CO2-Test (Ausatmung)', ' s')}${curve(m.taps, 'Abschweif-Taps pro Minute')}${curve(m.clarity, 'Klarheit')}${curve(m.retention, 'Retention morgens (ohne Wertung)', ' s')}
    <div class="label">Minuten pro Woche</div><div class="cold-bars">${m.weeks.map((w) => `<div><i style="height:${Math.round((w.minutes / max) * 100)}%"></i><small>${formatDay(w.ws).slice(0, 6)}</small></div>`).join('')}</div>`;
  return m.episodes || m.weeks.some((w) => w.minutes) ? sys('Messwerte', `${body}<p class="muted small">Keine Serien, keine Rekorde. Nur dein Verlauf.</p>`) : '';
}

function storyView() {
  const e = run.ep;
  const lines = e ? e.story : [];
  const main = run.segs.find((s) => WHY[s.t]);
  return `<div class="temper-story"><small class="bigtimer-count">${e ? `Buch ${run.book.n} · Episode ${e.n}` : 'Einsatz'}</small>
    <h1>${esc(e ? e.title : run.mission.name)}</h1>
    ${lines.map((l) => `<p class="${l.startsWith('ECHO') ? 'echo-line' : 'sys-line'}">${esc(l)}</p>`).join('')}
    ${e ? `<p class="muted small">Übung: ${esc(e.exercise.replace(/\*\*/g, ''))}</p>` : ''}
    ${main ? `<p class="why small">${esc(WHY[main.t])}</p>` : ''}
    ${e?.field ? `<p class="note">Feldauftrag: ${esc(e.field)}</p>` : ''}
    <button class="btn primary wide big" data-act="tp-go">Übung starten</button>
    <button class="btn ghost wide" data-act="tp-cancel">Abbrechen</button></div>`;
}

function runView(c) {
  const s = seg();
  const now = Date.now();
  const head = `<header class="t-head"><button class="icon-btn" data-act="tp-cancel" aria-label="Abbrechen">×</button><div><small>${run.ep ? `Episode ${run.ep.n}` : 'Einsatz'}</small><b>${esc(run.ep?.title || run.mission.name)}</b></div><span class="num">${run.i + 1}/${run.segs.length}</span></header>`;
  const st = isTimed(s) ? segAt(s, run.segStart, now) : null;
  const clock = st ? `<b class="temper-clock num" data-tclock>${fmt(st.left)}</b>` : '';
  const skip = '<button class="btn ghost small temper-skip" data-act="tp-next">Weiter</button>';
  let body = '';
  if (s.t === 'count' || s.t === 'silent' || (s.t === 'guide' && s.tap)) {
    const cue = s.t === 'guide' ? currentCue(s, st.elapsed) : s.t === 'silent' ? '' : 'Zähl beim Ausatmen. 1 bis 10, dann von vorn.';
    const hint = s.t === 'silent' ? 'Frei zählen. Nur Ton am Anfang und am Ende.'
      : `${s.eyes === 'open' ? 'Augen offen, Blick auf einen Punkt. ' : 'Augen zu. '}${s.loud ? 'Ein lauter Ort ist heute richtig. ' : ''}${s.tap ? 'Abgeschweift oder verzählt: Tipp irgendwo, zurück zu 1.' : ''}`;
    return `<button class="temper-tap${s.t === 'silent' ? ' dark' : ''}" data-act="${s.tap ? 'tp-tap' : 'tp-none'}" aria-label="Abschweifen tippen">
      <span class="temper-cue">${esc(cue || '')}</span>${s.thought ? `<small class="muted">Gedanken benennen: ${esc(s.thought)}</small>` : ''}
      <small class="temper-hint">${esc(hint)}</small>${s.tap ? `<small class="temper-taps">${run.segTaps || 0}</small>` : ''}${clock}</button>${skip}`;
  }
  if (s.t === 'guide' || s.t === 'nsdr') {
    body = `<p class="temper-cue big">${esc(currentCue(s, st.elapsed))}</p>`;
    return `<div class="temper-run${s.t === 'nsdr' ? ' dark' : ''}">${head}${body}${clock}</div>${skip}`;
  }
  if (s.t === 'breath' || s.t === 'sigh') {
    const b = breathAt(run.segStart, now, s.t === 'sigh' ? SIGH : slowPattern(s.out || 6));
    body = `<p class="t-target center">${esc(s.label || (s.t === 'sigh' ? `${s.cycles} physiologische Seufzer` : `4 s ein · ${s.out} s aus`))}</p>
      <div class="breath"><i data-breath style="transform:scale(${(0.45 + 0.55 * b.scale).toFixed(3)})"></i><b data-breath-label>${b.label}</b></div>
      ${s.reset ? '<p class="muted center">Schultern sinken lassen. Drei lange Ausatmer.</p>' : ''}`;
    return `<div class="temper-run">${head}${body}${clock}</div>${skip}`;
  }
  if (s.t === 'wave') {
    body = `<div class="wave-box"><div class="wave-lift"><svg viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden="true"><path class="wave-path" d="M0 40 Q25 20 50 40 T100 40 T150 40 T200 40 V120 H0Z"/></svg></div></div>
      <p class="temper-cue big">Das Verlangen ist eine Welle. Sie bricht.</p>`;
    return `<div class="temper-run">${head}${body}${clock}</div>${skip}`;
  }
  if (s.t === 'scan') {
    const sc = scanCue(s, st.elapsed, { name: c.data.settings.echo?.name, echo: c.data.settings.echo ? echoDesc(c.data.settings) : '' });
    body = `<div class="echo-scan"><span class="echo-dot" aria-hidden="true"></span><small class="muted">${sc.index + 1}/${sc.total}</small>
      <b class="echo-region">${esc(sc.region)}</b><p class="temper-cue big">${esc(sc.text)}</p></div>`;
    return `<div class="temper-run${s.soft ? ' dark' : ''}">${head}${body}${clock}</div>${skip}`;
  }
  if (s.t === 'wimhof') return wimhofView(c, head);
  if (s.t === 'co2') return co2View(c, head);
  if (s.t === 'echo') return echoSetupView(c, head);
  if (s.t === 'map') {
    const sel = run.map || [];
    return `<div class="temper-run">${head}<p class="t-target">Innenkarte: Wo hat ECHO am häufigsten etwas gefunden? Tipp 3 Orte.</p>
      <div class="chips">${MAP_PLACES.map((p) => `<button class="chip${sel.includes(p) ? ' on' : ''}" data-act="tp-map" data-v="${esc(p)}">${esc(p)}</button>`).join('')}</div>
      <button class="btn primary wide" data-act="tp-map-save" ${sel.length ? '' : 'disabled'}>Speichern</button></div>`;
  }
  if (s.t === 'choice') {
    return `<div class="temper-run">${head}<p class="temper-cue big">Was brauchst du jetzt?</p>
      <div class="row gap"><button class="btn primary grow big" data-act="tp-choice" data-v="up">Hoch · zünden</button><button class="btn grow big" data-act="tp-choice" data-v="down">Runter · senken</button></div>
      <p class="muted small">Hoch = eine Runde Wim Hof. Runter = langes Ausatmen.</p></div>`;
  }
  if (s.t === 'free') {
    const f = run.free || (run.free = { regler: new Date().getHours() < 12 ? 'up' : 'down', count: true, scan: true });
    const chip = (act, v, label, on) => `<button class="chip${on ? ' on' : ''}" data-act="${act}" data-v="${v}">${label}</button>`;
    return `<div class="temper-run">${head}<p class="t-target">Stell deine Sitzung selbst zusammen (ca. 8 min).</p>
      <div class="label">Regler</div><div class="chips">${chip('tp-free-r', 'up', 'Hoch', f.regler === 'up')}${chip('tp-free-r', 'down', 'Runter', f.regler === 'down')}${chip('tp-free-r', 'none', 'Ohne', f.regler === 'none')}</div>
      <div class="label">Dazu</div><div class="chips">${chip('tp-free-t', 'count', 'Zählen', f.count)}${chip('tp-free-t', 'scan', 'ECHO-Scan', f.scan)}</div>
      <button class="btn primary wide" data-act="tp-free-go">Los</button></div>`;
  }
  return `<div class="temper-run">${head}${skip}</div>`;
}

function wimhofView(c, head) {
  const today = c.today();
  if (whSafetyDue(c.data.settings.whSafetyAt, today)) {
    return `<div class="temper-run">${head}${sys('Bevor du zündest', `<p><b>Ich sitze oder liege. Nicht im Wasser, nicht in der Badewanne, nicht am Steuer.</b></p>
      <p class="muted small">Schnelles Atmen kann zu Schwindel oder kurzer Bewusstlosigkeit führen. Bei Herz-Kreislauf-Problemen, Epilepsie oder in der Schwangerschaft vorher ärztlich abklären. Gilt 30 Tage.</p>
      <button class="btn primary wide" data-act="tp-wh-ok">Bestätigt</button>
      <button class="btn ghost wide" data-act="tp-next">Überspringen</button>`, { tone: 'warn' })}</div>`;
  }
  if (!run.wh) {
    return `<div class="temper-run">${head}<p class="temper-cue big">Eine Runde Wim Hof.</p>
      <p class="muted">30 tiefe Atemzüge in deinem Tempo, ausatmen, halten. Tipp irgendwo startet und stoppt das Halten, auch mit geschlossenen Augen. Danach 15 s Erholungsatem.</p>
      <div class="chips"><button class="chip${c.data.settings.whCount ? ' on' : ''}" data-act="tp-wh-count" data-v="1">Leiser Zähl-Ton</button><button class="chip${c.data.settings.whCount ? '' : ' on'}" data-act="tp-wh-count" data-v="0">Ohne</button></div>
      <button class="btn primary wide big" data-act="tp-wh-start">Beginnen</button><p class="muted small center">Nie im oder am Wasser.</p></div>`;
  }
  const t = (Date.now() - run.wh.since) / 1000;
  const label = run.wh.phase === 'breathe' ? 'Atme · 30 tiefe Atemzüge' : run.wh.phase === 'hold' ? 'Halten' : 'Tief einatmen, halten';
  const clock = run.wh.phase === 'recover' ? `${Math.ceil(WH_RECOVER - t)}` : run.wh.phase === 'hold' ? fmt(t) : run.countTone ? `${Math.min(30, Math.floor(t / 1.6) + 1)}` : '';
  const hint = run.wh.phase === 'breathe' ? 'Dann ausatmen und irgendwo tippen.' : run.wh.phase === 'hold' ? 'Tippen, sobald du einatmen musst.' : '';
  return `<button class="wh-screen phase-${run.wh.phase}" data-act="tp-wh-tap"><b class="wh-label">${label}</b><b class="wh-clock num" data-tclock>${clock}</b>
    <span class="wh-hint">${hint}</span><span class="wh-water">Nie im oder am Wasser.</span></button>`;
}

function co2View(c, head) {
  const st = run.co2State || (run.co2State = { phase: 'intro' });
  if (st.phase === 'intro') {
    return `<div class="temper-run">${head}<p class="t-target">CO2-Test</p>
      <p class="temper-cue big">4 normale Atemzüge. Dann voll einatmen.</p>
      <p class="muted">${esc(WHY.co2)}</p><button class="btn primary wide big" data-act="tp-co2-ready">Bin voll eingeatmet</button></div>`;
  }
  if (st.phase === 'ready' || st.phase === 'exhale') {
    return `<button class="temper-tap" data-act="tp-co2-tap"><span class="temper-cue">${st.phase === 'ready' ? 'Tippen und so langsam wie möglich ausatmen.' : 'Langsam ausatmen … Tippen, wenn die Luft draußen ist.'}</span>
      <b class="temper-clock num" data-tclock>${st.phase === 'exhale' ? `${Math.floor((Date.now() - st.since) / 1000)} s` : ''}</b></button>`;
  }
  const prev = run.ep && run.ep.n !== 5 ? episodeValue(c.data, 1, 5, 'co2') : null;
  return `<div class="temper-run">${head}<p class="t-target">Deine Ausatmung</p><b class="temper-clock num">${st.result} s</b>
    ${prev != null ? `<p class="center">Episode 5: ${prev} s → heute ${st.result} s</p>` : '<p class="muted center">Merk dir die Zahl. Sie wird wachsen.</p>'}
    <button class="btn primary wide" data-act="tp-next">Weiter</button></div>`;
}

function echoSetupView(c, head) {
  const e = run.echo || (run.echo = { name: c.data.settings.echo?.name || '', desc: c.data.settings.echo?.desc || ECHO_DEFAULT });
  return `<div class="temper-run">${head}${sys('ECHO einrichten', `<p class="muted small">Einmalig. ECHO spricht dich mit „du“ und deinem Namen an.</p>
    <div class="q"><div class="q-label">Dein Name (optional)</div><input class="search" data-input="tp-echo-name" value="${esc(e.name)}" autocomplete="off"></div>
    <div class="q"><div class="q-label">Wie sieht ECHO aus, wie kommt er heraus?</div><textarea data-input="tp-echo-desc" rows="3">${esc(e.desc)}</textarea></div>
    <button class="btn primary wide" data-act="tp-echo-save">So ist ECHO</button>`, { tone: 'gold' })}</div>`;
}

function clarityView() {
  return `<div class="temper-story"><h1>${run.ep ? 'Episode beendet' : 'Einsatz beendet'}</h1>${sys('Wie klar bist du jetzt?', `<div class="effort-chips mood">${[1, 2, 3, 4, 5].map((v) => `<button class="${run.clarity === v ? 'on' : ''}" data-act="tp-clarity" data-v="${v}">${v}</button>`).join('')}</div>
    <div class="effort-scale"><span>Nebel</span><span>klar</span></div><button class="btn primary wide" data-act="tp-save" ${run.clarity ? '' : 'disabled'}>Abschließen</button>`, { tone: 'gold' })}</div>`;
}

// ——— Start ———
function begin(c, { book, ep, mission }) {
  unlockAudio();
  const script = ep ? ep.script : mission.script;
  const map = c.data.settings.innerMap || [];
  let segs = expandScript(script, { map });
  if (ep && c.data.settings.echo?.desc) segs = segs.filter((s) => s.t !== 'echo');
  const sug = suggestion(c.data, c.today());
  if (ep && sug.co2 && !segs.some((s) => s.t === 'co2')) segs = [{ t: 'co2' }, ...segs];
  run = { book, ep, mission, segs, i: 0, segStart: Date.now(), stage: 'story', taps: 0, countSec: 0, startedAt: Date.now() };
  c.render();
}

const screen = {
  render(c) {
    ctxRef = c;
    if (!run) return homeView(c);
    if (run.stage === 'story') return storyView();
    if (run.stage === 'clarity') return clarityView();
    return runView(c);
  },
  mount(c) {
    ctxRef = c;
    if (run?.stage === 'run' && !ticker) startTicker();
  },
  onInput(c, name, value) {
    if (!run?.echo) return;
    if (name === 'tp-echo-name') run.echo.name = value.slice(0, 30);
    if (name === 'tp-echo-desc') run.echo.desc = value.slice(0, 200);
  },
  actions: {
    'tp-episode': (c) => { const n = nextEpisode(c.data); if (n) begin(c, n); },
    'tp-mission': (c, d) => begin(c, { mission: missionsAvailable(c.data).find((m) => m.id === d.id) }),
    'tp-go': (c) => { unlockAudio(); run.stage = 'run'; run.segStart = Date.now(); run.startedAt = Date.now(); beep(1, 523); startTicker(); c.render(); },
    'tp-next': () => next(),
    'tp-none': () => {},
    'tp-tap': (c) => {
      run.taps += 1;
      run.segTaps = (run.segTaps || 0) + 1;
      const el = document.querySelector('.temper-taps');
      if (el) el.textContent = run.segTaps;
      document.querySelector('.temper-tap')?.classList.add('flash');
      setTimeout(() => document.querySelector('.temper-tap')?.classList.remove('flash'), 250);
    },
    'tp-cancel': (c) => c.system('Abbrechen?', '<p>Nichts geht verloren. Die Episode bleibt die nächste.</p>', [['tp-cancel-yes', 'Abbrechen'], ['close-modal', 'Weitermachen', 'primary']]),
    'tp-cancel-yes': (c) => { c.modal(null); stopTicker(); run = null; c.render(); },
    'tp-voice': (c, d) => c.update((data) => ({ ...data, settings: { ...data.settings, temperVoice: d.v === '1' } })),
    'tp-hint': (c, d) => c.update((data) => ({ ...data, settings: { ...data.settings, temperResetHint: d.v === '1' } })),
    // Wim Hof (eine Runde)
    'tp-wh-ok': (c) => c.update((data) => ({ ...data, settings: { ...data.settings, whSafetyAt: c.today() } })),
    'tp-wh-count': (c, d) => c.update((data) => ({ ...data, settings: { ...data.settings, whCount: d.v === '1' } })),
    'tp-wh-start': (c) => { unlockAudio(); run.wh = whStart(1, Date.now()); run.countTone = !!c.data.settings.whCount; run.whCount = 0; c.render(); },
    'tp-wh-tap': (c) => {
      if (!run.wh || !['breathe', 'hold'].includes(run.wh.phase)) return;
      run.wh = whTap(run.wh, Date.now());
      beep(1, run.wh.phase === 'hold' ? 440 : 520);
      c.render();
    },
    // CO2-Test
    'tp-co2-ready': (c) => { run.co2State = { phase: 'ready' }; c.render(); },
    'tp-co2-tap': (c) => {
      const st = run.co2State;
      if (st.phase === 'ready') run.co2State = { phase: 'exhale', since: Date.now() };
      else if (st.phase === 'exhale') { run.co2 = Math.round((Date.now() - st.since) / 1000); run.co2State = { phase: 'result', result: run.co2 }; beep(1, 523); }
      c.render();
    },
    // Innenkarte, Regler, freie Sitzung, ECHO
    'tp-map': (c, d) => {
      const cur = run.map || [];
      run.map = cur.includes(d.v) ? cur.filter((x) => x !== d.v) : cur.length >= 3 ? cur : [...cur, d.v];
      c.render();
    },
    'tp-map-save': (c) => { const map = run.map; c.update((data) => ({ ...data, settings: { ...data.settings, innerMap: map } })); next(); },
    'tp-choice': (c, d) => { run.segs.splice(run.i, 1, ...expandScript([{ t: 'choice' }], { choice: d.v })); run.segStart = Date.now(); c.render(); },
    'tp-free-r': (c, d) => { run.free.regler = d.v; c.render(); },
    'tp-free-t': (c, d) => { run.free[d.v] = !run.free[d.v]; c.render(); },
    'tp-free-go': (c) => {
      const f = { ...run.free, regler: run.free.regler === 'none' ? null : run.free.regler };
      run.segs.splice(run.i, 1, ...expandScript([{ t: 'free' }], { free: f }));
      run.segStart = Date.now();
      c.render();
    },
    'tp-echo-save': (c) => {
      const e = run.echo;
      c.update((data) => ({ ...data, settings: { ...data.settings, echo: { name: e.name.trim(), desc: e.desc.trim() || ECHO_DEFAULT } } }));
      next();
    },
    // Abschluss
    'tp-clarity': (c, d) => { run.clarity = Number(d.v); c.render(); },
    'tp-save': (c) => {
      const r = run;
      const minutes = Math.max(1, Math.round((Date.now() - r.startedAt) / 60000));
      const left = sideCapLeft(c.data, c.today());
      let res;
      c.update((data) => {
        res = logTemper(data, { day: c.today(), book: r.book?.n, ep: r.ep?.n, mission: r.mission?.id, clarity: r.clarity,
          taps: r.segs.some((s) => s.tap) ? r.taps : null, countSec: r.countSec, minutes, co2: r.co2 ?? null, retention: r.retention ?? null,
          hour: new Date().getHours() });
        return res.data;
      });
      run = null;
      const xp = Math.min(XP_CONFIG.sources.temper, left);
      const cmp = [];
      if (r.ep?.n === 28) { const a = episodeValue(c.data, 1, 3, 'tapsPerMin'); const b = res.session.tapsPerMin; if (a != null && b != null) cmp.push(`Abschweif-Taps pro Minute: Episode 3 ${a} → heute ${b}`); }
      if (r.ep?.n === 30) {
        const v = [5, 25, 30].map((n) => episodeValue(c.data, 1, n, 'co2'));
        if (v.some((x) => x != null)) cmp.push(`Ausatmung: ${v.map((x) => (x == null ? '–' : `${x} s`)).join(' → ')}`);
        const t = [3, 28].map((n) => episodeValue(c.data, 1, n, 'tapsPerMin'));
        if (t.some((x) => x != null)) cmp.push(`Abschweif-Taps/min: ${t.map((x) => x ?? '–').join(' → ')}`);
      }
      c.go('heute');
      if (res.finished) {
        c.system(`Stufe ${res.finished.id} abgeschlossen`, `<div class="rankup">${bladeEmblem(bladeTier(c.data), 64)}</div><p class="lore">${esc(res.finished.done)}</p>
          ${cmp.map((x) => `<p class="small">${esc(x)}</p>`).join('')}<div class="xp-gain num">+${XP_CONFIG.sources.temperBook + xp} XP</div>`, [['close-modal', 'Weiter', 'primary']], 'gold aura');
      } else {
        c.system(r.ep ? `Episode ${r.ep.n} beendet` : 'Einsatz beendet', `${xp ? `<div class="xp-gain num">+${xp} XP</div>` : '<p class="muted small">Tagesdeckel für Neben-XP erreicht. Zählt trotzdem.</p>'}
          <p class="muted">Klarheit ${r.clarity}/5${r.taps ? ` · ${r.taps} Abschweif-Taps` : ''}</p>${cmp.map((x) => `<p class="small">${esc(x)}</p>`).join('')}`);
      }
    },
  },
};

export default screen;

// ——— Karte auf Heute (unter der Tagesmission) ———
export function temperCard(c) {
  const sug = suggestion(c.data, c.today());
  const tier = bladeTier(c.data);
  const card = (title, sub, btn, primary, done = false) => `<section class="card temper-card${done ? ' done' : ''}">
    <span class="temper-emblem">${bladeEmblem(tier, 40)}</span>
    <div class="temper-text"><div class="label">TEMPER${done ? ' · heute erledigt' : ''}</div><b>${title}</b><small>${sub}</small></div>
    <button class="btn ${primary ? 'primary' : 'ghost'}" data-act="go" data-to="temper">${btn}</button></section>`;
  if (sug.kind === 'mission') return card(esc(sug.mission.name), esc(sug.reason), 'Öffnen', true);
  if (sug.kind !== 'episode') return '';
  const today = c.data.sessions.some((s) => s.kind === 'temper' && s.day === c.today());
  return card(`Episode ${sug.ep.n} · ${esc(sug.ep.title)}`, `${esc(sug.ep.dur)}${sug.co2 ? ' · mit CO2-Test' : ''}`, today ? 'Mehr' : 'Start', !today, today);
}
