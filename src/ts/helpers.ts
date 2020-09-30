import * as p5 from 'p5';
import { Setting } from './types';
import { FLOAT_SETTINGS } from './constants';

export const parseIntOrFloat = (setting: Setting, value: string) => FLOAT_SETTINGS.includes(setting) ? parseFloat(value) : parseInt(value, 10)

export const randomInt = (x: number, y: number) => Math.floor(Math.random() * (y - x + 1) + x)

export const randomP = (p: p5, threshhold: number) => p.random(-threshhold, threshhold)

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

export const mapBrightness = mapXToY(0, 100, 45, 100)

export const mapSaturation = mapXToY(0, 100, 0, 70)

export const perlinHue = (p: p5, xoff: number, yoff: number) => p.noise(xoff, yoff) * 360

export const perlinSat = (p: p5, xoff: number, yoff: number) => mapSaturation(p.noise(xoff, yoff) * 100)

export const perlinBri = (p: p5, xoff: number, yoff: number) => mapBrightness(p.noise(xoff, yoff) * 100)
