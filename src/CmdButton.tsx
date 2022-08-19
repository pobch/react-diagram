import undoSrc from './assets/undo.svg'
import redoSrc from './assets/redo.svg'
import zoomOutSrc from './assets/zoom-out.svg'
import zoomInSrc from './assets/zoom-in.svg'
import resetPanZoomSrc from './assets/reset.svg'
import clearCanvasSrc from './assets/delete.svg'
import deleteElementSrc from './assets/x-circle.svg'
import doneEditingTextSrc from './assets/plus.svg'
import fitToScreenSrc from './assets/fit-screen.svg'

export function CmdButton({
  cmdName,
  onClick,
  iconWidth,
}: {
  cmdName:
    | 'undo'
    | 'redo'
    | 'zoomOut'
    | 'zoomIn'
    | 'resetPanZoom'
    | 'clearCanvas'
    | 'deleteElement'
    | 'doneEditingText'
    | 'fitToScreen'
  onClick: (e: React.MouseEvent) => void
  iconWidth?: number
}) {
  const srcMap: Record<typeof cmdName, string> = {
    undo: undoSrc,
    redo: redoSrc,
    zoomOut: zoomOutSrc,
    zoomIn: zoomInSrc,
    resetPanZoom: resetPanZoomSrc,
    clearCanvas: clearCanvasSrc,
    deleteElement: deleteElementSrc,
    doneEditingText: doneEditingTextSrc,
    fitToScreen: fitToScreenSrc,
  }

  return (
    <button onClick={onClick}>
      <img
        src={srcMap[cmdName]}
        alt={cmdName}
        width={iconWidth ? iconWidth : 20}
        style={{ verticalAlign: 'bottom' }}
      />
    </button>
  )
}
