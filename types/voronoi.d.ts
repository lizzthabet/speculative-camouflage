// Incomplete types declared for Voronoi NPM package
// More info can be found here: https://www.npmjs.com/package/voronoi
declare module "voronoi/*" {
  export interface VoronoiBoundingBox {
    xl: number,
    xr: number,
    yt: number,
    yb: number,
  }

  export interface VoronoiVertex {
    x: number,
    y: number,
    voronoiId?: number,
  }

  export type VoronoiSites = VoronoiVertex[]

  interface VoronoiEdge {
    lSite: VoronoiVertex;
    rSite: VoronoiVertex | null;
    va: VoronoiVertex;
    vb: VoronoiVertex;
  }

  interface VoronoiHalfedge {
    angle: number;
    edge: VoronoiEdge;
    site: VoronoiVertex;
    getStartpoint(): VoronoiVertex;
    getEndpoint(): VoronoiVertex;
  }

  interface VoronoiCell {
    site: VoronoiVertex;
    halfedges: VoronoiHalfedge[];
  }

  export interface VoronoiDiagram {
    cells: VoronoiCell[];
    edges: VoronoiEdge[];
    execTime: string;
    site: undefined;
    vertices: VoronoiVertex[];
    recycle(diagram: VoronoiDiagram): VoronoiDiagram;
  }

  class Voronoi {
    compute(sites: VoronoiSites, bbox: VoronoiBoundingBox): VoronoiDiagram;
  }

  export { Voronoi as default }
}
