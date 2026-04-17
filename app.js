// ============================================================
//  Camera Calibration Explorer — Main Application Logic
// ============================================================

(function () {
    'use strict';
    THREE.Object3D.DefaultUp.set(0, 0, 1);

    // ---- DOM references ----
    const sliders = {
        pwX:  document.getElementById('pw-x'),
        pwY:  document.getElementById('pw-y'),
        pwZ:  document.getElementById('pw-z'),
        rotX: document.getElementById('rot-x'),
        rotY: document.getElementById('rot-y'),
        rotZ: document.getElementById('rot-z'),
        tx:   document.getElementById('tx'),
        ty:   document.getElementById('ty'),
        tz:   document.getElementById('tz'),
        fx:   document.getElementById('fx'),
        fy:   document.getElementById('fy'),
        cx:   document.getElementById('cx'),
        cy:   document.getElementById('cy'),
        skew: document.getElementById('skew'),
    };

    const valLabels = {
        pwX:  document.getElementById('pw-x-val'),
        pwY:  document.getElementById('pw-y-val'),
        pwZ:  document.getElementById('pw-z-val'),
        rotX: document.getElementById('rot-x-val'),
        rotY: document.getElementById('rot-y-val'),
        rotZ: document.getElementById('rot-z-val'),
        tx:   document.getElementById('tx-val'),
        ty:   document.getElementById('ty-val'),
        tz:   document.getElementById('tz-val'),
        fx:   document.getElementById('fx-val'),
        fy:   document.getElementById('fy-val'),
        cx:   document.getElementById('cx-val'),
        cy:   document.getElementById('cy-val'),
        skew: document.getElementById('skew-val'),
    };

    // ---- Reset button ----
    document.getElementById('reset-btn').addEventListener('click', function () {
        Object.values(sliders).forEach(s => {
            s.value = s.defaultValue;
        });
        updateAll();
    });

    // ---- Math utilities ----
    function degToRad(d) { return d * Math.PI / 180; }

    function rotationMatrix(rxDeg, ryDeg, rzDeg) {
        const a = degToRad(rxDeg), b = degToRad(ryDeg), c = degToRad(rzDeg);
        const ca = Math.cos(a), sa = Math.sin(a);
        const cb = Math.cos(b), sb = Math.sin(b);
        const cc = Math.cos(c), sc = Math.sin(c);
        // ZYX Euler convention
        return [
            [cc*cb,  cc*sb*sa - sc*ca,  cc*sb*ca + sc*sa],
            [sc*cb,  sc*sb*sa + cc*ca,  sc*sb*ca - cc*sa],
            [-sb,    cb*sa,             cb*ca            ],
        ];
    }

    function matVec3(M, v) {
        return [
            M[0][0]*v[0] + M[0][1]*v[1] + M[0][2]*v[2],
            M[1][0]*v[0] + M[1][1]*v[1] + M[1][2]*v[2],
            M[2][0]*v[0] + M[2][1]*v[1] + M[2][2]*v[2],
        ];
    }


    function fmt(n, d=2) {
        return Number(n).toFixed(d);
    }

    // ---- Read slider values ----
    function readParams() {
        return {
            pw: [parseFloat(sliders.pwX.value), parseFloat(sliders.pwY.value), parseFloat(sliders.pwZ.value)],
            rot: [parseFloat(sliders.rotX.value), parseFloat(sliders.rotY.value), parseFloat(sliders.rotZ.value)],
            t: [parseFloat(sliders.tx.value), parseFloat(sliders.ty.value), parseFloat(sliders.tz.value)],
            fx: parseFloat(sliders.fx.value),
            fy: parseFloat(sliders.fy.value),
            cx: parseFloat(sliders.cx.value),
            cy: parseFloat(sliders.cy.value),
            skew: parseFloat(sliders.skew.value),
        };
    }

    // ---- Compute transforms ----
    function computeTransforms(params) {
        // Convention: Xc = forward (depth), Yc = right, Zc = up.
        // With R=I, camera looks along world +X.
        const R = rotationMatrix(params.rot[0], params.rot[1], params.rot[2]);
        const pw = params.pw;
        const t = params.t;

        // Camera point: Pc = R * (Pw − t)  where t = camera position in world frame
        const Rpw = matVec3(R, [pw[0]-t[0], pw[1]-t[1], pw[2]-t[2]]);
        const pc = Rpw;

        // Intrinsic projection — Xc-forward convention:
        //   Camera frame: X=forward, Z=up  →  right-hand rule: right = -(X×Z) = +Y...
        //   but physically: facing +X with +Z up → right = forward×up = X×Z = -Y.
        //   So camera RIGHT = -Yc, camera LEFT = +Yc.
        //   u = cx - fx*(Yc/Xc) + skew*(Zc/Xc)   [+Yc = camera left → u < cx]
        //   v = cy + fy*(Zc/Xc)                   [+Zc = camera up  → v > cy]
        // K expressed so that q = K * Pc gives (u*Xc, v*Xc, Xc):
        const K = [
            [params.cx, -params.fx, params.skew],
            [params.cy, 0,          params.fy  ],
            [1,         0,          0           ],
        ];
        const q = matVec3(K, pc);
        const behindCamera = pc[0] <= 0;   // Xc is depth
        const u = behindCamera ? NaN : q[0] / q[2];
        const v = behindCamera ? NaN : q[1] / q[2];

        return { R, pw, t, pc, K, q, u, v, behindCamera };
    }

    // ---- Matrix HTML helpers ----
    function matrixHTML(rows, cellClass) {
        const cls = cellClass || '';
        let html = '<div class="matrix"><table class="matrix-table">';
        for (const row of rows) {
            html += '<tr>';
            for (const cell of row) {
                html += `<td class="${cls}">${cell}</td>`;
            }
            html += '</tr>';
        }
        html += '</table></div>';
        return html;
    }

    // ---- Update formula displays ----
    function updateFormulas(data) {
        const { R, pw, t, pc, K, q, u, v, behindCamera } = data;
        const warnBadge = behindCamera ? '<span class="warning-badge">Behind Camera</span>' : '';

        // World point (homogeneous)
        document.getElementById('formula-pw').innerHTML =
            `P<sub>w</sub> = ` +
            matrixHTML([[`<span class="val-world">${fmt(pw[0])}</span>`],
                        [`<span class="val-world">${fmt(pw[1])}</span>`],
                        [`<span class="val-world">${fmt(pw[2])}</span>`],
                        [`<span class="val-highlight">1</span>`]], '');

        // Extrinsic 4x4
        document.getElementById('formula-extrinsic').innerHTML =
            `[R | t] = ` +
            matrixHTML([
                [fmt(R[0][0]), fmt(R[0][1]), fmt(R[0][2]), `<span class="val-camera">${fmt(t[0])}</span>`],
                [fmt(R[1][0]), fmt(R[1][1]), fmt(R[1][2]), `<span class="val-camera">${fmt(t[1])}</span>`],
                [fmt(R[2][0]), fmt(R[2][1]), fmt(R[2][2]), `<span class="val-camera">${fmt(t[2])}</span>`],
                ['0', '0', '0', '1'],
            ], '');

        // Camera point
        document.getElementById('formula-pc').innerHTML =
            `P<sub>c</sub> = ` +
            matrixHTML([[`<span class="val-camera">${fmt(pc[0])}</span>`],
                        [`<span class="val-camera">${fmt(pc[1])}</span>`],
                        [`<span class="val-camera">${fmt(pc[2])}</span>`],
                        [`<span class="val-highlight">1</span>`]], '') + warnBadge;

        // Camera point (right panel)
        document.getElementById('formula-pc2').innerHTML =
            `P<sub>c</sub> = ` +
            matrixHTML([[`<span class="val-camera">${fmt(pc[0])}</span>`],
                        [`<span class="val-camera">${fmt(pc[1])}</span>`],
                        [`<span class="val-camera">${fmt(pc[2])}</span>`]], '') + warnBadge;

        // Intrinsic K (Xc-forward: u = cx − fx·(Yc/Xc), v = cy + fy·(Zc/Xc))
        document.getElementById('formula-intrinsic').innerHTML =
            `K = ` +
            matrixHTML([
                [`<span class="val-intrinsic">${fmt(K[0][0],0)}</span>`, `<span class="val-intrinsic">${fmt(K[0][1],0)}</span>`, `<span class="val-intrinsic">${fmt(K[0][2],0)}</span>`],
                [`<span class="val-intrinsic">${fmt(K[1][0],0)}</span>`, `0`, `<span class="val-intrinsic">${fmt(K[1][2],0)}</span>`],
                [`1`, `0`, `0`],
            ], '');

        // Projected q
        document.getElementById('formula-proj').innerHTML =
            `q = ` +
            matrixHTML([[`<span class="val-image">${fmt(q[0])}</span>`],
                        [`<span class="val-image">${fmt(q[1])}</span>`],
                        [`<span class="val-image">${fmt(q[2])}</span>`]], '') + warnBadge;

        // Final pixel
        const uStr = behindCamera ? '<span class="val-image">N/A</span>' : `<span class="val-image">${fmt(u, 1)}</span>`;
        const vStr = behindCamera ? '<span class="val-image">N/A</span>' : `<span class="val-image">${fmt(v, 1)}</span>`;
        document.getElementById('formula-uv').innerHTML =
            `(u, v) = (${uStr}, ${vStr})` + warnBadge;

        // Full pipeline
        document.getElementById('formula-full-pipeline').innerHTML =
            `<span class="val-image">q</span>` +
            `<span class="operator">=</span>` +
            `<span class="val-intrinsic">K</span>` +
            `<span class="operator">·</span>` +
            `<span class="val-camera">R</span>` +
            `<span class="operator">·</span>` +
            `<span class="operator">(</span>` +
            `<span class="val-world">P<sub>w</sub></span>` +
            `<span class="operator">−</span>` +
            `<span class="val-camera">t</span>` +
            `<span class="operator">)</span>` +
            `<br>` +
            `<span style="color:var(--text-dim)">Pixel: (u, v) = (q<sub>1</sub>/q<sub>3</sub> , q<sub>2</sub>/q<sub>3</sub>)  where q<sub>3</sub> = X<sub>c</sub> (depth),  t = camera position in world</span>` +
            `<br>` +
            `<span style="color:var(--text-dim)">(u, v) = (${uStr}, ${vStr})</span>`;
    }

    // ============================================================
    //  LEFT PANEL: 3D scene (Three.js)
    // ============================================================
    const canvas3d = document.getElementById('canvas-3d');
    const renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();

    // Orbit-like static camera for the overview scene
    const cam3d = new THREE.PerspectiveCamera(50, 4/3, 0.1, 100);
    cam3d.position.set(10, -10, 8);
    cam3d.lookAt(0, 0, 0);

    // Lights
    scene.add(new THREE.AmbientLight(0x6080c0, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Ground grid
    const gridHelper = new THREE.GridHelper(10, 10, 0x2a3560, 0x1a2040);
    gridHelper.rotation.x = Math.PI / 2;
    scene.add(gridHelper);

    // World axes (thick lines)
    function makeAxis(dir, color, len) {
        const geom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0,0,0),
            new THREE.Vector3(dir[0]*len, dir[1]*len, dir[2]*len),
        ]);
        const mat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
        return new THREE.Line(geom, mat);
    }
    const worldAxes = new THREE.Group();
    worldAxes.add(makeAxis([1,0,0], 0xff4444, 3)); // X red
    worldAxes.add(makeAxis([0,1,0], 0x44ff44, 3)); // Y green
    worldAxes.add(makeAxis([0,0,1], 0x4488ff, 3)); // Z blue
    scene.add(worldAxes);

    // World axis labels (sprites)
    function makeLabel(text, position, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.font = 'bold 48px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 32, 32);
        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(0.5, 0.5, 0.5);
        sprite.position.set(...position);
        return sprite;
    }
    scene.add(makeLabel('Xw', [3.4, 0, 0], '#ff4444'));
    scene.add(makeLabel('Yw', [0, 3.4, 0], '#44ff44'));
    scene.add(makeLabel('Zw', [0, 0, 3.4], '#4488ff'));

    // World point sphere
    const pointGeom = new THREE.SphereGeometry(0.15, 24, 24);
    const pointMat = new THREE.MeshStandardMaterial({ color: 0xfb923c, emissive: 0xfb923c, emissiveIntensity: 0.5 });
    const pointSphere = new THREE.Mesh(pointGeom, pointMat);
    scene.add(pointSphere);

    // World point glow (larger translucent sphere)
    const pointGlowGeom = new THREE.SphereGeometry(0.3, 16, 16);
    const pointGlowMat = new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0.15 });
    const pointGlow = new THREE.Mesh(pointGlowGeom, pointGlowMat);
    scene.add(pointGlow);

    // Camera frustum visualization
    const cameraGroup = new THREE.Group();
    scene.add(cameraGroup);

    // Camera body (box) — elongated along local X (Xc = forward)
    const camBodyGeom = new THREE.BoxGeometry(0.6, 0.35, 0.5);
    const camBodyMat = new THREE.MeshStandardMaterial({ color: 0x5b8cff, emissive: 0x3366cc, emissiveIntensity: 0.3, transparent: true, opacity: 0.85 });
    const camBody = new THREE.Mesh(camBodyGeom, camBodyMat);
    cameraGroup.add(camBody);

    // Camera lens — points along local +X (Xc = forward)
    const lensGeom = new THREE.CylinderGeometry(0.12, 0.15, 0.25, 16);
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x222244, emissive: 0x111122, emissiveIntensity: 0.2 });
    const lens = new THREE.Mesh(lensGeom, lensMat);
    lens.rotation.z = -Math.PI / 2;   // CylinderGeometry axis is Y; rotate to align with X
    lens.position.x = 0.42;
    cameraGroup.add(lens);

    // Camera axes
    const camAxes = new THREE.Group();
    camAxes.add(makeAxis([1,0,0], 0xff6666, 1.5));
    camAxes.add(makeAxis([0,1,0], 0x66ff66, 1.5));
    camAxes.add(makeAxis([0,0,1], 0x6688ff, 1.5));
    cameraGroup.add(camAxes);

    // Camera axis labels
    const camLabelXc = makeLabel('Xc', [1.7, 0, 0], '#ff6666');
    const camLabelYc = makeLabel('Yc', [0, 1.7, 0], '#66ff66');
    const camLabelZc = makeLabel('Zc', [0, 0, 1.7], '#6688ff');
    cameraGroup.add(camLabelXc);
    cameraGroup.add(camLabelYc);
    cameraGroup.add(camLabelZc);

    // Frustum wireframe
    const frustumGeom = new THREE.BufferGeometry();
    const frustumVerts = new Float32Array(8 * 3);
    frustumGeom.setAttribute('position', new THREE.BufferAttribute(frustumVerts, 3));
    const frustumIndices = [
        0,1, 1,3, 3,2, 2,0,  // near
        4,5, 5,7, 7,6, 6,4,  // far
        0,4, 1,5, 2,6, 3,7,  // connecting
    ];
    frustumGeom.setIndex(frustumIndices);
    const frustumMat = new THREE.LineBasicMaterial({ color: 0x5b8cff, transparent: true, opacity: 0.35 });
    const frustumLines = new THREE.LineSegments(frustumGeom, frustumMat);
    cameraGroup.add(frustumLines);

    function updateFrustum(fovDeg, aspect, near, far) {
        const halfH_n = near * Math.tan(degToRad(fovDeg / 2));
        const halfW_n = halfH_n * aspect;
        const halfH_f = far * Math.tan(degToRad(fovDeg / 2));
        const halfW_f = halfH_f * aspect;
        const p = frustumGeom.attributes.position.array;
        // Xc-forward: near/far planes at x=near/far, corners in YZ plane
        // near plane corners (x=near, y=±halfW, z=±halfH)
        p[0] = near; p[1] = -halfW_n; p[2] = -halfH_n;
        p[3] = near; p[4] =  halfW_n; p[5] = -halfH_n;
        p[6] = near; p[7] = -halfW_n; p[8] =  halfH_n;
        p[9] = near; p[10]=  halfW_n; p[11]=  halfH_n;
        // far plane corners (x=far)
        p[12]= far;  p[13]= -halfW_f; p[14]= -halfH_f;
        p[15]= far;  p[16]=  halfW_f; p[17]= -halfH_f;
        p[18]= far;  p[19]= -halfW_f; p[20]=  halfH_f;
        p[21]= far;  p[22]=  halfW_f; p[23]=  halfH_f;
        frustumGeom.attributes.position.needsUpdate = true;
    }
    updateFrustum(50, 4/3, 0.3, 3);

    // Line from camera to world point
    const lineToPointGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0)
    ]);
    const lineToPointMat = new THREE.LineDashedMaterial({ color: 0xfb923c, dashSize: 0.15, gapSize: 0.1, transparent: true, opacity: 0.6 });
    const lineToPoint = new THREE.Line(lineToPointGeom, lineToPointMat);
    lineToPoint.computeLineDistances();
    scene.add(lineToPoint);

    // Camera point in camera frame (smaller sphere)
    const camPointGeom = new THREE.SphereGeometry(0.12, 16, 16);
    const camPointMat = new THREE.MeshStandardMaterial({ color: 0x5b8cff, emissive: 0x5b8cff, emissiveIntensity: 0.4 });
    const camPointSphere = new THREE.Mesh(camPointGeom, camPointMat);
    scene.add(camPointSphere);

    // ---- Update 3D scene ----
    function update3DScene(params, data) {
        const { pw, R, t, pc } = data;

        // World point
        pointSphere.position.set(pw[0], pw[1], pw[2]);
        pointGlow.position.copy(pointSphere.position);

        // Camera position & orientation
        // The camera is at position -R^T * t in world coords
        // But for visualization, we set the camera group transform
        // t = camera position in world frame → camera origin is just t
        const RT = [
            [R[0][0], R[1][0], R[2][0]],
            [R[0][1], R[1][1], R[2][1]],
            [R[0][2], R[1][2], R[2][2]],
        ];
        const camOriginWorld = [t[0], t[1], t[2]];

        // Set camera group transform using the full 4x4 matrix
        // The extrinsic maps world→camera, so the camera pose in world is the inverse
        const m = new THREE.Matrix4();
        m.set(
            RT[0][0], RT[0][1], RT[0][2], camOriginWorld[0],
            RT[1][0], RT[1][1], RT[1][2], camOriginWorld[1],
            RT[2][0], RT[2][1], RT[2][2], camOriginWorld[2],
            0, 0, 0, 1
        );
        cameraGroup.matrix.copy(m);
        cameraGroup.matrixAutoUpdate = false;
        cameraGroup.matrixWorldNeedsUpdate = true;

        // Line from camera origin to world point
        const positions = lineToPointGeom.attributes.position.array;
        positions[0] = camOriginWorld[0]; positions[1] = camOriginWorld[1]; positions[2] = camOriginWorld[2];
        positions[3] = pw[0]; positions[4] = pw[1]; positions[5] = pw[2];
        lineToPointGeom.attributes.position.needsUpdate = true;
        lineToPoint.computeLineDistances();

        // Camera point projected into world frame for visualization
        // pc is in camera frame; to show it in world frame: Pw_of_pc = R^T * (pc - t)... 
        // Actually pc = R*pw + t, and the point in camera frame is pc.
        // To visualize where pc sits relative to camera axes drawn in world, 
        // we transform pc back: pw_back = R^T*(pc-t) which should equal pw.
        // Instead, let's show the point in the camera group's local space
        camPointSphere.position.set(pc[0], pc[1], pc[2]);
        // Place camPointSphere as child of cameraGroup temporarily
        if (camPointSphere.parent !== cameraGroup) {
            scene.remove(camPointSphere);
            cameraGroup.add(camPointSphere);
        }
    }

    // ---- Orbit controls (simple manual) ----
    let orbitTheta = Math.PI / 4;                  // θ=0 is +X axis; start at 45° for isometric spread
    let orbitPhi = Math.acos(1 / Math.sqrt(3));    // true isometric elevation (~54.7° from zenith)
    let orbitRadius = 18;
    let isDragging = false;
    let lastMouse = { x: 0, y: 0 };

    canvas3d.addEventListener('mousedown', (e) => { isDragging = true; lastMouse = { x: e.clientX, y: e.clientY }; });
    canvas3d.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - lastMouse.x;
        const dy = e.clientY - lastMouse.y;
        orbitTheta -= dx * 0.005;
        orbitPhi = Math.max(0.1, Math.min(Math.PI - 0.1, orbitPhi - dy * 0.005));
        lastMouse = { x: e.clientX, y: e.clientY };
    });
    canvas3d.addEventListener('mouseup', () => { isDragging = false; });
    canvas3d.addEventListener('mouseleave', () => { isDragging = false; });
    canvas3d.addEventListener('wheel', (e) => {
        e.preventDefault();
        orbitRadius = Math.max(3, Math.min(30, orbitRadius + e.deltaY * 0.01));
    }, { passive: false });

    // Touch support
    canvas3d.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isDragging = true;
            lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    });
    canvas3d.addEventListener('touchmove', (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        e.preventDefault();
        const dx = e.touches[0].clientX - lastMouse.x;
        const dy = e.touches[0].clientY - lastMouse.y;
        orbitTheta -= dx * 0.005;
        orbitPhi = Math.max(0.1, Math.min(Math.PI - 0.1, orbitPhi - dy * 0.005));
        lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: false });
    canvas3d.addEventListener('touchend', () => { isDragging = false; });

    function updateOrbitCamera() {
        cam3d.position.set(
            orbitRadius * Math.sin(orbitPhi) * Math.cos(orbitTheta),
            orbitRadius * Math.sin(orbitPhi) * Math.sin(orbitTheta),
            orbitRadius * Math.cos(orbitPhi)
        );
        cam3d.lookAt(0, 0, 0);
    }

    // ============================================================
    //  RIGHT PANEL: 2D Canvas (Image Plane / Viewport)
    // ============================================================
    const canvas2d = document.getElementById('canvas-2d');
    const ctx2d = canvas2d.getContext('2d');

    function draw2DViewport(params, data) {
        const { u, v, behindCamera, pc, K } = data;
        const dpr = Math.min(window.devicePixelRatio, 2);
        const rect = canvas2d.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        canvas2d.width = w * dpr;
        canvas2d.height = h * dpr;
        ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Image dimensions based on principal point (double it for a symmetric-ish viewport)
        const imgW = params.cx * 2;
        const imgH = params.cy * 2;

        // Scale to fit canvas
        const scale = Math.min(w / imgW, h / imgH) * 0.85;
        const offX = (w - imgW * scale) / 2;
        const offY = (h - imgH * scale) / 2;

        // Coordinate mapping helpers
        // u maps normally (left to right)
        // v is FLIPPED: v=0 at bottom, v=imgH at top (viewfinder perspective)
        // This corrects the Y-up (3D scene) vs Y-down (image coords) mismatch
        function mapX(uVal) { return offX + uVal * scale; }
        function mapY(vVal) { return offY + imgH * scale - vVal * scale; }

        // Background
        ctx2d.fillStyle = '#080c18';
        ctx2d.fillRect(0, 0, w, h);

        // Image plane background with subtle vignette
        const vignette = ctx2d.createRadialGradient(w/2, h/2, 0, w/2, h/2, w * 0.6);
        vignette.addColorStop(0, 'rgba(20, 30, 55, 0.95)');
        vignette.addColorStop(1, 'rgba(10, 15, 30, 0.95)');
        ctx2d.fillStyle = vignette;
        ctx2d.fillRect(offX, offY, imgW * scale, imgH * scale);
        ctx2d.strokeStyle = 'rgba(91, 140, 255, 0.3)';
        ctx2d.lineWidth = 1.5;
        ctx2d.strokeRect(offX, offY, imgW * scale, imgH * scale);

        // Grid lines
        ctx2d.strokeStyle = 'rgba(91, 140, 255, 0.06)';
        ctx2d.lineWidth = 0.5;
        const gridStep = 50;
        for (let gx = 0; gx <= imgW; gx += gridStep) {
            ctx2d.beginPath();
            ctx2d.moveTo(mapX(gx), offY);
            ctx2d.lineTo(mapX(gx), offY + imgH * scale);
            ctx2d.stroke();
        }
        for (let gy = 0; gy <= imgH; gy += gridStep) {
            ctx2d.beginPath();
            ctx2d.moveTo(offX, mapY(gy));
            ctx2d.lineTo(offX + imgW * scale, mapY(gy));
            ctx2d.stroke();
        }

        // Tick marks along bottom edge (u axis)
        ctx2d.fillStyle = 'rgba(148, 163, 192, 0.35)';
        ctx2d.font = '8px "JetBrains Mono", monospace';
        ctx2d.textAlign = 'center';
        for (let gx = 0; gx <= imgW; gx += 100) {
            const tx = mapX(gx);
            ctx2d.strokeStyle = 'rgba(91, 140, 255, 0.15)';
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            ctx2d.moveTo(tx, offY + imgH * scale);
            ctx2d.lineTo(tx, offY + imgH * scale + 4);
            ctx2d.stroke();
            ctx2d.fillText(gx.toString(), tx, offY + imgH * scale + 14);
        }
        // Tick marks along left edge (v axis)
        ctx2d.textAlign = 'right';
        for (let gy = 0; gy <= imgH; gy += 100) {
            const ty = mapY(gy);
            ctx2d.strokeStyle = 'rgba(91, 140, 255, 0.15)';
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            ctx2d.moveTo(offX, ty);
            ctx2d.lineTo(offX - 4, ty);
            ctx2d.stroke();
            ctx2d.fillText(gy.toString(), offX - 6, ty + 3);
        }
        ctx2d.textAlign = 'start';

        // Principal point crosshair
        const ppx = mapX(params.cx);
        const ppy = mapY(params.cy);
        ctx2d.strokeStyle = 'rgba(139, 92, 246, 0.4)';
        ctx2d.lineWidth = 1;
        ctx2d.setLineDash([4, 4]);
        ctx2d.beginPath();
        ctx2d.moveTo(ppx, offY);
        ctx2d.lineTo(ppx, offY + imgH * scale);
        ctx2d.stroke();
        ctx2d.beginPath();
        ctx2d.moveTo(offX, ppy);
        ctx2d.lineTo(offX + imgW * scale, ppy);
        ctx2d.stroke();
        ctx2d.setLineDash([]);

        // Principal point marker
        ctx2d.fillStyle = 'rgba(139, 92, 246, 0.6)';
        ctx2d.beginPath();
        ctx2d.arc(ppx, ppy, 3.5, 0, Math.PI * 2);
        ctx2d.fill();

        // Label principal point
        ctx2d.fillStyle = 'rgba(139, 92, 246, 0.7)';
        ctx2d.font = '10px "JetBrains Mono", monospace';
        ctx2d.fillText(`(cx=${fmt(params.cx,0)}, cy=${fmt(params.cy,0)})`, ppx + 6, ppy - 6);

        // Projected point
        if (!behindCamera && isFinite(u) && isFinite(v)) {
            const px = mapX(u);
            const py = mapY(v);
            const imgLeft = offX;
            const imgRight = offX + imgW * scale;
            const imgTop = offY;
            const imgBottom = offY + imgH * scale;
            const inBounds = px >= imgLeft && px <= imgRight && py >= imgTop && py <= imgBottom;

            // Clamp position for drawing when out of bounds
            const margin = 15;
            const drawPx = Math.max(imgLeft + margin, Math.min(imgRight - margin, px));
            const drawPy = Math.max(imgTop + margin, Math.min(imgBottom - margin, py));

            // Projection line from principal point to projected point
            ctx2d.strokeStyle = inBounds ? 'rgba(251, 146, 60, 0.35)' : 'rgba(248, 113, 113, 0.25)';
            ctx2d.lineWidth = 1;
            ctx2d.setLineDash([3, 3]);
            ctx2d.beginPath();
            ctx2d.moveTo(ppx, ppy);
            if (inBounds) {
                ctx2d.lineTo(px, py);
            } else {
                ctx2d.lineTo(drawPx, drawPy);
            }
            ctx2d.stroke();
            ctx2d.setLineDash([]);

            if (inBounds) {
                // Point glow
                const gradient = ctx2d.createRadialGradient(px, py, 0, px, py, 25);
                gradient.addColorStop(0, 'rgba(251, 146, 60, 0.45)');
                gradient.addColorStop(0.5, 'rgba(251, 146, 60, 0.1)');
                gradient.addColorStop(1, 'transparent');
                ctx2d.fillStyle = gradient;
                ctx2d.beginPath();
                ctx2d.arc(px, py, 25, 0, Math.PI * 2);
                ctx2d.fill();

                // Point dot
                ctx2d.fillStyle = '#fb923c';
                ctx2d.beginPath();
                ctx2d.arc(px, py, 6, 0, Math.PI * 2);
                ctx2d.fill();
                ctx2d.strokeStyle = 'rgba(251, 146, 60, 0.8)';
                ctx2d.lineWidth = 2;
                ctx2d.beginPath();
                ctx2d.arc(px, py, 6, 0, Math.PI * 2);
                ctx2d.stroke();

                // Coordinates label
                ctx2d.fillStyle = '#e8ecf4';
                ctx2d.font = '12px "JetBrains Mono", monospace';
                const labelText = `(${fmt(u,1)}, ${fmt(v,1)})`;
                const textMetrics = ctx2d.measureText(labelText);
                const textOff = px > imgRight - textMetrics.width - 20 ? -textMetrics.width - 12 : 12;
                const textYOff = py < imgTop + 25 ? 20 : -12;
                ctx2d.fillText(labelText, px + textOff, py + textYOff);
            } else {
                // Out of bounds: draw arrow at edge pointing toward actual position
                const angle = Math.atan2(py - ppy, px - ppx);

                // Arrow head at clamped position
                ctx2d.save();
                ctx2d.translate(drawPx, drawPy);
                ctx2d.rotate(angle);
                ctx2d.fillStyle = 'rgba(248, 113, 113, 0.8)';
                ctx2d.beginPath();
                ctx2d.moveTo(8, 0);
                ctx2d.lineTo(-5, -5);
                ctx2d.lineTo(-5, 5);
                ctx2d.closePath();
                ctx2d.fill();
                ctx2d.restore();

                // Small dot at clamped position
                ctx2d.fillStyle = 'rgba(248, 113, 113, 0.5)';
                ctx2d.beginPath();
                ctx2d.arc(drawPx, drawPy, 4, 0, Math.PI * 2);
                ctx2d.fill();

                // Out of frame label at top-right corner
                ctx2d.fillStyle = 'rgba(248, 113, 113, 0.85)';
                ctx2d.font = '11px "JetBrains Mono", monospace';
                ctx2d.textAlign = 'right';
                ctx2d.fillText(`Out of frame: (${fmt(u,1)}, ${fmt(v,1)})`, imgRight - 5, imgTop + 15);
                ctx2d.textAlign = 'start';
            }
        } else {
            // Behind camera message
            ctx2d.fillStyle = 'rgba(248, 113, 113, 0.8)';
            ctx2d.font = '14px "Inter", sans-serif';
            ctx2d.textAlign = 'center';
            ctx2d.fillText('Point is behind the camera (Xc ≤ 0)', w / 2, h / 2);
            ctx2d.font = '11px "Inter", sans-serif';
            ctx2d.fillStyle = 'rgba(248, 113, 113, 0.5)';
            ctx2d.fillText('Move the world point or adjust camera translation', w / 2, h / 2 + 22);
            ctx2d.textAlign = 'start';
        }

        // Axis labels
        ctx2d.fillStyle = 'rgba(148, 163, 192, 0.6)';
        ctx2d.font = '10px "JetBrains Mono", monospace';
        ctx2d.fillText('u →', offX + 4, offY + imgH * scale + 24);
        ctx2d.save();
        ctx2d.translate(offX - 14, offY + imgH * scale - 4);
        ctx2d.rotate(-Math.PI / 2);
        ctx2d.fillText('v →', 0, 0);
        ctx2d.restore();

        // Image dimensions
        ctx2d.fillStyle = 'rgba(148, 163, 192, 0.4)';
        ctx2d.font = '9px "JetBrains Mono", monospace';
        ctx2d.textAlign = 'right';
        ctx2d.fillText(`${imgW}×${imgH} px`, offX + imgW * scale, offY + imgH * scale + 24);
        ctx2d.textAlign = 'start';
    }



    // ============================================================
    //  Main update loop
    // ============================================================
    function updateAll() {
        const params = readParams();

        // Update value labels
        valLabels.pwX.textContent = fmt(params.pw[0], 1);
        valLabels.pwY.textContent = fmt(params.pw[1], 1);
        valLabels.pwZ.textContent = fmt(params.pw[2], 1);
        valLabels.rotX.textContent = params.rot[0] + '°';
        valLabels.rotY.textContent = params.rot[1] + '°';
        valLabels.rotZ.textContent = params.rot[2] + '°';
        valLabels.tx.textContent = fmt(params.t[0], 1);
        valLabels.ty.textContent = fmt(params.t[1], 1);
        valLabels.tz.textContent = fmt(params.t[2], 1);
        valLabels.fx.textContent = Math.round(params.fx);
        valLabels.fy.textContent = Math.round(params.fy);
        valLabels.cx.textContent = Math.round(params.cx);
        valLabels.cy.textContent = Math.round(params.cy);
        valLabels.skew.textContent = Math.round(params.skew);

        // Compute
        const data = computeTransforms(params);

        // Update formulas
        updateFormulas(data);

        // Update 3D scene
        update3DScene(params, data);

        // Update 2D viewport
        draw2DViewport(params, data);
    }

    // Attach slider listeners
    Object.values(sliders).forEach(s => s.addEventListener('input', updateAll));

    // ---- Resize handling ----
    function handleResize() {
        const container = canvas3d.parentElement;
        const w = container.clientWidth;
        const h = container.clientHeight;
        renderer.setSize(w, h);
        cam3d.aspect = w / h;
        cam3d.updateProjectionMatrix();
        updateAll();
    }

    window.addEventListener('resize', handleResize);

    // ---- Animation loop ----
    let animTime = 0;
    function animate() {
        requestAnimationFrame(animate);
        animTime += 0.01;

        // Orbit camera
        updateOrbitCamera();

        // Gentle glow animation
        pointGlowMat.opacity = 0.1 + 0.08 * Math.sin(animTime * 2);

        renderer.render(scene, cam3d);
    }

    // ---- Initialize ----
    handleResize();
    updateAll();
    animate();

    // Intersection observer for smooth entrance (concept cards)
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.concept-card, .pipeline-step').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

})();
