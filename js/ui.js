// Tab switching

/**
 * Show the selected tab panel and update active button.
 *
 * @param {string}      name   — tab name: 'dfa' | 'regex' | 'min' | 'equiv'
 * @param {HTMLElement} btnEl  — the clicked button element
 */
function showTab(name, btnEl) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  document.getElementById('tab-' + name).classList.add('active');
  btnEl.classList.add('active');

  // Redraw graphs after DOM reflow
  setTimeout(() => _redrawOnTabSwitch(name), 60);
}

function _redrawOnTabSwitch(name) {
  if (name === 'dfa' && window._currentDFA) {
    drawDFAGraph('dfa-svg', window._currentDFA, window._currentDFA.start);
  }
  if (name === 'regex' && window._currentNFA) {
    drawNFAGraph('nfa-svg', window._currentNFA);
  }
}

// Form parsing helpers

/** Split a whitespace-separated string into tokens */
function parseList(str) {
  return str.trim().split(/\s+/).filter(Boolean);
}

/**
 * Parse multi-line transition text into a flat trans map.
 * Format per line: "fromState symbol toState"
 *
 * @param  {string} text
 * @returns {{ trans: Object, errors: string[] }}
 */
function parseTransitions(text) {
  const trans  = {};
  const errors = [];

  const lines = text.trim().split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line  = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    const parts = line.split(/\s+/);
    if (parts.length !== 3) {
      errors.push(`Baris ${i + 1}: format salah — "${line}" (harus: from sym to)`);
      continue;
    }
    const [from, sym, to] = parts;
    const key = from + ',' + sym;

    if (key in trans) {
      errors.push(`Baris ${i + 1}: duplikat transisi (${from}, ${sym}) — DFA harus deterministik.`);
      continue;
    }
    trans[key] = to;
  }

  return { trans, errors };
}

/**
 * Build a DFA from form fields using a common field prefix.
 *
 * @param  {string} pfx — e.g. 'd' reads #d-states, #d-alpha, etc.
 * @returns {{ dfa: DFA|null, errors: string[] }}
 */
function buildDFAFromForm(pfx) {
  const states  = parseList(document.getElementById(pfx + '-states').value);
  const alpha   = parseList(document.getElementById(pfx + '-alpha').value);
  const start   = document.getElementById(pfx + '-start').value.trim();
  const accept  = parseList(document.getElementById(pfx + '-accept').value);
  const rawTrans = document.getElementById(pfx + '-trans').value;

  const errors = [];

  if (!states.length)  errors.push('States tidak boleh kosong.');
  if (!alpha.length)   errors.push('Alphabet tidak boleh kosong.');
  if (!start)          errors.push('Start state tidak boleh kosong.');
  if (!states.includes(start) && start) errors.push(`Start state "${start}" tidak ada dalam states.`);

  for (const s of accept) {
    if (!states.includes(s)) errors.push(`Accept state "${s}" tidak ada dalam states.`);
  }

  const { trans, errors: transErrors } = parseTransitions(rawTrans);
  errors.push(...transErrors);

  if (errors.length) return { dfa: null, errors };

  const stateSet  = new Set(states);
  const alphaSet  = new Set(alpha);
  const transErrors2 = [];

  for (const key of Object.keys(trans)) {
    const [from, sym] = key.split(',');
    if (!stateSet.has(from))  transErrors2.push(`Transition: state "${from}" tidak ada dalam states.`);
    if (!alphaSet.has(sym))   transErrors2.push(`Transition: simbol "${sym}" tidak ada dalam alphabet.`);
    if (!stateSet.has(trans[key])) transErrors2.push(`Transition: target "${trans[key]}" tidak ada dalam states.`);
  }

  if (transErrors2.length) return { dfa: null, errors: transErrors2 };

  return {
    dfa: new DFA(states, alpha, start, accept, trans),
    errors: []
  };
}

// Error display

/**
 * Show error messages inside a container element.
 *
 * @param {string}   containerId
 * @param {string[]} errors
 */
function showErrors(containerId, errors) {
  const html = errors.map(e =>
    `<div style="color:var(--red);font-size:12px;margin-bottom:4px">⚠ ${e}</div>`
  ).join('');
  document.getElementById(containerId).innerHTML = html;
}

/**
 * Show a success message inside a container element.
 *
 * @param {string} containerId
 * @param {string} msg
 */
function showSuccess(containerId, msg) {
  document.getElementById(containerId).innerHTML =
    `<span style="color:var(--green);font-size:12px">✓ ${msg}</span>`;
}

// Info rows helper

/**
 * Build a set of info-row divs for NFA/DFA summary.
 *
 * @param {Object} items — { label: value }
 * @returns {string} HTML string
 */
function buildInfoRows(items) {
  return Object.entries(items).map(([k, v]) =>
    `<div class="info-row">
      <span class="info-key">${k}</span>
      <span class="info-val">${v}</span>
    </div>`
  ).join('');
}
