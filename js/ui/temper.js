// TEMPER: Ritual für den Geist. Startbereich, Episoden (Story → Übung → Klarheit) und Situations-Einsätze.
// Die laufende Übung lebt außerhalb der Daten (wie der ARENA-Timer); gespeichert wird am Ende.
import { sys, esc, stepper } from './kit.js';
import { keepAwake, unlockAudio, setAudioMode, pulse } from './sound.js';
import { TONES, playTone, pacerStart, pacerSet, pacerStop, ambienceStart, stopAll } from './temper-audio.js';
import { episodeClips, prefetch, prepare, hasClip, playClip, checkinClip, speaking, stopClips, regionClip, scanStepClip } from './temper-clips.js';
import { formatDay } from '../engine/dates.js';
import { BOOKS, STAGES, WHY, MAP_PLACES, ECHO_DEFAULT, BOOK_PATH } from '../data/temper.js';
import { breathAt, slowPattern, SIGH, NSDR_CUES, cueAt, whStart, whTap, whTick, whSafetyDue, WH_RECOVER } from '../engine/breath.js';
import {
  nextEpisode, missionsAvailable, suggestion, expandScript, isTimed, segAt, scanCue, echoDesc, logTemper, temperMetrics,
  episodeValue, bladeTier, doneEpisodes, scriptMinutes, checkinTimes, briefingSteps, briefingTones,
  temperForge, bookComplete, PART_SIZE, HEAT_WEEKS,
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
  stopAll();
  setAudioMode('ambient'); // Musik darf danach wieder normal laufen
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
      playTone('next');
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
        if (k <= 30 && k !== run.whCount) { run.whCount = k; playTone('hold'); }
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
  // Leiser Check-in-Ton ca. jede Minute: zurück zum Atem bzw. zur Zahl
  if (run.ci && run.ci[0] != null && st.elapsed >= run.ci[0]) {
    const clip = s.t === 'count' ? checkinClip() : null;
    if (!clip) { run.ci.shift(); playTone('checkin'); } else if (!speaking()) { run.ci.shift(); playTone('checkin'); setTimeout(() => playClip(clip), 900); }
  }
  // Sprecher-Begleit-Clips zur Sekunde im Abschnitt (bei 0 s erst nach dem Glocken- bzw. Doppelton)
  for (const cue of run.clips?.cues || []) {
    const key = `${cue.seg}:${cue.at}`;
    if (cue.seg === s.src && !run.cuesDone.has(key) && st.elapsed >= (cue.at || 1.5)) { run.cuesDone.add(key); playClip(cue.clip); }
  }
  // Doppelton bei jeder neuen Station im ECHO-Scan
  if (s.t === 'scan') {
    const sc = scanCue(s, st.elapsed);
    const idx = sc.index;
    if (run.station != null && idx !== run.station) playTone('next');
    run.station = idx;
    // Sprecher: Region zu Beginn der Station (nach dem Ton), dann der Clip zum Loslassen
    const into = st.elapsed - idx * (s.sec / s.regions.length);
    const say = sc.step === 'see' ? (into >= 1.5 ? regionClip(sc.region) : null) : scanStepClip(s.mode);
    const key = `scan:${run.i}:${idx}:${sc.step === 'see' ? 'see' : 'out'}`;
    if (say && run.clips && !run.cuesDone.has(key) && hasClip(say)) { run.cuesDone.add(key); playClip(say); }
  }
  if (s.t === 'breath' || s.t === 'sigh') {
    const b = breathAt(run.segStart, now, s.t === 'sigh' ? SIGH : slowPattern(s.out || 6));
    pacerStart();
    pacerSet(b.scale);
    const c = document.querySelector('[data-breath]');
    if (c) c.style.transform = `scale(${(0.45 + 0.55 * b.scale).toFixed(3)})`;
    const l = document.querySelector('[data-breath-label]');
    if (l && l.textContent !== b.label) { l.textContent = b.label; }
  }
  // Text-Hinweise wechseln: neu zeichnen (und vorlesen, falls an)
  const cue = currentCue(s, st.elapsed);
  if (cue !== run.cue) {
    if (s.t === 'nsdr' && run.cue) playTone('next');
    run.cue = cue;
    speak(cue);
    rerender();
  }
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
  if (prev?.t === 'breath' || prev?.t === 'sigh') pacerStop();
  run.i += 1;
  run.segStart = Date.now();
  run.cue = null;
  run.segTaps = 0;
  run.station = null;
  if (run.i >= run.segs.length) {
    playTone('bell'); // Ende
    pulse();
    const outro = run.clips?.outro;
    if (outro && hasClip(outro)) {
      clearInterval(ticker);
      ticker = null;
      setTimeout(() => playClip(outro).then(() => setTimeout(() => { if (!ticker) stopTicker(); }, 600)), 3000);
    } else setTimeout(stopTicker, 4500); // Glocke ausklingen lassen
    run.stage = 'clarity';
    rerender();
    return;
  }
  const s = seg();
  run.ci = checkinTimes(s, (run.ep?.n || 7) * 31 + run.i);
  if (s.t === 'silent') playTone('bell');
  else if (prev) playTone('next');
  if (s.t === 'wimhof') run.wh = null;
  rerender();
}

// ——— Ansichten ———
function homeView(c) {
  const data = c.data;
  const sug = suggestion(data, c.today());
  const tier = bladeTier(data);
  const m = temperMetrics(data, c.today());
  const f = temperForge(data, c.today());
  const seen = new Set(data.settings.temperMarksSeen || []);
  let out = `<header class="forge-hero">${bladeEmblem(tier, 56)}
    <div><small class="forge-kicker">Die Kammer · Stufe ${STAGES[Math.min(tier, 4)]}</small><h1 class="forge-title">TEMPER</h1>
    <p class="muted small">Der Körper wird draußen geschmiedet. Der Geist hier.</p></div></header>
    <div class="forge-stats">
      <div><b class="num" data-tick="tglut" data-to="${f.minutes}">${f.minutes}</b><small>min Glut</small></div>
      <div><b class="num" data-tick="tep" data-to="${f.episodes}">${f.episodes}</b><small>von ${f.total} Episoden</small></div>
      <div><b class="num" data-tick="tseal" data-to="${f.seals}">${f.seals}</b><small>von ${f.parts.length} Siegeln</small></div>
    </div>`;
  if (sug.kind === 'mission') {
    out += sys(sug.mission.name, `<p>${esc(sug.reason)}</p><button class="btn primary wide" data-act="tp-mission" data-id="${sug.mission.id}">NSDR starten</button>`, { tone: 'calm' });
  }
  if (sug.kind !== 'done') {
    const nx = sug.ep ? sug : nextEpisode(data);
    if (nx?.ep) {
      out += sys(`Buch ${nx.book.n} · ${nx.book.name} · Teil ${Math.ceil(nx.ep.n / PART_SIZE)}`, `<p class="t-target">Episode ${nx.ep.n} · ${esc(nx.ep.title)}</p>
        <p class="muted small">${esc(nx.ep.dur)} · ${esc(nx.ep.exercise.replace(/\*\*/g, ''))}</p>
        ${sug.co2 ? '<p class="note">Vorher kurz: der wöchentliche CO2-Test.</p>' : ''}
        <button class="btn primary wide pulse" data-act="tp-episode">Episode starten</button>`, { tone: 'gold' });
    }
  } else {
    out += sys('Alle Episoden gemacht', '<p>Das nächste Buch folgt. Die Einsätze bleiben jederzeit abrufbar.</p>');
  }
  out += bookOnePath(f, sug);
  out += booksCard(data);
  out += heatCard(f);
  out += marksCard(f, seen);
  const ms = missionsAvailable(data);
  out += sys('Einsätze', ms.length ? `<div class="pull-list">${ms.map((x) => `<button class="swap" data-act="tp-mission" data-id="${x.id}"><b>${esc(x.name)}</b><small>${esc(x.sub)}</small></button>`).join('')}</div>`
    : '<p class="muted small">Schalten sich mit den Episoden frei: Verlangen ab Episode 9, NSDR ab 15, Stress ab 18, Einschlafen ab 22, Vor dem Kampf ab 26.</p>');
  out += metricsCard(m);
  out += `<section class="card"><div class="label">Stimme</div>
    <div class="chips"><button class="chip${data.settings.temperVoice ? ' on' : ''}" data-act="tp-voice" data-v="1">Vorlesen</button><button class="chip${data.settings.temperVoice ? '' : ' on'}" data-act="tp-voice" data-v="0">Nur Text</button></div>
    <p class="muted small">Gerätestimme (Deutsch, langsam). Klingt mechanisch, deshalb standardmäßig aus. Eine natürliche Stimme kann später dazukommen. Bis dahin führen die Töne.</p>
    <div class="label">Klangteppich</div>
    <div class="chips"><button class="chip${data.settings.temperAmbience !== false ? ' on' : ''}" data-act="tp-amb" data-v="1">An</button><button class="chip${data.settings.temperAmbience === false ? ' on' : ''}" data-act="tp-amb" data-v="0">Aus</button></div>
    <p class="muted small">Leiser Drone mit sanftem Rauschen unter der Übung. Die Hinweistöne kommen immer.</p>
    <div class="label">Reset-Hinweis im Training</div>
    <div class="chips"><button class="chip${data.settings.temperResetHint !== false ? ' on' : ''}" data-act="tp-hint" data-v="1">An</button><button class="chip${data.settings.temperResetHint === false ? ' on' : ''}" data-act="tp-hint" data-v="0">Aus</button></div>
    <p class="muted small">Ab Episode 26: In der Pause vor dem letzten Satz einer Hauptübung erscheint „Reset?“.</p></section>`;
  return out;
}

// Buch I als Pfad: sechs Teile, je fünf Episoden, jeder fertige Teil bekommt ein Siegel
function bookOnePath(f, sug) {
  const book = BOOKS[0];
  const parts = book.parts.map((name, p) => {
    const eps = book.episodes.slice(p * PART_SIZE, (p + 1) * PART_SIZE);
    const sealed = f.parts[p];
    return `<div class="fp-part${sealed ? ' sealed' : ''}">
      <div class="fp-head"><span class="fp-seal" aria-hidden="true">${sealed ? '◆' : '◇'}</span><b>Teil ${p + 1} · ${esc(name)}</b></div>
      <div class="fp-nodes">${eps.map((e) => {
        const on = f.done[1]?.has(e.n);
        const isCur = !on && sug.ep?.n === e.n;
        return `<span class="fp-node${on ? ' on' : ''}${isCur ? ' cur' : ''}" title="${esc(e.title)}"><i>${e.n}</i></span>`;
      }).join('<span class="fp-link"></span>')}</div></div>`;
  }).join('');
  return `<section class="card forge-path"><div class="label">Buch I · ERWACHEN · Anfänger</div>
    <div class="fp-bar"><i style="width:${Math.round((f.episodes / Math.max(1, f.total)) * 100)}%"></i></div>
    ${parts}<p class="muted small">Eine Episode pro Tag ist der Weg, kein Muss. Du machst weiter, wo du aufgehört hast.</p></section>`;
}

// Die fünf Bücher: Buch I offen, II–V als Platzhalter
function booksCard(data) {
  return `<section class="card"><div class="label">Der Weg der Klinge</div><div class="book-path">${BOOK_PATH.map((b) => {
    const open = BOOKS.some((x) => x.n === b.n);
    const done = bookComplete(data, b.n);
    return `<div class="bp-book${open ? ' open' : ' soon'}${done ? ' done' : ''}">${bladeEmblem(b.n - 1, 34)}
      <div><small>Buch ${['I', 'II', 'III', 'IV', 'V'][b.n - 1]} · ${b.stage} · ${b.level}</small><b>${esc(b.name)}</b><span class="muted small">${esc(open ? b.sub : b.line)}</span></div>
      <em class="bp-tag">${done ? 'geschmiedet' : open ? 'offen' : 'bald'}</em></div>`;
  }).join('')}</div></section>`;
}

// Glutspur: jede Spalte eine Woche, jede Zeile ein Tag, Helligkeit = Minuten
function heatCard(f) {
  const cells = [];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < HEAT_WEEKS; col++) {
      const { day, min } = f.heat[col * 7 + row];
      cells.push(`<i class="${min >= 11 ? 'l3' : min >= 6 ? 'l2' : min > 0 ? 'l1' : ''}"${min < 0 ? ' style="opacity:.25"' : ''} title="${day}"></i>`);
    }
  }
  return `<section class="card"><div class="label">Glutspur · ${f.activeDays} Tage in der Kammer</div>
    <div class="heat forge-heat" style="grid-template-columns:repeat(${HEAT_WEEKS},minmax(0,1fr))">${cells.join('')}</div>
    <p class="muted small">Jede Glut bleibt. Leere Tage sind keine Lücke, sondern Ruhe.</p></section>`;
}

// Schmiedezeichen: erreicht leuchtet, neu erreicht glüht einmal auf
function marksCard(f, seen) {
  const got = f.marks.filter((m) => m.on).length;
  return `<section class="card"><div class="label">Schmiedezeichen · ${got}/${f.marks.length}</div><div class="marks">${f.marks.map((m) =>
    `<div class="mark${m.on ? ' on' : ''}${m.on && !seen.has(m.id) ? ' new' : ''}"><span class="mark-glyph" aria-hidden="true">${m.on ? '◆' : '◇'}</span>
      <b>${esc(m.name)}</b><small>${esc(m.how)}</small></div>`).join('')}</div></section>`;
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

function storyView(c) {
  const e = run.ep;
  const lines = e ? e.story : [];
  const main = run.segs.find((x) => WHY[x.t] && x.t !== 'guide') || run.segs.find((x) => WHY[x.t]);
  const steps = briefingSteps(run.segs);
  const tones = briefingTones(run.segs);
  const first = !c.data.settings.temperBriefed;
  const amb = c.data.settings.temperAmbience !== false;
  return `<div class="temper-story"><small class="bigtimer-count">${e ? `Buch ${run.book.n} · Episode ${e.n}` : 'Einsatz'}</small>
    <h1>${esc(e ? e.title : run.mission.name)}</h1>
    ${lines.map((l) => `<p class="${l.startsWith('ECHO') ? 'echo-line' : 'sys-line'}">${esc(l)}</p>`).join('')}
    ${e?.field ? `<p class="note">Feldauftrag: ${esc(e.field)}</p>` : ''}
    <details class="card briefing"${first ? ' open' : ''}><summary><b>Briefing</b><small>Was · Warum · Wie · Töne</small></summary>
      ${main ? `<div class="label">Warum</div><p class="small">${esc(WHY[main.t])}</p>` : ''}
      <div class="label">Ablauf</div>
      <ol class="brief-steps">${steps.map((x) => `<li><b>${esc(x.title)}</b>${x.dur ? ` <span class="muted">· ${esc(x.dur)}</span>` : ''}<br><small>${esc(x.how)}</small></li>`).join('')}</ol>
      <div class="label">Töne · Augen zu, die Töne führen dich</div>
      <div class="brief-tones">${tones.map((k) => `<button class="tone-row" data-act="tp-tone" data-k="${k}"><span class="tone-play">▶</span><span><b>${TONES[k].name}</b><small>${esc(TONES[k].meaning)}</small></span></button>`).join('')}</div>
      <p class="muted small">Während TEMPER pausiert deine Musik, damit die Töne auch bei Lautlos-Schalter hörbar sind. Bildschirm darf an bleiben, er wird dunkel.</p>
    </details>
    <div class="chips"><button class="chip${amb ? ' on' : ''}" data-act="tp-amb" data-v="1">Klangteppich an</button><button class="chip${amb ? '' : ' on'}" data-act="tp-amb" data-v="0">Stille</button></div>
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
  return `<div class="temper-run">${head}${sys('ECHO einrichten', `<p class="muted small">Einmalig. ECHO spricht nie. Der Erzähler beschreibt, was er tut, und nennt dich beim Namen.</p>
    <div class="q"><div class="q-label">Dein Name (optional)</div><input class="search" data-input="tp-echo-name" value="${esc(e.name)}" autocomplete="off"></div>
    <div class="q"><div class="q-label">Wie sieht ECHO aus, wie kommt er heraus?</div><textarea data-input="tp-echo-desc" rows="3">${esc(e.desc)}</textarea></div>
    <button class="btn primary wide" data-act="tp-echo-save">So ist ECHO</button>`, { tone: 'gold' })}</div>`;
}

// Sprecher-Intro: läuft vor der Übung, Augen dürfen schon zu sein
function introView() {
  const e = run.ep;
  return `<div class="temper-story temper-intro"><small class="bigtimer-count">Buch ${run.book.n} · Episode ${e.n}</small>
    <h1>${esc(e.title)}</h1>
    <div class="intro-voice" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    <p class="muted center">Hör zu. Die Übung beginnt danach mit der Glocke.</p>
    <button class="btn ghost wide" data-act="tp-intro-skip">Intro überspringen</button></div>`;
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
  // src = Index im Episodenskript, damit Begleit-Clips auch nach vorgeschaltetem CO2-Test oder ohne ECHO-Formular treffen
  let segs = expandScript(script.map((s, k) => ({ ...s, src: k })), { map });
  if (ep && c.data.settings.echo?.desc) segs = segs.filter((s) => s.t !== 'echo');
  const sug = suggestion(c.data, c.today());
  if (ep && sug.co2 && !segs.some((s) => s.t === 'co2')) segs = [{ t: 'co2' }, ...segs];
  const clips = episodeClips(ep);
  prefetch(clips.all);
  run = { book, ep, mission, segs, i: 0, segStart: Date.now(), stage: 'story', taps: 0, countSec: 0, startedAt: Date.now(), clips, cuesDone: new Set() };
  c.render();
}

const screen = {
  render(c) {
    ctxRef = c;
    if (!run) return homeView(c);
    if (run.stage === 'story') return storyView(c);
    if (run.stage === 'clarity') return clarityView();
    if (run.stage === 'intro') return introView();
    return runView(c);
  },
  mount(c) {
    ctxRef = c;
    if (run?.stage === 'run' && !ticker) startTicker();
    if (!run) {
      const got = temperForge(c.data, c.today()).marks.filter((m) => m.on).map((m) => m.id);
      const seen = c.data.settings.temperMarksSeen || [];
      if (got.some((id) => !seen.includes(id))) {
        setTimeout(() => {
          if (run || !location.hash.startsWith('#temper')) return;
          c.update((data) => ({ ...data, settings: { ...data.settings, temperMarksSeen: got } }));
        }, 4000);
      }
    }
  },
  onInput(c, name, value) {
    if (!run?.echo) return;
    if (name === 'tp-echo-name') run.echo.name = value.slice(0, 30);
    if (name === 'tp-echo-desc') run.echo.desc = value.slice(0, 200);
  },
  actions: {
    'tp-episode': (c) => { const n = nextEpisode(c.data); if (n) begin(c, n); },
    'tp-mission': (c, d) => begin(c, { mission: missionsAvailable(c.data).find((m) => m.id === d.id) }),
    'tp-go': async (c) => {
      // Musik pausieren, Töne auch bei Lautlos: Audio-Sitzung „playback“ (muss im Tap passieren)
      setAudioMode('playback');
      unlockAudio();
      if (!c.data.settings.temperBriefed) c.update((data) => ({ ...data, settings: { ...data.settings, temperBriefed: true } }));
      const intro = run.clips?.intro;
      if (intro && hasClip(intro)) {
        run.stage = 'intro';
        c.render();
        if (c.data.settings.temperAmbience !== false) setTimeout(ambienceStart, 150);
        await prepare(run.clips.all);
        const token = run;
        if (run !== token || run.stage !== 'intro') return; // übersprungen, während geladen wurde
        await playClip(intro);
        if (run === token && run.stage === 'intro') setTimeout(() => { if (run === token && run.stage === 'intro') screen.actions['tp-run'](c); }, 1200);
        return;
      }
      prepare(run.clips?.all || []);
      screen.actions['tp-run'](c);
    },
    'tp-intro-skip': (c) => { stopClips(); screen.actions['tp-run'](c); },
    'tp-run': (c) => {
      run.stage = 'run';
      run.segStart = Date.now();
      run.startedAt = Date.now();
      run.ci = checkinTimes(seg(), (run.ep?.n || 7) * 31);
      setTimeout(() => {
        playTone('bell');
        if (c.data.settings.temperAmbience !== false) ambienceStart();
      }, 150);
      startTicker();
      c.render();
    },
    'tp-tone': (c, d) => {
      setAudioMode('playback');
      unlockAudio();
      setTimeout(() => {
        if (d.k === 'breath') { pacerStart(); let t = 0; const iv = setInterval(() => { t += 0.1; pacerSet(t < 4 ? t / 4 : Math.max(0, 1 - (t - 4) / 6)); if (t > 10) { clearInterval(iv); pacerStop(); } }, 100); }
        else playTone(d.k);
      }, 100);
    },
    'tp-amb': (c, d) => c.update((data) => ({ ...data, settings: { ...data.settings, temperAmbience: d.v === '1' } })),
    'tp-next': () => next(),
    'tp-none': () => {},
    'tp-tap': (c) => {
      playTone('hold');
      run.taps += 1;
      run.segTaps = (run.segTaps || 0) + 1;
      const el = document.querySelector('.temper-taps');
      if (el) el.textContent = run.segTaps;
      document.querySelector('.temper-tap')?.classList.add('flash');
      setTimeout(() => document.querySelector('.temper-tap')?.classList.remove('flash'), 250);
    },
    'tp-cancel': (c) => c.system('Abbrechen?', '<p>Nichts geht verloren. Die Episode bleibt die nächste.</p>', [['tp-cancel-yes', 'Abbrechen'], ['close-modal', 'Weitermachen', 'primary']]),
    'tp-cancel-yes': (c) => { c.modal(null); stopClips(); stopTicker(); run = null; c.render(); },
    'tp-voice': (c, d) => c.update((data) => ({ ...data, settings: { ...data.settings, temperVoice: d.v === '1' } })),
    'tp-hint': (c, d) => c.update((data) => ({ ...data, settings: { ...data.settings, temperResetHint: d.v === '1' } })),
    // Wim Hof (eine Runde)
    'tp-wh-ok': (c) => c.update((data) => ({ ...data, settings: { ...data.settings, whSafetyAt: c.today() } })),
    'tp-wh-count': (c, d) => c.update((data) => ({ ...data, settings: { ...data.settings, whCount: d.v === '1' } })),
    'tp-wh-start': (c) => { unlockAudio(); run.wh = whStart(1, Date.now()); run.countTone = !!c.data.settings.whCount; run.whCount = 0; c.render(); },
    'tp-wh-tap': (c) => {
      if (!run.wh || !['breathe', 'hold'].includes(run.wh.phase)) return;
      run.wh = whTap(run.wh, Date.now());
      playTone('hold');
      c.render();
    },
    // CO2-Test
    'tp-co2-ready': (c) => { run.co2State = { phase: 'ready' }; c.render(); },
    'tp-co2-tap': (c) => {
      const st = run.co2State;
      if (st.phase === 'ready') { run.co2State = { phase: 'exhale', since: Date.now() }; playTone('hold'); }
      else if (st.phase === 'exhale') { run.co2 = Math.round((Date.now() - st.since) / 1000); run.co2State = { phase: 'result', result: run.co2 }; playTone('hold'); }
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

/** Läuft gerade eine Übung? (Dann keine Tab-Leiste.) */
export const temperRunning = () => !!run;

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
