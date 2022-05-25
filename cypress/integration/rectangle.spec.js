it('should be able to create a rectangle', () => {
  cy.visit('http://localhost:3000/')

  cy.get('img[alt="rectangle"]').click()
  cy.get('#root')
    .trigger('pointerdown', {
      clientX: 100,
      clientY: 100,
    })
    .trigger('pointermove', {
      clientX: 200,
      clientY: 300,
    })
    .trigger('pointerup', {
      clientX: 200,
      clientY: 300,
    })
    .trigger('pointermove', {
      clientX: 250,
      clientY: 350,
    })

  cy.compareSnapshot('happy-path-rectangle')
})
