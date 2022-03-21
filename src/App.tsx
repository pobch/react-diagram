import { useLayoutEffect, useRef, useState } from 'react'
import rough from 'roughjs/bundled/rough.esm'
import { Drawable } from 'roughjs/bin/core'

/**
 * * ------------------------------
 * *          Helpers
 * * ------------------------------
 */

const generator = rough.generator()

type TElementData = {
  id: number | string
  x1: number
  y1: number
  x2: number
  y2: number
  type: 'selection' | 'line' | 'rectangle'
  roughElement: Drawable
}

function createLineElement({
  id,
  x1,
  y1,
  x2,
  y2,
}: Omit<TElementData, 'roughElement' | 'type'>): TElementData {
  const roughElement = generator.line(x1, y1, x2, y2)
  return { id: id, x1: x1, y1: y1, x2: x2, y2: y2, type: 'line', roughElement }
}

function createRectangleElement({
  id,
  x1,
  y1,
  width,
  height,
}: Pick<TElementData, 'id' | 'x1' | 'y1'> & { width: number; height: number }): TElementData {
  const roughElement = generator.rectangle(x1, y1, width, height)
  return {
    id: id,
    x1: x1,
    y1: y1,
    x2: x1 + width,
    y2: y1 + height,
    type: 'rectangle',
    roughElement,
  }
}

/**
 * * ------------------------------
 * *          Component
 * * ------------------------------
 */
export function App() {
  const [tool, setTool] = useState<'selection' | 'line' | 'rectangle'>('selection')
  const [elements, setElements] = useState<TElementData[]>([])
  const [action, setAction] = useState<'none' | 'drawing'>('none')

  function handlePointerDown(e: React.PointerEvent) {
    const { clientX, clientY } = e
    if (tool === 'line') {
      const nextIndex = elements.length
      const newElement = createLineElement({
        id: nextIndex,
        x1: clientX,
        y1: clientY,
        x2: clientX,
        y2: clientY,
      })
      setElements((prevState) => [...prevState, newElement])
      setAction('drawing')
    } else if (tool === 'rectangle') {
      const nextIndex = elements.length
      const newElement = createRectangleElement({
        id: nextIndex,
        x1: clientX,
        y1: clientY,
        width: 0,
        height: 0,
      })
      setElements((prevState) => [...prevState, newElement])
      setAction('drawing')
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    const { clientX, clientY } = e
    if (action === 'drawing') {
      // replace last element
      const lastIndex = elements.length - 1
      const { x1: currentX1, y1: currentY1 } = elements[lastIndex]
      const elementsCopy = [...elements]

      if (tool === 'line') {
        const newElement = createLineElement({
          id: lastIndex,
          x1: currentX1,
          y1: currentY1,
          x2: clientX,
          y2: clientY,
        })
        elementsCopy[lastIndex] = newElement
      } else if (tool === 'rectangle') {
        const newElement = createRectangleElement({
          id: lastIndex,
          x1: currentX1,
          y1: currentY1,
          width: clientX - currentX1,
          height: clientY - currentY1,
        })
        elementsCopy[lastIndex] = newElement
      }
      setElements(elementsCopy)
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    setAction('none')
  }

  // * ----------- Clear Canvas -------------

  function handleClickClear() {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    context?.clearRect(0, 0, canvas.width, canvas.height)
    setElements([])
  }

  // * ------------ Canvas Drawing ------------

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
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
  }, [elements])

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
      <canvas
        ref={canvasRef}
        style={{
          backgroundColor: 'azure',
          display: 'block',
          width: window.innerWidth,
          height: window.innerHeight,
          // disable all touch behavior from browser, e.g. touch to scroll
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        My Canvas
      </canvas>
    </div>
  )
}
