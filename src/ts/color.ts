import { UPLOAD_SCALE_WIDTH } from './constants'
import { RgbaColor, Color, ColorUploadSettings, ColorMode, isColor } from './types';

const CIE10D65_DAYLIGHT = [94.811, 100, 107.304]

const trimNumber = (n: number, decimalPlace: number) => parseFloat(n.toFixed(decimalPlace))

const rgbaToRgb = ([r, g, b]: RgbaColor): Color => [r, g, b];

const rgbToHsv = (rgb: Color | RgbaColor): Color => {
  const [ r, g, b ] = rgb.map(value => value / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min;
  let h, s, l = (max + min) / 2;

  // If there's no difference, color is achromatic
  if (diff === 0) {
    return [ 0, 0, l ]
  }

  // Adjust saturation based on lightness
  s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);

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
  // H values get mapped to 360 (degrees), while S and L values get mapped to 100, which is the default for HSB/L color space in p5
  return <Color>[h * 360, s * 100, l * 100].map(number => trimNumber(number, 4));
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

// const hslToLab

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

  // Log to eventually remove
  console.log('canvas + image info', canvas, aspectRatio, image.height, image.width)

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

export const getColorsFromUploadedImage = async (
  { files, sourceColor, destinationColor }: ColorUploadSettings
): Promise<Color[]> => {
  try {
    const dataUrl = await loadFile(files)
    const image = await loadImage(dataUrl)

    let colorData: RgbaColor[]

    /**
     * One option: loop through the color palette to create a color map
     * { rgb: value, lab: value, hsl: value }
     */

    // TODO: Add support for other color modes
    if (sourceColor === ColorMode.RGB) {
      colorData = extractPixelData(image)
    } else {
      throw new Error(`Source image must be in RGB color mode, not ${sourceColor}.`)
    }

    if (destinationColor === ColorMode.HSV) {
      return colorData.map(rgbToHsv)
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
