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

// TODO: Add complexity / cell number as input
export function drawVoronoiPatternWithImageColors({
  imageCentroids,
  patternHeight,
  patternWidth,
}: {
  imageCentroids: ColorList,
  imageClusters: Cluster,
  patternHeight: number,
  patternWidth: number,
}) {
  const canvas: HTMLCanvasElement = document.createElement('canvas')
  canvas.height = patternHeight
  canvas.width = patternWidth
  const ctx = canvas.getContext('2d')

  const canvasWrapper = createCanvasWrapper('voronoi-pattern', true, 'Voronoi pattern using image source colors')
  canvasWrapper.appendChild(canvas)

  const boundingBox: VoronoiBoundingBox = { xl: 0, xr: patternWidth, yt: 0, yb: patternHeight }
  const randomSites: VoronoiSites = []

  // Hardcoding the number of sites / cells for now
  for (let i = 0; i < 25; i++) {
    randomSites.push({
      x: randomInt(0, patternWidth),
      y: randomInt(0, patternHeight),
    })
  }

  const diagram = new Voronoi().compute(randomSites, boundingBox)

  const simplifiedCells = diagram.cells.map(cell => {
    return cell.halfedges.map(edge => edge.getEndpoint())
  })

  // Loop through the simplified cell data to draw each cell with a random gradient
  simplifiedCells.forEach(cell => {
    ctx.fillStyle = createRandomGradientForCell(cell, ctx, imageCentroids)
    ctx.beginPath()
    cell.forEach((vertex, i) => {
      if (i === 0) {
        // The `moveTo` method just moves the pen coordinates; it doesn't actually draw anything and it should be called first
        ctx.moveTo(vertex.x, vertex.y)
      } else {
        ctx.lineTo(vertex.x, vertex.y)
      }
    })
    ctx.closePath()
    ctx.fill()
  })
}

export function createRandomGradientForCell(cell: VoronoiVertex[], ctx: CanvasRenderingContext2D, colors?: ColorList) {
  const { top, bottom } = findGradientPoints(cell)
  const gradient = ctx.createLinearGradient(top.x, top.y, bottom.x, bottom.y)

  let colorA: Color;
  let colorB: Color;
  if (colors && colors.length) {
    let randomIdxA = randomInt(0, colors.length - 1)
    let randomIdxB = randomInt(0, colors.length - 1)
    while (randomIdxA === randomIdxB) {
      randomIdxB = randomInt(0, colors.length - 1)
    }

    colorA = colors[randomIdxA]
    colorB = colors[randomIdxB]
  } else {
    colorA = [randomInt(0, 255), randomInt(0, 255), randomInt(0, 255)]
    colorB = [randomInt(0, 255), randomInt(0, 255), randomInt(0, 255)]
  }

  const [rA, gA, bA] = colorA
  const [rB, gB, bB] = colorB

  gradient.addColorStop(0, `rgb(${rA}, ${gA}, ${bA})`)
  gradient.addColorStop(1, `rgb(${rB}, ${gB}, ${bB})`)

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

function randomRgbStringColor() {
  return `rgb(${randomInt(0, 255)}, ${randomInt(0, 255)}, ${randomInt(0, 255)})`
}