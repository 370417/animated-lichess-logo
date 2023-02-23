import 'path-data-polyfill';
import { Matrix4, Vector4 } from './linear-algebra';

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

/**
 * Parse input data from an inkscape save file.
 *
 * File should contain open paths labeled as inner{n}, outer{n}, and anim{n}
 * where {n} goes from 1 to 6 (or higher, but the lichess logo only has six
 * distinct sections). Curly braces should not be a part of label name.
 * Label refers to inkscape label, not id.
 *
 * Paths should line up so that inner2 starts where inner1 ends, etc.
 * All paths should point in the same direction.
 */
export function fromInkscape(inkscapeFile: InkscapeSvg): LogoData {
    // First line isn't html, so remove it
    const svgText = inkscapeFile.replace(/<\?xml.*\?>\n/, '');
    // Avoid creating any text nodes when we parse this as html
    const svgNodeText = svgText.trim();

    const template = document.createElement('template');
    template.innerHTML = svgNodeText;
    const svg = template.content.firstChild as SVGElement;

    return parse(svg);
}

function parse(svg: SVGElement): LogoData {
    const pathDataByLabel = new Map<string, PathData[]>();

    for (let i = 0; i < svg.children.length; i++) {
        const child = svg.children[i] as SVGElement;
        const label = child.getAttribute('inkscape:label');

        if (label && child.nodeName === 'path') {
            const path = child as SVGPathElement;
            if (/^(?:inner|outer|anim)\d+$/.test(label)) {
                pathDataByLabel.set(
                    label,
                    path.getPathData({ normalize: true }),
                );
            }
        }
    }

    const innerSegments: SegmentData[] = [];
    const outerSegments: SegmentData[] = [];
    const animationSegments: SegmentData[] = [];
    for (let segmentIndex = 1; true; segmentIndex++) {
        const inner = pathDataByLabel.get('inner' + segmentIndex);
        const outer = pathDataByLabel.get('outer' + segmentIndex);
        const anim = pathDataByLabel.get('anim' + segmentIndex);
        if (!inner || !outer || !anim) break;
        innerSegments.push(pathsToSegment(inner));
        outerSegments.push(pathsToSegment(outer));
        animationSegments.push(pathsToSegment(anim));
    }

    return {
        width: Number(svg.getAttribute('width')),
        height: Number(svg.getAttribute('height')),
        innerSegments,
        outerSegments,
        animationSegments,
    };
}

// PathData has three points per curve. SegmentData has four points per curve.
// Converting to four points per curve helps us iterate over curves backwards
// more easily.
function pathsToSegment(pathData: PathData[]): SegmentData {
    if (pathData.length < 2) throw 'Path data too short';
    const head = pathData[0];
    if (head.type !== 'M') throw 'Path does not start with move';
    let [lastX, lastY] = head.values;
    const xPoints: [number, number, number, number][] = [];
    const yPoints: [number, number, number, number][] = [];
    for (let i = 1; i < pathData.length; i++) {
        const path = pathData[i];
        if (path.type == 'L') {
            // Treat lines as bezier curves with control points
            // on the start and endpoints.
            const [x, y] = path.values;
            xPoints.push([lastX, lastX, x, x]);
            yPoints.push([lastY, lastY, y, y]);
            lastX = x;
            lastY = y;
        } else if (path.type === 'C') {
            const [x1, y1, x2, y2, x, y] = path.values;
            xPoints.push([lastX, x1, x2, x]);
            yPoints.push([lastY, y1, y2, y]);
            lastX = x;
            lastY = y;
        } else {
            throw 'Unsupported path type';
        }
    }
    return { xPoints, yPoints };
}

/**
 * Flatten a series of bezier curves into `iterations + 1` line segments
 * represented by `iterations + 2` points.
 */
export function flatten(
    segments: SegmentData[],
    iterations: number,
): SegmentPoints[] {
    return segments.map((segment) => flattenSegment(segment, iterations));
}

function flattenSegment(
    segment: SegmentData,
    iterations: number,
): SegmentPoints {
    const xs: number[] = [segment.xPoints[0][0]];
    const ys: number[] = [segment.yPoints[0][0]];
    const ts: number[] = [0];
    const curveIndices = [0];
    for (let i = 0; i < segment.xPoints.length; i++) {
        for (let j = 0; j <= iterations; j++) {
            const t = (j + 1) / (iterations + 1);
            xs.push(deCasteljau(segment.xPoints[i], t));
            ys.push(deCasteljau(segment.yPoints[i], t));
            ts.push(t);
            curveIndices.push(i);
        }
    }
    return { xs, ys, ts, curveIndices };
}

/**
 * De Casteljau's algorithm but for a list of scalars instead of a list of points.
 * Does not mutate input array.
 */
function deCasteljau(points: number[], t: number): number {
    const buffer = points.slice();
    for (let length = buffer.length; length > 1; length--) {
        for (let i = 0; i + 1 < length; i++) {
            buffer[i] = lerp(buffer[i], buffer[i + 1], t);
        }
    }
    return buffer[0];
}

/** Linear interpolation */
function lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
}

/** Returns the t for which lerp(min, max, t) === middle */
function inverseLerp(min: number, max: number, middle: number): number {
    return (middle - min) / (max - min);
}

/** Calculate length from start to every point in segment points. */
export function cumulativeLength(points: SegmentPoints[]): CumulativeLengths {
    let length = 0;
    return points.map(({ xs, ys }) => {
        const lengths: number[] = [length];
        for (let i = 0; i + 1 < xs.length; i++) {
            length += distance(xs[i], ys[i], xs[i + 1], ys[i + 1]);
            lengths.push(length);
        }
        return lengths;
    });
}

export function distance(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
): number {
    return Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
}

/** Calculate what the length should be at a given frame. Uses lerp. */
export function lengthAtFrame(
    frame: number,
    maxFrame: number,
    animationLengths: CumulativeLengths,
): number {
    const totalLength = animationLengths.at(-1)?.at(-1);
    if (totalLength === undefined) throw 'Length not found';
    return (totalLength * frame) / maxFrame;
}

/**
 * Calculate progress along the curve in terms of segment index and length ratio.
 *
 * Length ratio is just progress along a specific segment measured as ratio
 * of current length to total length.
 * Calculating segment index and length ratio is useful because we want to
 * constrain the animation to have the inner and outer paths always be at the
 * same segment on any given frame.
 */
export function progressByLength(
    length: number,
    animationLengths: CumulativeLengths,
): LengthProgress {
    for (let i = 0; i < animationLengths.length; i++) {
        const segmentLengthMin = animationLengths[i][0];
        const segmentLengthMax = animationLengths[i].at(-1);
        if (segmentLengthMax === undefined) throw 'Length not found';
        if (length <= segmentLengthMax) {
            return {
                segmentIndex: i,
                lengthRatio:
                    (length - segmentLengthMin) /
                    (segmentLengthMax - segmentLengthMin),
            };
        }
    }
    throw 'Length argument longer than cumulative lengths';
}

/**
 * Calculate progress along a single segment in terms of curve index and t.
 *
 * t is the parametric argument to a bezier curve, ranging from 0 to 1.
 * Curve index is not cumulative. It starts at 0 for each segment even if
 * the segment is not the first segment of the overall path.
 *
 * Length (even length ratio) is different from t, and the exact conversion
 * between the two is complicated, which is why we approximate curves to
 * calculate length.
 *
 * Length is needed to control the visual rate of animation progress.
 * We convert length to t to subdivide bezier curves.
 */
export function progressByT(
    lenthProgress: LengthProgress,
    lengths: CumulativeLengths,
    segments: SegmentPoints[],
): DrawProgress {
    const { segmentIndex, lengthRatio } = lenthProgress;
    const segmentLengths = lengths[segmentIndex];

    // Scale length progress to fit these segments' dimensions
    const segmentLength = segmentLengths.at(-1)! - segmentLengths[0];
    const currentLength = segmentLengths[0] + lengthRatio * segmentLength;

    if (lengthRatio === 0) {
        return {
            curveIndex: segments[segmentIndex].curveIndices[0],
            t: 0,
        };
    } else if (lengthRatio === 1) {
        return {
            curveIndex: segments[segmentIndex].curveIndices.at(-1)!,
            t: 1,
        };
    }

    const [smallerI, largerI] = binarySearch(currentLength, segmentLengths);
    if (largerI >= segmentLengths.length) throw 'length larger than expected';
    if (smallerI < 0) throw 'length smaller than expected';
    const fractionalIndex = inverseLerp(
        segmentLengths[smallerI],
        segmentLengths[largerI],
        currentLength,
    );
    if (fractionalIndex < 0 || fractionalIndex >= 1) {
        throw 'unexpected fractional index';
    }
    const ts = segments[segmentIndex].ts;

    let smallerT = ts[smallerI];
    const largerT = ts[largerI];
    if (smallerT > largerT) {
        // Edge case: if largerI is the first index of a new curve,
        // ts[smallerI] will be 1 because it is from the perspective
        // of the previous curve. We need it to be from the perspective
        // of the current curve, so it should be 0 instead of 1.
        smallerT = 0;
    }

    return {
        // Use largerI instead of smallerI because if
        // curveIndices[largerI] != curveIndices[smallerI],
        // that means smallerI is the index of an endpoint shared between
        // two curves, and curveIndices[smallerI] will be the smaller index
        // of the two possibilities. Since our value is larger than
        // the length at smallerI, we want the larger index.
        curveIndex: segments[segmentIndex].curveIndices[largerI],
        t: lerp(smallerT, largerT, fractionalIndex),
    };
}

/**
 * For a sorted array, returns an index i such that
 * array[i - 1] < value < array[i].
 */
function binarySearch(value: number, array: number[]): [number, number] {
    let high = array.length;
    let low = -1;
    while (1 + low < high) {
        const mid = low + ((high - low) >> 1);
        if (value < array[mid]) {
            high = mid;
        } else {
            low = mid;
        }
    }
    return [high - 1, high];
}

export function createAnimationData(
    logoData: LogoData,
    numFrames: number,
    animationLengths: CumulativeLengths,
    innerLengths: CumulativeLengths,
    outerLengths: CumulativeLengths,
    innerPoints: SegmentPoints[],
    outerPoints: SegmentPoints[],
): AnimationData {
    const innerData = animationData(
        logoData.innerSegments,
        animationLengths,
        innerLengths,
        innerPoints,
        numFrames,
    );
    const outerData = animationData(
        logoData.outerSegments,
        animationLengths,
        outerLengths,
        outerPoints,
        numFrames,
    );
    const { segmentIndexByFrame } = innerData;
    return {
        innerSegments: innerData.segments,
        outerSegments: outerData.segments,
        segmentIndexByFrame,
        innerPathIndexByFrame: innerData.curveIndexByFrame,
        outerPathIndexByFrame: outerData.curveIndexByFrame,
        innerTByFrame: innerData.tByFrame,
        outerTByFrame: outerData.tByFrame,
    };
}

function animationData(
    segments: SegmentData[],
    animationLengths: CumulativeLengths,
    pathLengths: CumulativeLengths,
    points: SegmentPoints[],
    numFrames: number,
) {
    const curveIndexByFrame: number[] = [];
    const segmentIndexByFrame: number[] = [];
    const tByFrame: number[] = [];

    for (let frame = 0; frame < numFrames; frame++) {
        const length = lengthAtFrame(frame, numFrames - 1, animationLengths);
        const lengthProgress = progressByLength(length, animationLengths);
        const progress = progressByT(lengthProgress, pathLengths, points);
        curveIndexByFrame.push(progress.curveIndex);
        segmentIndexByFrame.push(lengthProgress.segmentIndex);
        tByFrame.push(progress.t);
    }

    return {
        segments,
        curveIndexByFrame,
        segmentIndexByFrame,
        tByFrame,
    };
}

export function drawAnimationFrame(
    animationData: AnimationData,
    frame: number,
    ctx: CanvasRenderingContext2D,
) {
    const segmentIndex = animationData.segmentIndexByFrame[frame];
    const innerPathIndex = animationData.innerPathIndexByFrame[frame];
    const outerPathIndex = animationData.outerPathIndexByFrame[frame];
    const innerT = animationData.innerTByFrame[frame];
    const outerT = animationData.outerTByFrame[frame];

    ctx.clearRect(0, 0, 50, 50);

    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(
        animationData.outerSegments[0].xPoints[0][0],
        animationData.outerSegments[0].yPoints[0][0],
    );
    for (let i = 0; i < segmentIndex; i++) {
        const { xPoints, yPoints } = animationData.outerSegments[i];
        for (let j = 0; j < xPoints.length; j++) {
            const [_x0, x1, x2, x3] = xPoints[j];
            const [_y0, y1, y2, y3] = yPoints[j];
            ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
        }
    }
    const currOuterSegment = animationData.outerSegments[segmentIndex];
    {
        const { xPoints, yPoints } = currOuterSegment;
        for (let j = 0; j < outerPathIndex; j++) {
            const [_x0, x1, x2, x3] = xPoints[j];
            const [_y0, y1, y2, y3] = yPoints[j];
            ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
        }
    }
    const outerXs = currOuterSegment.xPoints[outerPathIndex];
    const outerYs = currOuterSegment.yPoints[outerPathIndex];
    const outerSplitMatrix = createSplitMatrix(outerT);
    const newOuterXs = outerSplitMatrix.transform(new Vector4(...outerXs));
    const newOuterYs = outerSplitMatrix.transform(new Vector4(...outerYs));
    ctx.bezierCurveTo(
        newOuterXs._v4storage[1],
        newOuterYs._v4storage[1],
        newOuterXs._v4storage[2],
        newOuterYs._v4storage[2],
        newOuterXs._v4storage[3],
        newOuterYs._v4storage[3],
    );
    const currInnerSegment = animationData.innerSegments[segmentIndex];
    const innerXs = currInnerSegment.xPoints[innerPathIndex];
    const innerYs = currInnerSegment.yPoints[innerPathIndex];
    const innerSplitMatrix = createSplitMatrix(innerT);
    const newInnerXs = innerSplitMatrix.transform(new Vector4(...innerXs));
    const newInnerYs = innerSplitMatrix.transform(new Vector4(...innerYs));
    ctx.lineTo(newInnerXs._v4storage[3], newInnerYs._v4storage[3]);
    ctx.bezierCurveTo(
        newInnerXs._v4storage[2],
        newInnerYs._v4storage[2],
        newInnerXs._v4storage[1],
        newInnerYs._v4storage[1],
        newInnerXs._v4storage[0],
        newInnerYs._v4storage[0],
    );
    {
        const { xPoints, yPoints } = currInnerSegment;
        for (let j = innerPathIndex - 1; j >= 0; j--) {
            const [x0, x1, x2, _x3] = xPoints[j];
            const [y0, y1, y2, _y3] = yPoints[j];
            ctx.bezierCurveTo(x2, y2, x1, y1, x0, y0);
        }
    }
    for (let i = segmentIndex - 1; i >= 0; i--) {
        const { xPoints, yPoints } = animationData.innerSegments[i];
        for (let j = xPoints.length - 1; j >= 0; j--) {
            const [x0, x1, x2, _x3] = xPoints[j];
            const [y0, y1, y2, _y3] = yPoints[j];
            ctx.bezierCurveTo(x2, y2, x1, y1, x0, y0);
        }
    }

    ctx.closePath();

    ctx.fill();
    ctx.stroke();
}

const bezierCoefficients = new Matrix4(
    1,
    -3,
    3,
    -1,
    0,
    3,
    -6,
    3,
    0,
    0,
    3,
    -3,
    0,
    0,
    0,
    1,
);

const invBezierCoefficients = Matrix4.inverted(bezierCoefficients);

/**
 * Create a matrix that can split a bezier curve at a value z.
 */
// In dart, can use cascade operator `..`
function createSplitMatrix(z: number): Matrix4 {
    const zz = z * z;
    const zzz = zz * z;
    const zMatrix = Matrix4.zero();
    zMatrix.setDiagonal(new Vector4(1, z, zz, zzz));
    const matrix = invBezierCoefficients.clone();
    return matrix.multiplied(zMatrix).multiplied(bezierCoefficients);
    // matrix.multiply(bezierCoefficients);
    // return matrix;
}
