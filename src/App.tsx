import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Drawable } from 'roughjs/bin/core'
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

export type TElementData =
  | {
      type: 'line' | 'rectangle' | 'arrow'
      id: number
      x1: number
      y1: number
      x2: number
      y2: number
      roughElements: Drawable[]
    }
  | {
      type: 'pencil'
      id: number
      points: { x: number; y: number }[]
    }
  | {
      type: 'text'
      id: number
      isWriting: boolean
      lines: {
        lineX1: number
        lineY1: number
        lineWidth: number
        lineHeight: number
        lineContent: string
      }[]
    }
  | {
      type: 'removed'
      id: number
    }

export type TSnapshot = TElementData[]

type DistributiveOmit<T, K extends PropertyKey> = T extends any ? Omit<T, K> : never

export type TCommitNewSnapshotParam =
  | { mode: 'clone' }
  | { mode: 'addElement'; newElementWithoutId: DistributiveOmit<TElementData, 'id'> }
  | { mode: 'removeElements'; elementIds: number[] }
  | { mode: 'removeAllElement' }
  | { mode: 'modifyElement'; modifiedElement: TElementData }
export type TReplaceCurrentSnapshotParam = {
  replacedElement?: TElementData
  replacedMultiElements?: TElementData[]
}

function useHistory() {
  const [history, setHistory] = useState<TSnapshot[]>([[]])
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentSnapshot = history[currentIndex]
  if (!currentSnapshot) {
    throw new Error('The whole current snapshot is not exist in this point of history!!')
  }

  function commitNewSnapshot(options: TCommitNewSnapshotParam) {
    if (!currentSnapshot) {
      throw new Error('The whole current snapshot is not exist in this point of history!!')
    }
    let newSnapshot: TSnapshot
    if (options.mode === 'clone') {
      newSnapshot = [...currentSnapshot]
    } else if (options.mode === 'addElement') {
      const newElement = {
        ...options.newElementWithoutId,
        id: currentSnapshot.length,
      }
      newSnapshot = [...currentSnapshot, newElement]
    } else if (options.mode === 'removeElements') {
      newSnapshot = [...currentSnapshot]
      options.elementIds.forEach((elementId) => {
        newSnapshot[elementId] = {
          id: elementId,
          type: 'removed',
        }
      })
    } else if (options.mode === 'removeAllElement') {
      newSnapshot = []
    } else if (options.mode === 'modifyElement') {
      newSnapshot = [...currentSnapshot]
      newSnapshot[options.modifiedElement.id] = { ...options.modifiedElement }
    }
    setHistory((prevHistory) => {
      const newHistory = [...prevHistory.slice(0, currentIndex + 1), newSnapshot]
      setCurrentIndex(newHistory.length - 1)
      return newHistory
    })

    // for "addElement" mode, we also return new element's id
    if (options.mode === 'addElement') {
      return currentSnapshot.length
    }
    return
  }

  function replaceCurrentSnapshot({
    replacedElement,
    replacedMultiElements,
  }: TReplaceCurrentSnapshotParam) {
    if (!currentSnapshot) {
      throw new Error('The whole current snapshot is not exist in this point of history!!')
    }
    if (replacedElement && replacedMultiElements) {
      throw new Error('This function cannot receive both arguments at the same time')
    }
    if (!replacedElement && !replacedMultiElements) {
      throw new Error('This function requires at least 1 argument')
    }
    if (replacedElement) {
      let newSnapshot = [...currentSnapshot]
      newSnapshot[replacedElement.id] = { ...replacedElement }
      setHistory((prevHistory) => [...prevHistory.slice(0, currentIndex), newSnapshot])
      return
    }
    if (replacedMultiElements) {
      let newSnapshot = [...currentSnapshot]
      replacedMultiElements.forEach((replacedElement) => {
        newSnapshot[replacedElement.id] = { ...replacedElement }
      })
      setHistory((prevHistory) => [...prevHistory.slice(0, currentIndex), newSnapshot])
      return
    }
  }

  function undo() {
    setCurrentIndex((prev) => {
      return prev >= 1 ? prev - 1 : 0
    })
  }

  function redo() {
    setCurrentIndex((prev) => {
      return prev <= history.length - 2 ? prev + 1 : history.length - 1
    })
  }

  return {
    elementsSnapshot: currentSnapshot,
    commitNewSnapshot,
    replaceCurrentSnapshot,
    undo,
    redo,
  }
}

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
  const { elementsSnapshot, commitNewSnapshot, replaceCurrentSnapshot, undo, redo } = useHistory()

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [zoomLevel, setZoomLevel] = useState(1)
  const [originOffset, setOriginOffset] = useState({ x: 0, y: 0 })

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
      elementsSnapshot.forEach((element) => {
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
        } else if (element.type === 'removed') {
          // don't draw
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
    [elementsSnapshot, originOffset.x, originOffset.y, zoomLevel]
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

  // * --------------- Reusable renderProps ---------------
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
          width: window.innerWidth,
          height: window.innerHeight,

          // disable all touch behavior from browser, e.g. touch to scroll
          touchAction: 'none',

          ...(styleCursor ? { cursor: styleCursor } : {}),
        }}
        width={window.innerWidth * dpr}
        height={window.innerHeight * dpr}
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
  return (
    <div>
      {/* Top Menu */}
      <fieldset
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          margin: '0.5rem',
          padding: '0.25rem',
          backgroundColor: 'white',
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
      </fieldset>

      {/* Footer Menu */}
      <div style={{ position: 'fixed', bottom: 0, padding: '1rem' }}>
        <span style={{ paddingInlineEnd: '0.5rem' }}>
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
        <span style={{ paddingInlineEnd: '0.5rem' }}>
          <CmdButton cmdName="zoomOut" onClick={handleClickZoomOut} />
        </span>
        <span style={{ paddingInlineEnd: '0.5rem' }}>
          <CmdButton cmdName="resetPanZoom" onClick={handleClickResetPanZoom} />
        </span>
        <span style={{ paddingInlineEnd: '0.5rem' }}>
          <CmdButton cmdName="zoomIn" onClick={handleClickZoomIn} />
        </span>
      </div>

      {/* Canvas */}
      {(() => {
        switch (tool) {
          case 'selection':
            return (
              <CanvasForSelection
                renderCanvas={renderCanvas}
                elementsSnapshot={elementsSnapshot}
                commitNewSnapshot={commitNewSnapshot}
                replaceCurrentSnapshot={replaceCurrentSnapshot}
                viewportCoordsToSceneCoords={viewportCoordsToSceneCoords}
                drawScene={drawScene}
              />
            )
          case 'rectangle':
            return (
              <CanvasForRect
                renderCanvas={renderCanvas}
                elementsSnapshot={elementsSnapshot}
                commitNewSnapshot={commitNewSnapshot}
                replaceCurrentSnapshot={replaceCurrentSnapshot}
                viewportCoordsToSceneCoords={viewportCoordsToSceneCoords}
              />
            )
          case 'line':
            return (
              <CanvasForLinear
                renderCanvas={renderCanvas}
                elementsSnapshot={elementsSnapshot}
                commitNewSnapshot={commitNewSnapshot}
                replaceCurrentSnapshot={replaceCurrentSnapshot}
                viewportCoordsToSceneCoords={viewportCoordsToSceneCoords}
                lineType="line"
              />
            )
          case 'pencil':
            return (
              <CanvasForPencil
                renderCanvas={renderCanvas}
                elementsSnapshot={elementsSnapshot}
                commitNewSnapshot={commitNewSnapshot}
                replaceCurrentSnapshot={replaceCurrentSnapshot}
                viewportCoordsToSceneCoords={viewportCoordsToSceneCoords}
              />
            )
          case 'text':
            return (
              <CanvasForText
                renderCanvas={renderCanvas}
                elementsSnapshot={elementsSnapshot}
                commitNewSnapshot={commitNewSnapshot}
                replaceCurrentSnapshot={replaceCurrentSnapshot}
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
                elementsSnapshot={elementsSnapshot}
                commitNewSnapshot={commitNewSnapshot}
                replaceCurrentSnapshot={replaceCurrentSnapshot}
                viewportCoordsToSceneCoords={viewportCoordsToSceneCoords}
                lineType="arrow"
              />
            )
        }
      })()}
    </div>
  )
}
