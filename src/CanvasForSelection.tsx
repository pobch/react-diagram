import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import * as React from 'react'
import {
  getMultiElementsInSnapshot,
  TCommitNewSnapshotFn,
  TElementData,
  TReplaceCurrentSnapshotParam,
  TSnapshot,
} from './snapshotManipulation'
import rough from 'roughjs/bundled/rough.esm'
import getStroke from 'perfect-freehand'
import { CmdButton } from './CmdButton'
import { createPointerHandlers } from './selectionToolHelpers/eventHandlers'
import { CONFIG } from './config'
import {
  TAreaSelectData,
  TUiState,
  useSelectionMachine,
} from './selectionToolHelpers/useSelectionMachine'
import { getSvgPathFromStroke } from './App'

// * -------------------------- Helpers --------------------------

function getSelectedElementIdsFromState(uiState: TUiState) {
  let elementIds: number[] = []

  if (uiState.state === 'readyToMove' || uiState.state === 'moving') {
    elementIds = uiState.data.map((moveData) => moveData.elementId)
  } else if (
    uiState.state === 'readyToResize' ||
    uiState.state === 'resizing' ||
    uiState.state === 'singleElementSelected'
  ) {
    elementIds = [uiState.data.elementId]
  } else if (uiState.state === 'areaSelecting') {
    elementIds = uiState.data.selectedElementIds
  } else if (uiState.state === 'multiElementSelected') {
    elementIds = uiState.data.elementIds
  } else {
    throw new Error(`Cannot extract selected element ids from "${uiState.state}" state`)
  }

  return elementIds
}

export type TCursorType = 'default' | 'move' | 'nesw-resize' | 'nwse-resize'

/**
 * * -----------------------------------------
 * *               Component
 * * -----------------------------------------
 */
export function CanvasForSelection({
  renderCanvas,
  currentSnapshot,
  commitNewSnapshot,
  replaceCurrentSnapshotByReplacingElements,
  viewportCoordsToSceneCoords,
  drawScene,
}: {
  renderCanvas: (arg: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    styleCursor: 'default' | 'move' | 'nesw-resize' | 'nwse-resize'
  }) => React.ReactElement
  currentSnapshot: TSnapshot
  commitNewSnapshot: TCommitNewSnapshotFn
  replaceCurrentSnapshotByReplacingElements: (arg: TReplaceCurrentSnapshotParam) => void
  viewportCoordsToSceneCoords: (arg: { viewportX: number; viewportY: number }) => {
    sceneX: number
    sceneY: number
  }
  drawScene: (extra?: {
    elements: (TElementData | TAreaSelectData['rectangleSelector'])[]
    drawFn: (
      element: TElementData | TAreaSelectData['rectangleSelector'],
      canvas: HTMLCanvasElement
    ) => void
  }) => void
}) {
  const canvasForMeasureRef = useRef<HTMLCanvasElement | null>(null)
  const { uiState, actions } = useSelectionMachine({
    currentSnapshot,
    commitNewSnapshot,
    replaceCurrentSnapshotByReplacingElements,
    canvasForMeasureRef,
  })

  // useLayoutEffect() in the parent will be ignored in case of a selection tool.
  // ... Therefore, all canvas drawing logics need to be here instead.
  useLayoutEffect(() => {
    // all state we want to draw dashed lines
    if (
      uiState.state === 'readyToMove' ||
      uiState.state === 'moving' ||
      uiState.state === 'readyToResize' ||
      uiState.state === 'resizing' ||
      uiState.state === 'areaSelecting' ||
      uiState.state === 'singleElementSelected' ||
      uiState.state === 'multiElementSelected'
    ) {
      const selectedElementIds = getSelectedElementIdsFromState(uiState)
      let extraElements: (TElementData | TAreaSelectData['rectangleSelector'])[] =
        getMultiElementsInSnapshot({ snapshot: currentSnapshot, elementIds: selectedElementIds })

      // also draw rectangle selector (if exist)
      if (uiState.state === 'areaSelecting') {
        extraElements.push(uiState.data.rectangleSelector)
      }

      // draw dashed selection around all selected elements as an extra
      drawScene({
        elements: extraElements,
        drawFn: (element, canvas) => {
          if (element.type === 'rectangle' || element.type === 'image') {
            const roughCanvas = rough.canvas(canvas, { options: { seed: CONFIG.SEED } })
            const dashOffset = 5
            const dashTopLeft = {
              x: element.x1 - dashOffset,
              y: element.y1 - dashOffset,
            }
            const dashBottomRight = {
              x: element.x2 + dashOffset,
              y: element.y2 + dashOffset,
            }

            roughCanvas.rectangle(
              dashTopLeft.x,
              dashTopLeft.y,
              dashBottomRight.x - dashTopLeft.x,
              dashBottomRight.y - dashTopLeft.y,
              {
                strokeLineDash: [5, 5],
              }
            )

            // corners
            if (uiState.state !== 'multiElementSelected') {
              roughCanvas.rectangle(dashTopLeft.x, dashTopLeft.y, dashOffset * 2, dashOffset * 2)
              roughCanvas.rectangle(
                dashTopLeft.x,
                dashBottomRight.y - dashOffset * 2,
                dashOffset * 2,
                dashOffset * 2
              )
              roughCanvas.rectangle(
                dashBottomRight.x - dashOffset * 2,
                dashBottomRight.y - dashOffset * 2,
                dashOffset * 2,
                dashOffset * 2
              )
              roughCanvas.rectangle(
                dashBottomRight.x - dashOffset * 2,
                dashTopLeft.y,
                dashOffset * 2,
                dashOffset * 2
              )
            }

            return
          } else if (element.type === 'rectangleSelector') {
            const context = canvas.getContext('2d')
            if (!context) return

            context.save()
            context.fillStyle = 'rgba(192, 38, 211, 0.2)'
            context.fillRect(
              element.x1,
              element.y1,
              element.x2 - element.x1,
              element.y2 - element.y1
            )
            context.restore()
            return
          } else if (element.type === 'line' || element.type === 'arrow') {
            const roughCanvas = rough.canvas(canvas, { options: { seed: CONFIG.SEED } })
            const dashOffset = 5

            // TODO: find better math equation
            roughCanvas.line(
              element.x1,
              element.y1 - dashOffset,
              element.x2,
              element.y2 - dashOffset,
              { strokeLineDash: [5, 5] }
            )
            roughCanvas.line(
              element.x1,
              element.y1 + dashOffset,
              element.x2,
              element.y2 + dashOffset,
              { strokeLineDash: [5, 5] }
            )

            // start/end of the line
            if (uiState.state !== 'multiElementSelected') {
              roughCanvas.rectangle(
                element.x1,
                element.y1 - dashOffset,
                dashOffset * 2,
                dashOffset * 2
              )
              roughCanvas.rectangle(
                element.x2,
                element.y2 - dashOffset,
                dashOffset * 2,
                dashOffset * 2
              )
            }

            return
          } else if (element.type === 'pencil') {
            const context = canvas.getContext('2d')
            if (!context) return

            context.save()
            const stroke = getSvgPathFromStroke(
              getStroke(element.points, { size: 14, end: { cap: false }, start: { cap: false } })
            )
            context.setLineDash([5, 5])
            context.stroke(new Path2D(stroke))
            context.restore()
            return
          } else if (element.type === 'text') {
            const context = canvas.getContext('2d')
            if (!context) return

            context.save()
            context.setLineDash([5, 5])

            // TODO: find a way to offset the dashed selection
            for (let i = 0; i < element.lines.length; i++) {
              const line = element.lines[i]
              if (!line) continue
              context.strokeRect(line.lineX1, line.lineY1, line.lineWidth, line.lineHeight)
            }
            context.restore()
            return
          }
        },
      })
      return
    }

    // all other state have no extra dashed lines, just normally draw the snapshot
    drawScene()
    return
  }, [uiState, drawScene, currentSnapshot])

  // ?? Is there any better approach
  // Reset uiState when it is holding an element's id that is not being drawn in the canvas.
  // Example case#1:
  // 1. Click to select the latest created element (the element id is recorded in uiState)
  // 2. Click undo until the selected element disappear (at this state, the snapshot revert
  //    to the point that does not have this element at all, but uiState is still holding the element id)
  // Case#2:
  // 1. Click to select any element
  // 2. Click a remove button (the selected element got removed from the snapshot,
  //    but uiState still holding its id)
  // TODO: A Better approach:
  // 1. In the parent component, set `key` for this component to equal to the history index
  // 2. When the history index changes, it will always re-mount this component
  //    - The history index can be changed by undo, redo, add/remove/move/resize elements
  // 3. Remove `reset` action as a valid action of some uiState (re-consider them one-by-one)
  // 4. Remove the whole `useRef`, `useLayoutEffect`, and `useEffect` blocks below

  // need ref to avoid adding the whole `actions` object into useEffect() dep array
  const latestActionRef = useRef(actions)
  useLayoutEffect(() => {
    latestActionRef.current = actions
  })
  useEffect(() => {
    // all possible states except 'none'
    if (
      uiState.state === 'readyToMove' ||
      uiState.state === 'moving' ||
      uiState.state === 'readyToResize' ||
      uiState.state === 'resizing' ||
      uiState.state === 'areaSelecting' ||
      uiState.state === 'singleElementSelected' ||
      uiState.state === 'multiElementSelected'
    ) {
      const selectedElementIds = getSelectedElementIdsFromState(uiState)
      const selectedElementsInSnapshot = getMultiElementsInSnapshot({
        snapshot: currentSnapshot,
        elementIds: selectedElementIds,
      })
      let hasUnmatchElementInSnapshot =
        selectedElementIds.length !== selectedElementsInSnapshot.length

      if (hasUnmatchElementInSnapshot) {
        latestActionRef.current[uiState.state].reset()
      }
    }
  }, [uiState, currentSnapshot])
  // ---------------------------------------------------------

  const [cursorType, setCursorType] = useState<TCursorType>('default')

  const { handlePointerDown, handlePointerMove, handlePointerUp } = createPointerHandlers({
    uiState,
    actions,
    currentSnapshot,
    viewportCoordsToSceneCoords,
    setCursorType,
  })

  return (
    <>
      {/* // TODO: find better approach for measure text dimension */}
      <canvas
        ref={canvasForMeasureRef}
        width={1}
        height={1}
        style={{ position: 'absolute', top: -20, opacity: 0 }}
      >
        For measure text
      </canvas>

      {/* floating delete button at top-left of the screen */}
      {uiState.state === 'singleElementSelected' || uiState.state === 'multiElementSelected' ? (
        <div style={{ position: 'fixed', top: '45vh', left: '0.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <CmdButton
              cmdName="deleteElement"
              onClick={() => {
                actions[uiState.state].removeSelectedElements()
              }}
            />{' '}
            {uiState.state === 'singleElementSelected' && (
              <CmdButton
                cmdName="duplicate"
                onClick={() => {
                  actions[uiState.state].duplicateSelectedSingleElements({
                    originalElementId: uiState.data.elementId,
                  })
                }}
              />
            )}
            {uiState.state === 'multiElementSelected' && (
              <CmdButton
                cmdName="duplicate"
                onClick={() => {
                  actions[uiState.state].duplicateSelectedMultipleElements({
                    originalElementIds: uiState.data.elementIds,
                  })
                }}
              />
            )}
          </div>
        </div>
      ) : null}

      {renderCanvas({
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        styleCursor: cursorType,
      })}
    </>
  )
}
