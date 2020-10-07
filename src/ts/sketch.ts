import * as p5 from "p5";
import * as _ from "lodash";
import { ColorList, Color, ColorMode } from "./types";
import { CANVAS_WIDTH, config, PALETTE_SCALE } from "./constants";
import { kMeans, sortByFrequency, findNearestCentroid } from "./clustering";
import { getColorsFromUploadedImage } from './color'
import { generateNoisePattern } from "./noise-pattern";

const camo: HTMLElement = document.getElementById('camo')
const clusterEl: HTMLElement = document.getElementById('cluster')
const reduceEl: HTMLElement = document.getElementById('reduce')
const imageEl: HTMLElement = document.getElementById('image')


// TODO: Move sketch factories to a new helper file? Or move core code to `index.ts`
// TODO: Refactor the factor functions so they can iterate through 

/* FACTORY FUNCTIONS */

// This factory interates through a color list and returns the
// closest centroid to the current color
const colorReducerFactory = (originalColors: ColorList, centroids: ColorList) => {
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

// Possibly refactor this
const scaleCanvasHeightToColors = (colorTotal: number, canvasWidth: number) => Math.ceil(
  colorTotal * Math.pow(config.scale, 2) / canvasWidth
)

const drawColorsOnCanvasFactory = ({
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

/* END FACTORY FUNCTIONS */

const noisePatternColors = generateNoisePattern()
const colorProducer = colorListIteratorFactory(noisePatternColors)
const noisePatternSketch = drawColorsOnCanvasFactory({
  colorListLength: noisePatternColors.length,
  colorMode: ColorMode.HSV,
  colorProducer: colorProducer
})

new p5(noisePatternSketch, camo)

document.getElementById('cluster-colors').addEventListener('click', () => {
  const colors = generateNoisePattern()
  const [kClusters, kCentroids] = kMeans(colors, 32)
  const [sortedKClusters, sortedKCentroids] = sortByFrequency(kClusters, kCentroids)

  // Flatten the kClusters into a single array
  const sortedColors: ColorList = []
  sortedKClusters.forEach(cluster => cluster.forEach(c => sortedColors.push(c)))

  // Make the color reducer and color palette functions
  const colorProducer = colorListIteratorFactory(sortedColors)
  const colorPaletteProducer = colorListIteratorFactory(sortedKCentroids)
  const sketchSortedColors = drawColorsOnCanvasFactory({
    colorListLength: sortedColors.length,
    colorMode: ColorMode.HSV,
    colorPaletteProducer,
    colorProducer,
  })

  new p5(sketchSortedColors, clusterEl)

  const colorReducer = colorReducerFactory(colors, sortedKCentroids)
  const sketchReducedColors = drawColorsOnCanvasFactory({
    colorListLength: colors.length,
    colorMode: ColorMode.HSV,
    colorProducer: colorReducer,
  })

  new p5(sketchReducedColors, reduceEl)
})

document.getElementById('upload-image-form').addEventListener('submit', async (e: Event) => {
  e.preventDefault()

  try {
    // This is definitely spaghetti code; if it's kept, consider adding
    // an enum for the ids and doing type casting / checking functions,
    // plus error handling for the presence of elements and data values
    const formElements = (e.target as HTMLFormElement).elements;
    const fileInput = formElements.namedItem('file-upload') as HTMLInputElement
    const kMeansInput = formElements.namedItem('k-means') as HTMLInputElement
    const colorModeInput = formElements.namedItem('color-mode') as HTMLInputElement

    const colors = await getColorsFromUploadedImage({
      files: fileInput.files,
      sourceColor: ColorMode.RGB,
      destinationColor: colorModeInput.value as ColorMode,
    })

    console.log(`Uploaded image has ${colors.length} colors`)

    const kMeansValue = parseInt(kMeansInput.value)
    const [ kClusters, kCentroids ] = kMeans(colors, kMeansValue)

    console.log('Clustering complete', kCentroids, kClusters)

    const [sortedKClusters, sortedKCentroids] = sortByFrequency(kClusters, kCentroids)
  
    // For now, just visualize the clustered colors of the uploaded image
    const sortedColors: ColorList = []
    sortedKClusters.forEach(cluster => cluster.forEach(c => sortedColors.push(c)))
  
    // Make the color reducer and color palette functions
    const colorProducer = colorListIteratorFactory(sortedColors)
    const colorPaletteProducer = colorListIteratorFactory(sortedKCentroids)
    const sketchSortedColors = drawColorsOnCanvasFactory({
      colorListLength: sortedColors.length,
      colorMode: colorModeInput.value as ColorMode,
      colorPaletteProducer,
      colorProducer,
    })
  
    new p5(sketchSortedColors, imageEl)
  
    // TODO: Map through the original colors and display the closest color from the kClusters
  }
  catch (error) {
    console.error(`Error creating color palette from uploaded image: ${error && error.message}`)
  }
})

// Nice TODOs
// - Add a loading state when processing colors
// - Add logic to retry the color palette generation if the diff between centroids is below a certain threshold?
