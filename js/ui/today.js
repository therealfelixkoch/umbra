// Heute: Check-in → Empfehlung → Start.
import { sys, esc, chips, glyphChips, targetText, loadText, trendBadge, nameOf } from './kit.js';
import { decide } from '../engine/decide.js';
import { hardStreak, arenaOn, plattCount } from '../engine/history.js';
import { shouldSuggestDeload, startDeload, DELOAD_AFTER } from '../engine/cycle.js';
import { buildPlan, createActive, logArena } from '../engine/plan.js';
import { playerStats, WEEK_GOAL } from '../engine/game.js';
import { addDays, daysBetween } from '../engine/dates.js';
import { MISSIONS } from '../data/missions.js';
import { getDef } from '../data/exercises.js';
import { exportFile } from '../store.js';
import { isDue, latestTest } from '../engine/mobility.js';
import { questStatus, highestAscension, ASCENSIONS } from '../engine/progress.js';

const Q = {
  yesterdayMT: ['Gestern Muay Thai?', [['none', 'Nein'], ['light', 'Locker-Technik'], ['hard', 'Hartes Sparring']]],
  feeling: ['Wie fühlst du dich?', [['frisch', 'Frisch'], ['normal', 'Normal'], ['platt', 'Platt']]],
  tonightMT: ['Heute Abend Muay Thai?', [['yes', 'Ja'], ['no', 'Nein'], ['maybe', 'Vielleicht']]],
  where: ['Wo und wie viel Zeit?', [['room', 'Eigener Raum · 45 min'], ['gym', 'Home Gym · 60 min'], ['express', 'Nur 15 Minuten'], ['mobility', 'Nur Mobility']]],
};

export function hud(c) {
  const s = playerStats(c.data, c.today());
  const dots = Array.from({ length: WEEK_GOAL }, (_, i) => `<i class="${i < s.week.thisWeek ? 'on' : ''}"></i>`).join('');
  const asc = highestAscension(c.data);
  return `<header class="hud">
    <div class="rank-wrap${asc ? ' aura' : ''}" style="${asc ? `--aura:${asc.aura}` : ''}" title="${asc ? esc(asc.name) : 'Rang'}"><div class="rank-badge r-${s.rank.id}">${s.rank.id === 'U' ? '∞' : s.rank.id}</div></div>
    <div class="hud-kk"><small>Kampfkraft</small><b class="num" data-kk="${s.kk}">${s.kk.toLocaleString('de-DE')}</b>
      <div class="xpbar"><i style="width:${Math.round(s.rank.progress * 100)}%"></i></div></div>
    <div class="hud-week"><small>Woche</small><div class="wdots">${dots}</div><b class="num">${s.week.streak}<span>W</span></b></div>
  </header>`;
}

function recommendation(c) {
  const data = c.data;
  const today = c.today();
  const ci = data.checkins[today];
  if (!ci) return null;
  const rec = decide({ checkin: ci, hardStreak: hardStreak(data.sessions, today), queue: data.engine.queue,
    overrideRest: ci.overrideRest });
  if (ci.choice) {
    return { ...rec, kind: MISSIONS[ci.choice].format === 'flow' ? 'flow' : 'mission', missionId: ci.choice,
      reason: 'Von dir gewählt.', manual: true };
  }
  return rec;
}

function planPreview(plan) {
  if (plan.format === 'sets') {
    return `<ol class="ex-list">${plan.items.map((it) => {
      const def = getDef(it.exId);
      return `<li><span>${esc(def.name)}${it.optional ? ' <em>optional</em>' : ''}</span><span class="muted">${def.mode === 'fixed' ? `${it.sets > 1 ? `${it.sets} × ` : ''}${targetText(def)}` : `${it.sets} × ${targetText(def, it.target)}`}${loadText(def, it.load) && def.load ? ` · ${loadText(def, it.load)}` : ''} ${trendBadge(it.trend)}</span></li>`;
    }).join('')}</ol>`;
  }
  if (plan.format === 'intervals') return `<p class="muted">${plan.rounds} × ${plan.work / 60} min ${esc(nameOf(plan.exId))}, ${plan.rest / 60} min Pause.</p>`;
  const head = plan.format === 'circuit' ? `<p class="muted">${plan.rounds} Runden, ${plan.restBetween / 60} min Pause zwischen den Runden${plan.light ? ', ruhiges Tempo' : ''}.</p>`
    : plan.format === 'amrap' ? '<p class="muted">So viele Runden wie möglich in 15 Minuten.</p>'
      : `<p class="muted">${plan.items.length} Positionen × ${plan.work} s, ${plan.rounds} Runden. Weich bewegen, nicht erzwingen.${plan.personalized ? ' Die ersten drei sind deine Fokus-Stretches aus dem Mobility-Check.' : ''}</p>`;
  return `${head}<ol class="ex-list">${plan.items.map((it) => {
    const def = getDef(it.exId);
    const v = plan.format === 'flow' ? '' : `${it.value} ${def.unit || (def.mode === 'time' ? 's' : '')}${def.perSide ? ' je Seite' : ''}`;
    return `<li><span>${esc(def.name)}${it.focus ? ' <em class="focus">Fokus</em>' : ''}</span><span class="muted">${v}</span></li>`;
  }).join('')}</ol>`;
}

function modifierNote(plan) {
  const m = plan.modifier;
  if (!m || m.type === 'none') return '';
  if (m.type === 'deload') {
    return `<p class="note">Deload-Phase: halbe Sätze, gleiches Gewicht, kein Versagen. Noch ${m.left} ${m.left === 1 ? 'Einheit' : 'Einheiten'}.</p>`;
  }
  return `<p class="note">Willkommen zurück. Wir steigen sauber wieder ein: ca. ${Math.round(m.pct * 100)} % weniger${m.dropSets ? ', ein Satz weniger' : ''}${m.noFailure ? ', kein Versagen' : ''}.</p>`;
}

function checkinForm(c) {
  const today = c.today();
  const f = c.ui.ci || (c.ui.ci = { yesterdayMT: arenaOn(c.data.sessions, addDays(today, -1)) });
  const askWhere = f.tonightMT !== 'yes' || f.morning;
  const ready = f.feeling && f.tonightMT && (!askWhere || f.where);
  const q = (k) => `<div class="q"><div class="q-label">${Q[k][0]}</div>${chips(k, Q[k][1], f[k])}</div>`;
  const morning = f.tonightMT === 'yes'
    ? `<div class="q"><div class="q-label">Zusätzlich Morgeneinheit?</div>${chips('morning', [['no', 'Nein, Arena reicht'], ['yes', 'Ja, ich hab Bock']], f.morning ? 'yes' : 'no')}</div>`
    : '';
  return sys('Tages-Check-in', `${q('yesterdayMT')}${q('feeling')}${q('tonightMT')}${morning}${askWhere ? q('where') : ''}
    <button class="btn primary wide" data-act="submit-ci" ${ready ? '' : 'disabled'}>Mission anfordern</button>`);
}

export function questCard(c) {
  const q = questStatus(c.data, c.today());
  const pips = Array.from({ length: q.target }, (_, i) => `<i class="${i < q.progress ? 'on' : ''}"></i>`).join('');
  return `<section class="card quest${q.done ? ' done' : ''}"><div class="quest-head"><div><div class="label">Wochen-Quest</div><b>${esc(q.quest.title)}</b><small>${esc(q.quest.desc)}${q.done ? ' · erfüllt' : ' · +100 XP'}</small></div>
    <span class="num">${q.progress}/${q.target}</span></div><div class="wdots quest-pips">${pips}</div></section>`;
}

function backupDue(data, today) {
  if (!data.sessions.length) return false;
  const s = data.settings;
  const since = (d) => (d ? daysBetween(d.slice(0, 10), today) : Infinity);
  return since(s.lastBackupAt) >= 7 && since(s.backupNudgeAt) >= 7;
}

export default {
  render(c) {
    const data = c.data;
    const today = c.today();
    let out = hud(c);

    if (data.active) {
      out += sys('Mission läuft', `<p><b>${esc(data.active.plan.name)}</b> · begonnen ${data.active.day === today ? 'heute' : 'am ' + data.active.day}</p>
        <div class="row gap"><button class="btn primary grow" data-act="go" data-to="training">Fortsetzen</button><button class="btn" data-act="discard-active">Verwerfen</button></div>`, { tone: 'gold' });
    }

    if (shouldSuggestDeload(data.engine, plattCount(data.checkins, today), today)) {
      out += sys('Deload empfohlen', `<p>Dreimal „platt“ in sieben Tagen. Ein paar leichtere Einheiten bringen dich schneller zurück auf Kurs.</p>
        <div class="row gap"><button class="btn primary grow" data-act="deload-yes">Deload starten</button><button class="btn" data-act="deload-no">Nicht jetzt</button></div>`);
    }

    if (backupDue(data, today)) {
      out += sys('Sicherung empfohlen', `<p>iOS räumt den Speicher von Web-Apps manchmal auf. Eine Sicherung dauert zehn Sekunden.</p>
        <div class="row gap"><button class="btn primary grow" data-act="backup-now">Jetzt sichern</button><button class="btn" data-act="backup-later">Später</button></div>`);
    }

    const rec = recommendation(c);
    if (!rec) return out + checkinForm(c);

    const doneToday = data.sessions.filter((s) => s.day === today);
    const trained = doneToday.filter((s) => s.kind === 'mission' || s.kind === 'express').length;
    const ci = data.checkins[today];
    if (trained > (ci.extra || 0)) {
      out += sys('Tagesziel erreicht', `<p class="reason">Mission erfüllt.${ci.tonightMT === 'yes' ? ' Heute Abend wartet die Arena.' : ' Der Rest des Tages gehört der Erholung.'}</p>
        <p class="muted">Stärke entsteht in der Pause. Ein Fluss am Abend hält dich geschmeidig.</p>
        <div class="row gap"><button class="btn ghost" data-act="swap">Weitere Einheit</button></div>`, { tone: 'calm' });
    } else if (rec.kind === 'arenaday') {
      out += sys('Arena-Tag', `<p class="reason">${esc(rec.reason)}</p><p class="muted">Ein kurzer Fluss am Morgen macht die Hüfte frei für die Kicks am Abend.</p>
        <div class="row gap"><button class="btn primary grow" data-act="start" data-id="FLOW">Fluss starten</button><button class="btn" data-act="morning-yes">Doch Morgeneinheit</button></div>`, { tone: 'calm' });
    } else if (rec.kind === 'rest') {
      out += sys('Ruhetag', `<p class="reason">${esc(rec.reason)}</p><p class="muted">Erholung ist Teil des Trainings. Ein lockerer Fluss hält dich beweglich.</p>
        <div class="row gap"><button class="btn primary grow" data-act="start" data-id="FLOW">Fluss starten</button><button class="btn" data-act="override-rest">Trotzdem trainieren</button></div>`, { tone: 'calm' });
    } else {
      const plan = buildPlan({ missionId: rec.missionId, profile: rec.profile, data, today });
      const m = MISSIONS[rec.missionId];
      out += sys('Mission verfügbar', `<div class="mission-title"><span class="mid">${rec.missionId.length === 1 ? rec.missionId : '◆'}</span><div><h2>${esc(m.name)}</h2><small>${esc(m.focus)} · ca. ${m.minutes} min${rec.profile === 'gym' && plan.kind === 'mission' ? ' · Home Gym' : ''}</small></div></div>
        <p class="reason">${esc(rec.reason)}</p>${rec.walk ? '<p class="note">Danach 20–30 Minuten spazieren.</p>' : ''}${modifierNote(plan)}
        ${planPreview(plan)}
        <button class="btn primary wide" data-act="start" data-id="${rec.missionId}" data-profile="${rec.profile}">Mission starten</button>`);
    }
    if (trained <= (ci.extra || 0)) {
      out += `<div class="row gap center"><button class="btn ghost" data-act="swap">Andere Einheit</button><button class="btn ghost" data-act="redo-ci">Check-in ändern</button></div>`;
    }

    out += questCard(c);
    if (isDue(data.mobility, today) && !doneToday.some((s) => s.kind === 'check')) {
      const first = !latestTest(data.mobility);
      out += `<section class="card flow-card"><div><b>Mobility-Check${first ? '' : ' fällig'}</b><small>${first ? '10 min · macht deinen Fluss persönlich' : '4 Wochen um · Fortschritt messen'}</small></div><button class="btn" data-act="go" data-to="check">Starten</button></section>`;
    }
    if (rec.missionId !== 'FLOW' && !doneToday.some((s) => s.kind === 'flow')) {
      out += `<section class="card flow-card"><div><b>Fluss</b><small>Täglich 10 min Mobility</small></div><button class="btn" data-act="start" data-id="FLOW">Starten</button></section>`;
    }
    if (doneToday.length) {
      out += `<section class="card"><div class="label">Heute erledigt</div>${doneToday.map((s) =>
        `<div class="done-row">✓ ${esc(s.kind === 'arena' ? `Arena · ${s.rpe ? `Intensität ${s.rpe}` : s.intensity === 'hard' ? 'Sparring' : 'Technik'}` : s.kind === 'check' ? 'Mobility-Check' : s.kind === 'quest' ? 'Wochen-Quest erfüllt' : s.kind === 'ascension' ? `Ascension: ${ASCENSIONS.find((a) => a.id === s.ascension)?.name}` : MISSIONS[s.missionId]?.name || s.missionId)} <span class="muted">+${s.xp} XP</span></div>`).join('')}</section>`;
    }
    const left = DELOAD_AFTER - data.engine.fullSinceDeload;
    out += `<p class="foot muted">Rotation: ${data.engine.queue.map((id) => MISSIONS[id].name).join(' → ')} · Deload in ${left} Missionen</p>`;
    return out;
  },

  actions: {
    pick: (c, d) => {
      c.ui.ci = { ...c.ui.ci, [d.name]: d.name === 'morning' ? d.value === 'yes' : d.value };
      c.render();
    },
    'submit-ci': (c) => {
      const today = c.today();
      const f = c.ui.ci;
      c.update((data) => {
        let next = data;
        const y = addDays(today, -1);
        if (f.yesterdayMT !== 'none' && arenaOn(data.sessions, y) === 'none') {
          next = logArena(data, { day: y, intensity: f.yesterdayMT, minutes: 60 }).data;
        }
        return { ...next, checkins: { ...next.checkins, [today]: { day: today, ...f } } };
      });
      c.ui.ci = null;
    },
    'morning-yes': (c) => {
      const today = c.today();
      const { day, choice, overrideRest, extra, ...answers } = c.data.checkins[today] || {};
      c.ui.ci = { ...answers, morning: true };
      c.update((data) => {
        const checkins = { ...data.checkins };
        delete checkins[today];
        return { ...data, checkins };
      });
    },
    'redo-ci': (c) => {
      const today = c.today();
      const { day, choice, overrideRest, extra, ...answers } = c.data.checkins[today] || {};
      c.ui.ci = answers;
      c.update((data) => {
        const checkins = { ...data.checkins };
        delete checkins[today];
        return { ...data, checkins };
      });
    },
    swap: (c) => {
      const q = c.data.engine.queue;
      const ids = [...q, 'D_LIGHT', 'EXPRESS', 'EXPRESS_BAG', 'FLOW'];
      c.modal(sys('Andere Einheit', `<div class="swap-list">${ids.map((id) =>
        `<button class="swap" data-act="choose" data-id="${id}"><b>${esc(MISSIONS[id].name)}</b><small>${esc(MISSIONS[id].focus)}${id === q[0] ? ' · als Nächstes dran' : ''}</small></button>`).join('')}</div>
        <button class="btn ghost wide" data-act="close-modal">Abbrechen</button>`, { cls: 'pop' }));
    },
    choose: (c, d) => {
      const today = c.today();
      c.modal(null);
      const extra = c.data.sessions.filter((s) => s.day === today && (s.kind === 'mission' || s.kind === 'express')).length;
      c.update((data) => ({ ...data, checkins: { ...data.checkins, [today]: { ...data.checkins[today], choice: d.id, overrideRest: true, extra } } }));
    },
    'override-rest': (c) => {
      c.system('Warnung', '<p>Drei harte Tage am Stück. Die Anpassung passiert in der Pause, nicht im Training. Trotzdem trainieren?</p>',
        [['override-yes', 'Trotzdem trainieren'], ['close-modal', 'Ruhetag nehmen', 'primary']], 'warn');
    },
    'override-yes': (c) => {
      const today = c.today();
      c.modal(null);
      c.update((data) => ({ ...data, checkins: { ...data.checkins, [today]: { ...data.checkins[today], overrideRest: true } } }));
    },
    start: (c, d) => {
      if (c.data.active) {
        c.go('training');
        return;
      }
      const today = c.today();
      const profile = d.profile || 'room';
      const plan = buildPlan({ missionId: d.id, profile, data: c.data, today });
      c.ui.training = { index: 0 };
      c.update((data) => ({ ...data, active: createActive(plan, today) }));
      c.go('training');
    },
    'discard-active': (c) => {
      c.system('Mission verwerfen?', '<p>Die bisher geloggten Sätze dieser Einheit gehen verloren.</p>',
        [['discard-yes', 'Verwerfen'], ['close-modal', 'Behalten', 'primary']], 'warn');
    },
    'discard-yes': (c) => {
      c.modal(null);
      c.update((data) => ({ ...data, active: null }));
    },
    'deload-yes': (c) => {
      c.update((data) => ({ ...data, engine: startDeload(data.engine) }));
      c.system('Deload aktiviert', '<p>Die nächsten 4 Missionen: halbe Sätze, gleiches Gewicht, kein Versagen.</p>');
    },
    'deload-no': (c) => c.update((data) => ({ ...data, engine: { ...data.engine, deloadSuggestDismissed: c.today() } })),
    'backup-now': async (c) => {
      if (await exportFile(c.data, c.today())) {
        c.update((data) => ({ ...data, settings: { ...data.settings, lastBackupAt: new Date().toISOString() } }));
      }
    },
    'backup-later': (c) => c.update((data) => ({ ...data, settings: { ...data.settings, backupNudgeAt: c.today() } })),
  },
};
