import * as p5 from 'p5';
import { Color, NoisePatternSetting, ColorList } from './types';
import { DEFAULT_RESOLUTION, FLOAT_SETTINGS } from './constants';

export const parseIntOrFloat = (setting: NoisePatternSetting, value: string) => FLOAT_SETTINGS.includes(setting) ? parseFloat(value) : parseInt(value, 10)

export const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min)

export const randomP = (p: p5, threshhold: number) => p.random(-threshhold, threshhold)

export const trimNumber = (n: number, decimalPlace: number) => parseFloat(n.toFixed(decimalPlace))

// Could probably make this more modular / functional
export const addRandomToOffset = (p: p5, xoff: number, yoff: number, threshhold: number) => {
  const addToX = randomP(p, threshhold)
  const addToY = randomP(p, threshhold)
  return [ xoff + addToX, yoff + addToY ]
}

const mapXToY = (xStart: number, xEnd: number, yStart: number, yEnd: number) => (n: number) => {
  const scale = (yEnd - yStart) / (xEnd - xStart)
  return yStart + scale * (n - xStart)
}

// TODO: Add explanation for why values are mapped and clamped at certain ranges
export const mapBrightness = mapXToY(0, 100, 45, 100)

export const mapSaturation = mapXToY(0, 100, 0, 70)

export const perlinHue = (p: p5, xoff: number, yoff: number) => p.noise(xoff, yoff) * 360

export const perlinSat = (p: p5, xoff: number, yoff: number) => mapSaturation(p.noise(xoff, yoff) * 100)

export const perlinBri = (p: p5, xoff: number, yoff: number) => mapBrightness(p.noise(xoff, yoff) * 100)

export const scaleCanvasHeightToColors = (colorTotal: number, colorScale: number, canvasWidth: number) => Math.ceil(
  colorTotal * Math.pow(colorScale, 2) / canvasWidth
)

export const inchesToPixels = (measurementInInches: number, resolution = DEFAULT_RESOLUTION) => measurementInInches * resolution

export const pixelsToInches = (measurementInPixels: number, resolution = DEFAULT_RESOLUTION) => measurementInPixels / resolution

export const colorToRgbString = ([r, g, b]: Color) => `rgb(${r}, ${g}, ${b})`

export const isTorBrowser = (location: Location) => location && location.hostname.match(/onion/)

export const countUniqueColorsTillThreshhold = (colors: ColorList, countThreshhold: number) => {
  const colorCount = new Set()
  for (let i = 0; i < colors.length; i++) {
    const color = colors[i].join()
    // Add color to count if it is new
    if (!colorCount.has(color)) {
      colorCount.add(color)
    }

    // Stop counting if threshhold is met
    if (colorCount.size >= countThreshhold) {
      return true
    }
  }

  return false
}
