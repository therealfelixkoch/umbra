// Systemstimme für den Footwork-Drill: Englisch, tief, mechanisch.
// Bevorzugt die Roboter-Stimmen, die iOS und macOS mitbringen (Zarvox, Trinoids, Fred …).
const ROBOTS = ['Zarvox', 'Trinoids', 'Fred', 'Ralph', 'Albert'];
let voice = null;

function pickVoice() {
  if (!('speechSynthesis' in window)) return null;
  const all = speechSynthesis.getVoices().filter((v) => v.lang?.startsWith('en'));
  for (const name of ROBOTS) {
    const v = all.find((x) => x.name.includes(name));
    if (v) return v;
  }
  return all.find((v) => v.lang === 'en-US') || all[0] || null;
}

if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = () => { voice = pickVoice(); };
}

export const canSpeak = () => 'speechSynthesis' in window;

export function speak(text) {
  if (!canSpeak()) return;
  voice ||= pickVoice();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  if (voice) u.voice = voice;
  const novelty = voice && ROBOTS.slice(0, 2).some((n) => voice.name.includes(n));
  u.pitch = novelty ? 0.8 : 0.1; // ohne Roboterstimme: so tief wie möglich
  u.rate = 1.1;
  u.volume = 1;
  speechSynthesis.cancel(); // altes Kommando abbrechen, das neue zählt
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (canSpeak()) speechSynthesis.cancel();
}

export const voiceName = () => (voice ||= pickVoice())?.name || 'Standard';
