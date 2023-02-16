import { useState, useCallback, useEffect } from 'react'

export function useCanvasSize({ forceRedrawScene }: { forceRedrawScene: () => void }) {
  const [canvasSize, setCanvasSize] = useState({
    // Why not window.innerWidth ? https://github.com/pobch/react-diagram/pull/35
    width: document.documentElement.clientWidth,

    // We need `window.innerHeight` to mitigate a bug in Chrome - iOS https://github.com/pobch/react-diagram/issues/46
    // When we open the page by <a target="_blank"/>, `clientHeight` will
    // ... return a wrong value (it's a height when there is no address bar)
    height: Math.min(document.documentElement.clientHeight, window.innerHeight),
  })

  const recalculateCanvasSize = useCallback(() => {
    setCanvasSize({
      width: document.documentElement.clientWidth,
      height: Math.min(document.documentElement.clientHeight, window.innerHeight),
    })
  }, [])

  useEffect(() => {
    function resizeCanvasAndRedraw() {
      const el = document.activeElement
      if (
        el?.tagName === 'TEXTAREA' ||
        (el?.tagName === 'INPUT' && el.getAttribute('type') === 'text')
      ) {
        // Android triggers `resize` when a virtual keyboard shows up
        // We want to ignore this case
        return
      }
      recalculateCanvasSize()
      forceRedrawScene()
    }
    window.addEventListener('resize', resizeCanvasAndRedraw)

    return () => {
      window.removeEventListener('resize', resizeCanvasAndRedraw)
    }
  }, [forceRedrawScene, recalculateCanvasSize])

  return { canvasSize, recalculateCanvasSize }
}
