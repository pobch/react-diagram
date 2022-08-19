import { useState } from 'react'

export function useCanvasSize() {
  // Why not window.innerHeight / innerWidth ? https://github.com/pobch/react-diagram/pull/35
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
