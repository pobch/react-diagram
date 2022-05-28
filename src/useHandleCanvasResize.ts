import { useState, useEffect } from 'react'

export function useHandleCanvasResize(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const [imgDataUrlBeforeResize, setImgDataUrlBeforeResize] = useState<string | undefined>()

  useEffect(() => {
    function onViewportResize() {
      if (canvasRef.current) {
        setImgDataUrlBeforeResize(canvasRef.current.toDataURL('image/png'))
      }
    }
    window.addEventListener('resize', onViewportResize)
    return () => {
      window.removeEventListener('resize', onViewportResize)
    }
  }, [canvasRef])

  useEffect(() => {
    if (canvasRef.current && imgDataUrlBeforeResize) {
      const img = new Image()
      img.src = imgDataUrlBeforeResize
      const onLoad = () => {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d')
          ctx && ctx.drawImage(img, 0, 0)
        }
      }
      img.addEventListener('load', onLoad)

      // ?? no need to clean up & remove the event listener
      // ... because `const img = new Image()` is newly created every time
      // ... useEffect() is called
    }
  }, [canvasRef, imgDataUrlBeforeResize])
}
