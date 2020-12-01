import { createColorPalette } from "./colors/palette";
import { viewColorPalette } from "./colors/visualize";
import { ColorList, ColorMode, ColorPaletteOutput, ColorPaletteState } from "./types";

export class PatternState {
  sourceImage: null | SourceImage = null;

  constructor() {}

  get source() {
    return this.sourceImage
  }

  set source(image: SourceImage) {
    this.sourceImage = image
  }
}

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

  getColorPalette(size: number) {
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

  viewColorPalette(size: number) {
    const palette = this.getColorPalette(size)

    return viewColorPalette(palette)
  }
}
