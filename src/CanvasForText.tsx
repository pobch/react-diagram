import { useRef, useState } from 'react'
import {
  TCommitNewSnapshotParam,
  TElementData,
  TReplaceCurrentSnapshotParam,
  TSnapshot,
} from './App'

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

export function createTextElementWithoutId({
  canvasForMeasure,
  content,
  x1,
  y1,
  isWriting,
}: {
  canvasForMeasure: HTMLCanvasElement | null
  content: string
  x1: number
  y1: number
  isWriting: boolean
}): Omit<Extract<TElementData, { type: 'text' }>, 'id'> {
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
      lineWidth: context.measureText(contentLines[i] ?? '').width,
      lineHeight: lineHeight,
      lineContent: contentLines[i] ?? '',
    })
    currentY = currentY + lineHeight
  }
  return {
    type: 'text',
    isWriting,
    lines,
  }
}

export function CanvasForText({
  renderCanvas,
  elementsSnapshot,
  commitNewSnapshot,
  replaceCurrentSnapshot,
  viewportCoordsToSceneCoords,
  sceneCoordsToViewportCoords,
}: {
  renderCanvas: (arg: {
    onPointerMove: (e: React.PointerEvent) => void
    onClick: (e: React.MouseEvent) => void
    styleCursor: 'default' | 'text'
  }) => React.ReactElement
  elementsSnapshot: TSnapshot
  commitNewSnapshot: (arg: TCommitNewSnapshotParam) => void
  replaceCurrentSnapshot: (arg: TReplaceCurrentSnapshotParam) => number | void
  viewportCoordsToSceneCoords: (arg: { viewportX: number; viewportY: number }) => {
    sceneX: number
    sceneY: number
  }
  sceneCoordsToViewportCoords: (arg: { sceneX: number; sceneY: number }) => {
    viewportX: number
    viewportY: number
  }
}) {
  const [uiState, setUiState] = useState<
    | { state: 'none' }
    | {
        state: 'creating'
        data: {
          textareaX1: number
          textareaY1: number
          textareaWidth: number
          textareaHeight: number
        }
      }
    | {
        state: 'updating'
        data: {
          elementId: number
          textareaX1: number
          textareaY1: number
          textareaWidth: number
          textareaHeight: number
          content: string
        }
      }
  >({
    state: 'none',
  })
  const [cursorType, setCursorType] = useState<'default' | 'text'>('default')

  function handlePointerMove(e: React.PointerEvent) {
    if (uiState.state === 'creating' || uiState.state === 'updating') {
      setCursorType('default')
      return
    }

    const { sceneX, sceneY } = viewportCoordsToSceneCoords({
      viewportX: e.clientX,
      viewportY: e.clientY,
    })
    const firstFoundTextElement = getTextElementAtPosition({
      elementsSnapshot,
      xPosition: sceneX,
      yPosition: sceneY,
    })
    if (firstFoundTextElement) {
      setCursorType('text')
      return
    } else {
      setCursorType('default')
      return
    }
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canvasForMeasureRef = useRef<HTMLCanvasElement>(null)

  function handleClick(e: React.MouseEvent) {
    // no textarea being displayed, will go to either creating or updating mode
    // this click is for start writing
    if (uiState.state === 'none') {
      const { sceneX, sceneY } = viewportCoordsToSceneCoords({
        viewportX: e.clientX,
        viewportY: e.clientY,
      })

      const firstFoundTextElement = getTextElementAtPosition({
        elementsSnapshot,
        xPosition: sceneX,
        yPosition: sceneY,
      })
      // found an existing text element, go to updating mode
      if (firstFoundTextElement && firstFoundTextElement.type === 'text') {
        setUiState({
          state: 'updating',
          data: {
            elementId: firstFoundTextElement.id,
            textareaX1: firstFoundTextElement.lines[0]?.lineX1 ?? sceneX,
            textareaY1: firstFoundTextElement.lines[0]?.lineY1 ?? sceneY,
            textareaWidth: firstFoundTextElement.lines.reduce((prev, curr) => {
              // TODO: remove magic number '8'
              return Math.max(curr.lineWidth + 8, prev)
            }, 0),
            textareaHeight: firstFoundTextElement.lines.reduce((prev, curr) => {
              return prev + curr.lineHeight
              // TODO: remove magic number '16'
            }, 16),
            content: firstFoundTextElement.lines.map(({ lineContent }) => lineContent).join('\n'),
          },
        })
        commitNewSnapshot({
          mode: 'modifyElement',
          modifiedElement: { ...firstFoundTextElement, isWriting: true },
        })
        return
      }
      // not found any existing element, go to creating mode
      else if (!firstFoundTextElement) {
        setUiState({
          state: 'creating',
          data: { textareaX1: sceneX, textareaY1: sceneY, textareaWidth: 0, textareaHeight: 0 },
        })
        return
      }
    }
    // the textarea is currently being displayed in creating mode
    // this click is for finishing writing
    else if (uiState.state === 'creating') {
      const content = (textareaRef.current?.value ?? '').trim()

      if (!content) {
        // no text is actually created, do nothing with history and close the textarea
        setUiState({ state: 'none' })
        return
      }

      const newElementWithoutId = createTextElementWithoutId({
        canvasForMeasure: canvasForMeasureRef.current,
        content,
        x1: uiState.data.textareaX1,
        y1: uiState.data.textareaY1,
        isWriting: false,
      })
      commitNewSnapshot({ mode: 'addElement', newElementWithoutId })
      setUiState({ state: 'none' })
      return
    }
    // the textarea is currently being displayed in updating mode
    // this click is for finishing writing
    else if (uiState.state === 'updating') {
      const newContent = (textareaRef.current?.value ?? '').trim()

      if (!newContent) {
        replaceCurrentSnapshot({ replacedElement: { id: uiState.data.elementId, type: 'removed' } })
        setUiState({ state: 'none' })
        return
      }

      const newElementWithoutId = createTextElementWithoutId({
        canvasForMeasure: canvasForMeasureRef.current,
        content: newContent,
        x1: uiState.data.textareaX1,
        y1: uiState.data.textareaY1,
        isWriting: false,
      })
      replaceCurrentSnapshot({
        replacedElement: { ...newElementWithoutId, id: uiState.data.elementId },
      })
      setUiState({ state: 'none' })
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

      {uiState.state === 'creating' ? (
        <textarea
          style={{
            display: 'block',
            position: 'fixed',
            top: sceneCoordsToViewportCoords({
              sceneX: uiState.data.textareaX1,
              sceneY: uiState.data.textareaY1,
            }).viewportY,
            left: sceneCoordsToViewportCoords({
              sceneX: uiState.data.textareaX1,
              sceneY: uiState.data.textareaY1,
            }).viewportX,
            // TODO: convert sceneHeight -> viewportHeight
            height: uiState.data.textareaHeight,
            minHeight: '2rem',
            // TODO: convert sceneWidth -> viewportWidth
            width: uiState.data.textareaWidth,
            minWidth: '2rem',
            fontFamily: 'Nanum Pen Script',
            // TODO: scale fontSize based on zoomLevel
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
            setUiState((prev) => {
              if (prev.state === 'creating') {
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

      {uiState.state === 'updating' ? (
        <textarea
          style={{
            display: 'block',
            position: 'fixed',
            top: sceneCoordsToViewportCoords({
              sceneX: uiState.data.textareaX1,
              sceneY: uiState.data.textareaY1,
            }).viewportY,
            left: sceneCoordsToViewportCoords({
              sceneX: uiState.data.textareaX1,
              sceneY: uiState.data.textareaY1,
            }).viewportX,
            // TODO: convert sceneHeight -> viewportHeight
            height: uiState.data.textareaHeight,
            minHeight: '2rem',
            // TODO: convert sceneWidth -> viewportWidth
            width: uiState.data.textareaWidth,
            minWidth: '2rem',
            fontFamily: 'Nanum Pen Script',
            // TODO: scale fontSize based on zoomLevel
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
            setUiState((prev) => {
              if (prev.state === 'updating') {
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
          defaultValue={uiState.data.content}
          onBlur={() => {
            // keep state untouched, just make sure `isWriting` is always `true` after blur
            if (uiState.state === 'updating') {
              const editingElement = elementsSnapshot[uiState.data.elementId]
              if (!editingElement || editingElement.type !== 'text') {
                throw new Error(
                  'The editing element is missing in the current history or not a "text" element'
                )
              }
              replaceCurrentSnapshot({ replacedElement: { ...editingElement, isWriting: false } })
              return
            }
          }}
        />
      ) : null}

      {renderCanvas({
        onPointerMove: handlePointerMove,
        onClick: handleClick,
        styleCursor: cursorType,
      })}
    </>
  )
}
