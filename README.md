# 📷 Camera Calibration Explorer

**[🔗 Live Demo](https://jason9075.github.io/camera_pos_page/)** for understanding the **geometric foundations of camera calibration** — coordinate system transformations, extrinsic & intrinsic parameters, the pinhole camera model, and homogeneous coordinates.

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
q = K · [R | t] · Pₐ
(u, v) = (qₓ / q_z, q_y / q_z)
```

- **World frame**: Right-handed, Y-up
- **Camera frame**: X-right, Y-down, Z-forward (OpenCV convention)
- **Image frame**: Origin at top-left, u-right, v-down

## License

[MIT](./LICENSE)

## Author

Jason Kuan
