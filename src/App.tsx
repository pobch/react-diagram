import { useLayoutEffect, useRef, useState } from 'react'
import rough from 'roughjs/bundled/rough.esm'
import { Drawable } from 'roughjs/bin/core'

const generator = rough.generator()

export function App() {
  const [tool, setTool] = useState<'selection' | 'line' | 'rectangle'>('selection')
  const [elements, setElements] = useState<
    {
      id: number | string
      x1: number
      y1: number
      x2: number
      y2: number
      type: 'selection' | 'line' | 'rectangle'
      roughElement: Drawable
    }[]
  >([])
  const [action, setAction] = useState<'none' | 'drawing'>('none')

  function handleMouseDown(e: React.MouseEvent) {
    const { clientX, clientY } = e
    if (tool === 'line') {
      const id = elements.length
      const roughElement = generator.line(clientX, clientY, clientX, clientY)
      const newElement = {
        id: id,
        x1: clientX,
        y1: clientY,
        x2: clientX,
        y2: clientY,
        type: tool,
        roughElement,
      }
      setElements((prevState) => [...prevState, newElement])
      setAction('drawing')
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    const { clientX, clientY } = e
    if (action === 'drawing') {
      // replace last element
      const lastIndex = elements.length - 1
      const { x1: currentX1, y1: currentY1 } = elements[lastIndex]
      const elementsCopy = [...elements]
      if (tool === 'line') {
        const roughElement = generator.line(currentX1, currentY1, clientX, clientY)
        const newElement = {
          id: lastIndex,
          x1: currentX1,
          y1: currentY1,
          x2: clientX,
          y2: clientY,
          type: tool,
          roughElement,
        }
        elementsCopy[lastIndex] = newElement
      }
      setElements(elementsCopy)
    }
  }

  function handleMouseUp(e: React.MouseEvent) {
    setAction('none')
  }

  // Rendering frame by frame
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useLayoutEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    canvas.width = window.devicePixelRatio * window.innerWidth
    canvas.height = window.devicePixelRatio * window.innerHeight
    const context = canvas.getContext('2d')
    //CSS pixels for coordinate systems
    context?.scale(window.devicePixelRatio, window.devicePixelRatio)

    context?.clearRect(0, 0, canvas.width, canvas.height)

    const roughCanvas = rough.canvas(canvas)
    elements.forEach((element) => {
      if (element.type === 'line') {
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
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          backgroundColor: 'azure',
          display: 'block',
          width: window.innerWidth,
          height: window.innerHeight,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        My Canvas
      </canvas>
    </div>
  )
}
