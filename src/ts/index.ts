import * as p5 from "p5";
import { Color, ColorList, ColorMode } from "./types";
import { findNearestCentroid, kMeans, sortByFrequency } from "./clustering";
import { getColorsFromUploadedImage } from './color'
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
  const colorProducer = colorListIteratorFactory(noisePatternColors)
  const sketch = drawColorsOnCanvasFactory({
    colorListLength: noisePatternColors.length,
    colorMode: ColorMode.HSV,
    colorProducer,
    canvasWidth: DEFAULT_CANVAS_WIDTH,
  })

  new p5(sketch, canvas)
}

function clusterAndReduceColors(clusterCanvas: HTMLElement, reduceCanvas: HTMLElement) {
  const colors = generateNoisePattern()
  const [kClusters, kCentroids] = kMeans(colors, 32)
  const [sortedKClusters, sortedKCentroids] = sortByFrequency(kClusters, kCentroids)

  // Flatten the kClusters into a single array
  const sortedColors: ColorList = []
  sortedKClusters.forEach(cluster => cluster.forEach(c => sortedColors.push(c)))

  // Make the color reducer and color palette functions
  const colorProducer = colorListIteratorFactory(sortedColors)
  const colorPaletteProducer = colorListIteratorFactory(sortedKCentroids)
  const sketchSortedColors = drawColorsOnCanvasFactory({
    colorListLength: sortedColors.length,
    colorMode: ColorMode.HSV,
    colorPaletteProducer,
    colorProducer,
    canvasWidth: DEFAULT_CANVAS_WIDTH,
  })

  new p5(sketchSortedColors, clusterCanvas)

  const colorReducer = colorReducerFactory(colors, sortedKCentroids)
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

  const [kClusters, kCentroids] = kMeans(colors, kMeansValue)

  console.log('Clustering complete', kCentroids, kClusters)

  const [sortedKClusters, sortedKCentroids] = sortByFrequency(kClusters, kCentroids)

  // For now, just visualize the clustered colors of the uploaded image
  const sortedColors: ColorList = []
  sortedKClusters.forEach(cluster => cluster.forEach(c => sortedColors.push(c)))

  // Make the color reducer and color palette functions
  const colorProducer = colorListIteratorFactory(sortedColors)
  const colorPaletteProducer = colorListIteratorFactory(sortedKCentroids)
  const sketchSortedColors = drawColorsOnCanvasFactory({
    colorListLength: sortedColors.length,
    colorMode,
    colorPaletteProducer,
    colorProducer,
    canvasWidth: DEFAULT_CANVAS_WIDTH,
  })

  new p5(sketchSortedColors, colorPaletteCanvas)

  /**
   * New code!
   *   Two sets of sorted kCentroids, will map them to each other
   *   Loop through the noise pattern data. Based on which centroid each color belongs to, draw the corresponding color in the uploaded image.
   */

  // This code is a little redundant and clunky for now
  const noisePatternColors = generateNoisePattern(DEFAULT_CANVAS_WIDTH * 1.25, DEFAULT_CANVAS_HEIGHT * 1.5)
  const [noiseKClusters, noiseKCentroids] = kMeans(noisePatternColors, kMeansValue)
  const [noiseSortedKClusters, noiseSortedKCentroids] = sortByFrequency(noiseKClusters, noiseKCentroids)

  const patternToImagePalette = noiseSortedKCentroids.reduce((colorMap, noiseCentroid, i) => {
    const correspondingImageCentroid = sortedKCentroids[i]
    colorMap.set(noiseCentroid, { centroid: correspondingImageCentroid, cluster: sortedKClusters[i], next: 0 })

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
    const {centroid} = findNearestCentroid(noiseColor, noiseKCentroids)
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

  const mappedColorProducer = colorListIteratorFactory(mappedColors)
  const mappedSketch = drawColorsOnCanvasFactory({
    canvasWidth: DEFAULT_CANVAS_WIDTH * 1.25,
    colorListLength: mappedColors.length,
    colorMode: ColorMode.RGB,
    colorPaletteProducer,
    colorProducer: mappedColorProducer,
  })

  new p5(mappedSketch, colorPaletteCanvas)
}
