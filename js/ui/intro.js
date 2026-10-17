// Arc-Intro: 3–5 Panels zum Durchwischen. Wer der Boss ist, welche Schwäche er verkörpert, was der Arc trainiert.
import { introPanels } from '../engine/story.js';
import { comicPanels, bindPanels } from './lore.js';
import { arcOf } from '../data/arcs.js';

export default {
  render(c) {
    const n = c.data.engine.arc?.n ?? 0;
    const arc = arcOf(n);
    return `<p class="intro-kicker">Das System meldet</p>
      <h1 class="h">ARC ${arc.id} · ${arc.name}</h1>
      ${comicPanels(introPanels(c.data, n), 'intro-panels')}
      <p class="muted small center">Wischen für das nächste Panel.</p>
      <button class="btn primary wide" data-act="intro-done">Arc beginnen</button>`;
  },
  mount(c, root) {
    bindPanels(root);
  },
  actions: {
    'intro-done': (c) => {
      const n = c.data.engine.arc?.n ?? 0;
      c.update((data) => ({ ...data, engine: { ...data.engine, introSeen: { ...(data.engine.introSeen || {}), [n]: c.today() } } }));
      c.go('heute');
    },
  },
};
