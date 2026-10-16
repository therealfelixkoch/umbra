// Mini-Testrunner für den Browser, ohne Abhängigkeiten.
const results = [];
let current = '';

export function describe(name, fn) {
  current = name;
  fn();
  current = '';
}

export function it(name, fn) {
  try {
    fn();
    results.push({ name: `${current} › ${name}`, ok: true });
  } catch (e) {
    results.push({ name: `${current} › ${name}`, ok: false, error: e.message });
  }
}

const fmt = (v) => JSON.stringify(v);

export function expect(actual) {
  return {
    toBe(exp) {
      if (actual !== exp) throw new Error(`erwartet ${fmt(exp)}, erhalten ${fmt(actual)}`);
    },
    toEqual(exp) {
      if (fmt(actual) !== fmt(exp)) throw new Error(`erwartet ${fmt(exp)}, erhalten ${fmt(actual)}`);
    },
    toBeTruthy() {
      if (!actual) throw new Error(`erwartet truthy, erhalten ${fmt(actual)}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`erwartet falsy, erhalten ${fmt(actual)}`);
    },
    toContain(x) {
      if (!actual.includes(x)) throw new Error(`${fmt(actual)} enthält nicht ${fmt(x)}`);
    },
  };
}

export function report(el) {
  const failed = results.filter((r) => !r.ok);
  el.innerHTML = `<h1 id="summary" data-failed="${failed.length}">${results.length - failed.length}/${results.length} grün</h1>` +
    results.map((r) => `<div class="${r.ok ? 'ok' : 'fail'}">${r.ok ? '✓' : '✗'} ${r.name}${r.ok ? '' : ` — ${r.error}`}</div>`).join('');
  return { total: results.length, failed: failed.length, failures: failed };
}
