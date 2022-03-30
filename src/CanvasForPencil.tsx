import { useState } from 'react'
import { TElementData, TSnapshot } from './App'

function createPencilElement({
  id,
  newX,
  newY,
}: {
  id: number
  newX: number
  newY: number
}): Extract<TElementData, { type: 'pencil' }> {
  return {
    id,
    type: 'pencil',
    points: [{ x: newX, y: newY }],
  }
}

function updatePencilElement({
  id,
  newX,
  newY,
  currentPoints,
}: {
  id: number
  newX: number
  newY: number
  currentPoints: { x: number; y: number }[]
}): Extract<TElementData, { type: 'pencil' }> {
  return {
    id,
    type: 'pencil',
    points: [...currentPoints, { x: newX, y: newY }],
  }
}

export function CanvasForPencil({
  renderCanvas,
  elementsSnapshot,
  addNewHistory,
  replaceCurrentHistory,
}: {
  renderCanvas: (arg: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    styleCursor?: 'default' | 'move' | 'nesw-resize' | 'nwse-resize'
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
      const newElement = createPencilElement({ id: nextIndex, newX: clientX, newY: clientY })
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
      if (lastElement.type !== 'pencil') {
        throw new Error('The last element in the snapshot is not a "pencil" type')
      }
      const newElement = updatePencilElement({
        id: lastIndex,
        newX: clientX,
        newY: clientY,
        currentPoints: lastElement.points,
      })
      const newElementsSnapshot = [...elementsSnapshot]
      newElementsSnapshot[lastIndex] = newElement

      replaceCurrentHistory(newElementsSnapshot)
      return
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (action === 'drawing') {
      setAction('none')
    }
  }

  return renderCanvas({
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
  })
}
