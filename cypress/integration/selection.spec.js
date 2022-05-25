beforeEach(() => {
  cy.visit('http://localhost:3000/')

  cy.findByRole('img', { name: 'line' }).click()
  cy.get('#root')
    // start
    .trigger('pointerdown', {
      clientX: 100,
      clientY: 200,
    })
    // in the middle
    .trigger('pointermove', {
      clientX: 120,
      clientY: 250,
    })
    // end
    .trigger('pointermove', {
      clientX: 120,
      clientY: 300,
    })
    .trigger('pointerup', {
      clientX: 120,
      clientY: 300,
    })

  cy.findByRole('img', { name: 'rectangle' }).click()
  cy.get('#root')
    // start
    .trigger('pointerdown', {
      clientX: 140,
      clientY: 300,
    })
    // in the middle
    .trigger('pointermove', {
      clientX: 240,
      clientY: 300,
    })
    // end
    .trigger('pointermove', {
      clientX: 240,
      clientY: 200,
    })
    .trigger('pointerup', {
      clientX: 240,
      clientY: 200,
    })

  cy.findByRole('img', { name: 'text' }).click()
  cy.get('#root').click(260, 200)
  cy.findByRole('textbox').type('Test{enter}Multi-line{enter}Text')
  cy.get('#root').click(50, 200)

  cy.findByRole('img', { name: 'arrow' }).click()
  cy.get('#root')
    // start
    .trigger('pointerdown', {
      clientX: 400,
      clientY: 300,
    })
    // in the middle
    .trigger('pointermove', {
      clientX: 440,
      clientY: 400,
    })
    // end
    .trigger('pointermove', {
      clientX: 440,
      clientY: 200,
    })
    .trigger('pointerup', {
      clientX: 440,
      clientY: 200,
    })

  cy.findByRole('img', { name: 'selection' }).click()
})

it('should be able to select a single element and move', () => {
  // Select & Move line +20px on y-axis
  cy.get('#root')
    // start
    .trigger('pointerdown', {
      clientX: 100,
      clientY: 200,
    })
    // in the middle
    .trigger('pointermove', {
      clientX: 100,
      clientY: 210,
    })
    // end
    .trigger('pointermove', {
      clientX: 100,
      clientY: 220,
    })
    .trigger('pointerup', {
      clientX: 100,
      clientY: 220,
    })

  // Select & Move rectangle -20px on y-axis
  cy.get('#root')
    // start
    .trigger('pointerdown', {
      clientX: 150,
      clientY: 300,
    })
    // in the middle
    .trigger('pointermove', {
      clientX: 150,
      clientY: 300,
    })
    // end
    .trigger('pointermove', {
      clientX: 150,
      clientY: 280,
    })
    .trigger('pointerup', {
      clientX: 150,
      clientY: 280,
    })

  // Select & Move text +20px on y-axis
  cy.get('#root')
    // start
    .trigger('pointerdown', {
      clientX: 270,
      clientY: 210,
    })
    // in the middle
    .trigger('pointermove', {
      clientX: 270,
      clientY: 260,
    })
    // end
    .trigger('pointermove', {
      clientX: 270,
      clientY: 230,
    })
    .trigger('pointerup', {
      clientX: 270,
      clientY: 230,
    })

  // Select & Move arrow -20px on y-axis
  cy.get('#root')
    // start
    .trigger('pointerdown', {
      clientX: 440,
      clientY: 200,
    })
    // in the middle
    .trigger('pointermove', {
      clientX: 340,
      clientY: 300,
    })
    // end
    .trigger('pointermove', {
      clientX: 440,
      clientY: 180,
    })
    .trigger('pointerup', {
      clientX: 440,
      clientY: 180,
    })

  cy.compareSnapshot('moved-elem-one-by-one')
})
