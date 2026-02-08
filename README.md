# Gaussian Splats Viewer (MVP)

A minimal React + Vite viewer that loads public `.ply` Gaussian splats using GaussianSplats3D. Includes a lightweight HUD, loading progress, FPS meter, and scene controls.

## Prerequisites

- Node.js 20.17+ (recommended) or Node.js 22+

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

## Export Server

The MP4 export uses a small Node server with native FFmpeg. Start it in another terminal:

```bash
npm run server
```

Requirements:
- FFmpeg installed and available on your PATH.

## Load a Scene

1. Pick a preset (placeholders for now) or paste a public `.ply` URL.
2. Click **Load**.
3. Use **Frame Scene** or **Reset View** to adjust the camera.

## Notes

- Renderer: GaussianSplats3D (https://github.com/mkkellogg/GaussianSplats3D)
- Example `.ply` scenes can be found from the pretrained links in https://github.com/graphdeco-inria/gaussian-splatting
- Presets are placeholders so you can paste your own URLs.
- Export server default URL: `http://localhost:5174` (override with `VITE_EXPORT_SERVER_URL`).

## Project Structure

```
src/
  main.tsx
  App.tsx

  state/
    viewerStore.ts
    types.ts

  viewer/
    SplatViewer.tsx
    gaussianViewer.ts
    sceneSources.ts
    metrics.ts

  ui/
    ViewerHUD.tsx
    ViewerControls.tsx
    styles.css
```
# viggle-assignment-
