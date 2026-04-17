# 📷 Camera Projection Explorer

**[🔗 Live Demo](https://jason9075.github.io/Camera-Projection-Explorer/)** for understanding the **geometric foundations of camera projection** — coordinate system transformations, extrinsic & intrinsic parameters, the pinhole camera model, and homogeneous coordinates.

## Features

- **Split-panel visualization**
  - **Left panel**: 3D scene (Three.js) showing World → Camera coordinate transform with draggable orbit controls
  - **Right panel**: 2D viewport showing Camera → Image projection with the projected pixel location

- **Interactive controls** for all parameters:
  - World point position (X<sub>w</sub>, Y<sub>w</sub>, Z<sub>w</sub>)
  - Extrinsic rotation (Roll, Pitch, Yaw) and translation (t<sub>x</sub>, t<sub>y</sub>, t<sub>z</sub>)
  - Intrinsic matrix K: focal lengths (f<sub>x</sub>, f<sub>y</sub>), principal point (c<sub>x</sub>, c<sub>y</sub>), and skew

- **Live math formulas** showing step-by-step matrix multiplications
- **Educational concept cards** explaining coordinate systems, extrinsics, intrinsics, and homogeneous coordinates
- **Full projection pipeline** visualization: P<sub>w</sub> → [R|t] → K → (u, v)

## Quick Start

### Using Nix (recommended)

```bash
nix develop
just dev
```

Then open [http://localhost:8080](http://localhost:8080) in your browser.

### Without Nix

```bash
python3 -m http.server 8080
```

## Available Commands (Justfile)

| Command      | Description                                      |
|-------------|--------------------------------------------------|
| `just serve` | Start a simple HTTP server on port 8080          |
| `just dev`   | Start server with auto-restart on file changes   |

## Tech Stack

- **HTML/CSS/JS** — Pure static site, no build step required
- **Three.js** (r128) — 3D visualization via CDN
- **Nix Flakes** — Reproducible dev environment
- **entr** — File watcher for live reload

## Coordinate Convention

This demo uses the standard **pinhole camera model**:

```
q = K · [X_c, -Y_c, -Z_c]^T
P_c = R · (P_w - t)
(u, v) = (q_x / q_z, q_y / q_z)
```

- **World frame**: Right-handed, Z-up
- **Camera frame**: Isaac Sim default camera axes, with +X right, +Y up, -Z forward
- **Image frame**: Origin at top-left, u-right, v-down

## Where The Math Lives

The core projection code is in [`app.js`](./app.js):

- `readParams()` reads slider values into a `params` object
- `rotationMatrix()` builds the ZYX Euler rotation matrix
- `computeTransforms()` performs the world-to-camera transform and camera-to-image projection
- `updateFormulas()` renders the matrices and intermediate values shown in the UI

The main calculation starts around `computeTransforms()` and follows the same pipeline shown on the page:

```js
const RUser = rotationMatrix(params.rot[0], params.rot[1], params.rot[2]);
const RBase = [
  [0, -1,  0],
  [0,  0,  1],
  [-1, 0,  0],
];
const R = matMul3(RUser, RBase);
const pc = matVec3(R, [pw[0] - t[0], pw[1] - t[1], pw[2] - t[2]]);
const pImg = [pc[0], -pc[1], -pc[2]];

const K = [
  [params.fx, params.skew, params.cx],
  [0,         params.fy,   params.cy],
  [0,         0,           1],
];

const q = matVec3(K, pImg);
const u = q[0] / q[2];
const v = q[1] / q[2];
```

This means:

- `pc` is the point in Isaac Sim default camera axes
- `pImg = [Xc, -Yc, -Zc]` converts camera coordinates to image-facing projection coordinates
- `K` is the standard intrinsic matrix with focal length, principal point, and skew
- `(u, v)` is the final pixel coordinate after perspective divide

## License

[MIT](./LICENSE)

## Author

Jason Kuan
