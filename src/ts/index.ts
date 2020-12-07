import { ColorMode, Pattern } from "./types";
import { inchesToPixels } from "./helpers";
import { DEFAULT_RESOLUTION, DEFAULT_VORONOI_SITES } from "./constants";
import { getColorsFromUploadedImage } from './colors/palette';
import { NoisePattern, PatternState, ShapeDisruptivePattern, SourceImage } from "./state";
import { CreatePatternElements, createShapePatternEditForms, createNoisePatternEditForm } from "./forms";
import Worker from 'worker-loader!./workers/clustering.worker';

const state = new PatternState()

window.addEventListener('load', () => {
  // Grab the UI elements that will be interacted with
  const createPatternForm = document.getElementById(CreatePatternElements.Form)

  // Extract and draw the color palette from an uploaded image based on form data
  if (createPatternForm) {
    createPatternForm.addEventListener('submit', async (e: Event) => {
      e.preventDefault()

      try {
        const formElements = (e.target as HTMLFormElement).elements;
        const fileInput = formElements.namedItem(CreatePatternElements.ImageUpload) as HTMLInputElement
        const paletteSizeInput = formElements.namedItem(CreatePatternElements.PaletteSize) as HTMLInputElement
        const heightInput = formElements.namedItem(CreatePatternElements.PatternHeight) as HTMLInputElement
        const widthInput = formElements.namedItem(CreatePatternElements.PatternWidth) as HTMLInputElement
        const noiseCheckbox = formElements.namedItem(Pattern.NOISE) as HTMLInputElement
        const shapeCheckbox = formElements.namedItem(Pattern.SHAPE) as HTMLInputElement

        const files = fileInput.files as FileList
        const colorPaletteSize = parseInt(paletteSizeInput.value)
        const patternHeight = inchesToPixels(parseInt(heightInput.value), DEFAULT_RESOLUTION)
        const patternWidth = inchesToPixels(parseInt(widthInput.value), DEFAULT_RESOLUTION)
        const patterns = { [Pattern.NOISE]: noiseCheckbox.checked, [Pattern.SHAPE]: shapeCheckbox.checked }

        await generatePatterns({
          colorMode: ColorMode.RGB,
          files,
          colorPaletteSize,
          patternHeight,
          patterns,
          patternWidth,
        })

      } catch (error) {
        console.error(`Error creating color palette from uploaded image: ${error && error.message}`, error)
      }
    })
  }
})

async function generatePatterns({
  colorMode,
  files,
  colorPaletteSize,
  patternHeight,
  patterns,
  patternWidth,
}: {
  colorMode: ColorMode,
  files: FileList,
  colorPaletteSize: number,
  patternHeight: number,
  patterns: { [key in Pattern]: boolean },
  patternWidth: number,
}) {

  const colors = await getColorsFromUploadedImage({
    files,
    sourceColor: ColorMode.RGB,
    destinationColor: colorMode,
  })

  // TODO: Handle multiple images being uploaded by clearing the DOM of previous content
  // Add the source image to the state
  const sourceImage = new SourceImage(colors, colorMode)
  state.source = sourceImage

  console.log(`Uploaded image has ${colors.length} colors`)

  /**
   * Color palette extraction
   */

  // A temporary demo of processing color palette via web worker
  // if (window.Worker) {
  //   const worker = new Worker()

  //   worker.onmessage = (event: MessageEvent<ColorPaletteOutput>) => {
  //     console.log('**** Color palette complete from web worker ****')
  //     worker.terminate()
  //   }

  //   worker.onerror = (error: any) => {
  //     console.error('Web worker errored out on color palette generation', error)
  //   }

  //   worker.postMessage({colors, colorPaletteSize: colorPaletteSize, colorMode})
  // }

  state.source.getColorPalette(colorPaletteSize)
  state.source.viewColorPalette(colorPaletteSize)

  console.log('**** Finished color palette in main thread ****')

  if (patterns[Pattern.NOISE]) {
    state.noisePattern = new NoisePattern(
      state.source,
      colorPaletteSize,
      { height: patternHeight, width: patternWidth }
    )

    state.noisePattern.generate({})
    // TODO: Consider moving the edit form creation and logic to the pattern class
    const editForm = createNoisePatternEditForm(state.noisePattern)
    document.body.appendChild(editForm)
  }

  if (patterns[Pattern.SHAPE]) {
    state.shapeDisruptivePattern = new ShapeDisruptivePattern(
      state.source,
      colorPaletteSize,
      { height: patternHeight, width: patternWidth }
    )

    state.shapeDisruptivePattern.generate(DEFAULT_VORONOI_SITES, {})

    // TODO: Consider moving the edit form creation and logic to the pattern class
    const editForm = createShapePatternEditForms(state.shapeDisruptivePattern)
    document.body.appendChild(editForm)
  }
}
