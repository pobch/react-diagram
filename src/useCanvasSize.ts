import { useState } from 'react'

export function useCanvasSize() {
  const [canvasSize, setCanvasSize] = useState({
    // Why not window.innerWidth ? https://github.com/pobch/react-diagram/pull/35
    width: document.documentElement.clientWidth,

    // We need `window.innerHeight` to mitigate a bug in Chrome - iOS https://github.com/pobch/react-diagram/issues/46
    // When we open the page by <a target="_blank"/>, `clientHeight` will
    // ... return a wrong value (it's a height when there is no address bar)
    height: Math.min(document.documentElement.clientHeight, window.innerHeight),
  })

  function recalculateCanvasSize() {
    setCanvasSize({
      width: document.documentElement.clientWidth,
      height: Math.min(document.documentElement.clientHeight, window.innerHeight),
    })
  }

  return { canvasSize, recalculateCanvasSize }
}
