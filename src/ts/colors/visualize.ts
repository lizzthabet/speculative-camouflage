import * as p5 from "p5";
import { DEFAULT_CANVAS_WIDTH } from '../constants'
import {
  ColorMode,
  ColorPaletteOutput,
  ColorPaletteViewOutput
} from '../types'
import { createColorPalette, flattenColors } from './palette';
import { produceSketchFromColors, createSaveButtonForSketch, createCanvasWrapper } from "../sketch";

/**
 * Cluster and draw colors with color palette swatches from a color list
 */
export function viewColorPalette(palette: ColorPaletteOutput): ColorPaletteViewOutput {
  const { colors: sortedColors } = flattenColors({ clusters: palette.colorClusters, sortColors: false })

  const labSketchSortedColors = produceSketchFromColors({
    colors: sortedColors,
    colorMode: ColorMode.RGB,
    colorPalette: palette.colorPalette,
    canvasWidth: DEFAULT_CANVAS_WIDTH
  })

  const wrapper = createCanvasWrapper(
    'image-color-palette',
    true,
    `Uploaded image palette with ${palette.colorPalette.length} colors`
  )

  const p5Instance = new p5(labSketchSortedColors, wrapper)

  createSaveButtonForSketch(wrapper, p5Instance, wrapper.id)

  return { ...palette, p5Instance }
}
