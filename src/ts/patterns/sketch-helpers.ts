import * as p5 from "p5";
import { ColorList, Color, ColorMode } from "../types";
import { config, PALETTE_SCALE } from "../constants";
import { euclideanDistance, findNearestCentroid } from "../colors/clustering";
import { createButton } from "../forms";
import { colorToRgbString, scaleCanvasHeightToColors } from "../helpers";

// This factory interates through a color list and returns the
// closest centroid to the current color
const colorReducerFactory = (originalColors: ColorList, centroids: ColorList) => {
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
const colorListIteratorFactory = (colorList: ColorList) => {
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

const drawColorsOnCanvasFactory = ({
  canvasWidth,
  colorListLength,
  colorMode,
  colorPaletteProducer,
  colorProducer,
} : {
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
    if (colorMode === ColorMode.HSB) {
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

export function produceSketchFromColors({
  canvasWidth,
  colorMode,
  colors,
  colorPalette,
} : {
  canvasWidth: number,
  colorMode: ColorMode,
  colors: ColorList,
  colorPalette?: ColorList,
}) : (p: p5) => void {
  const colorProducer = colorListIteratorFactory(colors)

  let colorPaletteProducer: () => Color
  if (colorPalette) {
    colorPaletteProducer = colorListIteratorFactory(colorPalette)
  }

  const sketch = drawColorsOnCanvasFactory({
    colorListLength: colors.length,
    colorMode,
    colorPaletteProducer,
    colorProducer,
    canvasWidth,
  })

  return sketch
}

export const createCanvasWrapper = (id: string, appendToDom: boolean, title?: string) => {
  const wrapper = document.createElement('figure')
  wrapper.id = id

  if (title) {
    const wrapperTitle = document.createElement('h3')
    wrapperTitle.innerHTML = title
    wrapper.appendChild(wrapperTitle)
  }

  if (appendToDom) {
    document.body.appendChild(wrapper)
  }

  return wrapper
}

export function createSaveButtonForSketch({ p5Instance, canvas, filename }: {
  p5Instance?: p5,
  canvas?: HTMLCanvasElement,
  filename: string;
}) {
  let button: HTMLButtonElement

  if (p5Instance) {
    button = createButton({
      id: `save-pattern-${filename.toLowerCase()}`,
      htmlElement: 'button',
      type: 'button',
      text: 'Save pattern',
      clickListener: () => p5Instance.saveCanvas(filename, 'png'),
    }).button
  } else if (canvas) {
    button = createButton({
      id: `save-pattern-${filename.toLowerCase()}`,
      htmlElement: 'button',
      type: 'button',
      text: '',
    }).button

    const downloadLink: HTMLAnchorElement = document.createElement('a')
    downloadLink.download = filename
    downloadLink.href = canvas.toDataURL()
    downloadLink.innerText = 'Save pattern'
    button.prepend(downloadLink)
  } else {
    throw new Error("Supply a p5 instance or HTML canvas to create a save button.")
  }

  return button
}

export function drawColorsOnCanvas({
  colors,
  ctx,
  patternHeight,
  patternWidth,
  scale,
}: {
  colors: ColorList;
  ctx: CanvasRenderingContext2D;
  patternHeight: number;
  patternWidth: number;
  scale: number;
}) {
  let i = 0
  for (let y = 0; y < patternHeight; y += scale) {
    for (let x = 0; x < patternWidth; x += scale) {
      if (colors[i]) {
        const rgbStyle = colorToRgbString(colors[i])
        ctx.fillStyle = rgbStyle
        ctx.fillRect(x, y, scale, scale)
        i++
      } else {
        console.warn('Colors array length does not align with pattern dimensions; rendering may be skewed.')
      }
    }
  }

  return ctx
}
