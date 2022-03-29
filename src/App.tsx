import { useLayoutEffect, useRef, useState } from 'react'
import { Drawable } from 'roughjs/bin/core'
import rough from 'roughjs/bundled/rough.esm'
import { CanvasForSelection } from './CanvasForSelection'
import { CanvasForRect } from './CanvasForRect'
import { CanvasForLine } from './CanvasForLine'

export type TElementData = {
  id: number
  x1: number
  y1: number
  x2: number
  y2: number
  type: 'line' | 'rectangle'
  roughElement: Drawable
}

export type TSnapshot = TElementData[]

function useHistory() {
  const [history, setHistory] = useState<TSnapshot[]>([[]])
  const [currentIndex, setCurrentIndex] = useState(0)

  function addNewHistory(newSnapshot: TSnapshot) {
    setHistory((prevHistory) => [...prevHistory.slice(0, currentIndex + 1), newSnapshot])
    setCurrentIndex((prev) => prev + 1)
  }

  function replaceCurrentHistory(newSnapshot: TSnapshot) {
    setHistory((prevHistory) => [...prevHistory.slice(0, currentIndex), newSnapshot])
  }

  function undo() {
    setCurrentIndex((prev) => {
      return prev >= 1 ? prev - 1 : 0
    })
  }

  function redo() {
    setCurrentIndex((prev) => {
      return prev <= history.length - 2 ? prev + 1 : history.length - 1
    })
  }

  return {
    elementsSnapshot: history[currentIndex],
    addNewHistory,
    replaceCurrentHistory,
    undo,
    redo,
  }
}

export function App() {
  const [tool, setTool] = useState<'selection' | 'line' | 'rectangle'>('selection')
  const { elementsSnapshot, addNewHistory, replaceCurrentHistory, undo, redo } = useHistory()

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // * ----------- Clear Canvas -------------

  function handleClickClear() {
    if (!canvasRef.current) return

    addNewHistory([])
  }

  // * ------------ Canvas Drawing ------------

  useLayoutEffect(() => {
    if (!canvasRef.current) return

    function setupDPR(canvas: HTMLCanvasElement) {
      // Get the device pixel ratio, falling back to 1.
      var dpr = window.devicePixelRatio || 1
      // Get the size of the canvas in CSS pixels.
      var rect = canvas.getBoundingClientRect()
      // Give the canvas pixel dimensions of their CSS
      // size * the device pixel ratio.
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      var ctx = canvas.getContext('2d')
      // Scale all drawing operations by the dpr, so you
      // don't have to worry about the difference.
      ctx?.scale(dpr, dpr)
      return ctx
    }
    const canvas = canvasRef.current
    const context = setupDPR(canvas)

    context?.clearRect(0, 0, canvas.width, canvas.height)

    const roughCanvas = rough.canvas(canvas)
    elementsSnapshot.forEach((element) => {
      if (element.type === 'line' || element.type === 'rectangle') {
        roughCanvas.draw(element.roughElement)
      }
    })
  }, [
    elementsSnapshot,
    // also add tool as dependencies
    tool,
  ])

  return (
    <div>
      {/* Top Menu */}
      <fieldset style={{ position: 'fixed', top: 0, margin: '0.5rem', padding: '0.25rem' }}>
        <legend>Tool</legend>
        <span style={{ paddingInlineEnd: '0.5rem' }}>
          <input
            type="radio"
            id="selection"
            checked={tool === 'selection'}
            onChange={() => setTool('selection')}
            style={{ marginInlineEnd: '0.25rem' }}
          />
          <label htmlFor="selection">Selection</label>
        </span>
        <span style={{ paddingInlineEnd: '0.5rem' }}>
          <input
            type="radio"
            id="line"
            checked={tool === 'line'}
            onChange={() => setTool('line')}
            style={{ marginInlineEnd: '0.25rem' }}
          />
          <label htmlFor="line">Line</label>
        </span>
        <span style={{ paddingInlineEnd: '0.5rem' }}>
          <input
            type="radio"
            id="rectangle"
            checked={tool === 'rectangle'}
            onChange={() => setTool('rectangle')}
            style={{ marginInlineEnd: '0.25rem' }}
          />
          <label htmlFor="rectangle">Rectangle</label>
        </span>
      </fieldset>
      {/* Footer Menu */}
      <div style={{ position: 'fixed', bottom: 0, padding: '1rem' }}>
        <span style={{ paddingInlineEnd: '0.5rem' }}>
          <button onClick={() => undo()}>Undo</button>
        </span>
        <span style={{ paddingInlineEnd: '1rem' }}>
          <button onClick={() => redo()}>Redo</button>
        </span>
        <span style={{ paddingInlineEnd: '1rem' }}>|</span>
        <button onClick={handleClickClear}>Clear</button>
      </div>

      {/* Canvas */}
      {(() => {
        switch (tool) {
          case 'selection':
            return (
              <CanvasForSelection
                ref={canvasRef}
                elementsSnapshot={elementsSnapshot}
                addNewHistory={addNewHistory}
                replaceCurrentHistory={replaceCurrentHistory}
              />
            )
          case 'rectangle':
            return (
              <CanvasForRect
                ref={canvasRef}
                elementsSnapshot={elementsSnapshot}
                addNewHistory={addNewHistory}
                replaceCurrentHistory={replaceCurrentHistory}
              />
            )
          case 'line':
            return (
              <CanvasForLine
                ref={canvasRef}
                elementsSnapshot={elementsSnapshot}
                addNewHistory={addNewHistory}
                replaceCurrentHistory={replaceCurrentHistory}
              />
            )
        }
      })()}
    </div>
  )
}
