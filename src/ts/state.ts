import { VoronoiVertex } from "voronoi/*";
import { createColorPalette } from "./colors/palette";
import { viewColorPalette } from "./colors/visualize";
import { DEFAULT_VORONOI_SITES } from "./constants";
import { clearCanvas, generateShapeDisruptivePattern, viewShapeDisruptivePattern } from "./patterns/shape-pattern";
import { Color, ColorList, ColorMode, ColorPaletteOutput, ColorPaletteState, ShapeDisruptiveOptions } from "./types";

export class PatternState {
  private sourceImage: null | SourceImage = null;
  private shapeDisruptive: null | ShapeDisruptivePattern = null;

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

  public save() {
    // TODO
  }
}
