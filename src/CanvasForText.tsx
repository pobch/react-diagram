import { useRef, useState } from 'react'
import { TElementData, TSnapshot } from './App'

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
  const [actionState, setActionState] = useState<
    | { action: 'none' }
    | {
        action: 'creating'
        data: { x1: number; y1: number; textareaWidth: number; textareaHeight: number }
      }
  >({
    action: 'none',
  })

  function handlePointerDown(e: React.PointerEvent) {}

  function handlePointerMove(e: React.PointerEvent) {}

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handlePointerUp(e: React.PointerEvent) {
    // no textarea being displayed
    if (actionState.action === 'none') {
      const { clientX, clientY } = e
      // open a textarea
      setActionState({
        action: 'creating',
        data: { x1: clientX, y1: clientY, textareaWidth: 0, textareaHeight: 0 },
      })
      return
    }
    // the textarea is currently being displayed
    else if (actionState.action === 'creating') {
      const content = (textareaRef.current?.value ?? '').trim()

      if (!content) {
        // don't create any new element and history
        // just close the textarea
        setActionState({ action: 'none' })
        return
      }

      const nextIndex = elementsSnapshot.length
      const newElement: TElementData = {
        type: 'text',
        id: nextIndex,
        x1: actionState.data.x1,
        y1: actionState.data.y1,
        content,
      }
      const newElementsSnapshot = [...elementsSnapshot, newElement]
      addNewHistory(newElementsSnapshot)
      setActionState({ action: 'none' })
      return
    }
  }

  return (
    <>
      {actionState.action === 'creating' ? (
        <textarea
          style={{
            display: 'block',
            position: 'fixed',
            top: actionState.data.y1,
            left: actionState.data.x1,
            height: actionState.data.textareaHeight,
            minHeight: '2rem',
            width: actionState.data.textareaWidth,
            minWidth: '2rem',
            fontFamily: 'Nanum Pen Script',
            fontSize: '1.5rem',
            // TODO: fix this magic number
            lineHeight: 0.8,
            whiteSpace: 'pre',
            background: 'transparent',
            outline: 'none',
            border: 'none',
            overflow: 'hidden',
            resize: 'none',
          }}
          autoFocus
          ref={textareaRef}
          onChange={(e) => {
            setActionState((prev) => {
              if (prev.action === 'creating') {
                return {
                  ...prev,
                  data: {
                    ...prev.data,
                    textareaWidth: e.target.scrollWidth,
                    textareaHeight: e.target.scrollHeight,
                  },
                }
              }
              return prev
            })
          }}
        />
      ) : null}
      {renderCanvas({
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
      })}
    </>
  )
}
