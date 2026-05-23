// Global State
window._currentDFA  = null;   // Tab 1
window._currentNFA  = null;   // Tab 2
window._simTrace    = [];
window._simStep     = -1;
window._simInterval = null;

// TAB 1 — DFA SIMULATOR

function buildDFA() {
  const { dfa, errors } = buildDFAFromForm('d');

  if (errors.length) {
    showErrors('d-result', errors);
    return;
  }

  window._currentDFA = dfa;
  resetSim();

  setTimeout(() => {
    drawDFAGraph('dfa-svg', dfa, dfa.start);
    renderDFATable('dfa-table-wrap', dfa);
  }, 30);

  showSuccess('d-result', `DFA berhasil dibuat — ${dfa.states.size} states, ${dfa.alphabet.size} simbol.`);
}

// Simulation

function resetSim() {
  if (window._simInterval) {
    clearInterval(window._simInterval);
    window._simInterval = null;
  }
  window._simTrace = [];
  window._simStep  = -1;

  document.getElementById('d-step-ind').textContent = '—';
  document.getElementById('d-sim-display').style.display = 'none';
  document.getElementById('d-result').textContent = '';

  if (window._currentDFA) {
    setTimeout(() => drawDFAGraph('dfa-svg', window._currentDFA, window._currentDFA.start), 30);
  }
}

function simInstant() {
  if (!window._currentDFA) { showErrors('d-result', ['Build DFA terlebih dahulu.']); return; }
  resetSim();

  const str = document.getElementById('d-teststr').value;
  const { accepted, trace, final } = window._currentDFA.simulate(str);

  renderDFATrace('d-result', trace, accepted, str);
  drawDFAGraph('dfa-svg', window._currentDFA, final || null);
  renderDFATable('dfa-table-wrap', window._currentDFA, final || null);
}

function startSimAnim() {
  if (!window._currentDFA) { showErrors('d-result', ['Build DFA terlebih dahulu.']); return; }
  if (window._simInterval) clearInterval(window._simInterval);

  const str = document.getElementById('d-teststr').value;
  const { accepted, trace } = window._currentDFA.simulate(str);

  window._simTrace = trace;
  window._simStep  = 0;

  // Setup character display
  const disp = document.getElementById('d-sim-display');
  disp.style.display = 'block';
  disp.innerHTML = str.length
    ? str.split('').map((c, i) => `<span class="sim-char" id="sc-${i}">${c}</span>`).join('')
    : '<span style="color:var(--muted)">(empty)</span>';

  document.getElementById('d-result').innerHTML = '';
  _runSimStep(str, accepted);

  window._simInterval = setInterval(() => {
    window._simStep++;
    if (window._simStep >= window._simTrace.length) {
      clearInterval(window._simInterval);
      window._simInterval = null;
      return;
    }
    _runSimStep(str, accepted);
  }, 700);
}

function stepSim() {
  if (!window._currentDFA) { showErrors('d-result', ['Build DFA terlebih dahulu.']); return; }
  if (window._simInterval) { clearInterval(window._simInterval); window._simInterval = null; }

  const str = document.getElementById('d-teststr').value;

  // Initialise trace on first step call
  if (!window._simTrace.length) {
    const { accepted, trace } = window._currentDFA.simulate(str);
    window._simTrace = trace;
    window._simStep  = 0;

    const disp = document.getElementById('d-sim-display');
    disp.style.display = 'block';
    disp.innerHTML = str.length
      ? str.split('').map((c, i) => `<span class="sim-char" id="sc-${i}">${c}</span>`).join('')
      : '<span style="color:var(--muted)">(empty)</span>';
    document.getElementById('d-result').innerHTML = '';
  } else {
    window._simStep++;
    if (window._simStep >= window._simTrace.length) {
      window._simStep = window._simTrace.length - 1;
      return;
    }
  }

  const accepted = window._simTrace[window._simTrace.length - 1]?.next !== 'DEAD' &&
    window._currentDFA.accept.has(window._simTrace[window._simTrace.length - 1]?.next);

  _runSimStep(str, accepted);
}

function _runSimStep(str, accepted) {
  const trace = window._simTrace;
  const step  = window._simStep;
  if (step >= trace.length) return;

  const t = trace[step];
  document.getElementById('d-step-ind').textContent = `Step ${t.step} / ${trace.length - 1}`;

  // Highlight current character
  str.split('').forEach((_, i) => {
    const el = document.getElementById('sc-' + i);
    if (!el) return;
    el.className = 'sim-char' + (i < t.step ? ' done' : i === t.step - 1 ? ' current' : '');
  });

  // Update graph
  if (t.step > 0) {
    const prev      = trace[t.step - 1];
    const curState  = t.next !== 'DEAD' ? t.next : null;
    drawDFAGraph('dfa-svg', window._currentDFA, curState, [prev.state, t.next]);
    renderDFATable('dfa-table-wrap', window._currentDFA, curState);
  } else {
    drawDFAGraph('dfa-svg', window._currentDFA, window._currentDFA.start);
  }

  // Show final result badge on last step
  if (step === trace.length - 1) {
    const resultEl  = document.getElementById('d-result');
    const cls       = accepted ? 'result-accept' : 'result-reject';
    const text      = accepted ? `✓ DITERIMA — "${str}"` : `✗ DITOLAK — "${str}"`;
    resultEl.innerHTML += `<div class="result-badge ${cls}">${text}</div>`;
  }
}

// Example presets

function loadExample(name) {
  if (name === 'nonconsec') {
    document.getElementById('d-states').value  = 'A B C';
    document.getElementById('d-alpha').value   = '0 1';
    document.getElementById('d-start').value   = 'A';
    document.getElementById('d-accept').value  = 'A B';
    document.getElementById('d-trans').value   =
      'A 0 A\nA 1 B\nB 0 A\nB 1 C\nC 0 C\nC 1 C';
    buildDFA();
  }
}

// TAB 2 — REGEX → NFA

function setRegex(rx) {
  document.getElementById('r-regex').value = rx;
  buildNFAfromRegex();
}

function buildNFAfromRegex() {
  const rx = document.getElementById('r-regex').value.trim();
  const { valid, error } = validateRegex(rx);

  if (!valid) {
    showErrors('r-result', [error]);
    return;
  }

  window._currentNFA = regexToNFA(rx);
  const nfa = window._currentNFA;

  setTimeout(() => {
    drawNFAGraph('nfa-svg', nfa);
    renderNFATable('nfa-table-wrap', nfa);
  }, 30);

  document.getElementById('r-graph-title').textContent =
    `Graf NFA — "${rx}" (Thompson's Construction)`;

  // Info panel
  document.getElementById('r-info').innerHTML = buildInfoRows({
    'Regex'    : rx,
    'States'   : nfa.states.size,
    'Alphabet' : '{' + [...nfa.alphabet].sort().join(', ') + '}',
    'Start'    : nfa.start,
    'Accept'   : [...nfa.accept].join(', ')
  });
  document.getElementById('r-info-card').style.display = 'block';

  showSuccess('r-result', `NFA dibangun — ${nfa.states.size} states.`);
}

function testNFA() {
  if (!window._currentNFA) { showErrors('r-result', ['Build NFA terlebih dahulu.']); return; }

  const str = document.getElementById('r-teststr').value;
  const { accepted, trace } = window._currentNFA.simulate(str);
  renderNFATrace('r-result', trace, accepted, str);
}

function convertNFAtoDFA() {
  if (!window._currentNFA) { showErrors('r-result', ['Build NFA terlebih dahulu.']); return; }

  const dfa = window._currentNFA.toDFA();

  setTimeout(() => {
    drawDFAGraph('nfa-svg', dfa, dfa.start);
    renderDFATable('nfa-table-wrap', dfa);
  }, 30);

  document.getElementById('r-graph-title').textContent =
    'Graf DFA — hasil Subset Construction';

  showSuccess('r-result', `Konversi selesai — DFA: ${dfa.states.size} states.`);
}

// TAB 3 — DFA MINIMIZER

function minimizeDFA() {
  const { dfa, errors } = buildDFAFromForm('m');

  if (errors.length) {
    showErrors('min-result', errors);
    return;
  }

  const { minDFA, eqClasses, stateToClass, history, removed } = minimizeDFAObj(dfa);

  setTimeout(() => {
    drawDFAGraph('min-orig-svg', dfa);
    drawDFAGraph('min-new-svg', minDFA);
  }, 30);

  renderMinResult('min-result', { eqClasses, history, removed }, dfa, minDFA);
}

// TAB 4 — EQUIVALENCE CHECKER

function checkEquivalence() {
  const { dfa: dfa1, errors: e1 } = buildDFAFromForm('e1');
  if (e1.length) { showErrors('equiv-result', e1); return; }

  const { dfa: dfa2, errors: e2 } = buildDFAFromForm('e2');
  if (e2.length) { showErrors('equiv-result', e2); return; }

  const result   = checkEquivObjs(dfa1, dfa2);
  const alphabet = new Set([...dfa1.alphabet, ...dfa2.alphabet]);

  setTimeout(() => {
    drawDFAGraph('eq1-svg', dfa1);
    drawDFAGraph('eq2-svg', dfa2);
  }, 30);

  renderEquivResult('equiv-result', 'product-table-wrap', result, alphabet);
}

// INIT

window.addEventListener('load', () => {
  buildDFA();
});

window.addEventListener('resize', () => {
  if (window._currentDFA) drawDFAGraph('dfa-svg', window._currentDFA, window._currentDFA.start);
  if (window._currentNFA) drawNFAGraph('nfa-svg', window._currentNFA);
});
