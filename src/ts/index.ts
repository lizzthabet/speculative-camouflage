import { ColorMode, CreatePatternsInput, Pattern } from "./types";
import { inchesToPixels } from "./helpers";
import { DEFAULT_VORONOI_SITES } from "./constants";
import { getColorsFromUploadedImage } from './colors/palette';
import { NoisePattern, PatternState, ShapeDisruptivePattern, SourceImage } from "./state";
import { CreatePatternElements, enableOrDisableButtons, beginLoadingAnimation } from "./forms";
import Worker from 'worker-loader!./workers/clustering.worker';

const state = new PatternState()

window.addEventListener('load', () => {
  const createPatternForm = document.getElementById(CreatePatternElements.Form)

  if (createPatternForm) {
    createPatternForm.addEventListener('submit', async (e: Event) => {
      e.preventDefault()

      // Disable interactive buttons while creating the pattern(s)
      const disabledButtons = enableOrDisableButtons({ disable: true })
      // Grab all the form elements
      const formElements = (e.target as HTMLFormElement).elements;
      // Add loading animation to submit button
      const submitButton = formElements.namedItem(CreatePatternElements.SubmitButton) as HTMLButtonElement
      const endLoadingAnimation = beginLoadingAnimation(submitButton)

      try {
        const fileInput = formElements.namedItem(CreatePatternElements.ImageUpload) as HTMLInputElement
        const paletteSizeInput = formElements.namedItem(CreatePatternElements.PaletteSize) as HTMLInputElement
        const heightInput = formElements.namedItem(CreatePatternElements.PatternHeight) as HTMLInputElement
        const widthInput = formElements.namedItem(CreatePatternElements.PatternWidth) as HTMLInputElement
        const noiseCheckbox = formElements.namedItem(Pattern.NOISE) as HTMLInputElement
        const shapeCheckbox = formElements.namedItem(Pattern.SHAPE) as HTMLInputElement

        const files = fileInput.files as FileList
        const colorPaletteSize = parseInt(paletteSizeInput.value)
        const patternHeight = inchesToPixels(parseFloat(heightInput.value))
        const patternWidth = inchesToPixels(parseFloat(widthInput.value))
        const patterns = { [Pattern.NOISE]: noiseCheckbox.checked, [Pattern.SHAPE]: shapeCheckbox.checked }

        // For now, do not continue if no pattern is selected
        if (!noiseCheckbox.checked && !shapeCheckbox.checked) {
          return
        }

        await generatePatterns({
          colorMode: ColorMode.RGB,
          files,
          colorPaletteSize,
          patternHeight,
          patterns,
          patternWidth,
        })

        // Re-enable any buttons after pattern generation is complete
        enableOrDisableButtons({ buttons: disabledButtons, disable: false })
        // End loading animation
        endLoadingAnimation()
      } catch (error) {
        console.error(`Error generating patterns from uploaded image: ${error && error.message}`, error)

        // Re-enable any disabled buttons and stop loading animation if there's an error
        enableOrDisableButtons({ disable: false })
        endLoadingAnimation()
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
}: CreatePatternsInput) {

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

    const editForm = state.noisePattern.createEditForm()
    document.body.appendChild(editForm)
  }

  if (patterns[Pattern.SHAPE]) {
    state.shapeDisruptivePattern = new ShapeDisruptivePattern(
      state.source,
      colorPaletteSize,
      { height: patternHeight, width: patternWidth }
    )

    state.shapeDisruptivePattern.generate(DEFAULT_VORONOI_SITES, {})

    const editForm = state.shapeDisruptivePattern.createEditForm()
    document.body.appendChild(editForm)
  }
}
