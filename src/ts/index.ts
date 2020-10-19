import * as p5 from "p5";
import { ColorMode, ColorList, Cluster } from "./types";
import { DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH } from "./constants";
import { kMeans, euclideanDistance, deltaE00Distance } from "./clustering";
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
import { drawColorsOnCanvasFactory, colorReducerFactory, produceSketchFromColors } from "./sketch";
import { inchesToPixels } from "./helpers";

window.addEventListener('load', () => {
  // Grab the elements that each canvas sketch will be attached to
  const originalPatternCanvas: HTMLElement = document.getElementById('camo')
  const clusteredColorsCanvas: HTMLElement = document.getElementById('cluster')
  const reducedColorsCanvas: HTMLElement = document.getElementById('reduce')
  const colorPaletteCanvas: HTMLElement = document.getElementById('image')

  // Grab the UI elements that will be interacted with
  const clusterColorsButton = document.getElementById('cluster-colors')
  const imageUploadForm = document.getElementById('upload-image-form')

  // Draw the original noise pattern
  drawNoisePattern(originalPatternCanvas)

  // Cluster and reduce colors of noise pattern when cluster button is clicked
  if (clusterColorsButton) {
    clusterColorsButton.addEventListener('click', () => {
      clusterAndReduceNoiseColors(clusteredColorsCanvas, reducedColorsCanvas)
    })
  }

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
        const patternHeight = inchesToPixels(parseInt(patternHeightInput.value))
        const patternWidth = inchesToPixels(parseInt(patternWidthInput.value))

        await generatePatternWithUploadedColors({
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

function drawNoisePattern(canvas: HTMLElement) {
  const noisePatternColors = generateNoisePattern()
  const sketch = produceSketchFromColors({
    canvasName: 'noise-pattern-sample',
    canvasWidth: DEFAULT_CANVAS_WIDTH,
    colors: noisePatternColors,
    colorMode: ColorMode.HSB,
  })

  return new p5(sketch, canvas)
}

function clusterAndReduceNoiseColors(clusterCanvas: HTMLElement, reduceCanvas: HTMLElement) {
  const colors = generateNoisePattern()

  // Convert colors to LAB space
  const labColors = colors.map(c => hsbToLab(c))

  // Use the new kmeans calculation
  const { clusters, centroids } = kMeans(labColors, 18, deltaE00Distance)
  const { colors: sortedLabColors, centroids: sortedLabCentroids } = flattenColors({ clusters, centroids, sortColors: true })
  
  // Convert colors back to HSB (after flattened)
  const sortedColors = sortedLabColors.map(c => labToHsb(c))
  const sortedCentroids = sortedLabCentroids.map(c => labToHsb(c))

  const sketchSortedColors = produceSketchFromColors({
    canvasName: 'noise-pattern-sample-sorted-colors',
    canvasWidth: DEFAULT_CANVAS_WIDTH,
    colors: sortedColors,
    colorMode: ColorMode.HSB,
    colorPalette: sortedCentroids
  })

  new p5(sketchSortedColors, clusterCanvas)

  const colorReducer = colorReducerFactory(colors, sortedCentroids)
  const sketchReducedColors = drawColorsOnCanvasFactory({
    canvasName: 'noise-pattern-sample-reduced-colors',
    colorListLength: colors.length,
    colorMode: ColorMode.HSB,
    colorProducer: colorReducer,
    canvasWidth: DEFAULT_CANVAS_WIDTH,
  })

  return new p5(sketchReducedColors, reduceCanvas)
}

function viewColorPaletteWithEuclideanDistance(colors: ColorList, kMeansValue: number, colorMode: ColorMode, canvas: HTMLElement) {
  const { clusters, centroids } = kMeans(colors, kMeansValue, euclideanDistance)

  console.log('Clustering complete - euclidean')

  const { colors: sortedColors, centroids: sortedCentroids } = flattenColors({ clusters, centroids, sortColors: true })

  const sketchSortedColors = produceSketchFromColors({
    canvasName: 'uploaded-image-euclidean-sorted-colors',
    canvasWidth: DEFAULT_CANVAS_WIDTH,
    colorMode,
    colors: sortedColors,
    colorPalette: sortedCentroids,
  })

  const p5Instance = new p5(sketchSortedColors, canvas)

  return { clusters, centroids, sortedColors, sortedCentroids, p5Instance }
}

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

  const p5Instance = new p5(labSketchSortedColors, canvas)

  return { sortedClusters: rgbFromLabClusters, sortedColors: rgbFromLabColors, sortedCentroids: rgbFromLabCentroids, p5Instance }
}

function drawNoisePatternWithImageColors({
  canvasWrapper,
  imageCentroids,
  imageClusters,
  kMeansValue,
  mapUsingOriginalImageColors,
  patternHeight,
  patternWidth,
}: {
  canvasWrapper: HTMLElement,
  imageCentroids: ColorList,
  imageClusters: Cluster,
  kMeansValue: number,
  mapUsingOriginalImageColors: boolean,
  patternHeight: number,
  patternWidth: number,
}) {
  // Generate the noise pattern that will have its color palette swapped with an uploaded image
  const noiseColors = generateNoisePattern(patternHeight, patternWidth)

  // Convert HSB colors to LAB color space
  const noiseLabColors = noiseColors.map(c => hsbToLab(c))

  const { clusters: noiseLabClusters, centroids: noiseLabCentroids } = kMeans(noiseLabColors, kMeansValue, deltaE00Distance)
  const { sortedCentroids: noiseSortedLabCentroids } = sortByFrequency(noiseLabClusters, noiseLabCentroids)

  // Convert LAB colors back to HSB
  const hsbNoiseCentroids = noiseSortedLabCentroids.map(c => labToHsb(c))

  // Create a map of noise pattern centroids to uploaded image color palette centroids
  const patternToImagePalette = mapCentroids(hsbNoiseCentroids, imageCentroids, imageClusters)

  const mappedColors = mapColors(
    noiseColors,
    hsbNoiseCentroids,
    patternToImagePalette,
    deltaE00Distance,
    mapUsingOriginalImageColors
  )

  const mappedSketch = produceSketchFromColors({
    canvasName: `uploaded-image-using-${mapUsingOriginalImageColors ? 'original-colors' : 'palette'}-${patternWidth}x${patternHeight}`,
    colors: mappedColors,
    canvasWidth: patternWidth,
    colorMode: ColorMode.RGB
  })

  return new p5(mappedSketch, canvasWrapper)
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

async function generatePatternWithUploadedColors({
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

  // TODO: Create html elements for each sketch, so each one can be referenced with a unique id and have an event listener that saves the image
  const elementToWrapCanvas = document.createElement('figure')
  elementToWrapCanvas.id = 'some-id'

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

  // Draw the pattern with colors from the original image
  drawNoisePatternWithImageColors({
    canvasWrapper,
    imageCentroids: sortedImageCentroids,
    imageClusters: sortedImageClusters,
    kMeansValue,
    mapUsingOriginalImageColors: true,
    patternHeight,
    patternWidth,
  })

  // Draw the pattern with colors from the original image's palette (which results in a reduced color range)
  drawNoisePatternWithImageColors({
    canvasWrapper,
    imageCentroids: sortedImageCentroids,
    imageClusters: sortedImageClusters,
    kMeansValue,
    mapUsingOriginalImageColors: false,
    patternHeight,
    patternWidth,
  })

  /**
   * Next steps:
   * - Refactor kMeans references / functions to not be clunky with the `kMeansTest` name! lol
   * - Consider when color mapping will take place and if you want to support multiple distance functions (maybe there are color clustering functions that take a source color mode and a comparison color mode, or maybe the colors become { rgb/hsb, lab } shape)
   * - Consider adding a global state to keep track of color palettes, clusters, centroids of uploaded images; this way, multiple images can be uploaded and the same noise pattern (if it has the same dimensions) can be used
   */
}
