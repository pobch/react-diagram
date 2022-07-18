import * as React from 'react'
import {
  TCommitNewSnapshotParam,
  TElementData,
  TReplaceCurrentSnapshotParam,
  TSnapshot,
} from '../App'
import { createLinearElementWithoutId } from '../CanvasForLinear'
import { adjustRectangleCoordinates, createRectangleElementWithoutId } from '../CanvasForRect'
import {
  createMoveDataArray,
  createResizeData,
  getElementsInSnapshot,
  TAction,
  TCursorType,
  TUiState,
  validAction,
} from '../CanvasForSelection'
import { createTextElementWithoutId, getTextElementAtPosition } from '../CanvasForText'
import { moveImageElement, moveRectangleElement } from './moveHelpers'
import { resizeImageElement, resizeRectangleElement } from './resizeHelpers'

function getFirstElementAtPosition({
  elementsSnapshot,
  xPosition,
  yPosition,
}: {
  elementsSnapshot: TElementData[]
  xPosition: number
  yPosition: number
}):
  | {
      pointerPosition: 'start' | 'end' | 'tl' | 'tr' | 'bl' | 'br' | 'onLine' | 'inside' | 'none'
      firstFoundElement: TElementData
    }
  | undefined {
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

  // in case of not found, it will be undefined
  let firstFoundElement: TElementData | undefined = undefined
  let pointerPosition: 'start' | 'end' | 'tl' | 'tr' | 'bl' | 'br' | 'onLine' | 'inside' | 'none' =
    'none'

  // 1st loop
  for (let element of elementsSnapshot) {
    if (element.type === 'line' || element.type === 'arrow') {
      // check if a pointer is at (x1, y1)
      if (isNearPoint({ xPosition, yPosition, xPoint: element.x1, yPoint: element.y1 })) {
        firstFoundElement = element
        pointerPosition = 'start'
        break // 1st loop
      }
      // check if a pointer is at (x2, y2)
      else if (isNearPoint({ xPosition, yPosition, xPoint: element.x2, yPoint: element.y2 })) {
        firstFoundElement = element
        pointerPosition = 'end'
        break // 1st loop
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
        firstFoundElement = element
        pointerPosition = 'onLine'
        break // 1st loop
      }
      continue // 1st loop
    } else if (element.type === 'rectangle' || element.type === 'image') {
      // check if a pointer is at top-left
      if (isNearPoint({ xPosition, yPosition, xPoint: element.x1, yPoint: element.y1 })) {
        firstFoundElement = element
        pointerPosition = 'tl'
        break // 1st loop
      }
      // check if a pointer is at top-right
      else if (isNearPoint({ xPosition, yPosition, xPoint: element.x2, yPoint: element.y1 })) {
        firstFoundElement = element
        pointerPosition = 'tr'
        break // 1st loop
      }
      // check if a pointer is at bottom-right
      else if (isNearPoint({ xPosition, yPosition, xPoint: element.x2, yPoint: element.y2 })) {
        firstFoundElement = element
        pointerPosition = 'br'
        break // 1st loop
      }
      // check if a pointer is at bottom-left
      else if (isNearPoint({ xPosition, yPosition, xPoint: element.x1, yPoint: element.y2 })) {
        firstFoundElement = element
        pointerPosition = 'bl'
        break // 1st loop
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
        firstFoundElement = element
        pointerPosition = 'onLine'
        break // 1st loop
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
        firstFoundElement = element
        pointerPosition = 'inside'
        break // 1st loop
      }

      continue // 1st loop
    } else if (element.type === 'pencil') {
      // 2nd loop
      for (let i = 0; i < element.points.length - 1; i++) {
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
          firstFoundElement = element
          pointerPosition = 'onLine'
          // found an element while looping through points of a single element
          break // 2nd loop
        } else {
          continue // 2nd loop
        }
      }

      // finished looping through points of a single element
      // if we found an element(i.e. the first element underneath a pointer), we can stop looping through remaining elements
      if (firstFoundElement) {
        break // 1st loop
      } else {
        continue // 1st loop
      }
    } else if (element.type === 'text') {
      firstFoundElement = getTextElementAtPosition({
        elementsSnapshot: [element],
        xPosition,
        yPosition,
      })
      if (firstFoundElement) {
        pointerPosition = 'inside'
        break // 1st loop
      } else {
        continue // 1st loop
      }
    }
  }

  if (!firstFoundElement) return
  return { pointerPosition, firstFoundElement }
}

function getAllElementIdsInsideRectSelector({
  elementsSnapshot,
  rectSelectorX1,
  rectSelectorX2,
  rectSelectorY1,
  rectSelectorY2,
}: {
  elementsSnapshot: TElementData[]
  rectSelectorX1: number
  rectSelectorY1: number
  rectSelectorX2: number
  rectSelectorY2: number
}) {
  const selectedElements = elementsSnapshot.filter((element) => {
    const rectMinX = Math.min(rectSelectorX1, rectSelectorX2)
    const rectMaxX = Math.max(rectSelectorX1, rectSelectorX2)
    const rectMinY = Math.min(rectSelectorY1, rectSelectorY2)
    const rectMaxY = Math.max(rectSelectorY1, rectSelectorY2)
    if (element.type === 'arrow' || element.type === 'line') {
      if (
        rectMinX <= element.x1 &&
        element.x1 <= rectMaxX &&
        rectMinY <= element.y1 &&
        element.y1 <= rectMaxY &&
        rectMinX <= element.x2 &&
        element.x2 <= rectMaxX &&
        rectMinY <= element.y2 &&
        element.y2 <= rectMaxY
      ) {
        return true
      }
    } else if (element.type === 'rectangle' || element.type === 'image') {
      const elmMinX = Math.min(element.x1, element.x2)
      const elmMaxX = Math.max(element.x1, element.x2)
      const elmMinY = Math.min(element.y1, element.y2)
      const elmMaxY = Math.max(element.y1, element.y2)
      if (
        rectMinX <= elmMinX &&
        elmMinX <= rectMaxX &&
        rectMinX <= elmMaxX &&
        elmMaxX <= rectMaxX &&
        rectMinY <= elmMinY &&
        elmMinY <= rectMaxY &&
        rectMinY <= elmMaxY &&
        elmMaxY <= rectMaxY
      ) {
        return true
      }
    } else if (element.type === 'text') {
      const elmMinX = element.lines[0]?.lineX1 ?? -Infinity
      const elmMinY = element.lines[0]?.lineY1 ?? -Infinity
      const elmMaxY =
        (element.lines.at(-1)?.lineY1 ?? Infinity) + (element.lines.at(-1)?.lineHeight ?? Infinity)
      let elmMaxX = -Infinity
      element.lines.forEach((line) => {
        elmMaxX = Math.max(line.lineX1 + line.lineWidth, elmMaxX)
      })
      if (elmMaxX === -Infinity) elmMaxX = Infinity

      if (
        rectMinX <= elmMinX &&
        elmMinX <= rectMaxX &&
        rectMinX <= elmMaxX &&
        elmMaxX <= rectMaxX &&
        rectMinY <= elmMinY &&
        elmMinY <= rectMaxY &&
        rectMinY <= elmMaxY &&
        elmMaxY <= rectMaxY
      ) {
        return true
      }
    } else if (element.type === 'pencil') {
      const isInside = element.points.every((point) => {
        if (
          rectMinX <= point.x &&
          point.x <= rectMaxX &&
          rectMinY <= point.y &&
          point.y <= rectMaxY
        ) {
          return true
        }
        return false
      })
      return isInside
    }
    return false
  })
  return selectedElements.map((element) => element.id)
}

export function createPointerHandlers({
  uiState,
  dispatch,
  currentSnapshot,
  getElementInCurrentSnapshot,
  commitNewSnapshot,
  replaceCurrentSnapshotByReplacingElements,
  viewportCoordsToSceneCoords,
  setCursorType,
  canvasForMeasureRef,
}: {
  uiState: TUiState
  dispatch: React.Dispatch<TAction>
  currentSnapshot: TSnapshot
  getElementInCurrentSnapshot: (elementId: number) => TElementData | undefined
  commitNewSnapshot: (arg: TCommitNewSnapshotParam) => number | undefined
  replaceCurrentSnapshotByReplacingElements: (arg: TReplaceCurrentSnapshotParam) => void
  viewportCoordsToSceneCoords: (arg: { viewportX: number; viewportY: number }) => {
    sceneX: number
    sceneY: number
  }
  setCursorType: React.Dispatch<React.SetStateAction<TCursorType>>
  canvasForMeasureRef: React.MutableRefObject<HTMLCanvasElement | null>
}) {
  function handleCursorUI(e: React.PointerEvent) {
    const { sceneX, sceneY } = viewportCoordsToSceneCoords({
      viewportX: e.clientX,
      viewportY: e.clientY,
    })

    // cursor UI for all uiState
    // TODO: Add state guard and separate cursor between "none" and other state
    const hovered = getFirstElementAtPosition({
      elementsSnapshot: currentSnapshot,
      xPosition: sceneX,
      yPosition: sceneY,
    })
    if (!hovered) {
      setCursorType('default')
    } else if (hovered.pointerPosition === 'onLine' || hovered.pointerPosition === 'inside') {
      setCursorType('move')
    } else if (hovered.pointerPosition === 'tr' || hovered.pointerPosition === 'bl') {
      setCursorType('nesw-resize')
    } else if (
      hovered.pointerPosition === 'start' ||
      hovered.pointerPosition === 'end' ||
      hovered.pointerPosition === 'tl' ||
      hovered.pointerPosition === 'br'
    ) {
      setCursorType('nwse-resize')
    } else {
      setCursorType('default')
    }
  }

  switch (uiState.state) {
    case 'none': {
      return {
        handlePointerDown(e: React.PointerEvent) {
          const { sceneX, sceneY } = viewportCoordsToSceneCoords({
            viewportX: e.clientX,
            viewportY: e.clientY,
          })

          const selectedData = getFirstElementAtPosition({
            elementsSnapshot: currentSnapshot,
            xPosition: sceneX,
            yPosition: sceneY,
          })

          // pointer down does not hit on any elements
          if (!selectedData) {
            dispatch({
              type: validAction[uiState.state].dragSelect,
              data: {
                rectangleSelector: {
                  type: 'rectangleSelector',
                  x1: sceneX,
                  y1: sceneY,
                  x2: sceneX,
                  y2: sceneY,
                },
                selectedElementIds: [],
              },
            })
            return
          }

          // pointer down hits on an element
          dispatch({
            type: validAction[uiState.state].prepareMove,
            data: createMoveDataArray({
              targetElements: [selectedData.firstFoundElement],
              pointerX: sceneX,
              pointerY: sceneY,
            }),
          })
          return
        },
        handlePointerMove(e: React.PointerEvent) {
          handleCursorUI(e)
        },
        handlePointerUp(e: React.PointerEvent) {},
      }
    }
    case 'areaSelecting': {
      return {
        handlePointerDown(e: React.PointerEvent) {},
        handlePointerMove(e: React.PointerEvent) {
          handleCursorUI(e)

          // can come from either
          // - onPointerDown() of previous 'none' || 'singleElementSelected' || 'multiElementSelected' state
          // - onPointerMove() of the previous same state: 'areaSelecting'

          const { sceneX, sceneY } = viewportCoordsToSceneCoords({
            viewportX: e.clientX,
            viewportY: e.clientY,
          })

          // continue dragging
          dispatch({
            type: validAction[uiState.state].dragSelect,
            data: {
              rectangleSelector: {
                type: 'rectangleSelector',
                x1: uiState.data.rectangleSelector.x1,
                y1: uiState.data.rectangleSelector.y1,
                x2: sceneX,
                y2: sceneY,
              },
              selectedElementIds: getAllElementIdsInsideRectSelector({
                elementsSnapshot: currentSnapshot,
                rectSelectorX1: uiState.data.rectangleSelector.x1,
                rectSelectorY1: uiState.data.rectangleSelector.y1,
                rectSelectorX2: sceneX,
                rectSelectorY2: sceneY,
              }),
            },
          })
          return
        },
        handlePointerUp(e: React.PointerEvent) {
          // should come from onPointerMove() of the previous same state: 'areaSelecting'

          if (uiState.data.selectedElementIds.length >= 2) {
            dispatch({
              type: validAction[uiState.state].selectMultipleElements,
              data: {
                elementIds: uiState.data.selectedElementIds,
              },
            })
            return
          }
          if (uiState.data.selectedElementIds.length === 1) {
            dispatch({
              type: validAction[uiState.state].selectSingleElement,
              data: {
                elementId: uiState.data.selectedElementIds[0]!,
              },
            })
            return
          }
          if (uiState.data.selectedElementIds.length === 0) {
            // no element got selected
            dispatch({
              type: validAction[uiState.state].reset,
            })
            return
          }
        },
      }
    }
    case 'readyToMove': {
      return {
        handlePointerDown(e: React.PointerEvent) {},
        handlePointerMove(e: React.PointerEvent) {
          handleCursorUI(e)

          // should come from onPointerDown() of 'none' || 'singleElementSelected' || 'multiElementSelected' state
          commitNewSnapshot({ mode: 'clone' })
          dispatch({ type: validAction[uiState.state].startMove, data: [...uiState.data] })
          return
        },
        handlePointerUp(e: React.PointerEvent) {
          // Should come from onPointerDown() of 'none' || 'singleElementSelected' || 'multiElementSelected' state
          // ... in the case that onPointerMove() is not triggered at all.
          // This means the selected element(s) is not actually move.
          // Therefore, don't do anything with history.

          if (uiState.data.length === 0) {
            throw new Error('Cannot select any element because the moving element id is missing')
          }
          if (uiState.data.length === 1) {
            dispatch({
              type: validAction[uiState.state].selectSingleElement,
              data: { elementId: uiState.data[0]!.elementId },
            })
            return
          }
          if (uiState.data.length >= 2) {
            dispatch({
              type: validAction[uiState.state].selectMultipleElements,
              data: { elementIds: uiState.data.map((moveData) => moveData.elementId) },
            })
            return
          }
        },
      }
    }
    case 'moving': {
      return {
        handlePointerDown(e: React.PointerEvent) {},
        handlePointerMove(e: React.PointerEvent) {
          handleCursorUI(e)

          // can come from either
          // - onPointerMove() of previous 'readyToMove' state (when we start to move)
          // - onPointerMove() of the previous same state: 'moving' (when we continue to move)

          const { sceneX, sceneY } = viewportCoordsToSceneCoords({
            viewportX: e.clientX,
            viewportY: e.clientY,
          })

          // store all moving elements, will be used to replace the current snapshot
          let replacedMultiElements: TElementData[] = []

          // create new element for replacing, one-by-one
          uiState.data.forEach((moveData) => {
            const movingElementId = moveData.elementId

            const movingElementInSnapshot = getElementInCurrentSnapshot(movingElementId)
            if (!movingElementInSnapshot) {
              throw new Error(
                'You are trying to move an non-exist element in the current snapshot!!'
              )
            }
            if (
              (moveData.elementType === 'line' && movingElementInSnapshot.type === 'line') ||
              (moveData.elementType === 'arrow' && movingElementInSnapshot.type === 'arrow')
            ) {
              const newX1 = sceneX - moveData.pointerOffsetX1
              const newY1 = sceneY - moveData.pointerOffsetY1
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
              // continue forEach loop
              return
            } else if (
              moveData.elementType === 'rectangle' &&
              movingElementInSnapshot.type === 'rectangle'
            ) {
              const newX1 = sceneX - moveData.pointerOffsetX1
              const newY1 = sceneY - moveData.pointerOffsetY1
              const newElementWithoutId = moveRectangleElement({
                newX1: newX1,
                newY1: newY1,
                rectElementToMove: movingElementInSnapshot,
              })
              replacedMultiElements.push({ ...newElementWithoutId, id: movingElementId })
              // continue forEach loop
              return
            } else if (
              moveData.elementType === 'image' &&
              movingElementInSnapshot.type === 'image'
            ) {
              const newX1 = sceneX - moveData.pointerOffsetX1
              const newY1 = sceneY - moveData.pointerOffsetY1
              const newElementWithoutId = moveImageElement({
                newX1: newX1,
                newY1: newY1,
                imageElementToMove: movingElementInSnapshot,
              })
              replacedMultiElements.push({ ...newElementWithoutId, id: movingElementId })
              // continue forEach loop
              return
            } else if (
              moveData.elementType === 'pencil' &&
              movingElementInSnapshot.type === 'pencil'
            ) {
              const newPoints = moveData.pointerOffsetFromPoints.map(({ offsetX, offsetY }) => ({
                x: sceneX - offsetX,
                y: sceneY - offsetY,
              }))
              const newElement: TElementData = {
                id: movingElementId,
                type: 'pencil',
                points: newPoints,
              }
              replacedMultiElements.push(newElement)
              // continue forEach loop
              return
            } else if (moveData.elementType === 'text' && movingElementInSnapshot.type === 'text') {
              const newElementWithoutId = createTextElementWithoutId({
                canvasForMeasure: canvasForMeasureRef.current,
                content: moveData.content,
                isWriting: false,
                x1: sceneX - moveData.pointerOffsetX1,
                y1: sceneY - moveData.pointerOffsetY1,
              })
              replacedMultiElements.push({ ...newElementWithoutId, id: movingElementId })
              // continue forEach loop
              return
            } else {
              throw new Error(
                '1. Mismatch between moving element type and actual element type in the snapshot\n-or-\n2. Unsupported element type for moving'
              )
            }
          })

          replaceCurrentSnapshotByReplacingElements({ replacedMultiElements })
          dispatch({ type: validAction[uiState.state].continueMove, data: [...uiState.data] })
          return
        },
        handlePointerUp(e: React.PointerEvent) {
          // should come from onPointerMove() of the same previous same state: 'moving'
          if (uiState.data.length === 0) {
            throw new Error(
              'Cannot finish moving an element because the moving element id is missing'
            )
          }
          if (uiState.data.length === 1) {
            dispatch({
              type: validAction[uiState.state].selectSingleElement,
              data: { elementId: uiState.data[0]!.elementId },
            })
            return
          }
          if (uiState.data.length >= 2) {
            dispatch({
              type: validAction[uiState.state].selectMultipleElements,
              data: { elementIds: uiState.data.map((moveData) => moveData.elementId) },
            })
            return
          }
        },
      }
    }
    case 'readyToResize': {
      return {
        handlePointerDown(e: React.PointerEvent) {},
        handlePointerMove(e: React.PointerEvent) {
          handleCursorUI(e)

          // should come from onPointerDown() of 'singleElementSelected' state
          commitNewSnapshot({ mode: 'clone' })
          dispatch({ type: validAction[uiState.state].startResize, data: { ...uiState.data } })
          return
        },
        handlePointerUp(e: React.PointerEvent) {
          // Should come from onPointerDown() of 'singleElementSelected' state
          // ... in the case that onPointerMove() is not triggered at all.
          // This means the selected element is not actually resize.
          // Therefore, don't do anything with history.

          dispatch({
            type: validAction[uiState.state].selectSingleElement,
            data: { elementId: uiState.data.elementId },
          })
          return
        },
      }
    }
    case 'resizing': {
      return {
        handlePointerDown(e: React.PointerEvent) {},
        handlePointerMove(e: React.PointerEvent) {
          handleCursorUI(e)

          // can come from either
          // - onPointerMove() of previous 'readyToResize' state (when we start to resize)
          // - onPointerMove() of the previous same state: 'resizing' (when we continue to resize)

          const { sceneX, sceneY } = viewportCoordsToSceneCoords({
            viewportX: e.clientX,
            viewportY: e.clientY,
          })

          // replace this specific element
          const resizingElementId = uiState.data.elementId

          const resizingElement = getElementInCurrentSnapshot(resizingElementId)
          if (!resizingElement) {
            throw new Error(
              'You are trying to resize an non-exist element in the current snapshot!!'
            )
          }
          if (
            (uiState.data.elementType === 'line' && resizingElement.type === 'line') ||
            (uiState.data.elementType === 'arrow' && resizingElement.type === 'arrow')
          ) {
            if (uiState.data.pointerPosition === 'start') {
              const newElementWithoutId = createLinearElementWithoutId({
                lineType: resizingElement.type,
                x1: sceneX,
                y1: sceneY,
                x2: resizingElement.x2,
                y2: resizingElement.y2,
              })
              replaceCurrentSnapshotByReplacingElements({
                replacedElement: { ...newElementWithoutId, id: resizingElementId },
              })
              dispatch({
                type: validAction[uiState.state].continueResize,
                data: { ...uiState.data },
              })
              return
            } else if (uiState.data.pointerPosition === 'end') {
              const newElementWithoutId = createLinearElementWithoutId({
                lineType: resizingElement.type,
                x1: resizingElement.x1,
                y1: resizingElement.y1,
                x2: sceneX,
                y2: sceneY,
              })
              replaceCurrentSnapshotByReplacingElements({
                replacedElement: { ...newElementWithoutId, id: resizingElementId },
              })
              dispatch({
                type: validAction[uiState.state].continueResize,
                data: { ...uiState.data },
              })
              return
            }
            // should not reach here
            throw new Error(
              'While resizing a line or arrow, the pointer position is not at either end of the line.'
            )
          } else if (
            uiState.data.elementType === 'rectangle' &&
            resizingElement.type === 'rectangle'
          ) {
            const newElementWithoutId = resizeRectangleElement({
              newPointerPosition: { x: sceneX, y: sceneY },
              pointerStartedAt: uiState.data.pointerPosition,
              rectElementToResize: resizingElement,
            })
            replaceCurrentSnapshotByReplacingElements({
              replacedElement: { ...newElementWithoutId, id: resizingElementId },
            })
            dispatch({
              type: validAction[uiState.state].continueResize,
              data: { ...uiState.data },
            })
            return
          } else if (uiState.data.elementType === 'image' && resizingElement.type === 'image') {
            const newElementWithoutId = resizeImageElement({
              newPointerPosition: { x: sceneX, y: sceneY },
              pointerStartedAt: uiState.data.pointerPosition,
              imageElementToResize: resizingElement,
            })
            replaceCurrentSnapshotByReplacingElements({
              replacedElement: { ...newElementWithoutId, id: resizingElementId },
            })
            dispatch({
              type: validAction[uiState.state].continueResize,
              data: { ...uiState.data },
            })
            return
          } else {
            throw new Error(
              '1. Mismatch between resizing element type and actual element type in the snapshot\n-or-\n2. Unsupported element type for resizing'
            )
          }
        },
        handlePointerUp(e: React.PointerEvent) {
          // should come from onPointerMove() of the same previous same state: 'resizing'

          // adjust coordinates to handle the case when resizing flips the rectangle
          if (uiState.data.elementType === 'rectangle') {
            const resizingElementId = uiState.data.elementId
            const resizingElement = getElementInCurrentSnapshot(resizingElementId)
            if (!resizingElement || resizingElement.type !== 'rectangle') {
              throw new Error('The resizing element is not a "rectangle" element')
            }
            const { newX1, newX2, newY1, newY2 } = adjustRectangleCoordinates(resizingElement)
            const newElementWithoutId = createRectangleElementWithoutId({
              x1: newX1,
              y1: newY1,
              width: newX2 - newX1,
              height: newY2 - newY1,
            })
            replaceCurrentSnapshotByReplacingElements({
              replacedElement: { ...newElementWithoutId, id: resizingElementId },
            })
            dispatch({
              type: validAction[uiState.state].selectSingleElement,
              data: { elementId: resizingElementId },
            })
            return
          }

          dispatch({
            type: validAction[uiState.state].selectSingleElement,
            data: { elementId: uiState.data.elementId },
          })
          return
        },
      }
    }
    case 'singleElementSelected': {
      return {
        handlePointerDown(e: React.PointerEvent) {
          const { sceneX, sceneY } = viewportCoordsToSceneCoords({
            viewportX: e.clientX,
            viewportY: e.clientY,
          })
          const selected = getFirstElementAtPosition({
            elementsSnapshot: currentSnapshot,
            xPosition: sceneX,
            yPosition: sceneY,
          })

          // pointer down does not hit on any elements
          if (!selected) {
            dispatch({
              type: validAction[uiState.state].dragSelect,
              data: {
                rectangleSelector: {
                  type: 'rectangleSelector',
                  x1: sceneX,
                  y1: sceneY,
                  x2: sceneX,
                  y2: sceneY,
                },
                selectedElementIds: [],
              },
            })
            return
          }
          // pointer down hits a different element than the current selected element
          if (selected.firstFoundElement.id !== uiState.data.elementId) {
            // allow to move only
            dispatch({
              type: validAction[uiState.state].prepareMove,
              data: createMoveDataArray({
                targetElements: [selected.firstFoundElement],
                pointerX: sceneX,
                pointerY: sceneY,
              }),
            })
            return
          }

          // pointer down hits on the current selected element
          // we allow to either move or resize an element
          // ... so, we need to check which part of the element was clicked
          if (selected.pointerPosition === 'onLine' || selected.pointerPosition === 'inside') {
            dispatch({
              type: validAction[uiState.state].prepareMove,
              data: createMoveDataArray({
                targetElements: [selected.firstFoundElement],
                pointerX: sceneX,
                pointerY: sceneY,
              }),
            })
          } else if (
            selected.pointerPosition === 'start' ||
            selected.pointerPosition === 'end' ||
            selected.pointerPosition === 'tl' ||
            selected.pointerPosition === 'tr' ||
            selected.pointerPosition === 'br' ||
            selected.pointerPosition === 'bl'
          ) {
            dispatch({
              type: validAction[uiState.state].prepareResize,
              data: createResizeData({
                targetElement: selected.firstFoundElement,
                pointerPosition: selected.pointerPosition,
              }),
            })
          } else {
            throw new Error(`${selected.pointerPosition} pointer position is not supported`)
          }
          return
        },
        handlePointerMove(e: React.PointerEvent) {
          handleCursorUI(e)
        },
        handlePointerUp(e: React.PointerEvent) {},
      }
    }
    case 'multiElementSelected': {
      return {
        handlePointerDown(e: React.PointerEvent) {
          const { sceneX, sceneY } = viewportCoordsToSceneCoords({
            viewportX: e.clientX,
            viewportY: e.clientY,
          })
          const selected = getFirstElementAtPosition({
            elementsSnapshot: currentSnapshot,
            xPosition: sceneX,
            yPosition: sceneY,
          })

          // pointer down does not hit on any elements
          if (!selected) {
            dispatch({
              type: validAction[uiState.state].dragSelect,
              data: {
                rectangleSelector: {
                  type: 'rectangleSelector',
                  x1: sceneX,
                  y1: sceneY,
                  x2: sceneX,
                  y2: sceneY,
                },
                selectedElementIds: [],
              },
            })
            return
          }

          // find out if a pointer down hits on one of the current selected elements or not
          const currentSelectedElements = getElementsInSnapshot(
            currentSnapshot,
            uiState.data.elementIds
          )
          const firstSelectedAtPointer = getFirstElementAtPosition({
            elementsSnapshot: currentSelectedElements,
            xPosition: sceneX,
            yPosition: sceneY,
          })
          const isPointerHitOneOfSelectedElements = Boolean(firstSelectedAtPointer)

          // pointer down hits on the current selected elements
          // we allow to move only
          if (isPointerHitOneOfSelectedElements) {
            dispatch({
              type: validAction[uiState.state].prepareMove,
              data: createMoveDataArray({
                targetElements: currentSelectedElements,
                pointerX: sceneX,
                pointerY: sceneY,
              }),
            })
            return
          }
          // pointer down hits on a different element than the current selected elements
          // we reset state
          else {
            dispatch({
              type: validAction[uiState.state].reset,
            })
            return
          }
        },
        handlePointerMove(e: React.PointerEvent) {
          handleCursorUI(e)
        },
        handlePointerUp(e: React.PointerEvent) {},
      }
    }
    default: {
      throw new Error('Cannot generate pointer handlers based on the current UI state')
    }
  }
}
