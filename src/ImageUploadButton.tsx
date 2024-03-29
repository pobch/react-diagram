import { TCommitNewSnapshotFn, TElementData } from './snapshotManipulation'
import iconSrc from './assets/image.svg'

export function ImageUploadButton({
  commitNewSnapshot,
  scenePositionToDrawImage,
  onUploadSuccess,
}: {
  commitNewSnapshot: TCommitNewSnapshotFn
  scenePositionToDrawImage: { x1: number; y1: number }
  onUploadSuccess: () => void
}) {
  return (
    <>
      <label htmlFor="image-upload">
        <img src={iconSrc} alt="upload" width={24} style={{ verticalAlign: 'bottom' }} />
      </label>
      <input
        id="image-upload"
        type="file"
        style={{ width: '1px', height: '1px', opacity: 0 }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          createImageBitmap(file).then((imageBitmap) => {
            commitNewSnapshot({
              mode: 'addElements',
              newElementWithoutIds: [
                {
                  type: 'image',
                  x1: scenePositionToDrawImage.x1,
                  y1: scenePositionToDrawImage.y1,
                  x2: scenePositionToDrawImage.x1 + imageBitmap.width,
                  y2: scenePositionToDrawImage.y1 + imageBitmap.height,
                  data: imageBitmap,
                },
              ],
            })

            // make onChange being triggered again even though the user select the same image
            e.target.value = ''

            onUploadSuccess()
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
