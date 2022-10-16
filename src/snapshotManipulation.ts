import { useState } from 'react'
import { Drawable } from 'roughjs/bin/core'

export type TElementData =
  | {
      type: 'line' | 'rectangle' | 'arrow'
      id: number
      x1: number
      y1: number
      x2: number
      y2: number
      roughElements: Drawable[]
    }
  | {
      type: 'pencil'
      id: number
      points: { x: number; y: number }[]
    }
  | {
      type: 'text'
      id: number
      isWriting: boolean
      lines: {
        lineX1: number
        lineY1: number
        lineWidth: number
        lineHeight: number
        lineContent: string
      }[]
    }
  | {
      type: 'image'
      id: number
      x1: number
      y1: number
      x2: number
      y2: number
      data: ImageBitmap
    }

export type TSnapshot = TElementData[]

type DistributiveOmit<T, K extends PropertyKey> = T extends any ? Omit<T, K> : never

type TCommitNewSnapshotParam =
  | { mode: 'clone' }
  | { mode: 'addElements'; newElementWithoutIds: DistributiveOmit<TElementData, 'id'>[] }
  | { mode: 'removeElements'; elementIds: number[] }
  | { mode: 'removeAllElement' }
  | { mode: 'modifyElement'; modifiedElement: TElementData }
export type TReplaceCurrentSnapshotParam = {
  replacedElement?: TElementData
  replacedMultiElements?: TElementData[]
}

export function useHistory() {
  // TODO: Combine these states into a single object OR use useReducer(). This will
  // ... also help to avoid calling setCurrentIndex inside setHistory updater function.
  const [history, setHistory] = useState<TSnapshot[]>([[]])
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentSnapshot = history[currentIndex]
  if (!currentSnapshot) {
    throw new Error('The whole current snapshot is not exist in this point of history!!')
  }

  function commitNewSnapshot(options: TCommitNewSnapshotParam) {
    if (!currentSnapshot) {
      throw new Error('The whole current snapshot is not exist in this point of history!!')
    }
    let newSnapshot: TSnapshot = []
    if (options.mode === 'clone') {
      newSnapshot = [...currentSnapshot]
    } else if (options.mode === 'addElements') {
      const newElements = options.newElementWithoutIds.map((newElementWithoutId, i) => {
        return {
          ...newElementWithoutId,
          // Also plus a unique number to prevent the case that multiple elements get the same id
          id: Date.now() + i,
        }
      })
      newSnapshot = [...currentSnapshot, ...newElements]
    } else if (options.mode === 'removeElements') {
      newSnapshot = [...currentSnapshot]
      let willRemoveIdsMap: Record<number, boolean> = {}
      options.elementIds.forEach((elementId) => {
        willRemoveIdsMap[elementId] = true
      })
      newSnapshot = newSnapshot.filter((element) => {
        return !willRemoveIdsMap[element.id]
      })
    } else if (options.mode === 'removeAllElement') {
      newSnapshot = []
    } else if (options.mode === 'modifyElement') {
      newSnapshot = [...currentSnapshot]
      const index = newSnapshot.findIndex((element) => element.id === options.modifiedElement.id)
      newSnapshot[index] = { ...options.modifiedElement }
    }
    setHistory((prevHistory) => {
      const newHistory = [...prevHistory.slice(0, currentIndex + 1), newSnapshot]
      setCurrentIndex(newHistory.length - 1)
      return newHistory
    })

    // for "addElements" mode, we also return an array of new element's id
    if (options.mode === 'addElements') {
      const lastElementsInNewSnapshot = newSnapshot.slice(-options.newElementWithoutIds.length)
      return lastElementsInNewSnapshot.map((element) => element.id)
    }
    return
  }

  function replaceCurrentSnapshotByReplacingElements({
    replacedElement,
    replacedMultiElements,
  }: TReplaceCurrentSnapshotParam) {
    if (!currentSnapshot) {
      throw new Error('The whole current snapshot is not exist in this point of history!!')
    }
    if (replacedElement && replacedMultiElements) {
      throw new Error('This function cannot receive both arguments at the same time')
    }
    if (!replacedElement && !replacedMultiElements) {
      throw new Error('This function requires at least 1 argument')
    }
    if (replacedElement) {
      let newSnapshot = [...currentSnapshot]
      const index = newSnapshot.findIndex((element) => element.id === replacedElement.id)
      newSnapshot[index] = { ...replacedElement }
      setHistory((prevHistory) => [...prevHistory.slice(0, currentIndex), newSnapshot])
      return
    }
    if (replacedMultiElements) {
      let newSnapshot = [...currentSnapshot]
      const willReplaceElementsMap = replacedMultiElements.reduce((prev, element) => {
        prev[element.id] = { ...element }
        return prev
      }, {} as Record<number, TElementData>)
      newSnapshot = newSnapshot.map((element) => {
        const willReplaceElement = willReplaceElementsMap[element.id]
        if (willReplaceElement) {
          return { ...willReplaceElement }
        }
        return element
      })
      setHistory((prevHistory) => [...prevHistory.slice(0, currentIndex), newSnapshot])
      return
    }
  }

  function replaceCurrentSnapshotByRemovingElement(elementIdToRemove: number) {
    if (!currentSnapshot) {
      throw new Error('The whole current snapshot is not exist in this point of history!!')
    }
    let newSnapshot = [...currentSnapshot]
    const index = newSnapshot.findIndex((element) => element.id === elementIdToRemove)
    newSnapshot.splice(index, 1)
    setHistory((prevHistory) => [...prevHistory.slice(0, currentIndex), newSnapshot])
    return
  }

  function undo() {
    setCurrentIndex((prev) => {
      return prev >= 1 ? prev - 1 : 0
    })
  }

  function redo() {
    setCurrentIndex((prev) => {
      return prev <= history.length - 2 ? prev + 1 : history.length - 1
    })
  }

  // for debugging purpose, can remove this anytime
  // not support image element
  function DEBUG_importSnapshot(newSnapshot: TSnapshot) {
    setHistory((prevHistory) => {
      const newHistory = [...prevHistory.slice(0, currentIndex + 1), newSnapshot]
      setCurrentIndex(newHistory.length - 1)
      return newHistory
    })
  }

  return {
    currentSnapshot,
    commitNewSnapshot,
    replaceCurrentSnapshotByReplacingElements,
    replaceCurrentSnapshotByRemovingElement,
    undo,
    redo,
    DEBUG_importSnapshot,
  }
}

export type TCommitNewSnapshotFn = ReturnType<typeof useHistory>['commitNewSnapshot']

export function getSingleElementInSnapshot({
  snapshot,
  elementId,
}: {
  snapshot: TSnapshot
  elementId: number
}) {
  return snapshot.find((element) => element.id === elementId)
}

export function getMultiElementsInSnapshot({
  snapshot,
  elementIds,
}: {
  snapshot: TSnapshot
  elementIds: number[]
}): TElementData[] {
  const elementIdsMap = elementIds.reduce((prev, elementId) => {
    prev[elementId] = true
    return prev
  }, {} as { [elementId: number]: boolean })
  const foundElementsInSnapshot = snapshot.filter((element) => {
    return elementIdsMap[element.id]
  })
  return foundElementsInSnapshot
}
