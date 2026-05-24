const EPS = 'ε';

class NFA {
    /**
     * @param {string[]} states
     * @param {string[]} alphabet
     * @param {string}   start
     * @param {string[]} accept
     * @param {Object}   trans  — flat map: "state,sym" -> Set<string>
     */
    constructor(states, alphabet, start, accept, trans) {
        this.states = new Set(states);
        this.alphabet = new Set(alphabet);
        this.start = start;
        this.accept = new Set(accept);
        this.trans = trans;
    }

    // jump states via sym
    move(stateSet, sym) {
        const result = new Set();
        for (const s of stateSet) {
            for (const n of (this.trans[s + ',' + sym] || [])) result.add(n);
        }
        return result;
    }

    // eps closure
    epsClosure(states) {
        const closure = new Set(states);
        const stack = [...states];
        while (stack.length) {
            const s = stack.pop();
            for (const n of (this.trans[s + ',' + EPS] || [])) {
                if (!closure.has(n)) { closure.add(n); stack.push(n); }
            }
        }
        return closure;
    }

    // run subset sim
    simulate(str) {
        let cur = this.epsClosure(new Set([this.start]));
        const trace = [{ step: 0, states: new Set(cur) }];

        for (let i = 0; i < str.length; i++) {
            const sym = str[i];
            cur = this.epsClosure(this.move(cur, sym));
            trace.push({ step: i + 1, sym, states: new Set(cur) });
        }

        const accepted = [...cur].some(s => this.accept.has(s));
        return { accepted, trace };
    }

    // NFA -> DFA subset
    toDFA() {
        const setKey = s => [...s].sort().join('|');
        const dfaTrans = {};
        const dfaStates = {};
        const queue = [];
        let counter = 0;

        const register = (stateSet) => {
            const k = setKey(stateSet);
            if (!(k in dfaStates)) {
                dfaStates[k] = 'q' + counter++;
                queue.push(stateSet);
            }
            return dfaStates[k];
        };

        const startClosure = this.epsClosure(new Set([this.start]));
        register(startClosure);

        while (queue.length) {
            const cur = queue.shift();
            const curN = dfaStates[setKey(cur)];

            for (const sym of [...this.alphabet].sort()) {
                const nxt = this.epsClosure(this.move(cur, sym));
                const nxtN = register(nxt);
                dfaTrans[curN + ',' + sym] = nxtN;
            }
        }

        // set accept states
        const dfaAccept = new Set();
        for (const [k, name] of Object.entries(dfaStates)) {
            if (k.split('|').some(s => this.accept.has(s))) dfaAccept.add(name);
        }

        return new DFA(
            Object.values(dfaStates),
            this.alphabet,
            dfaStates[setKey(startClosure)],
            dfaAccept,
            dfaTrans
        );
    }

    // UI trans table
    getTable() {
        const syms = [...this.alphabet].sort().concat([EPS]);
        // start state 1st
        const others = [...this.states].filter(s => s !== this.start).sort();
        const states = [this.start, ...others];
        const rows = {};
        for (const s of states) {
            rows[s] = {};
            for (const sym of syms) {
                const tgts = [...(this.trans[s + ',' + sym] || [])];
                rows[s][sym] = tgts.length ? '{' + tgts.sort().join(',') + '}' : '∅';
            }
        }
        return { rows, syms, states };
    }
}
