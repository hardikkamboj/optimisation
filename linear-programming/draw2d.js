// 2D mode = 1 variable. Renders the objective f(x) = c·x over one dimension,
// highlights the feasible interval on the x-axis and the corresponding segment on the line,
// and marks the optimum.

function resize2d() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    draw2d();
}

function draw2d() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const o = getOrigin();
    const W = canvas.width, H = canvas.height;
    const c = parseFloat(c1Input.value) || 0;
    const rX = Math.ceil(W / SCALE / 2), rY = Math.ceil(H / SCALE / 2);

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'; ctx.lineWidth = 1;
    for (let px = o.x % SCALE; px < W; px += SCALE) { ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke(); }
    for (let py = o.y % SCALE; py < H; py += SCALE) { ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke(); }

    // Axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, o.y); ctx.lineTo(W, o.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(o.x, 0); ctx.lineTo(o.x, H); ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath(); ctx.moveTo(W - 2, o.y); ctx.lineTo(W - 10, o.y - 4); ctx.lineTo(W - 10, o.y + 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(o.x, 2); ctx.lineTo(o.x - 4, 10); ctx.lineTo(o.x + 4, 10); ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; ctx.font = '12px -apple-system, sans-serif';
    ctx.fillText('x', W - 16, o.y + 18); ctx.fillText('f(x)', o.x + 10, 14);

    // Ticks
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'; ctx.font = '10px -apple-system, sans-serif';
    for (let i = -rX; i <= rX; i++) { if (i === 0) continue; const px = o.x + i * SCALE; ctx.beginPath(); ctx.moveTo(px, o.y - 3); ctx.lineTo(px, o.y + 3); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.stroke(); ctx.fillText(i, px - 3, o.y + 14); }
    for (let i = -rY; i <= rY; i++) { if (i === 0) continue; const py = o.y - i * SCALE; ctx.beginPath(); ctx.moveTo(o.x - 3, py); ctx.lineTo(o.x + 3, py); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.stroke(); ctx.fillText(i, o.x + 6, py + 3); }

    // Feasible interval on the x-axis
    const [lo, hi] = computeInterval();
    const loC = Math.max(lo, -rX - 2);
    const hiC = Math.min(hi,  rX + 2);
    const feasible = lo <= hi + 1e-9;

    if (feasible) {
        // Shaded vertical band showing the feasible x-range
        const pLoX = toCanvas(loC, 0).x;
        const pHiX = toCanvas(hiC, 0).x;
        ctx.fillStyle = 'rgba(0, 255, 136, 0.08)';
        ctx.fillRect(pLoX, 0, pHiX - pLoX, H);

        // Thick green segment on the x-axis
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(pLoX, o.y);
        ctx.lineTo(pHiX, o.y);
        ctx.stroke();

        // Endpoint markers on the x-axis
        if (isFinite(lo)) {
            const p = toCanvas(lo, 0);
            ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#00ff88'; ctx.fill();
            ctx.fillStyle = '#00ff88'; ctx.font = '10px -apple-system, sans-serif';
            ctx.fillText(lo.toFixed(1), p.x - 8, p.y + 26);
        }
        if (isFinite(hi)) {
            const p = toCanvas(hi, 0);
            ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#00ff88'; ctx.fill();
            ctx.fillStyle = '#00ff88'; ctx.font = '10px -apple-system, sans-serif';
            ctx.fillText(hi.toFixed(1), p.x - 8, p.y + 26);
        }
    }

    // Constraint boundary markers: vertical dashed lines at x = b/a
    for (let i = 0; i < constraints.length; i++) {
        const cc = constraints[i];
        if (Math.abs(cc.a1) < 1e-10) continue;
        const xBound = cc.b / cc.a1;
        if (xBound < -rX - 1 || xBound > rX + 1) continue;
        const p = toCanvas(xBound, 0);
        const color = LINE_COLORS[i % LINE_COLORS.length];
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(p.x, 0);
        ctx.lineTo(p.x, H);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Objective function line: y = c·x (drawn across the full canvas)
    {
        const xL = -rX - 1, xR = rX + 1;
        const pL = toCanvas(xL, c * xL);
        const pR = toCanvas(xR, c * xR);
        ctx.strokeStyle = 'rgba(255, 204, 0, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pL.x, pL.y);
        ctx.lineTo(pR.x, pR.y);
        ctx.stroke();

        // Label the line near the right edge
        const labelX = rX - 1;
        const labelY = c * labelX;
        const lp = toCanvas(labelX, labelY);
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 13px -apple-system, sans-serif';
        ctx.fillText(`f(x) = ${c.toFixed(1)} x`, lp.x - 90, lp.y - 8);
    }

    // Highlighted feasible segment of the objective line
    if (feasible) {
        const pA = toCanvas(loC, c * loC);
        const pB = toCanvas(hiC, c * hiC);
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.stroke();

        if (isFinite(lo)) {
            const p = toCanvas(lo, c * lo);
            ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#00ff88'; ctx.fill();
        }
        if (isFinite(hi)) {
            const p = toCanvas(hi, c * hi);
            ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#00ff88'; ctx.fill();
        }
    }

    // Optimal point
    const opt = findOptimalInterval(lo, hi);
    if (opt) {
        const pGround = toCanvas(opt.x, 0);
        const pOnLine = toCanvas(opt.x, opt.value);

        // Dashed drop line from the x-axis to the objective line
        ctx.strokeStyle = 'rgba(233, 69, 96, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(pGround.x, pGround.y);
        ctx.lineTo(pOnLine.x, pOnLine.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Dot on the x-axis
        ctx.beginPath(); ctx.arc(pGround.x, pGround.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#e94560'; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();

        // Dot on the objective line
        ctx.beginPath(); ctx.arc(pOnLine.x, pOnLine.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#e94560'; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

        // Labels near the optimum on the objective line
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px -apple-system, sans-serif';
        ctx.fillText(`x* = ${opt.x.toFixed(2)}`, pOnLine.x + 12, pOnLine.y - 10);
        ctx.fillStyle = '#ffcc00'; ctx.font = '11px -apple-system, sans-serif';
        ctx.fillText(`f(x*) = ${opt.value.toFixed(2)}`, pOnLine.x + 12, pOnLine.y + 6);

        optimalDisplayEl.innerHTML = `x* = ${opt.x.toFixed(2)}<br>f(x*) = ${opt.value.toFixed(2)}`;
    } else if (!feasible) {
        optimalDisplayEl.textContent = 'Infeasible';
    } else {
        optimalDisplayEl.textContent = 'Unbounded';
    }
}
