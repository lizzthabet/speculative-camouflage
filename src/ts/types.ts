export interface Config {
  increment: number,
  scale: number,
  nSeed: number,
  nDetail: number,
  nAdjust: number,
  rNumThresh: number,
  rHueThresh: number,
  rSatThresh: number,
  rBriThresh: number,
}

export enum Setting {
  increment,
  scale,
  nSeed,
  nDetail,
  nAdjust,
  rNumThresh,
  rHueThresh,
  rSatThresh,
  rBriThresh,
}

export type RgbaColor = [number, number, number, number]

export type Color = [number, number, number]

export function isColor(array: number[]): array is Color {
  return (array as Color).length === 3
}

export type ColorList = Color[]

export type Cluster = ColorList[]

export type DistanceCalculation = (colorA: Color, colorB: Color) => number

export interface NearestCentroid {
  centroid: Color,
  index: number,
}
export interface ValueRange {
  min: number;
  max: number;
}

export enum ColorMode {
  RGB = 'rgb',
  HSV = 'hsv',
}

export interface ColorUploadSettings {
  files: FileList,
  sourceColor: ColorMode,
  destinationColor: ColorMode,
}
