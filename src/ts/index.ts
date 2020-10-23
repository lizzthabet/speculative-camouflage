import * as p5 from "p5";
import { ColorMode, ColorList, Cluster } from "./types";
import { DEFAULT_CANVAS_WIDTH } from "./constants";
import { kMeans, deltaE00Distance } from "./clustering";
import {
  getColorsFromUploadedImage,
  rgbToLab,
  labToRgb,
  hsbToLab,
  labToHsb,
  mapCentroids,
  mapColors,
  flattenColors,
  sortByFrequency
} from './color'
import { generateNoisePattern } from "./noise-pattern";
import { produceSketchFromColors } from "./sketch";
import { inchesToPixels } from "./helpers";

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
        const resolutionInput = formElements.namedItem('resolution') as HTMLInputElement

        const files = fileInput.files as FileList
        const colorMode = colorModeInput.value as ColorMode
        const kMeansValue = parseInt(kMeansInput.value)
        const resolution = parseInt(resolutionInput.value)
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

function viewColorPalette(colors: ColorList, kMeansValue: number, colorMode: ColorMode, canvas: HTMLElement) {
  // Convert colors to LAB space for creating a color palette
  const labColors = colors.map(c => rgbToLab(c))
  const { clusters: labClusters, centroids: labCentroids } = kMeans(labColors, kMeansValue, deltaE00Distance)

  console.log('Clustering complete - perceptual')

  const {
    colors: sortedLabColors,
    centroids: sortedLabCentroids,
    sortedClusters: sortedLabClusters
  } = flattenColors({ clusters: labClusters, centroids: labCentroids, sortColors: true })

  // Convert LAB colors back to RGB
  const rgbFromLabColors = sortedLabColors.map(c => labToRgb(c))
  const rgbFromLabCentroids = sortedLabCentroids.map(c => labToRgb(c))
  const rgbFromLabClusters = sortedLabClusters.map(cluster => cluster.map(c => labToRgb(c)))

  const labSketchSortedColors = produceSketchFromColors({
    canvasName: 'uploaded-image-sorted-colors',
    colors: rgbFromLabColors,
    colorPalette: rgbFromLabCentroids,
    colorMode: ColorMode.RGB,
    canvasWidth: DEFAULT_CANVAS_WIDTH
  })

  const sketchLabel = document.createElement('h3')
  sketchLabel.innerHTML = `Uploaded image palette with ${kMeansValue} colors`
  canvas.appendChild(sketchLabel)

  const p5Instance = new p5(labSketchSortedColors, canvas)

  return { sortedClusters: rgbFromLabClusters, sortedColors: rgbFromLabColors, sortedCentroids: rgbFromLabCentroids, p5Instance }
}

function drawNoisePatternWithImageColors({
  canvasWrapper,
  imageCentroids,
  imageClusters,
  kMeansValue,
  mapBothOriginalAndPaletteColors,
  patternHeight,
  patternWidth,
}: {
  canvasWrapper: HTMLElement,
  imageCentroids: ColorList,
  imageClusters: Cluster,
  kMeansValue: number,
  mapBothOriginalAndPaletteColors: boolean,
  patternHeight: number,
  patternWidth: number,
}) {
  const sketchInstances : { [key: string]: p5 }= {}

  // Generate the noise pattern that will have its color palette swapped with an uploaded image
  const noiseColors = generateNoisePattern(patternWidth, patternHeight)

  console.log(`Noise pattern has ${noiseColors.length} colors`)

  // Convert HSB colors to LAB color space
  const noiseLabColors = noiseColors.map(c => hsbToLab(c))

  const { clusters: noiseLabClusters, centroids: noiseLabCentroids } = kMeans(noiseLabColors, kMeansValue, deltaE00Distance)
  const { sortedCentroids: noiseSortedLabCentroids } = sortByFrequency(noiseLabClusters, noiseLabCentroids)

  // Convert LAB colors back to HSB
  const hsbNoiseCentroids = noiseSortedLabCentroids.map(c => labToHsb(c))

  // Create a map of noise pattern centroids to uploaded image color palette centroids
  const patternToImagePalette = mapCentroids(hsbNoiseCentroids, imageCentroids, imageClusters)

  // Map using the original colors from the image
  if (mapBothOriginalAndPaletteColors) {
    const mappedColors = mapColors(
      noiseColors,
      hsbNoiseCentroids,
      patternToImagePalette,
      deltaE00Distance,
      true
    )

    const mappedSketch = produceSketchFromColors({
      canvasName: `noise-pattern-using-original-colors-${patternWidth}x${patternHeight}`,
      colors: mappedColors,
      canvasWidth: patternWidth,
      colorMode: ColorMode.RGB
    })

    const sketchLabel = document.createElement('h3')
    sketchLabel.innerHTML = 'Generated pattern using source image colors'
    canvasWrapper.appendChild(sketchLabel)

    sketchInstances.originalColors = new p5(mappedSketch, canvasWrapper)
  }

  // Map using the palette colors from the image
  const mappedColors = mapColors(
    noiseColors,
    hsbNoiseCentroids,
    patternToImagePalette,
    deltaE00Distance,
    false
  )

  const mappedSketch = produceSketchFromColors({
    canvasName: `noise-pattern-using-palette-${patternWidth}x${patternHeight}`,
    colors: mappedColors,
    canvasWidth: patternWidth,
    colorMode: ColorMode.RGB
  })

  const sketchLabel = document.createElement('h3')
  sketchLabel.innerHTML = 'Generated pattern using image palette'
  canvasWrapper.appendChild(sketchLabel)

  sketchInstances.palette = new p5(mappedSketch, canvasWrapper)

  return sketchInstances
} 

// TODO
function visualizeMappedSortedColors() {
   // A sketch to visualize the mapped sorted colors
  // const mappedSortedColors: ColorList = []
  // noiseSortedKClusters.forEach((noiseCluster) => {
  //   noiseCluster.forEach((noiseColor) => {
  //     const {centroid} = findNearestCentroid(noiseColor, noiseKCentroids)
  //     const imagePaletteColor = patternToImagePalette.get(centroid)
  //     if (!imagePaletteColor) {
  //       console.error(`No image palette color found for ${noiseColor} that is nearest to ${centroid}`)
  //     } else {
  //       mappedSortedColors.push(imagePaletteColor)
  //     }
  //   })
  // })

  // const mappedSortedColorProducer = colorListIteratorFactory(mappedSortedColors)
  // const mappedSortedSketch = drawColorsOnCanvasFactory({
  //   canvasWidth: DEFAULT_CANVAS_WIDTH * 1.25,
  //   colorListLength: mappedSortedColors.length,
  //   colorMode: ColorMode.RGB,
  //   colorPaletteProducer,
  //   colorProducer: mappedSortedColorProducer,
  // })
  
  // new p5(mappedSortedSketch, colorPaletteCanvas)
}

async function generatePatternFromUploadedImage({
  colorMode,
  canvasWrapper,
  files,
  kMeansValue,
  patternHeight,
  patternWidth,
}: {
  colorMode: ColorMode,
  canvasWrapper: HTMLElement,
  files: FileList,
  kMeansValue: number,
  patternHeight: number,
  patternWidth: number,
}) {
  const colors = await getColorsFromUploadedImage({
    files,
    sourceColor: ColorMode.RGB,
    destinationColor: colorMode,
  })

  console.log(`Uploaded image has ${colors.length} colors`)

  /**
   * Color palette extraction!
   *   Use one of two methods for clustering colors to make a color palette
   */

  // Uncomment to compare the two methods of color palette generation
  // viewColorPaletteWithEuclideanDistance(colors, kMeansValue, colorMode, canvasWrapper)

  const {
    sortedCentroids: sortedImageCentroids,
    sortedClusters: sortedImageClusters
  } = viewColorPalette(colors, kMeansValue, colorMode, canvasWrapper)

  /**
   * Color palette swapping!
   *   Two sets of sorted kCentroids are mapped them to each other
   *   Looping through the noise pattern data, determine which centroid the noise color belongs to
   *   Based on the corresponding image centroid, draw a color from the image
   */

  // Draw the pattern with colors from the original image AND
  // Draw the pattern with colors from the original image's palette (which results in a reduced color range)
  drawNoisePatternWithImageColors({
    canvasWrapper,
    imageCentroids: sortedImageCentroids,
    imageClusters: sortedImageClusters,
    kMeansValue,
    mapBothOriginalAndPaletteColors: true,
    patternHeight,
    patternWidth,
  })

  /**
   * Next steps:
   * - Create wrapper elements with unique ids via JS, instead of grabbing them from the DOM, so each one can have event listeners, etc., attached to them and make it easier to save individual canvases in the future
   *    ie: const elementToWrapCanvas = document.createElement('figure')
   *        elementToWrapCanvas.id = 'some-id'
   * - Consider when color mapping will take place and if you want to support multiple distance functions (maybe there are color clustering functions that take a source color mode and a comparison color mode, or maybe the colors become { rgb/hsb, lab } shape)
   * - Consider adding a global state to keep track of color palettes, clusters, centroids of uploaded images; this way, multiple images can be uploaded and the same noise pattern (if it has the same dimensions) can be used
   */
}
