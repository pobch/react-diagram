import { useLayoutEffect, useRef, useState } from 'react'
import rough from 'roughjs/bundled/rough.esm'
import { createLineElement } from './CanvasForLine'
import { createRectangleElement } from './CanvasForRect'
import { TElementData } from './App'

type TElementWithPointerOffsetData = TElementData & {
  pointerOffsetX1: number
  pointerOffsetY1: number
}

function getFirstElementAtPosition({
  dataSource,
  xPosition,
  yPosition,
}: {
  dataSource: TElementData[]
  xPosition: number
  yPosition: number
}): TElementWithPointerOffsetData | undefined {
  function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
  }
  const foundElement = dataSource.find((element) => {
    if (element.type === 'line') {
      const a = { x: element.x1, y: element.y1 }
      const b = { x: element.x2, y: element.y2 }
      const c = { x: xPosition, y: yPosition }
      const distanceOffset = distance(a, b) - (distance(a, c) + distance(b, c))
      return Math.abs(distanceOffset) < 1
    } else if (element.type === 'rectangle') {
      const minX = Math.min(element.x1, element.x2)
      const maxX = Math.max(element.x1, element.x2)
      const minY = Math.min(element.y1, element.y2)
      const maxY = Math.max(element.y1, element.y2)
      return minX <= xPosition && xPosition <= maxX && minY <= yPosition && yPosition <= maxY
    }
    // should not reach here
    return false
  })

  if (!foundElement) return

  return {
    ...foundElement,
    pointerOffsetX1: xPosition - foundElement.x1,
    pointerOffsetY1: yPosition - foundElement.y1,
  }
}

export function CanvasForSelection({
  elements,
  setElements,
}: {
  elements: TElementData[]
  setElements: React.Dispatch<TElementData[]>
}) {
  const [action, setAction] = useState<'none' | 'moving'>('none')
  const [selectedElementWithPointerOffset, setSelectedElementWithPointerOffset] = useState<
    TElementWithPointerOffsetData | undefined
  >()
  // TODO: implement this
  const [cursorType, setCursorType] = useState('default')

  function handlePointerDown(e: React.PointerEvent) {
    const { clientX, clientY } = e
    const selectedElemData = getFirstElementAtPosition({
      dataSource: elements,
      xPosition: clientX,
      yPosition: clientY,
    })
    if (!selectedElemData) return
    setAction('moving')
    setSelectedElementWithPointerOffset(selectedElemData)
    return
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (action === 'moving' && selectedElementWithPointerOffset) {
      const { clientX, clientY } = e
      const newX1 = clientX - selectedElementWithPointerOffset.pointerOffsetX1
      const newY1 = clientY - selectedElementWithPointerOffset.pointerOffsetY1
      // replace specific element
      const index = selectedElementWithPointerOffset.id
      const elementsCopy = [...elements]

      if (selectedElementWithPointerOffset.type === 'line') {
        const distanceX = selectedElementWithPointerOffset.x2 - selectedElementWithPointerOffset.x1
        const distanceY = selectedElementWithPointerOffset.y2 - selectedElementWithPointerOffset.y1
        const newElement = createLineElement({
          id: index,
          x1: newX1,
          y1: newY1,
          x2: newX1 + distanceX,
          y2: newY1 + distanceY,
        })
        elementsCopy[index] = newElement
      } else if (selectedElementWithPointerOffset.type === 'rectangle') {
        const width = selectedElementWithPointerOffset.x2 - selectedElementWithPointerOffset.x1
        const height = selectedElementWithPointerOffset.y2 - selectedElementWithPointerOffset.y1
        const newElement = createRectangleElement({
          id: index,
          x1: newX1,
          y1: newY1,
          width: width,
          height: height,
        })
        elementsCopy[index] = newElement
      }
      setElements(elementsCopy)
      return
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    setAction('none')
    setSelectedElementWithPointerOffset(undefined)
    return
  }

  // * ------------ Canvas Drawing ------------
  // TODO: extract this into reusable hook
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
}
