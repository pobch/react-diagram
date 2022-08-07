/* eslint-disable no-extra-label */
import * as React from 'react'
import { flushSync } from 'react-dom'
import { TElementData, TSnapshot } from '../App'
import { getElementsInSnapshot, TCursorType } from '../CanvasForSelection'
import { getTextElementAtPosition } from '../CanvasForText'
import { TUiState, useSelectionMachine, validAction } from './useSelectionMachine'

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

export function createPointerHandlers({
  uiState,
  actions,
  currentSnapshot,
  viewportCoordsToSceneCoords,
  setCursorType,
}: {
  uiState: TUiState
  actions: ReturnType<typeof useSelectionMachine>['actions']
  currentSnapshot: TSnapshot
  viewportCoordsToSceneCoords: (arg: { viewportX: number; viewportY: number }) => {
    sceneX: number
    sceneY: number
  }
  setCursorType: React.Dispatch<React.SetStateAction<TCursorType>>
}) {
  function handleCursorUI(e: React.PointerEvent) {
    const { sceneX, sceneY } = viewportCoordsToSceneCoords({
      viewportX: e.clientX,
      viewportY: e.clientY,
    })

    // cursor UI for all uiState
    // TODO: Add state guard and separate cursor between "none" and other state
    const { pointerPosition: hoveringPosition } = getLastElementAtPosition({
      elementsSource: currentSnapshot,
      xPosition: sceneX,
      yPosition: sceneY,
    })
    if (hoveringPosition === 'notFound') {
      setCursorType('default')
    } else if (hoveringPosition === 'onLine' || hoveringPosition === 'inside') {
      setCursorType('move')
    } else if (hoveringPosition === 'tr' || hoveringPosition === 'bl') {
      setCursorType('nesw-resize')
    } else if (
      hoveringPosition === 'start' ||
      hoveringPosition === 'end' ||
      hoveringPosition === 'tl' ||
      hoveringPosition === 'br'
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
            actions[validAction[uiState.state].prepareDragSelect]({ sceneX, sceneY })
            return
          }

          // pointer down hits on an element
          actions[validAction[uiState.state].prepareMove]({
            sceneX,
            sceneY,
            elementsToMove: [hitPoint.foundLastElement],
          })
          return
        },
        handlePointerMove(e: React.PointerEvent) {
          if (!e.isPrimary) return

          handleCursorUI(e)
        },
        handlePointerUp(e: React.PointerEvent) {},
      }
    }
    case 'areaSelecting': {
      return {
        handlePointerDown(e: React.PointerEvent) {},
        handlePointerMove(e: React.PointerEvent) {
          if (!e.isPrimary) return

          handleCursorUI(e)

          // can come from either
          // - onPointerDown() of previous 'none' || 'singleElementSelected' || 'multiElementSelected' state
          // - onPointerMove() of the previous same state: 'areaSelecting'

          const { sceneX, sceneY } = viewportCoordsToSceneCoords({
            viewportX: e.clientX,
            viewportY: e.clientY,
          })

          // continue dragging
          actions[validAction[uiState.state].dragSelect]({ sceneX, sceneY, prevState: uiState })
          return
        },
        handlePointerUp(e: React.PointerEvent) {
          if (!e.isPrimary) return

          // should come from onPointerMove() of the previous same state: 'areaSelecting'

          if (uiState.data.selectedElementIds.length >= 2) {
            actions[validAction[uiState.state].selectMultipleElements]({ prevState: uiState })
            return
          }
          if (uiState.data.selectedElementIds.length === 1) {
            actions[validAction[uiState.state].selectSingleElement]({ prevState: uiState })
            return
          }
          if (uiState.data.selectedElementIds.length === 0) {
            // no element got selected
            actions[validAction[uiState.state].reset]()
            return
          }
        },
      }
    }
    case 'readyToMove': {
      return {
        handlePointerDown(e: React.PointerEvent) {},
        handlePointerMove(e: React.PointerEvent) {
          if (!e.isPrimary) return

          handleCursorUI(e)
          // wrap in flushSync because the following code need to be called at most once
          // https://github.com/pobch/react-diagram/issues/27
          flushSync(() => {
            // should come from onPointerDown() of 'none' || 'singleElementSelected' || 'multiElementSelected' state
            actions[validAction[uiState.state].startMove]({ prevState: uiState })
            return
          })
        },
        handlePointerUp(e: React.PointerEvent) {
          if (!e.isPrimary) return

          // Should come from onPointerDown() of 'none' || 'singleElementSelected' || 'multiElementSelected' state
          // ... in the case that onPointerMove() is not triggered at all.
          // This means the selected element(s) is not actually move.
          // Therefore, don't do anything with history.

          if (uiState.data.length === 0) {
            throw new Error('Cannot select any element because the moving element id is missing')
          }
          if (uiState.data.length === 1) {
            actions[validAction[uiState.state].selectSingleElement]({ prevState: uiState })
            return
          }
          if (uiState.data.length >= 2) {
            actions[validAction[uiState.state].selectMultipleElements]({ prevState: uiState })
            return
          }
        },
      }
    }
    case 'moving': {
      return {
        handlePointerDown(e: React.PointerEvent) {},
        handlePointerMove(e: React.PointerEvent) {
          if (!e.isPrimary) return

          handleCursorUI(e)

          // can come from either
          // - onPointerMove() of previous 'readyToMove' state (when we start to move)
          // - onPointerMove() of the previous same state: 'moving' (when we continue to move)

          const { sceneX, sceneY } = viewportCoordsToSceneCoords({
            viewportX: e.clientX,
            viewportY: e.clientY,
          })

          actions[validAction[uiState.state].continueMove]({ prevState: uiState, sceneX, sceneY })
          return
        },
        handlePointerUp(e: React.PointerEvent) {
          if (!e.isPrimary) return

          // should come from onPointerMove() of the same previous same state: 'moving'
          if (uiState.data.length === 0) {
            throw new Error(
              'Cannot finish moving an element because the moving element id is missing'
            )
          }
          if (uiState.data.length === 1) {
            actions[validAction[uiState.state].selectSingleElement]({ prevState: uiState })
            return
          }
          if (uiState.data.length >= 2) {
            actions[validAction[uiState.state].selectMultipleElements]({ prevState: uiState })
            return
          }
        },
      }
    }
    case 'readyToResize': {
      return {
        handlePointerDown(e: React.PointerEvent) {},
        handlePointerMove(e: React.PointerEvent) {
          if (!e.isPrimary) return

          handleCursorUI(e)
          // wrap in flushSync because the following code need to be called at most once
          // https://github.com/pobch/react-diagram/issues/27
          flushSync(() => {
            // should come from onPointerDown() of 'singleElementSelected' state
            actions[validAction[uiState.state].startResize]({ prevState: uiState })
            return
          })
        },
        handlePointerUp(e: React.PointerEvent) {
          if (!e.isPrimary) return

          // Should come from onPointerDown() of 'singleElementSelected' state
          // ... in the case that onPointerMove() is not triggered at all.
          // This means the selected element is not actually resize.
          // Therefore, don't do anything with history.

          actions[validAction[uiState.state].selectSingleElement]({ prevState: uiState })
          return
        },
      }
    }
    case 'resizing': {
      return {
        handlePointerDown(e: React.PointerEvent) {},
        handlePointerMove(e: React.PointerEvent) {
          if (!e.isPrimary) return

          handleCursorUI(e)

          // can come from either
          // - onPointerMove() of previous 'readyToResize' state (when we start to resize)
          // - onPointerMove() of the previous same state: 'resizing' (when we continue to resize)

          const { sceneX, sceneY } = viewportCoordsToSceneCoords({
            viewportX: e.clientX,
            viewportY: e.clientY,
          })

          actions[validAction[uiState.state].continueResize]({ sceneX, sceneY, prevState: uiState })
          return
        },
        handlePointerUp(e: React.PointerEvent) {
          if (!e.isPrimary) return

          // should come from onPointerMove() of the same previous same state: 'resizing'

          // adjust coordinates to handle the case when resizing flips the rectangle
          if (uiState.data.elementType === 'rectangle') {
            actions[validAction[uiState.state].flipThenSelectRectangle]({ prevState: uiState })
            return
          }

          actions[validAction[uiState.state].selectSingleElement]({ prevState: uiState })
          return
        },
      }
    }
    case 'singleElementSelected': {
      return {
        handlePointerDown(e: React.PointerEvent) {
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
            actions[validAction[uiState.state].prepareDragSelect]({ sceneX, sceneY })
            return
          }
          // pointer down hits a different element than the current selected element
          const isHitOnUnselectedElement = hitPoint.foundLastElement.id !== uiState.data.elementId
          if (isHitOnUnselectedElement) {
            // allow to move only
            actions[validAction[uiState.state].prepareMove]({
              sceneX,
              sceneY,
              elementsToMove: [hitPoint.foundLastElement],
            })
            return
          }

          // pointer down hits on the current selected element
          // we allow to either move or resize an element
          // ... so, we need to check which part of the element was clicked
          if (hitPoint.pointerPosition === 'onLine' || hitPoint.pointerPosition === 'inside') {
            actions[validAction[uiState.state].prepareMove]({
              sceneX,
              sceneY,
              elementsToMove: [hitPoint.foundLastElement],
            })
          } else if (
            hitPoint.pointerPosition === 'start' ||
            hitPoint.pointerPosition === 'end' ||
            hitPoint.pointerPosition === 'tl' ||
            hitPoint.pointerPosition === 'tr' ||
            hitPoint.pointerPosition === 'br' ||
            hitPoint.pointerPosition === 'bl'
          ) {
            actions[validAction[uiState.state].prepareResize]({
              elementToResize: hitPoint.foundLastElement,
              pointerPosition: hitPoint.pointerPosition,
            })
          } else {
            throw new Error(`${hitPoint.pointerPosition} pointer position is not supported`)
          }
          return
        },
        handlePointerMove(e: React.PointerEvent) {
          if (!e.isPrimary) return

          handleCursorUI(e)
        },
        handlePointerUp(e: React.PointerEvent) {},
      }
    }
    case 'multiElementSelected': {
      return {
        handlePointerDown(e: React.PointerEvent) {
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
            actions[validAction[uiState.state].prepareDragSelect]({ sceneX, sceneY })
            return
          }

          // find out if a pointer down hits on one of the current selected elements or not
          const currentSelectedElements = getElementsInSnapshot(
            currentSnapshot,
            uiState.data.elementIds
          )
          const isPointerHitOneOfSelectedElements = currentSelectedElements.some(
            (selectedElement) => selectedElement.id === hitPoint.foundLastElement.id
          )

          // pointer down hits on the current selected elements
          // we allow to move only
          if (isPointerHitOneOfSelectedElements) {
            actions[validAction[uiState.state].prepareMove]({
              sceneX,
              sceneY,
              elementsToMove: currentSelectedElements,
            })
            return
          }
          // pointer down hits on a different element than the current selected elements
          // we reset state
          else {
            actions[validAction[uiState.state].reset]()
            return
          }
        },
        handlePointerMove(e: React.PointerEvent) {
          if (!e.isPrimary) return

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
