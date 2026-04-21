// ===================== STATE =====================
let constraints = [];
let ineqType = 'leq';
let optType = 'min'; // 'min' or 'max'
let mode = '2d';

const SCALE = 40;
const LINE_COLORS = ['#e94560','#ff6b6b','#ffa502','#ff6348','#7bed9f','#70a1ff','#5352ed','#a29bfe','#fd79a8','#00cec9','#e17055','#6c5ce7'];

// ===================== DOM REFS =====================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const container2d = document.getElementById('container-2d');
const container3d = document.getElementById('container-3d');
const constraintListEl = document.getElementById('constraint-list');
const constraintCountEl = document.getElementById('constraint-count');
const objDisplayEl = document.getElementById('obj-display');
const optimalDisplayEl = document.getElementById('optimal-display');
const c1Input = document.getElementById('c1');
const c2Input = document.getElementById('c2');
const ineqLeq = document.getElementById('ineq-leq');
const ineqGeq = document.getElementById('ineq-geq');

// ===================== MODE SWITCHING =====================
document.getElementById('tab-2d').addEventListener('click', () => switchMode('2d'));
document.getElementById('tab-3d').addEventListener('click', () => switchMode('3d'));

function switchMode(m) {
    mode = m;
    document.getElementById('tab-2d').classList.toggle('active', m === '2d');
    document.getElementById('tab-3d').classList.toggle('active', m === '3d');
    container2d.style.display = m === '2d' ? 'block' : 'none';
    container3d.classList.toggle('visible', m === '3d');

    // Toggle UI for 1-variable (2D) vs 2-variable (3D) problems
    const is2d = m === '2d';
    document.getElementById('row-c2').style.display = is2d ? 'none' : 'flex';
    document.getElementById('row-a2').style.display = is2d ? 'none' : 'flex';
    document.getElementById('lbl-c1').textContent = is2d ? 'c' : 'c₁';
    document.getElementById('lbl-a1').textContent = is2d ? 'a' : 'a₁';
    ineqLeq.textContent = is2d ? 'a·x ≤ b' : 'aᵀx ≤ b';
    ineqGeq.textContent = is2d ? 'a·x ≥ b' : 'aᵀx ≥ b';
    document.getElementById('legend-obj').textContent = is2d ? 'Objective f(x) = c·x' : 'Objective level curves';
    document.getElementById('legend-feas').textContent = is2d ? 'Feasible set' : 'Feasible Region';

    updateConstraintList();
    updateAll();
    if (is2d) { resize2d(); }
    else { init3d(); resize3d(); draw3d(); }
}

// Opt type toggle
document.getElementById('opt-min').addEventListener('click', () => { optType = 'min'; document.getElementById('opt-min').classList.add('active'); document.getElementById('opt-max').classList.remove('active'); updateAll(); });
document.getElementById('opt-max').addEventListener('click', () => { optType = 'max'; document.getElementById('opt-max').classList.add('active'); document.getElementById('opt-min').classList.remove('active'); updateAll(); });

// Ineq toggle
ineqLeq.addEventListener('click', () => { ineqType = 'leq'; ineqLeq.classList.add('active'); ineqGeq.classList.remove('active'); });
ineqGeq.addEventListener('click', () => { ineqType = 'geq'; ineqGeq.classList.add('active'); ineqLeq.classList.remove('active'); });

// Objective inputs
c1Input.addEventListener('input', updateAll);
c2Input.addEventListener('input', updateAll);

// ===================== CONSTRAINTS =====================
document.getElementById('btn-add').addEventListener('click', () => {
    const a1 = parseFloat(document.getElementById('inp-a1').value) || 0;
    const a2 = mode === '2d' ? 0 : (parseFloat(document.getElementById('inp-a2').value) || 0);
    const b = parseFloat(document.getElementById('inp-b').value) || 0;
    addConstraint(a1, a2, b, ineqType);
});

document.getElementById('btn-random').addEventListener('click', () => {
    if (mode === '2d') {
        // 1-variable case
        if (constraints.length === 0) {
            // Start with an interval [-3, 3] centered at the origin
            addConstraint(1, 0, 3, 'leq');   // x ≤ 3
            addConstraint(-1, 0, 3, 'leq');  // x ≥ -3
            return;
        }
        const [lo, hi] = computeInterval();
        if (lo > hi || !isFinite(lo) || !isFinite(hi)) {
            addConstraint(1, 0, 3, 'leq');
            addConstraint(-1, 0, 3, 'leq');
            return;
        }
        const t = 0.2 + Math.random() * 0.6;
        const newBound = parseFloat((lo + t * (hi - lo)).toFixed(1));
        const side = Math.random() > 0.5 ? 'leq' : 'geq';
        addConstraint(1, 0, newBound, side);
        return;
    }

    const poly = computePolyhedron();
    if (poly.length < 3) {
        if (constraints.length === 0) {
            // Start with a rectangle [-3, 3] × [-3, 3] centered at the origin
            addConstraint(1, 0, 3, 'leq');
            addConstraint(-1, 0, 3, 'leq');
            addConstraint(0, 1, 3, 'leq');
            addConstraint(0, -1, 3, 'leq');
        } else {
            const a1 = parseFloat((Math.random() * 4 - 2).toFixed(1));
            const a2 = parseFloat((Math.random() * 4 - 2).toFixed(1));
            const b = parseFloat((Math.random() * 6 - 3).toFixed(1));
            addConstraint(a1, a2, b, Math.random() > 0.5 ? 'leq' : 'geq');
        }
        return;
    }
    const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
    const cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;
    const vi = Math.floor(Math.random() * poly.length);
    const t = 0.2 + Math.random() * 0.6;
    const px = cx + t * (poly[vi].x - cx);
    const py = cy + t * (poly[vi].y - cy);
    const angle = Math.random() * Math.PI * 2;
    const a1 = parseFloat(Math.cos(angle).toFixed(2));
    const a2 = parseFloat(Math.sin(angle).toFixed(2));
    const b = parseFloat((a1 * px + a2 * py).toFixed(1));
    addConstraint(a1, a2, b, 'leq');
});

document.getElementById('btn-clear').addEventListener('click', () => {
    constraints = [];
    updateConstraintList();
    updateAll();
});

function addConstraint(a1, a2, b, type) {
    if (Math.abs(a1) < 1e-10 && Math.abs(a2) < 1e-10) return;
    constraints.push({ a1, a2, b, type });
    updateConstraintList();
    updateAll();
}

function removeConstraint(idx) {
    constraints.splice(idx, 1);
    updateConstraintList();
    updateAll();
}

function updateConstraintList() {
    constraintCountEl.textContent = constraints.length;
    constraintListEl.innerHTML = '';
    constraints.forEach((c, i) => {
        const div = document.createElement('div');
        div.className = 'constraint-item';
        const ineqSign = c.type === 'leq' ? '≤' : '≥';
        let text;
        if (mode === '2d') {
            text = `${c.a1.toFixed(1)} x ${ineqSign} ${c.b.toFixed(1)}`;
        } else {
            const s2 = c.a2 >= 0 ? '+' : '−';
            text = `${c.a1.toFixed(1)}x₁ ${s2} ${Math.abs(c.a2).toFixed(1)}x₂ ${ineqSign} ${c.b.toFixed(1)}`;
        }
        div.innerHTML = `<span>${text}</span><button class="remove-btn" data-idx="${i}">&times;</button>`;
        constraintListEl.appendChild(div);
    });
    constraintListEl.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => removeConstraint(parseInt(e.target.dataset.idx)));
    });
}

function updateAll() {
    const c1 = parseFloat(c1Input.value) || 0;
    const c2 = parseFloat(c2Input.value) || 0;
    if (mode === '2d') {
        objDisplayEl.textContent = `${optType}  ${c1.toFixed(1)} x`;
    } else {
        const s2 = c2 >= 0 ? '+' : '−';
        objDisplayEl.textContent = `${optType}  ${c1.toFixed(1)} x₁ ${s2} ${Math.abs(c2).toFixed(1)} x₂`;
    }

    if (mode === '2d') draw2d();
    else draw3d();
}

// ===================== POLYHEDRON COMPUTATION (2-variable) =====================
function getNormalized() {
    return constraints.map(c => {
        if (c.type === 'geq') return { a1: -c.a1, a2: -c.a2, b: -c.b };
        return { a1: c.a1, a2: c.a2, b: c.b };
    });
}

function clipPolygon(polygon, a1, a2, b) {
    if (polygon.length === 0) return [];
    const output = [];
    for (let i = 0; i < polygon.length; i++) {
        const curr = polygon[i], next = polygon[(i + 1) % polygon.length];
        const cV = a1 * curr.x + a2 * curr.y, nV = a1 * next.x + a2 * next.y;
        const cIn = cV <= b + 1e-9, nIn = nV <= b + 1e-9;
        if (cIn && nIn) output.push(next);
        else if (cIn && !nIn) output.push(lineIntersect(curr, next, a1, a2, b));
        else if (!cIn && nIn) { output.push(lineIntersect(curr, next, a1, a2, b)); output.push(next); }
    }
    return output;
}

function lineIntersect(p1, p2, a1, a2, b) {
    const d1 = a1 * p1.x + a2 * p1.y - b, d2 = a1 * p2.x + a2 * p2.y - b;
    const t = d1 / (d1 - d2);
    return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
}

function computePolyhedron() {
    const norm = getNormalized();
    if (norm.length === 0) return [];
    const BIG = 50;
    let polygon = [{ x: -BIG, y: -BIG }, { x: BIG, y: -BIG }, { x: BIG, y: BIG }, { x: -BIG, y: BIG }];
    for (const c of norm) {
        polygon = clipPolygon(polygon, c.a1, c.a2, c.b);
        if (polygon.length === 0) return [];
    }
    return polygon;
}

function findOptimal(poly) {
    if (poly.length === 0) return null;
    const c1 = parseFloat(c1Input.value) || 0;
    const c2 = parseFloat(c2Input.value) || 0;

    // Filter out bounding box vertices
    const realVerts = poly.filter(v => Math.abs(v.x) < 49 && Math.abs(v.y) < 49);
    if (realVerts.length === 0) return null;

    let best = realVerts[0];
    let bestVal = c1 * best.x + c2 * best.y;

    for (let i = 1; i < realVerts.length; i++) {
        const val = c1 * realVerts[i].x + c2 * realVerts[i].y;
        if (optType === 'min' ? val < bestVal : val > bestVal) {
            bestVal = val;
            best = realVerts[i];
        }
    }
    return { point: best, value: bestVal };
}

// ===================== 1D (interval) COMPUTATION =====================
// In 2D mode we have a single scalar variable x. Each constraint is a·x ≤ b (or ≥).
// The feasible set is an interval [lo, hi] (possibly empty or unbounded).
function computeInterval() {
    let lo = -Infinity, hi = Infinity;
    for (const c of constraints) {
        let a = c.a1;
        let b = c.b;
        if (c.type === 'geq') { a = -a; b = -b; }
        if (Math.abs(a) < 1e-10) {
            if (b < -1e-9) return [1, -1];
            continue;
        }
        if (a > 0) hi = Math.min(hi, b / a);
        else lo = Math.max(lo, b / a);
    }
    return [lo, hi];
}

function findOptimalInterval(lo, hi) {
    if (lo > hi + 1e-9) return null; // infeasible
    const c = parseFloat(c1Input.value) || 0;
    if (Math.abs(c) < 1e-10) {
        let x = 0;
        if (0 < lo) x = lo;
        else if (0 > hi) x = hi;
        if (!isFinite(x)) x = isFinite(lo) ? lo : (isFinite(hi) ? hi : 0);
        return { x, value: 0 };
    }
    let x;
    if (optType === 'min') x = c > 0 ? lo : hi;
    else x = c > 0 ? hi : lo;
    if (!isFinite(x)) return null; // unbounded
    return { x, value: c * x };
}

// ===================== COORDINATE HELPERS =====================
function getOrigin() { return { x: canvas.width / 2, y: canvas.height / 2 }; }
function toCanvas(mx, my) { const o = getOrigin(); return { x: o.x + mx * SCALE, y: o.y - my * SCALE }; }

window.addEventListener('resize', () => { if (mode === '2d') resize2d(); else resize3d(); });
