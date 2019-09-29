import { Setting, Config } from './types';

export const CANVAS_HEIGHT = 700
export const CANVAS_WIDTH = 1000
export const PALETTE_SCALE = 4
export const HUE_START = 0
export const SAT_START = 10000
export const BRI_START = 20000
export const FLOAT_SETTINGS = [Setting.increment, Setting.nAdjust, Setting.rHueThresh, Setting.rSatThresh, Setting.rBriThresh]
export const ITERATION_LIMIT = 500
export const UPLOAD_SCALE_WIDTH = 50

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
