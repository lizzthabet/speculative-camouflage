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

export interface ColorData {
  [ColorSpace.RGB]?: Color,
  [ColorSpace.HSB]?: Color,
  [ColorSpace.LAB]?: Color,
}

export type ColorDataList = ColorData[]

export type ColorDataCluster = ColorDataList[]

export type DistanceCalculation = (colorA: Color, colorB: Color) => number

export interface NearestCentroid {
  centroid: Color,
  index: number,
}
export interface ValueRange {
  min: number;
  max: number;
}

export enum ColorSpace {
  RGB = 'rgb',
  HSB = 'hsb',
  LAB = 'lab',
}

export interface ColorUploadSettings {
  files: FileList,
  sourceColor: ColorSpace,
  destinationColor: ColorSpace,
}
