import * as p5 from "p5";
import { perlinHue, perlinBri, perlinSat, addRandomToOffset } from "./helpers";
import { CANVAS_HEIGHT, CANVAS_WIDTH, config, HUE_START, SAT_START, BRI_START } from "./constants";
import { Cluster, ColorList } from "./types";
import { kMeans, sortByFrequency } from "./clustering";

const colors: Array<[number, number, number]> = []
const clusters: Cluster = []
const centroids: ColorList = []

const sketch = (p: p5) => {
  p.setup = () => {
    p.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  };

  p.windowResized = () => {};

  p.draw = () => {
    // Set up color mode and random values
    p.colorMode(p.HSB, 100)
    p.randomSeed(config.nSeed)
    p.noiseSeed(config.nSeed)
    p.noiseDetail(config.nDetail, config.nAdjust)

    const COLS = Math.floor(CANVAS_WIDTH / config.scale)
    const ROWS = Math.floor(CANVAS_HEIGHT / config.scale)
    let yoffset = 0

    // Loop through canvas space
    for (let y = 0; y < ROWS; y++) {
      let xHueOff = HUE_START, xSatOff = SAT_START, xBriOff = BRI_START

      for (let x = 0; x < COLS; x++) {
        let hue: number, bri: number, sat: number

        // Introduce random additions to Perlin noise values
        if (p.random(100) < config.rNumThresh) {
          const [rHueXoff, rHueYoff] = addRandomToOffset(p, xHueOff, y, config.rHueThresh)
          hue = perlinHue(p, rHueXoff, rHueYoff)

          const [rBriXoff, rBriYoff] = addRandomToOffset(p, xBriOff, y, config.rBriThresh)
          bri = perlinBri(p, rBriXoff, rBriYoff)

          const [rSatXoff, rSatYoff] = addRandomToOffset(p, xSatOff, y, config.rSatThresh)
          sat = perlinSat(p, rSatXoff, rSatYoff)

        } else {
          // No random additions to Perlin noise values
          hue = perlinHue(p, xHueOff, yoffset)
          sat = perlinSat(p, xSatOff, yoffset)
          bri = perlinBri(p, xBriOff, yoffset)
        }

        // Draw rectangle with color
        p.noStroke()
        p.fill(p.color(hue, sat, bri))
        p.rect(x * config.scale, y * config.scale, config.scale, config.scale)

        // Increment the x offset values
        xHueOff += config.increment
        xSatOff += config.increment
        xBriOff += config.increment

        colors.push([hue, sat, bri])
      }

      // Increment the y offset value
      yoffset += config.increment
    }

    // For performance
    p.noLoop();
  };
};

const camo: HTMLElement = document.getElementById('camo')
const color: HTMLElement = document.getElementById('color')

new p5(sketch, camo);

const sketchColor = (p: p5) => {
  p.setup = () => p.createCanvas(CANVAS_WIDTH + config.scale * 5, CANVAS_HEIGHT);

  p.draw = () => {
    p.colorMode(p.HSB, 100)

    const COLS = Math.floor(CANVAS_WIDTH / config.scale)
    const ROWS = Math.floor(CANVAS_HEIGHT / config.scale)

    const allColorsDeclustered: ColorList = []
    clusters.forEach(cluster => cluster.forEach(c => allColorsDeclustered.push(c)))
    let colorIndex = 0;
    let centroidIndex = 0;

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        p.noStroke()
        p.fill(p.color(...allColorsDeclustered[colorIndex]))
        p.rect(x * config.scale, y * config.scale, config.scale, config.scale)
        colorIndex++
      }

      if (y * config.scale % (config.scale * 5) === 0 && centroids[centroidIndex]) {
        p.noStroke()
        p.fill(p.color(...centroids[centroidIndex]))
        p.rect(COLS * config.scale, y * config.scale, config.scale * 5, config.scale * 5)
        centroidIndex++
      }
    }

    p.noLoop();
  };
};

document.getElementById('process-colors').addEventListener('click', () => {
  const [kClusters, kCentroids] = kMeans(colors, 16)
  const [sortedKClusters, sortedKCentroids] = sortByFrequency(kClusters, kCentroids)

  clusters.push(...sortedKClusters)
  centroids.push(...sortedKCentroids)

  new p5(sketchColor, color)
})

// Some notes on next steps:
// At 600 x 600, array has 14,400 colors
// At 400 x 400, array has 6,400 colors
// Need the 16 most common colors, which will be saved through clustering algorithm
// Then loop through the canvas space, find out which common color a color is close to, and then replace with that common color?

// Step 1: Perform clustering algo
// --> Draw a canvas with the clustered colors
// Step 2: Loop through each color and find out which bucket it belongs in (centroids)

