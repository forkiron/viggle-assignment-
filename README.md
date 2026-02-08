# Gaussian Splats Viewer (MVP)

A React + Vite viewer that loads `.ply` Gaussian splats (GaussianSplats3D), supports orbit/fly navigation, camera path recording with keyframes, and MP4 export via a local Node server and FFmpeg.

## Prerequisites

- Node.js 20.17+ (or 22+)
- FFmpeg on your PATH (for MP4 export)

## Install

```bash
npm install
```

## Run (one command)

```bash
npm run dev
```

This starts the export server and the Vite dev server. Open the app URL (e.g. `http://localhost:5173`). The export server runs at `http://localhost:5174` by default (override with `VITE_EXPORT_SERVER_URL`).

## Export MP4

1. Load a scene (paste a `.ply` URL or use a preset, then **Load**).
2. Add at least two keyframes (**Add** in the Keyframes panel) and optionally reorder or adjust times on the timeline.
3. Use **Preview Play** to check the path.
4. Click **Export MP4** in the Export panel. Defaults: 1280×720, 30 FPS. Progress is shown; when done, use the output link or open `exports/<id>/output.mp4` in VLC/QuickTime.

## MVP coverage

- **Load & render:** Load `.ply` scene, loading progress, FPS, point count, Frame Scene, Reset View.
- **Navigation:** Orbit (pan/zoom) and Walk/Fly (WASD + mouse look).
- **Camera path:** Add Keyframe, Delete, Reorder, Preview Play; smooth playback (Catmull-Rom position, SLERP rotation, ease-in/out).
- **Export:** Export MP4 at 1280×720 @ 30 FPS, progress, playable output.

## Extras implemented

- **Cinematic presets:** Turntable, Dolly-In, Crane-Up, Figure-8 one-click path presets.
- **Timeline:** Draggable keyframe times and camera frustum toggle.

## Project structure

```
src/
  App.tsx                 # App shell, viewer/path/export wiring
  main.tsx

  state/
    types.ts              # ViewerStatus, ControlMode, ViewerState
    viewerStore.ts        # Viewer UI state (status, progress, fps, controls)

  viewer/
    SplatViewer.tsx       # Mounts GaussianViewer into DOM
    gaussianViewer.ts     # GaussianSplats3D wrapper, camera, controls, render
    sceneSources.ts       # Scene presets and .ply URL validation
    metrics.ts            # FPS tracker
    controls/
      types.ts            # CameraPose, ControlMode
      input.ts            # Keyboard/mouse input
      orbitControls.ts    # Orbit/pan/zoom
      flyControls.ts      # WASD + mouse look

  path/
    types.ts              # CameraPose, Keyframe
    pathStore.ts          # Keyframes state (add/delete/reorder/time)
    presets.ts            # Turntable, dolly-in, crane-up, figure-8 generators
    serialization.ts      # Path export/import (path.json)
    player/
      PathPlayer.ts       # Preview playback along keyframes
      sampler.ts         # samplePoseAtTime (spline + slerp + easing)
    math/
      catmullRom.ts       # Position spline
      quat.ts             # SLERP for rotation
      easing.ts           # easeInOutCubic

  ui/
    ViewerHUD.tsx         # Status, progress, FPS, point count
    ViewerControls.tsx    # Load, Frame Scene, Reset View, orbit/fly, sliders
    KeyframePanel.tsx     # Keyframes list, timeline, presets, preview
    PlaybackControls.tsx  # Play / Pause / Stop, loop, seek
    ExportPanel.tsx      # Export MP4, progress, cancel, output link
    styles.css            # Shared UI styles

server/
  index.js                # Export API: start, upload frames, FFmpeg finish
```

## References

- Web viewer: [GaussianSplats3D](https://github.com/mkkellogg/GaussianSplats3D)
- Example scenes: [gaussian-splatting](https://github.com/graphdeco-inria/gaussian-splatting) (pretrained links)
