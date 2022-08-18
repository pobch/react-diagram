import { useRef, useState } from 'react'
import {
  TCommitNewSnapshotParam,
  TElementData,
  TReplaceCurrentSnapshotParam,
  TSnapshot,
} from './App'
import { CmdButton } from './CmdButton'

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
  currentSnapshot,
  getElementInCurrentSnapshot,
  commitNewSnapshot,
  replaceCurrentSnapshotByReplacingElements,
  replaceCurrentSnapshotByRemovingElement,
  viewportCoordsToSceneCoords,
  sceneCoordsToViewportCoords,
  zoomLevel,
}: {
  renderCanvas: (arg: {
    onPointerMove: (e: React.PointerEvent) => void
    onClick: (e: React.MouseEvent) => void
    styleCursor: 'default' | 'text'
  }) => React.ReactElement
  currentSnapshot: TSnapshot
  getElementInCurrentSnapshot: (elementId: number) => TElementData | undefined
  commitNewSnapshot: (arg: TCommitNewSnapshotParam) => number | undefined
  replaceCurrentSnapshotByReplacingElements: (arg: TReplaceCurrentSnapshotParam) => void
  replaceCurrentSnapshotByRemovingElement: (elementId: number) => void
  viewportCoordsToSceneCoords: (arg: { viewportX: number; viewportY: number }) => {
    sceneX: number
    sceneY: number
  }
  sceneCoordsToViewportCoords: (arg: { sceneX: number; sceneY: number }) => {
    viewportX: number
    viewportY: number
  }
  zoomLevel: number
}) {
  const [uiState, setUiState] = useState<
    | { state: 'none' }
    | {
        state: 'creating'
        data: {
          // scene x, y
          textareaX1: number
          textareaY1: number
          // viewport width/height
          textareaWidth: number
          textareaHeight: number
        }
      }
    | {
        state: 'updating'
        data: {
          elementId: number
          // scene x, y
          textareaX1: number
          textareaY1: number
          // viewport width/height
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
    if (!e.isPrimary) return

    if (uiState.state === 'creating' || uiState.state === 'updating') {
      setCursorType('default')
      return
    }

    const { sceneX, sceneY } = viewportCoordsToSceneCoords({
      viewportX: e.clientX,
      viewportY: e.clientY,
    })
    const firstFoundTextElement = getTextElementAtPosition({
      elementsSnapshot: currentSnapshot,
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
        elementsSnapshot: currentSnapshot,
        xPosition: sceneX,
        yPosition: sceneY,
      })

      // found an existing text element, go to updating mode
      if (firstFoundTextElement && firstFoundTextElement.type === 'text') {
        // TODO: remove magic number '8'
        const maxSceneLineWidth =
          8 +
          firstFoundTextElement.lines.reduce((prev, curr) => {
            return Math.max(prev, curr.lineWidth)
          }, 0)
        // TODO: remove magic number '16'
        const sceneContentHeight =
          16 +
          firstFoundTextElement.lines.reduce((prev, curr) => {
            return prev + curr.lineHeight
          }, 0)

        // initialize a floating textarea
        setUiState({
          state: 'updating',
          data: {
            elementId: firstFoundTextElement.id,
            textareaX1: firstFoundTextElement.lines[0]?.lineX1 ?? sceneX,
            textareaY1: firstFoundTextElement.lines[0]?.lineY1 ?? sceneY,
            // TODO: create a helper function to convert sceneWidth -> viewportWidth
            textareaWidth: zoomLevel * maxSceneLineWidth,
            // TODO: create a helper function to convert sceneHeight -> viewportHeight
            textareaHeight: zoomLevel * sceneContentHeight,
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
        // initialize a floating textarea
        setUiState({
          state: 'creating',
          data: { textareaX1: sceneX, textareaY1: sceneY, textareaWidth: 0, textareaHeight: 0 },
        })
        return
      }
    }
    // the floating textarea is currently being displayed in creating mode
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
    // the floating textarea is currently being displayed in updating mode
    // this click is for finishing writing
    else if (uiState.state === 'updating') {
      const newContent = (textareaRef.current?.value ?? '').trim()

      if (!newContent) {
        replaceCurrentSnapshotByRemovingElement(uiState.data.elementId)
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
      replaceCurrentSnapshotByReplacingElements({
        replacedElement: { ...newElementWithoutId, id: uiState.data.elementId },
      })
      setUiState({ state: 'none' })
      return
    }
  }

  return (
    <div style={{ position: 'relative', zIndex: 10 }}>
      {/* // TODO: find better approach for measure text dimension */}
      <canvas
        ref={canvasForMeasureRef}
        width={1}
        height={1}
        style={{ position: 'absolute', top: -20, opacity: 0 }}
      >
        For measure text
      </canvas>

      {(() => {
        // Styling for a floating textarea
        let styledFloatingWrapper: React.CSSProperties | undefined
        let styledTextArea: React.CSSProperties | undefined
        let styledButtonWrapper: React.CSSProperties | undefined
        if (uiState.state === 'creating' || uiState.state === 'updating') {
          styledFloatingWrapper = {
            position: 'absolute',
            top: sceneCoordsToViewportCoords({
              sceneX: uiState.data.textareaX1,
              sceneY: uiState.data.textareaY1,
            }).viewportY,
            left: sceneCoordsToViewportCoords({
              sceneX: uiState.data.textareaX1,
              sceneY: uiState.data.textareaY1,
            }).viewportX,
          }
          styledTextArea = {
            display: 'block',
            height: uiState.data.textareaHeight,
            minHeight: '2em',
            width: uiState.data.textareaWidth,
            minWidth: '2em',
            fontFamily: 'Nanum Pen Script',
            // scale fontSize based on zoomLevel
            fontSize: `${(1.5 * zoomLevel).toFixed(3)}rem`,
            // TODO: fix this magic number
            lineHeight: 0.8,
            whiteSpace: 'pre',
            background: 'transparent',
            outline: 'none',
            border: 'none',
            overflow: 'hidden',
            resize: 'none',
          }
          styledButtonWrapper = { position: 'absolute', top: 0, left: '-1.5rem' }
        }

        switch (uiState.state) {
          case 'creating':
            return (
              <div style={styledFloatingWrapper}>
                <textarea
                  style={styledTextArea}
                  autoFocus
                  ref={textareaRef}
                  onChange={(e) => {
                    // Shrink-then-expand the textarea to make it fits the content
                    // ... no matter the user is deleting or adding text.
                    e.target.style.width = '0'
                    e.target.style.height = '0'
                    const textareaWidth = e.target.scrollWidth
                    const textareaHeight = e.target.scrollHeight
                    e.target.style.width = `${textareaWidth}px`
                    e.target.style.height = `${textareaHeight}px`
                    setUiState((prev) => {
                      if (prev.state === 'creating') {
                        return {
                          ...prev,
                          data: {
                            ...prev.data,
                            // This is viewport(not scene) width/height. It's already taking zoomLevel into account
                            // ... because width/height is calculated from a scaled font size(which is scaled by zoomLevel) in the content.
                            // Also, read the values from closure, not from e.target, to match what we imperatively manipulate the DOM.
                            textareaWidth: textareaWidth,
                            textareaHeight: textareaHeight,
                          },
                        }
                      }
                      return prev
                    })
                  }}
                />
                <div style={styledButtonWrapper}>
                  <CmdButton cmdName="doneEditingText" onClick={handleClick} iconWidth={16} />
                </div>
              </div>
            )
          case 'updating':
            return (
              <div style={styledFloatingWrapper}>
                <textarea
                  style={styledTextArea}
                  autoFocus
                  ref={textareaRef}
                  onChange={(e) => {
                    // see comment in onChange of "creating" state above, for why we need to do this
                    e.target.style.width = '0'
                    e.target.style.height = '0'
                    const textareaWidth = e.target.scrollWidth
                    const textareaHeight = e.target.scrollHeight
                    e.target.style.width = `${textareaWidth}px`
                    e.target.style.height = `${textareaHeight}px`
                    setUiState((prev) => {
                      if (prev.state === 'updating') {
                        return {
                          ...prev,
                          data: {
                            ...prev.data,
                            textareaWidth: textareaWidth,
                            textareaHeight: textareaHeight,
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
                      const editingElement = getElementInCurrentSnapshot(uiState.data.elementId)
                      if (!editingElement || editingElement.type !== 'text') {
                        throw new Error(
                          'The editing element is missing in the current history or not a "text" element'
                        )
                      }
                      replaceCurrentSnapshotByReplacingElements({
                        replacedElement: { ...editingElement, isWriting: false },
                      })
                      return
                    }
                  }}
                />
                <div style={styledButtonWrapper}>
                  <CmdButton cmdName="doneEditingText" onClick={handleClick} iconWidth={16} />
                </div>
              </div>
            )
          default:
            return null
        }
      })()}

      {renderCanvas({
        onPointerMove: handlePointerMove,
        onClick: handleClick,
        styleCursor: cursorType,
      })}
    </div>
  )
}
