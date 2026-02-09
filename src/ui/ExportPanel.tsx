/** Export panel: Export MP4 button, progress bar, cancel, output link. */
interface ExportPanelProps {
  isExporting: boolean
  progress: number
  status: string
  onExport: () => void
  onCancel: () => void
  onRerun: () => void
  canRerun: boolean
  outputUrl?: string
}

export function ExportPanel({
  isExporting,
  progress,
  status,
  onExport,
  onCancel,
  onRerun,
  canRerun,
  outputUrl,
}: ExportPanelProps) {
  return (
    <div className="export-panel">
      <label className="control-label">Export</label>
      <div className="export-status">{status}</div>
      <div className="export-bar">
        <div className="export-bar-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <div className="export-actions">
        <button className="control-button primary" onClick={onExport} disabled={isExporting}>
          Export MP4
        </button>
        <button className="control-button" onClick={onCancel} disabled={!isExporting}>
          Cancel
        </button>
        <button className="control-button" onClick={onRerun} disabled={isExporting || !canRerun}>
          Re-run Last
        </button>
      </div>
      {outputUrl ? (
        <div className="export-link">
          <code>{outputUrl}</code>
        </div>
      ) : null}
    </div>
  )
}
