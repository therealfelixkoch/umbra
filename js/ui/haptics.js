// Vibration: nur wo die Vibration API existiert (Android). Auf dem iPhone gibt es sie nicht,
// dort übernehmen Ton und das violette Bildschirm-Signal (sound.js → signal/pulse).
let enabled = true;

export function setHaptics(on) {
  enabled = on;
}

export function haptic(pattern = 25) {
  if (enabled && navigator.vibrate) navigator.vibrate(pattern);
}
