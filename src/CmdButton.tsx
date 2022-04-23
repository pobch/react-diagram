import undoSrc from './assets/undo.svg'
import redoSrc from './assets/redo.svg'
import zoomOutSrc from './assets/zoom-out.svg'
import zoomInSrc from './assets/zoom-in.svg'
import resetPanZoomSrc from './assets/reset.svg'
import clearCanvasSrc from './assets/delete.svg'
import deleteElementSrc from './assets/x-circle.svg'

export function CmdButton({
  cmdName,
  onClick,
}: {
  cmdName: 'undo' | 'redo' | 'zoomOut' | 'zoomIn' | 'resetPanZoom' | 'clearCanvas' | 'deleteElement'
  onClick: () => void
}) {
  const srcMap: Record<typeof cmdName, string> = {
    undo: undoSrc,
    redo: redoSrc,
    zoomOut: zoomOutSrc,
    zoomIn: zoomInSrc,
    resetPanZoom: resetPanZoomSrc,
    clearCanvas: clearCanvasSrc,
    deleteElement: deleteElementSrc,
  }

  return (
    <button onClick={onClick}>
      <img src={srcMap[cmdName]} alt={cmdName} width={20} style={{ verticalAlign: 'bottom' }} />
    </button>
  )
}
