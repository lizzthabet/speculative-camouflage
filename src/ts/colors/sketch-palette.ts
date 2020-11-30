import * as p5 from "p5";
import { DEFAULT_CANVAS_WIDTH } from '../constants'
import {
  ColorMode,
  ColorPaletteInput,
  ColorPaletteViewOutput
} from '../types'
import { createColorPalette } from './palette';
import { produceSketchFromColors, createSaveButtonForSketch, createCanvasWrapper } from "../sketch";

/**
 * Cluster and draw colors with color palette swatches from a color list
 */
export function viewColorPalette(settings: ColorPaletteInput): ColorPaletteViewOutput {
  const { colorPalette, sortedColors, sortedClusters } = createColorPalette(settings)

  const labSketchSortedColors = produceSketchFromColors({
    colors: sortedColors,
    colorMode: ColorMode.RGB,
    colorPalette,
    canvasWidth: DEFAULT_CANVAS_WIDTH
  })

  const wrapper = createCanvasWrapper(
    'image-color-palette',
    true,
    `Uploaded image palette with ${settings.colorPaletteSize} colors`
  )

  const p5Instance = new p5(labSketchSortedColors, wrapper)

  createSaveButtonForSketch(wrapper, p5Instance, wrapper.id)

  return { sortedClusters, sortedColors, colorPalette, p5Instance }
}
