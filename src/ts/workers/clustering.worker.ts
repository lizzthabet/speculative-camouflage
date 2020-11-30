import { createColorPalette } from "../colors/palette";
import { ColorPaletteInput } from "../types";

const worker: Worker = self as any

worker.onmessage = (event: MessageEvent<ColorPaletteInput>) => {
  try {
    const result = createColorPalette(event.data)
    worker.postMessage(result)
  } catch (error) {
    // TODO: Handle errors!
  }
}
