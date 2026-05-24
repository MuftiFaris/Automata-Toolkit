/**
 * Place n states in a circle inside a W×H viewport.
 * Start state is pinned to the left (angle = π).
 * @returns {Object} { stateName: {x, y} }
 */
function layoutStates(states, W, H) {
    const n = states.length;
    const cx = W / 2, cy = H / 2;
    const r = Math.min(W, H) * 0.36;
    const pos = {};

    if (n === 1) {
        pos[states[0]] = { x: cx, y: cy };
        return pos;
    }

    states.forEach((s, i) => {
        const angle = Math.PI - (2 * Math.PI * i / n);
        pos[s] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });

    return pos;
}

// arrow markers

function _markerDefs(id, color) {
    return `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5"
    markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M1 1L9 5L1 9" fill="none" stroke="${color}"
      stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>`;
}

// Main DFA graph renderer

/**
 * Draw a DFA as an SVG graph.
 *
 * @param {string}        svgId       — id of <svg> element
 * @param {DFA}           dfa
 * @param {string|null}   activeState — state to highlight
 * @param {[string,string]|null} activeEdge — [from, to] edge to highlight
 */
function drawDFAGraph(svgId, dfa, activeState = null, activeEdge = null) {
    const svg = document.getElementById(svgId);
    const wrap = svg.parentElement;
    const W = wrap.clientWidth || 500;
    const H = wrap.clientHeight || 300;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const R = 26;

    // start 1st, then az
    const stateArr = [...dfa.states]
        .filter(s => s !== '__dead__')
        .sort((a, b) => a === dfa.start ? -1 : b === dfa.start ? 1 : a.localeCompare(b));

    const pos = layoutStates(stateArr, W, H);

    // group edges for label
    const edgeMap = {};
    for (const s of stateArr) {
        for (const sym of [...dfa.alphabet].sort()) {
            const nxt = dfa.step(s, sym);
            if (!nxt || nxt === '__dead__') continue;
            const k = s + '->' + nxt;
            (edgeMap[k] = edgeMap[k] || []).push(sym);
        }
    }

    let html = '<defs>';
    html += _markerDefs('ar-default', '#2a3045');
    html += _markerDefs('ar-active', '#5b8fff');
    html += _markerDefs('ar-accept', '#3ecf8e');
    html += _markerDefs('ar-start', '#6b7899');
    html += '</defs>';

    // draw edges
    for (const [key, syms] of Object.entries(edgeMap)) {
        const [from, to] = key.split('->');
        if (!pos[from] || !pos[to]) continue;

        const label = syms.join(', ');
        const isActive = activeEdge && activeEdge[0] === from && activeEdge[1] === to;
        const edgeColor = isActive ? '#5b8fff' : '#2a3045';
        const lblColor = isActive ? '#5b8fff' : '#6b7899';
        const marker = isActive ? 'ar-active' : 'ar-default';
        const sw = isActive ? 2.5 : 1.8;

        if (from === to) {
            // self loop
            const { x, y } = pos[from];
            html += `<path d="M${x - 12},${y - R + 4} C${x - 32},${y - R - 42} ${x + 32},${y - R - 42} ${x + 12},${y - R + 4}"
        fill="none" stroke="${edgeColor}" stroke-width="${sw}"
        marker-end="url(#${marker})"/>`;
            html += `<text x="${x}" y="${y - R - 30}" text-anchor="middle"
        fill="${lblColor}" font-size="11" font-family="JetBrains Mono,monospace">${label}</text>`;
        } else {
            const { x: x1, y: y1 } = pos[from];
            const { x: x2, y: y2 } = pos[to];
            const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
            const nx = dx / len, ny = dy / len;

            const ex1 = x1 + nx * R, ey1 = y1 + ny * R;
            const ex2 = x2 - nx * (R + 3), ey2 = y2 - ny * (R + 3);

            const hasReverse = edgeMap[to + '->' + from];
            let pathD, mlx, mly;

            if (hasReverse) {
                // curve avoid overlap
                const ox = -ny * 30, oy = nx * 30;
                const mx = (ex1 + ex2) / 2 + ox;
                const my = (ey1 + ey2) / 2 + oy;
                pathD = `M${ex1},${ey1} Q${mx},${my} ${ex2},${ey2}`;
                mlx = mx; mly = my - 10;
            } else {
                pathD = `M${ex1},${ey1} L${ex2},${ey2}`;
                mlx = (ex1 + ex2) / 2 - ny * 14;
                mly = (ey1 + ey2) / 2 + nx * 14 - 5;
            }

            html += `<path d="${pathD}" fill="none" stroke="${edgeColor}"
        stroke-width="${sw}" marker-end="url(#${marker})"/>`;
            html += `<text x="${mlx}" y="${mly}" text-anchor="middle"
        fill="${lblColor}" font-size="11" font-family="JetBrains Mono,monospace">${label}</text>`;
        }
    }

    // start arrow
    if (pos[dfa.start]) {
        const { x, y } = pos[dfa.start];
        html += `<line x1="${x - R - 32}" y1="${y}" x2="${x - R - 2}" y2="${y}"
      stroke="#6b7899" stroke-width="1.5" marker-end="url(#ar-start)"/>`;
        html += `<text x="${x - R - 36}" y="${y + 4}" text-anchor="end"
      fill="#6b7899" font-size="11" font-family="Syne,sans-serif">Start</text>`;
    }

    // draw nodes
    for (const s of stateArr) {
        const { x, y } = pos[s];
        const isActive = s === activeState;
        const isAccept = dfa.accept.has(s);

        let fill, stroke, textCol;
        if (isActive && isAccept) {
            fill = '#2d1f6e'; stroke = '#7c5cff'; textCol = '#fff';
        } else if (isActive) {
            fill = '#1e3a7a'; stroke = '#5b8fff'; textCol = '#fff';
        } else if (isAccept) {
            fill = '#0a2e1e'; stroke = '#3ecf8e'; textCol = '#3ecf8e';
        } else {
            fill = '#1a1e28'; stroke = '#2a3045'; textCol = '#e2e8f8';
        }
        const sw = isActive ? 3 : 2;

        html += `<circle cx="${x}" cy="${y}" r="${R}"
      fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;

        // accept double ring
        if (isAccept) {
            html += `<circle cx="${x}" cy="${y}" r="${R - 5}"
        fill="none" stroke="${stroke}" stroke-width="1.4" opacity="0.5"/>`;
        }

        html += `<text x="${x}" y="${y + 1}" text-anchor="middle"
      dominant-baseline="central" fill="${textCol}"
      font-size="13" font-weight="700"
      font-family="Syne,sans-serif">${s}</text>`;
    }

    svg.innerHTML = html;
}

// NFA graph renderer

/**
 * Draw an NFA as an SVG graph.
 * Epsilon transitions are shown as dashed gray arrows.
 *
 * @param {string} svgId
 * @param {NFA}    nfa
 */
function drawNFAGraph(svgId, nfa) {
    const svg = document.getElementById(svgId);
    const wrap = svg.parentElement;
    const W = wrap.clientWidth || 500;
    const H = wrap.clientHeight || 300;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const R = 22;

    const stateArr = [...nfa.states].sort(
        (a, b) => a === nfa.start ? -1 : b === nfa.start ? 1 : a.localeCompare(b)
    );
    const pos = layoutStates(stateArr, W, H);

    // group nfa edges
    const edgeMap = {};
    for (const key of Object.keys(nfa.trans)) {
        const commaIdx = key.indexOf(',');
        const s = key.slice(0, commaIdx);
        const sym = key.slice(commaIdx + 1);
        for (const t of nfa.trans[key]) {
            const ek = s + '->' + t;
            (edgeMap[ek] = edgeMap[ek] || []).push(sym);
        }
    }

    let html = '<defs>';
    html += _markerDefs('nfa-ar', '#3ecfcf');
    html += _markerDefs('nfa-ar-eps', '#3a4260');
    html += _markerDefs('nfa-start', '#6b7899');
    html += '</defs>';

    // Draw edges
    for (const [key, syms] of Object.entries(edgeMap)) {
        const [from, to] = key.split('->');
        if (!pos[from] || !pos[to]) continue;

        const hasEps = syms.includes(EPS);
        const label = syms.join(', ');
        const edgeColor = hasEps ? '#3a4260' : '#1e3f6e';
        const marker = hasEps ? 'nfa-ar-eps' : 'nfa-ar';
        const dashAttr = hasEps ? 'stroke-dasharray="5 3"' : '';

        if (from === to) {
            const { x, y } = pos[from];
            html += `<path d="M${x - 10},${y - R + 4} C${x - 28},${y - R - 38} ${x + 28},${y - R - 38} ${x + 10},${y - R + 4}"
        fill="none" stroke="${edgeColor}" stroke-width="1.5" ${dashAttr}
        marker-end="url(#${marker})"/>`;
            html += `<text x="${x}" y="${y - R - 26}" text-anchor="middle"
        fill="#6b7899" font-size="10" font-family="JetBrains Mono,monospace">${label}</text>`;
        } else {
            const { x: x1, y: y1 } = pos[from];
            const { x: x2, y: y2 } = pos[to];
            const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
            const nx = dx / len, ny = dy / len;

            const ex1 = x1 + nx * R, ey1 = y1 + ny * R;
            const ex2 = x2 - nx * (R + 3), ey2 = y2 - ny * (R + 3);

            const hasRev = edgeMap[to + '->' + from];
            let pathD, mlx, mly;

            if (hasRev) {
                const ox = -ny * 26, oy = nx * 26;
                const mx = (ex1 + ex2) / 2 + ox, my = (ey1 + ey2) / 2 + oy;
                pathD = `M${ex1},${ey1} Q${mx},${my} ${ex2},${ey2}`;
                mlx = mx; mly = my - 9;
            } else {
                pathD = `M${ex1},${ey1} L${ex2},${ey2}`;
                mlx = (ex1 + ex2) / 2 - ny * 12;
                mly = (ey1 + ey2) / 2 + nx * 12 - 5;
            }

            html += `<path d="${pathD}" fill="none" stroke="${edgeColor}"
        stroke-width="1.5" ${dashAttr} marker-end="url(#${marker})"/>`;
            html += `<text x="${mlx}" y="${mly}" text-anchor="middle"
        fill="#6b7899" font-size="10" font-family="JetBrains Mono,monospace">${label}</text>`;
        }
    }

    // Start arrow
    if (pos[nfa.start]) {
        const { x, y } = pos[nfa.start];
        html += `<line x1="${x - R - 28}" y1="${y}" x2="${x - R - 2}" y2="${y}"
      stroke="#6b7899" stroke-width="1.5" marker-end="url(#nfa-start)"/>`;
    }

    // Draw state nodes
    for (const s of stateArr) {
        const { x, y } = pos[s];
        const isAccept = nfa.accept.has(s);
        const fill = isAccept ? '#0a2e1e' : '#1a1e28';
        const stroke = isAccept ? '#3ecf8e' : '#2a3045';
        const textCol = isAccept ? '#3ecf8e' : '#e2e8f8';

        html += `<circle cx="${x}" cy="${y}" r="${R}"
      fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;

        if (isAccept) {
            html += `<circle cx="${x}" cy="${y}" r="${R - 5}"
        fill="none" stroke="${stroke}" stroke-width="1.2" opacity="0.5"/>`;
        }

        html += `<text x="${x}" y="${y + 1}" text-anchor="middle"
      dominant-baseline="central" fill="${textCol}"
      font-size="11" font-weight="700"
      font-family="Syne,sans-serif">${s}</text>`;
    }

    svg.innerHTML = html;
}
