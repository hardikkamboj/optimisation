// 3D mode = 2 variables. Renders the objective f(x₁, x₂) = c₁x₁ + c₂x₂ as a plane,
// the feasible polygon on the ground, the lifted polygon on the plane, and the optimal vertex.

let scene, camera, renderer, orbitControls;
let initialized3d = false;
let meshes3d = [];

function init3d() {
    if (initialized3d) return;
    initialized3d = true;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, container3d.clientWidth / container3d.clientHeight, 0.1, 1000);
    camera.position.set(10, 8, 10);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x1a1a2e);
    container3d.appendChild(renderer.domElement);

    orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;

    // Axes (both directions)
    const axesLen = 8;
    const colors = [0xff4444, 0x44ff44, 0x4444ff];
    const posDirs = [[axesLen,0,0],[0,axesLen,0],[0,0,axesLen]];
    const negDirs = [[-axesLen,0,0],[0,-axesLen,0],[0,0,-axesLen]];
    for (let i = 0; i < 3; i++) {
        const geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(...negDirs[i]), new THREE.Vector3(...posDirs[i])
        ]);
        scene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: colors[i] })));
    }

    // Grid on x-z plane (x₁-x₂ plane at y=0)
    const gridGeo = new THREE.BufferGeometry();
    const gv = [];
    for (let i = -8; i <= 8; i++) {
        gv.push(i, 0, -8, i, 0, 8);
        gv.push(-8, 0, i, 8, 0, i);
    }
    gridGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(gv), 3));
    scene.add(new THREE.LineSegments(gridGeo, new THREE.LineBasicMaterial({ color: 0x0f3460, transparent: true, opacity: 0.2 })));

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dl = new THREE.DirectionalLight(0xffffff, 0.8);
    dl.position.set(5, 10, 5);
    scene.add(dl);

    resize3d();
    animate3d();
}

function resize3d() {
    if (!renderer) return;
    renderer.setSize(container3d.clientWidth, container3d.clientHeight);
    camera.aspect = container3d.clientWidth / container3d.clientHeight;
    camera.updateProjectionMatrix();
}

function animate3d() {
    requestAnimationFrame(animate3d);
    if (orbitControls) orbitControls.update();
    if (renderer) renderer.render(scene, camera);
}

function clear3d() {
    for (const obj of meshes3d) {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
    }
    meshes3d = [];
}

function draw3d() {
    if (!initialized3d) return;
    clear3d();

    const c1 = parseFloat(c1Input.value) || 0;
    const c2 = parseFloat(c2Input.value) || 0;
    const poly = computePolyhedron();

    // 1. Draw the objective surface: y = c1*x + c2*z (using x=x₁, z=x₂, y=objective)
    const PLANE_SIZE = 16;
    const planeGeo = new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE, 40, 40);
    const positions = planeGeo.attributes.position;

    // PlaneGeometry is in XY; remap to: x₁ along X, x₂ along Z, f(x) along Y
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const fVal = c1 * x + c2 * y;
        positions.setXYZ(i, x, fVal, y);
    }
    planeGeo.computeVertexNormals();

    const planeMat = new THREE.MeshPhongMaterial({
        color: 0xffcc00,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
    });
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    scene.add(planeMesh);
    meshes3d.push(planeMesh);

    // Wireframe of the plane
    const wireGeo = new THREE.WireframeGeometry(planeGeo);
    const wireMesh = new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.06 }));
    scene.add(wireMesh);
    meshes3d.push(wireMesh);

    if (poly.length < 3) return;

    // 2. Feasible region on the x₁-x₂ plane (y=0)
    const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
    const cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;

    const feasGeoVerts = [];
    for (let i = 0; i < poly.length; i++) {
        const curr = poly[i], next = poly[(i + 1) % poly.length];
        feasGeoVerts.push(cx, 0, cy);
        feasGeoVerts.push(curr.x, 0, curr.y);
        feasGeoVerts.push(next.x, 0, next.y);
    }
    const feasGeo = new THREE.BufferGeometry();
    feasGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(feasGeoVerts), 3));
    feasGeo.computeVertexNormals();
    const feasMesh = new THREE.Mesh(feasGeo, new THREE.MeshPhongMaterial({
        color: 0x00ff88, transparent: true, opacity: 0.25, side: THREE.DoubleSide,
    }));
    scene.add(feasMesh);
    meshes3d.push(feasMesh);

    // Feasible region border on ground
    const borderVerts = [];
    for (let i = 0; i < poly.length; i++) {
        borderVerts.push(new THREE.Vector3(poly[i].x, 0, poly[i].y));
    }
    borderVerts.push(borderVerts[0].clone());
    const borderGeo = new THREE.BufferGeometry().setFromPoints(borderVerts);
    const borderLine = new THREE.Line(borderGeo, new THREE.LineBasicMaterial({ color: 0x00ff88 }));
    scene.add(borderLine);
    meshes3d.push(borderLine);

    // 3. Feasible region lifted onto the objective surface
    const liftedGeoVerts = [];
    for (let i = 0; i < poly.length; i++) {
        const curr = poly[i], next = poly[(i + 1) % poly.length];
        const fCx = c1 * cx + c2 * cy;
        const fCurr = c1 * curr.x + c2 * curr.y;
        const fNext = c1 * next.x + c2 * next.y;
        liftedGeoVerts.push(cx, fCx, cy);
        liftedGeoVerts.push(curr.x, fCurr, curr.y);
        liftedGeoVerts.push(next.x, fNext, next.y);
    }
    const liftedGeo = new THREE.BufferGeometry();
    liftedGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(liftedGeoVerts), 3));
    liftedGeo.computeVertexNormals();
    const liftedMesh = new THREE.Mesh(liftedGeo, new THREE.MeshPhongMaterial({
        color: 0x00ff88, transparent: true, opacity: 0.4, side: THREE.DoubleSide,
    }));
    scene.add(liftedMesh);
    meshes3d.push(liftedMesh);

    // Lifted border
    const liftedBorderVerts = [];
    for (let i = 0; i < poly.length; i++) {
        const v = poly[i];
        liftedBorderVerts.push(new THREE.Vector3(v.x, c1 * v.x + c2 * v.y, v.y));
    }
    liftedBorderVerts.push(liftedBorderVerts[0].clone());
    const liftedBorderGeo = new THREE.BufferGeometry().setFromPoints(liftedBorderVerts);
    const liftedBorderLine = new THREE.Line(liftedBorderGeo, new THREE.LineBasicMaterial({ color: 0x00ff88, linewidth: 2 }));
    scene.add(liftedBorderLine);
    meshes3d.push(liftedBorderLine);

    // 4. Vertical walls connecting ground polygon to lifted polygon
    for (let i = 0; i < poly.length; i++) {
        const v = poly[i];
        const fv = c1 * v.x + c2 * v.y;
        const wallGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(v.x, 0, v.y),
            new THREE.Vector3(v.x, fv, v.y),
        ]);
        const wallLine = new THREE.Line(wallGeo, new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.3 }));
        scene.add(wallLine);
        meshes3d.push(wallLine);
    }

    // 5. Optimal point
    const opt = findOptimal(poly);
    if (opt) {
        const ov = opt.point;
        const fOpt = opt.value;

        // Sphere on the surface
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 16, 16),
            new THREE.MeshPhongMaterial({ color: 0xe94560 })
        );
        sphere.position.set(ov.x, fOpt, ov.y);
        scene.add(sphere);
        meshes3d.push(sphere);

        // Vertical line from ground to optimal
        const optLineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(ov.x, 0, ov.y),
            new THREE.Vector3(ov.x, fOpt, ov.y),
        ]);
        const optLine = new THREE.Line(optLineGeo, new THREE.LineBasicMaterial({ color: 0xe94560 }));
        scene.add(optLine);
        meshes3d.push(optLine);

        // Sphere on the ground
        const groundSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 16, 16),
            new THREE.MeshPhongMaterial({ color: 0xe94560 })
        );
        groundSphere.position.set(ov.x, 0, ov.y);
        scene.add(groundSphere);
        meshes3d.push(groundSphere);
    }
}
