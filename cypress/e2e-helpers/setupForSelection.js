export const line = {
  startX: 100,
  startY: 200,
  middleX: 120,
  middleY: 250,
  endX: 120,
  endY: 300,
}
export const rectangle = {
  startX: 140,
  startY: 300,
  middleX: 240,
  middleY: 300,
  endX: 240,
  endY: 200,
}
export const text = {
  clickToWriteX: 260,
  clickToWriteY: 200,
  clickOutsideX: 50,
  clickOutsideY: 200,
}
export const arrow = {
  startX: 400,
  startY: 300,
  middleX: 440,
  middleY: 400,
  endX: 440,
  endY: 200,
}

export function createAllElements() {
  cy.visit('http://localhost:3000/')
  cy.findAllByRole('button', { name: 'fitToScreen' }).first().click()

  cy.findByRole('img', { name: 'line' }).click()
  cy.get('#root')
    // start
    .trigger('pointerdown', {
      clientX: line.startX,
      clientY: line.startY,
      isPrimary: true,
    })
    // in the middle
    .trigger('pointermove', {
      clientX: line.middleX,
      clientY: line.middleY,
      isPrimary: true,
    })
    // end
    .trigger('pointermove', {
      clientX: line.endX,
      clientY: line.endY,
      isPrimary: true,
    })
    .trigger('pointerup', {
      clientX: line.endX,
      clientY: line.endY,
      isPrimary: true,
    })

  cy.findByRole('img', { name: 'rectangle' }).click()
  cy.get('#root')
    // start
    .trigger('pointerdown', {
      clientX: rectangle.startX,
      clientY: rectangle.startY,
      isPrimary: true,
    })
    // in the middle
    .trigger('pointermove', {
      clientX: rectangle.middleX,
      clientY: rectangle.middleY,
      isPrimary: true,
    })
    // end
    .trigger('pointermove', {
      clientX: rectangle.endX,
      clientY: rectangle.endY,
      isPrimary: true,
    })
    .trigger('pointerup', {
      clientX: rectangle.endX,
      clientY: rectangle.endY,
      isPrimary: true,
    })

  cy.findByRole('img', { name: 'text' }).click()
  cy.get('#root').click(text.clickToWriteX, text.clickToWriteY)
  cy.findByRole('textbox').type('Test{enter}Multi-line{enter}Text')
  cy.get('#root').click(text.clickOutsideX, text.clickOutsideY)

  cy.findByRole('img', { name: 'arrow' }).click()
  cy.get('#root')
    // start
    .trigger('pointerdown', {
      clientX: arrow.startX,
      clientY: arrow.startY,
      isPrimary: true,
    })
    // in the middle
    .trigger('pointermove', {
      clientX: arrow.middleX,
      clientY: arrow.middleY,
      isPrimary: true,
    })
    // end
    .trigger('pointermove', {
      clientX: arrow.endX,
      clientY: arrow.endY,
      isPrimary: true,
    })
    .trigger('pointerup', {
      clientX: arrow.endX,
      clientY: arrow.endY,
      isPrimary: true,
    })

  cy.findByRole('img', { name: 'selection' }).click()
}
