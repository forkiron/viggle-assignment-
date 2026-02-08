import express from 'express'
import cors from 'cors'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn, spawnSync } from 'child_process'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const EXPORT_ROOT = path.join(ROOT, 'exports')

if (!fs.existsSync(EXPORT_ROOT)) {
  fs.mkdirSync(EXPORT_ROOT, { recursive: true })
}

const ffmpegCheck = spawnSync('ffmpeg', ['-version'])
if (ffmpegCheck.status !== 0) {
  console.error('FFmpeg not found. Please install ffmpeg and ensure it is in PATH.')
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

const upload = multer({ storage: multer.memoryStorage() })

const exportsMap = new Map()

const ensureExportDir = (id) => {
  const dir = path.join(EXPORT_ROOT, id)
  const framesDir = path.join(dir, 'frames')
  fs.mkdirSync(framesDir, { recursive: true })
  return { dir, framesDir }
}

app.post('/export/start', (req, res) => {
  const id = crypto.randomUUID()
  const settings = req.body || {}
  const { dir, framesDir } = ensureExportDir(id)
  fs.writeFileSync(path.join(dir, 'path.json'), JSON.stringify(settings, null, 2))

  exportsMap.set(id, {
    status: 'rendering',
    framesDir,
    dir,
    totalFrames: settings?.render?.frameCount ?? 0,
    receivedFrames: 0,
    ffmpegProcess: null,
  })

  res.json({ id })
})

app.post('/export/:id/frame', upload.single('frame'), (req, res) => {
  const { id } = req.params
  const entry = exportsMap.get(id)
  if (!entry) return res.status(404).json({ error: 'Export not found' })

  const index = Number(req.body.index)
  const filename = `frame_${String(index).padStart(6, '0')}.png`
  const outputPath = path.join(entry.framesDir, filename)
  fs.writeFileSync(outputPath, req.file.buffer)
  entry.receivedFrames += 1

  res.json({ ok: true })
})

app.post('/export/:id/finish', (req, res) => {
  const { id } = req.params
  const entry = exportsMap.get(id)
  if (!entry) return res.status(404).json({ error: 'Export not found' })

  if (entry.ffmpegProcess) {
    return res.status(409).json({ error: 'Encoding already in progress' })
  }

  const outputPath = path.join(entry.dir, 'output.mp4')

  const args = [
    '-y',
    '-framerate',
    '30',
    '-i',
    path.join(entry.framesDir, 'frame_%06d.png'),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputPath,
  ]

  entry.status = 'encoding'
  entry.ffmpegProcess = spawn('ffmpeg', args)

  entry.ffmpegProcess.on('close', (code) => {
    entry.ffmpegProcess = null
    if (code === 0) {
      entry.status = 'done'
    } else {
      entry.status = 'error'
    }
  })

  res.json({ ok: true, output: `/exports/${id}/output.mp4` })
})

app.post('/export/:id/cancel', (req, res) => {
  const { id } = req.params
  const entry = exportsMap.get(id)
  if (!entry) return res.status(404).json({ error: 'Export not found' })

  if (entry.ffmpegProcess) {
    entry.ffmpegProcess.kill('SIGKILL')
    entry.ffmpegProcess = null
  }

  entry.status = 'cancelled'
  res.json({ ok: true })
})

app.get('/export/:id/status', (req, res) => {
  const { id } = req.params
  const entry = exportsMap.get(id)
  if (!entry) return res.status(404).json({ error: 'Export not found' })

  res.json({
    status: entry.status,
    receivedFrames: entry.receivedFrames,
    totalFrames: entry.totalFrames,
  })
})

app.use('/exports', express.static(EXPORT_ROOT))

const PORT = process.env.PORT || 5174
app.listen(PORT, () => {
  console.log(`Export server running on http://localhost:${PORT}`)
})
