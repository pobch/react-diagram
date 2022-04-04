import * as React from 'react'
import { useState } from 'react'
import rough from 'roughjs/bundled/rough.esm'
import { TElementData, TSnapshot } from './App'

const generator = rough.generator()

export function createRectangleElement({
  id,
  x1,
  y1,
  width,
  height,
}: {
  id: number
  x1: number
  y1: number
  width: number
  height: number
}): Extract<TElementData, { type: 'line' | 'rectangle' }> {
  const roughElement = generator.rectangle(x1, y1, width, height)
  return {
    id: id,
    x1: x1,
    y1: y1,
    x2: x1 + width,
    y2: y1 + height,
    type: 'rectangle',
    roughElement,
  }
}

// make (x1, y1) always on the top-left and (x2, y2) always on the bottom-right
export function adjustRectangleCoordinates(
  element: Extract<TElementData, { type: 'line' | 'rectangle' }>
) {
  const { x1, x2, y1, y2 } = element
  const minX = Math.min(x1, x2)
  const maxX = Math.max(x1, x2)
  const minY = Math.min(y1, y2)
  const maxY = Math.max(y1, y2)
  return { newX1: minX, newY1: minY, newX2: maxX, newY2: maxY }
}

/**
 * * -----------------------------------------
 * *               Component
 * * -----------------------------------------
 */
export function CanvasForRect({
  renderCanvas,
  elementsSnapshot,
  addNewHistory,
  replaceCurrentHistory,
}: {
  renderCanvas: (arg: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
  }) => React.ReactElement
  elementsSnapshot: TSnapshot
  addNewHistory: (arg: TSnapshot) => void
  replaceCurrentHistory: (arg: TSnapshot) => void
}) {
  const [action, setAction] = useState<'none' | 'drawing'>('none')

  function handlePointerDown(e: React.PointerEvent) {
    if (action === 'none') {
      const { clientX, clientY } = e
      const nextIndex = elementsSnapshot.length
      const newElement = createRectangleElement({
        id: nextIndex,
        x1: clientX,
        y1: clientY,
        width: 0,
        height: 0,
      })
      const newElementsSnapshot = [...elementsSnapshot, newElement]
      addNewHistory(newElementsSnapshot)
      setAction('drawing')
      return
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (action === 'drawing') {
      const { clientX, clientY } = e
      // replace last element
      const lastIndex = elementsSnapshot.length - 1
      const lastElement = elementsSnapshot[lastIndex]
      if (lastElement.type !== 'rectangle') {
        throw new Error('The last element in the current snapshot is not a "rectangle" type')
      }
      const { x1: currentX1, y1: currentY1 } = lastElement
      const newElement = createRectangleElement({
        id: lastIndex,
        x1: currentX1,
        y1: currentY1,
        width: clientX - currentX1,
        height: clientY - currentY1,
      })
      const newElementsSnapshot = [...elementsSnapshot]
      newElementsSnapshot[lastIndex] = newElement

      replaceCurrentHistory(newElementsSnapshot)
      return
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (action === 'drawing') {
      // adjust coord when finish drawing
      const lastIndex = elementsSnapshot.length - 1
      const lastElement = elementsSnapshot[lastIndex]
      if (lastElement.type !== 'rectangle') {
        throw new Error('The last element in the current snapshot is not a "rectangle" type')
      }
      const { newX1, newX2, newY1, newY2 } = adjustRectangleCoordinates(lastElement)
      const newElement = createRectangleElement({
        id: lastIndex,
        x1: newX1,
        y1: newY1,
        width: newX2 - newX1,
        height: newY2 - newY1,
      })
      const newElementsSnapshot = [...elementsSnapshot]
      newElementsSnapshot[lastIndex] = newElement

      replaceCurrentHistory(newElementsSnapshot)

      // clear action
      setAction('none')
      return
    }
  }

  return renderCanvas({
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
  })
}
