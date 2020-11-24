import * as p5 from "p5";
import { DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH, config, HUE_START, SAT_START, BRI_START } from "../constants";
import { perlinHue, perlinBri, perlinSat, addRandomToOffset } from "../helpers";
import { ColorMode, ColorList, Cluster } from "../types";
import { kMeans, deltaE00Distance } from "../colors/clustering";
import {
  hsbToLab,
  labToHsb,
  mapCentroids,
  mapColors,
  sortByFrequency,
} from '../colors/palette'
import { produceSketchFromColors, createSaveButtonForSketch, createCanvasWrapper } from "../sketch";

const EMPTY_SKETCH = (p: p5) => {
  p.setup = () => {}
  p.windowResized = () => {}
  p.draw = () => {}
}

const p = new p5(EMPTY_SKETCH, document.createElement('div'))

/**
 * Generate the fractal noise pattern color data
 */
function generateNoisePattern(
  width: number = DEFAULT_CANVAS_WIDTH,
  height: number = DEFAULT_CANVAS_HEIGHT,
  randomSeed: number = config.nSeed,
  noiseSeed: number = config.nSeed,
): ColorList {
  const colors: ColorList = []

  // Set up random values
  p.randomSeed(randomSeed)
  p.noiseSeed(noiseSeed)
  p.noiseDetail(config.nDetail, config.nAdjust)

  const COLS = Math.floor(width / config.scale)
  const ROWS = Math.floor(height / config.scale)
  let yoffset = 0

  // Loop through canvas space
  for (let y = 0; y < ROWS; y++) {
    let xHueOff = HUE_START, xSatOff = SAT_START, xBriOff = BRI_START

    for (let x = 0; x < COLS; x++) {
      let hue: number, bri: number, sat: number

      // Introduce random additions to Perlin noise values
      if (p.random(100) < config.rNumThresh) {
        const [rHueXoff, rHueYoff] = addRandomToOffset(p, xHueOff, y, config.rHueThresh)
        hue = perlinHue(p, rHueXoff, rHueYoff)

        const [rSatXoff, rSatYoff] = addRandomToOffset(p, xSatOff, y, config.rSatThresh)
        sat = perlinSat(p, rSatXoff, rSatYoff)

        const [rBriXoff, rBriYoff] = addRandomToOffset(p, xBriOff, y, config.rBriThresh)
        bri = perlinBri(p, rBriXoff, rBriYoff)
      } else {
        // No random additions to Perlin noise values
        hue = perlinHue(p, xHueOff, yoffset)
        sat = perlinSat(p, xSatOff, yoffset)
        bri = perlinBri(p, xBriOff, yoffset)
      }

      // Increment the x offset values
      xHueOff += config.increment
      xSatOff += config.increment
      xBriOff += config.increment

      colors.push([hue, sat, bri])
    }

    // Increment the y offset value
    yoffset += config.increment
  }

  return colors
}

/**
 * Generate the fractal noise pattern using colors from an uploaded image
 */
export function drawNoisePatternWithImageColors({
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
    true,
    'Generated pattern using source image palette'
  )

  // Generate the noise pattern that will have its color palette swapped with an uploaded image
  const noiseColors = generateNoisePattern(patternWidth, patternHeight)

  console.log(`Noise pattern has ${noiseColors.length} colors`)

  // Convert HSB colors to LAB color space
  const noiseLabColors = noiseColors.map(c => hsbToLab(c))

  // Cluster noise pattern colors into color palette
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
      colorMode: ColorMode.RGB
    })

    const originalColorsWrapper = createCanvasWrapper(
      'noise-pattern-using-original-colors',
      true,
      'Generated pattern using source image colors'
    )

    sketchInstances.originalColors = new p5(mappedSketch, originalColorsWrapper)

    createSaveButtonForSketch(
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
    colorMode: ColorMode.RGB
  })

  sketchInstances.palette = new p5(mappedSketch, wrapper)

  createSaveButtonForSketch(
    wrapper,
    sketchInstances.palette,
    `noise-pattern-${patternWidth}x${patternHeight}`
  )

  return sketchInstances
}
