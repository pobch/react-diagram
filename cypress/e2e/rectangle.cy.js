it('should be able to create a rectangle', () => {
  cy.visit('http://localhost:3000/')
  cy.findAllByRole('button', { name: 'fitToScreen' }).first().click()

  cy.findByRole('img', { name: 'rectangle' }).click()
  cy.get('#root')
    .trigger('pointerdown', {
      clientX: 100,
      clientY: 100,
      isPrimary: true,
    })
    .trigger('pointermove', {
      clientX: 200,
      clientY: 300,
      isPrimary: true,
    })
    .trigger('pointerup', {
      clientX: 200,
      clientY: 300,
      isPrimary: true,
    })
    .trigger('pointermove', {
      clientX: 250,
      clientY: 350,
      isPrimary: true,
    })

  cy.compareSnapshot('happy-path-rectangle')
})
