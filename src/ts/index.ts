import * as p5 from "p5";
import { Cluster, Color, ColorList, ColorMode } from "./types";
import { findNearestCentroid, kMeans, kMeansTest, sortByFrequency, euclideanDistance } from "./clustering";
import { getColorsFromUploadedImage, rgbToLab, labToRgb } from './color'
import { generateNoisePattern } from "./noise-pattern";
import { colorListIteratorFactory, drawColorsOnCanvasFactory, colorReducerFactory } from "./sketch";
import { DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH } from "./constants";

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
      clusterAndReduceColors(clusteredColorsCanvas, reducedColorsCanvas)
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

        const files = fileInput.files as FileList
        const colorModeValue = colorModeInput.value as ColorMode
        const kMeansValue = parseInt(kMeansInput.value)

        await drawColorPaletteFromUploadedImage(files, colorModeValue, kMeansValue, colorPaletteCanvas)

      } catch (error) {
        console.error(`Error creating color palette from uploaded image: ${error && error.message}`)
      }
    })
  }
})

function drawNoisePattern(canvas: HTMLElement) {
  const noisePatternColors = generateNoisePattern()
  const sketch = produceSketchFromColors({
    canvasWidth: DEFAULT_CANVAS_WIDTH,
    colors: noisePatternColors,
    colorMode: ColorMode.HSV,
  })

  new p5(sketch, canvas)
}

function flattenColors({
  clusters,
  centroids,
  sortColors
}: {
  clusters: Cluster,
  centroids: ColorList,
  sortColors: boolean
}): {
  colors: ColorList,
  centroids: ColorList
} {
  const colors: ColorList = []
  if (sortColors) {
    const { sortedClusters, sortedCentroids } = sortByFrequency(clusters, centroids)
    sortedClusters.forEach(cluster => cluster.forEach(c => colors.push(c)))

    return { colors, centroids: sortedCentroids }
  } else {
    clusters.forEach(cluster => cluster.forEach(c => colors.push(c)))

    return { colors, centroids }
  }
}

function produceSketchFromColors({
  canvasWidth,
  colorMode,
  colors,
  colorPalette,
} : {
  canvasWidth: number,
  colorMode: ColorMode,
  colors: ColorList,
  colorPalette?: ColorList,
}) : (p: p5) => void {
  const colorProducer = colorListIteratorFactory(colors)

  let colorPaletteProducer: () => Color
  if (colorPalette) {
    colorPaletteProducer = colorListIteratorFactory(colorPalette)
  }

  const sketch = drawColorsOnCanvasFactory({
    colorListLength: colors.length,
    colorMode,
    colorPaletteProducer,
    colorProducer,
    canvasWidth,
  })

  return sketch
}

function clusterAndReduceColors(clusterCanvas: HTMLElement, reduceCanvas: HTMLElement) {
  const colors = generateNoisePattern()
  const { clusters, centroids } = kMeans(colors, 32)
  const { colors: sortedColors, centroids: sortedCentroids } = flattenColors({ clusters, centroids, sortColors: true })

  const sketchSortedColors = produceSketchFromColors({
    canvasWidth: DEFAULT_CANVAS_WIDTH,
    colors: sortedColors,
    colorMode: ColorMode.HSV,
    colorPalette: sortedCentroids
  })

  new p5(sketchSortedColors, clusterCanvas)

  const colorReducer = colorReducerFactory(colors, sortedCentroids)
  const sketchReducedColors = drawColorsOnCanvasFactory({
    colorListLength: colors.length,
    colorMode: ColorMode.HSV,
    colorProducer: colorReducer,
    canvasWidth: DEFAULT_CANVAS_WIDTH,
  })

  new p5(sketchReducedColors, reduceCanvas)
}

async function drawColorPaletteFromUploadedImage(
  files: FileList,
  colorMode: ColorMode,
  kMeansValue: number,
  colorPaletteCanvas: HTMLElement
) {
  const colors = await getColorsFromUploadedImage({
    files,
    sourceColor: ColorMode.RGB,
    destinationColor: colorMode,
  })

  console.log(`Uploaded image has ${colors.length} colors`)

  const { clusters, centroids } = kMeans(colors, kMeansValue)

  console.log('Clustering complete', centroids, clusters)

  const { colors: sortedColors, centroids: sortedCentroids } = flattenColors({ clusters, centroids, sortColors: true })

  const sketchSortedColors = produceSketchFromColors({
    canvasWidth: DEFAULT_CANVAS_WIDTH,
    colorMode,
    colors: sortedColors,
    colorPalette: sortedCentroids,
  })

  new p5(sketchSortedColors, colorPaletteCanvas)

  /**
   * Next steps:
   * - Add functions to convert HSL to LAB and LAB to HSL
   * - Do the color palette generation for the noise pattern in the new kMeans function
   * - Consider when color mapping will take place and if you want to support multiple distance functions (maybe there are color clustering functions that take a source color mode and a comparison color mode)
   */

  // Here's a test using a different distance function to calculate the difference between colors
  // Convert all colors to LAB
  const labColors = colors.map(c => rgbToLab(c))
  const { clusters: labClusters, centroids: labCentroids } = kMeansTest(labColors, kMeansValue)
  const { colors: sortedLabColors, centroids: sortedLabCentroids } = flattenColors({ clusters: labClusters, centroids: labCentroids, sortColors: true })

  // Convert back to RGB
  const rgbFromLabColors = sortedLabColors.map(c => labToRgb(c))
  const rgbFromLabCentroids = sortedLabCentroids.map(c => labToRgb(c))

  const labSketchSortedColors = produceSketchFromColors({
    colors: rgbFromLabColors,
    colorPalette: rgbFromLabCentroids,
    colorMode: ColorMode.RGB,
    canvasWidth: DEFAULT_CANVAS_WIDTH
   })

  new p5(labSketchSortedColors, colorPaletteCanvas)

  /**
   * New code!
   *   Two sets of sorted kCentroids, will map them to each other
   *   Loop through the noise pattern data. Based on which centroid each color belongs to, draw the corresponding color in the uploaded image.
   */

  // This code is a little redundant and clunky for now
  const noisePatternColors = generateNoisePattern(DEFAULT_CANVAS_WIDTH * 1.25, DEFAULT_CANVAS_HEIGHT * 1.5)
  const {clusters: noiseKClusters, centroids: noiseKCentroids} = kMeans(noisePatternColors, kMeansValue)
  const {sortedCentroids: noiseSortedKCentroids} = sortByFrequency(noiseKClusters, noiseKCentroids)

  // TODO: This code hasn't completely been cleaned up with the new `flattenColors` helper function
  const {sortedClusters} = sortByFrequency(clusters, centroids)
  const patternToImagePalette = noiseSortedKCentroids.reduce((colorMap, noiseCentroid, i) => {
    const correspondingImageCentroid = sortedCentroids[i]
    colorMap.set(noiseCentroid, { centroid: correspondingImageCentroid, cluster: sortedClusters[i], next: 0 })

    return colorMap
  }, new Map<Color, { centroid: Color, cluster: ColorList, next: number }>())

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

  const mappedColors: ColorList = []
  noisePatternColors.forEach((noiseColor) => {
    const { centroid } = findNearestCentroid(noiseColor, noiseKCentroids, euclideanDistance) // TODO: Replace with deltaE calc.
    const correspondingPalette = patternToImagePalette.get(centroid)
    if (!correspondingPalette || !correspondingPalette.cluster[correspondingPalette.next]) {
      console.error(`No image palette color found for ${noiseColor} that is nearest to ${centroid}`)
    } else {
      const mappedColor = correspondingPalette.cluster[correspondingPalette.next]

      // Very mutative way of doing this, but whatever?
      correspondingPalette.next = correspondingPalette.next === correspondingPalette.cluster.length - 1 ?
        0 : correspondingPalette.next + 1

      // mappedColors.push(correspondingPalette.centroid)
      mappedColors.push(mappedColor)
    }
  })

  const mappedSketch = produceSketchFromColors({
    colors: mappedColors,
    canvasWidth: DEFAULT_CANVAS_WIDTH * 1.25,
    colorMode: ColorMode.RGB
  })

  new p5(mappedSketch, colorPaletteCanvas)
}
