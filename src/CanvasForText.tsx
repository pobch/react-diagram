import { useState } from 'react'
import { TSnapshot } from './App'

export function CanvasForText({
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
  const [action, setAction] = useState<'none' | 'writing'>('none')

  return null
}
