import { useRef, useState } from 'react'
import { TElementData, TSnapshot } from './App'

export function getTextElementAtPosition({
  elementsSnapshot,
  xPosition,
  yPosition,
}: {
  elementsSnapshot: TElementData[]
  xPosition: number
  yPosition: number
}) {
  const firstFoundElement = elementsSnapshot.find((element) => {
    if (element.type === 'text') {
      let isInside = false
      for (let line of element.lines) {
        if (
          line.lineX1 <= xPosition &&
          xPosition <= line.lineX1 + line.lineWidth &&
          line.lineY1 <= yPosition &&
          yPosition <= line.lineY1 + line.lineHeight
        ) {
          isInside = true
          break
        }
      }
      return isInside
    }
    return false
  })
  return firstFoundElement
}

export function createTextElement({
  id,
  canvasForMeasure,
  content,
  x1,
  y1,
  isWriting,
}: {
  id: number
  canvasForMeasure: HTMLCanvasElement | null
  content: string
  x1: number
  y1: number
  isWriting: boolean
}): Extract<TElementData, { type: 'text' }> {
  // handle multi-line text https://stackoverflow.com/a/21574562
  if (!canvasForMeasure) {
    throw new Error('Temporary canvas for measure text width/height is not found')
  }
  const context = canvasForMeasure.getContext('2d')
  if (!context) {
    throw new Error('Temporary canvas for measure text width/height is not found')
  }
  context.font = '1.5rem "Nanum Pen Script"'
  const lineHeight = context.measureText('M').width * 1.2
  const contentLines = content.split('\n')
  let lines = []
  let currentY = y1
  for (let i = 0; i < contentLines.length; i++) {
    lines.push({
      lineX1: x1,
      lineY1: currentY,
      lineWidth: context.measureText(contentLines[i]).width,
      lineHeight: lineHeight,
      lineContent: contentLines[i],
    })
    currentY = currentY + lineHeight
  }
  return {
    type: 'text',
    id,
    isWriting,
    lines,
  }
}

export function CanvasForText({
  renderCanvas,
  elementsSnapshot,
  addNewHistory,
  replaceCurrentHistory,
  undoHistory,
}: {
  renderCanvas: (arg: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    styleCursor?: 'default' | 'text'
  }) => React.ReactElement
  elementsSnapshot: TSnapshot
  addNewHistory: (arg: TSnapshot) => void
  replaceCurrentHistory: (arg: TSnapshot) => void
  undoHistory: () => void
}) {
  const [actionState, setActionState] = useState<
    | { action: 'none' }
    | {
        action: 'creating'
        data: {
          textareaX1: number
          textareaY1: number
          textareaWidth: number
          textareaHeight: number
        }
      }
    | {
        action: 'updating'
        data: {
          id: number
          textareaX1: number
          textareaY1: number
          textareaWidth: number
          textareaHeight: number
          content: string
        }
      }
  >({
    action: 'none',
  })
  const [cursorType, setCursorType] = useState<'default' | 'text'>('default')

  function handlePointerMove(e: React.PointerEvent) {
    const firstFoundElement = getTextElementAtPosition({
      elementsSnapshot,
      xPosition: e.clientX,
      yPosition: e.clientY,
    })
    if (firstFoundElement) {
      setCursorType('text')
      return
    } else {
      setCursorType('default')
      return
    }
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canvasForMeasureRef = useRef<HTMLCanvasElement>(null)

  function handlePointerUp(e: React.PointerEvent) {
    // no textarea being displayed, will go to either creating or updating mode
    if (actionState.action === 'none') {
      const { clientX, clientY } = e

      const firstFoundElement = getTextElementAtPosition({
        elementsSnapshot,
        xPosition: clientX,
        yPosition: clientY,
      })
      // found an existing text element, go to updating mode
      if (firstFoundElement && firstFoundElement.type === 'text') {
        setActionState({
          action: 'updating',
          data: {
            id: firstFoundElement.id,
            textareaX1: firstFoundElement.lines[0].lineX1,
            textareaY1: firstFoundElement.lines[0].lineY1,
            textareaWidth: firstFoundElement.lines.reduce((prev, curr) => {
              // TODO: remove magic number '8'
              return Math.max(curr.lineWidth + 8, prev)
            }, 0),
            textareaHeight: firstFoundElement.lines.reduce((prev, curr) => {
              return prev + curr.lineHeight
              // TODO: remove magic number '16'
            }, 16),
            content: firstFoundElement.lines.map(({ lineContent }) => lineContent).join('\n'),
          },
        })
        const newElement: TElementData = {
          type: 'text',
          id: firstFoundElement.id,
          isWriting: true,
          lines: firstFoundElement.lines,
        }
        const newElementsSnapshot = [...elementsSnapshot]
        newElementsSnapshot[firstFoundElement.id] = newElement
        addNewHistory(newElementsSnapshot)
        return
      }
      // not found any existing element, go to creating mode
      else if (!firstFoundElement) {
        setActionState({
          action: 'creating',
          data: { textareaX1: clientX, textareaY1: clientY, textareaWidth: 0, textareaHeight: 0 },
        })
        const nextIndex = elementsSnapshot.length
        const newElement: TElementData = {
          type: 'text',
          id: nextIndex,
          isWriting: true,
          lines: [],
        }
        const newElementsSnapshot = [...elementsSnapshot, newElement]
        addNewHistory(newElementsSnapshot)
        return
      }
    }
    // the textarea is currently being displayed in creating mode
    else if (actionState.action === 'creating') {
      const content = (textareaRef.current?.value ?? '').trim()

      if (!content) {
        // remove latest history and close textarea
        // TODO: implement removeLastHistory instead of undo hack
        undoHistory()
        setActionState({ action: 'none' })
        return
      }

      const lastIndex = elementsSnapshot.length - 1
      const newElement: TElementData = createTextElement({
        id: lastIndex,
        canvasForMeasure: canvasForMeasureRef.current,
        content,
        x1: actionState.data.textareaX1,
        y1: actionState.data.textareaY1,
        isWriting: false,
      })
      const newElementsSnapshot = [...elementsSnapshot]
      newElementsSnapshot[lastIndex] = newElement
      // update current history and close textarea
      replaceCurrentHistory(newElementsSnapshot)
      setActionState({ action: 'none' })
      return
    }
    // the textarea is currently being displayed in updating mode
    else if (actionState.action === 'updating') {
      const newContent = (textareaRef.current?.value ?? '').trim()

      if (newContent === actionState.data.content) {
        // remove latest history and close textarea
        // TODO: fix this undo hack
        undoHistory()
        setActionState({ action: 'none' })
        return
      }
      if (!newContent) {
        // remove text element from current history and close textarea
        const newElementsSnapshot = elementsSnapshot.map((element) => {
          if (element.id === actionState.data.id) {
            return { type: 'removed', id: element.id } as const
          } else {
            return element
          }
        })
        replaceCurrentHistory(newElementsSnapshot)
        setActionState({ action: 'none' })
        return
      }

      const updatingIndex = actionState.data.id
      const newElement: TElementData = createTextElement({
        id: updatingIndex,
        canvasForMeasure: canvasForMeasureRef.current,
        content: newContent,
        x1: actionState.data.textareaX1,
        y1: actionState.data.textareaY1,
        isWriting: false,
      })
      const newElementsSnapshot = [...elementsSnapshot]
      newElementsSnapshot[updatingIndex] = newElement
      replaceCurrentHistory(newElementsSnapshot)
      setActionState({ action: 'none' })
      return
    }
  }

  return (
    <>
      {/* TODO: find better approach for measure text dimension */}
      <canvas
        ref={canvasForMeasureRef}
        width={1}
        height={1}
        style={{ position: 'absolute', top: -20, opacity: 0 }}
      >
        For measure text
      </canvas>

      {actionState.action === 'creating' ? (
        <textarea
          style={{
            display: 'block',
            position: 'fixed',
            top: actionState.data.textareaY1,
            left: actionState.data.textareaX1,
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
      {actionState.action === 'updating' ? (
        <textarea
          style={{
            display: 'block',
            position: 'fixed',
            top: actionState.data.textareaY1,
            left: actionState.data.textareaX1,
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
              if (prev.action === 'updating') {
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
          defaultValue={actionState.data.content}
        />
      ) : null}
      {renderCanvas({
        onPointerDown: () => {},
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        styleCursor: cursorType,
      })}
    </>
  )
}
