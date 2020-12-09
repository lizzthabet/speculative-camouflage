import Voronoi, { VoronoiVertex, VoronoiSites, VoronoiBoundingBox } from "voronoi/rhill-voronoi-core"
import { randomInt } from "../helpers"
import { createCanvasWrapper } from "./sketch-helpers";
import { Color, ColorList, ShapeDisruptiveInput, ShapeDisruptiveOutput } from "../types"

export function generateShapeDisruptivePattern({
  canvas,
  colorPalette,
  numSites,
  options,
  patternHeight,
  patternWidth
}: ShapeDisruptiveInput): ShapeDisruptiveOutput {
  const ctx = canvas.getContext('2d')

  if (canvas.width !== patternWidth) {
    canvas.width = patternWidth
  }

  if (canvas.height !== patternHeight) {
    canvas.height = patternHeight
  }

  const boundingBox: VoronoiBoundingBox = { xl: 0, xr: patternWidth, yt: 0, yb: patternHeight }
  const sites: VoronoiSites = options.reuseSites || []

  // Create random sites if not using the previously generated sites
  if (!options.reuseSites) {
    for (let i = 0; i < numSites; i++) {
      sites.push({
        x: randomInt(0, patternWidth),
        y: randomInt(0, patternHeight),
      })
    }
  }

  const diagram = new Voronoi().compute(sites, boundingBox)

  // Simplify the voronoi cell and vertex data so it's easier to iterate through
  const simplifiedCells = diagram.cells.map(cell => {
    return cell.halfedges.map(edge => edge.getEndpoint())
  })

  const prevColorPairings = options.reuseColorPairings
  const currentColorPairings: [Color, Color][] = []

  // Loop through the simplified cell data to draw each cell with a gradient
  simplifiedCells.forEach((cell, idx) => {
    let gradient: CanvasGradient
    if (prevColorPairings && prevColorPairings[idx]) {
      const [ colorA, colorB ] = prevColorPairings[idx]
      // Regenerate the canvas gradient based on new cell size
      gradient = createGradientForCell(cell, ctx, colorA, colorB)
      currentColorPairings.push([ colorA, colorB ])
    } else {
      const randomGradientData = createRandomGradientForCell(cell, ctx, colorPalette)
      gradient = randomGradientData.gradient
      currentColorPairings.push([ randomGradientData.colorA, randomGradientData.colorB ])
    }

    ctx.fillStyle = gradient
    ctx.beginPath()
    cell.forEach((vertex, i) => {
      if (i === 0) {
        // Note: `moveTo` just moves the pen coordinates to starting position;
        // it doesn't draw anything and needs to be called first
        ctx.moveTo(vertex.x, vertex.y)
      } else {
        ctx.lineTo(vertex.x, vertex.y)
      }
    })
    ctx.closePath()
    ctx.fill()
  })

  return { canvas, colorPairings: currentColorPairings, sites }
}

export function viewShapeDisruptivePattern(canvas: HTMLCanvasElement) {
  const wrapper = createCanvasWrapper(
    'shape-disruptive-pattern',
    true,
    'Shape disruptive pattern'
  )
  wrapper.appendChild(canvas)

  return wrapper
}

export function clearCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  console.log('Clearing canvas context')

  return canvas
}

function createRandomGradientForCell(cell: VoronoiVertex[], ctx: CanvasRenderingContext2D, colors?: ColorList) {
  // Choose a first random color
  const randomIdxA = randomInt(0, colors.length - 1)

  // Make sure that the second random color is not the same as the first one
  let randomIdxB = randomInt(0, colors.length - 1)
  while (randomIdxA === randomIdxB) {
    randomIdxB = randomInt(0, colors.length - 1)
  }

  const colorA = colors[randomIdxA]
  const colorB = colors[randomIdxB]

  const gradient = createGradientForCell(cell, ctx, colorA, colorB)

  return { gradient, colorA, colorB }
}

function createGradientForCell(cell: VoronoiVertex[], ctx: CanvasRenderingContext2D, colorA: Color, colorB: Color) {
  const { top, bottom } = findGradientPoints(cell)
  const gradient = ctx.createLinearGradient(top.x, top.y, bottom.x, bottom.y)

  gradient.addColorStop(0, `rgb(${colorA[0]}, ${colorA[1]}, ${colorA[2]})`)
  gradient.addColorStop(1, `rgb(${colorB[0]}, ${colorB[1]}, ${colorB[2]})`)

  return gradient
}

function findGradientPoints(listOfPoints: VoronoiVertex[]) {
  let leftMostX = Infinity
  let topMostY = Infinity
  let bottomMostY = -Infinity

  listOfPoints.forEach(point => {
    if (point.x < leftMostX) {
      leftMostX = point.x
    }

    if (point.y < topMostY) {
      topMostY = point.y
    }

    if (point.y > bottomMostY) {
      bottomMostY = point.y
    }
  })

  return {
    top: { x: leftMostX, y: topMostY },
    bottom: { x: leftMostX, y: bottomMostY }
  }
}
