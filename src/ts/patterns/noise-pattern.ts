import * as p5 from "p5";
import {
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  config,
  HUE_START,
  SAT_START,
  BRI_START
} from "../constants";
import { perlinHue, perlinBri, perlinSat, addRandomToOffset } from "../helpers";
import { ColorList,  NoisePatternInput, NoisePatternOutput } from "../types";
import { deltaE00Distance } from "../colors/clustering";
import { mapCentroids, mapColors } from '../colors/palette'
import { createCanvasWrapper, createSaveButtonForSketch, drawColorsOnCanvas } from "./sketch-helpers";

export const NOISE_WRAPPER_ID = "noise-pattern"

const EMPTY_SKETCH = (p: p5) => {
  p.setup = () => {}
  p.windowResized = () => {}
  p.draw = () => {}
}

const p = new p5(EMPTY_SKETCH, document.createElement('div'))

/**
 * Generate the fractal noise pattern color data
 */
export function generateNoiseSourcePattern(
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

  let yoffset = 0

  // Loop through canvas space
  for (let y = 0; y < height; y += config.scale) {
    let xHueOff = HUE_START, xSatOff = SAT_START, xBriOff = BRI_START

    for (let x = 0; x < width; x += config.scale) {
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
  noiseColors,
  noiseColorPalette,
  options,
  patternHeight,
  patternWidth,
}: NoisePatternInput): NoisePatternOutput {
  // Set the height and width of canvas
  canvas.height = patternHeight
  canvas.width = patternWidth

  // Create a map of the noise pattern color palette to source image color palette
  const patternToImagePalette = mapCentroids(noiseColorPalette, colorPalette, colorClusters)

  // Loop through the noise pattern colors and substitute each one with the corresponding source image palette color
  const useOriginalSourceColors = options.mapOriginalSourceColors || false
  const mappedColors = mapColors(
    noiseColors,
    noiseColorPalette,
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
    NOISE_WRAPPER_ID,
    true,
    'Noise pattern'
  )

  wrapper.appendChild(canvas)

  const saveButton = createSaveButtonForSketch({ canvas, filename: 'noise-pattern' })
  wrapper.appendChild(saveButton)

  return wrapper
}
