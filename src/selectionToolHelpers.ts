import * as React from 'react'
import {
  TCommitNewSnapshotParam,
  TElementData,
  TReplaceCurrentSnapshotParam,
  TSnapshot,
} from './App'
import { createLinearElementWithoutId } from './CanvasForLinear'
import { adjustRectangleCoordinates, createRectangleElementWithoutId } from './CanvasForRect'
import {
  createMoveDataArray,
  createResizeData,
  TAction,
  TCursorType,
  TUiState,
} from './CanvasForSelection'
import { createTextElementWithoutId, getTextElementAtPosition } from './CanvasForText'

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
    } else if (element.type === 'rectangle') {
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
      // TODO: check if a pointer is inside the rectangle after we support filled rectangle
      // else if (
      //   element.x1 <= xPosition &&
      //   xPosition <= element.x2 &&
      //   element.y1 <= yPosition &&
      //   yPosition <= element.y2
      // ) {
      //   ...
      //   break // 1st loop
      // }

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

export function createPointerHandlers({
  uiState,
  dispatch,
  elementsSnapshot,
  commitNewSnapshot,
  replaceCurrentSnapshot,
  viewportCoordsToSceneCoords,
  setCursorType,
  canvasForMeasureRef,
}: {
  uiState: TUiState
  dispatch: React.Dispatch<TAction>
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
      elementsSnapshot: elementsSnapshot,
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
          // should come from previous onPointerDown() or initial state when mount

          const { sceneX, sceneY } = viewportCoordsToSceneCoords({
            viewportX: e.clientX,
            viewportY: e.clientY,
          })
          const selected = getFirstElementAtPosition({
            elementsSnapshot,
            xPosition: sceneX,
            yPosition: sceneY,
          })
          // a pointer is not click on any elements
          if (!selected) return

          // when current action is "none", we only allow to move an element
          dispatch({
            type: 'prepareMove',
            data: createMoveDataArray({
              targetElements: [selected.firstFoundElement],
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
    case 'readyToMove': {
      return {
        handlePointerDown(e: React.PointerEvent) {},
        handlePointerMove(e: React.PointerEvent) {
          handleCursorUI(e)

          // should come from onPointerDown()
          commitNewSnapshot({ mode: 'clone' })
          dispatch({ type: 'startMove', data: [...uiState.data] })
          return
        },
        handlePointerUp(e: React.PointerEvent) {
          // should come straight from onPointerDown() without triggering onPointerMove()
          if (uiState.data.length === 0) {
            throw new Error('Cannot select any element because the elementId is missing')
          }
          // the element is not actually move
          // don't do anything with history
          dispatch({ type: 'select', data: { elementId: uiState.data[0]?.elementId ?? -1 } })
          return
        },
      }
    }
    case 'moving': {
      return {
        handlePointerDown(e: React.PointerEvent) {},
        handlePointerMove(e: React.PointerEvent) {
          handleCursorUI(e)

          // should come from previous onPointerMove()

          const { sceneX, sceneY } = viewportCoordsToSceneCoords({
            viewportX: e.clientX,
            viewportY: e.clientY,
          })

          // store all moving elements, will be used to replace the current snapshot
          let replacedMultiElements: TElementData[] = []

          // create new element for replacing, one-by-one
          uiState.data.forEach((moveData) => {
            const index = moveData.elementId

            const movingElementInSnapshot = elementsSnapshot[moveData.elementId]
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
              replacedMultiElements.push({ ...newElementWithoutId, id: index })
              // continue forEach loop
              return
            } else if (
              moveData.elementType === 'rectangle' &&
              movingElementInSnapshot.type === 'rectangle'
            ) {
              const newX1 = sceneX - moveData.pointerOffsetX1
              const newY1 = sceneY - moveData.pointerOffsetY1
              // keep existing width + height
              const width = movingElementInSnapshot.x2 - movingElementInSnapshot.x1
              const height = movingElementInSnapshot.y2 - movingElementInSnapshot.y1
              const newElementWithoutId = createRectangleElementWithoutId({
                x1: newX1,
                y1: newY1,
                width: width,
                height: height,
              })
              replacedMultiElements.push({ ...newElementWithoutId, id: index })
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
                id: index,
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
              replacedMultiElements.push({ ...newElementWithoutId, id: index })
              // continue forEach loop
              return
            } else {
              throw new Error(
                '1. Mismatch between moving element type and actual element type in the snapshot\n-or-\n2. Unsupported element type for moving'
              )
            }
          })

          replaceCurrentSnapshot({ replacedMultiElements })
          dispatch({ type: 'continueMove', data: [...uiState.data] })
          return
        },
        handlePointerUp(e: React.PointerEvent) {
          // should come from onPointerMove()
          if (uiState.data.length === 0) {
            throw new Error('Cannot finish moving an element because the elementId is missing')
          }
          dispatch({ type: 'stopMove', data: { elementId: uiState.data[0]?.elementId ?? -1 } })
          return
        },
      }
    }
    case 'readyToResize': {
      return {
        handlePointerDown(e: React.PointerEvent) {},
        handlePointerMove(e: React.PointerEvent) {
          handleCursorUI(e)

          // should come from onPointerDown()
          commitNewSnapshot({ mode: 'clone' })
          dispatch({ type: 'startResize', data: { ...uiState.data } })
          return
        },
        handlePointerUp(e: React.PointerEvent) {
          // should come straight from onPointerDown() without triggering onPointerMove()

          // the element is not actually resize
          // don't do anything with history
          dispatch({ type: 'select', data: { elementId: uiState.data.elementId } })
          return
        },
      }
    }
    case 'resizing': {
      return {
        handlePointerDown(e: React.PointerEvent) {},
        handlePointerMove(e: React.PointerEvent) {
          handleCursorUI(e)

          // should come from previous onPointerMove()
          const { sceneX, sceneY } = viewportCoordsToSceneCoords({
            viewportX: e.clientX,
            viewportY: e.clientY,
          })

          // replace this specific element
          const index = uiState.data.elementId

          const resizingElement = elementsSnapshot[uiState.data.elementId]
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
              replaceCurrentSnapshot({ replacedElement: { ...newElementWithoutId, id: index } })
              dispatch({ type: 'continueResize', data: { ...uiState.data } })
              return
            } else if (uiState.data.pointerPosition === 'end') {
              const newElementWithoutId = createLinearElementWithoutId({
                lineType: resizingElement.type,
                x1: resizingElement.x1,
                y1: resizingElement.y1,
                x2: sceneX,
                y2: sceneY,
              })
              replaceCurrentSnapshot({ replacedElement: { ...newElementWithoutId, id: index } })
              dispatch({ type: 'continueResize', data: { ...uiState.data } })
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
            if (uiState.data.pointerPosition === 'tl') {
              const newElementWithoutId = createRectangleElementWithoutId({
                x1: sceneX,
                y1: sceneY,
                width: resizingElement.x2 - sceneX,
                height: resizingElement.y2 - sceneY,
              })
              replaceCurrentSnapshot({ replacedElement: { ...newElementWithoutId, id: index } })
              dispatch({ type: 'continueResize', data: { ...uiState.data } })
              return
            } else if (uiState.data.pointerPosition === 'tr') {
              const newElementWithoutId = createRectangleElementWithoutId({
                x1: resizingElement.x1,
                y1: sceneY,
                width: sceneX - resizingElement.x1,
                height: resizingElement.y2 - sceneY,
              })
              replaceCurrentSnapshot({ replacedElement: { ...newElementWithoutId, id: index } })
              dispatch({ type: 'continueResize', data: { ...uiState.data } })
              return
            } else if (uiState.data.pointerPosition === 'br') {
              const newElementWithoutId = createRectangleElementWithoutId({
                x1: resizingElement.x1,
                y1: resizingElement.y1,
                width: sceneX - resizingElement.x1,
                height: sceneY - resizingElement.y1,
              })
              replaceCurrentSnapshot({ replacedElement: { ...newElementWithoutId, id: index } })
              dispatch({ type: 'continueResize', data: { ...uiState.data } })
              return
            } else if (uiState.data.pointerPosition === 'bl') {
              const newElementWithoutId = createRectangleElementWithoutId({
                x1: sceneX,
                y1: resizingElement.y1,
                width: resizingElement.x2 - sceneX,
                height: sceneY - resizingElement.y1,
              })
              replaceCurrentSnapshot({ replacedElement: { ...newElementWithoutId, id: index } })
              dispatch({ type: 'continueResize', data: { ...uiState.data } })
              return
            }
            // should not reach here
            throw new Error(
              'While resizing a rectangle, the pointer position is not at any corner.'
            )
          } else {
            throw new Error(
              '1. Mismatch between resizing element type and actual element type in the snapshot\n-or-\n2. Unsupported element type for resizing'
            )
          }
        },
        handlePointerUp(e: React.PointerEvent) {
          // should come from onPointerMove()

          // adjust coordinates to handle the case when resizing flips the rectangle
          if (uiState.data.elementType === 'rectangle') {
            const selectedIndex = uiState.data.elementId
            const selectedElement = elementsSnapshot[selectedIndex]
            if (!selectedElement || selectedElement.type !== 'rectangle') {
              throw new Error('The resizing element is not a "rectangle" element')
            }
            const { newX1, newX2, newY1, newY2 } = adjustRectangleCoordinates(selectedElement)
            const newElementWithoutId = createRectangleElementWithoutId({
              x1: newX1,
              y1: newY1,
              width: newX2 - newX1,
              height: newY2 - newY1,
            })
            replaceCurrentSnapshot({
              replacedElement: { ...newElementWithoutId, id: selectedIndex },
            })
            dispatch({ type: 'stopResize', data: { elementId: uiState.data.elementId } })
            return
          }

          dispatch({ type: 'stopResize', data: { elementId: uiState.data.elementId } })
          return
        },
      }
    }
    case 'idleSelecting': {
      return {
        handlePointerDown(e: React.PointerEvent) {
          // should come from onPointerUp()

          const { sceneX, sceneY } = viewportCoordsToSceneCoords({
            viewportX: e.clientX,
            viewportY: e.clientY,
          })
          const selected = getFirstElementAtPosition({
            elementsSnapshot,
            xPosition: sceneX,
            yPosition: sceneY,
          })
          // a pointer is not click on any elements
          if (!selected) {
            dispatch({ type: 'unselect' })
            return
          }
          // a pointer clicked on a different element than the dashed element
          if (selected.firstFoundElement.id !== uiState.data.elementId) {
            // allow to move only
            dispatch({
              type: 'prepareMove',
              data: createMoveDataArray({
                targetElements: [selected.firstFoundElement],
                pointerX: sceneX,
                pointerY: sceneY,
              }),
            })
            return
          }

          // when the current action is "idleSelecting", we allow to either move or resize an element
          // ... so, we need to check which part of the element was clicked
          if (selected.pointerPosition === 'onLine' || selected.pointerPosition === 'inside') {
            dispatch({
              type: 'prepareMove',
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
              type: 'prepareResize',
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
    default: {
      throw new Error('Cannot generate pointer handlers based on the current UI state')
    }
  }
}
