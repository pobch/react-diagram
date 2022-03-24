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
}: Pick<TElementData, 'id' | 'x1' | 'y1'> & { width: number; height: number }): TElementData {
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
export function adjustRectangleCoordinates(element: TElementData) {
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
export const CanvasForRect = React.forwardRef(function CanvasForRect(
  {
    elementsSnapshot,
    addNewHistory,
    replaceCurrentHistory,
  }: {
    elementsSnapshot: TSnapshot
    addNewHistory: (arg: TSnapshot) => void
    replaceCurrentHistory: (arg: TSnapshot) => void
  },
  canvasRef: React.Ref<HTMLCanvasElement>
) {
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
      const { x1: currentX1, y1: currentY1 } = elementsSnapshot[lastIndex]
      const newElementsSnapshot = [...elementsSnapshot]
      const newElement = createRectangleElement({
        id: lastIndex,
        x1: currentX1,
        y1: currentY1,
        width: clientX - currentX1,
        height: clientY - currentY1,
      })
      newElementsSnapshot[lastIndex] = newElement
      replaceCurrentHistory(newElementsSnapshot)
      return
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (action === 'drawing') {
      // adjust coord when finish drawing
      const lastIndex = elementsSnapshot.length - 1
      const { newX1, newX2, newY1, newY2 } = adjustRectangleCoordinates(elementsSnapshot[lastIndex])
      const newElementsSnapshot = [...elementsSnapshot]
      const newElement = createRectangleElement({
        id: lastIndex,
        x1: newX1,
        y1: newY1,
        width: newX2 - newX1,
        height: newY2 - newY1,
      })
      newElementsSnapshot[lastIndex] = newElement
      replaceCurrentHistory(newElementsSnapshot)
      // clear action
      setAction('none')
      return
    }
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
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      My Canvas
    </canvas>
  )
})
