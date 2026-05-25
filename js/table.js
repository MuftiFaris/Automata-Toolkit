// Transition Table

/**
 * Render a DFA transition table into a container element.
 *
 * @param {string}      containerId
 * @param {DFA}         dfa
 * @param {string|null} activeState — row to highlight
 */
function renderDFATable(containerId, dfa, activeState = null) {
  const { rows, syms } = dfa.getTable();
  const states = Object.keys(rows).sort(
    (a, b) => a === dfa.start ? -1 : b === dfa.start ? 1 : a.localeCompare(b)
  );

  let h = `<table class="trans-table"><thead><tr><th>State</th>`;
  for (const s of syms) h += `<th>δ(${s})</th>`;
  h += `</tr></thead><tbody>`;

  for (const s of states) {
    const isStart  = s === dfa.start;
    const isAccept = dfa.accept.has(s);
    const isActive = s === activeState;
    const cls = [
      isStart  ? 'start-row'  : '',
      isAccept ? 'accept-row' : '',
      isActive ? 'active-row' : ''
    ].filter(Boolean).join(' ');

    const prefix = (isStart ? '→ ' : '') + (isAccept ? '* ' : '');
    h += `<tr class="${cls}"><td>${prefix}${s}</td>`;
    for (const sym of syms) h += `<td>${rows[s][sym]}</td>`;
    h += `</tr>`;
  }

  h += `</tbody></table>`;
  document.getElementById(containerId).innerHTML = h;
}

/**
 * Render an NFA transition table (includes ε column).
 *
 * @param {string} containerId
 * @param {NFA}    nfa
 */
function renderNFATable(containerId, nfa) {
  const { rows, syms, states } = nfa.getTable();

  let h = `<table class="trans-table"><thead><tr><th>State</th>`;
  for (const s of syms) h += `<th>δ(${s})</th>`;
  h += `</tr></thead><tbody>`;

  for (const s of states) {
    const isStart  = s === nfa.start;
    const isAccept = nfa.accept.has(s);
    const cls = [
      isStart  ? 'start-row'  : '',
      isAccept ? 'accept-row' : ''
    ].filter(Boolean).join(' ');

    const prefix = (isStart ? '→ ' : '') + (isAccept ? '* ' : '');
    h += `<tr class="${cls}"><td>${prefix}${s}</td>`;
    for (const sym of syms) h += `<td>${rows[s][sym]}</td>`;
    h += `</tr>`;
  }

  h += `</tbody></table>`;
  document.getElementById(containerId).innerHTML = h;
}

// Simulation Trace

/**
 * Render DFA simulation trace as formatted HTML.
 *
 * @param {string}   containerId
 * @param {Object[]} trace
 * @param {boolean}  accepted
 * @param {string}   inputStr
 */
function renderDFATrace(containerId, trace, accepted, inputStr) {
  let h = `<div style="font-family:var(--font-mono);font-size:12px;line-height:2">`;

  for (const t of trace) {
    if (t.step === 0) {
      h += `<div>→ Start: <span style="color:var(--accent)">${t.state}</span></div>`;
    } else {
      const nextColor = t.next === 'DEAD' ? 'var(--red)' : 'var(--teal)';
      h += `<div class="trace-step">
        Step ${String(t.step).padStart(2)}: 
        <span style="color:var(--accent)">${t.state}</span>
        <span class="t-arrow"> ──[</span><span class="t-sym">${t.sym}</span><span class="t-arrow">]──▶ </span>
        <span style="color:${nextColor}">${t.next}</span>
      </div>`;
    }
  }

  h += `</div>`;
  h += _resultBadge(accepted, inputStr);

  document.getElementById(containerId).innerHTML = h;
}

/**
 * Render NFA simulation trace.
 *
 * @param {string}   containerId
 * @param {Object[]} trace
 * @param {boolean}  accepted
 * @param {string}   inputStr
 */
function renderNFATrace(containerId, trace, accepted, inputStr) {
  let h = `<div style="font-family:var(--font-mono);font-size:12px;line-height:2">`;

  for (const t of trace) {
    const stStr = '{' + [...t.states].sort().join(', ') + '}';
    if (t.step === 0) {
      h += `<div>→ Start closure: <span style="color:var(--accent)">${stStr}</span></div>`;
    } else {
      h += `<div class="trace-step">
        Step ${String(t.step).padStart(2)}: 
        <span class="t-arrow">[</span><span class="t-sym">${t.sym}</span><span class="t-arrow">]</span>
        → <span style="color:var(--teal)">${stStr}</span>
      </div>`;
    }
  }

  h += `</div>`;
  h += _resultBadge(accepted, inputStr);

  document.getElementById(containerId).innerHTML = h;
}

// Minimization Result

/**
 * Render the minimization result panel.
 *
 * @param {string} containerId
 * @param {Object} info — returned by minimizeDFAObj()
 * @param {DFA}    origDFA
 * @param {DFA}    minDFA
 */
function renderMinResult(containerId, info, origDFA, minDFA) {
  const { eqClasses, history, removed } = info;

  let h = `<div class="min-stats">`;

  h += _statCard('Sebelum', origDFA.states.size, 'var(--text)');
  h += _statCard('Sesudah', minDFA.states.size,  'var(--green)');
  h += _statCard('Dikurangi', removed, removed > 0 ? 'var(--yellow)' : 'var(--muted)');

  h += `</div>`;

  h += `<div class="section-label">Kelas Ekuivalen</div>`;
  for (const [cn, members] of Object.entries(eqClasses)) {
    const isAccept = members.some(s => origDFA.accept.has(s));
    const color    = isAccept ? 'var(--green)' : 'var(--text)';
    const tag      = isAccept ? ' <span style="color:var(--green);font-size:10px">✓ accept</span>' : '';
    h += `<div class="partition-block">
      <span class="partition-label">${cn}</span>
      <span style="color:${color}">{ ${members.join(', ')} }</span>${tag}
    </div>`;
  }

  h += `<div class="section-label" style="margin-top:14px">Riwayat Partisi (${history.length} iterasi)</div>`;
  for (let i = 0; i < history.length; i++) {
    const partStr = history[i]
      .map(p => '{' + [...p].filter(s => s !== '__dead__').join(', ') + '}')
      .join(' | ');
    h += `<div style="font-size:11px;font-family:var(--font-mono);color:var(--muted);margin-bottom:4px">
      <span style="color:var(--accent)">iter ${i}:</span> ${partStr}
    </div>`;
  }

  document.getElementById(containerId).innerHTML = h;
}

// Equivalence Result

/**
 * Render equivalence check result.
 *
 * @param {string} resultId  — result container
 * @param {string} tableId   — product table container
 * @param {Object} result    — returned by checkEquivObjs()
 * @param {Set}    alphabet
 */
function renderEquivResult(resultId, tableId, result, alphabet) {
  const { equivalent, witness, rows, distPair } = result;

  // ── Summary ──
  let h = equivalent
    ? `<div class="equiv-yes">✅ EKUIVALEN — Kedua DFA menerima bahasa yang sama.</div>`
    : `<div class="equiv-no">❌ TIDAK EKUIVALEN</div>
       <div class="witness-box">
         Witness string: <span style="color:var(--yellow);font-weight:700">"${witness}"</span><br>
         <span style="color:var(--muted);font-size:11px">
           String ini diterima salah satu DFA tapi tidak yang lain.
         </span>
       </div>`;

  if (distPair) {
    h += `<div style="font-size:12px;color:var(--muted);margin-top:8px">
      Pasangan pembeda:
      <span style="color:var(--red);font-family:var(--font-mono)">
        (${distPair[0]}, ${distPair[1]})
      </span>
    </div>`;
  }

  document.getElementById(resultId).innerHTML = h;

  // Product table
  const syms = [...alphabet].sort();

  let th = `<table class="trans-table product-table"><thead><tr>
    <th>(q₁, q₂)</th>`;
  for (const s of syms) th += `<th>δ(${s})</th>`;
  th += `<th>Status</th></tr></thead><tbody>`;

  for (const row of rows) {
    const isDist = distPair &&
      row.pair[0] === distPair[0] &&
      row.pair[1] === distPair[1];
    const isBothAcc = row.status.includes('both accept');
    const cls = isDist ? 'prod-dist' : isBothAcc ? 'prod-both-acc' : '';

    th += `<tr class="${cls}"><td>(${row.pair[0]}, ${row.pair[1]})</td>`;
    for (const s of syms) {
      const [n1, n2] = row.trans[s] || ['?', '?'];
      th += `<td>(${n1}, ${n2})</td>`;
    }
    th += `<td>${row.status}</td></tr>`;
  }

  th += `</tbody></table>`;
  document.getElementById(tableId).innerHTML = th;
}

// Private helpers

function _resultBadge(accepted, str) {
  const cls  = accepted ? 'result-accept' : 'result-reject';
  const text = accepted ? `✓ DITERIMA — "${str}"` : `✗ DITOLAK — "${str}"`;
  return `<div class="result-badge ${cls}">${text}</div>`;
}

function _statCard(label, value, color) {
  return `<div class="stat-card">
    <div class="stat-label">${label}</div>
    <div class="stat-value" style="color:${color}">${value}</div>
    <div style="font-size:11px;color:var(--muted)">states</div>
  </div>`;
}
