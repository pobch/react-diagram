# Diagram Drawing App (not mobile friendly)

A diagram drawing application demonstrating how we can utilize `React` and HTML `<canvas/>` to create an interactive drawing.

## Application URL

https://react-diagram.netlify.app/ (should open in desktop)

## Demo

https://user-images.githubusercontent.com/19894957/165162344-d48826a6-5169-4a2c-8403-6d4d94d4011f.mp4

## Feature Roadmap

- [x] Line drawing tool
- [x] Rectangle drawing tool
- [x] Pencil drawing tool(free-hand)
- [x] Selection tool for moving and resizing a single element
- [x] Undo/Redo/Clear
- [x] Text tool
- [x] Support deleting a selected element
- [x] Arrow drawing tool
  - https://stackoverflow.com/a/26806316
  - https://codesandbox.io/s/magical-feynman-mtuziv?file=/src/index.js
- [x] Pan feature
- [x] Zoom feature
- [x] CSS & Styling
- [ ] Mobile & Resizing friendly
- [x] Multi-select elements
- [ ] Copy & Paste elements
- [ ] Save the result to file / local storage
- [ ] Rotate feature
- [ ] Support uploading an image
- [ ] Export canvas to png/jpeg
- [ ] Setting stroke color
- [ ] Setting stroke width
- [ ] Filled rectangle feature

## Developer Notes

### Steps for running visual tests

1. Run `yarn visual:test` to do regression test
2. If there is any failed test, investigate it one-by-one. To override a specific screenshot, run the following command.
   ```bash
   # We want to override screenshots only for test-file.spec.js
   yarn cypress run --env type=base --config screenshotsFolder=cypress/snapshots/base,trashAssetsBeforeRuns=false --spec "cypress/integration/test-file.spec.js"
   ```
3. After fixing failed tests, run `yarn visual:test` again.
4. **Only after all tests are passed**, remove all existing screenshots and re-create them from scratch by running `visual:dangerously-override-all-base`. Note that, **this command is dangerous since you will lose all existing screenshots.**

Note: Tests may fail due to OS difference. All base screenshots are created on Macbook Pro 13".

More info: [cypress-visual-regression Doc](https://github.com/mjhea0/cypress-visual-regression)
