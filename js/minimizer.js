/**
 * js/minimizer.js
 * DFA Minimization — Partition Refinement (Hopcroft's Algorithm)
 * Anggota C
 */

/**
 * Minimize a DFA using partition refinement.
 *
 * @param {DFA} dfa
 * @returns {{
 *   minDFA      : DFA,
 *   eqClasses   : Object,   // { 'M0': [states], ... }
 *   stateToClass: Object,   // { originalState: 'M0', ... }
 *   history     : Array,    // partition at each iteration
 *   removed     : number    // states removed
 * }}
 */
function minimizeDFAObj(dfa) {
  const complete = dfa.addDeadState();
  const reach    = complete.reachable();

  const acceptR  = new Set([...reach].filter(s =>  complete.accept.has(s)));
  const nonAccR  = new Set([...reach].filter(s => !complete.accept.has(s)));

  // Initial partition: {F, Q-F}
  let partitions = [];
  if (acceptR.size)  partitions.push(acceptR);
  if (nonAccR.size)  partitions.push(nonAccR);

  const history = [partitions.map(p => new Set(p))];

  // ── Iterative refinement ──
  let changed = true;
  while (changed) {
    changed = false;
    const newParts = [];

    for (const grp of partitions) {
      const splits = _splitGroup(grp, partitions, complete);
      if (splits.length > 1) changed = true;
      newParts.push(...splits);
    }

    partitions = newParts;
    history.push(partitions.map(p => new Set(p)));
  }

  // ── Build minimized DFA from equivalence classes ──
  const stateToClass = {};
  const classNames   = new Map();

  partitions.forEach((grp, i) => {
    const name = 'M' + i;
    classNames.set(grp, name);
    for (const s of grp) stateToClass[s] = name;
  });

  const minStart  = stateToClass[complete.start];
  const minAccept = new Set();

  for (const [grp, name] of classNames) {
    if ([...grp].some(s => complete.accept.has(s))) minAccept.add(name);
  }

  // Build minimized transitions
  const minTrans = {};
  const seen     = new Set();

  for (const [grp, cn] of classNames) {
    if (seen.has(cn)) continue;
    seen.add(cn);
    const rep = [...grp][0];
    for (const sym of complete.alphabet) {
      const nxt = complete.step(rep, sym);
      if (nxt) minTrans[cn + ',' + sym] = stateToClass[nxt];
    }
  }

  // Remove dead state from minimized DFA
  const dead = stateToClass['__dead__'];
  let minStates = new Set(Object.values(stateToClass));

  if (dead) {
    minStates.delete(dead);
    minAccept.delete(dead);
    for (const k of Object.keys(minTrans)) {
      if (k.startsWith(dead + ',') || minTrans[k] === dead) delete minTrans[k];
    }
  }

  const minDFA = new DFA([...minStates], complete.alphabet, minStart, minAccept, minTrans);

  // Build eqClasses map for display (skip dead state)
  const eqClasses = {};
  partitions.forEach((grp, i) => {
    const members = [...grp].filter(s => s !== '__dead__');
    if (members.length) eqClasses['M' + i] = members;
  });

  return {
    minDFA,
    eqClasses,
    stateToClass,
    history,
    removed: dfa.states.size - minStates.size
  };
}

/**
 * Try to split a group based on transition signatures.
 * @param {Set}   grp
 * @param {Set[]} partitions
 * @param {DFA}   dfa
 * @returns {Set[]}
 */
function _splitGroup(grp, partitions, dfa) {
  if (grp.size <= 1) return [grp];

  const syms = [...dfa.alphabet].sort();

  // Signature: for each symbol, which partition index does the target belong to?
  // Create a fast lookup for state -> partition index
  const stateToIdx = new Map();
  partitions.forEach((p, i) => {
    for (const s of p) stateToIdx.set(s, i);
  });

  function sig(state) {
    return syms.map(sym => {
      const nxt = dfa.step(state, sym);
      if (!nxt) return -1;
      return stateToIdx.has(nxt) ? stateToIdx.get(nxt) : -1;
    }).join(',');
  }

  const groups = {};
  for (const s of grp) {
    const k = sig(s);
    (groups[k] = groups[k] || []).push(s);
  }

  return Object.values(groups).map(arr => new Set(arr));
}
