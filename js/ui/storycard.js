// Story-Karten zum Teilen (9:16, 1080 × 1920): Wächter-Silhouette, Rang, Zahlen der Einheit, Saison, Säulen, Tageszitat.
// Gezeichnet auf einem Canvas, geteilt über das Teilen-Menü (iPhone) bzw. als Download.
import { playerStats, rankName } from '../engine/game.js';
import { arcOf } from '../data/arcs.js';
import { guardianName } from '../data/lore.js';
import { quoteOfDay } from '../engine/story.js';
import { pillars } from '../engine/pillars.js';
import { getDef } from '../data/exercises.js';

let current = null;

/** Inhalt der nächsten Karte merken (kicker, title, stats: [[Wert, Label]], date). */
export function setStory(info) { current = info; }

const W = 1080;
const H = 1920;

function wrap(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
  return lines.length;
}

async function draw(data, today, info) {
  try { await document.fonts.load('800 80px Oxanium'); await document.fonts.load('600 30px Oxanium'); } catch { /* Systemschrift */ }
  const acc = getComputedStyle(document.body).getPropertyValue('--sys').trim() || '#8b7dff';
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  // Hintergrund
  g.fillStyle = '#04050a';
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, 640, 40, W / 2, 640, 900);
  glow.addColorStop(0, `${acc}55`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  // Kopf
  g.fillStyle = '#e9edf8';
  g.font = '800 44px Oxanium, sans-serif';
  g.textAlign = 'left';
  g.fillText('U M B R A', 90, 150);
  g.textAlign = 'right';
  g.fillStyle = acc;
  g.font = '600 30px Oxanium, sans-serif';
  g.fillText(info.date || today.split('-').reverse().join('.'), W - 90, 150);
  // Ringe und Wächter
  g.strokeStyle = acc;
  g.globalAlpha = 0.35;
  g.lineWidth = 2;
  g.beginPath(); g.arc(W / 2, 640, 300, 0, Math.PI * 2); g.stroke();
  g.globalAlpha = 1;
  g.save();
  g.translate(W / 2 - 165, 330);
  g.scale(2.75, 2.75);
  g.shadowColor = acc;
  g.shadowBlur = 40;
  g.fillStyle = '#0a0c14';
  g.strokeStyle = acc;
  g.lineWidth = 1.2;
  const head = new Path2D('M60 14c10 0 17 8 17 18s-7 19-17 19-17-9-17-19 7-18 17-18z');
  const body = new Path2D('M28 214c2-40 6-80 12-110 4-22 10-36 20-40 10 4 16 18 20 40 6 30 10 70 12 110z');
  g.fill(body); g.stroke(body); g.fill(head); g.stroke(head);
  g.shadowBlur = 0;
  g.fillStyle = acc;
  g.beginPath(); g.arc(54, 32, 2, 0, Math.PI * 2); g.arc(66, 32, 2, 0, Math.PI * 2); g.fill();
  g.restore();
  // Titel
  const st = playerStats(data, today);
  const arc = data.engine.arc;
  g.textAlign = 'center';
  g.fillStyle = acc;
  g.font = '600 32px Oxanium, sans-serif';
  g.fillText((info.kicker || 'MISSION ABGESCHLOSSEN').split('').join(' '), W / 2, 1080);
  g.fillStyle = '#ffffff';
  g.font = '800 104px Oxanium, sans-serif';
  g.fillText(info.title || '', W / 2, 1200);
  g.fillStyle = '#9aa3b8';
  g.font = '400 34px -apple-system, system-ui, sans-serif';
  const season = arc && arc.n >= 0 ? `${arcOf(arc.n).name} · Woche ${arc.week}/13 · ${guardianName(arc.n)}` : '';
  g.fillText(`${rankName(st.rank)}${season ? ` · ${season}` : ''}`, W / 2, 1264);
  // Zahlen
  const stats = (info.stats || []).slice(0, 3);
  const bw = 270;
  const gap = 30;
  const x0 = (W - (stats.length * bw + (stats.length - 1) * gap)) / 2;
  stats.forEach(([v, l], i) => {
    const x = x0 + i * (bw + gap);
    g.fillStyle = 'rgba(255,255,255,0.05)';
    g.strokeStyle = i === stats.length - 1 ? acc : 'rgba(190,205,255,0.2)';
    g.lineWidth = 2;
    g.beginPath(); g.roundRect(x, 1330, bw, 170, 32); g.fill(); g.stroke();
    g.fillStyle = i === stats.length - 1 ? acc : '#ffffff';
    g.font = '800 72px Oxanium, sans-serif';
    g.fillText(String(v), x + bw / 2, 1425);
    g.fillStyle = '#8b93a7';
    g.font = '600 24px Oxanium, sans-serif';
    g.fillText(String(l).toUpperCase(), x + bw / 2, 1468);
  });
  // Säulen
  if (arc && arc.n >= 0) {
    const p = pillars(data, arc.n, getDef);
    const marks = [['B', p.benchmark.passed, !!p.benchmark.baseline], ['I', p.index.passed, p.index.ratio != null && p.index.ratio >= 0.6], ['K', p.chapters.passed, arc.week > 6]];
    g.font = '700 30px Oxanium, sans-serif';
    marks.forEach(([t, done, half], i) => {
      const x = W / 2 - 75 + i * 75 - 26;
      g.lineWidth = 2;
      g.strokeStyle = done || half ? acc : 'rgba(190,205,255,0.3)';
      g.fillStyle = done ? acc : 'rgba(0,0,0,0)';
      g.beginPath(); g.roundRect(x, 1540, 52, 52, 12); g.fill(); g.stroke();
      g.fillStyle = done ? '#05060a' : half ? acc : '#7e879c';
      g.fillText(t, x + 26, 1577);
    });
  }
  // Zitat
  const q = quoteOfDay(data.settings, today);
  if (q) {
    g.fillStyle = '#dfe5f5';
    g.font = 'italic 38px -apple-system, system-ui, sans-serif';
    const n = wrap(g, `„${q.text}“`, W / 2, 1690, 860, 50);
    g.fillStyle = '#8b93a7';
    g.font = '400 26px -apple-system, system-ui, sans-serif';
    g.fillText(`${q.person} · ${q.source}`.slice(0, 70), W / 2, 1690 + n * 50 + 20);
  }
  return c;
}

/** Karte erzeugen und teilen (iPhone: Teilen-Menü, sonst Download). */
export async function shareStory(ctx) {
  if (!current) return;
  const canvas = await draw(ctx.data, ctx.today(), current);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return;
  const file = new File([blob], `umbra-${ctx.today()}.png`, { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'UMBRA' }); return; }
  } catch { /* abgebrochen */ return; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export const storyActions = { "story-share": (c) => shareStory(c) };
export { draw as drawStory };
