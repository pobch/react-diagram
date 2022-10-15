import { useState } from 'react'
import { TCommitNewSnapshotFn, TElementData, TReplaceCurrentSnapshotParam } from './App'

function createPencilElementWithoutId({
  newX,
  newY,
}: {
  newX: number
  newY: number
}): Omit<Extract<TElementData, { type: 'pencil' }>, 'id'> {
  return {
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
  getElementInCurrentSnapshot,
  commitNewSnapshot,
  replaceCurrentSnapshotByReplacingElements,
  viewportCoordsToSceneCoords,
}: {
  renderCanvas: (arg: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
  }) => React.ReactElement
  getElementInCurrentSnapshot: (elementId: number) => TElementData | undefined
  commitNewSnapshot: TCommitNewSnapshotFn
  replaceCurrentSnapshotByReplacingElements: (arg: TReplaceCurrentSnapshotParam) => void
  viewportCoordsToSceneCoords: (arg: { viewportX: number; viewportY: number }) => {
    sceneX: number
    sceneY: number
  }
}) {
  const [uiState, setUiState] = useState<
    { state: 'none' } | { state: 'drawing'; data: { elementId: number } }
  >({ state: 'none' })

  function handlePointerDown(e: React.PointerEvent) {
    if (!e.isPrimary) return

    // should come from onPointerUp() or initial state when mount
    if (uiState.state === 'none') {
      const { sceneX, sceneY } = viewportCoordsToSceneCoords({
        viewportX: e.clientX,
        viewportY: e.clientY,
      })
      const newElementWithoutId = createPencilElementWithoutId({
        newX: sceneX,
        newY: sceneY,
      })
      const newIds = commitNewSnapshot({
        mode: 'addElements',
        newElementWithoutIds: [newElementWithoutId],
      })
      if (newIds === undefined || newIds[0] == null) {
        throw new Error('ID of the drawing pencil element is missing')
      }
      setUiState({
        state: 'drawing',
        data: { elementId: newIds[0] },
      })
      return
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!e.isPrimary) return

    // should come from onPointerDown() or previous onPointerMove()
    if (uiState.state === 'drawing') {
      const { sceneX, sceneY } = viewportCoordsToSceneCoords({
        viewportX: e.clientX,
        viewportY: e.clientY,
      })
      // replace the drawing element
      const drawingElement = getElementInCurrentSnapshot(uiState.data.elementId)
      if (!drawingElement || drawingElement.type !== 'pencil') {
        throw new Error(
          'The drawing element in the current snapshot is missing or not a "pencil" element'
        )
      }
      const newElement = updatePencilElement({
        id: uiState.data.elementId,
        newX: sceneX,
        newY: sceneY,
        currentPoints: drawingElement.points,
      })
      replaceCurrentSnapshotByReplacingElements({ replacedElement: newElement })
      return
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!e.isPrimary) return

    // should come from onPointerMove()
    if (uiState.state === 'drawing') {
      setUiState({ state: 'none' })
      return
    }
  }

  return renderCanvas({
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
  })
}
