import { arrow, createAllElements, line, rectangle, text } from '../e2e-helpers/setupForSelection'

beforeEach(() => {
  createAllElements()
})

// TODO: Add pencil element into the test
it('should be able to select a single element and move', () => {
  // Select & Move line +20px on y-axis
  cy.get('#root')
    // start
    .trigger('pointerdown', {
      clientX: line.startX,
      clientY: line.startY,
    })
    // in the middle
    .trigger('pointermove', {
      clientX: line.startX,
      clientY: line.startY + 10,
    })
    // end
    .trigger('pointermove', {
      clientX: line.startX,
      clientY: line.startY + 20,
    })
    .trigger('pointerup', {
      clientX: line.startX,
      clientY: line.startY + 20,
    })

  // Select & Move rectangle -20px on y-axis
  cy.get('#root')
    // start
    .trigger('pointerdown', {
      clientX: rectangle.startX + 10,
      clientY: rectangle.startY,
    })
    // in the middle
    .trigger('pointermove', {
      clientX: rectangle.startX + 10,
      clientY: rectangle.startY - 10,
    })
    // end
    .trigger('pointermove', {
      clientX: rectangle.startX + 10,
      clientY: rectangle.startY - 20,
    })
    .trigger('pointerup', {
      clientX: rectangle.startX + 10,
      clientY: rectangle.startY - 20,
    })

  // Select & Move text +20px on y-axis
  cy.get('#root')
    // start
    .trigger('pointerdown', {
      clientX: text.clickToWriteX + 10,
      clientY: text.clickToWriteY + 10,
    })
    // in the middle
    .trigger('pointermove', {
      clientX: text.clickToWriteX + 10,
      clientY: text.clickToWriteY + 10 + 10,
    })
    // end
    .trigger('pointermove', {
      clientX: text.clickToWriteX + 10,
      clientY: text.clickToWriteY + 10 + 20,
    })
    .trigger('pointerup', {
      clientX: text.clickToWriteX + 10,
      clientY: text.clickToWriteY + 10 + 20,
    })

  // Select & Move arrow -20px on y-axis
  cy.get('#root')
    // start
    .trigger('pointerdown', {
      clientX: arrow.endX,
      clientY: arrow.endY,
    })
    // in the middle
    .trigger('pointermove', {
      clientX: arrow.endX,
      clientY: arrow.endY - 10,
    })
    // end
    .trigger('pointermove', {
      clientX: arrow.endX,
      clientY: arrow.endY - 20,
    })
    .trigger('pointerup', {
      clientX: arrow.endX,
      clientY: arrow.endY - 20,
    })

  cy.compareSnapshot('moved-elem-one-by-one')
})
