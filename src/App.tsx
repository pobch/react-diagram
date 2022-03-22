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

export function App() {
  const [tool, setTool] = useState<'selection' | 'line' | 'rectangle'>('selection')
  const [elements, setElements] = useState<TElementData[]>([])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // * ----------- Clear Canvas -------------

  function handleClickClear() {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    context?.clearRect(0, 0, canvas.width, canvas.height)
    setElements([])
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
    elements.forEach((element) => {
      if (element.type === 'line' || element.type === 'rectangle') {
        roughCanvas.draw(element.roughElement)
      }
    })
  }, [
    elements,
    // also add tool as dependencies
    tool,
  ])

  return (
    <div>
      {/* Menu */}
      <div style={{ position: 'fixed' }}>
        <input
          type="radio"
          id="selection"
          checked={tool === 'selection'}
          onChange={() => setTool('selection')}
        />
        <label htmlFor="selection">Selection</label>
        <input type="radio" id="line" checked={tool === 'line'} onChange={() => setTool('line')} />
        <label htmlFor="line">Line</label>
        <input
          type="radio"
          id="rectangle"
          checked={tool === 'rectangle'}
          onChange={() => setTool('rectangle')}
        />
        <label htmlFor="rectangle">Rectangle</label>
        <button onClick={handleClickClear}>Clear</button>
      </div>

      {/* Canvas */}
      {(() => {
        switch (tool) {
          case 'selection':
            return (
              <CanvasForSelection ref={canvasRef} elements={elements} setElements={setElements} />
            )
          case 'rectangle':
            return <CanvasForRect ref={canvasRef} elements={elements} setElements={setElements} />
          case 'line':
            return <CanvasForLine ref={canvasRef} elements={elements} setElements={setElements} />
        }
      })()}
    </div>
  )
}
