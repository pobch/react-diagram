import { useState, useRef, useLayoutEffect, useEffect } from 'react'
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
import { CONFIG } from './config'
import { useMachine } from '@xstate/react'
import { selectionMachine, TMoveData } from './selectionToolHelpers/selectionMachine'
import { createTextElementWithoutId, getTextElementAtPosition } from './CanvasForText'
import { createLinearElementWithoutId } from './CanvasForLinear'
import { moveImageElement, moveRectangleElement } from './selectionToolHelpers/moveHelpers'
import { flushSync } from 'react-dom'

export type TCursorType = 'default' | 'move' | 'nesw-resize' | 'nwse-resize'

/**
 * * -----------------------------------------
 * *               Component
 * * -----------------------------------------
 */
export function CanvasForSelection({
  renderCanvas,
  currentSnapshot,
  getElementInCurrentSnapshot,
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
  getElementInCurrentSnapshot: (elementId: number) => TElementData | undefined
  commitNewSnapshot: (arg: TCommitNewSnapshotParam) => number | undefined
  replaceCurrentSnapshotByReplacingElements: (arg: TReplaceCurrentSnapshotParam) => void
  viewportCoordsToSceneCoords: (arg: { viewportX: number; viewportY: number }) => {
    sceneX: number
    sceneY: number
  }
  drawScene: (extra?: {
    elements: TElementData[]
    drawFn: (element: TElementData, canvas: HTMLCanvasElement) => void
  }) => void
}) {
  const [state, send] = useMachine(selectionMachine, {
    actions: {
      startMove: (context, event) => {
        flushSync(() => {
          commitNewSnapshot({ mode: 'clone' })
        })
      },
      continueMove: (context, event) => {
        if (event.type === 'NEXT_MOVE') {
          let replacedMultiElements: TElementData[] = []

          const movingElementId = context.elementId

          const movingElementInSnapshot = getElementInCurrentSnapshot(movingElementId)
          if (!movingElementInSnapshot) {
            throw new Error('You are trying to move an non-exist element in the current snapshot!!')
          }
          if (
            (context.elementType === 'line' && movingElementInSnapshot.type === 'line') ||
            (context.elementType === 'arrow' && movingElementInSnapshot.type === 'arrow')
          ) {
            const newX1 = event.sceneX - context.pointerOffsetX1
            const newY1 = event.sceneY - context.pointerOffsetY1
            // keep existing line width
            const distanceX = movingElementInSnapshot.x2 - movingElementInSnapshot.x1
            const distanceY = movingElementInSnapshot.y2 - movingElementInSnapshot.y1
            const newElementWithoutId = createLinearElementWithoutId({
              lineType: movingElementInSnapshot.type,
              x1: newX1,
              y1: newY1,
              x2: newX1 + distanceX,
              y2: newY1 + distanceY,
            })
            replacedMultiElements.push({ ...newElementWithoutId, id: movingElementId })
          } else if (
            context.elementType === 'rectangle' &&
            movingElementInSnapshot.type === 'rectangle'
          ) {
            const newX1 = event.sceneX - context.pointerOffsetX1
            const newY1 = event.sceneY - context.pointerOffsetY1
            const newElementWithoutId = moveRectangleElement({
              newX1: newX1,
              newY1: newY1,
              rectElementToMove: movingElementInSnapshot,
            })
            replacedMultiElements.push({ ...newElementWithoutId, id: movingElementId })
          } else if (context.elementType === 'image' && movingElementInSnapshot.type === 'image') {
            const newX1 = event.sceneX - context.pointerOffsetX1
            const newY1 = event.sceneY - context.pointerOffsetY1
            const newElementWithoutId = moveImageElement({
              newX1: newX1,
              newY1: newY1,
              imageElementToMove: movingElementInSnapshot,
            })
            replacedMultiElements.push({ ...newElementWithoutId, id: movingElementId })
          } else if (
            context.elementType === 'pencil' &&
            movingElementInSnapshot.type === 'pencil'
          ) {
            const newPoints = context.pointerOffsetFromPoints.map(({ offsetX, offsetY }) => ({
              x: event.sceneX - offsetX,
              y: event.sceneY - offsetY,
            }))
            const newElement: TElementData = {
              id: movingElementId,
              type: 'pencil',
              points: newPoints,
            }
            replacedMultiElements.push(newElement)
          } else if (context.elementType === 'text' && movingElementInSnapshot.type === 'text') {
            const newElementWithoutId = createTextElementWithoutId({
              canvasForMeasure: canvasForMeasureRef.current,
              content: context.content,
              isWriting: false,
              x1: event.sceneX - context.pointerOffsetX1,
              y1: event.sceneY - context.pointerOffsetY1,
            })
            replacedMultiElements.push({ ...newElementWithoutId, id: movingElementId })
          } else {
            throw new Error(
              '1. Mismatch between moving element type and actual element type in the snapshot\n-or-\n2. Unsupported element type for moving'
            )
          }

          replaceCurrentSnapshotByReplacingElements({ replacedMultiElements })
        }
      },
    },
  })

  // useLayoutEffect() in the parent will be ignored in case of a selection tool.
  // ... Therefore, all canvas drawing logics need to be here instead.
  useLayoutEffect(() => {
    // all state we want to draw dashed lines
    if (state.value === 'move' || state.value === 'singleElementSelected') {
      const selectedElementIds = getSelectedElementIdsFromState(state.context)
      let extraElements: TElementData[] = getElementsInSnapshot(currentSnapshot, selectedElementIds)

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
  }, [state, drawScene, currentSnapshot])

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
  // 4. Remove the whole `useEffect` block below
  useEffect(() => {
    if (state.value === 'move' || state.value === 'singleElementSelected') {
      const selectedElementIds = getSelectedElementIdsFromState(state.context)
      const selectedElementsInSnapshot = getElementsInSnapshot(currentSnapshot, selectedElementIds)
      let hasUnmatchElementInSnapshot =
        selectedElementIds.length !== selectedElementsInSnapshot.length

      if (hasUnmatchElementInSnapshot) {
        send('RESET')
      }
    }
  }, [state, currentSnapshot, send])

  const [cursorType] = useState<TCursorType>('default')
  const canvasForMeasureRef = useRef<HTMLCanvasElement | null>(null)

  let handlePointerDown = (e: React.PointerEvent) => {}
  let handlePointerMove = (e: React.PointerEvent) => {}
  let handlePointerUp = (e: React.PointerEvent) => {}

  switch (true) {
    case state.value === 'none': {
      handlePointerDown = (e: React.PointerEvent) => {
        if (!e.isPrimary) return

        const { sceneX, sceneY } = viewportCoordsToSceneCoords({
          viewportX: e.clientX,
          viewportY: e.clientY,
        })

        const hitPoint = getLastElementAtPosition({
          elementsSource: currentSnapshot,
          xPosition: sceneX,
          yPosition: sceneY,
        })
        const isHit = hitPoint.pointerPosition !== 'notFound'

        // pointer down does not hit on any elements
        if (!isHit) {
          return
        }

        // pointer down hits on an element
        send(
          'DOWN_ON_ELEMENT',
          createMoveData({
            targetElement: hitPoint.foundLastElement,
            pointerX: sceneX,
            pointerY: sceneY,
          })
        )
        return
      }
      handlePointerMove = (e: React.PointerEvent) => {}
      handlePointerUp = (e: React.PointerEvent) => {}
      break
    }
    case state.matches({ move: 'readyToMove' }): {
      handlePointerDown = (e: React.PointerEvent) => {}
      handlePointerMove = (e: React.PointerEvent) => {
        if (!e.isPrimary) return

        send('FIRST_MOVE')
        return
      }
      handlePointerUp = (e: React.PointerEvent) => {
        if (!e.isPrimary) return

        send('UP_WITHOUT_MOVE')
        return
      }
      break
    }
    case state.matches({ move: 'moving' }): {
      handlePointerDown = (e: React.PointerEvent) => {}
      handlePointerMove = (e: React.PointerEvent) => {
        if (!e.isPrimary) return

        const { sceneX, sceneY } = viewportCoordsToSceneCoords({
          viewportX: e.clientX,
          viewportY: e.clientY,
        })

        send('NEXT_MOVE', { sceneX, sceneY })
        return
      }
      handlePointerUp = (e: React.PointerEvent) => {
        if (!e.isPrimary) return

        send('UP_AFTER_MOVE')
        return
      }
      break
    }
    case state.value === 'singleElementSelected': {
      handlePointerDown = (e: React.PointerEvent) => {
        if (!e.isPrimary) return

        const { sceneX, sceneY } = viewportCoordsToSceneCoords({
          viewportX: e.clientX,
          viewportY: e.clientY,
        })
        const hitPoint = getLastElementAtPosition({
          elementsSource: currentSnapshot,
          xPosition: sceneX,
          yPosition: sceneY,
        })
        const isHit = hitPoint.pointerPosition !== 'notFound'

        // pointer down does not hit on any elements
        if (!isHit) {
          send('RESET')
          return
        }

        send(
          'DOWN_ON_ELEMENT',
          createMoveData({
            targetElement: hitPoint.foundLastElement,
            pointerX: sceneX,
            pointerY: sceneY,
          })
        )
        return
      }
      handlePointerMove = (e: React.PointerEvent) => {}
      handlePointerUp = (e: React.PointerEvent) => {}
      break
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

      {renderCanvas({
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        styleCursor: cursorType,
      })}
    </>
  )
}

/* eslint-disable no-extra-label */
function getLastElementAtPosition({
  elementsSource,
  xPosition,
  yPosition,
}: {
  elementsSource: TElementData[]
  xPosition: number
  yPosition: number
}):
  | {
      pointerPosition: 'start' | 'end' | 'tl' | 'tr' | 'bl' | 'br' | 'onLine' | 'inside'
      foundLastElement: TElementData
    }
  | {
      pointerPosition: 'notFound'
      foundLastElement: undefined
    } {
  // * ----------------- Helpers --------------------

  // find the distance between 2 points
  function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
  }
  // check if (xPosition, yPosition) is near the specific point
  function isNearPoint({
    xPosition,
    yPosition,
    xPoint,
    yPoint,
  }: {
    xPosition: number
    yPosition: number
    xPoint: number
    yPoint: number
  }): boolean {
    const THRESHOLD = 8
    return Math.abs(xPosition - xPoint) < THRESHOLD && Math.abs(yPosition - yPoint) < THRESHOLD
  }
  // check if (xPosition, yPosition) is on the line
  function isOnLine({
    xPosition,
    yPosition,
    x1Line,
    y1Line,
    x2Line,
    y2Line,
    threshold = 1,
  }: {
    xPosition: number
    yPosition: number
    x1Line: number
    y1Line: number
    x2Line: number
    y2Line: number
    threshold?: number
  }) {
    // a---------------b
    //      c
    const a = { x: x1Line, y: y1Line }
    const b = { x: x2Line, y: y2Line }
    const c = { x: xPosition, y: yPosition }
    const distanceOffset = distance(a, b) - (distance(a, c) + distance(b, c))
    return Math.abs(distanceOffset) < threshold
  }
  // * ------------------ End ------------------------

  // in case of not found, these values will be undefined + 'notFound'
  let foundLastElement: TElementData | undefined = undefined
  let pointerPosition:
    | 'start'
    | 'end'
    | 'tl'
    | 'tr'
    | 'bl'
    | 'br'
    | 'onLine'
    | 'inside'
    | 'notFound' = 'notFound'

  allElementsLoop: for (let i = elementsSource.length - 1; i >= 0; i--) {
    const element = elementsSource[i]!

    if (element.type === 'line' || element.type === 'arrow') {
      // check if a pointer is at (x1, y1)
      if (isNearPoint({ xPosition, yPosition, xPoint: element.x1, yPoint: element.y1 })) {
        foundLastElement = element
        pointerPosition = 'start'
        break allElementsLoop
      }
      // check if a pointer is at (x2, y2)
      else if (isNearPoint({ xPosition, yPosition, xPoint: element.x2, yPoint: element.y2 })) {
        foundLastElement = element
        pointerPosition = 'end'
        break allElementsLoop
      }
      // check if a pointer is on the line
      else if (
        isOnLine({
          xPosition,
          yPosition,
          x1Line: element.x1,
          y1Line: element.y1,
          x2Line: element.x2,
          y2Line: element.y2,
        })
      ) {
        foundLastElement = element
        pointerPosition = 'onLine'
        break allElementsLoop
      }
      continue allElementsLoop
    } else if (element.type === 'rectangle' || element.type === 'image') {
      // check if a pointer is at top-left
      if (isNearPoint({ xPosition, yPosition, xPoint: element.x1, yPoint: element.y1 })) {
        foundLastElement = element
        pointerPosition = 'tl'
        break allElementsLoop
      }
      // check if a pointer is at top-right
      else if (isNearPoint({ xPosition, yPosition, xPoint: element.x2, yPoint: element.y1 })) {
        foundLastElement = element
        pointerPosition = 'tr'
        break allElementsLoop
      }
      // check if a pointer is at bottom-right
      else if (isNearPoint({ xPosition, yPosition, xPoint: element.x2, yPoint: element.y2 })) {
        foundLastElement = element
        pointerPosition = 'br'
        break allElementsLoop
      }
      // check if a pointer is at bottom-left
      else if (isNearPoint({ xPosition, yPosition, xPoint: element.x1, yPoint: element.y2 })) {
        foundLastElement = element
        pointerPosition = 'bl'
        break allElementsLoop
      }
      // check if a pointer is on the line of rectangle
      else if (
        isOnLine({
          xPosition,
          yPosition,
          x1Line: element.x1,
          y1Line: element.y1,
          x2Line: element.x2,
          y2Line: element.y1,
        }) ||
        isOnLine({
          xPosition,
          yPosition,
          x1Line: element.x2,
          y1Line: element.y1,
          x2Line: element.x2,
          y2Line: element.y2,
        }) ||
        isOnLine({
          xPosition,
          yPosition,
          x1Line: element.x2,
          y1Line: element.y2,
          x2Line: element.x1,
          y2Line: element.y2,
        }) ||
        isOnLine({
          xPosition,
          yPosition,
          x1Line: element.x1,
          y1Line: element.y2,
          x2Line: element.x1,
          y2Line: element.y1,
        })
      ) {
        foundLastElement = element
        pointerPosition = 'onLine'
        break allElementsLoop
      }
      // TODO: Also check if a pointer is inside the rectangle after we support filled rectangle
      else if (
        // only for image element
        element.type === 'image' &&
        element.x1 < xPosition &&
        xPosition < element.x2 &&
        element.y1 < yPosition &&
        yPosition < element.y2
      ) {
        foundLastElement = element
        pointerPosition = 'inside'
        break allElementsLoop
      }

      continue allElementsLoop
    } else if (element.type === 'pencil') {
      pencilElementLoop: for (let i = 0; i < element.points.length - 1; i++) {
        const currentPoint = element.points[i]
        const nextPoint = element.points[i + 1]
        if (!currentPoint || !nextPoint) {
          throw new Error('There is a missing point (x,y) within the pencil path!!')
        }
        if (
          isOnLine({
            xPosition,
            yPosition,
            x1Line: currentPoint.x,
            y1Line: currentPoint.y,
            x2Line: nextPoint.x,
            y2Line: nextPoint.y,
            threshold: 6,
          })
        ) {
          foundLastElement = element
          pointerPosition = 'onLine'
          // found an element while looping through points of a single element
          break pencilElementLoop
        } else {
          continue pencilElementLoop
        }
      }

      // finished looping through points of a single element
      // if we found an element(i.e. the last element underneath a pointer), we can stop looping through remaining elements
      if (foundLastElement) {
        break allElementsLoop
      } else {
        continue allElementsLoop
      }
    } else if (element.type === 'text') {
      foundLastElement = getTextElementAtPosition({
        elementsSnapshot: [element],
        xPosition,
        yPosition,
      })
      if (foundLastElement) {
        pointerPosition = 'inside'
        break allElementsLoop
      } else {
        continue allElementsLoop
      }
    }
  }

  if (!foundLastElement) return { pointerPosition: 'notFound', foundLastElement: undefined }
  if (foundLastElement && pointerPosition !== 'notFound')
    return { pointerPosition, foundLastElement }
  // Should not reach here
  throw new Error('Impossible state: Found an element but the pointer position is "notFound"')
}

function createMoveData({
  targetElement,
  pointerX,
  pointerY,
}: {
  targetElement: TElementData
  pointerX: number
  pointerY: number
}): TMoveData {
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
    case 'image':
      return {
        elementType: targetElement.type,
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
}

function getSelectedElementIdsFromState(context: { elementId: number }) {
  let elementIds: number[] = [context.elementId]

  return elementIds
}

function getElementsInSnapshot(elementsSnapshot: TSnapshot, elementIds: number[]): TElementData[] {
  const elementIdsMap = elementIds.reduce((prev, elementId) => {
    prev[elementId] = true
    return prev
  }, {} as { [elementId: number]: boolean })
  const foundElementsInSnapshot = elementsSnapshot.filter((element) => {
    return elementIdsMap[element.id]
  })
  return foundElementsInSnapshot
}
