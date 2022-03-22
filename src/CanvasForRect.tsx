import * as React from 'react'
import { useState } from 'react'
import rough from 'roughjs/bundled/rough.esm'
import { TElementData } from './App'

const generator = rough.generator()

export function createRectangleElement({
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

export const CanvasForRect = React.forwardRef(function CanvasForRect(
  {
    elements,
    setElements,
  }: {
    elements: TElementData[]
    setElements: React.Dispatch<React.SetStateAction<TElementData[]>>
  },
  canvasRef: React.Ref<HTMLCanvasElement>
) {
  const [action, setAction] = useState<'none' | 'drawing'>('none')

  function handlePointerDown(e: React.PointerEvent) {
    const { clientX, clientY } = e
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
    return
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (action === 'drawing') {
      const { clientX, clientY } = e
      // replace last element
      const lastIndex = elements.length - 1
      const { x1: currentX1, y1: currentY1 } = elements[lastIndex]
      const elementsCopy = [...elements]
      const newElement = createRectangleElement({
        id: lastIndex,
        x1: currentX1,
        y1: currentY1,
        width: clientX - currentX1,
        height: clientY - currentY1,
      })
      elementsCopy[lastIndex] = newElement
      setElements(elementsCopy)
      return
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    setAction('none')
    return
  }

  return (
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
  )
})
