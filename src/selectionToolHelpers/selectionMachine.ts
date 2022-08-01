import { assign, createMachine } from 'xstate'

type TContext = {
  elementType: string
  elementId: number
  pointerOffsetX1: number
  pointerOffsetY1: number
  pointerOffsetFromPoints: { offsetX: number; offsetY: number }[]
  content: string
}

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
type TDOWN_ON_ELEMENT = { type: 'DOWN_ON_ELEMENT' } & TMoveData

export const selectionMachine = createMachine({
  schema: {
    context: {} as TContext,
    events: {} as TDOWN_ON_ELEMENT,
  },
  id: 'selection',
  context: {
    elementType: '',
    elementId: -1,
    pointerOffsetX1: 0,
    pointerOffsetY1: 0,
    pointerOffsetFromPoints: [],
    content: '',
  },
  initial: 'none',
  states: {
    none: {
      on: {
        DOWN_ON_ELEMENT: {
          target: 'move',
          actions: [
            'prepareMove',
            assign<TContext, TDOWN_ON_ELEMENT>((context, event) => {
              return {
                ...context,
                ...event,
              }
            }),
          ],
        },
      },
    },
    move: {
      id: 'move',
      initial: 'readyToMove',
      states: {
        readyToMove: {
          on: {
            FIRST_MOVE: { target: 'moving', actions: 'startMove' },
            UP_WITHOUT_MOVE: {
              target: 'selection.singleElementSelected',
              actions: 'selectElement',
            },
          },
        },
        moving: {
          on: {
            NEXT_MOVE: { target: 'moving', actions: 'continueMove' },
            UP_AFTER_MOVE: { target: 'selection.singleElementSelected', actions: 'selectElement' },
          },
        },
      },
    },
    singleElementSelected: {
      on: {
        DOWN_ON_ELEMENT: { target: 'move', actions: 'prepareMove' },
        RESET: 'none',
      },
    },
  },
})
