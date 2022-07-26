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
      isPrimary: true,
    })
    // in the middle
    .trigger('pointermove', {
      clientX: line.startX,
      clientY: line.startY + 10,
      isPrimary: true,
    })
    // end
    .trigger('pointermove', {
      clientX: line.startX,
      clientY: line.startY + 20,
      isPrimary: true,
    })
    .trigger('pointerup', {
      clientX: line.startX,
      clientY: line.startY + 20,
      isPrimary: true,
    })

  // Select & Move rectangle -20px on y-axis
  cy.get('#root')
    // start
    .trigger('pointerdown', {
      clientX: rectangle.startX + 10,
      clientY: rectangle.startY,
      isPrimary: true,
    })
    // in the middle
    .trigger('pointermove', {
      clientX: rectangle.startX + 10,
      clientY: rectangle.startY - 10,
      isPrimary: true,
    })
    // end
    .trigger('pointermove', {
      clientX: rectangle.startX + 10,
      clientY: rectangle.startY - 20,
      isPrimary: true,
    })
    .trigger('pointerup', {
      clientX: rectangle.startX + 10,
      clientY: rectangle.startY - 20,
      isPrimary: true,
    })

  // Select & Move text +20px on y-axis
  cy.get('#root')
    // start
    .trigger('pointerdown', {
      clientX: text.clickToWriteX + 10,
      clientY: text.clickToWriteY + 10,
      isPrimary: true,
    })
    // in the middle
    .trigger('pointermove', {
      clientX: text.clickToWriteX + 10,
      clientY: text.clickToWriteY + 10 + 10,
      isPrimary: true,
    })
    // end
    .trigger('pointermove', {
      clientX: text.clickToWriteX + 10,
      clientY: text.clickToWriteY + 10 + 20,
      isPrimary: true,
    })
    .trigger('pointerup', {
      clientX: text.clickToWriteX + 10,
      clientY: text.clickToWriteY + 10 + 20,
      isPrimary: true,
    })

  // Select & Move arrow -20px on y-axis
  cy.get('#root')
    // start
    .trigger('pointerdown', {
      clientX: arrow.endX,
      clientY: arrow.endY,
      isPrimary: true,
    })
    // in the middle
    .trigger('pointermove', {
      clientX: arrow.endX,
      clientY: arrow.endY - 10,
      isPrimary: true,
    })
    // end
    .trigger('pointermove', {
      clientX: arrow.endX,
      clientY: arrow.endY - 20,
      isPrimary: true,
    })
    .trigger('pointerup', {
      clientX: arrow.endX,
      clientY: arrow.endY - 20,
      isPrimary: true,
    })

  cy.compareSnapshot('moved-elem-one-by-one')
})
