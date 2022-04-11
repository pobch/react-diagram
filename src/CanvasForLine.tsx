import * as React from 'react'
import { useState } from 'react'
import rough from 'roughjs/bundled/rough.esm'
import {
  TCommitNewSnapshotParam,
  TElementData,
  TReplaceCurrentSnapshotParam,
  TSnapshot,
} from './App'

const generator = rough.generator()

export function createLineElementWithoutId({
  x1,
  y1,
  x2,
  y2,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
}): Omit<Extract<TElementData, { type: 'line' | 'rectangle' }>, 'id'> {
  const roughElement = generator.line(x1, y1, x2, y2)
  return { x1: x1, y1: y1, x2: x2, y2: y2, type: 'line', roughElement }
}

/**
 * * -----------------------------------------
 * *               Component
 * * -----------------------------------------
 */
export function CanvasForLine({
  renderCanvas,
  elementsSnapshot,
  commitNewSnapshot,
  replaceCurrentSnapshot,
  viewportCoordsToSceneCoords,
}: {
  renderCanvas: (arg: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
  }) => React.ReactElement
  elementsSnapshot: TSnapshot
  commitNewSnapshot: (arg: TCommitNewSnapshotParam) => void
  replaceCurrentSnapshot: (arg: TReplaceCurrentSnapshotParam) => number | void
  viewportCoordsToSceneCoords: (arg: { viewportX: number; viewportY: number }) => {
    sceneX: number
    sceneY: number
  }
}) {
  const [uiState, setUiState] = useState<
    | { state: 'none' }
    | { state: 'initDraw'; data: { pointerDownAtX: number; pointerDownAtY: number } }
    | { state: 'drawing'; data: { elementId: number } }
  >({ state: 'none' })

  function handlePointerDown(e: React.PointerEvent) {
    // should come from onPointerUp() or initial state when mount
    if (uiState.state === 'none') {
      const { sceneX, sceneY } = viewportCoordsToSceneCoords({
        viewportX: e.clientX,
        viewportY: e.clientY,
      })
      setUiState({
        state: 'initDraw',
        data: { pointerDownAtX: sceneX, pointerDownAtY: sceneY },
      })
      return
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    // should come from onPointerDown()
    if (uiState.state === 'initDraw') {
      const { sceneX, sceneY } = viewportCoordsToSceneCoords({
        viewportX: e.clientX,
        viewportY: e.clientY,
      })
      const newElementWithoutId = createLineElementWithoutId({
        x1: uiState.data.pointerDownAtX,
        y1: uiState.data.pointerDownAtY,
        x2: sceneX,
        y2: sceneY,
      })
      const newId = commitNewSnapshot({ mode: 'addElement', newElementWithoutId })
      if (newId === undefined) {
        throw new Error('ID of the drawing line element is missing')
      }
      setUiState({ state: 'drawing', data: { elementId: newId } })
      return
    }
    // should come from previous onPointerMove()
    if (uiState.state === 'drawing') {
      const { sceneX, sceneY } = viewportCoordsToSceneCoords({
        viewportX: e.clientX,
        viewportY: e.clientY,
      })
      // replace the drawing element
      const drawingElement = elementsSnapshot[uiState.data.elementId]
      if (!drawingElement || drawingElement.type !== 'line') {
        throw new Error(
          'The drawing element in the current snapshot is missing or not a "line" element'
        )
      }
      const { x1, y1 } = drawingElement
      const newElementWithoutId = createLineElementWithoutId({
        x1,
        y1,
        x2: sceneX,
        y2: sceneY,
      })
      replaceCurrentSnapshot({
        replacedElement: { ...newElementWithoutId, id: uiState.data.elementId },
      })
      return
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    // should come from onPointerDown()
    if (uiState.state === 'initDraw') {
      // no drawing occurs, do nothing with history
      setUiState({ state: 'none' })
      return
    }
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
