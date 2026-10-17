// Erster Start: Equipment, KB-Gewichte, Startwerte.
import { sys, stepper, esc } from './kit.js';
import { EQUIPMENT } from '../data/exercises.js';

export const ROOM_EQUIPMENT = ['bag', 'bar', 'dipbars', 'box', 'kb', 'rope', 'harness', 'belt', 'band', 'rings', 'sandbag', 'abwheel'];
export const GYM_EQUIPMENT = ['barbell', 'rack', 'dumbbells', 'cable', 'rower', 'bar', 'dipbars', 'bench', 'kb', 'band'];
export const KB_OPTIONS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 44, 48];
const START_KEYS = [['pullups', 'Max. Klimmzüge'], ['dips', 'Max. Dips'], ['pushups', 'Max. Liegestütze']];

export function equipmentToggles(list, owned, profile) {
  return `<div class="toggles">${list.map((id) =>
    `<button class="toggle${owned.includes(id) ? ' on' : ''}" data-act="toggle-eq" data-id="${id}" data-profile="${profile}">${esc(EQUIPMENT[id])}</button>`).join('')}</div>`;
}

export function kbGrid(weights) {
  return `<div class="kbgrid">${KB_OPTIONS.map((w) =>
    `<button class="kb${weights.includes(w) ? ' on' : ''}" data-act="toggle-kb" data-w="${w}">${w}</button>`).join('')}</div>`;
}

export function toggleIn(list, v) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v].sort((a, b) => (a > b ? 1 : -1));
}

const draft = (c) => c.ui.obDraft || (c.ui.obDraft = structuredClone(c.data.settings));

export default {
  render(c) {
    const step = c.ui.obStep || 0;
    const d = draft(c);
    const dots = `<div class="ob-dots">${[0, 1, 2, 3].map((i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>`;
    if (step === 0) {
      return `<div class="ob-hero"><div class="logo">UMBRA</div><p class="tagline">Werde unzerbrechlich.</p></div>
        ${sys('System initialisiert', `<p>Willkommen, Wächter. Ich plane dein Training, merke mir jeden Satz und steigere dich automatisch. Du öffnest die App, tippst vier Antworten an und führst aus.</p>
        <p class="muted">Alle Daten bleiben auf diesem Gerät.</p>`)}
        ${dots}<button class="btn primary wide" data-act="ob-next">Einrichten</button>`;
    }
    if (step === 1) {
      return `<h1 class="h">Ausrüstung</h1>${dots}
        <p class="muted">Eigener Raum: Was ist vorhanden? Fehlt etwas, nimmt die App automatisch eine Alternative.</p>
        ${equipmentToggles(ROOM_EQUIPMENT, d.equipment.room, 'room')}
        <h2 class="h2">Home Gym</h2>
        ${equipmentToggles(GYM_EQUIPMENT, d.equipment.gym, 'gym')}
        <div class="row gap sticky-bottom"><button class="btn" data-act="ob-back">Zurück</button><button class="btn primary grow" data-act="ob-next">Weiter</button></div>`;
    }
    if (step === 2) {
      return `<h1 class="h">Kettlebells</h1>${dots}
        <p class="muted">Tippe alle Gewichte an, die deine verstellbaren Kettlebells können (kg). Das lässt sich später im Profil ändern.</p>
        ${kbGrid(d.kbWeights)}
        <div class="row gap"><button class="btn small" data-act="kb-preset" data-p="4">8–32 in 4er-Schritten</button><button class="btn small" data-act="kb-preset" data-p="2">8–24 in 2er-Schritten</button></div>
        <h2 class="h2">Körpergewicht</h2>
        ${stepper('ob-bw', `${d.bodyweight}`, 'kg')}
        <div class="row gap sticky-bottom"><button class="btn" data-act="ob-back">Zurück</button><button class="btn primary grow" data-act="ob-next" ${d.kbWeights.length ? '' : 'disabled'}>Weiter</button></div>`;
    }
    return `<h1 class="h">Startwerte</h1>${dots}
      <p class="muted">Grob reicht. Unbekannt? Überspringen – die erste Woche startet konservativ und lernt aus deinem Log.</p>
      ${START_KEYS.map(([k, label]) => `<div class="field"><label>${label}</label>${stepper('ob-start', d.startValues[k] ?? '–', 'Wdh.', { idx: k })}</div>`).join('')}
      <div class="row gap sticky-bottom"><button class="btn" data-act="ob-finish" data-skip="1">Überspringen</button><button class="btn primary grow" data-act="ob-finish">Beginnen</button></div>`;
  },
  actions: {
    'ob-next': (c) => c.setUi({ obStep: (c.ui.obStep || 0) + 1 }),
    'ob-back': (c) => c.setUi({ obStep: Math.max(0, (c.ui.obStep || 0) - 1) }),
    'toggle-eq': (c, d) => {
      const s = draft(c);
      s.equipment[d.profile] = toggleIn(s.equipment[d.profile], d.id);
      c.render();
    },
    'toggle-kb': (c, d) => {
      const s = draft(c);
      s.kbWeights = toggleIn(s.kbWeights, Number(d.w));
      c.render();
    },
    'kb-preset': (c, d) => {
      const step = Number(d.p);
      const max = step === 4 ? 32 : 24;
      draft(c).kbWeights = KB_OPTIONS.filter((w) => w >= 8 && w <= max && (w - 8) % step === 0);
      c.render();
    },
    'ob-bw': (c, d) => {
      const s = draft(c);
      s.bodyweight = Math.max(40, Math.min(160, s.bodyweight + Number(d.dir)));
      c.render();
    },
    'ob-start': (c, d) => {
      const s = draft(c);
      const cur = s.startValues[d.idx];
      const base = cur ?? ({ pullups: 8, dips: 12, pushups: 25 }[d.idx]);
      s.startValues = { ...s.startValues, [d.idx]: Math.max(0, cur == null ? base : base + Number(d.dir)) };
      c.render();
    },
    'ob-finish': (c, d) => {
      const s = draft(c);
      const settings = { ...s, onboarded: true, startValues: d.skip ? {} : s.startValues };
      c.ui.obDraft = null;
      c.ui.obStep = 0;
      c.update((data) => ({ ...data, settings }));
      c.go('heute');
      c.system('Rang zugewiesen: E', '<p>Jeder fängt hier an. Jede Einheit zählt, auch 15 Minuten.</p>');
    },
  },
};
