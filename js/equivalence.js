/**
 * Check whether two DFAs accept the same language.
 *
 * @param {DFA} dfa1
 * @param {DFA} dfa2
 * @returns {{
 *   equivalent  : boolean,
 *   witness     : string|null,
 *   rows        : Object[],
 *   distPair    : [string, string]|null
 * }}
 */
function checkEquivObjs(dfa1, dfa2) {
  const d1     = dfa1.addDeadState();
  const d2     = dfa2.addDeadState();
  const alpha  = new Set([...d1.alphabet, ...d2.alphabet]);

  const start  = [d1.start, d2.start];
  const pairKey = (s1, s2) => s1 + '||' + s2;

  // BFS on product automaton
  const visited  = new Map();   // pairKey -> parent pairKey | null
  const pathSym  = {};          // pairKey -> symbol that led here
  const queue    = [start];
  visited.set(pairKey(...start), null);

  let distPair = null;
  const rows   = [];

  while (queue.length) {
    const [s1, s2] = queue.shift();
    const in1 = d1.accept.has(s1);
    const in2 = d2.accept.has(s2);

    // Determine row status
    let status;
    if       ( in1 &&  in2) status = '✓ both accept';
    else if  (!in1 && !in2) status = '✗ both reject';
    else if  ( in1 && !in2) {
      status = '⚡ only DFA1 accepts';
      if (!distPair) distPair = [s1, s2];
    } else {
      status = '⚡ only DFA2 accepts';
      if (!distPair) distPair = [s1, s2];
    }

    const rowTrans = {};
    for (const sym of [...alpha].sort()) {
      const n1 = d1.step(s1, sym) || '∅';
      const n2 = d2.step(s2, sym) || '∅';
      rowTrans[sym] = [n1, n2];

      const pk = pairKey(n1, n2);
      if (!visited.has(pk)) {
        visited.set(pk, pairKey(s1, s2));
        pathSym[pk] = sym;
        queue.push([n1, n2]);
      }
    }

    rows.push({ pair: [s1, s2], trans: rowTrans, status });
  }

  // Reconstruct witness string by tracing back through parent map
  let witness = null;
  if (distPair) {
    const parts = [];
    let cur     = pairKey(...distPair);
    const startKey = pairKey(...start);

    while (cur !== startKey) {
      parts.unshift(pathSym[cur]);
      cur = visited.get(cur);
    }
    witness = parts.join('') || 'ε';
  }

  return { equivalent: !distPair, witness, rows, distPair };
}
