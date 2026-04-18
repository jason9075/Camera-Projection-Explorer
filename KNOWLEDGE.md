# Camera Projection Explorer Knowledge Notes

This document summarizes which settings in the explorer ultimately control the visual and mathematical behavior of the system.

## 1. Coordinate System Definition

Each preset starts by defining the target convention. This is the deepest layer of behavior.

Key settings include:

- `handedness`: right-handed or left-handed
- `worldUp`: whether the world uses `Y-up` or `Z-up`
- `camForward`: which local camera axis is considered "forward"
- `camUp`: which local camera axis is considered "up"
- `pImg`: how a camera-space point is remapped into image-facing coordinates before applying `K`
- `vDown`: whether the viewport uses top-left origin (`v` grows downward) or bottom-left origin (`v` grows upward)

These settings affect:

- the visual meaning of camera axes
- the handedness of the 3D scene
- which direction is considered forward in each engine
- whether positive skew tilts the top edge right or the bottom edge right
- how "behind camera" is determined

## 2. Zero-Rotation Camera Basis (`RBase`)

`RBase` defines the camera pose when all user rotation sliders are zero.

This controls:

- where the camera looks at zero rotation
- which world direction corresponds to camera right, up, and forward
- how each preset should feel immediately after reset

If two presets share the same handedness but use different `RBase`, the same `Roll / Pitch / Yaw` values can still produce different viewing directions.

## 3. Roll / Pitch / Yaw Axis Rules

The explorer uses local camera-axis semantics instead of a single global Euler interpretation.

The current rule is:

- `Roll`: rotate around local `forward`
- `Pitch`: rotate around local `side/right`
- `Yaw`: rotate around local `up`

This matters because different systems define `forward`, `up`, and `right` differently.

As a result:

- a `Pitch +90°` may look toward `+Y` in one system and a different direction in another
- the same slider labels remain consistent conceptually, but not numerically identical across all conventions

## 4. Extrinsics: Rotation and Translation

The user-controlled extrinsics are:

- `rotX`, `rotY`, `rotZ`
- `tx`, `ty`, `tz`

These produce the world-to-camera transform:

```text
P_c = R · (P_w - t)
```

They affect:

- the camera pose in the world
- whether the world point lies in front of or behind the camera
- where the point appears in the 3D scene and in the viewport

Rotation changes the camera orientation.
Translation changes the camera origin.

## 5. Intrinsics (`K`)

The intrinsic matrix is defined by:

- `fx`
- `fy`
- `cx`
- `cy`
- `skew`

These affect the projection from camera space to image space.

In practice:

- `fx` and `fy` change projection scale / field-of-view feel
- `cx` and `cy` move the principal point
- `skew` shears the image plane

Positive skew must always be interpreted together with the viewport's positive `v` direction:

- in `V↑` systems, positive skew makes the upper side tilt right
- in `V↓` systems, positive skew makes the lower side tilt right

## 6. Visualization-Specific Compensation

Some behavior exists only to make the viewer readable. It is not part of the projection equations themselves.

Examples:

- `scene.scale` mirroring for left-handed presets in Three.js
- `cameraVisualGroup` alignment so the lens, up marker, and side block match each preset
- orbit-drag direction adjustments for `Y-up` vs `Z-up`
- preset-specific reset defaults such as `resetRot`
- helper actions such as moving the point relative to the camera

These settings affect how the demo looks and feels, but they are separate from the underlying math.

## End-to-End Summary

The final output is determined by this chain:

```text
Coordinate-system definition
→ zero-rotation camera basis (RBase)
→ local RPY rules
→ extrinsics (R, t)
→ intrinsics (K)
→ visualization compensation
```

If the result looks wrong, the most reliable debugging order is:

1. Check the preset's `forward / up / handedness`
2. Check `RBase`
3. Check the meaning of roll, pitch, and yaw
4. Check the world-to-camera transform
5. Check the `pImg` mapping and `K`
6. Check viewer-only compensation such as scene mirroring
