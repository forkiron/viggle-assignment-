# Design Note (Camera Path + Export)

## Camera/Path Representation
- **CameraPose** stores `position`, `quaternion`, and `fov`.
- **Keyframe** stores a `pose` plus a `t` time value (seconds from start).
- Playback samples by time: find segment `[i, i+1]` where `t` lands, then interpolate.
- Position uses **Catmull-Rom** (clamped endpoints; linear fallback for 2 keyframes).
- Rotation uses **quaternion slerp** with shortest-path correction.
- FOV is linearly interpolated and eased with the same timing curve.

## Export Pipeline
1. Frontend builds `path.json` (scene URL, keyframes, render settings).
2. Frontend renders frames deterministically at `t = frame / fps`.
3. Each PNG frame is uploaded sequentially to `/export/:id/frame`.
4. Server runs `ffmpeg` to encode `output.mp4` with `yuv420p` + `faststart`.
5. Cancel stops encoding and removes the export folder.

## Performance Consideration
Export uploads frames one-by-one to avoid large in-memory buffers. This keeps memory bounded and prevents crashes on long renders.
