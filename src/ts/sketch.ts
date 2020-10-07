import * as p5 from "p5";
import * as _ from "lodash";
import { ColorList, Color, ColorMode } from "./types";
import { CANVAS_WIDTH, config, PALETTE_SCALE } from "./constants";
import { findNearestCentroid } from "./clustering";

// TODO: Refactor the factor functions so they can iterate through different canvas dimensions

// This factory interates through a color list and returns the
// closest centroid to the current color
export const colorReducerFactory = (originalColors: ColorList, centroids: ColorList) => {
  // Keep track of the current index of the color array that we're incrementing through
  let colorIdx = 0;

  return (): Color => {
    if (originalColors[colorIdx]) {
      // From the list of central colors, find the closest
      const { centroid: newColor } = findNearestCentroid(originalColors[colorIdx], centroids)
      // Increment through the color array
      colorIdx++
  
      return newColor
    }

    // If no more colors to iterate through, return null
    return null
  }
}

// This factory iterates through a color list and returns the next color
// in the list every time the function is called
export const colorListIteratorFactory = (colorList: ColorList) => {
  let index = 0

  return () => {
    if (colorList[index]) {
      const color = colorList[index]
      index++

      return color
    }

    // If no more colors to iterate through, return null
    return null
  }
}

// Possibly refactor this or move to helpers
const scaleCanvasHeightToColors = (colorTotal: number, canvasWidth: number) => Math.ceil(
  colorTotal * Math.pow(config.scale, 2) / canvasWidth
)

export const drawColorsOnCanvasFactory = ({
  colorListLength,
  colorMode,
  colorPaletteProducer,
  colorProducer,
}: {
  colorListLength: number,
  colorMode: ColorMode,
  colorPaletteProducer?: () => Color
  colorProducer: () => Color,
}) => (p: p5) => {

  p.setup = () => {
    // If there is a color palette to draw,
    // make the canvas larger to accommodate it
    const canvasHeight = scaleCanvasHeightToColors(colorListLength, CANVAS_WIDTH);
    if (colorPaletteProducer) {
      const canvasWidthWithPalette = CANVAS_WIDTH + config.scale * PALETTE_SCALE
      p.createCanvas(canvasWidthWithPalette, canvasHeight)
    } else {
      p.createCanvas(CANVAS_WIDTH, canvasHeight)
    }
  };

  p.draw = () => {
    if (colorMode === ColorMode.HSV) {
      /**
       * By default, HSB mode uses these ranges (unless otherwise specified):
       *  H: 0 to 360
       *  S: 0 to 100
       *  B: 0 to 100
       */
      p.colorMode(p.HSB)
    } else {
      p.colorMode(p.RGB)
    }

    const canvasHeight = scaleCanvasHeightToColors(colorListLength, CANVAS_WIDTH);
    const COLS = Math.floor(CANVAS_WIDTH / config.scale)
    const ROWS = Math.floor(canvasHeight / config.scale)

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const newColor = colorProducer()
        if (newColor) {
          p.noStroke()
          p.fill(p.color(...newColor))
          p.rect(x * config.scale, y * config.scale, config.scale, config.scale)
        }
      }

      if (colorPaletteProducer) {
        if (y * config.scale % (config.scale * PALETTE_SCALE) === 0) {
          const colorFromPalette: Color | null = colorPaletteProducer()
          if (colorFromPalette) {
            p.noStroke()
            p.fill(p.color(...colorFromPalette))
            p.rect(COLS * config.scale, y * config.scale, config.scale * PALETTE_SCALE, config.scale * PALETTE_SCALE)
          }
        }
      }
    }

    p.noLoop();
  };
}

// Nice TODOs
// - Add a loading state when processing colors
// - Add logic to retry the color palette generation if the diff between centroids is below a certain threshold?
