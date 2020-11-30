import * as p5 from "p5"

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
  HSB = 'hsb',
}

export interface ColorUploadSettings {
  files: FileList,
  sourceColor: ColorMode,
  destinationColor: ColorMode,
}

export interface ColorPaletteInput {
  colors: ColorList,
  colorMode: ColorMode,
  colorPaletteSize: number,
}

export interface ColorPaletteOutput {
  colorPalette: ColorList,
  colorClusters: Cluster,
}

export interface ColorPaletteViewOutput extends ColorPaletteOutput {
  p5Instance: p5,
}

export interface ColorPaletteState {
  colorPalette: ColorList;
  colorClusters: Cluster;
}
