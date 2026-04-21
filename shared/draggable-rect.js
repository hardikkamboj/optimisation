/**
 * DraggableRect — a reusable draggable rectangle for canvas visualizations.
 *
 * Usage:
 *   const rect = new DraggableRect(-3, 3, -3, 3);
 *   rect.onChange = draw;                           // called whenever the rect moves
 *   rect.attach(canvas, toCanvas, toWorld);         // wire up mouse events
 *
 *   Inside draw():
 *     rect.drawHandles(ctx, toCanvas);              // dashed border + corner handles
 *
 *   To get constraints:
 *     rect.getConstraints()                         // 4 halfplane objects {a1,a2,b,type}
 */
class DraggableRect {
    constructor(xMin = -3, xMax = 3, yMin = -3, yMax = 3) {
        this.xMin = xMin;
        this.xMax = xMax;
        this.yMin = yMin;
        this.yMax = yMax;
        this.onChange = null;   // callback fired when rect changes
        this._drag = null;      // active corner id: 'bl'|'br'|'tr'|'tl'
    }

    /** Returns 4 halfplane constraints that define this rectangle. */
    getConstraints() {
        return [
            { a1:  1, a2:  0, b:  this.xMax, type: 'leq' },   // x₁ ≤ xMax
            { a1: -1, a2:  0, b: -this.xMin, type: 'leq' },   // x₁ ≥ xMin
            { a1:  0, a2:  1, b:  this.yMax, type: 'leq' },   // x₂ ≤ yMax
            { a1:  0, a2: -1, b: -this.yMin, type: 'leq' },   // x₂ ≥ yMin
        ];
    }

    /** Returns the 4 world-space corners in order bl, br, tr, tl. */
    _corners() {
        return [
            { id: 'bl', x: this.xMin, y: this.yMin },
            { id: 'br', x: this.xMax, y: this.yMin },
            { id: 'tr', x: this.xMax, y: this.yMax },
            { id: 'tl', x: this.xMin, y: this.yMax },
        ];
    }

    /**
     * Draw the dashed rectangle border and circular corner handles.
     * @param {CanvasRenderingContext2D} ctx
     * @param {function} toCanvas  — converts world (wx,wy) → canvas {x,y}
     */
    drawHandles(ctx, toCanvas) {
        const pts = this._corners().map(c => toCanvas(c.x, c.y));

        ctx.save();

        // Dashed border
        ctx.strokeStyle = 'rgba(100,200,255,0.55)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);

        // Corner handles
        for (const p of pts) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = this._drag ? 'rgba(100,200,255,0.95)' : 'rgba(100,200,255,0.8)';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Returns the corner id ('bl','br','tr','tl') that the canvas point (px,py) is over,
     * or null if none.
     */
    _hitTest(px, py, toCanvas) {
        const HIT_R = 12; // pixel radius for hit detection
        for (const corner of this._corners()) {
            const cp = toCanvas(corner.x, corner.y);
            const dx = px - cp.x, dy = py - cp.y;
            if (dx * dx + dy * dy <= HIT_R * HIT_R) return corner.id;
        }
        return null;
    }

    /**
     * Attach mouse event listeners to the canvas for dragging corners.
     * @param {HTMLCanvasElement} canvas
     * @param {function} toCanvas   — world → canvas pixel
     * @param {function} toWorld    — canvas pixel → world
     */
    attach(canvas, toCanvas, toWorld) {
        const MIN_SIZE = 0.5;   // minimum rect extent in world units
        const SNAP     = 0.25;  // snap grid in world units
        const snap = v => Math.round(v / SNAP) * SNAP;

        const getXY = e => {
            const r = canvas.getBoundingClientRect();
            return { px: e.clientX - r.left, py: e.clientY - r.top };
        };

        canvas.addEventListener('mousedown', e => {
            const { px, py } = getXY(e);
            const hit = this._hitTest(px, py, toCanvas);
            if (hit) {
                this._drag = hit;
                canvas.style.cursor = 'grabbing';
                e.preventDefault();
            }
        });

        canvas.addEventListener('mousemove', e => {
            const { px, py } = getXY(e);

            if (this._drag) {
                const w = toWorld(px, py);
                const wx = snap(w.x), wy = snap(w.y);

                if (this._drag === 'bl') {
                    this.xMin = Math.min(wx, this.xMax - MIN_SIZE);
                    this.yMin = Math.min(wy, this.yMax - MIN_SIZE);
                } else if (this._drag === 'br') {
                    this.xMax = Math.max(wx, this.xMin + MIN_SIZE);
                    this.yMin = Math.min(wy, this.yMax - MIN_SIZE);
                } else if (this._drag === 'tr') {
                    this.xMax = Math.max(wx, this.xMin + MIN_SIZE);
                    this.yMax = Math.max(wy, this.yMin + MIN_SIZE);
                } else if (this._drag === 'tl') {
                    this.xMin = Math.min(wx, this.xMax - MIN_SIZE);
                    this.yMax = Math.max(wy, this.yMin + MIN_SIZE);
                }

                if (this.onChange) this.onChange();
            } else {
                const hit = this._hitTest(px, py, toCanvas);
                canvas.style.cursor = hit ? 'grab' : 'default';
            }
        });

        canvas.addEventListener('mouseup', () => {
            this._drag = null;
        });

        canvas.addEventListener('mouseleave', () => {
            this._drag = null;
            canvas.style.cursor = 'default';
        });
    }
}
