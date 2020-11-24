import { ColorMode } from "./types";
import { inchesToPixels } from "./helpers";
import { DEFAULT_RESOLUTION } from "./constants";
import { getColorsFromUploadedImage, viewColorPalette } from './colors/palette'
import { drawNoisePatternWithImageColors } from "./patterns/noise-pattern";
import { drawVoronoiPatternWithImageColors } from "./patterns/voronoi-pattern";

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

  console.log(`Uploaded image has ${colors.length} colors`)

  /**
   * Color palette extraction
   */

  const {
    sortedCentroids: sortedImageCentroids,
    sortedClusters: sortedImageClusters
  } = viewColorPalette(colors, kMeansValue, colorMode)

  /**
   * Color palette swapping!
   *   Two sets of sorted kCentroids are mapped them to each other
   *   Looping through the noise pattern data, determine which centroid the noise color belongs to
   *   Based on the corresponding image centroid, draw a color from the image
   */
  if (patternType.toLowerCase() === 'noise') {
    // Draw the pattern with colors from the original image's palette
    drawNoisePatternWithImageColors({
      imageCentroids: sortedImageCentroids,
      imageClusters: sortedImageClusters,
      kMeansValue,
      mapBothOriginalAndPaletteColors: false,
      patternHeight,
      patternWidth,
    })
  } else if (patternType.toLowerCase() === 'voronoi') {
    drawVoronoiPatternWithImageColors({
      imageCentroids: sortedImageCentroids,
      imageClusters: sortedImageClusters,
      patternHeight,
      patternWidth,
    })
  } else {
    throw new Error(`Pattern type with name ${patternType} is not supported. Supply a different pattern type.`)
  }


  /**
   * Next steps:
   * - Consider when color mapping will take place and if you want to support multiple distance functions (maybe there are color clustering functions that take a source color mode and a comparison color mode, or maybe the colors become { rgb/hsb, lab } shape)
   * - Consider adding a global state to keep track of color palettes, clusters, centroids of uploaded images; this way, multiple images can be uploaded and the same noise pattern (if it has the same dimensions) can be used
   */
}
