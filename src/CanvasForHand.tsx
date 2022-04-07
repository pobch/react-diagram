import * as React from 'react'
import { useState } from 'react'

export function CanvasForHand({
  renderCanvas,
  viewportCoordsToSceneCoords,
  setOriginOffset,
}: {
  renderCanvas: (arg: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    styleCursor: 'grab' | 'grabbing'
  }) => React.ReactElement
  viewportCoordsToSceneCoords: (arg: { viewportX: number; viewportY: number }) => {
    sceneX: number
    sceneY: number
  }
  setOriginOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
}) {
  const [actionState, setActionState] = useState<
    { action: 'none' } | { action: 'panning'; startX: number; startY: number }
  >({ action: 'none' })
  const [cursorType, setCursorType] = useState<'grab' | 'grabbing'>('grab')

  function handlePointerDown(e: React.PointerEvent) {
    if (actionState.action === 'none') {
      const { sceneX, sceneY } = viewportCoordsToSceneCoords({
        viewportX: e.clientX,
        viewportY: e.clientY,
      })
      setActionState({ action: 'panning', startX: sceneX, startY: sceneY })
      setCursorType('grabbing')
      return
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (actionState.action === 'panning') {
      const { sceneX, sceneY } = viewportCoordsToSceneCoords({
        viewportX: e.clientX,
        viewportY: e.clientY,
      })
      setOriginOffset(({ x: prevX, y: prevY }) => ({
        x: prevX + (sceneX - actionState.startX),
        y: prevY + (sceneY - actionState.startY),
      }))
      return
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (actionState.action === 'panning') {
      setActionState({ action: 'none' })
      setCursorType('grab')
      return
    }
  }

  return renderCanvas({
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    styleCursor: cursorType,
  })
}
