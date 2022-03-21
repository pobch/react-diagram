import { useState } from 'react'
import { Drawable } from 'roughjs/bin/core'
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

  // * ----------- Clear Canvas -------------
  // TODO: Implement this
  // function handleClickClear() {
  //   if (!canvasRef.current) return

  //   const canvas = canvasRef.current
  //   const context = canvas?.getContext('2d')
  //   context?.clearRect(0, 0, canvas.width, canvas.height)
  //   setElements([])
  // }

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
        {/* <button onClick={handleClickClear}>Clear</button> */}
      </div>

      {/* Canvas */}
      {(() => {
        switch (tool) {
          case 'selection':
            return <CanvasForSelection elements={elements} setElements={setElements} />
          case 'rectangle':
            return <CanvasForRect elements={elements} setElements={setElements} />
          case 'line':
            return <CanvasForLine elements={elements} setElements={setElements} />
        }
      })()}
    </div>
  )
}
