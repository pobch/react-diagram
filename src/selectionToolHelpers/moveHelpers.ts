import { TElementData } from '../App'
import { createRectangleElementWithoutId } from '../CanvasForRect'
import { createImageElementWithoutId } from '../ImageUploadButton'

export function moveRectangleElement({
  newX1,
  newY1,
  rectElementToMove,
}: {
  newX1: number
  newY1: number
  rectElementToMove: Extract<TElementData, { type: 'line' | 'rectangle' | 'arrow' }>
}): ReturnType<typeof createRectangleElementWithoutId> {
  // keep existing width + height
  const width = rectElementToMove.x2 - rectElementToMove.x1
  const height = rectElementToMove.y2 - rectElementToMove.y1

  const newElementWithoutId = createRectangleElementWithoutId({
    x1: newX1,
    y1: newY1,
    width: width,
    height: height,
  })
  return newElementWithoutId
}

export function moveImageElement({
  newX1,
  newY1,
  imageElementToMove,
}: {
  newX1: number
  newY1: number
  imageElementToMove: Extract<TElementData, { type: 'image' }>
}): ReturnType<typeof createImageElementWithoutId> {
  // keep existing width + height
  const width = imageElementToMove.x2 - imageElementToMove.x1
  const height = imageElementToMove.y2 - imageElementToMove.y1

  const newElementWithoutId = createImageElementWithoutId({
    x1: newX1,
    y1: newY1,
    width: width,
    height: height,
    imageData: imageElementToMove.data,
  })
  return newElementWithoutId
}
