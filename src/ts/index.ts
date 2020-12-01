import { ColorMode, ColorPaletteOutput, Pattern } from "./types";
import { inchesToPixels } from "./helpers";
import { DEFAULT_RESOLUTION, DEFAULT_VORONOI_SITES } from "./constants";
import { getColorsFromUploadedImage } from './colors/palette';
import { drawNoisePatternWithImageColors } from "./patterns/noise-pattern";
import { PatternState, ShapeDisruptivePattern, SourceImage } from "./state";
import Worker from 'worker-loader!./workers/clustering.worker';

const state = new PatternState()

window.addEventListener('load', () => {
  // Grab the UI elements that will be interacted with
  const imageUploadForm = document.getElementById('upload-image-form')

  // Extract and draw the color palette from an uploaded image based on form data
  if (imageUploadForm) {
    imageUploadForm.addEventListener('submit', async (e: Event) => {
      e.preventDefault()

      try {
        const formElements = (e.target as HTMLFormElement).elements;
        const fileInput = formElements.namedItem('file-upload') as HTMLInputElement
        const kMeansInput = formElements.namedItem('k-means') as HTMLInputElement
        const colorModeInput = formElements.namedItem('color-mode') as HTMLInputElement
        const patternHeightInput = formElements.namedItem('pattern-height') as HTMLInputElement
        const patternWidthInput = formElements.namedItem('pattern-width') as HTMLInputElement
        const patternTypeInput = formElements.namedItem('pattern-type') as HTMLInputElement

        const files = fileInput.files as FileList
        const colorMode = colorModeInput.value as ColorMode
        const colorPaletteSize = parseInt(kMeansInput.value)
        const resolution = DEFAULT_RESOLUTION
        const patternHeight = inchesToPixels(parseInt(patternHeightInput.value), resolution)
        const patternWidth = inchesToPixels(parseInt(patternWidthInput.value), resolution)
        const patternType = patternTypeInput.value as Pattern

        await generatePatternFromUploadedImage({
          colorMode,
          files,
          colorPaletteSize,
          patternHeight,
          patternType,
          patternWidth,
        })

      } catch (error) {
        console.error(`Error creating color palette from uploaded image: ${error && error.message}`)
      }
    })
  }
})

function createVoronoiEditForm(numSites: number, colorPaletteSize: number) {
  const wrapper = document.createElement('figure')

  const heading = document.createElement('h4')
  heading.innerText = 'Adjust pattern settings'

  const form: HTMLFormElement = document.createElement('form')
  form.id = `voronoi-edit`

  const cellsLabel = document.createElement('label')
  cellsLabel.innerText = 'Number of cells'
  const cellsInput: HTMLInputElement = document.createElement('input')
  cellsInput.id = 'cells'
  cellsInput.type = 'number'
  cellsInput.min = '2'
  cellsInput.max = '50'
  cellsInput.value = String(numSites) || ''

  const kMeansLabel = document.createElement('label')
  kMeansLabel.innerText = 'Number of extracted colors'
  const kMeansInput: HTMLInputElement = document.createElement('input')
  kMeansInput.id = 'kmeans'
  kMeansInput.type = 'number'
  kMeansInput.min = '1'
  kMeansInput.max = '32'
  kMeansInput.value = String(colorPaletteSize) || ''

  const submitButton: HTMLButtonElement = document.createElement('button')
  submitButton.innerText = 'Regenerate voronoi pattern'
  submitButton.type = 'submit'

  form.appendChild(cellsLabel)
  form.appendChild(cellsInput)
  form.appendChild(kMeansLabel)
  form.appendChild(kMeansInput)
  form.appendChild(submitButton)

  form.addEventListener('submit', (e: Event) => {
    e.preventDefault()

    const cellsValue = parseInt(cellsInput.value)
    const kMeansValue = parseInt(kMeansInput.value)

    // TODO: In an ideal world, only one setting is changed at a time
    state.shapeDisruptivePattern.setSites(cellsValue)
    state.shapeDisruptivePattern.regeneratePalette(kMeansValue)
  })

  // Create a button to randomize the colors and color pairing
  const randomizeGradientsButton: HTMLButtonElement = document.createElement('button')
  randomizeGradientsButton.innerText = 'Randomize gradient pairings'

  randomizeGradientsButton.addEventListener('click', (e: Event) => {
    e.preventDefault()

    state.shapeDisruptivePattern.regenerateColors()
  })

  // Create a button to randomize the site generation
  const randomizeSitesButton: HTMLButtonElement = document.createElement('button')
  randomizeSitesButton.innerText = 'Randomize site locations'
  randomizeSitesButton.addEventListener('click', (e: Event) => {
    e.preventDefault()

    state.shapeDisruptivePattern.regenerateSites()
  })

  wrapper.appendChild(heading)
  wrapper.appendChild(randomizeGradientsButton)
  wrapper.appendChild(randomizeSitesButton)
  wrapper.appendChild(form)

  return wrapper
}

async function generatePatternFromUploadedImage({
  colorMode,
  files,
  colorPaletteSize,
  patternHeight,
  patternType,
  patternWidth,
}: {
  colorMode: ColorMode,
  files: FileList,
  colorPaletteSize: number,
  patternHeight: number,
  patternType: string,
  patternWidth: number,
}) {

  const colors = await getColorsFromUploadedImage({
    files,
    sourceColor: ColorMode.RGB,
    destinationColor: colorMode,
  })

  // Add the source image to the state
  // TODO: Handle multiple images being uploaded by clearing the DOM of previous content
  const sourceImage = new SourceImage(colors, colorMode)
  state.source = sourceImage

  console.log(`Uploaded image has ${colors.length} colors`)

  /**
   * Color palette extraction
   */

  // A temporary demo of processing color palette via web worker
  if (window.Worker) {
    const worker = new Worker()

    worker.onmessage = (event: MessageEvent<ColorPaletteOutput>) => {
      console.log('**** Color palette complete from web worker ****')
      worker.terminate()
    }

    worker.onerror = (error: any) => {
      console.error('Web worker errored out on color palette generation', error)
    }

    worker.postMessage({colors, colorPaletteSize: colorPaletteSize, colorMode})
  }

  const palette = sourceImage.getColorPalette(colorPaletteSize)
  sourceImage.viewColorPalette(colorPaletteSize)

  console.log('**** Finished color palette in main thread ****')

  switch (patternType) {
    case Pattern.NOISE:
      drawNoisePatternWithImageColors({
        imageCentroids: palette.colorPalette,
        imageClusters: palette.colorClusters,
        colorPaletteSize,
        mapBothOriginalAndPaletteColors: false,
        patternHeight,
        patternWidth,
      })

      break
    case Pattern.SHAPE:
      state.shapeDisruptivePattern = new ShapeDisruptivePattern(
        state.source,
        colorPaletteSize,
        { height: patternHeight, width: patternWidth }
      )

      state.shapeDisruptivePattern.generate(DEFAULT_VORONOI_SITES, {})

      const editForm = createVoronoiEditForm(DEFAULT_VORONOI_SITES, colorPaletteSize)
      document.body.appendChild(editForm)

      break
    default:
      throw new Error(`Pattern type with name ${patternType} is not supported. Supply a different pattern type.`)
  }
}
