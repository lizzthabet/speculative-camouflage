import { VoronoiVertex } from "voronoi/*";
import { createColorPalette, drawColorPalette, viewColorPalette } from "./colors/palette";
import { config, DEFAULT_VORONOI_SITES } from "./constants";
import {
  createNoisePatternEditForm,
  EditNoiseControls,
  EditShapeControls,
  createShapePatternEditForms
} from "./forms";
import { pixelsToInches } from "./helpers";
import { generateNoisePattern, viewNoisePattern, generateNoiseSourcePattern } from "./patterns/noise-pattern";
import { clearCanvas, generateShapeDisruptivePattern, viewShapeDisruptivePattern } from "./patterns/shape-pattern";
import {
  Color,
  ColorList,
  ColorMode,
  ColorPaletteOutput,
  ColorPaletteState,
  NoisePatternOptions,
  ShapeDisruptiveOptions
} from "./types";

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

export class SourceImage {
  private palettes: { [key: string]: ColorPaletteState } = {}
  private paletteCanvas: HTMLCanvasElement = null
  private colorsCanvas: HTMLCanvasElement = null
  private lastVisualizedPalette: string = null

  constructor(private rawColorData: ColorList, private mode: ColorMode) {}

  private paletteKey(size: number, seed?: number) {
    return `${size}${seed ? '-' + seed : ''}`
  }

  private getPalette(size: number, seed?: number) {
    const key = this.paletteKey(size, seed)
    return this.palettes[key] || undefined
  }

  private setPalette(palette: ColorPaletteOutput, seed?: number) {
    const key = this.paletteKey(palette.colorPalette.length, seed)
    this.palettes[key] = palette
  }

  private renderPaletteCanvases() {
    viewColorPalette(this.paletteCanvas, this.colorsCanvas)
  }

  private clearCanvases() {
    clearCanvas(this.paletteCanvas)
    clearCanvas(this.colorsCanvas)
  }

  public get colorMode() {
    return this.mode
  }

  public set colorData(colors: ColorList) {
    this.rawColorData = colors
  }

  public get colorData() {
    return this.rawColorData
  }

  public getColorPalette(size: number, seed?: number) {
    const colorPaletteExists = this.getPalette(size, seed)

    if (!!colorPaletteExists) {
      return colorPaletteExists
    }

    // TODO: Add error handling and potentially colorPaletteSizeLimit on the state
    const palette = createColorPalette({
      colors: this.rawColorData,
      colorPaletteSize: size,
      colorMode: this.colorMode
    })

    this.setPalette(palette, seed)

    return palette
  }

  public drawColorPalette(size: number, seed?: number) {
    const paletteKey = this.paletteKey(size, seed)
    if (this.lastVisualizedPalette === paletteKey) {
      return
    }

    const palette = this.getColorPalette(size, seed)

    if (this.paletteCanvas && this.colorsCanvas) {
      this.clearCanvases()
    }

    const { paletteCanvas, colorsCanvas } = drawColorPalette(
      palette,
      this.paletteCanvas || document.createElement('canvas'),
      this.colorsCanvas || document.createElement('canvas')
    )

    if (!this.paletteCanvas && !this.colorsCanvas) {
      this.paletteCanvas = paletteCanvas
      this.colorsCanvas = colorsCanvas
      this.renderPaletteCanvases()
    }

    this.lastVisualizedPalette = paletteKey
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

    // Visualize the new palette
    this.sourceImage.drawColorPalette(this.colorPaletteSize)
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

  public setDimensions(size: { width: number; height: number; }) {
    this.patternSize = size

    this.generate(this.numSites, {})
  }

  public createEditForm() {
    const defaultValues = {
      [EditShapeControls.PaletteSize]: String(this.colorPaletteSize),
      [EditShapeControls.PatternHeight]: String(pixelsToInches(this.patternSize.height)),
      [EditShapeControls.PatternWidth]: String(pixelsToInches(this.patternSize.width)),
      [EditShapeControls.NumShapes]: String(this.numSites),
    }

    return createShapePatternEditForms(this, defaultValues)
  }
}

export class NoisePattern {
  private canvas: HTMLCanvasElement = null
  private noiseSeed: number = config.nSeed
  private noiseSourceImage: SourceImage = null

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
    // Create the noise source and color data
    if (!this.noiseSourceImage) {
      const rawNoiseData = generateNoiseSourcePattern(
        this.patternSize.width,
        this.patternSize.height,
        this.noiseSeed,
        this.noiseSeed
      )

      this.noiseSourceImage = new SourceImage(rawNoiseData, ColorMode.HSB)
    }

    // Fetch the color palettes that will compose the noise pattern
    const { colorPalette: noiseColorPalette } = this.noiseSourceImage.getColorPalette(this.colorPaletteSize, this.noiseSeed)
    const { colorClusters, colorPalette } = this.sourceImage.getColorPalette(this.colorPaletteSize)

    // Clear any existing canvas state
    if (this.canvas) {
      this.clearCanvas()
    }

    const { canvas } = generateNoisePattern({
      canvas: this.canvas || document.createElement('canvas'),
      colorClusters,
      colorPalette,
      noiseColors: this.noiseSourceImage.colorData,
      noiseColorPalette,
      options,
      patternHeight: this.patternSize.height,
      patternWidth: this.patternSize.width,
    })

    if (!this.canvas) {
      this.canvas = canvas
      this.renderNewCanvas()
    }

    // Visualize the new palette
    this.sourceImage.drawColorPalette(this.colorPaletteSize)
  }

  public regeneratePalette(size: number) {
    if (size === this.colorPaletteSize) {
      return
    }

    this.colorPaletteSize = size
    this.generate({})
  }

  // Note: The noise source color palette is not regenerated with a size change;
  // this may be functionality to add in the future, where palettes are also key'd by size
  public setDimensions(size: { width: number; height: number; }) {
    this.patternSize = size

    // Generate new source color data for the noise pattern
    this.noiseSourceImage.colorData = generateNoiseSourcePattern(
      this.patternSize.width,
      this.patternSize.height,
      this.noiseSeed,
      this.noiseSeed
    )

    this.generate({})
  }

  public setNoiseSeed(newSeed: number) {
    if (newSeed === this.noiseSeed) {
      return
    }

    this.noiseSeed = newSeed
    // Generate new source color data for the noise pattern
    this.noiseSourceImage.colorData = generateNoiseSourcePattern(
      this.patternSize.width,
      this.patternSize.height,
      this.noiseSeed,
      this.noiseSeed
    )
    // Create a color palette with the new source color data
    this.noiseSourceImage.getColorPalette(this.colorPaletteSize, newSeed)

    this.generate({})
  }

  public createEditForm() {
    const defaultValues = {
      [EditNoiseControls.PaletteSize]: String(this.colorPaletteSize),
      [EditNoiseControls.PatternHeight]: String(pixelsToInches(this.patternSize.height)),
      [EditNoiseControls.PatternWidth]: String(pixelsToInches(this.patternSize.width)),
      [EditNoiseControls.Seed]: String(this.noiseSeed),
    }

    return createNoisePatternEditForm(this, defaultValues)
  }
}
