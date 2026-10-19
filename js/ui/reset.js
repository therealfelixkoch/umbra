// SUNDAY RESET als Karte auf Heute: 5 Häkchen, Wochenplan zum Antippen (nur Hinweis).
import { esc } from './kit.js';
import { addDays, formatDay } from '../engine/dates.js';
import { RESET_ITEMS, PLAN_KINDS, DAY_NAMES, resetDue, resetState, toggleReset, cyclePlan, planHint, settleReset } from '../engine/reset.js';
import { XP_CONFIG } from '../data/xp-config.js';

const KIND_LABEL = Object.fromEntries(PLAN_KINDS);

export function resetCard(c) {
  const ws = resetDue(c.data, c.today(), new Date().getHours());
  if (!ws) return '';
  const st = resetState(c.data, ws);
  const planWs = addDays(ws, 7);
  const plan = c.data.weekPlans?.[planWs] || {};
  const n = RESET_ITEMS.filter(([k]) => st[k]).length;
  const rows = RESET_ITEMS.map(([k, label, sub]) => {
    const act = k === 'review' ? `data-act="go" data-to="review"` : k === 'plan' ? 'data-act="reset-plan"' : `data-act="reset-toggle" data-k="${k}" data-ws="${ws}"`;
    return `<button class="reset-row${st[k] ? ' on' : ''}" ${act}><i aria-hidden="true">${st[k] ? '✓' : ''}</i><span><b>${esc(label)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></button>`;
  }).join('');
  const planUi = c.ui.planOpen ? `<div class="week-plan">${DAY_NAMES.map((d, i) => `<button class="wp-day k-${plan[i] || 'none'}" data-act="plan-cycle" data-ws="${planWs}" data-i="${i}">
      <small>${d} ${formatDay(addDays(planWs, i)).slice(0, 6)}</small><b>${KIND_LABEL[plan[i] || '']}</b></button>`).join('')}</div>
    <p class="muted small">Antippen schaltet durch: ARENA · Mission · Frei. Nur ein Hinweis, die App plant weiter nach deinem Check-in.</p>
    <button class="btn small" data-act="reset-plan-done" data-ws="${ws}">Plan steht</button>` : '';
  return `<section class="card reset-card"><div class="quest-head"><div><div class="label">SUNDAY RESET</div><b>Woche ab ${formatDay(ws)}</b>
    <small class="muted reset-sub">${n}/5 · komplett +${XP_CONFIG.sources.sundayReset} XP</small></div></div>
    <div class="reset-list">${rows}</div>${planUi}</section>`;
}

/** Hinweis aus dem Wochenplan für heute. */
export function planNote(c) {
  const k = planHint(c.data, c.today());
  if (!k) return '';
  return `<p class="muted small plan-hint">Laut Wochenplan heute: <b>${esc(KIND_LABEL[k])}</b></p>`;
}

export const resetActions = {
  'reset-toggle': (c, d) => c.update((data) => toggleReset(data, d.ws, d.k, c.today())),
  'reset-plan': (c) => c.setUi({ planOpen: !c.ui.planOpen }),
  'plan-cycle': (c, d) => c.update((data) => settleReset(cyclePlan(data, d.ws, Number(d.i)), addDays(d.ws, -7), c.today())),
  'reset-plan-done': (c, d) => {
    c.ui.planOpen = false;
    if (!resetState(c.data, d.ws).plan) c.update((data) => toggleReset(data, d.ws, 'plan', c.today()));
    else c.render();
  },
};
