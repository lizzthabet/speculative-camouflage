import { UPLOAD_SCALE_WIDTH } from './constants'
import { RgbaColor, Color, ColorUploadSettings, ColorMode } from './types';

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
  // TODO: Try resizing the canvas based on which dimension is larger.
  // Large images are definitely breaking this.
  canvas.width = UPLOAD_SCALE_WIDTH
  canvas.height = aspectRatio * image.height

  // Log to eventually remove
  console.log('canvas + image info', canvas, aspectRatio, image.height, image.width)

  // Draw the image and pull the pixel data
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  const pixelData: Uint8ClampedArray = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  // Iterate through the pixel data to create color array
  const rgbaColorPalette: RgbaColor[] = []
  for (let i = 0; i < pixelData.length; i += 4) {
    rgbaColorPalette.push([
      pixelData[i], pixelData[i + 1], pixelData[i + 2], pixelData[i + 3]
    ])
  }

  return rgbaColorPalette
}

export const getColorsFromUploadedImage = async (
  { files, sourceColor, destinationColor }: ColorUploadSettings
): Promise<Color[]> => {
  try {
    const dataUrl = await loadFile(files)
    const image = await loadImage(dataUrl)

    let colorPalette: RgbaColor[]

    // TODO: Add support for other color modes
    if (sourceColor === ColorMode.RGB) {
      colorPalette = extractPixelData(image)
    } else {
      throw new Error(`Source image must be in RGB color mode, not ${sourceColor}.`)
    }

    if (destinationColor === ColorMode.HSV) {
      return colorPalette.map(rgbToHsv)
    } else {
      // Remove the alpha value from color palette
      return colorPalette.map(rgbaToRgb);
    }
  }
  catch (error) {
    console.error(`Error getting colors from uploaded image: ${error && error.message}`)

    return []
  }
}
