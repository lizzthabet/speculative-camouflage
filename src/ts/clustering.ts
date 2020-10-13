import * as _ from "lodash";
import { Color, Cluster, ValueRange, ColorList, NearestCentroid } from "./types";
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

const euclideanDistance = (a: Color, b: Color) => {
  if (a.length !== b.length) return Infinity;

  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(b[i] - a[i], 2)
  }

  return Math.sqrt(sum)
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

export const findNearestCentroid = (color: Color, centroids: ColorList): NearestCentroid => {
  let nearestCentroid = centroids[0]
  let nearestCentroidIdx = 0
  let nearestDistance = Infinity

  centroids.forEach((centroid, idx) => {
    const distance = euclideanDistance(color, centroid)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestCentroid = centroid
      nearestCentroidIdx = idx
    }
  })

  return { centroid: nearestCentroid, index: nearestCentroidIdx };
}

const clusterDataPoints = (data: ColorList, centroids: ColorList) => {
  const clusters: Cluster = []
  centroids.forEach(() => clusters.push([]))

  data.forEach(color => {
    const { index } = findNearestCentroid(color, centroids)

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
  let clusters = clusterDataPoints(data, newCentroids)
  let iterations = 0

  while (!_.isEqual(previousCentroids, newCentroids) && iterations < ITERATION_LIMIT) {
    previousCentroids = newCentroids
    newCentroids = getNewCentroids(clusters)
    clusters = clusterDataPoints(data, newCentroids)
    iterations++
  }

  if (iterations >= ITERATION_LIMIT) {
    throw new Error("Unable to cluster colors into `k` groups within set iteration limit. It's likely colors in the image are too similiar to cluster into `k` groups. Try running again with a lower `k` value.")
  }

  console.log(`Ran clustering with ${iterations} iterations`)

  return { clusters, centroids: newCentroids }
}