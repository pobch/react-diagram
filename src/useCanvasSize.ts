import { useState } from 'react'

export function useCanvasSize() {
  const [canvasSize, setCanvasSize] = useState({
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
  })

  function recalculateCanvasSize() {
    setCanvasSize({
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    })
  }

  return { canvasSize, recalculateCanvasSize }
}
