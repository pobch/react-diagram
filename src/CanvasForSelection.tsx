import * as React from 'react'
import { useState } from 'react'
import { adjustLineCoordinates, createLineElement } from './CanvasForLine'
import { adjustRectangleCoordinates, createRectangleElement } from './CanvasForRect'
import { TElementData } from './App'

function getFirstElmDataAtPosition({
  dataSource,
  xPosition,
  yPosition,
}: {
  dataSource: TElementData[]
  xPosition: number
  yPosition: number
}): TActionData | undefined {
  function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
  }
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
    return Math.abs(xPosition - xPoint) < 5 && Math.abs(yPosition - yPoint) < 5
  }

  // in case of not found, it will be undefined
  let foundElement: TActionData | undefined = undefined

  for (let element of dataSource) {
    if (element.type === 'line') {
      // check if a pointer is at left-end
      if (isNearPoint({ xPosition, yPosition, xPoint: element.x1, yPoint: element.y1 })) {
        foundElement = {
          elementId: element.id,
          x1: element.x1,
          y1: element.y1,
          x2: element.x2,
          y2: element.y2,
          elementType: 'line',
          pointerPosition: 'left',
          pointerOffsetX1: xPosition - element.x1,
          pointerOffsetY1: yPosition - element.y1,
        }
        break
      }
      // check if a pointer is at right-end
      else if (isNearPoint({ xPosition, yPosition, xPoint: element.x2, yPoint: element.y2 })) {
        foundElement = {
          elementId: element.id,
          x1: element.x1,
          y1: element.y1,
          x2: element.x2,
          y2: element.y2,
          elementType: 'line',
          pointerPosition: 'right',
          pointerOffsetX1: xPosition - element.x1,
          pointerOffsetY1: yPosition - element.y1,
        }
        break
      }
      // check if a pointer is inside the line
      const a = { x: element.x1, y: element.y1 }
      const b = { x: element.x2, y: element.y2 }
      const c = { x: xPosition, y: yPosition }
      const distanceOffset = distance(a, b) - (distance(a, c) + distance(b, c))
      if (Math.abs(distanceOffset) < 1) {
        foundElement = {
          elementId: element.id,
          x1: element.x1,
          y1: element.y1,
          x2: element.x2,
          y2: element.y2,
          elementType: 'line',
          pointerPosition: 'inside',
          pointerOffsetX1: xPosition - element.x1,
          pointerOffsetY1: yPosition - element.y1,
        }
        break
      }
      continue
    } else if (element.type === 'rectangle') {
      // check if a pointer is at top-left
      if (isNearPoint({ xPosition, yPosition, xPoint: element.x1, yPoint: element.y1 })) {
        foundElement = {
          elementId: element.id,
          x1: element.x1,
          y1: element.y1,
          x2: element.x2,
          y2: element.y2,
          elementType: 'rectangle',
          pointerPosition: 'tl',
          pointerOffsetX1: xPosition - element.x1,
          pointerOffsetY1: yPosition - element.y1,
        }
        break
      }
      // check if a pointer is at top-right
      else if (isNearPoint({ xPosition, yPosition, xPoint: element.x2, yPoint: element.y1 })) {
        foundElement = {
          elementId: element.id,
          x1: element.x1,
          y1: element.y1,
          x2: element.x2,
          y2: element.y2,
          elementType: 'rectangle',
          pointerPosition: 'tr',
          pointerOffsetX1: xPosition - element.x1,
          pointerOffsetY1: yPosition - element.y1,
        }
        break
      }
      // check if a pointer is at bottom-right
      else if (isNearPoint({ xPosition, yPosition, xPoint: element.x2, yPoint: element.y2 })) {
        foundElement = {
          elementId: element.id,
          x1: element.x1,
          y1: element.y1,
          x2: element.x2,
          y2: element.y2,
          elementType: 'rectangle',
          pointerPosition: 'br',
          pointerOffsetX1: xPosition - element.x1,
          pointerOffsetY1: yPosition - element.y1,
        }
        break
      }
      // check if a pointer is at bottom-left
      else if (isNearPoint({ xPosition, yPosition, xPoint: element.x1, yPoint: element.y2 })) {
        foundElement = {
          elementId: element.id,
          x1: element.x1,
          y1: element.y1,
          x2: element.x2,
          y2: element.y2,
          elementType: 'rectangle',
          pointerPosition: 'bl',
          pointerOffsetX1: xPosition - element.x1,
          pointerOffsetY1: yPosition - element.y1,
        }
        break
      }
      // check if a pointer is inside the rectangle
      else if (
        element.x1 <= xPosition &&
        xPosition <= element.x2 &&
        element.y1 <= yPosition &&
        yPosition <= element.y2
      ) {
        foundElement = {
          elementId: element.id,
          x1: element.x1,
          y1: element.y1,
          x2: element.x2,
          y2: element.y2,
          elementType: 'rectangle',
          pointerPosition: 'inside',
          pointerOffsetX1: xPosition - element.x1,
          pointerOffsetY1: yPosition - element.y1,
        }
        break
      }
      continue
    }
  }

  return foundElement
}

type TActionData =
  | {
      elementId: number
      x1: number
      y1: number
      x2: number
      y2: number
      elementType: 'line'
      pointerPosition: 'left' | 'right' | 'inside'
      pointerOffsetX1: number
      pointerOffsetY1: number
    }
  | {
      elementId: number
      x1: number
      y1: number
      x2: number
      y2: number
      elementType: 'rectangle'
      pointerPosition: 'tl' | 'tr' | 'bl' | 'br' | 'inside'
      pointerOffsetX1: number
      pointerOffsetY1: number
    }
type TActionState =
  | {
      action: 'none'
    }
  | {
      action: 'moving'
      data: TActionData
    }
  | {
      action: 'resizing'
      data: TActionData
    }

/**
 * * -----------------------------------------
 * *               Component
 * * -----------------------------------------
 */
export const CanvasForSelection = React.forwardRef(function CanvasForSelection(
  {
    elements,
    setElements,
  }: {
    elements: TElementData[]
    setElements: React.Dispatch<TElementData[]>
  },
  canvasRef: React.Ref<HTMLCanvasElement>
) {
  const [actionState, setActionState] = useState<TActionState>({ action: 'none' })

  function handlePointerDown(e: React.PointerEvent) {
    const { clientX, clientY } = e
    const selectedElemData = getFirstElmDataAtPosition({
      dataSource: elements,
      xPosition: clientX,
      yPosition: clientY,
    })
    // a pointer is not click on any elements
    if (!selectedElemData) return

    // check which part of the element was clicked
    if (selectedElemData.pointerPosition === 'inside') {
      setActionState({ action: 'moving', data: selectedElemData })
      return
    } else if (
      selectedElemData.pointerPosition === 'left' ||
      selectedElemData.pointerPosition === 'right' ||
      selectedElemData.pointerPosition === 'tl' ||
      selectedElemData.pointerPosition === 'tr' ||
      selectedElemData.pointerPosition === 'br' ||
      selectedElemData.pointerPosition === 'bl'
    ) {
      setActionState({ action: 'resizing', data: selectedElemData })
      return
    }
  }

  const [cursorType, setCursorType] = useState<'default' | 'move' | 'nesw-resize' | 'nwse-resize'>(
    'default'
  )

  function handlePointerMove(e: React.PointerEvent) {
    const { clientX, clientY } = e

    // cursor UI
    const hoveredElemData = getFirstElmDataAtPosition({
      dataSource: elements,
      xPosition: clientX,
      yPosition: clientY,
    })
    if (!hoveredElemData) {
      setCursorType('default')
    } else if (hoveredElemData.pointerPosition === 'inside') {
      setCursorType('move')
    } else if (
      hoveredElemData.pointerPosition === 'right' ||
      hoveredElemData.pointerPosition === 'tr' ||
      hoveredElemData.pointerPosition === 'bl'
    ) {
      setCursorType('nesw-resize')
    } else if (
      hoveredElemData.pointerPosition === 'left' ||
      hoveredElemData.pointerPosition === 'tl' ||
      hoveredElemData.pointerPosition === 'br'
    ) {
      setCursorType('nwse-resize')
    }

    // moving logics
    if (actionState.action === 'moving') {
      const newX1 = clientX - actionState.data.pointerOffsetX1
      const newY1 = clientY - actionState.data.pointerOffsetY1
      // replace specific element
      const index = actionState.data.elementId
      const elementsCopy = [...elements]

      if (actionState.data.elementType === 'line') {
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
        elementsCopy[index] = newElement
      } else if (actionState.data.elementType === 'rectangle') {
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
        elementsCopy[index] = newElement
      }
      setElements(elementsCopy)
      return
    }

    // resizing logics
    if (actionState.action === 'resizing') {
      // replace specific element
      const index = actionState.data.elementId
      const elementsCopy = [...elements]

      if (actionState.data.elementType === 'line') {
        if (actionState.data.pointerPosition === 'left') {
          const newElement = createLineElement({
            id: index,
            x1: clientX,
            y1: clientY,
            x2: actionState.data.x2,
            y2: actionState.data.y2,
          })
          elementsCopy[index] = newElement
        } else if (actionState.data.pointerPosition === 'right') {
          const newElement = createLineElement({
            id: index,
            x1: actionState.data.x1,
            y1: actionState.data.y1,
            x2: clientX,
            y2: clientY,
          })
          elementsCopy[index] = newElement
        }
      } else if (actionState.data.elementType === 'rectangle') {
        if (actionState.data.pointerPosition === 'tl') {
          const newElement = createRectangleElement({
            id: index,
            x1: clientX,
            y1: clientY,
            width: actionState.data.x2 - clientX,
            height: actionState.data.y2 - clientY,
          })
          elementsCopy[index] = newElement
        } else if (actionState.data.pointerPosition === 'tr') {
          const newElement = createRectangleElement({
            id: index,
            x1: actionState.data.x1,
            y1: clientY,
            width: clientX - actionState.data.x1,
            height: actionState.data.y2 - clientY,
          })
          elementsCopy[index] = newElement
        } else if (actionState.data.pointerPosition === 'br') {
          const newElement = createRectangleElement({
            id: index,
            x1: actionState.data.x1,
            y1: actionState.data.y1,
            width: clientX - actionState.data.x1,
            height: clientY - actionState.data.y1,
          })
          elementsCopy[index] = newElement
        } else if (actionState.data.pointerPosition === 'bl') {
          const newElement = createRectangleElement({
            id: index,
            x1: clientX,
            y1: actionState.data.y1,
            width: actionState.data.x2 - clientX,
            height: clientY - actionState.data.y1,
          })
          elementsCopy[index] = newElement
        }
      }

      setElements(elementsCopy)
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    // adjust coordinates to handle case resizing flips the line
    if (actionState.action === 'resizing') {
      const selectedIndex = actionState.data.elementId
      const elementsCopy = [...elements]
      if (actionState.data.elementType === 'line') {
        const { newX1, newX2, newY1, newY2 } = adjustLineCoordinates(elements[selectedIndex])
        const newElement = createLineElement({
          id: selectedIndex,
          x1: newX1,
          y1: newY1,
          x2: newX2,
          y2: newY2,
        })
        elementsCopy[selectedIndex] = newElement
      } else if (actionState.data.elementType === 'rectangle') {
        const { newX1, newX2, newY1, newY2 } = adjustRectangleCoordinates(elements[selectedIndex])
        const newElement = createRectangleElement({
          id: selectedIndex,
          x1: newX1,
          y1: newY1,
          width: newX2 - newX1,
          height: newY2 - newY1,
        })
        elementsCopy[selectedIndex] = newElement
      }
      setElements(elementsCopy)
    }

    setActionState({ action: 'none' })
    return
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        backgroundColor: 'azure',
        display: 'block',
        width: window.innerWidth,
        height: window.innerHeight,
        // disable all touch behavior from browser, e.g. touch to scroll
        touchAction: 'none',
        cursor: cursorType,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      My Canvas
    </canvas>
  )
})
