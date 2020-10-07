import * as p5 from "p5";
import { ColorList, ColorMode } from "./types";
import { kMeans, sortByFrequency } from "./clustering";
import { getColorsFromUploadedImage } from './color'
import { generateNoisePattern } from "./noise-pattern";
import { colorListIteratorFactory, drawColorsOnCanvasFactory, colorReducerFactory } from "./sketch";

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

        await extractColorPaletteFromUploadedImage(files, colorModeValue, kMeansValue, colorPaletteCanvas)

      } catch (error) {
        console.error(`Error creating color palette from uploaded image: ${error && error.message}`)
      }
    })
  }
})

function drawNoisePattern(canvas: HTMLElement) {
  const noisePatternColors = generateNoisePattern() // TODO: Add height and width params
  const colorProducer = colorListIteratorFactory(noisePatternColors)
  const sketch = drawColorsOnCanvasFactory({
    colorListLength: noisePatternColors.length,
    colorMode: ColorMode.HSV,
    colorProducer: colorProducer
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
  })

  new p5(sketchSortedColors, clusterCanvas)

  const colorReducer = colorReducerFactory(colors, sortedKCentroids)
  const sketchReducedColors = drawColorsOnCanvasFactory({
    colorListLength: colors.length,
    colorMode: ColorMode.HSV,
    colorProducer: colorReducer,
  })

  new p5(sketchReducedColors, reduceCanvas)
}

async function extractColorPaletteFromUploadedImage(
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
  })

  new p5(sketchSortedColors, colorPaletteCanvas)
}
