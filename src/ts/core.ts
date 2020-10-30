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

function viewColorPalette(originalColors: ColorList, kMeansValue: number, colorMode: ColorMode, canvasWrapper: HTMLElement) {
  // Determine which color converters to use
  const colorToLab = colorMode === ColorMode.RGB ? rgbToLab : hsbToLab
  const labToColor = colorMode === ColorMode.RGB ? labToRgb : labToHsb

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
    canvasName: 'uploaded-image-sorted-colors',
    colors: sortedColors,
    colorPalette: sortedCentroids,
    colorMode: ColorMode.RGB,
    canvasWidth: DEFAULT_CANVAS_WIDTH
  })

  const sketchLabel = document.createElement('h3')
  sketchLabel.innerHTML = `Uploaded image palette with ${kMeansValue} colors`
  canvasWrapper.appendChild(sketchLabel)

  const p5Instance = new p5(labSketchSortedColors, canvasWrapper)

  return { sortedClusters, sortedColors, sortedCentroids, p5Instance }
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
  sketchLabel.innerHTML = 'Generated pattern using source image palette'
  canvasWrapper.appendChild(sketchLabel)

  sketchInstances.palette = new p5(mappedSketch, canvasWrapper)

  return sketchInstances
} 

export async function generatePatternFromUploadedImage({
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

  // Draw the pattern with colors from the original image's palette
  drawNoisePatternWithImageColors({
    canvasWrapper,
    imageCentroids: sortedImageCentroids,
    imageClusters: sortedImageClusters,
    kMeansValue,
    mapBothOriginalAndPaletteColors: false,
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
