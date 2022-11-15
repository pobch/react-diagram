import { useCallback, useReducer } from 'react'
import { createLinearElementWithoutId } from '../CanvasForLinear'
import { adjustRectangleCoordinates, createRectangleElementWithoutId } from '../CanvasForRect'
import { createTextElementWithoutId } from '../CanvasForText'
import {
  getSingleElementInSnapshot,
  getMultiElementsInSnapshot,
  TCommitNewSnapshotFn,
  TElementData,
  TReplaceCurrentSnapshotParam,
  TSnapshot,
} from '../snapshotManipulation'
import { moveImageElement, moveRectangleElement } from './moveHelpers'
import { resizeImageElement, resizeRectangleElement } from './resizeHelpers'

type TMoveData =
  | {
      elementType: 'line' | 'rectangle' | 'arrow' | 'image'
      elementId: number
      pointerOffsetX1: number
      pointerOffsetY1: number
    }
  | {
      elementType: 'pencil'
      elementId: number
      pointerOffsetFromPoints: { offsetX: number; offsetY: number }[]
    }
  | {
      elementType: 'text'
      elementId: number
      pointerOffsetX1: number
      pointerOffsetY1: number
      content: string
    }
type TResizeData =
  | {
      elementType: 'line' | 'arrow'
      elementId: number
      pointerPosition: 'start' | 'end'
    }
  | {
      elementType: 'rectangle' | 'image'
      elementId: number
      pointerPosition: 'tl' | 'tr' | 'bl' | 'br'
    }

export type TAreaSelectData = {
  selectedElementIds: number[]
  rectangleSelector: {
    type: 'rectangleSelector'
    x1: number
    y1: number
    x2: number
    y2: number
  }
}
type TSingleSelectData = {
  elementId: number
}
type TMultiSelectData = {
  elementIds: number[]
}

// Terminology: `data` property = "context" in XState
export type TUiState =
  | {
      state: 'none'
    }
  | {
      state: 'readyToMove'
      data: TMoveData[]
    }
  | {
      state: 'moving'
      data: TMoveData[]
    }
  | {
      state: 'readyToResize'
      data: TResizeData
    }
  | {
      state: 'resizing'
      data: TResizeData
    }
  | {
      state: 'areaSelecting'
      data: TAreaSelectData
    }
  | {
      state: 'singleElementSelected'
      data: TSingleSelectData
    }
  | {
      state: 'multiElementSelected'
      data: TMultiSelectData
    }

type TEvent =
  | { type: 'prepareDragSelect'; data: TAreaSelectData }
  | { type: 'dragSelect'; data: TAreaSelectData }
  | { type: 'prepareMove'; data: TMoveData[] }
  | { type: 'startMove'; data: TMoveData[] }
  | { type: 'continueMove'; data: TMoveData[] }
  | { type: 'prepareResize'; data: TResizeData }
  | { type: 'startResize'; data: TResizeData }
  | { type: 'continueResize'; data: TResizeData }
  | { type: 'selectSingleElement'; data: TSingleSelectData }
  | { type: 'flipThenSelectRectangle'; data: TSingleSelectData }
  | { type: 'selectMultipleElements'; data: TMultiSelectData }
  | { type: 'reset' }
  | { type: 'removeSelectedElements' }
  | { type: 'duplicateSelectedSingleElements'; data: TSingleSelectData }
  | { type: 'duplicateSelectedMultipleElements'; data: TMultiSelectData }

type TAllEventNames = TEvent['type']

// Structure: { prevStateName: { eventName: { eventName: 'eventName', nextState: 'nextStateName' } }, ... }
export const mapPrevToNextState = {
  none: {
    prepareMove: { eventName: 'prepareMove', nextState: 'readyToMove' },
    prepareDragSelect: { eventName: 'prepareDragSelect', nextState: 'areaSelecting' },
  },
  readyToMove: {
    startMove: { eventName: 'startMove', nextState: 'moving' },
    selectSingleElement: { eventName: 'selectSingleElement', nextState: 'singleElementSelected' },
    selectMultipleElements: {
      eventName: 'selectMultipleElements',
      nextState: 'multiElementSelected',
    },
    reset: { eventName: 'reset', nextState: 'none' },
  },
  moving: {
    continueMove: { eventName: 'continueMove', nextState: 'moving' },
    selectSingleElement: { eventName: 'selectSingleElement', nextState: 'singleElementSelected' },
    selectMultipleElements: {
      eventName: 'selectMultipleElements',
      nextState: 'multiElementSelected',
    },
    reset: { eventName: 'reset', nextState: 'none' },
  },
  readyToResize: {
    startResize: { eventName: 'startResize', nextState: 'resizing' },
    selectSingleElement: { eventName: 'selectSingleElement', nextState: 'singleElementSelected' },
    reset: { eventName: 'reset', nextState: 'none' },
  },
  resizing: {
    continueResize: { eventName: 'continueResize', nextState: 'resizing' },
    selectSingleElement: { eventName: 'selectSingleElement', nextState: 'singleElementSelected' },
    flipThenSelectRectangle: {
      eventName: 'flipThenSelectRectangle',
      nextState: 'singleElementSelected',
    },
    reset: { eventName: 'reset', nextState: 'none' },
  },
  areaSelecting: {
    dragSelect: { eventName: 'dragSelect', nextState: 'areaSelecting' },
    selectSingleElement: { eventName: 'selectSingleElement', nextState: 'singleElementSelected' },
    selectMultipleElements: {
      eventName: 'selectMultipleElements',
      nextState: 'multiElementSelected',
    },
    reset: { eventName: 'reset', nextState: 'none' },
  },
  singleElementSelected: {
    prepareMove: { eventName: 'prepareMove', nextState: 'readyToMove' },
    prepareResize: { eventName: 'prepareResize', nextState: 'readyToResize' },
    prepareDragSelect: { eventName: 'prepareDragSelect', nextState: 'areaSelecting' },
    reset: { eventName: 'reset', nextState: 'none' },
    removeSelectedElements: { eventName: 'removeSelectedElements', nextState: 'none' },
    duplicateSelectedSingleElements: {
      eventName: 'duplicateSelectedSingleElements',
      nextState: 'singleElementSelected',
    },
  },
  multiElementSelected: {
    prepareMove: { eventName: 'prepareMove', nextState: 'readyToMove' },
    prepareDragSelect: { eventName: 'prepareDragSelect', nextState: 'areaSelecting' },
    reset: { eventName: 'reset', nextState: 'none' },
    removeSelectedElements: { eventName: 'removeSelectedElements', nextState: 'none' },
    duplicateSelectedMultipleElements: {
      eventName: 'duplicateSelectedMultipleElements',
      nextState: 'multiElementSelected',
    },
  },
} as const

function reducer(prevState: TUiState, event: TEvent): TUiState {
  const mapPrevToNextStateWithLooserType: {
    [PrevStateName in TUiState['state']]: {
      [EventName in TAllEventNames]?: { eventName: EventName; nextState: TUiState['state'] }
    }
  } = mapPrevToNextState

  const nextStateName = mapPrevToNextStateWithLooserType[prevState.state][event.type]?.nextState
  if (nextStateName == null) {
    throw new Error(
      `Changing state from "${prevState.state}" by event "${event.type}" is not allowed.`
    )
  }

  if ('data' in event) {
    return { state: nextStateName, data: event.data } as TUiState
  } else {
    return { state: nextStateName } as TUiState
  }
}

export function useSelectionMachine({
  currentSnapshot,
  commitNewSnapshot,
  replaceCurrentSnapshotByReplacingElements,
  canvasForMeasureRef,
}: {
  currentSnapshot: TSnapshot
  commitNewSnapshot: TCommitNewSnapshotFn
  replaceCurrentSnapshotByReplacingElements: (arg: TReplaceCurrentSnapshotParam) => void
  canvasForMeasureRef: React.MutableRefObject<HTMLCanvasElement | null>
}) {
  const [uiState, dispatch] = useReducer(reducer, { state: 'none' })

  const actionOfResetEvent = useCallback(() => {
    dispatch({
      type: 'reset',
    })
  }, [])

  const actions = {
    none: {
      [mapPrevToNextState.none.prepareMove.eventName]: actionOfPrepareMoveEvent,
      [mapPrevToNextState.none.prepareDragSelect.eventName]: actionOfPrepareDragSelectEvent,
    },
    readyToMove: {
      [mapPrevToNextState.readyToMove.startMove.eventName]: () => {
        const prevState = uiState
        switch (prevState.state) {
          case 'readyToMove':
            commitNewSnapshot({ mode: 'clone' })
            dispatch({ type: 'startMove', data: [...prevState.data] })
            return
          default:
            throw new Error(
              `For previous ${prevState.state} state -> startMove event, there is no action implemented.`
            )
        }
      },
      [mapPrevToNextState.readyToMove.selectSingleElement.eventName]: () => {
        const prevState = uiState
        switch (prevState.state) {
          case 'readyToMove':
            dispatch({
              type: 'selectSingleElement',
              data: { elementId: prevState.data[0]!.elementId },
            })
            return
          default:
            throw new Error(
              `For previous ${prevState.state} state -> selectSingleElement event, there is no action implemented.`
            )
        }
      },
      [mapPrevToNextState.readyToMove.selectMultipleElements.eventName]: () => {
        const prevState = uiState
        switch (prevState.state) {
          case 'readyToMove':
            dispatch({
              type: 'selectMultipleElements',
              data: { elementIds: prevState.data.map((moveData) => moveData.elementId) },
            })
            return
          default:
            throw new Error(
              `For previous ${prevState.state} state -> selectMultipleElements event, there is no action implemented.`
            )
        }
      },
      [mapPrevToNextState.readyToMove.reset.eventName]: actionOfResetEvent,
    },
    moving: {
      [mapPrevToNextState.moving.continueMove.eventName]: ({
        sceneX,
        sceneY,
      }: {
        sceneX: number
        sceneY: number
      }) => {
        const prevState = uiState
        switch (prevState.state) {
          case 'moving': {
            // all moving elements(new elements), will be used to replace the current snapshot
            let replacedMultiElements: TElementData[] = createMovedElements({
              moveDataArray: prevState.data,
              getOriginalElementFromId: (id) =>
                getSingleElementInSnapshot({ snapshot: currentSnapshot, elementId: id }),
              canvasForMeasureTextRef: canvasForMeasureRef,
              newPointerSceneX: sceneX,
              newPointerSceneY: sceneY,
            })
            // side effect
            replaceCurrentSnapshotByReplacingElements({ replacedMultiElements })
            // move to the next state of the state machine
            dispatch({ type: 'continueMove', data: [...prevState.data] })
            return
          }
          default:
            throw new Error(
              `For previous ${prevState.state} state -> continueMove event, there is no action implemented.`
            )
        }
      },
      [mapPrevToNextState.moving.selectSingleElement.eventName]: () => {
        const prevState = uiState
        switch (prevState.state) {
          case 'moving':
            dispatch({
              type: 'selectSingleElement',
              data: { elementId: prevState.data[0]!.elementId },
            })
            return
          default:
            throw new Error(
              `For previous ${prevState.state} state -> selectSingleElement event, there is no action implemented.`
            )
        }
      },
      [mapPrevToNextState.moving.selectMultipleElements.eventName]: () => {
        const prevState = uiState
        switch (prevState.state) {
          case 'moving':
            dispatch({
              type: 'selectMultipleElements',
              data: { elementIds: prevState.data.map((moveData) => moveData.elementId) },
            })
            return
          default:
            throw new Error(
              `For previous ${prevState.state} state -> selectMultipleElements event, there is no action implemented.`
            )
        }
      },
      [mapPrevToNextState.moving.reset.eventName]: actionOfResetEvent,
    },
    readyToResize: {
      [mapPrevToNextState.readyToResize.startResize.eventName]: () => {
        const prevState = uiState
        switch (prevState.state) {
          case 'readyToResize':
            commitNewSnapshot({ mode: 'clone' })
            dispatch({ type: 'startResize', data: { ...prevState.data } })
            return
          default:
            throw new Error(
              `For previous ${prevState.state} state -> startResize event, there is no action implemented.`
            )
        }
      },
      [mapPrevToNextState.readyToResize.selectSingleElement.eventName]: () => {
        const prevState = uiState
        switch (prevState.state) {
          case 'readyToResize':
            dispatch({
              type: 'selectSingleElement',
              data: { elementId: prevState.data.elementId },
            })
            return
          default:
            throw new Error(
              `For previous ${prevState.state} state -> selectSingleElement event, there is no action implemented.`
            )
        }
      },
      [mapPrevToNextState.readyToResize.reset.eventName]: actionOfResetEvent,
    },
    resizing: {
      [mapPrevToNextState.resizing.continueResize.eventName]: ({
        sceneX,
        sceneY,
      }: {
        sceneX: number
        sceneY: number
      }) => {
        const prevState = uiState
        switch (prevState.state) {
          case 'resizing': {
            // replace this specific element
            const resizingElementId = prevState.data.elementId

            const resizingElement = getSingleElementInSnapshot({
              snapshot: currentSnapshot,
              elementId: resizingElementId,
            })
            if (!resizingElement) {
              throw new Error(
                'You are trying to resize an non-exist element in the current snapshot!!'
              )
            }

            if (
              (prevState.data.elementType === 'line' && resizingElement.type === 'line') ||
              (prevState.data.elementType === 'arrow' && resizingElement.type === 'arrow')
            ) {
              if (prevState.data.pointerPosition === 'start') {
                const newElementWithoutId = createLinearElementWithoutId({
                  lineType: resizingElement.type,
                  x1: sceneX,
                  y1: sceneY,
                  x2: resizingElement.x2,
                  y2: resizingElement.y2,
                })
                replaceCurrentSnapshotByReplacingElements({
                  replacedElement: { ...newElementWithoutId, id: resizingElementId },
                })
                dispatch({
                  type: 'continueResize',
                  data: { ...prevState.data },
                })
                return
              } else if (prevState.data.pointerPosition === 'end') {
                const newElementWithoutId = createLinearElementWithoutId({
                  lineType: resizingElement.type,
                  x1: resizingElement.x1,
                  y1: resizingElement.y1,
                  x2: sceneX,
                  y2: sceneY,
                })
                replaceCurrentSnapshotByReplacingElements({
                  replacedElement: { ...newElementWithoutId, id: resizingElementId },
                })
                dispatch({
                  type: 'continueResize',
                  data: { ...prevState.data },
                })
                return
              }
              // should not reach here
              throw new Error(
                'While resizing a line or arrow, the pointer position is not at either end of the line.'
              )
            } else if (
              prevState.data.elementType === 'rectangle' &&
              resizingElement.type === 'rectangle'
            ) {
              const newElementWithoutId = resizeRectangleElement({
                newPointerPosition: { x: sceneX, y: sceneY },
                pointerStartedAt: prevState.data.pointerPosition,
                rectElementToResize: resizingElement,
              })
              replaceCurrentSnapshotByReplacingElements({
                replacedElement: { ...newElementWithoutId, id: resizingElementId },
              })
              dispatch({
                type: 'continueResize',
                data: { ...prevState.data },
              })
              return
            } else if (prevState.data.elementType === 'image' && resizingElement.type === 'image') {
              const newElementWithoutId = resizeImageElement({
                newPointerPosition: { x: sceneX, y: sceneY },
                pointerStartedAt: prevState.data.pointerPosition,
                imageElementToResize: resizingElement,
              })
              replaceCurrentSnapshotByReplacingElements({
                replacedElement: { ...newElementWithoutId, id: resizingElementId },
              })
              dispatch({
                type: 'continueResize',
                data: { ...prevState.data },
              })
              return
            } else {
              throw new Error(
                '1. Mismatch between resizing element type and actual element type in the snapshot\n-or-\n2. Unsupported element type for resizing'
              )
            }
          }
          default:
            throw new Error(
              `For previous ${prevState.state} state -> continueResize event, there is no action implemented.`
            )
        }
      },
      [mapPrevToNextState.readyToResize.selectSingleElement.eventName]: () => {
        const prevState = uiState
        switch (prevState.state) {
          case 'resizing':
            dispatch({
              type: 'selectSingleElement',
              data: { elementId: prevState.data.elementId },
            })
            return
          default:
            throw new Error(
              `For previous ${prevState.state} state -> selectSingleElement event, there is no action implemented.`
            )
        }
      },
      [mapPrevToNextState.resizing.flipThenSelectRectangle.eventName]: () => {
        const prevState = uiState
        switch (prevState.state) {
          case 'resizing': {
            const resizingElementId = prevState.data.elementId
            const resizingElement = getSingleElementInSnapshot({
              snapshot: currentSnapshot,
              elementId: resizingElementId,
            })
            if (!resizingElement || resizingElement.type !== 'rectangle') {
              throw new Error('The resizing element is not a "rectangle" element')
            }
            const { newX1, newX2, newY1, newY2 } = adjustRectangleCoordinates(resizingElement)
            const newElementWithoutId = createRectangleElementWithoutId({
              x1: newX1,
              y1: newY1,
              width: newX2 - newX1,
              height: newY2 - newY1,
            })
            replaceCurrentSnapshotByReplacingElements({
              replacedElement: { ...newElementWithoutId, id: resizingElementId },
            })
            dispatch({
              type: 'flipThenSelectRectangle',
              data: { elementId: resizingElementId },
            })
            return
          }
          default:
            throw new Error(
              `For previous ${prevState.state} state -> flipThenSelectRectangle event, there is no action implemented.`
            )
        }
      },
      [mapPrevToNextState.resizing.reset.eventName]: actionOfResetEvent,
    },
    areaSelecting: {
      [mapPrevToNextState.areaSelecting.dragSelect.eventName]: ({
        sceneX,
        sceneY,
      }: {
        sceneX: number
        sceneY: number
      }) => {
        const prevState = uiState
        switch (prevState.state) {
          case 'areaSelecting':
            dispatch({
              type: 'dragSelect',
              data: {
                rectangleSelector: {
                  type: 'rectangleSelector',
                  x1: prevState.data.rectangleSelector.x1,
                  y1: prevState.data.rectangleSelector.y1,
                  x2: sceneX,
                  y2: sceneY,
                },
                selectedElementIds: getAllElementIdsInsideRectSelector({
                  elementsSnapshot: currentSnapshot,
                  rectSelectorX1: prevState.data.rectangleSelector.x1,
                  rectSelectorY1: prevState.data.rectangleSelector.y1,
                  rectSelectorX2: sceneX,
                  rectSelectorY2: sceneY,
                }),
              },
            })
            return
          default:
            throw new Error(
              `For previous ${prevState.state} state -> dragSelect event, there is no action implemented.`
            )
        }
      },
      [mapPrevToNextState.areaSelecting.selectSingleElement.eventName]: () => {
        const prevState = uiState
        switch (prevState.state) {
          case 'areaSelecting':
            dispatch({
              type: 'selectSingleElement',
              data: {
                elementId: prevState.data.selectedElementIds[0]!,
              },
            })
            return
          default:
            throw new Error(
              `For previous ${prevState.state} state -> selectSingleElement event, there is no action implemented.`
            )
        }
      },
      [mapPrevToNextState.areaSelecting.selectMultipleElements.eventName]: () => {
        const prevState = uiState
        switch (prevState.state) {
          case 'areaSelecting':
            dispatch({
              type: 'selectMultipleElements',
              data: {
                elementIds: prevState.data.selectedElementIds,
              },
            })
            return
          default:
            throw new Error(
              `For previous ${prevState.state} state -> selectMultipleElements event, there is no action implemented.`
            )
        }
      },
      [mapPrevToNextState.areaSelecting.reset.eventName]: actionOfResetEvent,
    },
    singleElementSelected: {
      [mapPrevToNextState.singleElementSelected.prepareMove.eventName]: actionOfPrepareMoveEvent,
      [mapPrevToNextState.singleElementSelected.prepareResize.eventName]: ({
        elementToResize,
        pointerPosition,
      }: {
        elementToResize: TElementData
        pointerPosition: 'start' | 'end' | 'tl' | 'tr' | 'br' | 'bl'
      }) => {
        dispatch({
          type: 'prepareResize',
          data: createResizeData({
            targetElement: elementToResize,
            pointerPosition: pointerPosition,
          }),
        })
      },
      [mapPrevToNextState.singleElementSelected.prepareDragSelect.eventName]:
        actionOfPrepareDragSelectEvent,
      [mapPrevToNextState.singleElementSelected.reset.eventName]: actionOfResetEvent,
      [mapPrevToNextState.singleElementSelected.removeSelectedElements.eventName]: () => {
        const prevState = uiState
        switch (prevState.state) {
          case 'singleElementSelected':
            commitNewSnapshot({ mode: 'removeElements', elementIds: [prevState.data.elementId] })
            dispatch({ type: 'reset' })
            return
          default:
            throw new Error(
              `For previous ${prevState.state} state -> removeSelectedElements event, there is no action implemented.`
            )
        }
      },
      [mapPrevToNextState.singleElementSelected.duplicateSelectedSingleElements.eventName]: ({
        originalElementId,
      }: {
        originalElementId: number
      }) => {
        // Steps:
        // 1. Get a selected element(i.e. original element which will be duplicated)
        const originalElement = getSingleElementInSnapshot({
          snapshot: currentSnapshot,
          elementId: originalElementId,
        })
        if (!originalElement) {
          throw new Error('Cannot get an original element to duplicate(its id is not found)')
        }
        // 2. Create a duplicated element which is moved a bit from the original element
        // Simulate "move" feature
        const moveDistanceSceneY = 50
        const moveDataArray = createMoveDataArray({
          targetElements: [originalElement],
          pointerX: 0,
          pointerY: 0,
        })
        const newDuplicatedElements = createMovedElements({
          moveDataArray: moveDataArray,
          getOriginalElementFromId: (id) => originalElement,
          canvasForMeasureTextRef: canvasForMeasureRef,
          newPointerSceneX: 0,
          newPointerSceneY: moveDistanceSceneY,
        })
        // 3. (Side effect) Commit the duplicated element to snapshot in addElements mode
        // The duplicated element will also get a new id
        const newIds = commitNewSnapshot({
          mode: 'addElements',
          newElementWithoutIds: newDuplicatedElements,
        })
        // 4. Move to the next state of the state machine (it's the same state as the previous state in this case)
        if (newIds === undefined || newIds[0] == null) {
          throw new Error('ID of a new duplicated element is missing')
        }
        // We switch to select the new duplicated element, instead of the original element
        dispatch({ type: 'duplicateSelectedSingleElements', data: { elementId: newIds[0] } })
      },
    },
    multiElementSelected: {
      [mapPrevToNextState.multiElementSelected.prepareMove.eventName]: actionOfPrepareMoveEvent,
      [mapPrevToNextState.multiElementSelected.prepareDragSelect.eventName]:
        actionOfPrepareDragSelectEvent,
      [mapPrevToNextState.multiElementSelected.reset.eventName]: actionOfResetEvent,
      [mapPrevToNextState.multiElementSelected.removeSelectedElements.eventName]: () => {
        const prevState = uiState
        switch (prevState.state) {
          case 'multiElementSelected':
            commitNewSnapshot({ mode: 'removeElements', elementIds: prevState.data.elementIds })
            dispatch({ type: 'reset' })
            return
          default:
            throw new Error(
              `For previous ${prevState.state} state -> removeSelectedElements event, there is no action implemented.`
            )
        }
      },
      [mapPrevToNextState.multiElementSelected.duplicateSelectedMultipleElements.eventName]: ({
        originalElementIds,
      }: {
        originalElementIds: number[]
      }) => {
        // Steps are similar to `duplicateSelectedSingleElements`. Read its comments for explanation.
        const originalElements = getMultiElementsInSnapshot({
          snapshot: currentSnapshot,
          elementIds: originalElementIds,
        })
        const moveDistanceSceneY = 50
        const moveDataArray = createMoveDataArray({
          targetElements: originalElements,
          pointerX: 0,
          pointerY: 0,
        })
        const newDuplicatedElements = createMovedElements({
          moveDataArray: moveDataArray,
          getOriginalElementFromId: (id) => originalElements.find((element) => element.id === id),
          canvasForMeasureTextRef: canvasForMeasureRef,
          newPointerSceneX: 0,
          newPointerSceneY: moveDistanceSceneY,
        })
        const newIds = commitNewSnapshot({
          mode: 'addElements',
          newElementWithoutIds: newDuplicatedElements,
        })
        if (newIds === undefined || newIds.length !== originalElements.length) {
          throw new Error('Some IDs of new duplicated elements are missing')
        }
        // We switch to select the new duplicated elements, instead of the original elements
        dispatch({ type: 'duplicateSelectedMultipleElements', data: { elementIds: newIds } })
      },
    },
  } as const

  // actions which have the same implementation across prevState & eventName

  function actionOfPrepareMoveEvent({
    sceneX,
    sceneY,
    elementsToMove,
  }: {
    sceneX: number
    sceneY: number
    elementsToMove: TElementData[]
  }) {
    dispatch({
      type: 'prepareMove',
      data: createMoveDataArray({
        targetElements: elementsToMove,
        pointerX: sceneX,
        pointerY: sceneY,
      }),
    })
  }

  function actionOfPrepareDragSelectEvent({ sceneX, sceneY }: { sceneX: number; sceneY: number }) {
    dispatch({
      type: 'prepareDragSelect',
      data: {
        rectangleSelector: {
          type: 'rectangleSelector',
          x1: sceneX,
          y1: sceneY,
          x2: sceneX,
          y2: sceneY,
        },
        selectedElementIds: [],
      },
    })
  }

  //  return of this hook
  return { uiState, actions }
}

function getAllElementIdsInsideRectSelector({
  elementsSnapshot,
  rectSelectorX1,
  rectSelectorX2,
  rectSelectorY1,
  rectSelectorY2,
}: {
  elementsSnapshot: TElementData[]
  rectSelectorX1: number
  rectSelectorY1: number
  rectSelectorX2: number
  rectSelectorY2: number
}) {
  const selectedElements = elementsSnapshot.filter((element) => {
    const rectMinX = Math.min(rectSelectorX1, rectSelectorX2)
    const rectMaxX = Math.max(rectSelectorX1, rectSelectorX2)
    const rectMinY = Math.min(rectSelectorY1, rectSelectorY2)
    const rectMaxY = Math.max(rectSelectorY1, rectSelectorY2)
    if (element.type === 'arrow' || element.type === 'line') {
      if (
        rectMinX <= element.x1 &&
        element.x1 <= rectMaxX &&
        rectMinY <= element.y1 &&
        element.y1 <= rectMaxY &&
        rectMinX <= element.x2 &&
        element.x2 <= rectMaxX &&
        rectMinY <= element.y2 &&
        element.y2 <= rectMaxY
      ) {
        return true
      }
    } else if (element.type === 'rectangle' || element.type === 'image') {
      const elmMinX = Math.min(element.x1, element.x2)
      const elmMaxX = Math.max(element.x1, element.x2)
      const elmMinY = Math.min(element.y1, element.y2)
      const elmMaxY = Math.max(element.y1, element.y2)
      if (
        rectMinX <= elmMinX &&
        elmMinX <= rectMaxX &&
        rectMinX <= elmMaxX &&
        elmMaxX <= rectMaxX &&
        rectMinY <= elmMinY &&
        elmMinY <= rectMaxY &&
        rectMinY <= elmMaxY &&
        elmMaxY <= rectMaxY
      ) {
        return true
      }
    } else if (element.type === 'text') {
      const elmMinX = element.lines[0]?.lineX1 ?? -Infinity
      const elmMinY = element.lines[0]?.lineY1 ?? -Infinity
      const elmMaxY =
        (element.lines.at(-1)?.lineY1 ?? Infinity) + (element.lines.at(-1)?.lineHeight ?? Infinity)
      let elmMaxX = -Infinity
      element.lines.forEach((line) => {
        elmMaxX = Math.max(line.lineX1 + line.lineWidth, elmMaxX)
      })
      if (elmMaxX === -Infinity) elmMaxX = Infinity

      if (
        rectMinX <= elmMinX &&
        elmMinX <= rectMaxX &&
        rectMinX <= elmMaxX &&
        elmMaxX <= rectMaxX &&
        rectMinY <= elmMinY &&
        elmMinY <= rectMaxY &&
        rectMinY <= elmMaxY &&
        elmMaxY <= rectMaxY
      ) {
        return true
      }
    } else if (element.type === 'pencil') {
      const isInside = element.points.every((point) => {
        if (
          rectMinX <= point.x &&
          point.x <= rectMaxX &&
          rectMinY <= point.y &&
          point.y <= rectMaxY
        ) {
          return true
        }
        return false
      })
      return isInside
    }
    return false
  })
  return selectedElements.map((element) => element.id)
}

function createMoveDataArray({
  targetElements,
  pointerX,
  pointerY,
}: {
  targetElements: TElementData[]
  pointerX: number
  pointerY: number
}): TMoveData[] {
  return targetElements.map((targetElement) => {
    switch (targetElement.type) {
      case 'line':
      case 'arrow':
        return {
          elementType: targetElement.type,
          elementId: targetElement.id,
          pointerOffsetX1: pointerX - targetElement.x1,
          pointerOffsetY1: pointerY - targetElement.y1,
        }
      case 'rectangle':
      case 'image':
        return {
          elementType: targetElement.type,
          elementId: targetElement.id,
          pointerOffsetX1: pointerX - targetElement.x1,
          pointerOffsetY1: pointerY - targetElement.y1,
        }
      case 'pencil':
        return {
          elementType: 'pencil',
          elementId: targetElement.id,
          pointerOffsetFromPoints: targetElement.points.map((point) => ({
            offsetX: pointerX - point.x,
            offsetY: pointerY - point.y,
          })),
        }
      case 'text':
        return {
          elementType: 'text',
          elementId: targetElement.id,
          pointerOffsetX1: pointerX - (targetElement.lines[0]?.lineX1 ?? pointerX),
          pointerOffsetY1: pointerY - (targetElement.lines[0]?.lineY1 ?? pointerY),
          content: targetElement.lines.map(({ lineContent }) => lineContent).join('\n'),
        }
      default:
        throw new Error('Unsupported moving element type')
    }
  })
}

function createResizeData({
  targetElement,
  pointerPosition,
}: {
  targetElement: TElementData
  pointerPosition: 'start' | 'end' | 'tl' | 'tr' | 'bl' | 'br'
}): TResizeData {
  switch (targetElement.type) {
    case 'line':
    case 'arrow':
      if (pointerPosition !== 'start' && pointerPosition !== 'end') {
        throw new Error('Impossible pointer position for resizing a linear element')
      }
      return {
        elementType: targetElement.type,
        elementId: targetElement.id,
        pointerPosition: pointerPosition,
      }
    case 'rectangle':
    case 'image':
      if (
        pointerPosition !== 'tl' &&
        pointerPosition !== 'tr' &&
        pointerPosition !== 'bl' &&
        pointerPosition !== 'br'
      ) {
        throw new Error('Impossible pointer position for resizing a rectangle or image element')
      }
      return {
        elementType: targetElement.type,
        elementId: targetElement.id,
        pointerPosition: pointerPosition,
      }
    default:
      throw new Error('Unsupported resizing element type')
  }
}

function createMovedElements({
  moveDataArray,
  getOriginalElementFromId,
  canvasForMeasureTextRef,
  newPointerSceneX,
  newPointerSceneY,
}: {
  moveDataArray: TMoveData[]
  getOriginalElementFromId: (elementId: number) => TElementData | undefined
  canvasForMeasureTextRef: React.MutableRefObject<HTMLCanvasElement | null>
  newPointerSceneX: number
  newPointerSceneY: number
}) {
  // store all moved elements (i.e. new elements which are the result of moving)
  let newMovedElements: TElementData[] = []

  // create new moved element, one-by-one
  moveDataArray.forEach((moveData) => {
    const movingElementId = moveData.elementId

    const elementBeforeMove = getOriginalElementFromId(movingElementId)
    if (!elementBeforeMove) {
      throw new Error('You are trying to move an non-existing element(cannot find it by its id)')
    }
    if (
      (moveData.elementType === 'line' && elementBeforeMove.type === 'line') ||
      (moveData.elementType === 'arrow' && elementBeforeMove.type === 'arrow')
    ) {
      const newX1 = newPointerSceneX - moveData.pointerOffsetX1
      const newY1 = newPointerSceneY - moveData.pointerOffsetY1
      // keep existing line width
      const distanceX = elementBeforeMove.x2 - elementBeforeMove.x1
      const distanceY = elementBeforeMove.y2 - elementBeforeMove.y1
      const newElementWithoutId = createLinearElementWithoutId({
        lineType: elementBeforeMove.type,
        x1: newX1,
        y1: newY1,
        x2: newX1 + distanceX,
        y2: newY1 + distanceY,
      })
      newMovedElements.push({ ...newElementWithoutId, id: movingElementId })
      // continue forEach loop
      return
    } else if (moveData.elementType === 'rectangle' && elementBeforeMove.type === 'rectangle') {
      const newX1 = newPointerSceneX - moveData.pointerOffsetX1
      const newY1 = newPointerSceneY - moveData.pointerOffsetY1
      const newElementWithoutId = moveRectangleElement({
        newX1: newX1,
        newY1: newY1,
        rectElementToMove: elementBeforeMove,
      })
      newMovedElements.push({ ...newElementWithoutId, id: movingElementId })
      // continue forEach loop
      return
    } else if (moveData.elementType === 'image' && elementBeforeMove.type === 'image') {
      const newX1 = newPointerSceneX - moveData.pointerOffsetX1
      const newY1 = newPointerSceneY - moveData.pointerOffsetY1
      const newElementWithoutId = moveImageElement({
        newX1: newX1,
        newY1: newY1,
        imageElementToMove: elementBeforeMove,
      })
      newMovedElements.push({ ...newElementWithoutId, id: movingElementId })
      // continue forEach loop
      return
    } else if (moveData.elementType === 'pencil' && elementBeforeMove.type === 'pencil') {
      const newPoints = moveData.pointerOffsetFromPoints.map(({ offsetX, offsetY }) => ({
        x: newPointerSceneX - offsetX,
        y: newPointerSceneY - offsetY,
      }))
      const newElement: TElementData = {
        id: movingElementId,
        type: 'pencil',
        points: newPoints,
      }
      newMovedElements.push(newElement)
      // continue forEach loop
      return
    } else if (moveData.elementType === 'text' && elementBeforeMove.type === 'text') {
      const newElementWithoutId = createTextElementWithoutId({
        canvasForMeasure: canvasForMeasureTextRef.current,
        content: moveData.content,
        isWriting: false,
        x1: newPointerSceneX - moveData.pointerOffsetX1,
        y1: newPointerSceneY - moveData.pointerOffsetY1,
      })
      newMovedElements.push({ ...newElementWithoutId, id: movingElementId })
      // continue forEach loop
      return
    } else {
      throw new Error(
        '1. Mismatch between moving element type and actual element type\n-or-\n2. Unsupported element type for moving'
      )
    }
  })

  return newMovedElements
}
