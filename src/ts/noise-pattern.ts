import * as p5 from "p5";
import { DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH, config, HUE_START, SAT_START, BRI_START } from "./constants";
import { perlinHue, perlinBri, perlinSat, addRandomToOffset } from "./helpers";
import { ColorList } from "./types";

const EMPTY_SKETCH = (p: p5) => {
  p.setup = () => {}
  p.windowResized = () => {}
  p.draw = () => {}
}

const p = new p5(EMPTY_SKETCH)

// Generate the color data for the noise pattern
export const generateNoisePattern = (
  width: number = DEFAULT_CANVAS_WIDTH,
  height: number = DEFAULT_CANVAS_HEIGHT,
  randomSeed: number = config.nSeed,
  noiseSeed: number = config.nSeed,
): ColorList => {
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
