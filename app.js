// ============================================================
//  Camera Projection Explorer — Main Application Logic
// ============================================================

(function () {
    'use strict';

    // ---- Coordinate System Presets ----
    // Each preset defines the world up axis, default camera orientation (RBase),
    // projection image-vector mapping (pImg), and frustum back-projection for a popular tool/API.
    const COORDINATE_PRESETS = {
        'isaac-sim': {
            label: 'Isaac Sim / USD',
            handedness: 'right',
            worldUp: [0, 0, 1],
            camConvention: '+X right, +Y up, −Z forward',
            resetRot: [0, 90, 0],
            camUp: [0, 1, 0],
            camForward: [0, 0, -1],
            RBase: [[1,0,0],[0,1,0],[0,0,1]],
            pImg: (pc) => [pc[0], -pc[1], -pc[2]],
            behind: (pImg) => pImg[2] <= 0,
            projVec: '[X<sub>c</sub>, −Y<sub>c</sub>, −Z<sub>c</sub>]<sup>T</sup>',
            projExpl: [
                '<b>X<sub>c</sub></b>: camera +X = right → u increases rightward ✓',
                '<b>−Y<sub>c</sub></b>: camera +Y = up, image v↓ so negate to flip direction ✓',
                '<b>−Z<sub>c</sub></b>: camera −Z = forward; dividing by −Z<sub>c</sub> gives positive depth ✓',
            ],
            frustumImgToCamera: (u, v, d, p) => {
                const yIZ = (v - p.cy) / p.fy;
                const xIZ = (u - p.cx - p.skew * yIZ) / p.fx;
                return [xIZ * d, -yIZ * d, -d];
            },
            subtitle: 'Right-hand · Z-up · Camera: +X right, +Y up, −Z forward (USD/Isaac Sim). Zero rotation looks toward world −Z.',
            refUrl: 'https://docs.isaacsim.omniverse.nvidia.com/5.0.0/reference_material/reference_conventions.html',
            refLabel: 'Isaac Sim Conventions',
            vDown: true,
            uvRef: 'https://docs.isaacsim.omniverse.nvidia.com/5.0.0/reference_material/reference_conventions.html',
            uvRefLabel: 'Isaac Sim Conventions',
        },
        'blender': {
            label: 'Blender',
            handedness: 'right',
            worldUp: [0, 0, 1],
            camConvention: '+X right, +Y up, −Z forward',
            resetRot: [0, 90, 0],
            camUp: [0, 1, 0],
            camForward: [0, 0, -1],
            RBase: [[1,0,0],[0,1,0],[0,0,1]],
            pImg: (pc) => [pc[0], -pc[1], -pc[2]],
            behind: (pImg) => pImg[2] <= 0,
            projVec: '[X<sub>c</sub>, −Y<sub>c</sub>, −Z<sub>c</sub>]<sup>T</sup>',
            projExpl: [
                '<b>X<sub>c</sub></b>: camera +X = right → u increases rightward ✓',
                '<b>−Y<sub>c</sub></b>: camera +Y = up, rendered image v↓ so negate to flip direction ✓',
                '<b>−Z<sub>c</sub></b>: camera −Z = forward; dividing by −Z<sub>c</sub> gives positive depth ✓',
            ],
            frustumImgToCamera: (u, v, d, p) => {
                const yIZ = (v - p.cy) / p.fy;
                const xIZ = (u - p.cx - p.skew * yIZ) / p.fx;
                return [xIZ * d, -yIZ * d, -d];
            },
            subtitle: 'Right-hand · Z-up · Camera: +X right, +Y up, −Z forward. Zero rotation looks toward world −Z.',
            refUrl: 'https://docs.blender.org/manual/en/2.79/editors/3dview/navigate/align.html',
            refLabel: 'Blender Manual – Viewpoint',
            vDown: true,
            uvRef: 'https://blenderartists.org/t/uv-map-origin/1484053',
            uvRefLabel: 'Blender Artists – UV map origin',
        },
        'opengl': {
            label: 'OpenGL',
            handedness: 'right',
            worldUp: [0, 1, 0],
            camConvention: '+X right, +Y up, −Z forward',
            resetRot: [0, 0, 0],
            camUp: [0, 1, 0],
            camForward: [0, 0, -1],
            RBase: [[1,0,0],[0,1,0],[0,0,1]],
            pImg: (pc) => [pc[0], pc[1], -pc[2]],
            behind: (pImg) => pImg[2] <= 0,
            projVec: '[X<sub>c</sub>, Y<sub>c</sub>, −Z<sub>c</sub>]<sup>T</sup>',
            projExpl: [
                '<b>X<sub>c</sub></b>: camera +X = right → u increases rightward ✓',
                '<b>Y<sub>c</sub></b>: camera +Y = up, image v↑ (bottom-left origin) → keep sign, larger Y gives larger v ✓',
                '<b>−Z<sub>c</sub></b>: camera −Z = forward; dividing by −Z<sub>c</sub> gives positive depth ✓',
            ],
            frustumImgToCamera: (u, v, d, p) => {
                const yIZ = (v - p.cy) / p.fy;
                const xIZ = (u - p.cx - p.skew * yIZ) / p.fx;
                return [xIZ * d, yIZ * d, -d];
            },
            subtitle: 'Right-hand · Y-up · Camera: +X right, +Y up, −Z forward. Looks toward world −Z at zero rotation.',
            refUrl: 'https://learnopengl.com/Getting-started/Coordinate-Systems',
            refLabel: 'LearnOpenGL – Coordinate Systems',
            vDown: false,
            uvRef: 'https://www.khronos.org/opengl/wiki/Texture',
            uvRefLabel: 'OpenGL Wiki – Texture',
        },
        'vulkan': {
            label: 'Vulkan',
            handedness: 'right',
            worldUp: [0, 1, 0],
            camConvention: '+X right, +Y up, −Z forward (NDC Y↓)',
            resetRot: [0, 0, 0],
            camUp: [0, 1, 0],
            camForward: [0, 0, -1],
            RBase: [[1,0,0],[0,1,0],[0,0,1]],
            pImg: (pc) => [pc[0], -pc[1], -pc[2]],
            behind: (pImg) => pImg[2] <= 0,
            projVec: '[X<sub>c</sub>, −Y<sub>c</sub>, −Z<sub>c</sub>]<sup>T</sup>',
            projExpl: [
                '<b>X<sub>c</sub></b>: camera +X = right → u increases rightward ✓',
                '<b>−Y<sub>c</sub></b>: same view-space axes as OpenGL; Vulkan NDC Y↓ differs only at the framebuffer stage ✓',
                '<b>−Z<sub>c</sub></b>: camera −Z = forward; dividing by −Z<sub>c</sub> gives positive depth ✓',
            ],
            frustumImgToCamera: (u, v, d, p) => {
                const yIZ = (v - p.cy) / p.fy;
                const xIZ = (u - p.cx - p.skew * yIZ) / p.fx;
                return [xIZ * d, -yIZ * d, -d];
            },
            subtitle: 'Right-hand · Y-up · Same 3D convention as OpenGL. Vulkan NDC Y↓ is a framebuffer-level flip, not a 3D scene change.',
            refUrl: 'https://matthewwellings.com/blog/the-new-vulkan-coordinate-system/',
            refLabel: 'The new Vulkan Coordinate System',
            vDown: true,
            uvRef: 'https://matthewwellings.com/blog/the-new-vulkan-coordinate-system/',
            uvRefLabel: 'The new Vulkan Coordinate System',
        },
        'godot': {
            label: 'Godot',
            handedness: 'right',
            worldUp: [0, 1, 0],
            camConvention: '+X right, +Y up, −Z forward',
            resetRot: [0, 0, 0],
            camUp: [0, 1, 0],
            camForward: [0, 0, -1],
            RBase: [[1,0,0],[0,1,0],[0,0,1]],
            pImg: (pc) => [pc[0], -pc[1], -pc[2]],
            behind: (pImg) => pImg[2] <= 0,
            projVec: '[X<sub>c</sub>, −Y<sub>c</sub>, −Z<sub>c</sub>]<sup>T</sup>',
            projExpl: [
                '<b>X<sub>c</sub></b>: camera +X = right → u increases rightward ✓',
                '<b>−Y<sub>c</sub></b>: camera +Y = up, image v↓ so negate to flip direction ✓',
                '<b>−Z<sub>c</sub></b>: camera −Z = forward; dividing by −Z<sub>c</sub> gives positive depth ✓',
            ],
            frustumImgToCamera: (u, v, d, p) => {
                const yIZ = (v - p.cy) / p.fy;
                const xIZ = (u - p.cx - p.skew * yIZ) / p.fx;
                return [xIZ * d, -yIZ * d, -d];
            },
            subtitle: 'Right-hand · Y-up · Camera: +X right, +Y up, −Z forward. Looks toward world −Z at zero rotation.',
            refUrl: 'https://learnopengl.com/Getting-started/Coordinate-Systems',
            refLabel: 'LearnOpenGL – Coordinate Systems',
            vDown: true,
            uvRef: 'https://docs.godotengine.org/en/stable/tutorials/shaders/shader_reference/shading_language.html',
            uvRefLabel: 'Godot UV Basics',
        },
        'unity': {
            label: 'Unity',
            handedness: 'left',
            worldUp: [0, 1, 0],
            camConvention: '+X right, +Y up, +Z forward',
            resetRot: [0, 0, 0],
            camUp: [0, 1, 0],
            camForward: [0, 0, 1],
            RBase: [[1,0,0],[0,1,0],[0,0,1]],
            pImg: (pc) => [pc[0], pc[1], pc[2]],
            behind: (pImg) => pImg[2] <= 0,
            projVec: '[X<sub>c</sub>, Y<sub>c</sub>, Z<sub>c</sub>]<sup>T</sup>',
            projExpl: [
                '<b>X<sub>c</sub></b>: camera +X = right → u increases rightward ✓',
                '<b>Y<sub>c</sub></b>: camera +Y = up, image v↑ (bottom-left origin) → keep sign, larger Y gives larger v ✓',
                '<b>Z<sub>c</sub></b>: camera +Z = forward; depth = Z<sub>c</sub> > 0 for front-facing points ✓',
            ],
            frustumImgToCamera: (u, v, d, p) => {
                const yIZ = (v - p.cy) / p.fy;
                const xIZ = (u - p.cx - p.skew * yIZ) / p.fx;
                return [xIZ * d, yIZ * d, d];
            },
            subtitle: 'Left-hand · Y-up · Camera: +X right, +Y up, +Z forward. Looks toward world +Z at zero rotation.',
            refUrl: 'https://techarthub.com/a-guide-to-unitys-coordinate-system-with-practical-examples/',
            refLabel: 'Unity Coordinate System – techarthub',
            vDown: false,
            uvRef: 'https://docs.unity3d.com/ScriptReference/Mesh-uv.html',
            uvRefLabel: 'Unity Docs – Mesh.uv',
        },
        'unreal': {
            label: 'Unreal Engine',
            handedness: 'left',
            worldUp: [0, 0, 1],
            camConvention: '+X forward, +Y right, +Z up',
            resetRot: [0, 0, 0],
            camUp: [0, 0, 1],
            camForward: [1, 0, 0],
            RBase: [[1,0,0],[0,1,0],[0,0,1]],
            pImg: (pc) => [pc[1], -pc[2], pc[0]],
            behind: (pImg) => pImg[2] <= 0,
            projVec: '[Y<sub>c</sub>, −Z<sub>c</sub>, X<sub>c</sub>]<sup>T</sup>',
            projExpl: [
                '<b>Y<sub>c</sub></b>: camera +Y = right → u increases rightward ✓',
                '<b>−Z<sub>c</sub></b>: camera +Z = up, image v↓ so negate to flip direction ✓',
                '<b>X<sub>c</sub></b>: camera +X = forward; depth = X<sub>c</sub> > 0 for front-facing points ✓',
            ],
            frustumImgToCamera: (u, v, d, p) => {
                const yIZ = (v - p.cy) / p.fy;
                const xIZ = (u - p.cx - p.skew * yIZ) / p.fx;
                return [d, xIZ * d, -yIZ * d];
            },
            subtitle: 'Left-hand · Z-up · Camera: +X forward, +Y right, +Z up. Looks toward world +X at zero rotation.',
            refUrl: 'https://techarthub.com/a-practical-guide-to-unreal-engines-coordinate-system/',
            refLabel: 'Unreal Coordinate System – techarthub',
            vDown: true,
            uvRef: 'https://www.clockworkberry.com/uv-coordinate-systems/',
            uvRefLabel: 'UV Coordinate Systems – A Clockwork Berry',
        },
        'directx': {
            label: 'DirectX',
            handedness: 'left',
            worldUp: [0, 1, 0],
            camConvention: '+X right, +Y up, +Z forward',
            resetRot: [0, 0, 0],
            camUp: [0, 1, 0],
            camForward: [0, 0, 1],
            RBase: [[1,0,0],[0,1,0],[0,0,1]],
            pImg: (pc) => [pc[0], -pc[1], pc[2]],
            behind: (pImg) => pImg[2] <= 0,
            projVec: '[X<sub>c</sub>, −Y<sub>c</sub>, Z<sub>c</sub>]<sup>T</sup>',
            projExpl: [
                '<b>X<sub>c</sub></b>: camera +X = right → u increases rightward ✓',
                '<b>−Y<sub>c</sub></b>: camera +Y = up, image v↓ so negate to flip direction ✓',
                '<b>Z<sub>c</sub></b>: camera +Z = forward; depth = Z<sub>c</sub> > 0 for front-facing points ✓',
            ],
            frustumImgToCamera: (u, v, d, p) => {
                const yIZ = (v - p.cy) / p.fy;
                const xIZ = (u - p.cx - p.skew * yIZ) / p.fx;
                return [xIZ * d, -yIZ * d, d];
            },
            subtitle: 'Left-hand · Y-up · Camera: +X right, +Y up, +Z forward. Looks toward world +Z at zero rotation.',
            refUrl: 'https://learn.microsoft.com/en-us/windows/win32/direct3d9/coordinate-systems',
            refLabel: 'Coordinate Systems (Direct3D 9) – Microsoft',
            vDown: true,
            uvRef: 'https://learn.microsoft.com/en-us/windows/win32/direct3d9/texture-coordinates',
            uvRefLabel: 'Texture Coordinates – D3D vs OpenGL',
        },
    };

    let activePresetId = 'isaac-sim';
    function activePreset() { return COORDINATE_PRESETS[activePresetId]; }

    THREE.Object3D.DefaultUp.set(0, 0, 1);

    // ---- DOM references ----
    const sliders = {
        pwX:  document.getElementById('pw-x'),
        pwY:  document.getElementById('pw-y'),
        pwZ:  document.getElementById('pw-z'),
        pwSize: document.getElementById('pw-size'),
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
        pwSize: document.getElementById('pw-size-val'),
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

    function applyPresetResetDefaults(preset) {
        const rotDefaults = preset.resetRot || [0, 0, 0];
        sliders.rotX.defaultValue = String(rotDefaults[0]);
        sliders.rotY.defaultValue = String(rotDefaults[1]);
        sliders.rotZ.defaultValue = String(rotDefaults[2]);
    }

    // ---- Math utilities ----
    function degToRad(d) { return d * Math.PI / 180; }

    function matVec3(M, v) {
        return [
            M[0][0]*v[0] + M[0][1]*v[1] + M[0][2]*v[2],
            M[1][0]*v[0] + M[1][1]*v[1] + M[1][2]*v[2],
            M[2][0]*v[0] + M[2][1]*v[1] + M[2][2]*v[2],
        ];
    }

    function matMul3(A, B) {
        return [
            [
                A[0][0]*B[0][0] + A[0][1]*B[1][0] + A[0][2]*B[2][0],
                A[0][0]*B[0][1] + A[0][1]*B[1][1] + A[0][2]*B[2][1],
                A[0][0]*B[0][2] + A[0][1]*B[1][2] + A[0][2]*B[2][2],
            ],
            [
                A[1][0]*B[0][0] + A[1][1]*B[1][0] + A[1][2]*B[2][0],
                A[1][0]*B[0][1] + A[1][1]*B[1][1] + A[1][2]*B[2][1],
                A[1][0]*B[0][2] + A[1][1]*B[1][2] + A[1][2]*B[2][2],
            ],
            [
                A[2][0]*B[0][0] + A[2][1]*B[1][0] + A[2][2]*B[2][0],
                A[2][0]*B[0][1] + A[2][1]*B[1][1] + A[2][2]*B[2][1],
                A[2][0]*B[0][2] + A[2][1]*B[1][2] + A[2][2]*B[2][2],
            ],
        ];
    }

    function vecCross(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0],
        ];
    }

    function vecNorm(v) {
        const len = Math.hypot(v[0], v[1], v[2]) || 1;
        return [v[0] / len, v[1] / len, v[2] / len];
    }

    function axisAngleMatrix(axis, angleRad) {
        const [x, y, z] = vecNorm(axis);
        const c = Math.cos(angleRad);
        const s = Math.sin(angleRad);
        const t = 1 - c;
        return [
            [t*x*x + c,     t*x*y - s*z,   t*x*z + s*y],
            [t*x*y + s*z,   t*y*y + c,     t*y*z - s*x],
            [t*x*z - s*y,   t*y*z + s*x,   t*z*z + c  ],
        ];
    }

    function rotationMatrix(preset, rollDeg, pitchDeg, yawDeg) {
        const forward = vecNorm(preset.camForward);
        const up = vecNorm(preset.camUp);
        const right = vecNorm(
            preset.handedness === 'right'
                ? vecCross(forward, up)
                : vecCross(up, forward)
        );
        // Sliders describe the camera pose. The extrinsic world->camera rotation is its inverse,
        // so apply the negated local RPY angles here.
        const roll = axisAngleMatrix(forward, degToRad(-rollDeg));
        const pitch = axisAngleMatrix(right, degToRad(-pitchDeg));
        const yaw = axisAngleMatrix(up, degToRad(-yawDeg));

        // Intrinsic RPY: roll about local forward, then pitch about local side, then yaw about local up.
        return matMul3(yaw, matMul3(pitch, roll));
    }


    function fmt(n, d=2) {
        return Number(n).toFixed(d);
    }

    // ---- Read slider values ----
    function readParams() {
        return {
            pw: [parseFloat(sliders.pwX.value), parseFloat(sliders.pwY.value), parseFloat(sliders.pwZ.value)],
            pwSize: parseFloat(sliders.pwSize.value),
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
        const preset = activePreset();
        const RUser = rotationMatrix(preset, params.rot[0], params.rot[1], params.rot[2]);
        const R = matMul3(RUser, preset.RBase);
        const pw = params.pw;
        const t = params.t;

        const pc = matVec3(R, [pw[0]-t[0], pw[1]-t[1], pw[2]-t[2]]);

        // Map camera-space point to image-facing vector per preset convention.
        const pImg = preset.pImg(pc);
        const K = [
            [params.fx, params.skew, params.cx],
            [0,         params.fy,   params.cy],
            [0,         0,           1        ],
        ];
        const q = matVec3(K, pImg);
        const behindCamera = preset.behind(pImg);
        const u = behindCamera ? NaN : q[0] / q[2];
        const v = behindCamera ? NaN : q[1] / q[2];

        return { R, pw, t, pc, pImg, K, q, u, v, behindCamera };
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
        const preset = activePreset();
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
            ], '') +
            `<div style="margin-top:0.5rem;color:var(--text-dim);font-size:0.82rem">` +
            `⚠️ <strong>World → Camera</strong> convention: P<sub>c</sub> = R · (P<sub>w</sub> − t), where <strong>t</strong> is the camera origin in the world frame.<br>` +
            `Camera frame (${preset.label}): <strong>${preset.camConvention}</strong><br>` +
            `(Camera → World would instead be: P<sub>w</sub> = R<sup>T</sup> · P<sub>c</sub> + t)</div>`;

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

        // Intrinsic K (standard form)
        document.getElementById('formula-intrinsic').innerHTML =
            `K = ` +
            matrixHTML([
                [`<span class="val-intrinsic">${fmt(K[0][0],0)}</span>`, `<span class="val-intrinsic">${fmt(K[0][1],0)}</span>`, `<span class="val-intrinsic">${fmt(K[0][2],0)}</span>`],
                [`0`, `<span class="val-intrinsic">${fmt(K[1][1],0)}</span>`, `<span class="val-intrinsic">${fmt(K[1][2],0)}</span>`],
                [`0`, `0`, `1`],
            ], '');

        // Keep the math-block heading in sync with the active preset
        const projQHeading = document.getElementById('proj-q-heading');
        if (projQHeading) {
            projQHeading.innerHTML = `Projected q = K · ${preset.projVec}`;
        }

        // Projected q + projection vector explanation
        document.getElementById('formula-proj').innerHTML =
            `q = ` +
            matrixHTML([[`<span class="val-image">${fmt(q[0])}</span>`],
                        [`<span class="val-image">${fmt(q[1])}</span>`],
                        [`<span class="val-image">${fmt(q[2])}</span>`]], '') + warnBadge +
            `<div style="margin-top:0.7rem;color:var(--text-dim);line-height:1.6">` +
            `Projection vector = ${preset.projVec} &nbsp;` +
            `<span style="color:var(--text-secondary)">(why each term)</span><br>` +
            preset.projExpl.map(e => `&nbsp;• ${e}`).join('<br>') +
            `</div>`;

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
            `<span class="val-camera">${preset.projVec}</span>` +
            `<br>` +
            `<span style="color:var(--text-dim)">where P<sub>c</sub> = R · (P<sub>w</sub> − t) in <strong>${preset.label}</strong> camera frame (${preset.camConvention})</span>` +
            `<br>` +
            `<span style="color:var(--text-dim)">Pixel: (u, v) = (q<sub>1</sub>/q<sub>3</sub>, q<sub>2</sub>/q<sub>3</sub>) where q<sub>3</sub> is the depth component, t = camera position in world</span>` +
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

    // Camera body/lens visual mesh in canonical camera axes: +X right, +Y up, -Z forward.
    // This subgroup is re-oriented per preset so the lens sits on the correct face.
    const cameraVisualGroup = new THREE.Group();
    cameraGroup.add(cameraVisualGroup);

    const camBodyGeom = new THREE.BoxGeometry(0.35, 0.5, 0.6);
    const camBodyMat = new THREE.MeshStandardMaterial({ color: 0x5b8cff, emissive: 0x3366cc, emissiveIntensity: 0.3, transparent: true, opacity: 0.85 });
    const camBody = new THREE.Mesh(camBodyGeom, camBodyMat);
    cameraVisualGroup.add(camBody);

    // Up marker button — a red cube sitting above the camera body.
    const upButtonGeom = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const upButtonMat = new THREE.MeshStandardMaterial({ color: 0xff4d4d, emissive: 0xaa2222, emissiveIntensity: 0.35 });
    const upButton = new THREE.Mesh(upButtonGeom, upButtonMat);
    upButton.position.set(0, 0.34, 0);
    cameraVisualGroup.add(upButton);

    // Side screen block — placed on the camera's +X side to indicate camera-right.
    const screenGeom = new THREE.BoxGeometry(0.12, 0.22, 0.3);
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x1b2744, emissive: 0x0e1933, emissiveIntensity: 0.25 });
    const sideScreen = new THREE.Mesh(screenGeom, screenMat);
    sideScreen.position.set(0.27, 0, 0);
    cameraVisualGroup.add(sideScreen);

    // Camera lens — points along local -Z (forward)
    const lensGeom = new THREE.CylinderGeometry(0.12, 0.15, 0.25, 16);
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x222244, emissive: 0x111122, emissiveIntensity: 0.2 });
    const lens = new THREE.Mesh(lensGeom, lensMat);
    lens.rotation.x = Math.PI / 2;   // CylinderGeometry axis is Y; rotate to align with Z
    lens.position.z = -0.42;
    cameraVisualGroup.add(lens);

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

    function updateCameraVisualOrientation(preset) {
        const up = vecNorm(preset.camUp);
        const back = vecNorm([-preset.camForward[0], -preset.camForward[1], -preset.camForward[2]]);
        const right = vecNorm(vecCross(up, back));
        const basis = new THREE.Matrix4();
        basis.makeBasis(
            new THREE.Vector3(right[0], right[1], right[2]),
            new THREE.Vector3(up[0], up[1], up[2]),
            new THREE.Vector3(back[0], back[1], back[2])
        );
        cameraVisualGroup.matrix.copy(basis);
        cameraVisualGroup.matrixAutoUpdate = false;
        cameraVisualGroup.matrixWorldNeedsUpdate = true;
    }

    function updateFrustumFromIntrinsics(params, near, far) {
        const preset = activePreset();
        const imgW = Math.max(params.cx * 2, 1);
        const imgH = Math.max(params.cy * 2, 1);

        function imagePointToCamera(u, v, depth) {
            return preset.frustumImgToCamera(u, v, depth, params);
        }

        const nearCorners = [
            imagePointToCamera(0, 0, near),
            imagePointToCamera(imgW, 0, near),
            imagePointToCamera(0, imgH, near),
            imagePointToCamera(imgW, imgH, near),
        ];
        const farCorners = [
            imagePointToCamera(0, 0, far),
            imagePointToCamera(imgW, 0, far),
            imagePointToCamera(0, imgH, far),
            imagePointToCamera(imgW, imgH, far),
        ];

        const p = frustumGeom.attributes.position.array;
        [...nearCorners, ...farCorners].forEach((corner, index) => {
            const base = index * 3;
            p[base] = corner[0];
            p[base + 1] = corner[1];
            p[base + 2] = corner[2];
        });
        frustumGeom.attributes.position.needsUpdate = true;
    }

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
        updateFrustumFromIntrinsics(params, 0.3, 3);

        // World point
        pointSphere.position.set(pw[0], pw[1], pw[2]);
        pointGlow.position.copy(pointSphere.position);
        const pointScale = params.pwSize / 0.15;
        pointSphere.scale.setScalar(pointScale);
        pointGlow.scale.setScalar(pointScale);

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

    function orbitThetaDragDir() {
        const preset = activePreset();
        if (preset.worldUp[1] > 0.5) {
            // Y-up presets share the same apparent horizontal orbit direction.
            return 1;
        }
        // Z-up keeps the original interaction direction for both handednesses.
        return -1;
    }

    canvas3d.addEventListener('mousedown', (e) => { isDragging = true; lastMouse = { x: e.clientX, y: e.clientY }; });
    canvas3d.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - lastMouse.x;
        const dy = e.clientY - lastMouse.y;
        orbitTheta += orbitThetaDragDir() * dx * 0.005;
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
        orbitTheta += orbitThetaDragDir() * dx * 0.005;
        orbitPhi = Math.max(0.1, Math.min(Math.PI - 0.1, orbitPhi - dy * 0.005));
        lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: false });
    canvas3d.addEventListener('touchend', () => { isDragging = false; });

    function updateOrbitCamera() {
        const r = orbitRadius;
        const sinPhi = Math.sin(orbitPhi);
        const cosPhi = Math.cos(orbitPhi);
        const cosTheta = Math.cos(orbitTheta);
        const sinTheta = Math.sin(orbitTheta);
        // Orbit around the world-up axis so the polar direction matches the convention.
        if (activePreset().worldUp[2] > 0.5) {
            // Z-up: orbit in XY plane, Z is elevation
            cam3d.position.set(r * sinPhi * cosTheta, r * sinPhi * sinTheta, r * cosPhi);
        } else {
            // Y-up: orbit in XZ plane, Y is elevation
            cam3d.position.set(r * sinPhi * cosTheta, r * cosPhi, r * sinPhi * sinTheta);
        }
        cam3d.lookAt(0, 0, 0);
    }

    // ---- Apply coordinate preset ----
    function applyPresetToScene(id) {
        activePresetId = id;
        const preset = COORDINATE_PRESETS[id];

        // Update Three.js world up axis.
        // DefaultUp only affects newly created objects; cam3d.up must be updated directly
        // because lookAt() reads this.up, not the static DefaultUp.
        THREE.Object3D.DefaultUp.set(preset.worldUp[0], preset.worldUp[1], preset.worldUp[2]);
        cam3d.up.set(preset.worldUp[0], preset.worldUp[1], preset.worldUp[2]);

        // Three.js is inherently right-handed. For Y-up left-hand systems (Unity, DirectX),
        // flip scene Z so the chirality appears inverted in the viewer. scene.scale does NOT
        // affect camera math (lookAt, orbit). Z-up left-hand (Unreal) is NOT flipped because
        // flipping Y in Z-up orbit causes orbit reversal that cannot be cleanly compensated.
        if (preset.handedness === 'left' && preset.worldUp[1] > 0.5) {
            scene.scale.set(1, 1, -1); // Y-up left-hand: flip Z
        } else {
            scene.scale.set(1, 1, 1);
        }

        // Rotate grid to match the world's ground plane:
        //   Z-up world → ground is XY (rotate GridHelper by 90° around X)
        //   Y-up world → ground is XZ (GridHelper default, no rotation)
        gridHelper.rotation.x = preset.worldUp[2] > 0.5 ? Math.PI / 2 : 0;

        // Reset orbit to a sensible isometric view for this world orientation
        if (preset.worldUp[2] > 0.5) {
            // Z-up: true isometric (elevation ~54.7° from zenith)
            orbitTheta = Math.PI / 4;
            orbitPhi = Math.acos(1 / Math.sqrt(3));
        } else {
            // Y-up: 45° elevation view
            orbitTheta = Math.PI / 4;
            orbitPhi = Math.PI / 4;
        }
        orbitRadius = 18;

        // Immediately reposition the overview camera so the floor is horizontal
        // on the very first frame after switching (don't wait for next animate tick).
        updateOrbitCamera();

        // Update header subtitle with active convention description
        const subtitleEl = document.getElementById('subtitle-convention');
        if (subtitleEl) subtitleEl.textContent = preset.subtitle;

        // Update reference link (hide if no refUrl defined)
        const refEl = document.getElementById('subtitle-ref');
        if (refEl) {
            if (preset.refUrl) {
                refEl.innerHTML = `Reference: <a href="${preset.refUrl}" target="_blank" rel="noopener noreferrer">${preset.refLabel}</a>`;
                refEl.style.display = '';
            } else {
                refEl.style.display = 'none';
            }
        }

        // Update UV convention info
        const uvInfoEl = document.getElementById('uv-info');
        if (uvInfoEl) {
            const uvLabel = preset.vDown ? '(0,0) top-left · V↓' : '(0,0) bottom-left · V↑';
            const uvRefLink = preset.uvRef
                ? ` · <a href="${preset.uvRef}" target="_blank" rel="noopener noreferrer">${preset.uvRefLabel}</a>`
                : '';
            uvInfoEl.innerHTML = `UV: ${uvLabel}${uvRefLink}`;
        }

        // Sync the select element in case applyPresetToScene is called programmatically
        const selectEl = document.getElementById('preset-select');
        if (selectEl && selectEl.value !== id) selectEl.value = id;

        updateCameraVisualOrientation(preset);
        applyPresetResetDefaults(preset);
    }

    // ============================================================
    //  RIGHT PANEL: 2D Canvas (Image Plane / Viewport)
    // ============================================================
    const canvas2d = document.getElementById('canvas-2d');
    const ctx2d = canvas2d.getContext('2d');

    function draw2DViewport(params, data) {
        const { u, v, behindCamera, pImg } = data;
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
        const vDown = activePreset().vDown !== false; // default true if not specified
        const skewSlope = params.skew / Math.max(params.fy, 1);

        // Origin at top-left (OpenCV / Isaac Sim image convention): u→right, v→down
        function rawPoint(uVal, vVal) {
            // For bottom-left origin (V up), flip the canvas y to show (0,0) at bottom.
            const yCanvas = vDown ? vVal : (imgH - vVal);
            // Draw the skewed image plane by undoing the intrinsic shear:
            // u = x + skew * ((v - cy) / fy)  =>  x = u - skew * ((v - cy) / fy).
            // Use canvas-vertical direction so V↓ / V↑ presets tilt opposite ways on screen.
            return {
                x: uVal - (yCanvas - params.cy) * skewSlope,
                y: yCanvas,
            };
        }

        function drawLine(p0, p1) {
            ctx2d.beginPath();
            ctx2d.moveTo(p0.x, p0.y);
            ctx2d.lineTo(p1.x, p1.y);
            ctx2d.stroke();
        }

        const rawCorners = [
            rawPoint(0, 0),
            rawPoint(imgW, 0),
            rawPoint(imgW, imgH),
            rawPoint(0, imgH),
        ];
        const rawXs = rawCorners.map(p => p.x);
        const rawYs = rawCorners.map(p => p.y);
        const rawMinX = Math.min(...rawXs);
        const rawMaxX = Math.max(...rawXs);
        const rawMinY = Math.min(...rawYs);
        const rawMaxY = Math.max(...rawYs);
        const rawWidth = rawMaxX - rawMinX;
        const rawHeight = rawMaxY - rawMinY;

        // Fit the skewed image plane into the canvas while keeping margins around the polygon.
        const scale = Math.min(w / rawWidth, h / rawHeight) * 0.85;
        const offX = (w - rawWidth * scale) / 2 - rawMinX * scale;
        const offY = (h - rawHeight * scale) / 2 - rawMinY * scale;

        function mapPoint(uVal, vVal) {
            const p = rawPoint(uVal, vVal);
            return { x: offX + p.x * scale, y: offY + p.y * scale };
        }

        const corners = [
            mapPoint(0, 0),
            mapPoint(imgW, 0),
            mapPoint(imgW, imgH),
            mapPoint(0, imgH),
        ];
        const planeMinX = Math.min(...corners.map(p => p.x));
        const planeMaxX = Math.max(...corners.map(p => p.x));
        const planeMinY = Math.min(...corners.map(p => p.y));
        const planeMaxY = Math.max(...corners.map(p => p.y));

        // Background
        ctx2d.fillStyle = '#080c18';
        ctx2d.fillRect(0, 0, w, h);

        // Image plane background with subtle vignette
        const vignette = ctx2d.createRadialGradient(w/2, h/2, 0, w/2, h/2, w * 0.6);
        vignette.addColorStop(0, 'rgba(20, 30, 55, 0.95)');
        vignette.addColorStop(1, 'rgba(10, 15, 30, 0.95)');
        ctx2d.fillStyle = vignette;
        ctx2d.beginPath();
        ctx2d.moveTo(corners[0].x, corners[0].y);
        corners.slice(1).forEach(corner => ctx2d.lineTo(corner.x, corner.y));
        ctx2d.closePath();
        ctx2d.fill();
        ctx2d.strokeStyle = 'rgba(91, 140, 255, 0.3)';
        ctx2d.lineWidth = 1.5;
        ctx2d.stroke();

        // Grid lines
        ctx2d.strokeStyle = 'rgba(91, 140, 255, 0.06)';
        ctx2d.lineWidth = 0.5;
        const gridStep = 50;
        for (let gx = 0; gx <= imgW; gx += gridStep) {
            drawLine(mapPoint(gx, 0), mapPoint(gx, imgH));
        }
        for (let gy = 0; gy <= imgH; gy += gridStep) {
            drawLine(mapPoint(0, gy), mapPoint(imgW, gy));
        }

        // Tick marks along top edge (u axis) — origin at top-left
        ctx2d.fillStyle = 'rgba(148, 163, 192, 0.35)';
        ctx2d.font = '8px "JetBrains Mono", monospace';
        ctx2d.textAlign = 'center';
        for (let gx = 0; gx <= imgW; gx += 100) {
            const tickBase = mapPoint(gx, 0);
            ctx2d.strokeStyle = 'rgba(91, 140, 255, 0.15)';
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            ctx2d.moveTo(tickBase.x, tickBase.y);
            ctx2d.lineTo(tickBase.x, tickBase.y - 4);
            ctx2d.stroke();
            ctx2d.fillText(gx.toString(), tickBase.x, tickBase.y - 6);
        }
        // Tick marks along left edge (v axis) — v increases downward
        ctx2d.textAlign = 'right';
        for (let gy = 0; gy <= imgH; gy += 100) {
            const tickBase = mapPoint(0, gy);
            ctx2d.strokeStyle = 'rgba(91, 140, 255, 0.15)';
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            ctx2d.moveTo(tickBase.x, tickBase.y);
            ctx2d.lineTo(tickBase.x - 4, tickBase.y);
            ctx2d.stroke();
            ctx2d.fillText(gy.toString(), tickBase.x - 6, tickBase.y + 3);
        }
        ctx2d.textAlign = 'start';

        // Principal point crosshair
        const principalPoint = mapPoint(params.cx, params.cy);
        const ppx = principalPoint.x;
        const ppy = principalPoint.y;
        ctx2d.strokeStyle = 'rgba(139, 92, 246, 0.4)';
        ctx2d.lineWidth = 1;
        ctx2d.setLineDash([4, 4]);
        drawLine(mapPoint(params.cx, 0), mapPoint(params.cx, imgH));
        drawLine(mapPoint(0, params.cy), mapPoint(imgW, params.cy));
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
            const projectedPoint = mapPoint(u, v);
            const px = projectedPoint.x;
            const py = projectedPoint.y;
            const inBounds = u >= 0 && u <= imgW && v >= 0 && v <= imgH;
            const baseScale = params.pwSize / 0.15;
            const depthScale = Math.max(0.45, Math.min(2.4, 3 / Math.max(pImg[2], 0.001)));
            const pointRadius = 6 * baseScale * depthScale;
            const glowRadius = 25 * baseScale * depthScale;

            // Clamp position for drawing when out of bounds
            const margin = 15;
            const clampedPoint = mapPoint(
                Math.max(0, Math.min(imgW, u)),
                Math.max(0, Math.min(imgH, v))
            );
            const drawPx = Math.max(planeMinX + margin, Math.min(planeMaxX - margin, clampedPoint.x));
            const drawPy = Math.max(planeMinY + margin, Math.min(planeMaxY - margin, clampedPoint.y));

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
                const gradient = ctx2d.createRadialGradient(px, py, 0, px, py, glowRadius);
                gradient.addColorStop(0, 'rgba(251, 146, 60, 0.45)');
                gradient.addColorStop(0.5, 'rgba(251, 146, 60, 0.1)');
                gradient.addColorStop(1, 'transparent');
                ctx2d.fillStyle = gradient;
                ctx2d.beginPath();
                ctx2d.arc(px, py, glowRadius, 0, Math.PI * 2);
                ctx2d.fill();

                // Point dot
                ctx2d.fillStyle = '#fb923c';
                ctx2d.beginPath();
                ctx2d.arc(px, py, pointRadius, 0, Math.PI * 2);
                ctx2d.fill();
                ctx2d.strokeStyle = 'rgba(251, 146, 60, 0.8)';
                ctx2d.lineWidth = 2;
                ctx2d.beginPath();
                ctx2d.arc(px, py, pointRadius, 0, Math.PI * 2);
                ctx2d.stroke();

                // Coordinates label
                ctx2d.fillStyle = '#e8ecf4';
                ctx2d.font = '12px "JetBrains Mono", monospace';
                const labelText = `(${fmt(u,1)}, ${fmt(v,1)})`;
                const textMetrics = ctx2d.measureText(labelText);
                const textOff = px > planeMaxX - textMetrics.width - 20 ? -textMetrics.width - 12 : 12;
                const textYOff = py < planeMinY + 25 ? 20 : -12;
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
                ctx2d.fillText(`Out of frame: (${fmt(u,1)}, ${fmt(v,1)})`, planeMaxX - 5, planeMinY + 15);
                ctx2d.textAlign = 'start';
            }
        } else {
            // Behind camera message
            ctx2d.fillStyle = 'rgba(248, 113, 113, 0.8)';
            ctx2d.font = '14px "Inter", sans-serif';
            ctx2d.textAlign = 'center';
            ctx2d.fillText('Point is behind the camera (depth \u2264 0)', w / 2, h / 2);
            ctx2d.font = '11px "Inter", sans-serif';
            ctx2d.fillStyle = 'rgba(248, 113, 113, 0.5)';
            ctx2d.fillText('Move the world point or adjust camera translation', w / 2, h / 2 + 22);
            ctx2d.textAlign = 'start';
        }

        // Axis labels — positioned at UV origin corner, direction depends on convention
        ctx2d.fillStyle = 'rgba(148, 163, 192, 0.6)';
        ctx2d.font = '10px "JetBrains Mono", monospace';
        const uvOriginCanvas = mapPoint(0, 0); // always the UV (0,0) point in canvas coords
        // u label: above origin for top-left (v↓), below origin for bottom-left (v↑)
        ctx2d.fillText('u →', uvOriginCanvas.x + 4, vDown ? uvOriginCanvas.y - 10 : uvOriginCanvas.y + 14);
        // v label: rotated CW (v↓) or CCW (v↑)
        ctx2d.save();
        ctx2d.translate(uvOriginCanvas.x - 8, uvOriginCanvas.y + (vDown ? 4 : -4));
        ctx2d.rotate(vDown ? Math.PI / 2 : -Math.PI / 2);
        ctx2d.fillText('v →', 0, 0);
        ctx2d.restore();

        // UV convention badge — small text at top of image plane area
        const badgeText = vDown ? '(0,0) top-left · V↓' : '(0,0) bottom-left · V↑';
        ctx2d.fillStyle = 'rgba(148, 163, 192, 0.4)';
        ctx2d.font = '9px "JetBrains Mono", monospace';
        ctx2d.textAlign = 'right';
        ctx2d.fillText(badgeText, planeMaxX - 4, planeMinY + 12);
        ctx2d.textAlign = 'start';

        // Image dimensions
        ctx2d.fillStyle = 'rgba(148, 163, 192, 0.4)';
        ctx2d.font = '9px "JetBrains Mono", monospace';
        ctx2d.textAlign = 'right';
        const sizeLabel = mapPoint(imgW, 0);
        ctx2d.fillText(`${imgW}×${imgH} px`, sizeLabel.x, sizeLabel.y + 24);
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
        valLabels.pwSize.textContent = fmt(params.pwSize, 2);
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
    applyPresetToScene('isaac-sim');
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

    // Preset selector
    const presetSelect = document.getElementById('preset-select');
    if (presetSelect) {
        presetSelect.addEventListener('change', function () {
            applyPresetToScene(this.value);
            updateAll();
        });
    }

    // Language tabs for the reference code block
    const codeTabs = document.querySelectorAll('.code-tab');
    const codePanels = document.querySelectorAll('.code-panel');

    codeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.codeTarget;
            codeTabs.forEach(btn => {
                const active = btn === tab;
                btn.classList.toggle('is-active', active);
                btn.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            codePanels.forEach(panel => {
                panel.classList.toggle('is-active', panel.dataset.codePanel === target);
            });
        });
    });

})();
