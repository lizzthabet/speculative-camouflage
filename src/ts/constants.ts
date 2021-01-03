import { NoisePatternSetting, NoisePatternConfig } from './types';

export const DEFAULT_CANVAS_HEIGHT = 700
export const DEFAULT_CANVAS_WIDTH = 800
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
  NoisePatternSetting.increment,
  NoisePatternSetting.nAdjust,
  NoisePatternSetting.rHueThresh,
  NoisePatternSetting.rSatThresh,
  NoisePatternSetting.rBriThresh
]

// Clustering algorithm iteration limit
export const ITERATION_LIMIT = 500

// Image upload scale
export const UPLOAD_SCALE_WIDTH = 200

// Pattern generation resolution
export const DEFAULT_RESOLUTION = 72

// The minimum amount of unique colors that should be present before processing an uploaded image's data
export const COLOR_COUNT_CUTOFF = 10

export const config: NoisePatternConfig = {
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

export const DEFAULT_VORONOI_SITES = 25

// Error messages
export const TOR_PERMISSIONS_ERROR = 'Too few unique colors were detected in the uploaded image. This could be a sign that Tor browser has denied permission for this site to extract canvas data.'

export const K_TOO_LARGE_ERROR = (kValue: number) => `Cannot divide data list into ${kValue}'k' groups because 'k' exceeds data length. Provide a smaller 'k' value.`

export const ITERATION_LIMIT_ERROR = (kValue: number) => `Unable to cluster colors into ${kValue} groups within set iteration limit. If colors in the image are too similar, try running again with a lower value. If there is a lot of color variation in the image, try running with a higher value.`

export const NOT_RGB_SOURCE_ERROR = (sourceColor: string) => `Source image must be in RGB color mode, not ${sourceColor}.`

export const SAVE_BUTTON_ERROR = 'Supply a p5 instance or HTML canvas to create a save button.'
