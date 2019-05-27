import * as _ from "lodash";
import { Color, Cluster, ValueRange, ColorList, NearestCentroid } from "./types";
import { randomInt } from "./helpers";
import { ITERATION_LIMIT } from "./constants";

// Clustering techniques adapted from Xander Lewis
// https://towardsdatascience.com/extracting-colours-from-an-image-using-k-means-clustering-9616348712be
// https://github.com/xanderlewis/colour-palettes

export const sortByFrequency = (cl: Cluster, ct: ColorList): [Cluster, ColorList] => {
  const sortedCl: Cluster = []
  const sortedCt: ColorList = []
  const freqList: Array<[number, number]> = []
  cl.forEach((cluster, idx) => freqList.push([cluster.length, idx]))
  freqList.sort((a, b) => b[0] - a[0])
  freqList.forEach(([_length, idx]) => {
    sortedCl.push(cl[idx])
    sortedCt.push(ct[idx])
  })

  return [sortedCl, sortedCt]
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

const rangeOf = (values: number[]): ValueRange => {
  return { min: Math.min(...values), max: Math.max(...values) }
}

const rangesOf = (data: ColorList) => {
  const ranges: Array<ValueRange> = []
  const [ firstColor ] = data

  for (let i = 0; i < firstColor.length; i++) {
    // Select each element of the color array
    // Find min and max of that element range
    const values: Array<number> = data.map(c => c[i])
    ranges.push(rangeOf(values))
  }

  return ranges
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
  const ranges = rangesOf(data)
  const centroids: ColorList = []

  while (centroids.length < k) {
    const centroid = []
    for (const r in ranges) {
      // May not want to round these numbers?
      const value = randomInt(ranges[r].min, ranges[r].max)
      centroid.push(value)
    }
    centroids.push(centroid as Color)
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

export const kMeans = (data: ColorList, k: number): [Cluster, ColorList] => {
  let clusters: Cluster, oldClusters: Cluster
  let converged = false
  let iterations = 0

  let centroids = initializeCentroidsRandomly(data, k)

  while (!converged) {
    iterations++
    oldClusters = clusters
    clusters = clusterDataPoints(data, centroids)

    if (clusters.some(c => c.length === 0)) {
      return kMeans(data, k);
    }

    if (_.isEqual(clusters, oldClusters) || iterations >= ITERATION_LIMIT) {
      converged = true
      return [ clusters, centroids ]
    }

    centroids = getNewCentroids(clusters)
  }
}