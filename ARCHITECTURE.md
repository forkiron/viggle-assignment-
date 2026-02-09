# Architecture

```
                     ┌──────────────┐
                     │     User     │
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │      UI      │
                     └───┬────┬─────┘
                         │    │
         load .ply       │    │ edit keyframes
                         │    ▼
                         │  ┌────────────────────┐
                         │  │ Camera Path System │
                         │  │ add/delete/reorder │
                         │  │ timeline controls  │
                         │  └─────────┬──────────┘
                         │            │
                         │ camera pose over time
                         ▼
                     ┌───────────────┐
                     │ Export Pipeline│
                     │ t = frame/fps │
                     └──────┬────────┘
                             │ upload PNG frames
                             ▼
                      ┌──────────────┐
                      │ Export Server│
                      └──────┬───────┘
                             ▼
                         ┌────────┐
                         │ FFmpeg │
                         └────┬───┘
                              ▼
                        ┌───────────┐
                        │ output.mp4│
                        └───────────┘
```
