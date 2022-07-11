import { TCommitNewSnapshotParam, TElementData } from './App'

export function ImageUploadButton({
  commitNewSnapshot,
  scenePositionToDrawImage,
}: {
  commitNewSnapshot: (arg: TCommitNewSnapshotParam) => number | void
  scenePositionToDrawImage: { x1: number; y1: number }
}) {
  return (
    <>
      <label htmlFor="image-upload">Img</label>
      <input
        id="image-upload"
        type="file"
        style={{ width: '1px', height: '1px', opacity: 0 }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          createImageBitmap(file).then((imageBitmap) => {
            commitNewSnapshot({
              mode: 'addElement',
              newElementWithoutId: {
                type: 'image',
                x1: scenePositionToDrawImage.x1,
                y1: scenePositionToDrawImage.y1,
                x2: scenePositionToDrawImage.x1 + imageBitmap.width,
                y2: scenePositionToDrawImage.y1 + imageBitmap.height,
                data: imageBitmap,
              },
            })
            // make onChange being triggered again even though the user select the same image
            e.target.value = ''
          })
        }}
      />
    </>
  )
}

export function createImageElementWithoutId({
  x1,
  y1,
  width,
  height,
  imageData,
}: {
  x1: number
  y1: number
  width: number
  height: number
  imageData: ImageBitmap
}): Omit<Extract<TElementData, { type: 'image' }>, 'id'> {
  return {
    x1: x1,
    y1: y1,
    x2: x1 + width,
    y2: y1 + height,
    type: 'image',
    data: imageData,
  }
}
