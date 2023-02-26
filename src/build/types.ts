/** Text contents of an inkscape save file */
export type InkscapeSvg = string;

/** Paths that form a single smooth stroke. */
export type SegmentData = {
    /** [endpoint, control point 1, control point 2, endpoint] */
    xPoints: [number, number, number, number][];
    /** [endpoint, control point 1, control point 2, endpoint] */
    yPoints: [number, number, number, number][];
};

export type LogoData = {
    width: number;
    height: number;
    innerSegments: SegmentData[];
    outerSegments: SegmentData[];
    /** Path that the animation follows */
    animationSegments: SegmentData[];
};

export type SegmentPoints = {
    /** x coordinates */
    xs: number[];
    /** y coordinates */
    ys: number[];
    /** Parametric t value used to calculate this x and y coordinate */
    ts: number[]; // can we derive this from index instead of storing it?
    /**
     * Index of the curve that this point belongs to,
     * since segments can contain multiple curves.
     * For points that belong to two curves, the smaller index is stored.
     */
    curveIndices: number[];
};

/**
 * CumulativeLengths[i][j]:
 * Index i is for segment index.
 * Index j is for point index.
 */
export type CumulativeLengths = number[][];

/** Points to a point along an array of segments. */
export type LengthProgress = {
    segmentIndex: number;
    /**
     * Current progress along the segment by length divided by
     * total length of the segment.
     * Ranges from 0 to 1 inclusive.
     */
    lengthRatio: number;
};

/** Points to a point along an array of bezier curves */
export type DrawProgress = {
    /**
     * Different than LengthProgress's segmentIndex.
     * One segment can contain multiple curves.
     */
    curveIndex: number;
    /**
     * Parameter for drawing the bezier curve.
     * Ranges from 0 to 1 inclusive.
     */
    t: number;
};

export type AnimationData = {
    innerSegments: SegmentData[];
    outerSegments: SegmentData[];
    segmentIndexByFrame: number[];
    innerPathIndexByFrame: number[];
    outerPathIndexByFrame: number[];
    innerTByFrame: number[];
    outerTByFrame: number[];
};
