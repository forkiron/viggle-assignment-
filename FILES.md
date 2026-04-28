# Files & Design Choices

A per-file map of the project. For each file: **purpose** (what it does) and, where relevant, **design choice** (why it's shaped that way). For broader system rationale see `DESIGN_NOTE.md` and `ARCHITECTURE.md`.

---

## Root

| File | Purpose / Design Choice |
| --- | --- |
| `README.md` | Setup, run, export instructions, MVP coverage, project tree. |
| `ARCHITECTURE.md` | ASCII diagram of the data flow: UI → path → export pipeline → server → FFmpeg. |
| `DESIGN_NOTE.md` | Camera/path representation, interpolation math, export determinism, tradeoffs. |
| `package.json` | Single `npm run dev` boots **both** Vite and the Express server via `concurrently` — one command keeps the workflow frictionless. |
| `vite.config.ts` | Vite + React plugin. Default config; Vite picked over webpack for fast HMR. |
| `tsconfig*.json` | Split `app` / `node` configs so the export server (Node) and the browser app compile under different lib targets. |
| `eslint.config.js` | Flat ESLint config with React Hooks + React Refresh rules. |
| `index.html` | Vite entry; mounts React at `#root`. |

## `public/`

| File | Purpose |
| --- | --- |
| `world00.ply`, `world01.ply` | Local sample scenes used by the preset dropdown so the app works without an external URL. |

## `server/`

| File | Purpose / Design Choice |
| --- | --- |
| `server/index.js` | Express + Multer export API. Endpoints: `POST /export/start` (creates job dir + `path.json`), `POST /export/:id/frame` (write PNG by index), `POST /export/:id/finish` (spawn FFmpeg `libx264 yuv420p +faststart`), `POST /export/:id/cancel` (kill ffmpeg, delete partial output), `GET /export/:id/status`. **Design:** PNG sequences are written to disk frame-by-frame (not buffered in memory) so long renders don't OOM; `path.json` is persisted per export so a render is fully reproducible from inputs. **Cancel deletes** any partial `output.mp4` to avoid leaving misleading artifacts in `/exports`. |

## `src/` (entry)

| File | Purpose / Design Choice |
| --- | --- |
| `main.tsx` | React 19 root mount. |
| `App.tsx` | Top-level orchestrator. Wires the viewer, path store, `PathPlayer`, and `ExportPipeline`. **Design:** instantiates **two** `GaussianViewer` instances — one visible/interactive, one hidden off-screen used solely for export rendering. This decouples export from user input so the user can keep navigating while frames render, and avoids interrupting on-screen rendering when sampling export frames. |
| `App.css`, `index.css` | Layout + base styles for the floating HUD/controls. |
| `gaussian-splats-3d.d.ts` | Local ambient typings for `@mkkellogg/gaussian-splats-3d` since the package ships no types. |

## `src/state/` — global UI state

| File | Purpose / Design Choice |
| --- | --- |
| `state/types.ts` | `ViewerStatus` (`idle/loading/ready/error`), `ControlMode` (`orbit/fly`), `ViewerState` shape. |
| `state/viewerStore.ts` | Hand-rolled `useSyncExternalStore` store for viewer status, FPS, control mode, sensitivity, smoothing. **Design:** chose `useSyncExternalStore` over Zustand/Redux to keep the dependency surface small and the state model explicit — the app has only two tiny stores so a library is overkill. |

## `src/viewer/` — 3D rendering & camera

| File | Purpose / Design Choice |
| --- | --- |
| `viewer/SplatViewer.tsx` | Thin React wrapper that mounts a `GaussianViewer` into a div ref. Lets React own the lifecycle while the viewer owns the canvas. |
| `viewer/gaussianViewer.ts` | Core wrapper around `@mkkellogg/gaussian-splats-3d`. Handles `.ply` load with progress, point count, frame-scene, reset-view, control-mode switching, camera pose get/set, and an **off-screen `WebGLRenderTarget`** + reusable `Uint8Array` pixel buffer for export PNG capture. **Design:** off-screen target lets export render at fixed export resolution (e.g. 1280×720) regardless of the on-screen canvas size, and the buffer is reused across frames to avoid GC churn. Mode switch preserves camera pose (no snap-back) for user continuity. |
| `viewer/sceneSources.ts` | Scene preset list + `.ply` URL validation/normalization. Centralizes URL logic so UI doesn't repeat checks. |
| `viewer/metrics.ts` | rAF-based FPS tracker that pushes values to the viewer store. Decoupled so any UI piece can read FPS. |
| `viewer/controls/types.ts` | `CameraPose` (position + quaternion + fov) and `ControlMode`. **Design:** quaternion (not Euler) because it's stable for interpolation — the same `CameraPose` shape is shared by viewer, path, and export so playback is mode-agnostic. |
| `viewer/controls/input.ts` | Pointer + keyboard event source. Single input layer that orbit and fly controls subscribe to. |
| `viewer/controls/orbitControls.ts` | Orbit/pan/zoom around a target. |
| `viewer/controls/flyControls.ts` | WASD + mouse-look free navigation. |

## `src/path/` — camera path

| File | Purpose / Design Choice |
| --- | --- |
| `path/types.ts` | `CameraPose` and `Keyframe = { id, pose, t }`. **Design:** explicit `t` in seconds (rather than implicit ordering) so keyframes can be re-timed independently and export timing is deterministic. |
| `path/pathStore.ts` | External store for keyframes, selection, preview state, current time, duration, loop. Mirrors `viewerStore` style. |
| `path/serialization.ts` | Encode/decode `path.json` (scene URL + keyframes + render settings). Used both by export and for reproducible re-runs. |
| `path/player/PathPlayer.ts` | rAF playback loop: each tick samples a pose at the current time and pushes it to the viewer. Supports play/pause/seek/loop and an adjustable smoothing parameter. **Design:** the player drives the **interactive** viewer for preview only — export does not use rAF (see below). |
| `path/player/sampler.ts` | `samplePoseAtTime(keyframes, t, smoothing)`: position spline + quaternion slerp + easing, blended by `smoothing`. Single source of truth used by both preview and export so they cannot diverge. |
| `path/math/catmullRom.ts` | Centripetal Catmull-Rom position spline with clamped endpoints; falls back to linear for 2 keyframes. |
| `path/math/quat.ts` | Quaternion slerp with shortest-path correction (negate one quat if `dot < 0`). |
| `path/math/easing.ts` | `easeInOutCubic` for smoother motion at segment boundaries. |
| `path/math/spline.ts` | Legacy/scaffold spline file (placeholder; real spline lives in `catmullRom.ts`). |
| `path/math/slerp.ts` | Legacy/scaffold slerp file (placeholder; real slerp lives in `quat.ts`). |

> **Math design:** `smoothing = 0` collapses to linear position + linear time; `smoothing = 1` is full Catmull-Rom + ease-in-out. One slider controls both spatial and temporal smoothness so the user has a single intuitive knob instead of two coupled ones.

## `src/export/` — MP4 pipeline (frontend side)

| File | Purpose / Design Choice |
| --- | --- |
| `export/ExportPipeline.ts` | Drives export from the browser: `POST /export/start` with settings, then for each `frame ∈ [0, frameCount)` set viewer pose at `t = frame / fps`, render to off-screen target, read pixels, encode PNG, `POST /frame`, then `POST /finish` to trigger FFmpeg. Cancel-aware (aborts the loop and notifies server). **Design:** time is **frame-indexed**, never wall-clock — this guarantees deterministic output regardless of CPU load. Frames are uploaded **sequentially** (not batched) so memory stays bounded for long renders. Yields to the main thread between frames so the UI remains responsive. |

## `src/ui/` — React panels

| File | Purpose / Design Choice |
| --- | --- |
| `ui/ViewerHUD.tsx` | Status badge, load progress, FPS, point count, error banner. |
| `ui/ViewerControls.tsx` | Scene URL input + presets, Load, Frame Scene, Reset View, orbit/fly toggle, move-speed and look-sensitivity sliders, plus the export action button. |
| `ui/KeyframePanel.tsx` | Keyframe list, draggable timeline, smoothing slider, and embedded preview controls. **Design:** smoothing slider sits next to the timeline because it is the primary "shape my path" knob — replaced an earlier camera-frustum gizmo (see `DESIGN_NOTE.md`) which was confusing in practice. |
| `ui/PlaybackControls.tsx` | Play / Pause / Stop, loop toggle, scrubber. |
| `ui/ExportPanel.tsx` | Export MP4 button, progress bar, status text, cancel button, output link, and rerun-with-same-settings. |

## `exports/`

Per-export directories (`<uuid>/`) created at runtime. Each contains:
- `path.json` — exact inputs (scene URL, keyframes, render settings) for reproducibility.
- `frames/` — uploaded PNGs (deleted after FFmpeg finishes — kept on cancel for inspection).
- `output.mp4` — final video (deleted on cancel).

---

## Cross-cutting design choices (recap)

- **Single pose shape (`{position, quaternion, fov}`)** flows through controls → keyframes → player → export. Anything that handles the camera speaks the same language.
- **Frame-indexed export time (`t = frame / fps`)** is the cornerstone of determinism — re-running with the same `path.json` produces an identical MP4.
- **Two viewers (visible + hidden export)** decouple interactive rendering from export rendering so users can keep working and resolution can differ.
- **Sequential per-frame upload** trades a small amount of throughput for bounded memory — long exports don't crash the tab.
- **Cancel deletes partial output** so `/exports` never contains a half-encoded MP4 masquerading as a finished one.
- **One smoothing knob** instead of separate spline/easing controls — easier mental model, immediately visible effect.
- **Lightweight stores (`useSyncExternalStore`)** instead of a state library — the app is small enough that the explicit store is clearer than a dependency.
