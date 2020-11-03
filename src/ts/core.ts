import * as p5 from "p5";
import { ColorSpace, ColorList, Cluster } from "./types";
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

function createCanvasWrapper(id: string, title?: string) {
  const wrapper = document.createElement('figure')
  wrapper.id = id

  if (title) {
    const wrapperTitle = document.createElement('h3')
    wrapperTitle.innerHTML = title
    wrapper.appendChild(wrapperTitle)
  }

  document.body.appendChild(wrapper)

  return wrapper
}

function createSaveButton(canvasWrapper: HTMLElement, p5Instance: p5, filename: string) {
  const button = document.createElement('button')
  button.innerHTML = `Save <span class="sr-only">${canvasWrapper.id}</span> pattern`

  console.log(p5Instance)
  button.addEventListener('click', () => p5Instance.saveCanvas(filename, 'png'))
  button.addEventListener('keypress', (event: KeyboardEvent) => {
    console.log('button keypress', event)
    if (event.key === 'Enter') {
      p5Instance.saveCanvas(filename, 'png')
    }
  })

  canvasWrapper.appendChild(button)

  return button
}

function viewColorPalette(originalColors: ColorList, kMeansValue: number, colorMode: ColorSpace) {
  // Determine which color converters to use
  const colorToLab = colorMode === ColorSpace.RGB ? rgbToLab : hsbToLab
  const labToColor = colorMode === ColorSpace.RGB ? labToRgb : labToHsb

  // Convert colors to LAB space for creating a color palette
  const labColors = originalColors.map(c => colorToLab(c))
  const { clusters: labClusters, centroids: labCentroids } = kMeans(labColors, kMeansValue, deltaE00Distance)

  console.log('Clustering complete - perceptual')

  const {
    colors: sortedLabColors,
    centroids: sortedLabCentroids,
    sortedClusters: sortedLabClusters
  } = flattenColors({ clusters: labClusters, centroids: labCentroids, sortColors: true })

  // Convert LAB colors back to original color mode
  const sortedColors = sortedLabColors.map(c => labToColor(c))
  const sortedCentroids = sortedLabCentroids.map(c => labToColor(c))
  const sortedClusters = sortedLabClusters.map(cluster => cluster.map(c => labToColor(c)))

  const labSketchSortedColors = produceSketchFromColors({
    colors: sortedColors,
    colorPalette: sortedCentroids,
    colorMode: ColorSpace.RGB,
    canvasWidth: DEFAULT_CANVAS_WIDTH
  })

  const wrapper = createCanvasWrapper(
    'image-color-palette',
    `Uploaded image palette with ${kMeansValue} colors`
  )

  const p5Instance = new p5(labSketchSortedColors, wrapper)

  createSaveButton(wrapper, p5Instance, wrapper.id)

  return { sortedClusters, sortedColors, sortedCentroids, p5Instance }
}

function drawNoisePatternWithImageColors({
  imageCentroids,
  imageClusters,
  kMeansValue,
  mapBothOriginalAndPaletteColors,
  patternHeight,
  patternWidth,
}: {
  imageCentroids: ColorList,
  imageClusters: Cluster,
  kMeansValue: number,
  mapBothOriginalAndPaletteColors: boolean,
  patternHeight: number,
  patternWidth: number,
}) {
  const sketchInstances : { [key: string]: p5 } = {}
  const wrapper = createCanvasWrapper(
    'noise pattern',
    'Generated pattern using source image palette'
  )

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
      colors: mappedColors,
      canvasWidth: patternWidth,
      colorMode: ColorSpace.RGB
    })

    const originalColorsWrapper = createCanvasWrapper(
      'noise-pattern-using-original-colors',
      'Generated pattern using source image colors'
    )

    sketchInstances.originalColors = new p5(mappedSketch, originalColorsWrapper)

    createSaveButton(
      originalColorsWrapper,
      sketchInstances.originalColors,
      `noise-pattern-using-original-colors-${patternWidth}x${patternHeight}`
    )
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
    colors: mappedColors,
    canvasWidth: patternWidth,
    colorMode: ColorSpace.RGB
  })

  sketchInstances.palette = new p5(mappedSketch, wrapper)

  createSaveButton(
    wrapper,
    sketchInstances.palette,
    `noise-pattern-${patternWidth}x${patternHeight}`
  )

  return sketchInstances
} 

export async function generatePatternFromUploadedImage({
  colorMode,
  files,
  kMeansValue,
  patternHeight,
  patternWidth,
}: {
  colorMode: ColorSpace,
  files: FileList,
  kMeansValue: number,
  patternHeight: number,
  patternWidth: number,
}) {
  const colors = await getColorsFromUploadedImage({
    files,
    sourceColor: ColorSpace.RGB,
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
  } = viewColorPalette(colors, kMeansValue, colorMode)

  /**
   * Color palette swapping!
   *   Two sets of sorted kCentroids are mapped them to each other
   *   Looping through the noise pattern data, determine which centroid the noise color belongs to
   *   Based on the corresponding image centroid, draw a color from the image
   */

  // Draw the pattern with colors from the original image's palette
  drawNoisePatternWithImageColors({
    imageCentroids: sortedImageCentroids,
    imageClusters: sortedImageClusters,
    kMeansValue,
    mapBothOriginalAndPaletteColors: false,
    patternHeight,
    patternWidth,
  })

  /**
   * Next steps:
   * - Consider when color mapping will take place and if you want to support multiple distance functions (maybe there are color clustering functions that take a source color mode and a comparison color mode, or maybe the colors become { rgb/hsb, lab } shape)
   * - Consider adding a global state to keep track of color palettes, clusters, centroids of uploaded images; this way, multiple images can be uploaded and the same noise pattern (if it has the same dimensions) can be used
   */
}
