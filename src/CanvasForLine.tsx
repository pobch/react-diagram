import * as React from 'react'
import { useState } from 'react'
import rough from 'roughjs/bundled/rough.esm'
import { TElementData, TSnapshot } from './App'

const generator = rough.generator()

export function createLineElement({
  id,
  x1,
  y1,
  x2,
  y2,
}: {
  id: number
  x1: number
  y1: number
  x2: number
  y2: number
}): Extract<TElementData, { type: 'line' | 'rectangle' }> {
  const roughElement = generator.line(x1, y1, x2, y2)
  return { id: id, x1: x1, y1: y1, x2: x2, y2: y2, type: 'line', roughElement }
}

/**
 * * -----------------------------------------
 * *               Component
 * * -----------------------------------------
 */
export function CanvasForLine({
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
  }) => React.ReactElement
  elementsSnapshot: TSnapshot
  addNewHistory: (arg: TSnapshot) => void
  replaceCurrentHistory: (arg: TSnapshot) => void
  viewportCoordsToSceneCoords: (arg: { viewportX: number; viewportY: number }) => {
    sceneX: number
    sceneY: number
  }
}) {
  const [action, setAction] = useState<'none' | 'drawing'>('none')

  function handlePointerDown(e: React.PointerEvent) {
    if (action === 'none') {
      const { sceneX, sceneY } = viewportCoordsToSceneCoords({
        viewportX: e.clientX,
        viewportY: e.clientY,
      })
      const nextIndex = elementsSnapshot.length
      const newElement = createLineElement({
        id: nextIndex,
        x1: sceneX,
        y1: sceneY,
        x2: sceneX,
        y2: sceneY,
      })
      const newElementsSnapshot = [...elementsSnapshot, newElement]
      addNewHistory(newElementsSnapshot)
      setAction('drawing')
      return
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (action === 'drawing') {
      const { sceneX, sceneY } = viewportCoordsToSceneCoords({
        viewportX: e.clientX,
        viewportY: e.clientY,
      })
      // replace last element
      const lastIndex = elementsSnapshot.length - 1
      const lastElement = elementsSnapshot[lastIndex]
      if (!lastElement || lastElement.type !== 'line') {
        throw new Error('The last element in the current snapshot is not a "line" element')
      }
      const { x1: currentX1, y1: currentY1 } = lastElement
      const newElement = createLineElement({
        id: lastIndex,
        x1: currentX1,
        y1: currentY1,
        x2: sceneX,
        y2: sceneY,
      })
      const newElementsSnapshot = [...elementsSnapshot]
      newElementsSnapshot[lastIndex] = newElement

      replaceCurrentHistory(newElementsSnapshot)
      return
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (action === 'drawing') {
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
