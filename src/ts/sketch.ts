import * as p5 from "p5";
import { CANVAS_HEIGHT, CANVAS_WIDTH, config, HUE_START, SAT_START, BRI_START, PALETTE_SCALE } from "./constants";
import { kMeans, sortByFrequency, findNearestCentroid } from "./clustering";
import { getColorsFromUploadedImage } from './color'
import { perlinHue, perlinBri, perlinSat, addRandomToOffset } from "./helpers";
import { ColorList, Color, ColorMode } from "./types";

const colors: ColorList = []

// GENERATE ORIGINAL PATTERN
const sketch = (p: p5) => {
  p.setup = () => {
    p.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  };

  p.windowResized = () => {};

  p.draw = () => {
    // Set up color mode and random values
    p.colorMode(p.HSB)
    p.randomSeed(config.nSeed)
    p.noiseSeed(config.nSeed)
    p.noiseDetail(config.nDetail, config.nAdjust)

    const COLS = Math.floor(CANVAS_WIDTH / config.scale)
    const ROWS = Math.floor(CANVAS_HEIGHT / config.scale)
    let yoffset = 0

    // Loop through canvas space
    for (let y = 0; y < ROWS; y++) {
      let xHueOff = HUE_START, xSatOff = SAT_START, xBriOff = BRI_START

      for (let x = 0; x < COLS; x++) {
        let hue: number, bri: number, sat: number

        // Introduce random additions to Perlin noise values
        if (p.random(100) < config.rNumThresh) {
          const [rHueXoff, rHueYoff] = addRandomToOffset(p, xHueOff, y, config.rHueThresh)
          hue = perlinHue(p, rHueXoff, rHueYoff)

          const [rBriXoff, rBriYoff] = addRandomToOffset(p, xBriOff, y, config.rBriThresh)
          bri = perlinBri(p, rBriXoff, rBriYoff)

          const [rSatXoff, rSatYoff] = addRandomToOffset(p, xSatOff, y, config.rSatThresh)
          sat = perlinSat(p, rSatXoff, rSatYoff)

        } else {
          // No random additions to Perlin noise values
          hue = perlinHue(p, xHueOff, yoffset)
          sat = perlinSat(p, xSatOff, yoffset)
          bri = perlinBri(p, xBriOff, yoffset)
        }

        // Draw rectangle with color
        p.noStroke()
        p.fill(p.color(hue, sat, bri))
        p.rect(x * config.scale, y * config.scale, config.scale, config.scale)

        // Increment the x offset values
        xHueOff += config.increment
        xSatOff += config.increment
        xBriOff += config.increment

        colors.push([hue, sat, bri])
      }

      // Increment the y offset value
      yoffset += config.increment
    }

    // For performance
    p.noLoop();
  };
};

const camo: HTMLElement = document.getElementById('camo')
const clusterEl: HTMLElement = document.getElementById('cluster')
const reduceEl: HTMLElement = document.getElementById('reduce')
const imageEl: HTMLElement = document.getElementById('image')

new p5(sketch, camo);

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

document.getElementById('cluster-colors').addEventListener('click', () => {
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
  
    new p5(sketchSortedColors)
  
    // TODO: Map through the original colors and display the closest color from the kClusters
  }
  catch (error) {
    console.error(`Error creating color palette from uploaded image: ${error && error.message}`)
  }
})

// Next step for reducing colors: sort all
// colors (and the generated centroids) by frequency, so that you can
// substitute the most frequent color for the most frequent color in
// the photos

// Nice TODOs
// - Add a loading state?
// - Add logic to retry the color palette generation if the diff between centroids is below a certain threshold?
