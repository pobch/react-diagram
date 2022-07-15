import { TElementData } from '../App'
import { createRectangleElementWithoutId } from '../CanvasForRect'
import { createImageElementWithoutId } from '../ImageUploadButton'

export function resizeRectangleElement({
  newPointerPosition,
  pointerStartedAt,
  rectElementToResize,
}: {
  newPointerPosition: { x: number; y: number }
  pointerStartedAt: 'tl' | 'tr' | 'br' | 'bl'
  rectElementToResize: Extract<TElementData, { type: 'line' | 'rectangle' | 'arrow' }>
}): ReturnType<typeof createRectangleElementWithoutId> {
  if (pointerStartedAt === 'tl') {
    const newX1 = newPointerPosition.x
    const newY1 = newPointerPosition.y
    const newElementWithoutId = createRectangleElementWithoutId({
      x1: newX1,
      y1: newY1,
      width: rectElementToResize.x2 - newX1,
      height: rectElementToResize.y2 - newY1,
    })
    return newElementWithoutId
  } else if (pointerStartedAt === 'tr') {
    const newY1 = newPointerPosition.y
    const newX2 = newPointerPosition.x
    const newElementWithoutId = createRectangleElementWithoutId({
      x1: rectElementToResize.x1,
      y1: newY1,
      width: newX2 - rectElementToResize.x1,
      height: rectElementToResize.y2 - newY1,
    })
    return newElementWithoutId
  } else if (pointerStartedAt === 'br') {
    const newX2 = newPointerPosition.x
    const newY2 = newPointerPosition.y
    const newElementWithoutId = createRectangleElementWithoutId({
      x1: rectElementToResize.x1,
      y1: rectElementToResize.y1,
      width: newX2 - rectElementToResize.x1,
      height: newY2 - rectElementToResize.y1,
    })
    return newElementWithoutId
  } else if (pointerStartedAt === 'bl') {
    const newX1 = newPointerPosition.x
    const newY2 = newPointerPosition.y
    const newElementWithoutId = createRectangleElementWithoutId({
      x1: newX1,
      y1: rectElementToResize.y1,
      width: rectElementToResize.x2 - newX1,
      height: newY2 - rectElementToResize.y1,
    })
    return newElementWithoutId
  } else {
    // should not reach here
    throw new Error('While resizing a rectangle, the pointer position is not at any corner.')
  }
}

export function resizeImageElement({
  newPointerPosition,
  pointerStartedAt,
  imageElementToResize,
}: {
  newPointerPosition: { x: number; y: number }
  pointerStartedAt: 'tl' | 'tr' | 'br' | 'bl'
  imageElementToResize: Extract<TElementData, { type: 'image' }>
}): ReturnType<typeof createImageElementWithoutId> {
  // ratio = width / height
  const aspectRatio =
    (imageElementToResize.x2 - imageElementToResize.x1) /
    (imageElementToResize.y2 - imageElementToResize.y1)
  const minImageWidth = 24
  const minImageHeight = 24

  if (pointerStartedAt === 'tl') {
    const pointerX1 = newPointerPosition.x
    const widthFromX1 = imageElementToResize.x2 - pointerX1
    const aspectAreaFromX1 = widthFromX1 * (widthFromX1 / aspectRatio)
    const pointerY1 = newPointerPosition.y
    const heightFromY1 = imageElementToResize.y2 - pointerY1
    const aspectAreaFromY1 = heightFromY1 * aspectRatio * heightFromY1
    let newX1: number
    let newY1: number
    if (aspectAreaFromX1 > aspectAreaFromY1) {
      newX1 =
        pointerX1 + minImageWidth < imageElementToResize.x2
          ? pointerX1
          : imageElementToResize.x2 - minImageWidth
      newY1 = imageElementToResize.y2 - (imageElementToResize.x2 - newX1) / aspectRatio
    } else {
      newY1 =
        pointerY1 + minImageHeight < imageElementToResize.y2
          ? pointerY1
          : imageElementToResize.y2 - minImageHeight
      newX1 = imageElementToResize.x2 - (imageElementToResize.y2 - newY1) * aspectRatio
    }
    const newElementWithoutId = createImageElementWithoutId({
      x1: newX1,
      y1: newY1,
      width: imageElementToResize.x2 - newX1,
      height: imageElementToResize.y2 - newY1,
      imageData: imageElementToResize.data,
    })
    return newElementWithoutId
  } else if (pointerStartedAt === 'tr') {
    const pointerY1 = newPointerPosition.y
    const heightFromY1 = imageElementToResize.y2 - pointerY1
    const aspectAreaFromY1 = heightFromY1 * aspectRatio * heightFromY1
    const pointerX2 = newPointerPosition.x
    const widthFromX2 = pointerX2 - imageElementToResize.x1
    const aspectAreaFromX2 = widthFromX2 * (widthFromX2 / aspectRatio)
    let newY1: number
    let newX2: number
    if (aspectAreaFromX2 > aspectAreaFromY1) {
      newX2 =
        imageElementToResize.x1 + minImageWidth < pointerX2
          ? pointerX2
          : imageElementToResize.x1 + minImageWidth
      newY1 = imageElementToResize.y2 - (newX2 - imageElementToResize.x1) / aspectRatio
    } else {
      newY1 =
        pointerY1 + minImageHeight < imageElementToResize.y2
          ? pointerY1
          : imageElementToResize.y2 - minImageHeight
      newX2 = imageElementToResize.x1 + (imageElementToResize.y2 - newY1) * aspectRatio
    }
    const newElementWithoutId = createImageElementWithoutId({
      x1: imageElementToResize.x1,
      y1: newY1,
      width: newX2 - imageElementToResize.x1,
      height: imageElementToResize.y2 - newY1,
      imageData: imageElementToResize.data,
    })
    return newElementWithoutId
  } else if (pointerStartedAt === 'br') {
    const pointerX2 = newPointerPosition.x
    const widthFromX2 = pointerX2 - imageElementToResize.x1
    const aspectAreaFromX2 = widthFromX2 * (widthFromX2 / aspectRatio)
    const pointerY2 = newPointerPosition.y
    const heightFromY2 = pointerY2 - imageElementToResize.y1
    const aspectAreaFromY2 = heightFromY2 * aspectRatio * heightFromY2
    let newX2: number
    let newY2: number
    if (aspectAreaFromX2 > aspectAreaFromY2) {
      newX2 =
        imageElementToResize.x1 + minImageWidth < pointerX2
          ? pointerX2
          : imageElementToResize.x1 + minImageWidth
      newY2 = imageElementToResize.y1 + (newX2 - imageElementToResize.x1) / aspectRatio
    } else {
      newY2 =
        imageElementToResize.y1 + minImageHeight < pointerY2
          ? pointerY2
          : imageElementToResize.y1 + minImageHeight
      newX2 = imageElementToResize.x1 + (newY2 - imageElementToResize.y1) * aspectRatio
    }
    const newElementWithoutId = createImageElementWithoutId({
      x1: imageElementToResize.x1,
      y1: imageElementToResize.y1,
      width: newX2 - imageElementToResize.x1,
      height: newY2 - imageElementToResize.y1,
      imageData: imageElementToResize.data,
    })
    return newElementWithoutId
  } else if (pointerStartedAt === 'bl') {
    const pointerX1 = newPointerPosition.x
    const widthFromX1 = imageElementToResize.x2 - pointerX1
    const aspectAreaFromX1 = widthFromX1 * (widthFromX1 / aspectRatio)
    const pointerY2 = newPointerPosition.y
    const heightFromY2 = pointerY2 - imageElementToResize.y1
    const aspectAreaFromY2 = heightFromY2 * aspectRatio * heightFromY2
    let newX1: number
    let newY2: number
    if (aspectAreaFromX1 > aspectAreaFromY2) {
      newX1 =
        pointerX1 + minImageWidth < imageElementToResize.x2
          ? pointerX1
          : imageElementToResize.x2 - minImageWidth
      newY2 = imageElementToResize.y1 + (imageElementToResize.x2 - newX1) / aspectRatio
    } else {
      newY2 =
        imageElementToResize.y1 + minImageHeight < pointerY2
          ? pointerY2
          : imageElementToResize.y1 + minImageHeight
      newX1 = imageElementToResize.x2 - (newY2 - imageElementToResize.y1) * aspectRatio
    }
    const newElementWithoutId = createImageElementWithoutId({
      x1: newX1,
      y1: imageElementToResize.y1,
      width: imageElementToResize.x2 - newX1,
      height: newY2 - imageElementToResize.y1,
      imageData: imageElementToResize.data,
    })
    return newElementWithoutId
  } else {
    // should not reach here
    throw new Error('While resizing an image, the pointer position is not at any corner.')
  }
}
