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

  cy.findByRole('img', { name: 'line' }).click()
  cy.get('#root')
    // start
    .trigger('pointerdown', {
      clientX: line.startX,
      clientY: line.startY,
    })
    // in the middle
    .trigger('pointermove', {
      clientX: line.middleX,
      clientY: line.middleY,
    })
    // end
    .trigger('pointermove', {
      clientX: line.endX,
      clientY: line.endY,
    })
    .trigger('pointerup', {
      clientX: line.endX,
      clientY: line.endY,
    })

  cy.findByRole('img', { name: 'rectangle' }).click()
  cy.get('#root')
    // start
    .trigger('pointerdown', {
      clientX: rectangle.startX,
      clientY: rectangle.startY,
    })
    // in the middle
    .trigger('pointermove', {
      clientX: rectangle.middleX,
      clientY: rectangle.middleY,
    })
    // end
    .trigger('pointermove', {
      clientX: rectangle.endX,
      clientY: rectangle.endY,
    })
    .trigger('pointerup', {
      clientX: rectangle.endX,
      clientY: rectangle.endY,
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
    })
    // in the middle
    .trigger('pointermove', {
      clientX: arrow.middleX,
      clientY: arrow.middleY,
    })
    // end
    .trigger('pointermove', {
      clientX: arrow.endX,
      clientY: arrow.endY,
    })
    .trigger('pointerup', {
      clientX: arrow.endX,
      clientY: arrow.endY,
    })

  cy.findByRole('img', { name: 'selection' }).click()
}
