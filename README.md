# Diaaagram (a.k.a. react-diagram)

A diagram drawing application which is demonstrating how we can utilize `React.js` and HTML `<canvas/>` to create an interactive drawing.

## Application URL

https://draw.crispyscript.com (works best in desktop)

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
- [x] Pan
- [x] Zoom
- [x] CSS & Styling
- [x] Mobile & Resizing friendly
- [x] Multi-select elements
- [x] Support uploading an image
- [x] Duplicate elements
- [ ] Send to back/front
- [ ] Save the result to file / local storage (need to serialize the image)
- [ ] Limit max history stack to ~50 items
- [ ] Export canvas to png/jpeg
- [ ] Rotate
- [ ] Keyboard shortcut
- [ ] Setting stroke color
- [ ] Setting stroke width
- [ ] Filled rectangle
- [ ] Copy & Paste elements (upgrade "Duplicate" feature)

## Developer Notes

### Start the app locally

1. Run `yarn` to install all dependencies
2. Run `yarn start` to start the app locally

### Steps for running visual tests

1. Run `yarn visual:test` to do regression test
2. If there is any failed test, investigate it one-by-one by going to `./cypress/snapshots/diff` directory.
3. After a specific test file is fixed. To override all base screenshots of that file, run the following command.
   ```bash
   # We want to override ALL screenshots for test-file.spec.js file
   yarn cypress run --env type=base --config screenshotsFolder=cypress/snapshots/base,trashAssetsBeforeRuns=false --spec "cypress/integration/test-file.spec.js"
   ```
4. Repeat step 2-3 until `yarn visual:test` results all passed.
5. **Only after all tests are passed**, clean up all existing screenshots and re-create them from scratch by running `yarn visual:dangerously-override-all-base`. Note that, **this command is dangerous since you will lose all existing screenshots.**

Note: Tests may fail due to OS difference. All base screenshots are created on Macbook Pro 13".

More info: [cypress-visual-regression Doc](https://github.com/mjhea0/cypress-visual-regression)

### Temporary functions for export/import diagram

The following functions are temporary. Mostly use for debugging. In the future, we will implement a proper export/import feature.

- `exportSnapshot()` to export the diagram (must not have any image element)
- `importSnapshot(value)` to import, `value` is the result of calling `exportSnapshot()` (must not have any image element)

### Icons

https://phosphoricons.com/

### Naming Confusion

- Most of x, y value are in `scene` coordinate (i.e. canvas coord, not viewport coord). They are inconsistency in naming. For example,
  ```js
  // All of these variable names are in `scene` coord
  let sceneX, x1, x2, pointerX
  ```
- However, the `viewport` coordinate is more consistency in naming.
  ```js
  // There always be `viewport` keyword in `viewport` coord
  let viewportX
  ```
