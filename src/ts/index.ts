import { ColorMode, CreatePatternsInput, Pattern } from "./types";
import { countUniqueColorsTillThreshhold, inchesToPixels, isTorBrowser } from "./helpers";
import { COLOR_COUNT_CUTOFF, DEFAULT_VORONOI_SITES, TOR_PERMISSIONS_ERROR } from "./constants";
import { getColorsFromUploadedImage } from './colors/palette';
import { NoisePattern, PatternState, ShapeDisruptivePattern, SourceImage } from "./state";
import {
  CreatePatternElements,
  enableOrDisableButtons,
  beginLoadingAnimation,
  hideFormError,
  showFormError,
  ErrorsToVisibleMessages,
} from "./forms";
import Worker from 'worker-loader!./workers/clustering.worker';

const state = new PatternState()

window.addEventListener('load', () => {
  const createPatternForm = document.getElementById(CreatePatternElements.Form)
  const createPatternFormError = document.getElementById(CreatePatternElements.Error) as HTMLParagraphElement

  if (createPatternForm) {
    createPatternForm.addEventListener('change', () => {
      if (createPatternFormError.classList.contains('form-error__visible')) {
        hideFormError(createPatternFormError)
      }
    })

    createPatternForm.addEventListener('submit', async (e: Event) => {
      e.preventDefault()

      // Clear the form error state
      hideFormError(createPatternFormError)

      // Disable interactive buttons while creating the pattern(s)
      const disabledButtons = enableOrDisableButtons({ disable: true })
      const formElements = (e.target as HTMLFormElement).elements;
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
        endLoadingAnimation()
      } catch (error) {
        console.error(`Error generating patterns from uploaded image:`, error)

        // Re-enable any disabled buttons and stop loading animation if there's an error
        enableOrDisableButtons({ disable: false })
        endLoadingAnimation()

        // Display the error message
        if (error.message) {
          const errorString = String(error.message)
          const visibleMessage = ErrorsToVisibleMessages.hasOwnProperty(errorString) ? ErrorsToVisibleMessages[errorString] : errorString
          showFormError(createPatternFormError, visibleMessage)
        }

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

  /**
   * Tor browser permissions check:
   *    If the client doesn't give the site permission to access HTML canvas data,
   *    the color data won't be available. Based on local testing, Tor browser supplies
   *    fake color data that's an array of eight repeating colors.
   *
   *    Since no API is available for detecting what permissions are enabled, this
   *    check counts all the unique colors in an image and throws an error if a
   *    threshhold isn't met.
   */
  if (isTorBrowser(window.location)) {
    const colorThreshholdMet = countUniqueColorsTillThreshhold(colors, COLOR_COUNT_CUTOFF)

    if (!colorThreshholdMet) {
      throw new Error(TOR_PERMISSIONS_ERROR)
    }
  }

  // TODO: Handle multiple images being uploaded by clearing the DOM of previous content
  // Add the source image to the state
  const sourceImage = new SourceImage(colors, colorMode)
  state.source = sourceImage

  console.log(`Uploaded source image has ${colors.length} colors`)

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
  state.source.drawColorPalette(colorPaletteSize)

  console.log('**** Finished source image color palette generation in main thread ****')

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
