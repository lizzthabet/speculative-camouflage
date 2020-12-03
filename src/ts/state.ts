import * as p5 from "p5";
import { VoronoiVertex } from "voronoi/*";
import { createColorPalette } from "./colors/palette";
import { viewColorPalette } from "./colors/visualize";
import { config, DEFAULT_VORONOI_SITES } from "./constants";
import { generateNoisePattern, viewNoisePattern } from "./patterns/noise-pattern";
import { clearCanvas, generateShapeDisruptivePattern, viewShapeDisruptivePattern } from "./patterns/shape-pattern";
import { Color, ColorList, ColorMode, ColorPaletteOutput, ColorPaletteState, NoisePatternOptions, ShapeDisruptiveOptions } from "./types";

export class PatternState {
  private sourceImage: null | SourceImage = null;
  private shapeDisruptive: null | ShapeDisruptivePattern = null;
  private noise: null | NoisePattern = null;

  constructor() {}

  get source() {
    return this.sourceImage
  }

  set source(image: SourceImage) {
    this.sourceImage = image
  }

  get shapeDisruptivePattern() {
    return this.shapeDisruptive
  }

  set shapeDisruptivePattern(pattern: ShapeDisruptivePattern) {
    this.shapeDisruptive = pattern
  }

  get noisePattern() {
    return this.noise
  }

  set noisePattern(pattern: NoisePattern) {
    this.noise = pattern
  }
}

// TODO: Add a loading state for when palettes are being generated
export class SourceImage {
  private palettes: { [key: string]: ColorPaletteState } = {}

  constructor(private rawColorData: ColorList, private mode: ColorMode) {}

  get colorMode() {
    return this.mode
  }

  private getPalette(size: number) {
    return this.palettes[String(size)] || undefined
  }

  private setPalette(palette: ColorPaletteOutput) {
    const size = String(palette.colorPalette.length)
    this.palettes[size] = palette
  }

  public getColorPalette(size: number) {
    const colorPaletteExists = this.getPalette(size)
    if (colorPaletteExists) {
      return colorPaletteExists
    }

    // TODO: Add error handling and potentially colorPaletteSizeLimit on the state
    const palette = createColorPalette({
      colors: this.rawColorData,
      colorPaletteSize: size,
      colorMode: this.colorMode
    })

    this.setPalette(palette)

    return palette
  }

  public viewColorPalette(size: number) {
    const palette = this.getColorPalette(size)

    return viewColorPalette(palette)
  }
}

export class ShapeDisruptivePattern {
  private canvas: HTMLCanvasElement = null
  private colorPairings: [Color, Color][] = null
  private sites: VoronoiVertex[] = null

  constructor(
    private sourceImage: SourceImage,
    private colorPaletteSize: number,
    private patternSize: { height: number; width: number }
  ) {}

  private get numSites() {
    if (this.sites) {
      return this.sites.length
    } else {
      return DEFAULT_VORONOI_SITES
    }
  }

  private renderNewCanvas() {
    return viewShapeDisruptivePattern(this.canvas)
  }

  private clearCanvas() {
    return clearCanvas(this.canvas)
  }

  public get htmlCanvas() {
    return this.canvas
  }

  public generate(numSites: number, options: ShapeDisruptiveOptions) {
    if (this.canvas) {
      this.clearCanvas()
    }

    const { colorPalette } = this.sourceImage.getColorPalette(this.colorPaletteSize)
    const { canvas, colorPairings, sites } = generateShapeDisruptivePattern({
      canvas: this.canvas || document.createElement('canvas'),
      colorPalette,
      numSites,
      options,
      patternHeight: this.patternSize.height,
      patternWidth: this.patternSize.width,
    })

    this.colorPairings = colorPairings
    this.sites = sites

    if (!this.canvas) {
      this.canvas = canvas
      this.renderNewCanvas()
    }
  }

  public regeneratePalette(size: number) {
    if (size === this.colorPaletteSize) {
      return
    }

    this.colorPaletteSize = size
    this.generate(this.numSites, { reuseSites: this.sites })
  }

  public regenerateColors() {
    this.generate(this.numSites, { reuseSites: this.sites })
  }

  public regenerateSites() {
    this.generate(this.numSites, { reuseColorPairings: this.colorPairings })
  }

  public setSites(numSites: number) {
    if (numSites === this.numSites) {
      return
    }

    this.generate(numSites, {})
  }

  // TODO
  public setDimensions() {}

  // TODO
  public save() {}
}

export class NoisePattern {
  private canvas: HTMLCanvasElement = null
  private noiseColorPalette: ColorList = null // This could be a noiseImage: SourceImage
  private noiseSeed: number = config.nSeed
  private p5: p5 = null

  constructor(
    private sourceImage: SourceImage,
    private colorPaletteSize: number,
    private patternSize: { height: number; width: number }
  ) {}

  // TODO: Create save button
  private renderNewCanvas() {
    return viewNoisePattern(this.canvas)
  }

  private clearCanvas() {
    return clearCanvas(this.canvas)
  }

  public get htmlCanvas() {
    return this.canvas
  }

  public generate(options: NoisePatternOptions) {
    if (this.canvas) {
      this.clearCanvas()
    }

    // Notes about how to implement and cache color palette iterations:
    // create a noise source image, but how to start the data? maybe this method takes care of it
    // then, refactor the generate noise pattern to take in a noise color palette and noise data
    // then, refactor source image color palette function to take in a seed value, so color palettes are saved with that
    // ie: const { noiseColors, noiseColorPalette } = this.noiseSourceImage.getColorPalette(this.colorPaletteSize, this.noiseSeed)
    // ie: generateNoisePattern({ colorPalette, noiseColorPalette, noiseColors })
    const { colorClusters, colorPalette } = this.sourceImage.getColorPalette(this.colorPaletteSize)
    const { canvas } = generateNoisePattern({
      canvas: this.canvas || document.createElement('canvas'),
      colorClusters,
      colorPalette,
      colorPaletteSize: this.colorPaletteSize,
      noiseSeed: this.noiseSeed,
      options,
      patternHeight: this.patternSize.height,
      patternWidth: this.patternSize.width,
    })

    if (!this.canvas) {
      this.canvas = canvas
      this.renderNewCanvas()
    }
  }

  public regeneratePalette(size: number) {
    if (size === this.colorPaletteSize) {
      return
    }

    this.colorPaletteSize = size
    this.generate({})
  }

  // TODO
  public setDimensions() {}

  // TODO
  public setNoiseSeed() {}

  // TODO
  public save() {}
}
