# Design Note (Camera Path + Export)

## Camera/Path Representation

**What we store**

- `CameraPose = { position, quaternion, fov }` because playback/export must be independent of input mode.
- `Keyframe = { id, pose, t }` with explicit `t` so timing is deterministic (Step 5 export depends on it).

**Why this design**

- **Quaternion + position** is stable for interpolation.
- `t` in seconds keeps the playback model simple and predictable; keyframes can be moved without re-timing everything else.

**How we interpolate**

- **Position:** Catmull‑Rom spline with clamped endpoints so no overflowing (fallback to linear for 2 keyframes).
- **Rotation:** quaternion slerp with shortest-path correction.
- **Timing:** ease-in/out to avoid jerky motion at segment boundaries.

**Adjustable smoothing**

- Smoothing blends linear vs spline **and** easing strength (0 = linear time + straight line, 1 = full spline + easing).

## Export Pipeline (Deterministic)

**Flow**

1. Frontend builds and sends `path.json` (scene URL, keyframes, render settings).
2. Frames render at **exact** `t = frame / fps` (no RAF timing).
3. PNG frames upload sequentially to the export server.
4. Server runs `ffmpeg` (`libx264`, `yuv420p`, `faststart`) to produce `output.mp4`.
5. Cancel stops encoding and deletes partial output.

**Why this design**

- Determinism matters: re-running export with the same `path.json` should yield the same MP4.
- Sequential uploads keep memory bounded and work for long renders.

## Key Decisions & Tradeoffs

- **Removed camera frustum gizmo** in favor of **smoothing control**: the frustum was confusing in practice and did not directly improve output quality, I couldn't get the cone to understand like the depth of the render, and smoothing is immediately visible and was more intuitive to implement for me.
- **Removed cinematic presets** (turntable/dolly/crane/figure‑8): The implementations with the presets I tried doing worked, the physical actions worked-- however I couldn't find a optimal point to perform these cinematic presets over and they added extra complexity.
- **Orbit ↔ Fly mode switch preserves view**: I prioritized user continuity over snapping to a fixed target.
- **Cancel deletes outputs**: to avoid corrupted or misleading artifacts in `/exports`.

## Assumptions

- Viewer provides stable camera access for `position`, `quaternion`, and `fov`.
- Export uses local FFmpeg installed on PATH.
- For large scenes, users will limit duration to keep export time reasonable.

## Performance Consideration

Frames are generated and uploaded **one-by-one** to avoid storing hundreds/thousands of PNGs in memory at once. This keeps memory bounded and prevents crashes on long exports. End of file.
