import { Setting, Config } from './types';

export const DEFAULT_CANVAS_HEIGHT = 700
export const DEFAULT_CANVAS_WIDTH = 1000
export const PALETTE_SCALE = 4

/**
 * Somewhat arbitrary start values for where
 * to begin iterating through perlin noise space
 * for each value
 */
export const HUE_START = 0
export const SAT_START = 10000
export const BRI_START = 20000

/**
 * By default in p5js, HSB mode uses these ranges (unless otherwise specified):
 *  H: 0 to 360
 *  S: 0 to 100
 *  B: 0 to 100
 */
export const HUE_SCALE = 360
export const SAT_SCALE = 100
export const BRI_SCALE = 100

export const FLOAT_SETTINGS = [
  Setting.increment,
  Setting.nAdjust,
  Setting.rHueThresh,
  Setting.rSatThresh,
  Setting.rBriThresh
]

// Clustering algorithm iteration limit
export const ITERATION_LIMIT = 500

// Image upload scale
export const UPLOAD_SCALE_WIDTH = 200

export const config: Config = {
  increment: 0.1,
  scale: 5,
  nSeed: 10,
  nDetail: 8,
  nAdjust: 0.5,
  rNumThresh: 60,
  rHueThresh: 0.6,
  rSatThresh: 1,
  rBriThresh: 1.6,
}
