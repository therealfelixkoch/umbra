// Vibration. Android/Chrome: Vibration API. iPhone: Safari kennt keine Vibration API.
// Ab iOS 18 erzeugt ein Schalter-Element (<input type="checkbox" switch>) beim Umschalten ein haptisches Klicken.
// Das funktioniert nur direkt in einem Tap (Satz erledigt, Rang-Aufstieg), nicht zeitgesteuert (Pausenende).
let enabled = true;
let toggle = null;

export function setHaptics(on) {
  enabled = on;
}

export function haptic(pattern = 25) {
  if (!enabled) return;
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
    return;
  }
  try {
    if (!toggle) {
      toggle = document.createElement('label');
      toggle.setAttribute('aria-hidden', 'true');
      toggle.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.tabIndex = -1;
      toggle.appendChild(input);
      document.body.appendChild(toggle);
    }
    toggle.click();
  } catch { /* kein haptisches Feedback verfügbar */ }
}
