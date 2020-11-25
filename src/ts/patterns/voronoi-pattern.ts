/**
 * Some TODOS:
 * - Add some controls to dial in the pattern!
 *    - Number of cells in voronoi diagram
 *    - Number of colors in color palette
 *    - Randomizing the colors (random pairing for the same diagram, done again)
 *      - Weighted randomization, so that the colors in the palette are weighted by frequency
 *    - Randomizing the site generation
 * - Clean up and organize voronoi code
 */

import Voronoi, { VoronoiVertex, VoronoiSites, VoronoiBoundingBox } from "voronoi/rhill-voronoi-core"
import { randomInt } from "../helpers"
import { createCanvasWrapper } from "../sketch";
import { Color, ColorList, Cluster } from "../types"

let lastSites: VoronoiSites
let lastGradients: [Color, Color][] = []

export function drawVoronoiPatternWithImageColors({
  imageCentroids,
  numSites,
  patternHeight,
  patternWidth,
  suppliedCanvas,
  useLastGradients,
  useLastSites,
}: {
  imageCentroids: ColorList,
  imageClusters: Cluster,
  numSites: number,
  patternHeight: number,
  patternWidth: number,
  suppliedCanvas?: HTMLCanvasElement,
  useLastGradients?: boolean,
  useLastSites?: boolean,
}) {
  const canvas: HTMLCanvasElement = suppliedCanvas ? suppliedCanvas : document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  // If we're not drawing on an existing canvas:
  if (!suppliedCanvas) {
    // Set the canvas height and width
    canvas.height = patternHeight
    canvas.width = patternWidth

    // Add the canvas to a wrapper element and append to DOM
    const canvasWrapper = createCanvasWrapper('voronoi-pattern', true, 'Voronoi pattern using image source colors')
    canvasWrapper.appendChild(canvas)
  }

  const boundingBox: VoronoiBoundingBox = { xl: 0, xr: patternWidth, yt: 0, yb: patternHeight }
  const sites: VoronoiSites = useLastSites ? lastSites : []

  // Create random sites if we're not reusing the previously generated sites
  if (!useLastSites) {
    for (let i = 0; i < numSites; i++) {
      sites.push({
        x: randomInt(0, patternWidth),
        y: randomInt(0, patternHeight),
      })
    }
  }

  // Save the random sites for future pattern iterations
  lastSites = sites

  // Compute the voronoi diagram
  const diagram = new Voronoi().compute(sites, boundingBox)

  console.log(`Finished generating voronoi diagram with ${sites.length} sites`)

  // Simplify the voronoi cell and vertex data so it's easier to iterate through
  const simplifiedCells = diagram.cells.map(cell => {
    return cell.halfedges.map(edge => edge.getEndpoint())
  })

  // Loop through the simplified cell data to draw each cell with a gradient
  simplifiedCells.forEach((cell, idx) => {
    let gradient: CanvasGradient
    if (useLastGradients) {
      // Use the previous gradient color pairing
      const [ colorA, colorB ] = lastGradients[idx]
      // Regenerate the canvas gradient based on new cell size
      gradient = createGradientForCell(cell, ctx, colorA, colorB)
    } else {
      // Generate a random gradient from the supplied color palette
      const randomGradientData = createRandomGradientForCell(cell, ctx, imageCentroids)
      gradient = randomGradientData.gradient
      // Save the gradient color pairings for future use
      lastGradients[idx] = [ randomGradientData.colorA, randomGradientData.colorB ]
    }

    // Set the gradient as the style for this cell
    ctx.fillStyle = gradient
    ctx.beginPath()
    // Loop through the cell's vertices to draw each one
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

  return canvas
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
