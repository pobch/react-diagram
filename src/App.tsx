import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import rough from 'roughjs/bundled/rough.esm'
import { CanvasForSelection } from './CanvasForSelection'
import { CanvasForRect } from './CanvasForRect'
import { CanvasForLinear } from './CanvasForLinear'
import { CanvasForPencil } from './CanvasForPencil'
import getStroke from 'perfect-freehand'
import { CanvasForText } from './CanvasForText'
import { CanvasForHand } from './CanvasForHand'
import { ToolRadio } from './ToolRadio'
import { CmdButton } from './CmdButton'
import { CONFIG } from './config'
import { ImageUploadButton } from './ImageUploadButton'
import { zIndex } from './helpers/zIndex'
import { useCanvasSize } from './useCanvasSize'
import { useHistory } from './snapshotManipulation'

// copy from perfect-freehand doc
export function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return ''

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      // @ts-expect-error: noUncheckedIndexedAccess
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    // @ts-expect-error: noUncheckedIndexedAccess
    ['M', ...stroke[0], 'Q']
  )

  d.push('Z')
  return d.join(' ')
}

/**
 * * ---------------------------------------
 * *            Component
 * * ---------------------------------------
 */
export type TTool = 'selection' | 'line' | 'rectangle' | 'pencil' | 'text' | 'hand' | 'arrow'

export function App() {
  const [tool, setTool] = useState<TTool>('selection')
  const {
    currentSnapshot,
    commitNewSnapshot,
    replaceCurrentSnapshotByReplacingElements,
    replaceCurrentSnapshotByRemovingElement,
    undo,
    redo,
    DEBUG_importSnapshot,
  } = useHistory()

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [zoomLevel, setZoomLevel] = useState(1)
  const [originOffset, setOriginOffset] = useState({ x: 0, y: 0 })

  // * ----------- For Debugging -----------
  // Can remove this anytime
  useEffect(
    function FOR_DEBUG() {
      // not support image element
      ;(window as any).exportSnapshot = () => {
        return currentSnapshot
      }
      ;(window as any).importSnapshot = DEBUG_importSnapshot
    },
    [DEBUG_importSnapshot, currentSnapshot]
  )

  // * ----------- Clear Canvas -------------

  function handleClickClearCanvas() {
    if (!canvasRef.current) return

    commitNewSnapshot({ mode: 'removeAllElement' })
  }

  // * ------------ Canvas Drawing ------------

  const drawScene = useCallback(
    <T,>(extra?: { elements: T[]; drawFn: (element: T, canvas: HTMLCanvasElement) => void }) => {
      if (!canvasRef.current) return

      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (!context) return

      const dpr = window.devicePixelRatio || 1
      context.save()

      // scale from the top-left, then translate() to make it seem like zooming from the center
      context.scale(dpr * zoomLevel, dpr * zoomLevel)
      context.clearRect(0, 0, canvas.width / zoomLevel, canvas.height / zoomLevel)
      context.translate(originOffset.x, originOffset.y)

      // for debug
      // context.strokeStyle = 'red'
      // context.lineWidth = 5
      // context.strokeRect(0, 0, canvas.width / zoomLevel, canvas.height / zoomLevel)

      const roughCanvas = rough.canvas(canvas, { options: { seed: CONFIG.SEED } })
      currentSnapshot.forEach((element) => {
        if (element.type === 'line' || element.type === 'rectangle' || element.type === 'arrow') {
          element.roughElements.forEach((roughElement) => {
            roughCanvas.draw(roughElement)
          })
        } else if (element.type === 'pencil') {
          const stroke = getSvgPathFromStroke(getStroke(element.points, { size: 4 }))
          // context.fillStyle = 'red'
          context.fill(new Path2D(stroke))
        } else if (element.type === 'text' && !element.isWriting) {
          context.textBaseline = 'top'
          context.font = '1.5rem "Nanum Pen Script"'
          for (let i = 0; i < element.lines.length; i++) {
            const line = element.lines[i]
            if (!line) continue
            context.fillText(line.lineContent, line.lineX1, line.lineY1)
          }
        } else if (element.type === 'image') {
          context.drawImage(
            element.data,
            element.x1,
            element.y1,
            element.x2 - element.x1,
            element.y2 - element.y1
          )
        }
      })

      // Check if there are additional elements we want to draw, e.g. dashed selection
      if (extra) {
        extra.elements.forEach((element) => {
          extra.drawFn(element, canvas)
        })
      }

      context.restore()
    },
    [currentSnapshot, originOffset.x, originOffset.y, zoomLevel]
  )

  useLayoutEffect(() => {
    // In case of a selection tool, we need to delegate the whole canvas drawing to the child component
    // ... because there are additional elements we want to draw which are in the child's state
    if (tool === 'selection') {
      return
    }

    drawScene()
  }, [
    drawScene,
    // ! also add tool as dependencies even though it's not being used inside useLayoutEffect()
    tool,
  ])

  const forceRedrawScene = useCallback(() => {
    // ! This is a hack
    // To redraw scene, we need to trigger useLayoutEffect().
    // ... But, there are different useLayoutEffect() living in this component and in <CanvasForSelection/>.
    // ... There is a logic to run only one useLayoutEffect() at any time depending on which tool is selected.
    // We decided to indirectly trigger the correct useLayoutEffect() by just switching the tool and let the existing logics handle the rest.
    setTool((prev) => {
      if (prev !== 'selection') return 'selection'
      else return 'hand'
    })
  }, [])

  // * --------------- Reusable renderProps ---------------
  const { canvasSize, recalculateCanvasSize } = useCanvasSize({
    forceRedrawScene,
  })

  function renderCanvas({
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onClick,
    styleCursor,
  }: {
    onPointerDown?: (e: React.PointerEvent) => void
    onPointerMove?: (e: React.PointerEvent) => void
    onPointerUp?: (e: React.PointerEvent) => void
    onClick?: (e: React.MouseEvent) => void
    styleCursor?: 'default' | 'move' | 'nesw-resize' | 'nwse-resize' | 'text' | 'grab' | 'grabbing'
  }) {
    // Get the device pixel ratio, falling back to 1.
    const dpr = window.devicePixelRatio || 1
    return (
      <canvas
        ref={canvasRef}
        style={{
          backgroundColor: 'AliceBlue',
          display: 'block',
          width: canvasSize.width,
          height: canvasSize.height,

          // disable all touch behavior from browser, e.g. touch to scroll
          touchAction: 'none',

          ...(styleCursor ? { cursor: styleCursor } : {}),
        }}
        width={canvasSize.width * dpr}
        height={canvasSize.height * dpr}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onClick}
      >
        My Canvas
      </canvas>
    )
  }
  // * ---------------------- Others ------------------------

  function viewportCoordsToSceneCoords({
    viewportX,
    viewportY,
  }: {
    viewportX: number
    viewportY: number
  }) {
    return {
      sceneX: viewportX / zoomLevel - originOffset.x,
      sceneY: viewportY / zoomLevel - originOffset.y,
    }
  }

  function sceneCoordsToViewportCoords({ sceneX, sceneY }: { sceneX: number; sceneY: number }) {
    return {
      viewportX: (sceneX + originOffset.x) * zoomLevel,
      viewportY: (sceneY + originOffset.y) * zoomLevel,
    }
  }

  function handleClickZoomIn() {
    if (!canvasRef.current) return

    const dpr = window.devicePixelRatio
    const nextZoom = zoomLevel + 0.1
    setZoomLevel(nextZoom)
    // offset (0, 0) to the same point as zoomLevel === 1
    setOriginOffset({
      x:
        originOffset.x -
        (canvasRef.current.width / zoomLevel - canvasRef.current.width) / (2 * dpr) +
        (canvasRef.current.width / nextZoom - canvasRef.current.width) / (2 * dpr),
      y:
        originOffset.y -
        (canvasRef.current.height / zoomLevel - canvasRef.current.height) / (2 * dpr) +
        (canvasRef.current.height / nextZoom - canvasRef.current.height) / (2 * dpr),
    })
  }

  function handleClickZoomOut() {
    if (!canvasRef.current) return

    const dpr = window.devicePixelRatio
    const nextZoom = Math.max(zoomLevel - 0.1, 0.1)
    setZoomLevel(nextZoom)
    // offset (0, 0) to the same point as zoomLevel === 1
    setOriginOffset({
      x:
        originOffset.x -
        (canvasRef.current!.width / zoomLevel - canvasRef.current!.width) / (2 * dpr) +
        (canvasRef.current!.width / nextZoom - canvasRef.current!.width) / (2 * dpr),
      y:
        originOffset.y -
        (canvasRef.current!.height / zoomLevel - canvasRef.current!.height) / (2 * dpr) +
        (canvasRef.current!.height / nextZoom - canvasRef.current!.height) / (2 * dpr),
    })
  }

  function handleClickResetPanZoom() {
    setZoomLevel(1)
    setOriginOffset({ x: 0, y: 0 })
  }

  // * --------------------- Rendering -----------------------
  const [shouldShowOverlay, setShouldShowOverlay] = useState(true)
  return (
    <>
      {/* Overlay at first visit */}
      {shouldShowOverlay ? (
        <div
          style={{
            position: 'fixed',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            display: 'grid',
            placeContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            zIndex: zIndex[30],
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <CmdButton
              iconWidth={50}
              cmdName="fitToScreen"
              onClick={() => {
                recalculateCanvasSize()
                // forceRedrawScene()
                setShouldShowOverlay(false)
              }}
            />
          </div>
          <div style={{ textAlign: 'center' }}>↑</div>
          <ul style={{ maxWidth: 400, padding: '1rem 1rem 1rem 1.5rem' }}>
            <li>First, adjust the application size to fit the screen.</li>
            <li>You can also find this button at the bottom of the screen.</li>
            <li>
              While drawing, you may need to click this button to re-adjust the screen if the
              pointer position is inaccurate.
            </li>
          </ul>
        </div>
      ) : null}

      {/* Main App */}
      <div style={{ position: 'relative' }}>
        {/* Top Menu */}
        <fieldset
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            margin: '0.5rem',
            padding: '0.25rem',
            backgroundColor: 'white',
            zIndex: zIndex[20],
          }}
        >
          <legend>Tool</legend>
          <span style={{ paddingInlineEnd: '0.5rem' }}>
            <ToolRadio toolName="selection" currentTool={tool} setCurrentTool={setTool} />
          </span>
          <span style={{ paddingInlineEnd: '0.5rem' }}>
            <ToolRadio toolName="line" currentTool={tool} setCurrentTool={setTool} />
          </span>
          <span style={{ paddingInlineEnd: '0.5rem' }}>
            <ToolRadio toolName="rectangle" currentTool={tool} setCurrentTool={setTool} />
          </span>
          <span style={{ paddingInlineEnd: '0.5rem' }}>
            <ToolRadio toolName="pencil" currentTool={tool} setCurrentTool={setTool} />
          </span>
          <span style={{ paddingInlineEnd: '0.5rem' }}>
            <ToolRadio toolName="text" currentTool={tool} setCurrentTool={setTool} />
          </span>
          <span style={{ paddingInlineEnd: '0.5rem' }}>
            <ToolRadio toolName="hand" currentTool={tool} setCurrentTool={setTool} />
          </span>
          <span style={{ paddingInlineEnd: '0.5rem' }}>
            <ToolRadio toolName="arrow" currentTool={tool} setCurrentTool={setTool} />
          </span>
          <span style={{ paddingInlineEnd: '0.5rem' }}>
            <ImageUploadButton
              commitNewSnapshot={commitNewSnapshot}
              // TODO: Take viewport coords into account(to work well with zoom), instead of hardcode x1, y1 scene
              scenePositionToDrawImage={{ x1: originOffset.x + 100, y1: originOffset.y + 100 }}
              onUploadSuccess={() => setTool('selection')}
            />
          </span>
        </fieldset>

        {/* Footer Menu */}
        <div style={{ position: 'absolute', bottom: 0, padding: '1rem', zIndex: zIndex[20] }}>
          <span style={{ paddingInlineEnd: '1rem' }}>
            <CmdButton cmdName="undo" onClick={() => undo()} />
          </span>
          <span style={{ paddingInlineEnd: '1rem' }}>
            <CmdButton cmdName="redo" onClick={() => redo()} />
          </span>
          <span style={{ paddingInlineEnd: '1rem' }}>|</span>
          <span style={{ paddingInlineEnd: '1rem' }}>
            <CmdButton cmdName="clearCanvas" onClick={handleClickClearCanvas} />
          </span>
          <span style={{ paddingInlineEnd: '1rem' }}>|</span>
          <span style={{ paddingInlineEnd: '1rem' }}>
            <CmdButton cmdName="zoomOut" onClick={handleClickZoomOut} />
          </span>
          <span style={{ paddingInlineEnd: '1rem' }}>
            <CmdButton cmdName="resetPanZoom" onClick={handleClickResetPanZoom} />
          </span>
          <span style={{ paddingInlineEnd: '1rem' }}>
            <CmdButton cmdName="zoomIn" onClick={handleClickZoomIn} />
          </span>
          <span style={{ paddingInlineEnd: '1rem' }}>|</span>
          <span style={{ paddingInlineEnd: '1rem' }}>
            <CmdButton
              cmdName="fitToScreen"
              onClick={() => {
                recalculateCanvasSize()
                forceRedrawScene()
              }}
            />
          </span>
        </div>

        {/* Canvas */}
        {(() => {
          switch (tool) {
            case 'selection':
              return (
                <CanvasForSelection
                  renderCanvas={renderCanvas}
                  currentSnapshot={currentSnapshot}
                  commitNewSnapshot={commitNewSnapshot}
                  replaceCurrentSnapshotByReplacingElements={
                    replaceCurrentSnapshotByReplacingElements
                  }
                  viewportCoordsToSceneCoords={viewportCoordsToSceneCoords}
                  drawScene={drawScene}
                />
              )
            case 'rectangle':
              return (
                <CanvasForRect
                  renderCanvas={renderCanvas}
                  currentSnapshot={currentSnapshot}
                  commitNewSnapshot={commitNewSnapshot}
                  replaceCurrentSnapshotByReplacingElements={
                    replaceCurrentSnapshotByReplacingElements
                  }
                  viewportCoordsToSceneCoords={viewportCoordsToSceneCoords}
                />
              )
            case 'line':
              return (
                <CanvasForLinear
                  renderCanvas={renderCanvas}
                  currentSnapshot={currentSnapshot}
                  commitNewSnapshot={commitNewSnapshot}
                  replaceCurrentSnapshotByReplacingElements={
                    replaceCurrentSnapshotByReplacingElements
                  }
                  viewportCoordsToSceneCoords={viewportCoordsToSceneCoords}
                  lineType="line"
                />
              )
            case 'pencil':
              return (
                <CanvasForPencil
                  renderCanvas={renderCanvas}
                  currentSnapshot={currentSnapshot}
                  commitNewSnapshot={commitNewSnapshot}
                  replaceCurrentSnapshotByReplacingElements={
                    replaceCurrentSnapshotByReplacingElements
                  }
                  viewportCoordsToSceneCoords={viewportCoordsToSceneCoords}
                />
              )
            case 'text':
              return (
                <CanvasForText
                  renderCanvas={renderCanvas}
                  currentSnapshot={currentSnapshot}
                  commitNewSnapshot={commitNewSnapshot}
                  replaceCurrentSnapshotByReplacingElements={
                    replaceCurrentSnapshotByReplacingElements
                  }
                  replaceCurrentSnapshotByRemovingElement={replaceCurrentSnapshotByRemovingElement}
                  viewportCoordsToSceneCoords={viewportCoordsToSceneCoords}
                  sceneCoordsToViewportCoords={sceneCoordsToViewportCoords}
                  zoomLevel={zoomLevel}
                />
              )
            case 'hand':
              return (
                <CanvasForHand
                  renderCanvas={renderCanvas}
                  viewportCoordsToSceneCoords={viewportCoordsToSceneCoords}
                  setOriginOffset={setOriginOffset}
                />
              )
            case 'arrow':
              return (
                <CanvasForLinear
                  renderCanvas={renderCanvas}
                  currentSnapshot={currentSnapshot}
                  commitNewSnapshot={commitNewSnapshot}
                  replaceCurrentSnapshotByReplacingElements={
                    replaceCurrentSnapshotByReplacingElements
                  }
                  viewportCoordsToSceneCoords={viewportCoordsToSceneCoords}
                  lineType="arrow"
                />
              )
          }
        })()}
      </div>
    </>
  )
}
