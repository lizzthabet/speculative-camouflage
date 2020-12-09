import * as p5 from "p5";
import { DEFAULT_CANVAS_WIDTH } from '../constants'
import {
  ColorMode,
  ColorPaletteOutput,
  ColorPaletteViewOutput
} from '../types'
import { flattenColors } from './palette';
import { produceSketchFromColors, createSaveButtonForSketch, createCanvasWrapper } from "../patterns/sketch-helpers";

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

  const saveButton = createSaveButtonForSketch({ p5Instance, filename: 'source-image-color-palette' })

  wrapper.appendChild(saveButton)

  return { ...palette, p5Instance }
}
