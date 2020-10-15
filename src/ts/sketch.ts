import * as p5 from "p5";
import * as _ from "lodash";
import { ColorList, Color, ColorMode } from "./types";
import { config, PALETTE_SCALE } from "./constants";
import { euclideanDistance, findNearestCentroid } from "./clustering";
import { scaleCanvasHeightToColors } from "./helpers";

// This factory interates through a color list and returns the
// closest centroid to the current color
export const colorReducerFactory = (originalColors: ColorList, centroids: ColorList) => {
  // Keep track of the current index of the color array that we're incrementing through
  let colorIdx = 0;

  return (): Color => {
    if (originalColors[colorIdx]) {
      // From the list of central colors, find the closest
      const { centroid: newColor } = findNearestCentroid(originalColors[colorIdx], centroids, euclideanDistance)
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

export const drawColorsOnCanvasFactory = ({
  canvasWidth,
  colorListLength,
  colorMode,
  colorPaletteProducer,
  colorProducer,
}: {
  canvasWidth: number,
  colorListLength: number,
  colorMode: ColorMode,
  colorPaletteProducer?: () => Color
  colorProducer: () => Color,
}) => (p: p5) => {

  p.setup = () => {
    // Dynamically determine canvas height based on width and colors to render
    const canvasHeight = scaleCanvasHeightToColors(colorListLength, config.scale, canvasWidth);

    // If there is a color palette to draw,
    // make the canvas larger to accommodate it
    if (colorPaletteProducer) {
      const canvasWidthWithPalette = canvasWidth + config.scale * PALETTE_SCALE
      p.createCanvas(canvasWidthWithPalette, canvasHeight)
    } else {
      p.createCanvas(canvasWidth, canvasHeight)
    }
  };

  p.draw = () => {
    if (colorMode === ColorMode.HSV) {
      p.colorMode(p.HSB)
    } else {
      p.colorMode(p.RGB)
    }

    const canvasHeight = scaleCanvasHeightToColors(colorListLength, config.scale, canvasWidth);
    const COLS = Math.floor(canvasWidth / config.scale)
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
