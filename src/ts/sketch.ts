import * as p5 from "p5";
import { perlinHue, perlinBri, perlinSat, addRandomToOffset } from "./helpers";
import { CANVAS_HEIGHT, CANVAS_WIDTH, config, HUE_START, SAT_START, BRI_START } from "./constants";
import { Cluster, ColorList } from "./types";
import { kMeans, sortByFrequency, findNearestCentroid } from "./clustering";

const colors: Array<[number, number, number]> = []
const clusters: Cluster = []
const centroids: ColorList = []

// GENERATE ORIGINAL PATTERN
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
const countEl: HTMLElement = document.getElementById('count')
const mapEl: HTMLElement = document.getElementById('map')

new p5(sketch, camo);

// VISUALIZE COLOR COUNT
const sketchColorCount = (p: p5) => {
  p.setup = () => p.createCanvas(CANVAS_WIDTH + config.scale * 5, CANVAS_HEIGHT);

  p.draw = () => {
    p.colorMode(p.HSB, 100)

    const COLS = Math.floor(CANVAS_WIDTH / config.scale)
    const ROWS = Math.floor(CANVAS_HEIGHT / config.scale)

    // Flatten the clustered colors into a 2D array of colors
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

// MAP ORIGINAL COLORS TO 16 MOST FREQUENT COLORS
const sketchColorMap = (p: p5) => {
  p.setup = () => p.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);

  p.draw = () => {
    p.colorMode(p.HSB, 100)

    const COLS = Math.floor(CANVAS_WIDTH / config.scale)
    const ROWS = Math.floor(CANVAS_HEIGHT / config.scale)
    let colorIdx = 0;

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const originalColor = colors[colorIdx]
        const { centroid } = findNearestCentroid(originalColor, centroids)

        p.noStroke()
        p.fill(p.color(...centroid))
        p.rect(x * config.scale, y * config.scale, config.scale, config.scale)
        colorIdx++;
      }
    }

    p.noLoop();
  };
}

document.getElementById('count-colors').addEventListener('click', () => {
  const [kClusters, kCentroids] = kMeans(colors, 16)
  const [sortedKClusters, sortedKCentroids] = sortByFrequency(kClusters, kCentroids)

  clusters.push(...sortedKClusters)
  centroids.push(...sortedKCentroids)

  new p5(sketchColorCount, countEl)
})

document.getElementById('map-colors').addEventListener('click', () => new p5(sketchColorMap, mapEl))
