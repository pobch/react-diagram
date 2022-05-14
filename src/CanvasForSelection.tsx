import { useState, useRef, useLayoutEffect, useEffect, useReducer } from 'react'
import * as React from 'react'
import {
  getSvgPathFromStroke,
  TCommitNewSnapshotParam,
  TElementData,
  TReplaceCurrentSnapshotParam,
  TSnapshot,
} from './App'
import rough from 'roughjs/bundled/rough.esm'
import getStroke from 'perfect-freehand'
import { CmdButton } from './CmdButton'
import { createPointerHandlers } from './selectionToolHelpers'

export function createMoveDataArray({
  targetElements,
  pointerX,
  pointerY,
}: {
  targetElements: TElementData[]
  pointerX: number
  pointerY: number
}): TMoveData[] {
  return targetElements.map((targetElement) => {
    switch (targetElement.type) {
      case 'line':
      case 'arrow':
        return {
          elementType: targetElement.type,
          elementId: targetElement.id,
          pointerOffsetX1: pointerX - targetElement.x1,
          pointerOffsetY1: pointerY - targetElement.y1,
        }
      case 'rectangle':
        return {
          elementType: 'rectangle',
          elementId: targetElement.id,
          pointerOffsetX1: pointerX - targetElement.x1,
          pointerOffsetY1: pointerY - targetElement.y1,
        }
      case 'pencil':
        return {
          elementType: 'pencil',
          elementId: targetElement.id,
          pointerOffsetFromPoints: targetElement.points.map((point) => ({
            offsetX: pointerX - point.x,
            offsetY: pointerY - point.y,
          })),
        }
      case 'text':
        return {
          elementType: 'text',
          elementId: targetElement.id,
          pointerOffsetX1: pointerX - (targetElement.lines[0]?.lineX1 ?? pointerX),
          pointerOffsetY1: pointerY - (targetElement.lines[0]?.lineY1 ?? pointerY),
          content: targetElement.lines.map(({ lineContent }) => lineContent).join('\n'),
        }
      default:
        throw new Error('Unsupported moving element type')
    }
  })
}

export function createResizeData({
  targetElement,
  pointerPosition,
}: {
  targetElement: TElementData
  pointerPosition: 'start' | 'end' | 'tl' | 'tr' | 'bl' | 'br'
}): TResizeData {
  switch (targetElement.type) {
    case 'line':
    case 'arrow':
      if (pointerPosition !== 'start' && pointerPosition !== 'end') {
        throw new Error('Impossible pointer position for resizing line element')
      }
      return {
        elementType: targetElement.type,
        elementId: targetElement.id,
        pointerPosition: pointerPosition,
      }
    case 'rectangle':
      if (
        pointerPosition !== 'tl' &&
        pointerPosition !== 'tr' &&
        pointerPosition !== 'bl' &&
        pointerPosition !== 'br'
      ) {
        throw new Error('Impossible pointer position for resizing rectangle element')
      }
      return {
        elementType: 'rectangle',
        elementId: targetElement.id,
        pointerPosition: pointerPosition,
      }
    default:
      throw new Error('Unsupported resizing element type')
  }
}

type TMoveData =
  | {
      elementType: 'line' | 'rectangle' | 'arrow'
      elementId: number
      pointerOffsetX1: number
      pointerOffsetY1: number
    }
  | {
      elementType: 'pencil'
      elementId: number
      pointerOffsetFromPoints: { offsetX: number; offsetY: number }[]
    }
  | {
      elementType: 'text'
      elementId: number
      pointerOffsetX1: number
      pointerOffsetY1: number
      content: string
    }
type TResizeData =
  | {
      elementType: 'line' | 'arrow'
      elementId: number
      pointerPosition: 'start' | 'end'
    }
  | {
      elementType: 'rectangle'
      elementId: number
      pointerPosition: 'tl' | 'tr' | 'bl' | 'br'
    }

type TAreaSelectData = {
  selectedElementIds: number[]
  rectangleSelector: {
    type: 'rectangleSelector'
    x1: number
    y1: number
    x2: number
    y2: number
  }
}

export type TUiState =
  | {
      state: 'none'
    }
  | {
      state: 'readyToMove'
      data: TMoveData[]
    }
  | {
      state: 'moving'
      data: TMoveData[]
    }
  | {
      state: 'readyToResize'
      data: TResizeData
    }
  | {
      state: 'resizing'
      data: TResizeData
    }
  | {
      state: 'areaSelecting'
      data: TAreaSelectData
    }
  | {
      state: 'singleElementSelected'
      data: {
        elementId: number
      }
    }
  | {
      state: 'multiElementSelected'
      data: {
        elementIds: number[]
      }
    }

export type TAction =
  | { type: 'dragSelect'; data: TAreaSelectData }
  | { type: 'prepareMove'; data: TMoveData[] }
  | { type: 'startMove'; data: TMoveData[] }
  | { type: 'continueMove'; data: TMoveData[] }
  | { type: 'prepareResize'; data: TResizeData }
  | { type: 'startResize'; data: TResizeData }
  | { type: 'continueResize'; data: TResizeData }
  | { type: 'selectSingleElement'; data: { elementId: number } }
  | { type: 'selectMultipleElements'; data: { elementIds: number[] } }
  | { type: 'reset' }

type TAllActionNames = TAction['type']

export const validAction = {
  none: {
    prepareMove: 'prepareMove',
    dragSelect: 'dragSelect',
  },
  readyToMove: {
    startMove: 'startMove',
    selectSingleElement: 'selectSingleElement',
    selectMultipleElements: 'selectMultipleElements',
    reset: 'reset',
  },
  moving: {
    continueMove: 'continueMove',
    selectSingleElement: 'selectSingleElement',
    selectMultipleElements: 'selectMultipleElements',
    reset: 'reset',
  },
  readyToResize: {
    startResize: 'startResize',
    selectSingleElement: 'selectSingleElement',
    reset: 'reset',
  },
  resizing: {
    continueResize: 'continueResize',
    selectSingleElement: 'selectSingleElement',
    reset: 'reset',
  },
  areaSelecting: {
    dragSelect: 'dragSelect',
    selectSingleElement: 'selectSingleElement',
    selectMultipleElements: 'selectMultipleElements',
    reset: 'reset',
  },
  singleElementSelected: {
    prepareMove: 'prepareMove',
    prepareResize: 'prepareResize',
    dragSelect: 'dragSelect',
    reset: 'reset',
  },
  multiElementSelected: {
    prepareMove: 'prepareMove',
    dragSelect: 'dragSelect',
    reset: 'reset',
  },
} as const

const mapActionNameToNextStateName = {
  dragSelect: 'areaSelecting',

  prepareMove: 'readyToMove',
  startMove: 'moving',
  continueMove: 'moving',

  prepareResize: 'readyToResize',
  startResize: 'resizing',
  continueResize: 'resizing',

  selectSingleElement: 'singleElementSelected',
  selectMultipleElements: 'multiElementSelected',

  reset: 'none',
} as const

function reducer(prevState: TUiState, action: TAction): TUiState {
  const validActionWithLooserType: {
    [CurrentStateName in TUiState['state']]: { [ActionName in TAllActionNames]?: ActionName }
  } = validAction

  const isActionValid = validActionWithLooserType[prevState.state][action.type]
  if (!isActionValid) {
    throw new Error(
      `Changing state from "${prevState.state}" by action "${action.type}" is not allowed.`
    )
  }

  switch (action.type) {
    case 'dragSelect': {
      const nextStateName = mapActionNameToNextStateName[action.type]
      return { state: nextStateName, data: action.data }
    }
    case 'prepareMove': {
      const nextStateName = mapActionNameToNextStateName[action.type]
      return { state: nextStateName, data: action.data }
    }
    case 'startMove':
    case 'continueMove': {
      const nextStateName = mapActionNameToNextStateName[action.type]
      return { state: nextStateName, data: action.data }
    }
    case 'prepareResize': {
      const nextStateName = mapActionNameToNextStateName[action.type]
      return { state: nextStateName, data: action.data }
    }
    case 'startResize':
    case 'continueResize': {
      const nextStateName = mapActionNameToNextStateName[action.type]
      return { state: nextStateName, data: action.data }
    }
    case 'selectSingleElement': {
      const nextStateName = mapActionNameToNextStateName[action.type]
      return { state: nextStateName, data: action.data }
    }
    case 'selectMultipleElements': {
      const nextStateName = mapActionNameToNextStateName[action.type]
      return { state: nextStateName, data: action.data }
    }
    case 'reset': {
      const nextStateName = mapActionNameToNextStateName[action.type]
      return { state: nextStateName }
    }
    default: {
      throw new Error('Unsupported action type inside the reducer')
    }
  }
}

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
  elementsSnapshot,
  commitNewSnapshot,
  replaceCurrentSnapshot,
  viewportCoordsToSceneCoords,
  drawScene,
}: {
  renderCanvas: (arg: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    styleCursor: 'default' | 'move' | 'nesw-resize' | 'nwse-resize'
  }) => React.ReactElement
  elementsSnapshot: TSnapshot
  commitNewSnapshot: (arg: TCommitNewSnapshotParam) => number | void
  replaceCurrentSnapshot: (arg: TReplaceCurrentSnapshotParam) => void
  viewportCoordsToSceneCoords: (arg: {
    viewportX: number
    viewportY: number
  }) => {
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
  const [uiState, dispatch] = useReducer(reducer, { state: 'none' })

  // useLayoutEffect() in the parent will be ignored in case of a selection tool.
  // ... Therefore, all canvas drawing logics need to be here instead.
  useLayoutEffect(() => {
    // -------- Helper ---------
    function getElementsInSnapshot(elementIds: number[]): TElementData[] {
      const elementsInSnapshot = elementIds
        .map((elementId) => {
          const elementInSnapshot = elementsSnapshot[elementId]
          return elementInSnapshot
        })
        .filter((elementInSnapshot): elementInSnapshot is TElementData =>
          Boolean(elementInSnapshot)
        )

      return elementsInSnapshot
    }
    // ------------------------------

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
      let extraElements: (
        | TElementData
        | TAreaSelectData['rectangleSelector']
      )[] = getElementsInSnapshot(selectedElementIds)

      // also draw rectangle selector (if exist)
      if (uiState.state === 'areaSelecting') {
        extraElements.push(uiState.data.rectangleSelector)
      }

      // draw dashed selection around all selected elements as an extra
      drawScene({
        elements: extraElements,
        drawFn: (element, canvas) => {
          if (element.type === 'rectangle') {
            const roughCanvas = rough.canvas(canvas)
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
            const roughCanvas = rough.canvas(canvas)
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
  }, [uiState, drawScene, elementsSnapshot])

  // ?? Is there any better approach
  // Reset uiState when it is holding an element's id that is not being drawn in the canvas.
  // Example case#1:
  // 1. Click to select the latest created element (the element id is recorded in uiState)
  // 2. Click undo until the selected element disappear (at this state, the snapshot revert
  //    to the point that does not have this element at all, but uiState is still holding the element id)
  // Case#2:
  // 1. Click to select any element
  // 2. Click a remove button (the snapshot changes the element's type to "removed" and skip drawing it,
  //    but uiState still holding its id)
  useEffect(() => {
    if (
      uiState.state === 'readyToMove' ||
      uiState.state === 'readyToResize' ||
      uiState.state === 'moving' ||
      uiState.state === 'resizing' ||
      uiState.state === 'areaSelecting' ||
      uiState.state === 'singleElementSelected' ||
      uiState.state === 'multiElementSelected'
    ) {
      const selectedElementIds = getSelectedElementIdsFromState(uiState)

      let hasUnmatchElementInSnapshot = false
      for (let elementId of selectedElementIds) {
        const selectedElementInSnapshot = elementsSnapshot[elementId]
        const hasElementInSnapshot =
          selectedElementInSnapshot && selectedElementInSnapshot.type !== 'removed'
        if (hasElementInSnapshot) {
          continue
        } else {
          hasUnmatchElementInSnapshot = true
          break
        }
      }

      if (hasUnmatchElementInSnapshot) {
        dispatch({ type: validAction[uiState.state].reset })
      }
    }
  }, [uiState, elementsSnapshot])

  const [cursorType, setCursorType] = useState<TCursorType>('default')
  const canvasForMeasureRef = useRef<HTMLCanvasElement | null>(null)

  const { handlePointerDown, handlePointerMove, handlePointerUp } = createPointerHandlers({
    uiState,
    dispatch,
    elementsSnapshot,
    commitNewSnapshot,
    replaceCurrentSnapshot,
    viewportCoordsToSceneCoords,
    setCursorType,
    canvasForMeasureRef,
  })

  function handleClickDeleteElement() {
    if (uiState.state === 'singleElementSelected') {
      commitNewSnapshot({ mode: 'removeElements', elementIds: [uiState.data.elementId] })
      dispatch({ type: 'reset' })
      return
    }
    if (uiState.state === 'multiElementSelected') {
      commitNewSnapshot({ mode: 'removeElements', elementIds: uiState.data.elementIds })
      dispatch({ type: 'reset' })
      return
    }
  }

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
          <CmdButton cmdName="deleteElement" onClick={handleClickDeleteElement} />
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
