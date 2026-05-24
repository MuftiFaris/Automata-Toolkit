let _stateCounter = 0;

function _newState() {
  return 's' + (++_stateCounter);
}

function _resetCounter() {
  _stateCounter = 0;
}

// merge trans dicts
function _mergeTrans(...dicts) {
  const merged = {};
  for (const d of dicts) {
    for (const [k, v] of Object.entries(d)) {
      if (merged[k]) { for (const x of v) merged[k].add(x); }
      else            merged[k] = new Set(v);
    }
  }
  return merged;
}

// thompson frags

function _buildChar(c) {
  const [s0, s1] = [_newState(), _newState()];
  return { start: s0, accept: s1, trans: { [s0 + ',' + c]: new Set([s1]) } };
}

function _buildEpsilon() {
  const [s0, s1] = [_newState(), _newState()];
  return { start: s0, accept: s1, trans: { [s0 + ',' + EPS]: new Set([s1]) } };
}

function _buildUnion(f1, f2) {
  const [s0, s1] = [_newState(), _newState()];
  return {
    start : s0,
    accept: s1,
    trans : _mergeTrans(
      f1.trans, f2.trans,
      { [s0 + ',' + EPS]        : new Set([f1.start, f2.start]) },
      { [f1.accept + ',' + EPS] : new Set([s1]) },
      { [f2.accept + ',' + EPS] : new Set([s1]) }
    )
  };
}

function _buildConcat(f1, f2) {
  return {
    start : f1.start,
    accept: f2.accept,
    trans : _mergeTrans(
      f1.trans, f2.trans,
      { [f1.accept + ',' + EPS]: new Set([f2.start]) }
    )
  };
}

function _buildStar(f) {
  const [s0, s1] = [_newState(), _newState()];
  return {
    start : s0,
    accept: s1,
    trans : _mergeTrans(
      f.trans,
      { [s0 + ',' + EPS]        : new Set([f.start, s1]) },
      { [f.accept + ',' + EPS]  : new Set([f.start, s1]) }
    )
  };
}

function _buildPlus(f) {
  // a+ req 1 pass. loop f.accept -> f.start
  const [s0, s1] = [_newState(), _newState()];
  return {
    start : s0,
    accept: s1,
    trans : _mergeTrans(
      f.trans,
      { [s0 + ',' + EPS]       : new Set([f.start]) },
      { [f.accept + ',' + EPS] : new Set([f.start, s1]) }
    )
  };
}

// clone e-NFA nodes
function _buildEpsilonCopy(f) {
  // plus re-entry eps
  const s0 = _newState(), s1 = _newState();
  return {
    start : s0,
    accept: s1,
    trans : _mergeTrans(
      f.trans,
      { [s0 + ',' + EPS]       : new Set([f.start]) },
      { [f.accept + ',' + EPS] : new Set([s1]) }
    )
  };
}

function _buildOptional(f) {
  return _buildUnion(f, _buildEpsilon());
}

// Lexer

function _tokenize(regex) {
  const raw = [];
  for (let i = 0; i < regex.length; i++) {
    const c = regex[i];
    if (c === '\\' && i + 1 < regex.length) {
      raw.push(['C', regex[++i]]);
    } else if ('()|*+?'.includes(c)) {
      raw.push([c, c]);
    } else {
      raw.push(['C', c]);
    }
  }

  // inject '.' concat
  const tokens = [];
  for (let i = 0; i < raw.length; i++) {
    tokens.push(raw[i]);
    if (i + 1 < raw.length) {
      const [lt] = raw[i];
      const [rt] = raw[i + 1];
      if ('C)*+?'.includes(lt) && 'C('.includes(rt)) {
        tokens.push(['.', '.']);
      }
    }
  }
  return tokens;
}

// shunting yard

function _toPostfix(tokens) {
  const PREC = { '|': 1, '.': 2, '*': 3, '+': 3, '?': 3 };
  const out = [], stk = [];

  for (const tok of tokens) {
    const [k] = tok;
    if (k === 'C') {
      out.push(tok);
    } else if (k === '(') {
      stk.push(tok);
    } else if (k === ')') {
      while (stk.length && stk[stk.length - 1][0] !== '(') out.push(stk.pop());
      stk.pop(); // remove '('
    } else {
      while (stk.length && (PREC[stk[stk.length - 1][0]] || 0) >= PREC[k]) {
        out.push(stk.pop());
      }
      stk.push(tok);
    }
  }
  while (stk.length) out.push(stk.pop());
  return out;
}

// export
// regex -> NFA
function regexToNFA(regex) {
  if (!regex || !regex.trim()) throw new Error('Regex tidak boleh kosong.');

  _resetCounter();

  const tokens  = _tokenize(regex);
  const postfix = _toPostfix(tokens);
  const stk     = [];

  // grab alphabet
  const alphabet = new Set();
  for (const [k, v] of tokens) if (k === 'C') alphabet.add(v);

  for (const [k, v] of postfix) {
    if (k === 'C') {
      stk.push(_buildChar(v));
    } else if (k === '.') {
      const f2 = stk.pop(), f1 = stk.pop();
      stk.push(_buildConcat(f1, f2));
    } else if (k === '|') {
      const f2 = stk.pop(), f1 = stk.pop();
      stk.push(_buildUnion(f1, f2));
    } else if (k === '*') {
      stk.push(_buildStar(stk.pop()));
    } else if (k === '+') {
      const f = stk.pop();
      stk.push(_buildConcat(f, _buildStar(_buildEpsilonCopy(f))));
    } else if (k === '?') {
      stk.push(_buildOptional(stk.pop()));
    }
  }

  if (!stk.length) throw new Error('Regex kosong atau tidak valid.');

  const frag = stk[0];

  // dump all states
  const allStates = new Set();
  for (const key of Object.keys(frag.trans)) {
    const s = key.split(',')[0];
    allStates.add(s);
    for (const t of frag.trans[key]) allStates.add(t);
  }
  allStates.add(frag.start);
  allStates.add(frag.accept);

  return new NFA(
    allStates,
    alphabet,
    frag.start,
    new Set([frag.accept]),
    frag.trans
  );
}

// validate no throw
function validateRegex(regex) {
  try {
    regexToNFA(regex);
    return { valid: true, error: '' };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}
