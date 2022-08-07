import * as React from 'react'
import { useState } from 'react'
import { flushSync } from 'react-dom'
import rough from 'roughjs/bundled/rough.esm'
import { TCommitNewSnapshotParam, TElementData, TReplaceCurrentSnapshotParam } from './App'
import { CONFIG } from './config'

const generator = rough.generator({ options: { seed: CONFIG.SEED } })

function createLineElementWithoutId({
  x1,
  y1,
  x2,
  y2,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
}): Omit<Extract<TElementData, { type: 'line' | 'rectangle' | 'arrow' }>, 'id'> {
  const roughElement = generator.line(x1, y1, x2, y2)
  return { x1: x1, y1: y1, x2: x2, y2: y2, type: 'line', roughElements: [roughElement] }
}

// https://stackoverflow.com/a/26806316
function createArrowElementWithoutId({
  x1,
  y1,
  x2,
  y2,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
}): Omit<Extract<TElementData, { type: 'line' | 'rectangle' | 'arrow' }>, 'id'> {
  const PI = Math.PI
  const degreesInRadians225 = (225 * PI) / 180
  const degreesInRadians135 = (135 * PI) / 180
  const headLength = 15

  // calc the angle of the line
  const dx = x2 - x1
  const dy = y2 - y1
  const angle = Math.atan2(dy, dx)

  // calc arrowhead points
  const x225 = x2 + headLength * Math.cos(angle + degreesInRadians225)
  const y225 = y2 + headLength * Math.sin(angle + degreesInRadians225)
  const x135 = x2 + headLength * Math.cos(angle + degreesInRadians135)
  const y135 = y2 + headLength * Math.sin(angle + degreesInRadians135)

  // draw line
  const lineElement = generator.line(x1, y1, x2, y2)
  // draw partial arrowhead at 225 degrees
  const arrow1 = generator.line(x2, y2, x225, y225)
  // draw partial arrowhead at 135 degrees
  const arrow2 = generator.line(x2, y2, x135, y135)

  return {
    x1: x1,
    y1: y1,
    x2: x2,
    y2: y2,
    type: 'arrow',
    roughElements: [lineElement, arrow1, arrow2],
  }
}

export function createLinearElementWithoutId({
  lineType,
  x1,
  y1,
  x2,
  y2,
}: {
  lineType: 'line' | 'arrow'
  x1: number
  y1: number
  x2: number
  y2: number
}): Omit<Extract<TElementData, { type: 'line' | 'rectangle' | 'arrow' }>, 'id'> {
  switch (lineType) {
    case 'line':
      return createLineElementWithoutId({ x1, y1, x2, y2 })
    case 'arrow':
      return createArrowElementWithoutId({ x1, y1, x2, y2 })
    default:
      throw new Error('Cannot create a linear element because of unsupported line type')
  }
}

/**
 * * -----------------------------------------
 * *               Component
 * * -----------------------------------------
 */
export function CanvasForLinear({
  renderCanvas,
  getElementInCurrentSnapshot,
  commitNewSnapshot,
  replaceCurrentSnapshotByReplacingElements,
  viewportCoordsToSceneCoords,
  lineType,
}: {
  renderCanvas: (arg: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
  }) => React.ReactElement
  getElementInCurrentSnapshot: (elementId: number) => TElementData | undefined
  commitNewSnapshot: (arg: TCommitNewSnapshotParam) => number | undefined
  replaceCurrentSnapshotByReplacingElements: (arg: TReplaceCurrentSnapshotParam) => void
  viewportCoordsToSceneCoords: (arg: { viewportX: number; viewportY: number }) => {
    sceneX: number
    sceneY: number
  }
  lineType: 'line' | 'arrow'
}) {
  const [uiState, setUiState] = useState<
    | { state: 'none' }
    | { state: 'initDraw'; data: { pointerDownAtX: number; pointerDownAtY: number } }
    | { state: 'drawing'; data: { elementId: number } }
  >({ state: 'none' })

  function handlePointerDown(e: React.PointerEvent) {
    if (!e.isPrimary) return

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
    if (!e.isPrimary) return

    // should come from onPointerDown()
    if (uiState.state === 'initDraw') {
      // wrap in flushSync because the following code need to be called at most once
      // https://github.com/pobch/react-diagram/issues/27
      flushSync(() => {
        const { sceneX, sceneY } = viewportCoordsToSceneCoords({
          viewportX: e.clientX,
          viewportY: e.clientY,
        })
        const newElementWithoutId = createLinearElementWithoutId({
          lineType,
          x1: uiState.data.pointerDownAtX,
          y1: uiState.data.pointerDownAtY,
          x2: sceneX,
          y2: sceneY,
        })

        const newId = commitNewSnapshot({ mode: 'addElement', newElementWithoutId })
        if (newId === undefined) {
          throw new Error(`ID of the drawing ${lineType} element is missing`)
        }
        setUiState({ state: 'drawing', data: { elementId: newId } })
        return
      })
    }
    // should come from previous onPointerMove()
    if (uiState.state === 'drawing') {
      const { sceneX, sceneY } = viewportCoordsToSceneCoords({
        viewportX: e.clientX,
        viewportY: e.clientY,
      })
      // replace the drawing element
      const drawingElement = getElementInCurrentSnapshot(uiState.data.elementId)
      if (!drawingElement || drawingElement.type !== lineType) {
        throw new Error(
          `The drawing element in the current snapshot is missing or not a "${lineType}" element`
        )
      }
      const { x1, y1 } = drawingElement
      const newElementWithoutId = createLinearElementWithoutId({
        lineType,
        x1,
        y1,
        x2: sceneX,
        y2: sceneY,
      })

      replaceCurrentSnapshotByReplacingElements({
        replacedElement: { ...newElementWithoutId, id: uiState.data.elementId },
      })
      return
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!e.isPrimary) return

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
