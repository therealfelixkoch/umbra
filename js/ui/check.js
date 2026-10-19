// Mobility-Check: 8 Tests, je 5 Stufen mit Skizze → Scores, Fokus-Stretches, Verlauf.
import { sys, esc } from './kit.js';
import { REGIONS, REGION, RETEST_DAYS } from '../data/mobility.js';
import { levelToScore, latestTest, previousTest, priorities, selectStretches, averageScore } from '../engine/mobility.js';
import { daysBetween, formatDay } from '../engine/dates.js';
import { sessionXp } from '../engine/game.js';
import { XP_CONFIG } from '../data/xp-config.js';
import { getDef } from '../data/exercises.js';
import { MISSIONS } from '../data/missions.js';

// ——— Skizzen ———
const rad = (d) => (d * Math.PI) / 180;
const P = (x, y, len, deg) => [x + len * Math.cos(rad(deg)), y - len * Math.sin(rad(deg))];
const L = (a, b, cls = '') => `<line class="${cls}" x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"/>`;
const C = (p, r, cls = '') => `<circle class="${cls}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r}"/>`;
function arc(p, r, from, to) {
  const a = P(p[0], p[1], r, from);
  const b = P(p[0], p[1], r, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  const sweep = to > from ? 0 : 1;
  return `<path class="arc" d="M${a[0].toFixed(1)} ${a[1].toFixed(1)} A${r} ${r} 0 ${large} ${sweep} ${b[0].toFixed(1)} ${b[1].toFixed(1)}"/>`;
}

const FIG = {
  thomas([below, bend]) {
    const hip = [62, 40];
    const knee = P(...hip, 26, -below);
    const foot = P(...knee, 22, -below - bend);
    return `${L([8, 46], [64, 46], 'base')}${C([14, 37], 4)}${L([18, 39], hip)}${L(hip, [50, 24])}${L([50, 24], [38, 30])}
      ${L(hip, [100, 40], 'ref')}${L(hip, knee, 'hi')}${L(knee, foot, 'hi')}${arc(hip, 14, 0, -below)}`;
  },
  split([a]) {
    const hip = [60, 28];
    const l = P(...hip, 44, 270 - a / 2);
    const r = P(...hip, 44, 270 + a / 2);
    const y = Math.max(l[1], r[1]);
    return `${L([4, y], [116, y], 'base')}${L(hip, [60, 10])}${C([60, 6], 4)}${L(hip, l, 'hi')}${L(hip, r, 'hi')}${arc(hip, 12, 270 - a / 2, 270 + a / 2)}`;
  },
  aslr([a]) {
    const hip = [56, 60];
    return `${L([4, 64], [116, 64], 'base')}${C([12, 58], 4)}${L([16, 60], hip)}${L(hip, [108, 60])}${L(hip, P(...hip, 48, a), 'hi')}${arc(hip, 14, 0, a)}`;
  },
  ninety([lean]) {
    const hip = [56, 62];
    const top = P(...hip, 30, 90 - lean);
    return `${L([4, 68], [116, 68], 'base')}${L(hip, [84, 62])}${L([84, 62], [84, 48])}${L(hip, [40, 66])}${L([40, 66], [26, 60])}
      ${L(hip, [56, 30], 'ref')}${L(hip, top, 'hi')}${C(P(...hip, 36, 90 - lean), 4, 'hi')}`;
  },
  kneewall([a]) {
    const ankle = [70, 70];
    const knee = P(...ankle, 32, 90 - a);
    return `${L([4, 72], [116, 72], 'base')}${L([108, 6], [108, 72], 'base')}${L([62, 70], [84, 70])}${L(ankle, knee, 'hi')}
      ${L(knee, P(...knee, 28, 205))}${L([84, 76], [108, 76], 'ref')}${arc(ankle, 12, 90, 90 - a)}`;
  },
  tspine([a]) {
    const p = [60, 50];
    return `${L([4, 74], [116, 74], 'base')}${L([30, 50], [90, 50], 'ref')}${L(p, [60, 74])}${C([60, 42], 5)}${L(p, P(...p, 36, 180 - a), 'hi')}${arc(p, 14, 180, 180 - a)}`;
  },
  overhead([a]) {
    const sh = [64, 26];
    return `${L([4, 76], [116, 76], 'base')}${L([52, 4], [52, 76], 'base')}${L([64, 76], [64, 48])}${L([64, 48], sh)}${C([64, 18], 5)}
      ${L(sh, P(...sh, 30, 270 + a), 'hi')}${arc(sh, 10, 270, 270 + a)}`;
  },
  neck([a]) {
    const c = [60, 46];
    return `${L([22, 54], [98, 54])}${C(c, 11)}${L(c, [60, 18], 'ref')}${L(c, P(...c, 26, 90 - a), 'hi')}${arc(c, 16, 90, 90 - a)}`;
  },
};

export function sketch(region, level) {
  const r = REGION[region];
  const vb = { thomas: '4 14 104 69', neck: '14 10 92 61' }[r.sketch] || '0 0 120 80';
  return `<svg class="sketch" viewBox="${vb}" aria-hidden="true">${FIG[r.sketch](r.levels[level - 1].a)}</svg>`;
}

// ——— Verlaufsdiagramm: ein Balken pro Region, Strich = vorheriger Test ———
export function scoreChart(tests) {
  const last = latestTest(tests);
  if (!last) return '';
  const prev = previousTest(tests);
  const rows = REGIONS.map((r) => {
    const v = last.scores[r.id];
    const p = prev?.scores[r.id];
    const d = p == null ? '' : v - p;
    const lvl = REGION[r.id].levels[(last.levels?.[r.id] || 1) - 1];
    return `<button class="bar-row" data-act="chart-row" title="${esc(r.name)}: ${v}/100 · ${esc(lvl.label)}${p != null ? ` · vorher ${p}` : ''}">
      <span class="bar-label">${esc(r.name)}</span>
      <span class="bar-track"><i class="bar-fill" style="width:${Math.max(v, 2)}%"></i>${p != null ? `<i class="bar-prev" style="left:${p}%"></i>` : ''}</span>
      <span class="bar-val num">${v}${d !== '' && d !== 0 ? `<small class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d}</small>` : ''}</span>
      <span class="bar-detail">${esc(lvl.label)} · ${esc(lvl.desc)}${p != null ? ` · vorher ${p}` : ''}</span>
    </button>`;
  }).join('');
  return `<div class="bar-chart" role="table" aria-label="Mobility-Score pro Region">${rows}</div>
    <p class="muted small">Score 0–100 pro Region${prev ? ` · Strich = Test vom ${formatDay(prev.day)}` : ''}. Tippe eine Zeile für Details.</p>`;
}

export function historyList(tests) {
  return tests.slice().reverse().map((t) =>
    `<div class="done-row"><span>${formatDay(t.day)}</span><b class="num">Ø ${averageScore(t.scores)}</b></div>`).join('');
}

function focusList(scores, today) {
  const n = Math.abs(daysBetween('2024-01-01', today));
  const ids = [...MISSIONS.FLOW.base, ...MISSIONS.FLOW.pool, ...MISSIONS.FLOW.focusPool];
  const pool = [...new Set(ids)].map(getDef).filter(Boolean);
  const top = priorities(scores).slice(0, 3).map((p) => REGION[p.region].name);
  const focus = selectStretches(scores, pool, n);
  return `<p class="muted">Größte Hebel fürs Muay Thai: <b>${top.map(esc).join(', ')}</b>.</p>
    <ul class="cues">${focus.map((id) => `<li>${esc(getDef(id).name)}</li>`).join('')}</ul>
    <p class="muted small">Diese drei stehen ab jetzt vorn in deinem täglichen FLOW und wechseln leicht von Tag zu Tag.</p>`;
}

export default {
  render(c) {
    const tests = c.data.mobility || [];
    const st = c.ui.chk || (c.ui.chk = { step: -1, levels: {} });
    const today = c.today();

    if (st.step === 'result') {
      const last = latestTest(tests);
      return `${sys('Mobility-Check abgeschlossen', `<div class="xp-gain num">Ø ${averageScore(last.scores)}</div>${scoreChart(tests)}`, { tone: 'gold' })}
        ${sys('Fokus für deinen FLOW', focusList(last.scores, today))}
        <button class="btn primary wide" data-act="chk-done">Fertig</button>`;
    }

    if (st.step === -1) {
      const last = latestTest(tests);
      return `<button class="btn ghost back" data-act="go" data-to="profil">← Profil</button>
        ${sys('Mobility-Check', `<p>8 kurze Tests, etwa 10 Minuten. Pro Region tippst du an, wie weit du kommst. Daraus berechnet das System einen Score von 0 bis 100 und wählt drei Stretches für deinen täglichen FLOW, gewichtet nach Muay Thai.</p>
          <p class="muted">Aufwärmen ist nicht nötig, aber nichts erzwingen. Bei zwei Seiten zählt die schlechtere. Wiederholen alle ${RETEST_DAYS / 7} Wochen.</p>
          ${last ? `<p class="muted">Letzter Check: ${formatDay(last.day)} · Ø ${averageScore(last.scores)}</p>` : ''}
          <p class="muted small">Du brauchst: Box oder Bett, eine Wand, ein Maßband oder Lineal.</p>
          <button class="btn primary wide" data-act="chk-start">Test starten</button>`)}`;
    }

    const r = REGIONS[st.step];
    const chosen = st.levels[r.id];
    return `<header class="t-head"><button class="icon-btn" data-act="chk-back" aria-label="Zurück">←</button>
        <div><small>Mobility-Check</small><b>${esc(r.name)}</b></div><span class="num">${st.step + 1}/${REGIONS.length}</span></header>
      <div class="t-progress"><i style="width:${Math.round((st.step / REGIONS.length) * 100)}%"></i></div>
      <section class="card">
        <div class="label">${esc(r.test)}</div>
        <ul class="cues">${r.how.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <p class="note">Muay Thai: ${esc(r.mt)}</p>
      </section>
      <div class="label">Wie weit kommst du?</div>
      <div class="levels">${r.levels.map((l, i) => `<button class="level${chosen === i + 1 ? ' on' : ''}" data-act="chk-pick" data-v="${i + 1}">
        ${sketch(r.id, i + 1)}<div><b>${esc(l.label)}</b><small>${esc(l.desc)}</small></div><span class="lvl num">${i + 1}</span></button>`).join('')}</div>`;
  },
  actions: {
    'chk-start': (c) => c.setUi({ chk: { step: 0, levels: {} } }),
    'chk-back': (c) => {
      const st = c.ui.chk;
      c.setUi({ chk: { ...st, step: st.step > 0 ? st.step - 1 : -1 } });
    },
    'chk-pick': (c, d) => {
      const st = c.ui.chk;
      const r = REGIONS[st.step];
      const levels = { ...st.levels, [r.id]: Number(d.v) };
      if (st.step + 1 < REGIONS.length) {
        c.setUi({ chk: { step: st.step + 1, levels } });
        window.scrollTo(0, 0);
        return;
      }
      const day = c.today();
      const scores = Object.fromEntries(Object.entries(levels).map(([k, v]) => [k, levelToScore(v)]));
      const session = { id: `m${Date.now()}`, day, kind: 'check', missionId: 'CHECK' };
      session.xp = sessionXp(session);
      c.ui.chk = { step: 'result', levels };
      c.update((data) => ({ ...data, mobility: [...(data.mobility || []), { day, levels, scores }],
        sessions: [...data.sessions, session] }));
      window.scrollTo(0, 0);
    },
    'chk-done': (c) => {
      c.ui.chk = null;
      c.go('heute');
      c.system('Mobility-Check verbucht.', `<div class="xp-gain num">+${XP_CONFIG.sources.check} XP</div><p class="muted">Dein FLOW ist jetzt auf dich zugeschnitten.</p>`);
    },
    'chart-row': (c, d, el) => el.classList.toggle('open'),
  },
};
