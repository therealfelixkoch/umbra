// Bang Muay Thai in der Arena: Plan der aktuellen Woche, Fortschritt, Wochen verwalten.
// Timer- und Eintragen-Aktionen sitzen in arena.js (dort leben Rundentimer und Arena-Log).
import { sys, esc, stepper } from './kit.js';
import { parseWeekText, saveWeek, deleteWeek, setCurrent, toggleDone, currentWeek, weekProgress, nextWeekNumber, emptyBmt, BMT_NAME, BMT_PROGRAM } from '../engine/bmt.js';
import { formatDay } from '../engine/dates.js';

const EXAMPLE = `Week 7
Warm Up
Dehnen
1x 3 min footwork

Single Sounich Series 10x
Jab, Cross, Hook

Combo Nummern 1-4 in Order - 2 Runden 3 min`;

const fmtTime = (s) => (s % 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s / 60}`);

function planView(c, bmt) {
  const progress = weekProgress(bmt, c.data.sessions);
  const cur = currentWeek(bmt);
  const sel = progress.find((w) => w.id === c.ui.bmtWeek) || progress.find((w) => w.id === cur?.id);
  const done = progress.filter((w) => w.done).length;
  const pills = progress.map((w) => `<button class="bmt-pill${w.done ? ' done' : ''}${w.id === cur?.id ? ' cur' : ''}${w.id === sel?.id ? ' sel' : ''}" data-act="bmt-select" data-id="${w.id}">
      <b class="num">${w.number}</b><small>${w.done ? '✓' : w.sessions ? `${w.sessions}×` : ''}</small></button>`).join('');
  const header = sys(`${BMT_NAME} · ${BMT_PROGRAM}`, `
    <div class="bmt-pills">${pills}</div>
    <p class="muted small">${progress.length} ${progress.length === 1 ? 'Woche' : 'Wochen'} eingetragen · ${done} abgeschlossen${cur ? ` · aktuell Woche ${cur.number}` : ''}</p>
    <button class="btn ghost small" data-act="bmt-manage">Wochen verwalten</button>`);
  if (!sel) return header;
  const { blocks } = parseWeekText(sel.text);
  const checked = c.ui.bmtChecked?.[sel.id] || {};
  const list = blocks.map((b, i) => `<div class="bmt-block${checked[i] ? ' ticked' : ''}">
      <button class="bmt-check" data-act="bmt-tick" data-i="${i}" aria-label="Block erledigt">${checked[i] ? '✓' : ''}</button>
      <div class="bmt-body"><b>${esc(b.title)}</b>${b.lines.map((l) => `<span>${esc(l)}</span>`).join('')}
        ${b.timer || b.footwork ? `<div class="row gap bmt-tools">
          ${b.footwork ? `<button class="btn small" data-act="bmt-footwork" data-min="${(b.timer?.work || 180) / 60}" data-rounds="${b.timer?.rounds || 1}">Footwork-Drill · ${b.timer ? `${b.timer.rounds}× ${fmtTime(b.timer.work)} min` : '3 min'}</button>`
            : `<button class="btn small" data-act="bmt-timer" data-rounds="${b.timer.rounds}" data-work="${b.timer.work}">Rundentimer · ${b.timer.rounds}× ${fmtTime(b.timer.work)} min</button>`}</div>` : ''}
      </div></div>`).join('');
  const meta = `${sel.sessions ? `${sel.sessions}× trainiert · zuletzt ${formatDay(sel.lastDay)}` : 'Noch nicht trainiert'}${sel.done ? ' · abgeschlossen' : ''}`;
  return header + sys(`Woche ${sel.number}${sel.title ? ` · ${esc(sel.title)}` : ''}`, `
    <p class="muted small">${meta}${sel.id === cur?.id ? ' · steht auf der Matte' : ''}</p>
    <div class="bmt-blocks">${list || '<p class="muted">Kein Inhalt.</p>'}</div>
    <button class="btn primary wide" data-act="bmt-log" data-id="${sel.id}">Einheit eintragen</button>
    <div class="row gap bmt-actions">
      <button class="btn small" data-act="bmt-done" data-id="${sel.id}">${sel.done ? 'Wieder öffnen' : 'Woche abschließen'}</button>
      ${sel.id !== cur?.id ? `<button class="btn small" data-act="bmt-current" data-id="${sel.id}">Als aktuell setzen</button>` : ''}
      <button class="btn small ghost" data-act="bmt-edit" data-id="${sel.id}">Bearbeiten</button>
    </div>`, { tone: sel.id === cur?.id ? 'gold' : 'sys' });
}

function manageView(c, bmt) {
  const progress = weekProgress(bmt, c.data.sessions);
  return `<button class="btn ghost back" data-act="bmt-back">← Plan</button>
    ${sys('Wochen verwalten', `${progress.length ? progress.map((w) => `<div class="done-row">
        <span><b>Woche ${w.number}</b>${w.title ? ` · ${esc(w.title)}` : ''}<br><small class="muted">${w.sessions}× trainiert${w.done ? ' · abgeschlossen' : ''}</small></span>
        <button class="btn small ghost" data-act="bmt-edit" data-id="${w.id}">Bearbeiten</button></div>`).join('')
      : '<p class="muted">Noch keine Woche eingetragen.</p>'}
      <button class="btn primary wide" data-act="bmt-new">Neue Woche hinzufügen</button>
      <p class="muted small">Wochen kannst du in beliebiger Reihenfolge nachtragen, auch vergangene. Sie werden nach Nummer sortiert.</p>`)}`;
}

function editView(c, bmt) {
  const e = c.ui.bmtEdit;
  const existing = bmt.weeks.find((w) => w.id === e.id);
  return `<button class="btn ghost back" data-act="bmt-back">← Abbrechen</button>
    ${sys(existing ? `Woche ${e.number} bearbeiten` : 'Neue Woche', `
      <div class="field"><span>Woche</span>${stepper('bmt-num', `${e.number}`, '')}</div>
      <input class="search" data-input="bmt-title" placeholder="Titel (optional, z. B. Clinch-Einstieg)" value="${esc(e.title || '')}" autocomplete="off">
      <div class="label" style="margin-top:12px">Plan</div>
      <textarea class="bmt-text" data-input="bmt-text" rows="14" placeholder="${esc(EXAMPLE)}">${esc(e.text || '')}</textarea>
      <p class="muted small">So schreiben, wie du es dir aus dem Kurs rausschreibst. Leerzeile = neuer Block, erste Zeile = Blocktitel. Zeitangaben wie „2 Runden 3 min“ oder „1x 3 min footwork“ bekommen automatisch einen Timer. Steht „Week 7“ in der ersten Zeile, wird die Nummer übernommen.</p>
      <button class="btn primary wide" data-act="bmt-save">Speichern</button>
      ${existing ? '<button class="btn ghost wide danger" data-act="bmt-delete">Woche löschen</button>' : ''}`)}`;
}

export function bmtView(c) {
  const bmt = c.data.bmt || emptyBmt();
  const view = c.ui.bmtView || 'plan';
  if (view === 'edit' && c.ui.bmtEdit) return editView(c, bmt);
  if (view === 'manage') return manageView(c, bmt);
  if (!bmt.weeks.length) {
    return sys(`${BMT_NAME} · ${BMT_PROGRAM}`, `<p>Trag die Wochen aus deinem Kurs ein. Hier steht dann, was auf der Matte dran ist, mit Timer pro Block und Fortschritt über alle Wochen.</p>
      <button class="btn primary wide" data-act="bmt-new">Erste Woche eintragen</button>`);
  }
  return planView(c, bmt);
}

const setBmt = (c, fn) => c.update((data) => ({ ...data, bmt: fn(data.bmt || emptyBmt()) }));

export const bmtActions = {
  'bmt-select': (c, d) => c.setUi({ bmtWeek: d.id }),
  'bmt-manage': (c) => c.setUi({ bmtView: 'manage' }),
  'bmt-back': (c) => c.setUi({ bmtView: 'plan', bmtEdit: null }),
  'bmt-tick': (c, d) => {
    const bmt = c.data.bmt || emptyBmt();
    const id = c.ui.bmtWeek || currentWeek(bmt)?.id;
    const all = { ...(c.ui.bmtChecked || {}) };
    all[id] = { ...(all[id] || {}), [d.i]: !all[id]?.[d.i] };
    c.setUi({ bmtChecked: all });
  },
  'bmt-new': (c) => c.setUi({ bmtView: 'edit', bmtEdit: { id: null, number: nextWeekNumber(c.data.bmt), title: '', text: '' } }),
  'bmt-edit': (c, d) => {
    const w = (c.data.bmt?.weeks || []).find((x) => x.id === d.id);
    if (w) c.setUi({ bmtView: 'edit', bmtEdit: { id: w.id, number: w.number, title: w.title, text: w.text } });
  },
  'bmt-num': (c, d) => { c.ui.bmtEdit.number = Math.max(1, Number(c.ui.bmtEdit.number) + Number(d.dir)); c.render(); },
  'bmt-save': (c) => {
    const e = c.ui.bmtEdit;
    try {
      const parsed = parseWeekText(e.text);
      const number = e.id ? e.number : (parsed.number && !(c.data.bmt?.weeks || []).some((w) => w.number === parsed.number) ? parsed.number : e.number);
      let savedId = null;
      setBmt(c, (b) => {
        const nb = saveWeek(b, { id: e.id, number, title: e.title, text: e.text });
        savedId = nb.weeks.find((w) => w.number === Number(number))?.id;
        return nb;
      });
      c.ui.bmtEdit = null;
      c.setUi({ bmtView: 'plan', bmtWeek: savedId });
    } catch (err) {
      c.system('Nicht gespeichert', `<p>${esc(err.message)}</p>`, undefined, 'warn');
    }
  },
  'bmt-delete': (c) => c.system('Woche löschen?', '<p>Der Plan dieser Woche wird gelöscht. Deine eingetragenen ARENA-Einheiten bleiben erhalten.</p>',
    [['bmt-delete-yes', 'Löschen', 'danger'], ['close-modal', 'Abbrechen', 'primary']], 'warn'),
  'bmt-delete-yes': (c) => {
    const id = c.ui.bmtEdit?.id;
    c.modal(null);
    setBmt(c, (b) => deleteWeek(b, id));
    c.ui.bmtEdit = null;
    c.setUi({ bmtView: 'plan', bmtWeek: null });
  },
  'bmt-done': (c, d) => setBmt(c, (b) => toggleDone(b, d.id)),
  'bmt-current': (c, d) => setBmt(c, (b) => setCurrent(b, d.id)),
};

export function bmtInput(c, name, value) {
  if (!c.ui.bmtEdit) return;
  if (name === 'bmt-title') c.ui.bmtEdit.title = value;
  if (name === 'bmt-text') c.ui.bmtEdit.text = value;
}
