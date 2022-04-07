import * as React from 'react'
import { useState, useRef } from 'react'
import { createLineElement } from './CanvasForLine'
import { adjustRectangleCoordinates, createRectangleElement } from './CanvasForRect'
import { TElementData, TSnapshot } from './App'
import { createTextElement, getTextElementAtPosition } from './CanvasForText'

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
    const THRESHOLD = 5
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
    if (element.type === 'line') {
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

function createMovingActionData({
  movingElement,
  pointerX,
  pointerY,
}: {
  movingElement: TElementData
  pointerX: number
  pointerY: number
}): TMovingActionData {
  switch (movingElement.type) {
    case 'line':
      return {
        elementType: 'line',
        elementId: movingElement.id,
        x1: movingElement.x1,
        y1: movingElement.y1,
        x2: movingElement.x2,
        y2: movingElement.y2,
        pointerOffsetX1: pointerX - movingElement.x1,
        pointerOffsetY1: pointerY - movingElement.y1,
      }
    case 'rectangle':
      return {
        elementType: 'rectangle',
        elementId: movingElement.id,
        x1: movingElement.x1,
        y1: movingElement.y1,
        x2: movingElement.x2,
        y2: movingElement.y2,
        pointerOffsetX1: pointerX - movingElement.x1,
        pointerOffsetY1: pointerY - movingElement.y1,
      }
    case 'pencil':
      return {
        elementType: 'pencil',
        elementId: movingElement.id,
        pointerOffsetFromPoints: movingElement.points.map((point) => ({
          offsetX: pointerX - point.x,
          offsetY: pointerY - point.y,
        })),
      }
    case 'text':
      return {
        elementType: 'text',
        elementId: movingElement.id,
        pointerOffsetX1: pointerX - movingElement.lines[0].lineX1,
        pointerOffsetY1: pointerY - movingElement.lines[0].lineY1,
        content: movingElement.lines.map(({ lineContent }) => lineContent).join('\n'),
      }
    default:
      throw new Error('Unsupported moving element type')
  }
}

function createResizingActionData({
  resizingElement,
  pointerPosition,
}: {
  resizingElement: TElementData
  pointerPosition: 'start' | 'end' | 'tl' | 'tr' | 'bl' | 'br'
}): TResizingActionData {
  switch (resizingElement.type) {
    case 'line':
      if (pointerPosition !== 'start' && pointerPosition !== 'end') {
        throw new Error('Impossible pointer position for resizing line element')
      }
      return {
        elementType: 'line',
        elementId: resizingElement.id,
        x1: resizingElement.x1,
        y1: resizingElement.y1,
        x2: resizingElement.x2,
        y2: resizingElement.y2,
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
        elementId: resizingElement.id,
        x1: resizingElement.x1,
        y1: resizingElement.y1,
        x2: resizingElement.x2,
        y2: resizingElement.y2,
        pointerPosition: pointerPosition,
      }
    default:
      throw new Error('Unsupported resizing element type')
  }
}

type TMovingActionData =
  | {
      elementType: 'line'
      elementId: number
      x1: number
      y1: number
      x2: number
      y2: number
      pointerOffsetX1: number
      pointerOffsetY1: number
    }
  | {
      elementType: 'rectangle'
      elementId: number
      x1: number
      y1: number
      x2: number
      y2: number
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
type TResizingActionData =
  | {
      elementType: 'line'
      elementId: number
      x1: number
      y1: number
      x2: number
      y2: number
      pointerPosition: 'start' | 'end'
    }
  | {
      elementType: 'rectangle'
      elementId: number
      x1: number
      y1: number
      x2: number
      y2: number
      pointerPosition: 'tl' | 'tr' | 'bl' | 'br'
    }

type TActionState =
  | {
      action: 'none'
    }
  | {
      action: 'moving'
      data: TMovingActionData
    }
  | {
      action: 'resizing'
      data: TResizingActionData
    }

/**
 * * -----------------------------------------
 * *               Component
 * * -----------------------------------------
 */
export function CanvasForSelection({
  renderCanvas,
  elementsSnapshot,
  addNewHistory,
  replaceCurrentHistory,
  viewportCoordsToSceneCoords,
}: {
  renderCanvas: (arg: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    styleCursor: 'default' | 'move' | 'nesw-resize' | 'nwse-resize'
  }) => React.ReactElement
  elementsSnapshot: TSnapshot
  addNewHistory: (arg: TSnapshot) => void
  replaceCurrentHistory: (arg: TSnapshot) => void
  viewportCoordsToSceneCoords: (arg: { viewportX: number; viewportY: number }) => {
    sceneX: number
    sceneY: number
  }
}) {
  const [actionState, setActionState] = useState<TActionState>({ action: 'none' })

  function handlePointerDown(e: React.PointerEvent) {
    if (actionState.action === 'none') {
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

      // check which part of the element was clicked
      if (selected.pointerPosition === 'onLine' || selected.pointerPosition === 'inside') {
        setActionState({
          action: 'moving',
          data: createMovingActionData({
            movingElement: selected.firstFoundElement,
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
        setActionState({
          action: 'resizing',
          data: createResizingActionData({
            resizingElement: selected.firstFoundElement,
            pointerPosition: selected.pointerPosition,
          }),
        })
      } else {
        throw new Error(`${selected.pointerPosition} pointer position is not supported`)
      }
      const newElementsSnapshot = [...elementsSnapshot]
      addNewHistory(newElementsSnapshot)
    }
  }

  const [cursorType, setCursorType] = useState<'default' | 'move' | 'nesw-resize' | 'nwse-resize'>(
    'default'
  )
  const canvasForMeasureRef = useRef<HTMLCanvasElement | null>(null)

  function handlePointerMove(e: React.PointerEvent) {
    const { sceneX, sceneY } = viewportCoordsToSceneCoords({
      viewportX: e.clientX,
      viewportY: e.clientY,
    })

    // cursor UI
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

    // moving logics
    if (actionState.action === 'moving') {
      // replace specific element
      const index = actionState.data.elementId
      const newElementsSnapshot = [...elementsSnapshot]

      if (actionState.data.elementType === 'line') {
        const newX1 = sceneX - actionState.data.pointerOffsetX1
        const newY1 = sceneY - actionState.data.pointerOffsetY1
        // keep existing line width
        const distanceX = actionState.data.x2 - actionState.data.x1
        const distanceY = actionState.data.y2 - actionState.data.y1
        const newElement = createLineElement({
          id: index,
          x1: newX1,
          y1: newY1,
          x2: newX1 + distanceX,
          y2: newY1 + distanceY,
        })
        newElementsSnapshot[index] = newElement
      } else if (actionState.data.elementType === 'rectangle') {
        const newX1 = sceneX - actionState.data.pointerOffsetX1
        const newY1 = sceneY - actionState.data.pointerOffsetY1
        // keep existing width + height
        const width = actionState.data.x2 - actionState.data.x1
        const height = actionState.data.y2 - actionState.data.y1
        const newElement = createRectangleElement({
          id: index,
          x1: newX1,
          y1: newY1,
          width: width,
          height: height,
        })
        newElementsSnapshot[index] = newElement
      } else if (actionState.data.elementType === 'pencil') {
        const newPoints = actionState.data.pointerOffsetFromPoints.map(({ offsetX, offsetY }) => ({
          x: sceneX - offsetX,
          y: sceneY - offsetY,
        }))
        const newElement: TElementData = {
          id: index,
          type: 'pencil',
          points: newPoints,
        }
        newElementsSnapshot[index] = newElement
      } else if (actionState.data.elementType === 'text') {
        const newElement: TElementData = createTextElement({
          id: index,
          canvasForMeasure: canvasForMeasureRef.current,
          content: actionState.data.content,
          isWriting: false,
          x1: sceneX - actionState.data.pointerOffsetX1,
          y1: sceneY - actionState.data.pointerOffsetY1,
        })
        newElementsSnapshot[index] = newElement
      }

      replaceCurrentHistory(newElementsSnapshot)
      return
    }

    // resizing logics
    if (actionState.action === 'resizing') {
      // replace specific element
      const index = actionState.data.elementId
      const newElementsSnapshot = [...elementsSnapshot]

      if (actionState.data.elementType === 'line') {
        if (actionState.data.pointerPosition === 'start') {
          const newElement = createLineElement({
            id: index,
            x1: sceneX,
            y1: sceneY,
            x2: actionState.data.x2,
            y2: actionState.data.y2,
          })
          newElementsSnapshot[index] = newElement
        } else if (actionState.data.pointerPosition === 'end') {
          const newElement = createLineElement({
            id: index,
            x1: actionState.data.x1,
            y1: actionState.data.y1,
            x2: sceneX,
            y2: sceneY,
          })
          newElementsSnapshot[index] = newElement
        }
      } else if (actionState.data.elementType === 'rectangle') {
        if (actionState.data.pointerPosition === 'tl') {
          const newElement = createRectangleElement({
            id: index,
            x1: sceneX,
            y1: sceneY,
            width: actionState.data.x2 - sceneX,
            height: actionState.data.y2 - sceneY,
          })
          newElementsSnapshot[index] = newElement
        } else if (actionState.data.pointerPosition === 'tr') {
          const newElement = createRectangleElement({
            id: index,
            x1: actionState.data.x1,
            y1: sceneY,
            width: sceneX - actionState.data.x1,
            height: actionState.data.y2 - sceneY,
          })
          newElementsSnapshot[index] = newElement
        } else if (actionState.data.pointerPosition === 'br') {
          const newElement = createRectangleElement({
            id: index,
            x1: actionState.data.x1,
            y1: actionState.data.y1,
            width: sceneX - actionState.data.x1,
            height: sceneY - actionState.data.y1,
          })
          newElementsSnapshot[index] = newElement
        } else if (actionState.data.pointerPosition === 'bl') {
          const newElement = createRectangleElement({
            id: index,
            x1: sceneX,
            y1: actionState.data.y1,
            width: actionState.data.x2 - sceneX,
            height: sceneY - actionState.data.y1,
          })
          newElementsSnapshot[index] = newElement
        }
      }

      replaceCurrentHistory(newElementsSnapshot)
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    // adjust coordinates to handle the case when resizing flips the rectangle
    if (actionState.action === 'resizing' && actionState.data.elementType === 'rectangle') {
      const selectedIndex = actionState.data.elementId
      const selectedElement = elementsSnapshot[selectedIndex]
      if (selectedElement.type !== 'rectangle') {
        throw new Error('The resizing element is not a "rectangle" type')
      }
      const { newX1, newX2, newY1, newY2 } = adjustRectangleCoordinates(selectedElement)
      const newElement = createRectangleElement({
        id: selectedIndex,
        x1: newX1,
        y1: newY1,
        width: newX2 - newX1,
        height: newY2 - newY1,
      })
      const newElementsSnapshot = [...elementsSnapshot]
      newElementsSnapshot[selectedIndex] = newElement

      replaceCurrentHistory(newElementsSnapshot)
    }

    // clear action
    if (actionState.action === 'moving' || actionState.action === 'resizing') {
      setActionState({ action: 'none' })
      return
    }
  }

  return (
    <>
      {/* TODO: find better approach for measure text dimension */}
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
