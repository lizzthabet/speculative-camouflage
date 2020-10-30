import { ColorMode } from "./types";
import { generatePatternFromUploadedImage } from "./core";
import { inchesToPixels } from "./helpers";
import { DEFAULT_RESOLUTION } from "./constants";

window.addEventListener('load', () => {
  // Grab the elements that each canvas sketch will be attached to
  const colorPaletteCanvas: HTMLElement = document.getElementById('canvas-wrapper')

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

        const files = fileInput.files as FileList
        const colorMode = colorModeInput.value as ColorMode
        const kMeansValue = parseInt(kMeansInput.value)
        const resolution = DEFAULT_RESOLUTION
        const patternHeight = inchesToPixels(parseInt(patternHeightInput.value), resolution)
        const patternWidth = inchesToPixels(parseInt(patternWidthInput.value), resolution)

        await generatePatternFromUploadedImage({
          canvasWrapper: colorPaletteCanvas,
          colorMode,
          files,
          kMeansValue,
          patternHeight,
          patternWidth,
        })

      } catch (error) {
        console.error(`Error creating color palette from uploaded image: ${error && error.message}`)
      }
    })
  }
})
