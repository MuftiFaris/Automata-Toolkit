class DFA {
    /**
     * @param {string[]} states
     * @param {string[]} alphabet
     * @param {string}   start
     * @param {string[]} accept
     * @param {Object}   trans  — flat map: "state,sym" -> nextState
     */
    constructor(states, alphabet, start, accept, trans) {
        this.states = new Set(states);
        this.alphabet = new Set(alphabet);
        this.start = start;
        this.accept = new Set(accept);
        this.trans = trans;
    }

    // one step
    step(state, sym) {
        return this.trans[state + ',' + sym] || null;
    }

    /**
     * Simulate DFA on input string.
     * @returns {{ accepted: boolean, trace: Object[], final: string|null }}
     */
    simulate(str) {
        let cur = this.start;
        const trace = [{ step: 0, state: cur, sym: null, next: null }];

        for (let i = 0; i < str.length; i++) {
            const sym = str[i];
            const nxt = this.step(cur, sym);
            trace.push({ step: i + 1, state: cur, sym, next: nxt || 'DEAD' });
            if (!nxt) { cur = null; break; }
            cur = nxt;
        }

        return {
            accepted: !!(cur && this.accept.has(cur)),
            trace,
            final: cur
        };
    }

    // build trans table obj
    getTable() {
        const syms = [...this.alphabet].sort();
        const rows = {};
        for (const s of [...this.states].sort()) {
            rows[s] = {};
            for (const a of syms) rows[s][a] = this.step(s, a) || '─';
        }
        return { rows, syms };
    }

    // clone dfa + dead state
    addDeadState() {
        const DEAD = '__dead__';
        const newTrans = { ...this.trans };
        let needsDead = false;

        for (const s of this.states) {
            for (const a of this.alphabet) {
                if (!this.step(s, a)) {
                    newTrans[s + ',' + a] = DEAD;
                    needsDead = true;
                }
            }
        }

        if (needsDead) {
            for (const a of this.alphabet) newTrans[DEAD + ',' + a] = DEAD;
            return new DFA([...this.states, DEAD], this.alphabet, this.start, this.accept, newTrans);
        }
        return this;
    }

    // bfs reachable states
    reachable() {
        const visited = new Set();
        const queue = [this.start];
        while (queue.length) {
            const s = queue.shift();
            if (visited.has(s)) continue;
            visited.add(s);
            for (const a of this.alphabet) {
                const n = this.step(s, a);
                if (n) queue.push(n);
            }
        }
        return visited;
    }
}
