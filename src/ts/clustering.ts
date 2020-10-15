import * as _ from "lodash";
import { Color, Cluster, ValueRange, ColorList, NearestCentroid, DistanceCalculation } from "./types";
import { randomInt } from "./helpers";
import { ITERATION_LIMIT } from "./constants";

// Clustering techniques adapted from Xander Lewis
// https://towardsdatascience.com/extracting-colours-from-an-image-using-k-means-clustering-9616348712be
// https://github.com/xanderlewis/colour-palettes

export const sortByFrequency = (cl: Cluster, ct: ColorList): { sortedClusters: Cluster, sortedCentroids: ColorList } => {
  const sortedClusters: Cluster = []
  const sortedCentroids: ColorList = []
  const freqList: Array<[number, number]> = []
  cl.forEach((cluster, idx) => freqList.push([cluster.length, idx]))
  freqList.sort((a, b) => b[0] - a[0])
  freqList.forEach(([_length, idx]) => {
    sortedClusters.push(cl[idx])
    sortedCentroids.push(ct[idx])
  })

  return {sortedClusters, sortedCentroids}
}

const mean = (values: number[]) => values.reduce((total, v) => total + v) / values.length

const meanPoint = (cluster: ColorList) => {
  const mPoint = []
  for (let i = 0; i < cluster[0].length; i++) {
    const values = cluster.map(v => v[i]);
    mPoint.push(mean(values))
  }

  return mPoint as Color
}

const c = (x: number, y: number) => Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))

const normalizeRadians = (r: number) => r < 0 ? r + 2 * Math.PI : r

export const euclideanDistance = (a: Color, b: Color) => {
  if (a.length !== b.length) return Infinity;

  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(b[i] - a[i], 2)
  }

  return Math.sqrt(sum)
}

// The CIEDE2000 color difference formula
// http://www2.ece.rochester.edu/~gsharma/ciede2000/ciede2000noteCRNA.pdf
// http://zschuessler.github.io/DeltaE/learn/
// TODO: Add more detail and explanation to these calculations
export const deltaE00Distance = (lab1: Color, lab2: Color) => {
  // Step 1
  const [ l1, a1, b1 ] = lab1
  const [ l2, a2, b2 ] = lab2

  const c1 = c(a1, b1)
  const c2 = c(a2, b2)
  const cbar = (c1 + c2) / 2

  const g = 0.5 * (
    1 - Math.sqrt(
      Math.pow(cbar, 7) / (Math.pow(cbar, 7) + Math.pow(25, 7))
    )
  )

  const a1Prime = (1 + g) * a1
  const a2Prime = (1 + g) * a2

  const c1Prime = c(a1Prime, b1)
  const c2Prime = c(a2Prime, b2)

  const h1Prime = b1 === 0 && a1Prime === 0 ? 0 : normalizeRadians(Math.atan2(b1, a1Prime))
  const h2Prime = b2 === 0 && a2Prime === 0 ? 0 : normalizeRadians(Math.atan2(b2, a2Prime))

  // Step 2: Calculate deltaLPrime, deltaCPrime, deltaHPrime
  const deltaLPrime = l2 - l1
  const deltaCPrime = c2Prime - c1Prime

  let deltaHPrime;
  if (c1Prime === 0 || c2Prime === 0) {
    deltaHPrime = 0
  } else if (Math.abs(h2Prime - h1Prime) <= Math.PI) {
    deltaHPrime = h2Prime - h1Prime
  } else if (h2Prime - h1Prime > Math.PI) {
    deltaHPrime = (h2Prime - h1Prime) - 2 * Math.PI
  } else if (h2Prime - h1Prime < -Math.PI) {
    deltaHPrime = (h2Prime - h1Prime) + 2 * Math.PI
  }

  // Step 3: Calculate CIEDE2000 Color-Difference
  const deltaHPrimeProper = 2 * Math.sqrt(c1Prime * c2Prime) * Math.sin(deltaHPrime / 2)

  const lBarPrime = (l1 + l2) / 2
  const cBarPrime = (c1Prime + c2Prime) / 2

  let hBarPrime;
  if (c1Prime === 0 || c2Prime === 0) {
    hBarPrime = h1Prime + h2Prime
  } else if (Math.abs(h1Prime - h2Prime) <= Math.PI) {
    hBarPrime = (h1Prime + h2Prime ) / 2
  } else if (h1Prime + h2Prime < 2 * Math.PI) {
    hBarPrime = (h1Prime + h2Prime + 2 * Math.PI) / 2
  } else if (h1Prime + h2Prime >= 2 * Math.PI) {
    hBarPrime = (h1Prime + h2Prime - 2 * Math.PI) / 2
  }

  // Degrees converted radians
  const deg30 = Math.PI / 6
  const deg6 = Math.PI / 30
  const deg63 = Math.PI * 7 / 20
  const deg275 = Math.PI * 55 / 36

  const t = 1 - 0.17 *
    Math.cos(hBarPrime - deg30) +
    0.24 * Math.cos(2 * hBarPrime) +
    0.32 * Math.cos(3 * hBarPrime + deg6) -
    0.20 * Math.cos(4 * hBarPrime - deg63)

  const deltaTheta = deg30 * Math.exp(
    -1 * Math.pow((hBarPrime - deg275) / 25, 2)
    )

  const rC = 2 * Math.sqrt(
    Math.pow(cBarPrime, 7) / (
      Math.pow(cBarPrime, 7) + Math.pow(25, 7)
    )
  )
  const rT = -1 * Math.sin(2 * deltaTheta) * rC

  const sL = 1 + 0.015 * Math.pow(lBarPrime - 50, 2) / Math.sqrt(20 + Math.pow(lBarPrime - 50, 2))

  const sC = 1 + 0.045 * cBarPrime

  const sH = 1 + 0.015 * cBarPrime * t

  const deltaE = Math.sqrt(
    Math.pow(deltaLPrime / sL, 2) +
    Math.pow(deltaCPrime / sC, 2) +
    Math.pow(deltaHPrimeProper / sH, 2) +
    rT * (deltaCPrime / sC) * (deltaHPrimeProper / sH)
  )

  return deltaE
}

const initializeCentroidsRandomly = (data: ColorList, k: number) => {
  const centroids: ColorList = []
  const selectedIndices: Set<number> = new Set()

  for (let i = 0; i < k; i++) {
    let index = randomInt(0, data.length - 1)

    // If a random index has already been selected,
    // choose another one
    while (selectedIndices.has(index)) {
      index = randomInt(0, data.length - 1)
    }

    centroids.push(data[index])
    selectedIndices.add(index)
  }
  
  return centroids
}

export const findNearestCentroid = (color: Color, centroids: ColorList, distanceBwPoints: DistanceCalculation): NearestCentroid => {
  let nearestCentroid = centroids[0]
  let nearestCentroidIdx = 0
  let nearestDistance = Infinity

  centroids.forEach((centroid, idx) => {
    const distance = distanceBwPoints(color, centroid)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestCentroid = centroid
      nearestCentroidIdx = idx
    }
  })

  return { centroid: nearestCentroid, index: nearestCentroidIdx };
}

const clusterDataPoints = (data: ColorList, centroids: ColorList, distanceCalculation: DistanceCalculation) => {
  const clusters: Cluster = []
  centroids.forEach(() => clusters.push([]))

  data.forEach(color => {
    const { index } = findNearestCentroid(color, centroids, distanceCalculation)

    clusters[index].push(color)
  })

  return clusters
}

const getNewCentroids = (clusters: Cluster) => {
  const centroids: ColorList = []
  clusters.forEach(cluster => {
    const mPoint = meanPoint(cluster)
    centroids.push(mPoint)
  })

  return centroids
}

export const kMeans = (data: ColorList, k: number): { clusters: Cluster, centroids: ColorList } => {
  if (k > data.length) {
    throw new Error('Cannot divide data list into `k` groups because `k` exceeds data length. Provide a smaller `k` value.')
  }

  let previousCentroids: ColorList = []
  let newCentroids = initializeCentroidsRandomly(data, k)
  let clusters = clusterDataPoints(data, newCentroids, euclideanDistance)
  let iterations = 0

  while (!_.isEqual(previousCentroids, newCentroids) && iterations < ITERATION_LIMIT) {
    previousCentroids = newCentroids
    newCentroids = getNewCentroids(clusters)
    clusters = clusterDataPoints(data, newCentroids, euclideanDistance)
    iterations++
  }

  if (iterations >= ITERATION_LIMIT) {
    throw new Error("Unable to cluster colors into `k` groups within set iteration limit. It's likely colors in the image are too similiar to cluster into `k` groups. Try running again with a lower `k` value.")
  }

  console.log(`Ran clustering with ${iterations} iterations`)

  return { clusters, centroids: newCentroids }
}

export const kMeansTest = (data: ColorList, k: number): { clusters: Cluster, centroids: ColorList } => {
  if (k > data.length) {
    throw new Error('Cannot divide data list into `k` groups because `k` exceeds data length. Provide a smaller `k` value.')
  }

  let previousCentroids: ColorList = []
  let newCentroids = initializeCentroidsRandomly(data, k)
  let clusters = clusterDataPoints(data, newCentroids, deltaE00Distance)
  let iterations = 0

  while (!_.isEqual(previousCentroids, newCentroids) && iterations < ITERATION_LIMIT) {
    previousCentroids = newCentroids
    newCentroids = getNewCentroids(clusters)
    clusters = clusterDataPoints(data, newCentroids, deltaE00Distance)
    iterations++
  }

  if (iterations >= ITERATION_LIMIT) {
    throw new Error("Unable to cluster colors into `k` groups within set iteration limit. It's likely colors in the image are too similiar to cluster into `k` groups. Try running again with a lower `k` value.")
  }

  console.log(`Ran clustering with ${iterations} iterations`)

  return { clusters, centroids: newCentroids }
}
