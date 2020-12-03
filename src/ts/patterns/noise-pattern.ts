import * as p5 from "p5";
import { DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH, config, HUE_START, SAT_START, BRI_START } from "../constants";
import { perlinHue, perlinBri, perlinSat, addRandomToOffset } from "../helpers";
import { ColorList,  NoisePatternInput, NoisePatternOutput } from "../types";
import { kMeans, deltaE00Distance } from "../colors/clustering";
import {
  hsbToLab,
  labToHsb,
  mapCentroids,
  mapColors,
  sortByFrequency,
} from '../colors/palette'
import { createCanvasWrapper, drawColorsOnCanvas } from "./sketch-helpers";

const EMPTY_SKETCH = (p: p5) => {
  p.setup = () => {}
  p.windowResized = () => {}
  p.draw = () => {}
}

const p = new p5(EMPTY_SKETCH, document.createElement('div'))

/**
 * Generate the fractal noise pattern color data
 */
// Potentially rename to generateNoiseSourceData?
function generateNoiseSourcePattern(
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
 *   Two sets of sorted kCentroids (color palettes sorted by frequency of color) are mapped them to each other
 *   Looping through the noise pattern data, determine which centroid the noise color belongs to
 *   Based on the corresponding image centroid, draw a color from the image
 */
export function generateNoisePattern({
  canvas,
  colorClusters,
  colorPalette,
  colorPaletteSize,
  noiseSeed,
  options,
  patternHeight,
  patternWidth,
}: NoisePatternInput): NoisePatternOutput {
  // Set the height and width of canvas
  canvas.height = patternHeight
  canvas.width = patternWidth

  // Generate the noise pattern that will have its color palette swapped with an uploaded image
  const noiseColors = generateNoiseSourcePattern(patternWidth, patternHeight, noiseSeed, noiseSeed)

  console.log(`Noise pattern has ${noiseColors.length} colors`)

  // Convert HSB colors to LAB color space
  const noiseLabColors = noiseColors.map(c => hsbToLab(c))

  // Cluster noise pattern colors into color palette
  const { clusters: noiseLabClusters, centroids: noiseLabPalette } = kMeans(noiseLabColors, colorPaletteSize, deltaE00Distance)
  const { sortedCentroids: noiseSortedLabPalette } = sortByFrequency(noiseLabClusters, noiseLabPalette)

  // Convert LAB colors back to HSB
  const hsbNoisePalette = noiseSortedLabPalette.map(c => labToHsb(c))

  // Create a map of noise pattern centroids to uploaded image color palette centroids
  const patternToImagePalette = mapCentroids(hsbNoisePalette, colorPalette, colorClusters)

  const useOriginalSourceColors = options.mapOriginalSourceColors || false
  const mappedColors = mapColors(
    noiseColors,
    hsbNoisePalette,
    patternToImagePalette,
    deltaE00Distance,
    useOriginalSourceColors
  )

  drawColorsOnCanvas({
    colors: mappedColors,
    ctx: canvas.getContext('2d'),
    scale: config.scale,
    patternHeight,
    patternWidth,
  })

  return { canvas }
}

export function viewNoisePattern(canvas: HTMLCanvasElement) {
  const wrapper = createCanvasWrapper(
    'noise pattern',
    true,
    'Generated pattern using source image palette'
  )

  wrapper.appendChild(canvas)

  return wrapper
}
