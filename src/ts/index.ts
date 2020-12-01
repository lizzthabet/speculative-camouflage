import { ColorList, ColorMode, ColorPaletteOutput } from "./types";
import { inchesToPixels } from "./helpers";
import { DEFAULT_RESOLUTION } from "./constants";
import { getColorsFromUploadedImage, createColorPalette } from './colors/palette';
import { viewColorPalette } from './colors/visualize';
import { drawNoisePatternWithImageColors } from "./patterns/noise-pattern";
import { clearCanvas, drawVoronoiPatternWithImageColors } from "./patterns/voronoi-pattern";
import { PatternState, SourceImage } from "./state";
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
        const kMeansValue = parseInt(kMeansInput.value)
        const resolution = DEFAULT_RESOLUTION
        const patternHeight = inchesToPixels(parseInt(patternHeightInput.value), resolution)
        const patternWidth = inchesToPixels(parseInt(patternWidthInput.value), resolution)

        await generatePatternFromUploadedImage({
          colorMode,
          files,
          kMeansValue,
          patternHeight,
          patternType: patternTypeInput.value, // Hardcoded for now
          patternWidth,
        })

      } catch (error) {
        console.error(`Error creating color palette from uploaded image: ${error && error.message}`)
      }
    })
  }
})

interface VoronoiState {
  iteration: number,
  kMeans: number | null,
  patternHeight: number,
  patternWidth: number,
  numSites: number | null,
}

// Voronoi testing state
const voronoiState: VoronoiState = {
  iteration: 0,
  kMeans: null,
  patternHeight: 0,
  patternWidth: 0,
  numSites: null,
}

function createVoronoiEditForm(voronoiCanvas: HTMLCanvasElement) {
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
  cellsInput.value = String(voronoiState.numSites) || ''

  const kMeansLabel = document.createElement('label')
  kMeansLabel.innerText = 'Number of extracted colors'
  const kMeansInput: HTMLInputElement = document.createElement('input')
  kMeansInput.id = 'kmeans'
  kMeansInput.type = 'number'
  kMeansInput.min = '1'
  kMeansInput.max = '32'
  kMeansInput.value = String(voronoiState.kMeans) || ''

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
    // Regenerate the color palette if number of colors is different
    if (kMeansValue !== voronoiState.kMeans) {
      state.source.getColorPalette(kMeansValue)
      state.source.viewColorPalette(kMeansValue)

      // Update the voronoi state with new palette
      voronoiState.kMeans = kMeansValue
    }

    // Update the voronoi state with cells value
    voronoiState.iteration++
    voronoiState.numSites = cellsValue

    clearCanvas(voronoiCanvas)

    drawVoronoiPatternWithImageColors({
      imageCentroids: state.source.getColorPalette(voronoiState.kMeans).colorPalette,
      imageClusters: [],
      numSites: voronoiState.numSites,
      suppliedCanvas: voronoiCanvas,
      patternHeight: voronoiState.patternHeight,
      patternWidth: voronoiState.patternWidth,
      useLastGradients: false, // easy for now
      useLastSites: false, // easy for now
    })
  })

  // Create a button to randomize the colors and color pairing
  const randomizeGradientsButton: HTMLButtonElement = document.createElement('button')
  randomizeGradientsButton.innerText = 'Randomize gradient pairings'

  randomizeGradientsButton.addEventListener('click', (e: Event) => {
    e.preventDefault()

    // Update the voronoi state!
    voronoiState.iteration++

    clearCanvas(voronoiCanvas)

    drawVoronoiPatternWithImageColors({
      imageCentroids: state.source.getColorPalette(voronoiState.kMeans).colorPalette,
      imageClusters: [],
      patternHeight: voronoiState.patternHeight,
      patternWidth: voronoiState.patternWidth,
      numSites: voronoiState.numSites,
      suppliedCanvas: voronoiCanvas,
      useLastSites: true,
      useLastGradients: false,
    })
  })

  // Create a button to randomize the site generation
  const randomizeSitesButton: HTMLButtonElement = document.createElement('button')
  randomizeSitesButton.innerText = 'Randomize site locations'
  randomizeSitesButton.addEventListener('click', (e: Event) => {
    e.preventDefault()

    // Update the voronoi state!
    voronoiState.iteration++

    clearCanvas(voronoiCanvas)

    drawVoronoiPatternWithImageColors({
      imageCentroids: state.source.getColorPalette(voronoiState.kMeans).colorPalette,
      imageClusters: [],
      patternHeight: voronoiState.patternHeight,
      patternWidth: voronoiState.patternWidth,
      numSites: voronoiState.numSites,
      suppliedCanvas: voronoiCanvas,
      useLastSites: false,
      useLastGradients: true,
    })
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
  kMeansValue,
  patternHeight,
  patternType,
  patternWidth,
}: {
  colorMode: ColorMode,
  files: FileList,
  kMeansValue: number,
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
  state.sourceImage = sourceImage

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

    worker.postMessage({colors, colorPaletteSize: kMeansValue, colorMode})
  }

  // const palette = createColorPalette({
  //   colors,
  //   colorPaletteSize: kMeansValue,
  //   colorMode,
  // })

  // viewColorPalette(palette)

  const palette = sourceImage.getColorPalette(kMeansValue)
  sourceImage.viewColorPalette(kMeansValue)

  console.log('**** Finished color palette in main thread ****')

  /**
   * Color palette swapping!
   *   Two sets of sorted kCentroids are mapped them to each other
   *   Looping through the noise pattern data, determine which centroid the noise color belongs to
   *   Based on the corresponding image centroid, draw a color from the image
   */
  if (patternType.toLowerCase() === 'noise') {
    // Draw the pattern with colors from the original image's palette
    drawNoisePatternWithImageColors({
      imageCentroids: palette.colorPalette,
      imageClusters: palette.colorClusters,
      kMeansValue,
      mapBothOriginalAndPaletteColors: false,
      patternHeight,
      patternWidth,
    })
  } else if (patternType.toLowerCase() === 'voronoi') {
    // Set the voronoi state
    voronoiState.kMeans = kMeansValue
    voronoiState.patternWidth = patternWidth
    voronoiState.patternHeight = patternHeight
    voronoiState.numSites = 25

    const canvas = drawVoronoiPatternWithImageColors({
      imageCentroids: palette.colorPalette,
      imageClusters: palette.colorClusters,
      patternHeight,
      patternWidth,
      numSites: 25, // Hardcoding the number of sites for now
    })

    const editForm = createVoronoiEditForm(canvas)
    document.body.appendChild(editForm)

  } else {
    throw new Error(`Pattern type with name ${patternType} is not supported. Supply a different pattern type.`)
  }

  /**
   * Next steps:
   * - Consider when color mapping will take place and if you want to support multiple distance functions (maybe there are color clustering functions that take a source color mode and a comparison color mode, or maybe the colors become { rgb/hsb, lab } shape)
   * - Consider adding a global state to keep track of color palettes, clusters, centroids of uploaded images; this way, multiple images can be uploaded and the same noise pattern (if it has the same dimensions) can be used
   */
}
