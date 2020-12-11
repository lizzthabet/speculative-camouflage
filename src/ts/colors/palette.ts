import { BRI_SCALE, HUE_SCALE, SAT_SCALE, UPLOAD_SCALE_WIDTH, DEFAULT_CANVAS_WIDTH } from '../constants'
import {
  RgbaColor,
  Color,
  ColorUploadNoisePatternSettings,
  ColorMode,
  isColor,
  ColorList,
  Cluster,
  DistanceCalculation,
  ColorPaletteInput,
  ColorPaletteOutput,
  ColorPaletteViewOutput,
} from '../types'
import { findNearestCentroid, kMeans, deltaE00Distance } from './clustering'
import { trimNumber, scaleCanvasHeightToColors } from '../helpers'
import { createCanvasWrapper, drawColorsOnCanvas } from "../patterns/sketch-helpers";

const CIE10D65_DAYLIGHT = [94.811, 100, 107.304]

/**
 * Color conversion functions
 */

const rgbaToRgb = ([r, g, b]: RgbaColor): Color => [r, g, b];

// Note: HSB and HSV are interchangeable and refer to the same color space
const rgbToHsb = (rgb: Color | RgbaColor): Color => {
  const [ r, g, b ] = rgb.map(value => value / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min
  const v = max
  
  // If there's no difference, color is achromatic
  if (diff === 0) {
    return [ 0, 0, v ]
  }
  
  // Adjust saturation based on highest rgb value
  const s = max > 0 ? diff / max : 0
  
  let h
  // Calculate the hue based on which rgb value is the highest
  switch (max) {
    case r:
      h = (g - b) / diff + (g < b ? 6 : 0)
      break
    case g:
      h = (b - r) / diff + 2
      break
    case b:
      h = (r - g) / diff + 4
      break
  }

  h /= 6;

  // Trim each color to have four decimal places
  return <Color>[h * HUE_SCALE, s * SAT_SCALE, v * BRI_SCALE].map(number => trimNumber(number, 4));
}

const hsbToRgb = ([h, s, v]: Color): Color => {
  const normalizedH = h / HUE_SCALE
  const normalizedS = s / SAT_SCALE
  const normalizedV = v / BRI_SCALE

  const i = Math.floor(normalizedH * 6)
  const f = normalizedH * 6 - i
  const p = normalizedV * (1 - normalizedS)
  const q = normalizedV * (1 - f * normalizedS)
  const t = normalizedV * (1 - (1 - f) * normalizedS)

  let r, g, b
  switch(i % 6) {
    case 0:
      r = normalizedV; g = t; b = p; break;
    case 1:
      r = q; g = normalizedV; b = p; break;
    case 2:
      r = p; g = normalizedV; b = t; break;
    case 3:
      r = p; g = q; b = normalizedV; break;
    case 4:
      r = t; g = p; b = normalizedV; break;
    case 5:
      r = normalizedV; g = p; b = q; break;
  }

  const rgb = [r, b, g].map(value => value * 255)

  return isColor(rgb) && rgb
}

// Color conversions based on standard formulas with JS implementation modeled after
// https://github.com/hamada147/IsThisColourSimilar/blob/master/Colour.js

const rgbToXyz = (rgb: Color | RgbaColor): Color => {
  const [ r, g, b ] = rgb.map(value => {
    const normalizedValue = value / 255
    if (normalizedValue > 0.04045) {
      return Math.pow((normalizedValue + 0.055) / 1.055, 2.4) * 100
    } else {
      return normalizedValue / 12.92 * 100
    }
  })

  const x = (r * 0.4124) + (g * 0.3576) + (b * 0.1805)
  const y = (r * 0.2126) + (g * 0.7152) + (b * 0.0722)
  const z = (r * 0.0193) + (g * 0.1192) + (b * 0.9505)

  return [ x, y, z ]
}

const xyzToLab = (xyz: Color | RgbaColor): Color => {
  const normalizedXyz = [ xyz[0] / CIE10D65_DAYLIGHT[0], xyz[1] / CIE10D65_DAYLIGHT[1], xyz[2] / CIE10D65_DAYLIGHT[2] ]
  const [ x, y, z ] = normalizedXyz.map(value => {
    if (value > 0.008856) {
      return Math.pow(value, 1 / 3)
    } else {
      return 7.787 * value + 16 / 116
    }
  })

  const l = (116 * y) - 16
  const a = 500 * (x - y)
  const b = 200 * (y - z)

  return [ l, a, b ]
}

const xyzToRgb = (xyz: Color): Color => {
  const [ x, y, z ] = xyz.map(value => value / 100)
  const rCalculation = x *  3.2406 + y * -1.5372 + z * -0.4986
  const gCalculation = x * -0.9689 + y *  1.8758 + z *  0.0415
  const bCalculation = x *  0.0557 + y * -0.2040 + z *  1.0570

  const rgb = [rCalculation, gCalculation, bCalculation].map(value => {
    let calculatedValue: number
    if (value > 0.0031308) {
      calculatedValue = 1.055 * Math.pow(value, (1 / 2.4)) - 0.055
    } else {
      calculatedValue = value * 12.92
    }

    return Math.round(calculatedValue * 255)
  })

  return isColor(rgb) && rgb
}

const labToXyz = ([l, a, b]: Color): Color => {
  const normalizedA = (l + 16) / 116
  const normalizedL = a / 500 + normalizedA
  const normalizedB = normalizedA - b / 200

  const preXyz = [normalizedL, normalizedA, normalizedB].map(value => {
    if (Math.pow(value, 3) > 0.008856) {
      return Math.pow(value, 3)
    } else {
      return (value - 16 / 116) / 7.787
    }
  })

  const xyz = preXyz.map((value, i) => value * CIE10D65_DAYLIGHT[i])

  return isColor(xyz) && xyz
}

export const labToRgb = (lab: Color): Color => {
  const xyz = labToXyz(lab)
  const rgb = xyzToRgb(xyz)

  return rgb
}

export const rgbToLab = (rgb: Color | RgbaColor): Color => {
  const xyz = rgbToXyz(rgb)
  const lab = xyzToLab(xyz)

  return lab
}

export const hsbToLab = (hsb: Color) => {
  const rgb = hsbToRgb(hsb)
  const lab = rgbToLab(rgb)

  return lab
}

export const labToHsb = (lab: Color) => {
  const rgb = labToRgb(lab)
  const hsb = rgbToHsb(rgb)

  return hsb
}

/**
 * Transforming color data functions
 * (which have knowledge of the clustering types and structure)
 */

export function sortByFrequency (cl: Cluster, ct?: ColorList): {
  sortedClusters: Cluster, sortedCentroids: ColorList
} {
  const sortedClusters: Cluster = []
  const sortedCentroids: ColorList = []
  const freqList: Array<[number, number]> = []
  cl.forEach((cluster, idx) => freqList.push([cluster.length, idx]))
  freqList.sort((a, b) => b[0] - a[0])
  freqList.forEach(([_length, idx]) => {
    sortedClusters.push(cl[idx])
    if (ct && ct.length) {
      sortedCentroids.push(ct[idx])
    }
  })

  return { sortedClusters, sortedCentroids }
}

export function flattenColors({
  clusters,
  centroids,
  sortColors
}: {
  clusters: Cluster,
  centroids?: ColorList,
  sortColors: boolean
}): {
  colors: ColorList,
  sortedCentroids?: ColorList,
  sortedClusters?: Cluster,
} {
  const colors: ColorList = []
  if (sortColors) {
    const { sortedClusters, sortedCentroids } = sortByFrequency(clusters, centroids)
    sortedClusters.forEach(cluster => cluster.forEach(c => colors.push(c)))

    return { colors, sortedCentroids, sortedClusters }
  } else {
    clusters.forEach(cluster => cluster.forEach(c => colors.push(c)))

    return { colors }
  }
}

// Note: all parameters should be sorted for the mapping process to work
export function mapCentroids(centroidsA: ColorList, centroidsB: ColorList, clustersB: Cluster) {
  const colorMap = new Map<Color, { centroid: Color, cluster: ColorList, next: number }>()
  for (let i = 0; i < centroidsA.length; i++) {
    const centroidA = centroidsA[i]
    const centroidB = centroidsB[i]
    const clusterB = clustersB[i]

    colorMap.set(centroidA, { centroid: centroidB, cluster: clusterB, next: 0 })
  }

  return colorMap
}

export function mapColors(
  colorsA: ColorList,
  centroidsA: ColorList,
  aToBColorMap: Map<Color, { centroid: Color, cluster: ColorList, next: number }>,
  distance: DistanceCalculation,
  useOriginalImageColors = true,
) {
  const colorMap: ColorList = []

  for (let i = 0; i < colorsA.length; i++) {
    const colorA = colorsA[i]
    const { centroid: centroidA } = findNearestCentroid(colorA, centroidsA, distance)
    const paletteB = aToBColorMap.get(centroidA)
    if (paletteB) {
      // Use the original colors from the image or use the average palette color
      // (the latter of which will result in reduced colors in the final image)
      if (useOriginalImageColors) {
        const colorBIdx = paletteB.next
        const colorB = paletteB.cluster[colorBIdx]
  
        // Add colorB to color map
        colorMap.push(colorB)
  
        // Increment the index for the next color in paletteB
        paletteB.next = paletteB.next === paletteB.cluster.length - 1 ? 0 : paletteB.next + 1
      } else {
        const colorB = paletteB.centroid
        colorMap.push(colorB)
      }
    } else {
      console.error(`No image palette color found for ${colorA} that is nearest to ${centroidA}`)
    }
  }

  return colorMap
}

/**
 * File and color data processing functions
 */

const loadFile = (files: FileList): Promise<string | ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()
    // First, set the onload callback
    fileReader.onload = () => resolve(fileReader.result)
    fileReader.onerror = () => reject('FileReader failed to parse data')
    // Second, parse the file as a blob
    fileReader.readAsDataURL(files.item(0))
  })
}

const loadImage = (dataUrl: string | ArrayBuffer): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image()
    // First, set the onload callback
    image.onload = () => resolve(image)
    image.onerror = () => reject('Image failed to load')
    // Second, trigger the image load by setting its source
    image.src = dataUrl.toString()
  })
}

const extractPixelData = (image: HTMLImageElement) => {
  // Create and resize canvas to make color data more managable
  const canvas: HTMLCanvasElement = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const aspectRatio = image.height / image.width
  canvas.width = UPLOAD_SCALE_WIDTH
  canvas.height = aspectRatio * UPLOAD_SCALE_WIDTH

  // Draw the image and pull the pixel data
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  const pixelData: Uint8ClampedArray = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  // Iterate through the pixel data to create color array
  const rgbaColorData: RgbaColor[] = []
  for (let i = 0; i < pixelData.length; i += 4) {
    rgbaColorData.push([
      pixelData[i], pixelData[i + 1], pixelData[i + 2], pixelData[i + 3]
    ])
  }

  return rgbaColorData
}

/**
 * Extract the color data from an uploaded image
 */

export const getColorsFromUploadedImage = async (
  { files, sourceColor, destinationColor }: ColorUploadNoisePatternSettings
): Promise<Color[]> => {
  try {
    const dataUrl = await loadFile(files)
    const image = await loadImage(dataUrl)

    let colorData: RgbaColor[]

    /**
     * TODO: Change the color return type, so each color has multiple spaces
     * Loop through the color palette to create a color map
     * { rgb: value, lab: value, hsl: value }
     */

    // TODO: Add support for other color modes
    if (sourceColor === ColorMode.RGB) {
      colorData = extractPixelData(image)
    } else {
      throw new Error(`Source image must be in RGB color mode, not ${sourceColor}.`)
    }

    if (destinationColor === ColorMode.HSB) {
      return colorData.map(rgbToHsb)
    } else {
      // Remove the alpha value from color palette
      return colorData.map(rgbaToRgb);
    }
  }
  catch (error) {
    console.error(`Error getting colors from uploaded image: ${error && error.message}`)

    return []
  }
}

/**
 * Cluster colors to produce color palette from a color list
 */
export function createColorPalette({ colors, colorPaletteSize, colorMode }: ColorPaletteInput): ColorPaletteOutput {
  // Select the corresponding color conversion functions
  const colorToLab = colorMode === ColorMode.RGB ? rgbToLab : hsbToLab
  const labToColor = colorMode === ColorMode.RGB ? labToRgb : labToHsb

  // Convert colors to LAB space for creating a color palette
  const labColors = colors.map(c => colorToLab(c))
  const { clusters: labClusters, centroids: labCentroids } = kMeans(labColors, colorPaletteSize, deltaE00Distance)

  console.log(`Clustering ${colors.length} colors complete into ${colorPaletteSize} groups`)

  const {
    sortedCentroids: sortedLabCentroids,
    sortedClusters: sortedLabClusters
  } = flattenColors({ clusters: labClusters, centroids: labCentroids, sortColors: true })

  // Convert LAB colors back to original color mode
  const sortedCentroids = sortedLabCentroids.map(c => labToColor(c))
  const sortedClusters = sortedLabClusters.map(cluster => cluster.map(c => labToColor(c)))

  // All outputted color arrays are sorted by frequency
  return { colorPalette: sortedCentroids, colorClusters: sortedClusters }
}

/**
 * Cluster and draw colors with color palette swatches from a color list
 */
export function drawColorPalette(
  palette: ColorPaletteOutput,
  paletteCanvas: HTMLCanvasElement,
  colorsCanvas: HTMLCanvasElement
): ColorPaletteViewOutput {
  const { colors: sortedColors } = flattenColors({ clusters: palette.colorClusters, sortColors: false })

  const paletteSize = palette.colorPalette.length
  const width = DEFAULT_CANVAS_WIDTH - (DEFAULT_CANVAS_WIDTH % paletteSize)

  const paletteScale = width / paletteSize
  const paletteHeight = scaleCanvasHeightToColors(paletteSize, paletteScale, width)
  paletteCanvas.width = width
  paletteCanvas.height = paletteHeight

  drawColorsOnCanvas({
    colors: palette.colorPalette,
    ctx: paletteCanvas.getContext('2d'),
    patternWidth: width,
    patternHeight: paletteHeight,
    scale: paletteScale,
  })

  const colorsScale = 2
  const colorsHeight = scaleCanvasHeightToColors(sortedColors.length, colorsScale, width)
  colorsCanvas.width = width
  colorsCanvas.height = colorsHeight

  drawColorsOnCanvas({
    colors: sortedColors,
    ctx: colorsCanvas.getContext('2d'),
    patternWidth: width,
    patternHeight: colorsHeight,
    scale: colorsScale,
  })

  return { palette, paletteCanvas, colorsCanvas }
}

export function viewColorPalette(paletteCanvas: HTMLCanvasElement, colorsCanvas: HTMLCanvasElement) {
  const wrapper = createCanvasWrapper(
    'image-color-palette',
    true,
    `Source image palette`
  )

  // TODO: Display block these!
  wrapper.appendChild(paletteCanvas)
  wrapper.appendChild(colorsCanvas)
}
